import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  addSnapshot,
  canTransition,
  checklist,
  emptyLedger,
  emptyMetrics,
  Ledger,
  loadLedger,
  loadMetrics,
  metricsReport,
  nextStates,
  parseMetricPairs,
  planPublication,
  publicationsMarkdown,
  saveLedger,
  saveMetrics,
  STATES,
  TRANSITIONS,
  transition,
  type Publication,
} from '../production/src/publish.ts';

const NOW = new Date('2026-10-20T10:00:00Z');
const at = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);
const sha = (c: string) => c.repeat(64);

/** A release manifest in the shape `packageEpisode` writes, with a Russian and an English variant. */
function manifest(over: { status?: string; ru?: Record<string, unknown>; files?: { path: string; sha256: string }[] } = {}) {
  const variant = (id: string, over: Record<string, unknown> = {}) => ({
    id,
    lang: id,
    title: `Title ${id}`,
    qa: { verdict: 'pass' },
    approved: { approved: true, hash: 'h' },
    ...over,
  });
  const file = (path: string, c: string) => ({ path, bytes: 10, sha256: sha(c) });
  return {
    release: 'ai-jobs-2026-10-20-abcd1234',
    episode: { id: 'ai-jobs', title: 'AI and jobs', series: null },
    status: over.status ?? 'ready-for-review',
    problems: [],
    published: false,
    variants: [variant('ru', over.ru), variant('en')],
    files: over.files ?? [
      file('ru/ai-jobs-ru.mp4', 'a'),
      file('ru/ai-jobs-ru-web.mp4', 'b'),
      file('ru/ai-jobs-ru.srt', 'c'),
      file('ru/ai-jobs-ru.vtt', 'd'),
      file('ru/ai-jobs-ru-cover.png', 'e'),
      file('ru/ai-jobs-ru-hook.png', 'f'),
      file('ru/ai-jobs-ru-storyboard.pdf', '1'),
      file('ru/ai-jobs-ru-QA.md', '2'),
      file('ru/post.md', '3'),
      file('ru/carousel/01.png', '4'),
      file('en/ai-jobs-en.mp4', '5'),
      file('en/ai-jobs-en-web.mp4', '6'),
      file('en/ai-jobs-en-cover.png', '7'),
      file('sources.md', '8'),
    ],
  };
}

const plan = (ledger: Ledger, over: Record<string, unknown> = {}) =>
  planPublication(ledger, { releaseDir: 'releases/ai-jobs', manifest: manifest(), variant: 'ru', platform: 'instagram', account: '@handle', now: NOW, ...over });

/** A ledger holding one publication walked to `state` along the shortest legal path. */
function ledgerIn(state: 'draft' | 'approved' | 'uploading' | 'published' | 'failed' | 'cancelled' = 'draft', over: Record<string, unknown> = {}) {
  let { ledger, publication } = plan(emptyLedger(), over);
  const go = (to: string, opts: Record<string, unknown> = {}) => {
    ({ ledger } = transition(ledger, publication.id, to, { now: at(1), ...opts }));
  };
  if (state === 'approved' || state === 'uploading' || state === 'published' || state === 'failed') go('approved');
  if (state === 'uploading' || state === 'published' || state === 'failed') go('uploading');
  if (state === 'published') go('published', { url: 'https://www.instagram.com/reel/abc/' });
  if (state === 'failed') go('failed', { note: 'upload timed out' });
  if (state === 'cancelled') go('cancelled');
  return { ledger, id: publication.id };
}

const snapshot = (id: string, over: Record<string, unknown> = {}) => ({
  publicationId: id,
  window: '7d',
  capturedAt: '2026-10-27T10:00:00Z',
  source: 'Instagram Insights, read by hand',
  values: { views: 1200, likes: 80 },
  ...over,
});

