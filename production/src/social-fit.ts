import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileEntry, engineVersion } from './manifest.ts';
import { ffmpeg, REEL_ROOT, run } from './tools.ts';

export interface Frame { width: number; height: number; left: number; top: number; right: number; bottom: number }

/** Fit the complete source inside the target rectangle; never crop or stretch to fill it. */
export function fitFrame(width: number, height: number, target: Frame) {
  if (![width, height, target.width, target.height].every(n => Number.isInteger(n) && n >= 2)
    || ![target.left, target.top, target.right, target.bottom].every(n => Number.isInteger(n) && n >= 0)
    || target.width % 2 || target.height % 2) throw new Error('invalid social canvas or margins');
  const availableW = target.width - target.left - target.right;
  const availableH = target.height - target.top - target.bottom;
  const scale = Math.min(availableW / width, availableH / height);
  // Round to the nearest chroma-compatible size, bounded by the safe rectangle.
  const w = Math.min(Math.floor(availableW / 2) * 2, Math.round(width * scale / 2) * 2);
  const h = Math.min(Math.floor(availableH / 2) * 2, Math.round(height * scale / 2) * 2);
  if (w < 2 || h < 2) throw new Error('social margins leave no room for the video');
  return { width: w, height: h, x: Math.ceil((target.left + (availableW - w) / 2) / 2) * 2, y: Math.ceil((target.top + (availableH - h) / 2) / 2) * 2 };
}

export function socialTargets(): Record<string, Frame> {
  const { reels } = JSON.parse(readFileSync(join(REEL_ROOT, 'runtime/safe-zones.json'), 'utf8'));
  return {
    // The complete picture, including burned-in captions, sits above/beside the Reels UI.
    reels: { width: 1080, height: 1920, left: reels.left, top: reels.top, right: reels.right, bottom: reels.bottom },
    // A square upload has no aspect-ratio crop. Small editorial margins preserve its entire picture.
    square: { width: 1080, height: 1080, left: 24, top: 24, right: 24, bottom: 24 },
  };
}

export function fitFilter(width: number, height: number, target: Frame, background: string) {
  if (!/^#[0-9a-f]{6}$/i.test(background)) throw new Error('background must be #RRGGBB');
  const f = fitFrame(width, height, target);
  return `scale=${f.width}:${f.height}:flags=lanczos,setsar=1,pad=${target.width}:${target.height}:${f.x}:${f.y}:color=${background},format=yuv420p`;
}

function probe(file: string) {
  const p = spawnSync(ffmpeg(), ['-hide_banner', '-i', file], { encoding: 'utf8' });
  if (p.error) throw p.error;
  const video = p.stderr.split('\n').find(line => /Stream .*Video:/.test(line)) ?? '';
  const size = video.match(/, (\d+)x(\d+)(?:[ ,]|$)/);
  const duration = p.stderr.match(/Duration: (\d+):(\d+):([\d.]+)/);
  if (!size || !duration || !/Audio: aac/.test(p.stderr)) throw new Error(`expected a video with AAC audio: ${file}`);
  if (/rotate|rotation of/.test(p.stderr) || /SAR (?!1:1)\d+:\d+/.test(video)) throw new Error('normalize rotation and pixel aspect ratio before social fitting');
  return { width: Number(size[1]), height: Number(size[2]), duration: Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]), video };
}

function audioHash(file: string) {
  return execFileSync(ffmpeg(), ['-v', 'error', '-i', file, '-map', '0:a:0', '-c:a', 'copy', '-f', 'hash', '-hash', 'sha256', '-'], { encoding: 'utf8' }).trim();
}

/** Decode the whole file, failing on broken packets, and return its actual frame count. */
function decodedFrames(file: string) {
  const log = execFileSync(ffmpeg(), ['-v', 'error', '-xerror', '-i', file, '-map', '0:v:0', '-map', '0:a:0', '-progress', 'pipe:1', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });
  const count = Number([...log.matchAll(/^frame=(\d+)/gm)].at(-1)?.[1]);
  if (!count) throw new Error(`no frames decoded: ${file}`);
  return count;
}

/** Local review exports. Source approvals/QA are not transferred to these new output files. */
export async function fitSocialVideo(source: string, dir: string, background = '#13294b') {
  const input = resolve(source);
  const info = probe(input);
  const targets = socialTargets();
  const outputs = Object.entries(targets).map(([profile, target]) => ({ profile, target, path: join(dir, `instagram-${profile === 'reels' ? 'reels-9x16' : 'post-1x1'}.mp4`) }));
  const manifestPath = join(dir, 'social-manifest.json');
  // Preflight the complete export before producing anything; no silent replacement of a prior review.
  for (const file of [...outputs.map(o => o.path), manifestPath]) {
    if (resolve(file) === input || existsSync(file)) throw new Error(`output already exists: ${file}; choose a new folder`);
  }
  outputs.forEach(o => fitFilter(info.width, info.height, o.target, background));
  mkdirSync(dir, { recursive: true });
  const sourceAudio = audioHash(input);
  const sourceFrames = decodedFrames(input);
  const files = [];
  for (const o of outputs) {
    console.log(`● social ${o.profile}: preserving the complete ${info.width}×${info.height} frame`);
    const filter = fitFilter(info.width, info.height, o.target, background);
    await run(ffmpeg(), ['-hide_banner', '-v', 'error', '-n', '-i', input, '-map', '0:v:0', '-map', '0:a:0',
      '-vf', filter, '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
      '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
      '-c:a', 'copy', '-movflags', '+faststart', o.path]);
    const actual = probe(o.path);
    const frames = decodedFrames(o.path);
    const audio = audioHash(o.path);
    if (actual.width !== o.target.width || actual.height !== o.target.height || !/h264.*yuv420p/.test(actual.video)
      || Math.abs(actual.duration - info.duration) > 0.05 || frames !== sourceFrames || audio !== sourceAudio)
      throw new Error(`social export verification failed: ${o.path}`);
    files.push({ ...fileEntry(o.path, dir), profile: o.profile, canvas: o.target,
      picture: fitFrame(info.width, info.height, o.target), filter,
      checks: { decode: 'pass', frames, audioUnchanged: true, duration: actual.duration, codec: 'h264/yuv420p' } });
    console.log(`✔ ${o.path} · ${frames} frames, audio unchanged`);
  }
  const manifest = { kind: 'social-fit-review', created: new Date().toISOString(), engine: engineVersion(),
    source: { ...fileEntry(input, dir), width: info.width, height: info.height, frames: sourceFrames, audioHash: sourceAudio },
    background, approval: 'awaiting-owner-review', published: false, files };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
  return manifest;
}
