import { execFileSync } from 'node:child_process';
import { extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const MAX_FILE_BYTES = 1024 * 1024;
export const MAX_PREVIEW_BYTES = 300 * 1024;
const FORBIDDEN = new Set([
  '.mp4', '.mov', '.m4v', '.webm', '.mkv', '.avi', '.mpeg', '.mpg', '.gif',
  '.wav', '.mp3', '.flac', '.ogg', '.aac', '.m4a', '.aiff', '.opus',
  '.zip', '.tar', '.gz', '.tgz', '.7z', '.rar', '.bz2', '.xz',
  '.pdf', '.pptx', '.ppt', '.onnx', '.safetensors', '.pt', '.pth',
]);
const IMAGE = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif']);
let executable;
export function gitExecutable() {
  if (executable) return executable;
  for (const candidate of ['git', '/usr/bin/git', '/opt/homebrew/bin/git']) {
    try { execFileSync(candidate, ['--version'], { stdio: 'ignore' }); return executable = candidate; }
    catch { /* e.g. an obsolete x86 binary first on PATH on Apple silicon */ }
  }
  throw new Error('No runnable Git executable found');
}

export function mediaProblem(path, bytes) {
  const ext = extname(path).toLowerCase();
  if (FORBIDDEN.has(ext)) return 'video, audio, animation, archive, export or model weights belong outside Git';
  if (path.split('/').some(p => ['.reel', '.signals', 'node_modules', 'dist', 'out'].includes(p))) return 'generated output/cache directory';
  if (bytes > MAX_FILE_BYTES) return 'file exceeds 1 MiB';
  if (IMAGE.has(ext) && (path.includes('/preview/') || path.startsWith('docs/') || path.startsWith('experiments/') && path.includes('/frames/')) && bytes > MAX_PREVIEW_BYTES) return 'documentation/review image exceeds 300 KiB';
  return null;
}

/** Inspect indexed blobs, not ignored working files or unstaged replacements. */
export function checkIndex(cwd = process.cwd()) {
  const bin = gitExecutable();
  const git = args => execFileSync(bin, args, { cwd, maxBuffer: 32 * 1024 * 1024 });
  const entries = git(['ls-files', '--stage', '-z']).toString().split('\0').filter(Boolean).map(line => {
    const tab = line.indexOf('\t');
    const [mode, oid] = line.slice(0, tab).split(' ');
    return { mode, oid, path: line.slice(tab + 1) };
  }).filter(e => e.mode !== '160000');
  const oids = [...new Set(entries.map(e => e.oid))];
  if (!oids.length) return [];
  const sizes = new Map(execFileSync(bin, ['cat-file', '--batch-check=%(objectname) %(objecttype) %(objectsize)'], {
    cwd, input: oids.join('\n') + '\n', encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
  }).trim().split('\n').map(line => {
    const [oid, type, size] = line.split(' ');
    if (type !== 'blob') throw new Error(`Cannot inspect staged object ${oid}: ${line}`);
    return [oid, Number(size)];
  }));
  return entries.flatMap(e => {
    const bytes = sizes.get(e.oid);
    const reason = mediaProblem(e.path, bytes);
    return reason ? [{ path: e.path, bytes, reason }] : [];
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const problems = checkIndex();
  for (const p of problems) console.error(`  ${p.path} (${p.bytes} bytes): ${p.reason}`);
  if (problems.length) {
    console.error(`Media policy: ${problems.length} rejected file(s). Keep originals locally or in release/object storage; see docs/reference/media-policy.md.`);
    process.exitCode = 1;
  } else console.log('Media policy: indexed files are clean.');
}
