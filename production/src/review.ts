/**
 * The review record of an episode, kept in Git next to its script: `review.yaml` holds the open
 * questions and notes people edit by hand, and the approvals `storygro approve` writes for each
 * variant and step — script, storyboard, release. An approval stores a hash of what was approved,
 * so any later change shows as "changed since approval" instead of silently passing.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { isMap, parseDocument, visit } from 'yaml';
import { z } from 'zod';
import type { LoadedSpec } from './spec.ts';

export const STEPS = ['script', 'storyboard', 'release'] as const;
export type Step = (typeof STEPS)[number];

export const ApprovalRecord = z.object({
  hash: z.string().min(1),
  at: z.string().min(1),
  by: z.string().min(1),
  /** owner: the person who decides; agent: a technical approval so work can continue (never a substitute) */
  role: z.enum(['owner', 'agent']).default('owner'),
  /** release: checksum (first 12 hex) of the master that was watched */
  master: z.string().optional(),
});
export type ApprovalRecord = z.infer<typeof ApprovalRecord>;

export const Review = z.object({
  review: z.literal(1),
  questions: z
    .array(z.object({ id: z.string().min(1), ask: z.string().min(1), for: z.enum(['owner', 'agent']).default('owner'), open: z.boolean().default(true), answer: z.string().optional() }))
    .default([]),
  notes: z.string().nullish(),
  approvals: z.record(z.string(), z.object({ script: ApprovalRecord.optional(), storyboard: ApprovalRecord.optional(), release: ApprovalRecord.optional() })).default({}),
});
export type Review = z.infer<typeof Review>;

const TEMPLATE = `# Review record of this episode, kept in Git — see docs/how-to/review-and-approve.md.
# Edit questions and notes by hand. \`storygro approve\` writes the approvals; do not edit them.
review: 1
questions: []
notes: ''
approvals: {}
`;

export const reviewPath = (dir: string) => join(dir, 'review.yaml');
export const variantKey = (l: LoadedSpec) => l.variant || 'default';

export function loadReview(dir: string): Review | undefined {
  const f = reviewPath(dir);
  return existsSync(f) ? Review.parse(parseDocument(readFileSync(f, 'utf8')).toJS()) : undefined;
}

export function stepRecord(l: LoadedSpec, step: Step): ApprovalRecord | undefined {
  return loadReview(l.dir)?.approvals[variantKey(l)]?.[step];
}

/** Writes one approval, keeping the comments, questions and notes people wrote in the file. */
export function writeApproval(l: LoadedSpec, step: Step, record: ApprovalRecord) {
  const f = reviewPath(l.dir);
  const doc = parseDocument(existsSync(f) ? readFileSync(f, 'utf8') : TEMPLATE);
  Review.parse(doc.toJS());
  doc.setIn(['approvals', variantKey(l), step], doc.createNode(ApprovalRecord.parse(record)));
  // the template's `approvals: {}` is a flow map; write the records as readable block YAML
  const approvals = doc.get('approvals', true);
  if (isMap(approvals)) visit(approvals, { Map: (_, node) => { node.flow = false; } });
  writeFileSync(f, doc.toString({ lineWidth: 0 }));
}

/** Creates review.yaml with the template when the episode has none; returns its path. */
export function ensureReview(dir: string) {
  const f = reviewPath(dir);
  if (!existsSync(f)) writeFileSync(f, TEMPLATE);
  return f;
}

const VISUAL = new Set(['shots']);

/**
 * What the script step approves: title, narration, on-screen text and positions, the post and the
 * data files with their sources — not the pictures, scene code or theme (the storyboard covers those).
 */
export function scriptHash(l: LoadedSpec): string {
  const h = createHash('sha1');
  const { spec } = l;
  h.update(JSON.stringify({
    title: spec.title, lang: spec.lang, hooks: spec.hooks, post: spec.post,
    scenes: spec.scenes.map((s) => ({ id: s.id, say: s.say, caption: s.caption, props: Object.fromEntries(Object.entries(s.props).filter(([k]) => !VISUAL.has(k))) })),
  }));
  for (const p of Object.values(spec.data).sort()) {
    const f = resolve(l.dir, p);
    h.update('\0').update(existsSync(f) ? readFileSync(f) : '');
  }
  const sources = join(l.dir, 'sources.md');
  if (existsSync(sources)) h.update('\0').update(readFileSync(sources));
  return h.digest('hex').slice(0, 12);
}

export const fileHash = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 12);
