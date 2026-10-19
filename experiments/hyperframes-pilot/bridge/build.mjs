// Builds hook-bridge/: esbuild bundle of scenes/headline.js + runtime/*.js, and index.html with the scene's
// props/cues/safe-area taken from examples/ai-jobs/.reel/ru/timeline.json (read-only).
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const pilot = join(here, '..');
const tl = JSON.parse(readFileSync(join(pilot, '../../examples/ai-jobs/.reel/ru/timeline.json'), 'utf8'));
const s = tl.scenes[0];
mkdirSync(join(pilot, 'hook-bridge/assets'), { recursive: true });
execFileSync(join(pilot, 'node_modules/.bin/esbuild'), [join(here, 'entry.js'), '--bundle', '--format=iife', '--global-name=Bridge', `--outfile=${join(pilot, 'hook-bridge/assets/headline.bundle.js')}`, '--log-level=warning']);
const ctx = { id: s.id, props: s.props, duration: s.duration, voiceAt: s.voiceAt, cues: s.cues, words: s.words, width: tl.width, height: tl.height, safe: tl.safe, lang: tl.lang, captions: !!tl.captions?.show };
const html = readFileSync(join(here, 'index.template.html'), 'utf8').replaceAll('__CTX__', JSON.stringify(ctx)).replaceAll('__DUR__', String(s.duration)).replaceAll('__VOICE_AT__', String(s.voiceAt)).replaceAll('__VOICE_DUR__', String(s.voice.duration));
writeFileSync(join(pilot, 'hook-bridge/index.html'), html);
console.log('built hook-bridge/index.html; scene', s.id, s.duration, 's');