test('planning picks the variant files only: the web video, cover, subtitles and post, with their checksums', () => {
  const before = emptyLedger();
  const { ledger, publication: p } = plan(before);
  assert.deepEqual(before, emptyLedger(), 'the input ledger is not modified');
  assert.equal(p.id, 'ai-jobs-2026-10-20-abcd1234:instagram:handle:ru');
  assert.equal(p.release, 'ai-jobs-2026-10-20-abcd1234');
  assert.equal(p.releaseDir, 'releases/ai-jobs');
  assert.equal(p.episode, 'ai-jobs');
  assert.equal(p.lang, 'ru');
  assert.equal(p.adapter, 'manual');
  assert.equal(p.state, 'draft');
  assert.deepEqual(p.history, []);
  assert.equal(p.createdAt, '2026-10-20T10:00:00.000Z');
  assert.deepEqual(p.files, [
    { role: 'video', path: 'ru/ai-jobs-ru-web.mp4', sha256: sha('b') },
    { role: 'cover', path: 'ru/ai-jobs-ru-cover.png', sha256: sha('e') },
    { role: 'subtitles', path: 'ru/ai-jobs-ru.srt', sha256: sha('c') },
    { role: 'post', path: 'ru/post.md', sha256: sha('3') },
  ]);
  assert.deepEqual(ledger.publications, [p]);
});

test('without a web video the master mp4 is used; cover, subtitles and post are optional; a carousel is not a cover', () => {
  const files = [
    { path: 'ru/ai-jobs-ru.mp4', sha256: sha('a') },
    { path: 'ru/carousel/ai-jobs-cover.png', sha256: sha('9') },
  ];
  const { publication } = plan(emptyLedger(), { manifest: manifest({ files }) });
  assert.deepEqual(publication.files, [{ role: 'video', path: 'ru/ai-jobs-ru.mp4', sha256: sha('a') }]);
  const en = plan(emptyLedger(), { variant: 'en' }).publication;
  assert.deepEqual(en.files.map((f) => f.path), ['en/ai-jobs-en-web.mp4', 'en/ai-jobs-en-cover.png']);
});

test('a release or variant that is not ready is refused with every reason', () => {
  assert.throws(() => plan(emptyLedger(), { manifest: manifest({ status: 'incomplete' }) }), /status is 'incomplete', not 'ready-for-review'/);
  assert.throws(() => plan(emptyLedger(), { manifest: manifest({ ru: { qa: { verdict: 'fail', problem: 'QA fail' } } }) }), /QA verdict of ru is 'fail', not 'pass' \(QA fail\)/);
  assert.throws(() => plan(emptyLedger(), { manifest: manifest({ ru: { approved: { approved: false, hash: 'h' } } }) }), /not approved/);
  assert.throws(() => plan(emptyLedger(), { manifest: manifest({ files: [{ path: 'ru/post.md', sha256: sha('3') }] }) }), /no video file/);
  assert.throws(() => plan(emptyLedger(), { variant: 'de' }), /no variant 'de' \(variants: ru, en\)/);
  assert.throws(() => plan(emptyLedger(), { platform: 'myspace' }), /invalid platform/);
  assert.throws(() => plan(emptyLedger(), { account: '  ' }), /account/);
  const both = manifest({ status: 'incomplete', ru: { qa: { verdict: 'fail' }, approved: { approved: false } } });
  assert.throws(
    () => plan(emptyLedger(), { manifest: both }),
    (e: Error) => /status/.test(e.message) && /QA verdict/.test(e.message) && /not approved/.test(e.message),
  );
});

test('the same release, platform, account and variant is not planned twice unless again; failed and cancelled do not block', () => {
  const { ledger, id } = ledgerIn('draft');
  assert.throws(() => plan(ledger), /already covers this release.*state draft.*--again/);
  assert.throws(() => plan(ledger, { account: '@Handle' }), /already covers/, 'accounts compare case-insensitively without the @');
  assert.doesNotThrow(() => plan(ledger, { account: '@other' }));
  assert.doesNotThrow(() => plan(ledger, { platform: 'youtube' }));
  assert.doesNotThrow(() => plan(ledger, { variant: 'en' }));
  assert.throws(() => plan(ledgerIn('published').ledger), /state published/);

  const again = plan(ledger, { again: true });
  assert.equal(again.publication.id, `${id}:2`);
  assert.equal(plan(again.ledger, { again: true }).publication.id, `${id}:3`);

  for (const state of ['failed', 'cancelled'] as const) {
    const done = ledgerIn(state);
    const next = plan(done.ledger);
    assert.equal(next.publication.id, `${id}:2`, 'the id of the earlier attempt stays taken');
    assert.equal(next.ledger.publications.length, 2);
  }
});

