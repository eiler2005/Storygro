import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ffmpeg } from './tools.ts';

/**
 * What Instagram stored for a published post, read from its public embed page: the full-size cover
 * frame has the shape of the stored video. A Reel uploaded as a square post comes back 1080×1080 —
 * the upload cut off its top and bottom. Unofficial: the embed page can change without notice.
 */

/** The shortcode of a post, reel or tv link. */
export function shortcode(url: string): string {
  const m = url.match(/instagram\.com\/(?:[\w.]+\/)?(?:p|reel|reels|tv)\/([\w-]+)/);
  if (!m) throw new Error(`not an Instagram post link: ${url}`);
  return m[1]!;
}

const unescape = (s: string) => s.replace(/&amp;/g, '&').replace(/&#0?38;/g, '&').replace(/&quot;/g, '"');

/** URL of the full-size cover frame in an embed page, or null. */
export function embedImage(html: string): string | null {
  const m = html.match(/class="EmbeddedMediaImage"[^>]*?\ssrc="([^"]+)"/) ?? html.match(/EmbeddedMediaImage"[^>]*?\ssrc="([^"]+)"/);
  return m ? unescape(m[1]!) : null;
}

export type Shape = { width: number; height: number; ratio: string; ok: boolean; note: string };

/** Verdict on the stored shape of a Reel made at 9:16. */
export function shapeVerdict(width: number, height: number): Shape {
  const r = height / width;
  if (r > 1.7) return { width, height, ratio: '9:16', ok: true, note: 'stored vertical: the upload kept the full frame' };
  if (Math.abs(r - 1) < 0.02)
    return { width, height, ratio: '1:1', ok: false, note: 'cropped to a square at upload (top and bottom cut off): delete it and upload again as a Reel, keeping Original / 9:16' };
  if (Math.abs(r - 1.25) < 0.03)
    return { width, height, ratio: '4:5', ok: false, note: 'cropped to 4:5 at upload: delete it and upload again as a Reel, keeping Original / 9:16' };
  return { width, height, ratio: `${width}×${height}`, ok: false, note: 'not 9:16: check the crop chosen at upload' };
}

/** Fetches the embed page and the cover frame, and measures it. */
export async function instagramShape(url: string): Promise<Shape & { code: string; image: string }> {
  const code = shortcode(url);
  const page = await fetch(`https://www.instagram.com/p/${code}/embed/`, { headers: { 'user-agent': 'curl/8.7.1' } });
  if (!page.ok) throw new Error(`embed page answered ${page.status} — is the post public?`);
  const image = embedImage(await page.text());
  if (!image) throw new Error('no cover frame in the embed page (deleted, private, or the page changed)');
  const res = await fetch(image);
  if (!res.ok) throw new Error(`cover frame answered ${res.status}`);
  const dir = mkdtempSync(join(tmpdir(), 'storygro-ig-'));
  try {
    const file = join(dir, 'cover.jpg');
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    const probe = spawnSync(ffmpeg(), ['-hide_banner', '-i', file], { encoding: 'utf8' }).stderr;
    const m = probe.match(/Video: [^\n]*?, (\d+)x(\d+)/);
    if (!m) throw new Error('could not read the cover frame size');
    return { code, image, ...shapeVerdict(Number(m[1]), Number(m[2])) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
