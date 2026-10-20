import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type TestContext, test } from 'node:test';
import { stringify } from 'yaml';
import { approval } from '../production/src/board.ts';
import { loadReview, scriptHash } from '../production/src/review.ts';
import { loadSpec } from '../production/src/spec.ts';
import { workDir } from '../production/src/timeline.ts';
import { approveStep, screenText, stepStates, tracker, trackerMarkdown } from '../production/src/workflow.ts';

/** An episode folder with one Russian variant, facts and a picture its scene points to. */
function episode(t: TestContext) {
  const root = mkdtempSync(join(tmpdir(), 'storygro-workflow-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const dir = join(root, 'videos', 'demo');
  mkdirSync(join(dir, 'shots'), { recursive: true });
  writeFileSync(join(dir, 'facts.json'), JSON.stringify({ n: { _source: 'Report, p. 3', value: '3' }, old: { source: 'https://example.com', value: '1' } }));
  writeFileSync(join(dir, 'shots/a.jpg'), 'picture v1');
  writeFileSync(join(dir, 'episode.yaml'), stringify({ episode: 1, id: 'demo', title: 'Демо', series: 'open-door', variants: [{ id: 'ru', spec: 'ru.reel.yaml' }] }));
  const spec = join(dir, 'ru.reel.yaml');
  writeFileSync(spec, stringify({
    reel: 1, title: 'Демо', lang: 'ru', voice: { engine: 'none' }, data: { facts: 'facts.json' },
    scenes: [{ id: 'intro', scene: 'illustration', say: 'Одна мысль.', props: { shots: [{ image: 'shots/a.jpg' }], title: { text: 'Заголовок' }, badge: { valueFrom: 'facts.n.value' } } }],
  }));
  return { root, dir, spec };
}

test('approvals live in review.yaml per step; a picture change resets the storyboard, not the script', (t) => {
  const { dir, spec } = episode(t);
  let l = loadSpec(spec);
  assert.deepEqual(stepStates(l).map((s) => s.state), ['not-recorded', 'pending', 'pending']);
  approveStep(l, 'script', 'owner-test', 'owner');
  assert.equal(loadReview(dir)!.approvals.ru!.script!.by, 'owner-test');
  assert.throws(() => approveStep(l, 'storyboard', 'agent', 'agent'), /no storyboard/);
  mkdirSync(workDir(l), { recursive: true });
  writeFileSync(join(workDir(l), 'board.html'), '<html></html>');
  approveStep(l, 'storyboard', 'agent', 'agent');
  assert.deepEqual(stepStates(l).map((s) => s.state), ['approved', 'technical', 'pending']);
  assert.equal(approval(l).approved, true, 'a technical storyboard approval still opens the render gate');

  writeFileSync(join(dir, 'shots/a.jpg'), 'picture v2');
  l = loadSpec(spec);
  assert.deepEqual(stepStates(l).map((s) => s.state), ['approved', 'changed', 'pending']);

  const before = scriptHash(l);
  writeFileSync(spec, readFileSync(spec, 'utf8').replace('Одна мысль.', 'Другая мысль.'));
  l = loadSpec(spec);
  assert.notEqual(scriptHash(l), before);
  assert.equal(stepStates(l)[0]!.state, 'changed');
});

test('release needs an approved storyboard and a master that passed QA', (t) => {
  const { spec } = episode(t);
  const l = loadSpec(spec);
  mkdirSync(workDir(l), { recursive: true });
  writeFileSync(join(workDir(l), 'board.html'), '');
  assert.throws(() => approveStep(l, 'release', 'owner', 'owner'), /storyboard is not approved/);
  approveStep(l, 'storyboard', 'owner', 'owner');
  assert.throws(() => approveStep(l, 'release', 'owner', 'owner'), /QA/);
  writeFileSync(join(workDir(l), `${l.name}.mp4`), 'video');
  writeFileSync(join(workDir(l), 'qa.json'), JSON.stringify({ verdict: 'pass', at: new Date(Date.now() + 5000).toISOString(), video: '' }));
  approveStep(l, 'release', 'owner', 'owner');
  assert.equal(stepStates(l)[2]!.state, 'approved');
  writeFileSync(join(workDir(l), `${l.name}.mp4`), 'another video');
  assert.equal(stepStates(loadSpec(spec))[2]!.state, 'changed', 'a new master needs a new look');
});

test('review.yaml keeps hand-written questions and comments when an approval is added', (t) => {
  const { dir, spec } = episode(t);
  writeFileSync(join(dir, 'review.yaml'), '# мои заметки\nreview: 1\nquestions:\n  - { id: tone, ask: Не слишком ли резко?, for: owner }\nnotes: черновик\napprovals: {}\n');
  approveStep(loadSpec(spec), 'script', 'owner', 'owner');
  const text = readFileSync(join(dir, 'review.yaml'), 'utf8');
  assert.match(text, /# мои заметки/);
  assert.match(text, /Не слишком ли резко\?/);
  assert.equal(loadReview(dir)!.questions[0]!.open, true);
});

test('the tracker says whose move it is and counts sourced facts and open questions', (t) => {
  const { root, dir } = episode(t);
  writeFileSync(join(dir, 'review.yaml'), 'review: 1\nquestions:\n  - { id: q, ask: Ок?, for: owner }\napprovals: {}\n');
  const r = tracker(join(root, 'videos'), { ledgerPath: join(root, 'none.json') });
  assert.equal(r.rows.length, 1);
  const row = r.rows[0]!;
  assert.equal(row.stage, 'script');
  assert.equal(row.turn, 'owner');
  assert.deepEqual(row.facts, { total: 2, sourced: 2 });
  assert.deepEqual(row.questions, { owner: 1, agent: 0 });
  assert.equal(row.series, 'open-door');
  const md = trackerMarkdown(r, root);
  assert.match(md, /Ждут тебя: 1/);
  assert.match(md, /одобрить сценарий/);
  assert.match(md, /\[Демо\]\(videos\/demo\/episode\.yaml\)/);
});

test('screen text keeps what a viewer reads and drops pictures, prompts and layout', () => {
  assert.deepEqual(screenText({
    shots: [{ image: 'shots/a.jpg', prompt: '@wolf' }], title: { text: 'Бунт машин?', at: 'rogue', align: 'left' },
    labels: [{ text: 'замок', x: 0.5, y: 0.2, tone: 'teal' }], badge: { value: '3', label: 'организации', valueFrom: 'facts.n.value' }, source: 'Anthropic, 30.07.2026',
  }), ['Бунт машин?', 'замок', '3', 'организации', 'Anthropic, 30.07.2026']);
});