test('the transition graph allows exactly the documented moves and names the allowed ones otherwise', () => {
  const expected: Record<string, string[]> = {
    draft: ['approved', 'cancelled'],
    approved: ['queued', 'uploading', 'cancelled'],
    queued: ['uploading', 'failed', 'cancelled'],
    uploading: ['processing', 'published', 'failed'],
    processing: ['published', 'failed'],
    failed: ['queued', 'uploading', 'cancelled'],
    published: [],
    cancelled: [],
  };
  assert.deepEqual(Object.fromEntries(STATES.map((s) => [s, [...TRANSITIONS[s]]])), expected);
  for (const from of STATES) for (const to of STATES) assert.equal(canTransition(from, to), expected[from]!.includes(to), `${from} → ${to}`);
  assert.deepEqual([...nextStates('processing')], ['published', 'failed']);

  const { ledger, id } = ledgerIn('draft');
  assert.throws(() => transition(ledger, id, 'published', { url: 'https://example.com/p' }), /from 'draft' to 'published'.*allowed next states are 'approved', 'cancelled'/);
  assert.throws(() => transition(ledger, id, 'bogus'), /invalid state/);
  assert.throws(() => transition(ledger, 'nope', 'approved'), /no publication 'nope'/);
  for (const final of ['published', 'cancelled'] as const)
    assert.throws(() => transition(ledgerIn(final).ledger, ledgerIn(final).id, 'queued'), /final, no further transitions/);

  // a full run through the queue, and a manual upload that skips it
  let l = ledger;
  for (const to of ['approved', 'queued', 'uploading', 'processing']) l = transition(l, id, to, { now: at(5) }).ledger;
  assert.equal(transition(l, id, 'published', { url: 'https://example.com/p' }).publication.state, 'published');
  assert.equal(transition(transition(ledger, id, 'approved').ledger, id, 'uploading').publication.state, 'uploading');
});

test('published needs a url, failed needs a reason, and every transition lands in the history', () => {
  const { ledger, id } = ledgerIn('uploading');
  assert.throws(() => transition(ledger, id, 'published'), /without a url/);
  assert.throws(() => transition(ledger, id, 'published', { url: 'not a link' }), /invalid url/);
  assert.throws(() => transition(ledger, id, 'published', { url: 'ftp://example.com/x' }), /http\(s\)/);
  assert.throws(() => transition(ledger, id, 'failed'), /without the reason/);
  assert.throws(() => transition(ledger, id, 'failed', { note: '   ' }), /without the reason/);

  const done = transition(ledger, id, 'published', { url: 'https://www.instagram.com/reel/abc/', externalId: '1789', note: 'posted from the phone', now: at(30) });
  const p = done.publication;
  assert.equal(p.state, 'published');
  assert.equal(p.url, 'https://www.instagram.com/reel/abc/');
  assert.equal(p.externalId, '1789');
  assert.equal(p.updatedAt, at(30).toISOString());
  assert.deepEqual(p.history.map((h) => [h.from, h.to]), [['draft', 'approved'], ['approved', 'uploading'], ['uploading', 'published']]);
  assert.deepEqual(p.history.at(-1), { at: at(30).toISOString(), from: 'uploading', to: 'published', note: 'posted from the phone' });
  assert.equal(ledger.publications[0]!.state, 'uploading', 'the earlier ledger is not modified');
});

test('a failed upload keeps its reason, and a retry keeps the whole history', () => {
  const { ledger, id } = ledgerIn('failed');
  const failed = ledger.publications[0]!;
  assert.equal(failed.error, 'upload timed out');
  assert.equal(failed.history.at(-1)!.note, 'upload timed out');

  const retry = transition(ledger, id, 'uploading', { now: at(60), note: 'checked the account first: not posted' }).publication;
  assert.equal(retry.state, 'uploading');
  assert.equal(retry.error, undefined, 'the current error is cleared');
  assert.deepEqual(retry.history.map((h) => h.to), ['approved', 'uploading', 'failed', 'uploading']);
  assert.equal(retry.history[2]!.note, 'upload timed out', 'the old reason stays in the history');
  assert.equal(transition(ledger, id, 'queued').publication.state, 'queued');
});

