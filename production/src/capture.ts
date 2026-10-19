import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';
import { Tab } from './cdp.ts';

/**
 * A scripted browser session recorded frame by frame for product demos and tutorials.
 * Time is virtual: each frame is taken at its own moment after the page has settled, so a slow
 * network changes how long recording takes, not what the frames show. The cursor (a finger on a
 * phone viewport) is recorded per frame so a scene can draw it over the screenshots.
 */
const At = z.number().min(0);
const Step = z.discriminatedUnion('do', [
  z.object({ do: z.literal('goto'), at: At, url: z.string().url() }),
  /** scroll to a CSS selector (its top, plus offset) or to an absolute y, over dur seconds */
  z.object({ do: z.literal('scroll'), at: At, to: z.union([z.string(), z.number()]), offset: z.number().default(0), dur: z.number().positive().default(1) }),
  /** the finger travels to the element's centre during the 0.5 s before `at`, then taps */
  z.object({ do: z.literal('tap'), at: At, selector: z.string(), navigate: z.boolean().default(false) }),
  z.object({ do: z.literal('type'), at: At, selector: z.string(), text: z.string(), cps: z.number().positive().default(14) }),
  z.object({ do: z.literal('key'), at: At, key: z.enum(['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'PageDown', 'PageUp', 'Space']) }),
]);
export type CaptureStep = z.infer<typeof Step>;

export const CaptureSpec = z.object({
  capture: z.literal(1),
  title: z.string().optional(),
  url: z.string().url(),
  viewport: z
    .object({ width: z.number().int().min(200).max(2000), height: z.number().int().min(200).max(3000), scale: z.number().min(1).max(3).default(2), mobile: z.boolean().default(true) })
    .default({ width: 430, height: 932, scale: 2, mobile: true }),
  fps: z.number().int().min(4).max(30).default(15),
  duration: z.number().positive().max(120),
  /** JPEG quality of the stored frames */
  quality: z.number().int().min(50).max(100).default(85),
  userAgent: z.string().optional(),
  steps: z.array(Step).default([]),
});
export type CaptureSpec = z.infer<typeof CaptureSpec>;

const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

/** Where `storygro capture` writes a capture spec's frames: `<dir>/.reel/captures/<name>/`. */
export function captureDir(specPath: string): string {
  const abs = resolve(specPath);
  return join(dirname(abs), '.reel', 'captures', basename(abs).replace(/(\.capture)?\.ya?ml$/, ''));
}

export function loadCapture(path: string): CaptureSpec {
  const spec = CaptureSpec.parse(parse(readFileSync(path, 'utf8')));
  const times = spec.steps.map((s) => s.at);
  if (times.some((t, i) => i && t < times[i - 1]!)) throw new Error('capture: steps must be in time order');
  if (times.some((t) => t > spec.duration)) throw new Error('capture: a step starts after the duration');
  return spec;
}

const ease = (k: number) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2);
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  docTop: number;
}

/** Records the spec: one JPEG per frame plus capture.json with the cursor, taps and resolved steps. */
export async function recordCapture(specPath: string, opts: { out?: string; log?: (s: string) => void } = {}) {
  const spec = loadCapture(specPath);
  const out = opts.out ?? captureDir(specPath);
  const log = opts.log ?? (() => {});
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const { width, height, scale, mobile } = spec.viewport;
  const tab = await Tab.open(width, height);
  const settle = async () => {
    const t0 = Date.now();
    // the document, its fonts and the images in view must be complete before a frame is taken
    while (Date.now() - t0 < 15_000) {
      const ready = await tab
        .eval<boolean>(
          `document.readyState === 'complete' && document.fonts.status === 'loaded' && [...document.images].filter(i => { const r = i.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }).every(i => i.complete)`,
        )
        .catch(() => false);
      if (ready) return;
      await new Promise((r) => setTimeout(r, 120));
    }
    log('  ! page did not settle within 15 s; recording anyway');
  };
  const rect = async (selector: string): Promise<Rect> => {
    const r = await tab.eval<Rect | null>(
      `(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height, docTop: b.top + scrollY }; })()`,
    );
    if (!r) throw new Error(`capture: no element matches ${selector}`);
    return r;
  };
  try {
    await tab.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile });
    if (mobile || spec.userAgent) await tab.send('Emulation.setUserAgentOverride', { userAgent: spec.userAgent ?? MOBILE_UA });
    if (mobile) await tab.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await tab.send('Page.enable');
    await tab.send('Page.navigate', { url: spec.url });
    await new Promise((r) => setTimeout(r, 400));
    await settle();
    // hide scrollbars and caret blink so frames are stable
    await tab.eval(`(() => { const s = document.createElement('style'); s.textContent = '::-webkit-scrollbar{display:none} *{caret-color:transparent!important; scroll-behavior:auto!important}'; document.head.append(s); })()`);

    const n = Math.ceil(spec.duration * spec.fps);
    const cursor: [number, number][] = [];
    const taps: { t: number; x: number; y: number }[] = [];
    const resolved: (CaptureStep & { x?: number; y?: number; fromY?: number; toY?: number })[] = [];
    let pos: [number, number] = [width * 0.62, height * 0.78];
    let shown = false;
    const pending = spec.steps.map((s) => ({ ...s, started: false, done: false, from: [0, 0] as [number, number], target: [0, 0] as [number, number], fromY: 0, toY: 0, typed: 0 }));
    for (let i = 0; i < n; i++) {
      const t = i / spec.fps;
      for (const s of pending) {
        if (s.done) continue;
        if (s.do === 'tap' && !s.started && t >= s.at - 0.5) {
          // the finger starts moving half a second before the tap
          const r = await rect(s.selector);
          if (r.y < 0 || r.y + r.h > height) throw new Error(`capture: ${s.selector} is not on screen at ${s.at}s; scroll to it first`);
          s.from = pos;
          s.target = [r.x + r.w / 2, r.y + r.h / 2];
          s.started = true;
          shown = true;
          resolved.push({ ...stripState(s), x: Math.round(s.target[0]), y: Math.round(s.target[1]) });
        }
        if (s.do === 'tap' && s.started) {
          const k = ease(clamp((t - (s.at - 0.5)) / 0.5));
          pos = [s.from[0] + (s.target[0] - s.from[0]) * k, s.from[1] + (s.target[1] - s.from[1]) * k];
          if (t >= s.at) {
            taps.push({ t: Math.round(s.at * 1000) / 1000, x: Math.round(s.target[0]), y: Math.round(s.target[1]) });
            await tab.eval(`document.querySelector(${JSON.stringify(s.selector)}).click()`);
            if (s.navigate) {
              await new Promise((r) => setTimeout(r, 500));
              await settle();
            }
            s.done = true;
          }
          continue;
        }
        if (t < s.at) continue;
        if (s.do === 'goto') {
          await tab.send('Page.navigate', { url: s.url });
          await new Promise((r) => setTimeout(r, 400));
          await settle();
          resolved.push(stripState(s));
          s.done = true;
        } else if (s.do === 'scroll') {
          if (!s.started) {
            s.fromY = await tab.eval<number>('scrollY');
            s.toY = typeof s.to === 'number' ? s.to + s.offset : (await rect(s.to)).docTop + s.offset;
            s.started = true;
            resolved.push({ ...stripState(s), fromY: Math.round(s.fromY), toY: Math.round(s.toY) });
          }
          const k = ease(clamp((t - s.at) / s.dur));
          await tab.eval(`scrollTo(0, ${s.fromY + (s.toY - s.fromY) * k})`);
          if (k >= 1) {
            await settle();
            s.done = true;
          }
        } else if (s.do === 'type') {
          if (!s.started) {
            await tab.eval(`document.querySelector(${JSON.stringify(s.selector)}).focus()`);
            s.started = true;
            resolved.push(stripState(s));
          }
          const want = Math.min(s.text.length, Math.floor((t - s.at) * s.cps));
          if (want > s.typed) {
            await tab.send('Input.insertText', { text: s.text.slice(s.typed, want) });
            s.typed = want;
          }
          if (s.typed >= s.text.length) s.done = true;
        } else if (s.do === 'key') {
          const key = s.key === 'Space' ? ' ' : s.key;
          const code = s.key === 'Space' ? 'Space' : s.key;
          await tab.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code });
          await tab.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code });
          await new Promise((r) => setTimeout(r, 120));
          await settle();
          resolved.push(stripState(s));
          s.done = true;
        }
      }
      const jpg = await tab.shot('jpeg', spec.quality);
      writeFileSync(join(out, `f-${String(i).padStart(5, '0')}.jpg`), jpg);
      cursor.push(shown ? [Math.round(pos[0] * 10) / 10, Math.round(pos[1] * 10) / 10] : [Number.NaN, Number.NaN]);
      if (i % spec.fps === 0) log(`  frame ${i + 1}/${n}`);
    }
    const meta = {
      capture: 1,
      title: spec.title ?? null,
      url: spec.url,
      recordedAt: new Date().toISOString(),
      fps: spec.fps,
      frames: n,
      duration: spec.duration,
      viewport: spec.viewport,
      pixels: { width: Math.round(width * scale), height: Math.round(height * scale) },
      cursor: cursor.map(([x, y]) => (Number.isNaN(x) ? null : [x, y])),
      taps,
      steps: resolved,
    };
    writeFileSync(join(out, 'capture.json'), `${JSON.stringify(meta, null, 1)}\n`);
    return { out, meta };
  } finally {
    tab.close();
  }
}

function stripState<T extends Record<string, unknown>>(s: T): CaptureStep {
  const { started: _a, done: _b, from: _c, target: _d, fromY: _e, toY: _f, typed: _g, ...rest } = s as Record<string, unknown>;
  return rest as CaptureStep;
}
