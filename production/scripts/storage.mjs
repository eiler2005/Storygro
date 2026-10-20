#!/usr/bin/env node
// What Storygro keeps on this machine and how big it is: environments, models, caches and local
// renders. Read-only — it deletes nothing. The table and what each entry is for:
// docs/reference/local-setup.md.
//   npm run storage
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const HOME = homedir();
const TOOL = process.env.STORYGRO_HOME ?? process.env.REELCRAFT_HOME ?? join(HOME, '.storygro');
const HF = process.env.HF_HUB_CACHE ?? join(process.env.HF_HOME ?? join(HOME, '.cache', 'huggingface'), 'hub');
const ROOT = join(import.meta.dirname, '..', '..');

const size = (path, follow = false) => {
  if (!existsSync(path)) return '—';
  try {
    return execFileSync('du', [follow ? '-shL' : '-sh', path], { encoding: 'utf8' }).split('\t')[0].trim();
  } catch {
    return '?';
  }
};

// Hugging Face models Storygro downloads (the cache stores weights in hub/blobs/ behind symlinks)
const MODELS = [
  ['mlx-community/Qwen3-TTS-12Hz-1.7B-Base-bf16', 'qwen3 voice (narrator clone)'],
  ['mlx-community/Qwen3-TTS-12Hz-1.7B-VoiceDesign-bf16', 'design_voice.py (new narrator references)'],
  ['hexgrad/Kokoro-82M', 'kokoro voice (English)'],
  ['zaakirio/kokoro-ru', 'kokoro voice (Russian Dima/Sveta/Masha)'],
  ['ResembleAI/chatterbox', 'chatterbox voice (optional)'],
  ['mlx-community/whisper-large-v3-turbo', 'alignment and QA speech check (Russian and other languages)'],
  ['mlx-community/whisper-small.en-mlx', 'alignment and QA speech check (English)'],
  ['facebook/wav2vec2-xlsr-53-espeak-cv-ft', 'voice_bench.py stress check (optional)'],
  ['mflux-community/z-image-turbo-mflux-q8', 'storygro images (cartoon pictures, optional)'],
];

const rows = [
  [join(TOOL, 'venv'), 'main Python: voices, Whisper, music, ffmpeg, RUAccent and Silero models', 'npm run setup / setup:ru'],
  [join(TOOL, 'image-venv'), 'picture generation (mflux)', 'npm run setup:images'],
  [join(TOOL, 'chatterbox-venv'), 'Chatterbox voice, UTMOS scores', 'npm run setup:chatterbox'],
  ...MODELS.map(([id, use]) => [join(HF, `models--${id.replaceAll('/', '--')}`), `${id} — ${use}`, 'downloads on first use', true]),
  [join(HOME, '.cache', 'torch', 'hub'), 'UTMOS weights (voice_bench.py)', 'downloads on first use'],
  [join(ROOT, 'node_modules'), 'JS dependencies', 'npm ci'],
];

console.log('| Path | Size | What | Restore with |');
console.log('|---|---|---|---|');
// a model folder holds snapshots/ and blobs/ as symlinks into hub/blobs: count the snapshot once
for (const [path, what, how, follow] of rows) console.log(`| ${path.replace(HOME, '~')} | ${size(follow ? join(path, 'snapshots') : path, follow)} | ${what} | ${how} |`);

// local renders of every project: rebuildable from Git + off-Git inputs, but slow to rebuild
const reels = [];
for (const top of ['content/videos', 'examples']) {
  const dir = join(ROOT, top);
  if (!existsSync(dir)) continue;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name, '.reel');
    if (existsSync(p)) reels.push([`${top}/${name}/.reel`, size(p)]);
  }
}
console.log('\n| Local renders (.reel/) | Size |\n|---|---|');
for (const [p, s] of reels) console.log(`| ${p} | ${s} |`);
console.log(`\nWhole Hugging Face cache: ${size(HF)} (shared with other tools on this machine).`);
