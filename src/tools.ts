import { execFileSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const REEL_ROOT = join(import.meta.dirname, '..');
export const TOOL_HOME = process.env.STORYGRO_HOME ?? process.env.REELCRAFT_HOME ?? join(homedir(), '.storygro');

export function python(): string {
  const p = process.env.STORYGRO_PYTHON ?? process.env.REELCRAFT_PYTHON ?? join(TOOL_HOME, 'venv', 'bin', 'python');
  if (!existsSync(p)) throw new Error(`no Python environment at ${p} — run: npm run setup (in Storygro)`);
  return p;
}

let ff: string | undefined;
export function ffmpeg(): string {
  if (ff) return ff;
  if (process.env.FFMPEG) return (ff = process.env.FFMPEG);
  ff = execFileSync(python(), ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'], {
    encoding: 'utf8',
  }).trim();
  return ff;
}

export function chrome(): string {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  const hit = candidates.find((c) => c && existsSync(c));
  if (!hit) throw new Error('Chrome not found — set CHROME_PATH');
  return hit;
}

/** Run a process, stream its output, reject on a non-zero exit. */
export function run(cmd: string, args: string[], opts: { quiet?: boolean } = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', opts.quiet ? 'ignore' : 'inherit', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => {
      err += d;
      if (err.length > 20_000) err = err.slice(-10_000);
    });
    p.on('error', reject);
    p.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}\n${err.slice(-2000)}`)),
    );
  });
}
