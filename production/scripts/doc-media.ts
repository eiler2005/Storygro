/**
 * Rebuilds the small documentation images in docs/media/ from local renders. The renders live in
 * ignored `.reel/` folders and never enter Git; only these previews do. Documentation is English,
 * so every picture comes from an English render:
 *
 *   npm run storygro -- board examples/ai-jobs/en.reel.yaml    # once, after `voice`
 *   npm run docs:media                                          # stills of examples/scene-gallery + previews
 *
 * A render that is missing locally is skipped with a warning and its old preview is kept. Every
 * image must stay under the 300 KiB documentation limit enforced by check-git-media.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Tab } from '../src/cdp.ts';
import { pipelinePanels } from './doc-panels.ts';

const ROOT = resolve(import.meta.dirname, '../..');
const OUT = join(ROOT, 'docs/media');
const MAX_BYTES = 300 * 1024;

const BOARD = 'examples/ai-jobs/.reel/en/board';
const GALLERY_SPEC = 'examples/scene-gallery/en.reel.yaml';
const GALLERY = 'examples/scene-gallery/.reel/en/stills';
/** Moments of the gallery reel; the still command names each file after its moment. */
const GALLERY_AT = ['chart@6.5', 'collage@2.4', 'screencast', 'screencast-gallery', 'screencast-deck'];

/** The first cartoon-style short: its stills feed the illustration thumbnail and the style strip. */
const CARTOON_SPEC = 'content/videos/ai-buys-work-knowledge/en.reel.yaml';
const CARTOON = 'content/videos/ai-buys-work-knowledge/.reel/en/stills';
const CARTOON_AT = ['hook@4.2', 'news@7', 'why@6', 'example@3.5', 'example@12', 'value@9', 'close@10'];
const CARTOON_STRIP = ['hook_4.2', 'news_7', 'why_6', 'example_3.5', 'value_9', 'close_10'].map((f) => `${CARTOON}/${f}.png`);

/** One English key frame per scene module; landscape scenes come from the SlideCraft launch film. */
const SCENES: [scene: string, still: string][] = [
  ['illustration', `${CARTOON}/example_12.png`],
  ['headline', `${BOARD}/hook.png`],
  ['crowd', `${BOARD}/risk.png`],
  ['task-stack', `${BOARD}/tasks.png`],
  ['ladder', `${BOARD}/ladder.png`],
  ['stat', `${BOARD}/data.png`],
  ['chart', `${GALLERY}/chart_6.5.png`],
  ['steps', `${BOARD}/todo.png`],
  ['outro', `${BOARD}/outro.png`],
  ['collage', `${GALLERY}/collage_2.4.png`],
  ['screencast', `${GALLERY}/screencast.png`],
  ['statement', 'examples/slidecraft-launch/.reel/board/turn.png'],
  ['logo-reveal', 'examples/slidecraft-launch/.reel/board/intro.png'],
  ['chat', 'examples/slidecraft-launch/.reel/board/prompt.png'],
  ['stack', 'examples/slidecraft-launch/.reel/board/storyline.png'],
  ['grid', 'examples/slidecraft-launch/.reel/board/build.png'],
  ['spotlight', 'examples/slidecraft-launch/.reel/board/checks.png'],
  ['pins', 'examples/slidecraft-launch/.reel/board/editable.png'],
  ['end-card', 'examples/slidecraft-launch/.reel/board/cta.png'],
];

/** The README hero: five frames that show the range of the scene library. */
const HERO: { still: string; title: string; meta: string }[] = [
  { still: `${BOARD}/hook.png`, title: 'headline', meta: 'cut-paper explainer' },
  { still: `${BOARD}/data.png`, title: 'stat', meta: 'every number from facts.json' },
  { still: `${BOARD}/ladder.png`, title: 'ladder', meta: 'a mechanism, not a list' },
  { still: `${GALLERY}/collage_2.4.png`, title: 'collage', meta: 'editorial cut-outs' },
  { still: `${GALLERY}/screencast.png`, title: 'screencast', meta: 'a real site, recorded' },
];

/** The storyboard strip: every scene of the English AI-and-jobs explainer in order. */
const STORYBOARD = ['hook', 'risk', 'tasks', 'ladder', 'data', 'danger', 'todo', 'outro'];

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const src = (p: string) => pathToFileURL(join(ROOT, p)).href;
const have = (p: string) => existsSync(join(ROOT, p));
const READY = `document.fonts.ready.then(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0))`;
const CAPTION_CSS = `body{background:#14161b;font:15px/1.35 -apple-system,'Helvetica Neue',Arial,sans-serif;color:#e9e6df}
  figcaption{margin-top:12px;display:flex;flex-direction:column;gap:2px} span{color:#9a968e;font-size:13px}`;

