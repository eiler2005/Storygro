/**
 * Real slides for the SlideCraft explainer, rendered by SlideCraft itself (the same sources as the
 * launch GIF): the Codex deck from one prompt, the FDE v2 combo chart and the budget slide with its
 * month-2 total set wrong, which `SC-CONSIST-002` catches.
 * Optional regeneration from an explicit SlideCraft checkout:
 *   SLIDECRAFT_ROOT=/path/to/slidecraft npx tsx examples/slidecraft-launch/assets.ts
 * The checked-in assets are sufficient for rendering without that checkout.
 */
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

if (!process.env.SLIDECRAFT_ROOT) {
  throw new Error('Asset regeneration requires SLIDECRAFT_ROOT pointing to a SlideCraft checkout. Rendering uses the bundled assets and does not require it.');
}
const ROOT = resolve(process.env.SLIDECRAFT_ROOT);
const fromSlidecraft = (path: string) => import(pathToFileURL(join(ROOT, path)).href);
const { rasterize } = await fromSlidecraft('src/backends/resvg.ts');
const { slideSvg } = await fromSlidecraft('src/backends/svg.ts');
const { checkDeck } = await fromSlidecraft('src/build.ts');
const { LAYOUTS } = await fromSlidecraft('src/layouts/index.ts');
type Scene = { slides: { id: string; title?: string }[] };
const OUT = join(import.meta.dirname, 'assets');
mkdirSync(OUT, { recursive: true });
const png = async (name: string, scene: Scene, id: string, width = 1600) => {
  const s = scene.slides.find((x) => x.id === id)!;
  writeFileSync(join(OUT, `${name}.png`), await rasterize(slideSvg(scene, s), width));
  return `assets/${name}.png`;
};

const ex: Scene = checkDeck(join(ROOT, 'examples/llm-concepts/deck.yaml')).scene!;
const slides: string[] = [];
for (const [i, s] of ex.slides.entries())
  slides.push(await png(`llm-${String(i + 1).padStart(2, '0')}`, ex, s.id));

const v2dir = join(ROOT, 'examples/fde-engineer-en-v2');
const v2 = checkDeck(join(v2dir, 'deck.yaml')).scene!;
const chart = await png('chart', v2, 'pilot-plan');

const work = mkdtempSync(join(tmpdir(), 'reel-assets-'));
cpSync(v2dir, work, { recursive: true });
const deckPath = join(work, 'deck.yaml');
writeFileSync(
  deckPath,
  readFileSync(deckPath, 'utf8').replace('$69k, $67k, $70k', '$69k, $69k, $70k'),
);
const wrong = checkDeck(deckPath);
const caught = wrong.diagnostics.find((d) => d.code === 'SC-CONSIST-002');
if (!caught) throw new Error('the planted total was not caught');
const budget = await png('budget-wrong', wrong.scene!, 'budget');
rmSync(work, { recursive: true, force: true });

// OFL fonts the slides use, served next to the reel
mkdirSync(join(OUT, 'fonts'), { recursive: true });
for (const f of ['liberation-sans/LiberationSans-Regular.ttf', 'liberation-sans/LiberationSans-Bold.ttf', 'liberation-serif/LiberationSerif-Italic.ttf', 'liberation-serif/LiberationSerif-BoldItalic.ttf'])
  cpSync(join(ROOT, 'fonts', f), join(OUT, 'fonts', f.split('/')[1]!));

const prompt = readFileSync(join(ROOT, 'examples/llm-concepts/prompt.txt'), 'utf8').trim();
writeFileSync(
  join(OUT, 'facts.json'),
  `${JSON.stringify(
    {
      layouts: LAYOUTS.length,
      slides,
      titles: ex.slides.map((s) => s.title ?? ''),
      chart,
      budget,
      // fractions of the budget slide: the total row and the wrong month-2 cell
      totalRow: { x: 0.045, y: 0.388, w: 0.5, h: 0.146 },
      wrongCell: { x: 0.437, w: 0.075 },
      caught: caught.message,
      prompt,
    },
    null,
    1,
  )}\n`,
);
console.log(`✔ ${slides.length + 2} slides, ${LAYOUTS.length} layouts → ${OUT}`);