test('metrics are accepted only for published publications', () => {
  for (const state of ['draft', 'approved', 'uploading', 'failed', 'cancelled'] as const) {
    const { ledger, id } = ledgerIn(state);
    assert.throws(() => addSnapshot(ledger, emptyMetrics(), snapshot(id)), new RegExp(`is '${state}'`));
  }
  const { ledger, id } = ledgerIn('published');
  assert.throws(() => addSnapshot(ledger, emptyMetrics(), snapshot('nope')), /no publication 'nope'/);
  const { store, snapshot: s } = addSnapshot(ledger, emptyMetrics(), snapshot(id));
  assert.deepEqual(store.snapshots, [s]);
  assert.deepEqual(emptyMetrics().snapshots, [], 'the input store is not modified');
});

test('metric names are checked per platform; x- custom metrics are allowed; values must be finite and not negative', () => {
  const ig = ledgerIn('published');
  const yt = ledgerIn('published', { platform: 'youtube', account: '@channel' });
  const add = (l: { ledger: Ledger; id: string }, values: Record<string, number>) => addSnapshot(l.ledger, emptyMetrics(), snapshot(l.id, { values }));

  assert.throws(() => add(ig, { impressions: 5 }), /unknown metric 'impressions' for Instagram; allowed: views, reach/);
  assert.throws(() => add(ig, { subscribersGained: 5 }), /unknown metric/, 'a YouTube metric is not an Instagram metric');
  assert.throws(() => add(yt, { reach: 5 }), /unknown metric 'reach' for YouTube/);
  assert.throws(() => add(ig, { Views: 5 }), /unknown metric/, 'names are case-sensitive');
  assert.throws(() => add(ig, { 'x-': 1 }), /unknown metric/);
  assert.doesNotThrow(() => add(ig, { avgWatchSec: 7.5, saves: 3 }));
  assert.doesNotThrow(() => add(yt, { avgPercentViewed: 41.2, subscribersGained: 2 }));
  assert.equal(add(ig, { 'x-profile-visits': 12, views: 100 }).snapshot.values['x-profile-visits'], 12);

  assert.throws(() => add(ig, { views: -1 }), /invalid snapshot/);
  assert.throws(() => add(ig, { views: Number.NaN }), /invalid snapshot/);
  assert.throws(() => add(ig, { views: Number.POSITIVE_INFINITY }), /invalid snapshot/);
  assert.throws(() => add(ig, {}), /at least one metric/);
  assert.throws(() => addSnapshot(ig.ledger, emptyMetrics(), snapshot(ig.id, { source: '  ' })), /where the numbers came from/);
  assert.throws(() => addSnapshot(ig.ledger, emptyMetrics(), snapshot(ig.id, { window: '3d' })), /invalid snapshot/);
  assert.throws(() => addSnapshot(ig.ledger, emptyMetrics(), snapshot(ig.id, { capturedAt: 'yesterday' })), /invalid snapshot/);
});

test('missing metrics stay absent: nothing is filled with zeros, and an explicit zero stays a zero', () => {
  const { ledger, id } = ledgerIn('published');
  const { snapshot: s } = addSnapshot(ledger, emptyMetrics(), snapshot(id, { values: { views: 1200, saves: 0 } }));
  assert.deepEqual(s.values, { views: 1200, saves: 0 });
  assert.equal('likes' in s.values, false);
  assert.deepEqual(parseMetricPairs(['views=1200', 'likes=80.5']), { views: 1200, likes: 80.5 });
  assert.throws(() => parseMetricPairs(['views=']), /non-negative number, got ''/, 'an empty value is not 0');
  assert.throws(() => parseMetricPairs(['views=abc']), /non-negative number/);
  assert.throws(() => parseMetricPairs(['views=-3']), /non-negative number/);
  assert.throws(() => parseMetricPairs(['views']), /name=number/);
  assert.throws(() => parseMetricPairs(['views=1', 'views=2']), /given twice/);
  assert.throws(() => parseMetricPairs(['__proto__=1']), /name=number/);
  assert.throws(() => parseMetricPairs([]), /no metric values/);
});

