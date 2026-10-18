import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Tab } from './cdp.ts';
import { serve } from './serve.ts';
import type { LoadedSpec } from './spec.ts';
import { type Timeline, workDir } from './timeline.ts';
import { ffmpeg, run } from './tools.ts';

const READY = "document.documentElement.dataset.ready === '1'";

async function openPlayer(l: LoadedSpec, tl: Timeline, scale: number) {
  const { server, origin } = await serve(l.dir);
  const w = Math.round(tl.width * scale);
  const h = Math.round(tl.height * scale);
  const tab = await Tab.open(w, h);
  await tab.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: scale, mobile: false });
  await tab.send('Emulation.setDeviceMetricsOverride', {
    width: tl.width,
    height: tl.height,
    deviceScaleFactor: scale,
    mobile: false,
  });
  try {
    await tab.goto(`${origin}/rc/runtime/index.html?timeline=/spec/.reel/timeline.json`, READY);
  } catch (e) {
    tab.close();
    server.close();
    throw e;
  }
  return {
    tab,
    origin,
    close: () => {
      tab.close();
      server.close();
    },
  };
}

/** PNG stills at chosen moments. */
export async function stills(l: LoadedSpec, tl: Timeline, shots: Record<string, number>, outDir: string, scale = 1) {
  mkdirSync(outDir, { recursive: true });
  const p = await openPlayer(l, tl, scale);
  const files: string[] = [];
  try {
    for (const [name, t] of Object.entries(shots)) {
      await p.tab.eval(`reel.seek(${t})`);
      const f = join(outDir, `${name}.png`);
      writeFileSync(f, await p.tab.shot('png'));
      files.push(f);
    }
    for (const e of await p.tab.eval<string[]>('window.__reelErrors ?? []')) console.error(`✖ ${e}`);
  } finally {
    p.close();
  }
  return files;
}

/** Every frame through ffmpeg; returns the silent video path. */
export async function frames(
  l: LoadedSpec,
  tl: Timeline,
  opts: { scale?: number; fps?: number; out: string; from?: number; to?: number },
): Promise<string> {
  const scale = opts.scale ?? 1;
  const fps = opts.fps ?? tl.fps;
  const from = opts.from ?? 0;
  const to = Math.min(opts.to ?? tl.duration, tl.duration);
  const n = Math.ceil((to - from) * fps);
  const p = await openPlayer(l, tl, scale);
  const enc = spawn(
    ffmpeg(),
    [
      '-y',
      '-loglevel',
      'error',
      '-f',
      'image2pipe',
      '-framerate',
      String(fps),
      '-c:v',
      'mjpeg',
      '-i',
      '-',
      '-c:v',
      'libx264',
      '-preset',
      scale < 1 ? 'veryfast' : 'slow',
      '-crf',
      scale < 1 ? '26' : '16',
      '-tune',
      'animation',
      // screenshots are full-range BT.601 JPEG; deliver limited-range BT.709 yuv420p, tagged,
      // or some players shift the colours (yuvj420p)
      '-vf',
      'scale=in_range=pc:in_color_matrix=bt601:out_range=tv:out_color_matrix=bt709,format=yuv420p',
      '-color_range',
      'tv',
      '-colorspace',
      'bt709',
      '-color_primaries',
      'bt709',
      '-color_trc',
      'bt709',
      '-x264-params',
      'colorprim=bt709:transfer=bt709:colormatrix=bt709:range=tv',
      '-movflags',
      '+faststart',
      opts.out,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  );
  const done = new Promise<void>((r, j) => enc.on('close', (c) => (c === 0 ? r() : j(new Error(`ffmpeg ${c}`)))));
  const t0 = Date.now();
  try {
    for (let i = 0; i < n; i++) {
      await p.tab.eval(`reel.seek(${from + i / fps})`);
      const jpg = await p.tab.shot('jpeg', 95);
      if (!enc.stdin.write(jpg)) await new Promise((r) => enc.stdin.once('drain', r));
      if (i % fps === 0 || i === n - 1) {
        const el = (Date.now() - t0) / 1000;
        process.stdout.write(`\r  frames ${i + 1}/${n}  ${(((i + 1) / el) | 0) || 0} fps  eta ${Math.round(((n - i - 1) * el) / (i + 1))}s   `);
      }
    }
  } finally {
    enc.stdin.end();
    p.close();
  }
  await done;
  process.stdout.write('\n');
  return opts.out;
}

/** Video + mix → master MP4, plus a web copy under `maxMB`. */
export async function mux(l: LoadedSpec, video: string, out: string, opts: { webMaxMB?: number; from?: number } = {}) {
  const mix = join(workDir(l), 'mix.wav');
  const args = ['-y', '-loglevel', 'error', '-i', video];
  if (existsSync(mix)) args.push(...(opts.from ? ['-ss', String(opts.from)] : []), '-i', mix, '-c:a', 'aac', '-b:a', '192k', '-shortest');
  args.push('-c:v', 'copy', '-movflags', '+faststart', out);
  await run(ffmpeg(), args);
  const web = out.replace(/\.mp4$/, '-web.mp4');
  const dur = Number(
    (
      await new Promise<string>((r) => {
        const p = spawn(ffmpeg(), ['-i', out], { stdio: ['ignore', 'ignore', 'pipe'] });
        let s = '';
        p.stderr.on('data', (d) => (s += d));
        p.on('close', () => r(s.match(/Duration: (\d+):(\d+):([\d.]+)/)?.slice(1).join(':') ?? '0:0:60'));
      })
    )
      .split(':')
      .reduce((a, v) => a * 60 + Number(v), 0),
  );
  const maxMB = opts.webMaxMB ?? 25;
  const kbps = Math.floor((maxMB * 8192) / dur - 160);
  const wargs = ['-y', '-loglevel', 'error', '-i', out, '-c:v', 'libx264', '-preset', 'slow', '-b:v', `${kbps}k`, '-maxrate', `${kbps * 1.4}k`, '-bufsize', `${kbps * 2}k`, '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-x264-params', 'colorprim=bt709:transfer=bt709:colormatrix=bt709:range=tv'];
  if (existsSync(mix)) wargs.push('-c:a', 'aac', '-b:a', '128k');
  wargs.push('-movflags', '+faststart', web);
  await run(ffmpeg(), wargs);
  return { master: out, web, sizeMB: +(statSync(web).size / 1048576).toFixed(1) };
}

/** Letterbox a still into a card of another size, centred on a background colour. */
export async function cards(l: LoadedSpec, tl: Timeline, stillsDir: string) {
  const out: string[] = [];
  for (const [name, c] of Object.entries(tl.cards)) {
    const src = join(stillsDir, `${c.from}.png`);
    if (!existsSync(src)) throw new Error(`card ${name}: no still "${c.from}"`);
    const dst = join(stillsDir, `${name}.png`);
    await run(ffmpeg(), [
      '-y', '-loglevel', 'error', '-i', src,
      '-vf', `scale=${c.width}:${c.height}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${c.width}:${c.height}:(ow-iw)/2:(oh-ih)/2:color=${c.background}`,
      dst,
    ]);
    out.push(dst);
  }
  return out;
}