if (have(GALLERY_SPEC.replace('en.reel.yaml', 'assets/robot.png')))
  execFileSync(process.execPath, ['--import', 'tsx', 'production/src/cli.ts', 'still', GALLERY_SPEC, ...GALLERY_AT], {
    cwd: ROOT,
    stdio: 'inherit',
  });
else console.warn('skip: gallery stills need `npm run assets:fetch` for the collage images');

if (have('content/videos/ai-buys-work-knowledge/shots/hook-1.jpg'))
  execFileSync(process.execPath, ['--import', 'tsx', 'production/src/cli.ts', 'still', CARTOON_SPEC, ...CARTOON_AT], { cwd: ROOT, stdio: 'inherit' });
else console.warn('skip: cartoon stills need `storygro images` for the episode first');

const work = mkdtempSync(join(tmpdir(), 'storygro-doc-media-'));
const tab = await Tab.open(1600, 900);
let written = 0;

/** Screenshots `html` at `width`×`height`; a height of 0 fits the page's own height. */
async function shoot(out: string, width: number, height: number, html: string, quality = 80): Promise<void> {
  const page = join(work, 'page.html');
  writeFileSync(page, `<!doctype html><meta charset="utf-8"><style>html,body{margin:0}</style>${html}`);
  await tab.send('Emulation.setDeviceMetricsOverride', { width, height: height || 100, deviceScaleFactor: 1, mobile: false });
  await tab.goto(pathToFileURL(page).href, READY);
  if (!height) {
    height = await tab.eval<number>('document.documentElement.scrollHeight');
    await tab.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  }
  const jpeg = await tab.shot('jpeg', quality);
  if (jpeg.length > MAX_BYTES) throw new Error(`${out}: ${Math.round(jpeg.length / 1024)} KiB exceeds 300 KiB`);
  const file = join(OUT, out);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, jpeg);
  written++;
  console.log(`${out}  ${width}×${height}  ${Math.round(jpeg.length / 1024)} KiB`);
}

function missing(paths: string[]): boolean {
  const gone = paths.filter((p) => !have(p));
  for (const p of gone) console.warn(`skip: ${p} is not rendered locally`);
  return gone.length > 0;
}

try {
  for (const [scene, still] of SCENES) {
    if (missing([still])) continue;
    const landscape = still.includes('slidecraft-launch') || still.startsWith(CARTOON);
    const fill = `<img src="${src(still)}" style="display:block;width:100vw;height:100vh;object-fit:cover">`;
    await shoot(`scenes/${scene}.jpg`, landscape ? 480 : 270, landscape ? 270 : 480, fill, 78);
  }

  if (!missing(HERO.map((h) => h.still))) {
    const cards = HERO.map(
      (h) => `<figure><img src="${src(h.still)}"><figcaption><b>${esc(h.title)}</b><span>${esc(h.meta)}</span></figcaption></figure>`,
    ).join('');
    await shoot(
      'hero.jpg',
      1600,
      600,
      `<style>${CAPTION_CSS}
        main{display:flex;gap:28px;justify-content:center;padding:36px 40px 0}
        figure{margin:0;width:270px}
        img{display:block;width:270px;height:480px;object-fit:cover;border-radius:18px;box-shadow:0 10px 30px #0008}
      </style><main>${cards}</main>`,
      82,
    );
  }

  const board = STORYBOARD.map((id) => `${BOARD}/${id}.png`);
  if (!missing(board)) {
    const cards = STORYBOARD.map(
      (id, i) => `<figure><img src="${src(board[i]!)}"><figcaption><b>${i + 1} · ${esc(id)}</b></figcaption></figure>`,
    ).join('');
    await shoot(
      'storyboard-en.jpg',
      1600,
      400,
      `<style>${CAPTION_CSS}
        main{display:flex;gap:16px;justify-content:center;padding:24px 24px 0}
        figure{margin:0;width:178px}
        img{display:block;width:178px;height:316px;object-fit:cover;border-radius:10px}
      </style><main>${cards}</main>`,
      82,
    );
  }

  if (!missing(CARTOON_STRIP)) {
    const cells = CARTOON_STRIP.map((f) => `<img src="${src(f)}">`).join('');
    await shoot(
      'styles/cartoon.jpg',
      1600,
      0,
      `<style>body{background:#14161b} main{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:20px}
        img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:10px}</style><main>${cells}</main>`,
      80,
    );
  }

  for (const p of pipelinePanels(ROOT)) await shoot(p.out, 1240, 0, p.html(), 82);
} finally {
  tab.close();
  setTimeout(() => rmSync(work, { recursive: true, force: true }), 600);
}
console.log(`${written} image(s) in docs/media/`);
