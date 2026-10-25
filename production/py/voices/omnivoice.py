"""OmniVoice in an isolated PyTorch environment; alignment and pitch-preserving tempo use voice.py."""
import atexit
import hashlib
import json
import os
import subprocess
import tempfile

import soundfile as sf


class Provider:
    native_words = False
    reads_markup = False
    stress = None  # Russian accent markup has not been validated for this engine.

    def __init__(self, job):
        home = os.environ.get('STORYGRO_HOME') or os.environ.get('REELCRAFT_HOME') or os.path.expanduser('~/.storygro')
        python = os.path.join(home, 'omnivoice-venv', 'bin', 'python')
        if not os.path.isfile(python):
            raise SystemExit('omnivoice: run npm run setup:omnivoice first')
        self.ref = job.get('voice', '')
        ref = os.path.abspath(os.path.join(job.get('dir', '.'), self.ref))
        transcript = os.path.splitext(ref)[0] + '.txt'
        if not ref.endswith('.wav') or not os.path.isfile(ref) or not os.path.isfile(transcript):
            raise SystemExit('omnivoice: reference WAV and matching TXT are required; see production/voices/references/README.md')
        self.model_id = job.get('model') or 'k2-fsa/OmniVoice'
        self.lang = job.get('language', 'ru')
        cfg = {'model': self.model_id, 'ref': ref, 'text': open(transcript, encoding='utf8').read().strip(), 'lang': self.lang}
        worker = os.path.join(os.path.dirname(__file__), 'omnivoice_worker.py')
        self.tmp = tempfile.TemporaryDirectory(prefix='storygro-omnivoice-')
        self.proc = subprocess.Popen([python, '-I', worker, json.dumps(cfg)], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                     text=True, env={**os.environ, 'PYTORCH_ENABLE_MPS_FALLBACK': '1', 'HF_HUB_DISABLE_XET': '1'})
        atexit.register(self.close)
        hello = self._read()
        self.sample_rate, self.device = hello['sr'], hello['device']

    def close(self):
        if self.proc.poll() is None:
            self.proc.stdin.close()
            try:
                self.proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.proc.terminate()
                try:
                    self.proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    self.proc.kill()
                    self.proc.wait()
        self.tmp.cleanup()

    def _read(self):
        for line in self.proc.stdout:
            if line.startswith('{'):
                result = json.loads(line)
                if 'error' in result:
                    raise RuntimeError('omnivoice: ' + result['error'])
                return result
        raise RuntimeError('omnivoice worker stopped; see its error output')

    def info(self):
        return {'engine': 'omnivoice', 'model': self.model_id, 'voice': self.ref, 'language': self.lang,
                'device': self.device, 'license': 'Apache-2.0 (code); CC-BY-NC (model weights)', 'synthetic': True}

    def synth(self, text):
        out = os.path.join(self.tmp.name, 'line.wav')
        seed = int(hashlib.sha1(text.encode()).hexdigest()[:8], 16)
        self.proc.stdin.write(json.dumps({'text': text, 'seed': seed, 'out': out}) + '\n')
        self.proc.stdin.flush()
        self._read()
        audio, _ = sf.read(out, dtype='float32')
        return audio.mean(1) if audio.ndim > 1 else audio, None