test('a second snapshot with the same publication, window and capture time is rejected', () => {
  const { ledger, id } = ledgerIn('published');
  const first = addSnapshot(ledger, emptyMetrics(), snapshot(id)).store;
  assert.throws(() => addSnapshot(ledger, first, snapshot(id, { values: { views: 5 } })), /already recorded/);
  assert.throws(() => addSnapshot(ledger, first, snapshot(id, { capturedAt: '2026-10-27T13:00:00+03:00' })), /already recorded/, 'the same instant in another offset');
  const more = addSnapshot(ledger, addSnapshot(ledger, first, snapshot(id, { window: '28d' })).store, snapshot(id, { capturedAt: '2026-10-27T11:00:00Z' }));
  assert.equal(more.store.snapshots.length, 3);
});

test('the report keeps platforms and windows apart and shows missing metrics as —', () => {
  const ig = ledgerIn('published');
  const yt = ledgerIn('published', { platform: 'youtube', account: '@channel' });
  const ledger: Ledger = { ledger: 1, publications: [...ig.ledger.publications, ...yt.ledger.publications] };
  let store = emptyMetrics();
  const add = (id: string, over: Record<string, unknown>) => {
    store = addSnapshot(ledger, store, snapshot(id, over)).store;
  };
  add(ig.id, { values: { views: 1200, likes: 80, saves: 9 } });
  add(ig.id, { window: '24h', capturedAt: '2026-10-21T10:00:00Z', values: { views: 300 } });
  add(yt.id, { values: { views: 5400, avgPercentViewed: 41.2, 'x-end-screen-clicks': 7 } });

  const md = metricsReport(ledger, store);
  const sections = md.split(/^## /m).slice(1);
  assert.deepEqual(sections.map((s) => s.split('\n')[0]), ['Instagram — 24h', 'Instagram — 7d', 'YouTube — 7d']);
  const [ig24, ig7, yt7] = sections as [string, string, string];

  assert.match(ig24, /\| views \|\n/);
  assert.doesNotMatch(ig24, /likes|1,200/, 'another window never leaks into a table');
  assert.match(ig7, /\| views \| likes \| saves \|/);
  assert.match(ig7, /\| 1,200 \| 80 \| 9 \|/);
  assert.doesNotMatch(ig7, /5,400|avgPercentViewed/);
  assert.match(yt7, /\| views \| avgPercentViewed \| x-end-screen-clicks \|/);
  assert.match(yt7, /\| 5,400 \| 41\.2 \| 7 \|/);
  assert.doesNotMatch(yt7, /1,200|saves/);
  assert.match(ig7, /\| ai-jobs \| ru \| @handle \| \[open\]\(https:\/\/www\.instagram\.com\/reel\/abc\/\) \| 2026-10-27 10:00 \| Instagram Insights, read by hand \|/);
  assert.ok(md.trimEnd().endsWith('Snapshots are what the platform reported at capture time; compare only the same platform and window; early numbers are not evidence of cause.'));

  // a metric reported for one publication only is a column with — for the other
  const ig2 = plan(ledger, { variant: 'en', account: '@handle' });
  const wide: Ledger = transition(transition(transition(ig2.ledger, ig2.publication.id, 'approved').ledger, ig2.publication.id, 'uploading').ledger, ig2.publication.id, 'published', {
    url: 'https://www.instagram.com/reel/def/',
  }).ledger;
  store = addSnapshot(wide, store, snapshot(ig2.publication.id, { values: { views: 40, reach: 35 } })).store;
  const igTable = metricsReport(wide, store).split(/^## /m).find((s) => s.startsWith('Instagram — 7d'))!;
  assert.match(igTable, /\| views \| reach \| likes \| saves \|/);
  assert.match(igTable, /\| 1,200 \| — \| 80 \| 9 \|/);
  assert.match(igTable, /\| 40 \| 35 \| — \| — \|/);
});

test('an empty report and snapshots without a publication are said out loud', () => {
  assert.match(metricsReport(emptyLedger(), emptyMetrics()), /No snapshots recorded yet\./);
  const { ledger, id } = ledgerIn('published');
  const store = addSnapshot(ledger, emptyMetrics(), snapshot(id)).store;
  const md = metricsReport(emptyLedger(), store);
  assert.match(md, /1 snapshot\(s\) refer to publications that are not in the ledger/);
  assert.match(md, /early numbers are not evidence of cause/);
});

test('the checklist says it is manual and lists the account, files with checksums, text and the report-back step', () => {
  const { ledger, id } = ledgerIn('approved');
  const md = checklist(ledger.publications[0]!, 'Первый пост\n\n#ai');
  assert.match(md, /Manual adapter/);
  assert.match(md, /does not upload anything/);
  assert.match(md, /\| Platform \| Instagram \|/);
  assert.match(md, /@handle/);
  assert.match(md, new RegExp(`releases/ai-jobs/ru/ai-jobs-ru-web\\.mp4\` \\| \`${sha('b')}\``));
  assert.match(md, new RegExp(sha('e')));
  assert.match(md, /Первый пост\n\n#ai/);
  assert.ok(md.includes(`storygro publish mark ${id} published --url <link>`));
  assert.ok(md.includes(`storygro publish mark ${id} failed --note`));
  assert.match(md, /look at the account first/);
  assert.doesNotMatch(md, /storygro publish approve/, 'an approved publication is not told to approve again');
  assert.match(checklist(plan(emptyLedger()).publication), /run `storygro publish approve .+` before uploading/);
  assert.match(checklist(ledgerIn('published').ledger.publications[0]!), /nothing to upload/);
  // post text containing a code fence cannot break out of the block
  assert.match(checklist(ledger.publications[0]!, '```\ncode\n```'), /````text\n```\ncode\n```\n````/);
});

test('the ledger on disk: missing file is empty, saves are pretty with a trailing newline, broken files fail loudly', () => {
  const dir = mkdtempSync(join(tmpdir(), 'storygro-publish-'));
  try {
    const path = join(dir, 'content', 'publishing', 'publications.json');
    assert.deepEqual(loadLedger(path), emptyLedger());
    assert.deepEqual(loadMetrics(join(dir, 'nope.json')), emptyMetrics());

    const { ledger, id } = ledgerIn('published');
    saveLedger(path, ledger);
    const text = readFileSync(path, 'utf8');
    assert.ok(text.endsWith('}\n'));
    assert.ok(text.startsWith('{\n  "ledger": 1,\n  "publications": [\n'));
    assert.deepEqual(loadLedger(path), ledger);
    assert.equal(existsSync(`${path}.${process.pid}.tmp`), false, 'no temp file is left behind');

    const mpath = join(dir, 'content', 'publishing', 'metrics.json');
    const store = addSnapshot(ledger, emptyMetrics(), snapshot(id)).store;
    saveMetrics(mpath, store);
    assert.deepEqual(loadMetrics(mpath), store);

    writeFileSync(path, '{ not json');
    assert.throws(() => loadLedger(path), /cannot read the publication ledger/);
    writeFileSync(path, JSON.stringify({ ledger: 2, publications: [] }));
    assert.throws(() => loadLedger(path), /invalid ledger/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a hand-edited ledger is validated: published without a url, duplicate ids and unknown fields are refused', () => {
  const { ledger, id } = ledgerIn('published');
  const p = ledger.publications[0]!;
  const { url: _url, ...noUrl } = p;
  assert.throws(() => Ledger.parse({ ledger: 1, publications: [noUrl] }), /needs a url/);
  assert.throws(() => Ledger.parse({ ledger: 1, publications: [p, p] }), /duplicate publication id/);
  assert.throws(() => Ledger.parse({ ledger: 1, publications: [{ ...p, adapter: 'postiz' }] }));
  assert.throws(() => Ledger.parse({ ledger: 1, publications: [{ ...p, stats: { views: 1 } }] }));
  assert.throws(() => Ledger.parse({ ledger: 1, publications: [{ ...p, state: 'failed' }] }), /needs the reason/);
  assert.match(publicationsMarkdown(ledger), new RegExp(`${id.replaceAll('.', '\\.')} \\| published \\| Instagram`));
  assert.equal(publicationsMarkdown(emptyLedger()), 'No publications in the ledger.\n');
  const _typecheck: Publication = p;
  void _typecheck;
});
