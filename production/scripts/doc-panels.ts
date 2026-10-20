/**
 * English panels for docs/explanation/pipeline.md, built from the local artefacts of one real run
 * (19 October 2026): the trend report, the backlog ranking, the screen recording, QA and the series.
 * Called by doc-media.ts; a panel whose inputs are missing locally is skipped.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { seriesStatus } from '../src/brand.ts';
import { loadIdeas } from '../src/ideas.ts';

const RUN = {
  date: '2026-10-19',
  signals: 'content/.signals/2026-10-19b.json',
  backlog: 'content/ideas/backlog.yaml',
  idea: 'ai-review',
  ideaTitle: 'Where to check an AI agent’s work',
  qa: 'content/videos/ai-agent-checks/.reel/ru/qa.json',
  series: 'content/series/business-explainers.yaml',
  capture: 'content/videos/slidecraft-demo/captures/.reel/captures/site',
  captureAt: [
    [2, 'site'],
    [5, 'after the tap'],
    [9, 'a deck'],
    [12, 'paging'],
    [16, 'a slide'],
  ] as [number, string][],
  screencast: [
    ['examples/scene-gallery/.reel/en/stills/screencast.png', 'step 1'],
    ['examples/scene-gallery/.reel/en/stills/screencast-gallery.png', 'step 2'],
    ['examples/scene-gallery/.reel/en/stills/screencast-deck.png', 'step 3'],
  ] as [string, string][],
};

export interface Panel {
  out: string;
  inputs: string[];
  html: () => string;
}

const esc = (v: unknown) => String(v ?? '—').replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export function pipelinePanels(root: string): Panel[] {
  const file = (p: string) => join(root, p);
  const url = (p: string) => pathToFileURL(file(p)).href;
  const json = (p: string) => JSON.parse(readFileSync(file(p), 'utf8'));
  const fonts = 'examples/scene-gallery/assets/fonts';

  const page = (kicker: string, title: string, sub: string, body: string) => `<style>
    @font-face { font-family: Unbounded; src: url('${url(`${fonts}/Unbounded-wght.ttf`)}'); font-weight: 200 900; }
    @font-face { font-family: Golos; src: url('${url(`${fonts}/GolosText-wght.ttf`)}'); font-weight: 400 900; }
    body { background: #f5eee2; color: #1c2030; font: 17px/1.4 Golos, -apple-system, sans-serif; padding: 40px 44px 44px; width: 1152px; }
    .k { color: #d54c40; font: 800 15px Unbounded; letter-spacing: .04em; text-transform: uppercase; }
    h1 { font: 900 38px/1.12 Unbounded; margin: 8px 0 8px; }
    .s { color: #6f6a62; margin: 0 0 24px; }
    table { width: 100%; border-collapse: separate; border-spacing: 0; background: #fbf7ef; border-radius: 12px; overflow: hidden;
            box-shadow: 0 2px 6px #0002; margin-bottom: 22px; }
    th { background: #1d2230; color: #fff; text-align: left; font-weight: 700; padding: 12px 14px; }
    td { padding: 10px 14px; border-top: 1px solid #e8e0d2; }
    .pass, .ok { color: #2a7a4b; font-weight: 700; } .fail { color: #c0392b; font-weight: 700; } .skip { color: #8a7f6d; font-weight: 700; }
    .pill { display: inline-block; padding: 1px 10px; border-radius: 99px; background: #e7dfd0; }
    .rising { background: #2a7a4b; color: #fff; font-weight: 700; } .falling { background: #c0392b; color: #fff; }
    b { font-weight: 700; }
    .row { display: flex; gap: 14px; } .row figure { margin: 0; flex: 1; text-align: center; color: #6f6a62; font-size: 15px; }
    .row img { width: 100%; display: block; border-radius: 10px; box-shadow: 0 2px 8px #0003; margin-bottom: 8px; }
    .shots img { height: 420px; object-fit: cover; object-position: top; }
    .scenes { justify-content: center; } .scenes figure { flex: 0 0 300px; }
    h2 { color: #d54c40; font: 800 22px Unbounded; margin: 26px 0 14px; }
  </style><div class="k">${kicker}</div><h1>${title}</h1><p class="s">${sub}</p>${body}`;

  const table = (head: string[], rows: string[][]) =>
    `<table><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;

  return [
    {
      out: 'pipeline/01-trends.jpg',
      inputs: [RUN.signals],
      html: () => {
        const r = json(RUN.signals);
        const metric = (m: Record<string, number>) =>
          m.points !== undefined ? `${m.points} pts · ${m.comments} comments` : Object.entries(m).map(([k, v]) => `${k} ${v}`).join(' · ');
        return page(
          `Storygro trends · ${RUN.date}`,
          'What is gaining attention',
          'No API keys: Google Trends RSS, Wikipedia pageviews, Hacker News. Attention is context — not evidence for a claim and not a forecast of reach.',
          table(
            ['Source', 'Status', 'Data date'],
            r.sources.map((s: { source: string; status: string; period: string }) => [esc(s.source), `<span class="${esc(s.status)}">${esc(s.status)}</span>`, esc(s.period.slice(0, 10))]),
          ) +
            table(
              ['Matches our focus (AI, agents, work)', 'Signal'],
              r.signals
                .filter((s: { relevant?: boolean }) => s.relevant)
                .map((s: { title: string; source: string; metrics: Record<string, number> }) => [esc(s.title), `${esc(s.source)} · ${esc(metric(s.metrics))}`]),
            ) +
            table(
              ['Backlog idea', 'Status', 'Momentum', 'Median', 'Signals with volume'],
              r.watch.map((w: { idea: string; status: string; momentum: string; median?: number; signals: { ratio?: number }[] }) => [
                `<b>${esc(w.idea)}</b>`,
                esc(w.status),
                `<span class="pill ${esc(w.momentum)}">${esc(w.momentum)}</span>`,
                esc(w.median),
                `${w.signals.filter((s) => s.ratio !== undefined).length} of ${w.signals.length}`,
              ]),
            ),
        );
      },
    },
    {
      out: 'pipeline/02-selection.jpg',
      inputs: [RUN.signals, RUN.backlog],
      html: () => {
        const w = json(RUN.signals).watch.find((x: { idea: string }) => x.idea === RUN.idea);
        const ranked = loadIdeas(file(RUN.backlog));
        return page(
          'Watchlist + ideas',
          `Why “${RUN.ideaTitle}”`,
          'Wikipedia: average daily views, last 28 days against the 56 before. Hacker News: stories in 30 days against the 30-day average of the 90 before.',
          table(
            ['Source', 'Subject', 'Now', 'Before', 'Ratio'],
            w.signals.map((s: { source: string; subject: string; recent: number; previous: number; ratio?: number }) => [
              esc(s.source),
              esc(s.subject.replace(/_/g, ' ')),
              esc(s.recent),
              esc(s.previous),
              `<b>${esc(s.ratio)}</b>`,
            ]),
          ) +
            table(
              ['#', 'Editorial ranking (storygro ideas)', 'Status', 'Score'],
              ranked.items.map((it, i) => [String(i + 1), `<b>${esc(it.id)}</b>`, esc(it.status), `<b>${esc(it.score)}</b>`]),
            ),
        );
      },
    },
    {
      out: 'pipeline/03-capture.jpg',
      inputs: [`${RUN.capture}/capture.json`, ...RUN.screencast.map(([p]) => p)],
      html: () => {
        const c = json(`${RUN.capture}/capture.json`);
        const frame = (t: number) => `${RUN.capture}/f-${String(Math.min(c.frames - 1, Math.round(t * c.fps))).padStart(5, '0')}.jpg`;
        return page(
          'Storygro capture → screencast',
          'A real website → frames of the video',
          `${c.frames} frames over ${c.duration} s in virtual time, ${c.taps.length} taps. The finger, magnifier and notes are drawn by the scene.`,
          `<div class="row shots">${RUN.captureAt.map(([t, label]) => `<figure><img src="${url(frame(t))}">${t} s · ${label}</figure>`).join('')}</div>
           <h2>↓ the screencast scene: phone, finger, magnifier, notes, in sync with the voice</h2>
           <div class="row scenes">${RUN.screencast.map(([p, label]) => `<figure><img src="${url(p)}">${label}</figure>`).join('')}</div>`,
        );
      },
    },
    {
      out: 'pipeline/05-qa.jpg',
      inputs: [RUN.qa, RUN.series],
      html: () => {
        const qa = json(RUN.qa);
        const s = seriesStatus(file(RUN.series));
        return page(
          'Storygro qa · storygro series',
          'Technical QA before packaging',
          'The checks find technical defects; they do not replace the owner watching and listening.',
          table(
            ['Check', 'Result', 'Detail'],
            qa.checks.map((ch: { name: string; status: string; detail: string }) => [esc(ch.name), `<span class="${esc(ch.status)}">${esc(ch.status)}</span>`, esc(ch.detail)]),
          ) +
            table(
              ['Episode of the series', 'Variant', 'Length', 'Approved', 'QA'],
              s.rows.map((r) => [
                `<b>${esc(r.episode)}</b>`,
                `${esc(r.variant)} (${esc(r.lang)})`,
                r.duration === null ? '—' : `${r.duration} s`,
                r.approved ? 'yes' : 'no',
                `<span class="${esc(r.qa)}">${esc(r.qa)}</span>`,
              ]),
            ),
        );
      },
    },
  ].filter((p) => p.inputs.every((i) => existsSync(file(i))) || (console.warn(`skip: ${p.out} needs ${p.inputs.join(', ')}`), false));
}
