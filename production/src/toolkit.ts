import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';
import { PROJECT_ROOT, REEL_ROOT } from './tools.ts';

/**
 * The toolkit: a bank of every method and tool for making content, by production stage, in
 * production/toolkit.yaml. Agents read the YAML to pick an approach; docs/reference/toolkit.md is
 * generated from it (`npm run docs:toolkit`) and tests keep both complete and in sync with the code.
 */
export const TOOLKIT_PATH = join(REEL_ROOT, 'toolkit.yaml');
export const TOOLKIT_DOC = join(PROJECT_ROOT, 'docs', 'reference', 'toolkit.md');

const Entry = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  kind: z.enum(['method', 'tool', 'style', 'scenes', 'provider']),
  stage: z.string(),
  title: z.string().min(1),
  what: z.string().min(1),
  when: z.string().optional(),
  how: z.string().optional(),
  commands: z.array(z.string()).default([]),
  scenes: z.array(z.string()).default([]),
  style: z.string().optional(),
  status: z.enum(['stable', 'pilot', 'planned']),
  docs: z.string(),
  examples: z.array(z.string()).default([]),
});
export type ToolkitEntry = z.infer<typeof Entry>;

export const Toolkit = z
  .object({ toolkit: z.literal(1), stages: z.record(z.string(), z.string()), entries: z.array(Entry).min(1) })
  .superRefine((t, ctx) => {
    const ids = new Set<string>();
    for (const e of t.entries) {
      if (ids.has(e.id)) ctx.addIssue({ code: 'custom', message: `duplicate toolkit id: ${e.id}` });
      ids.add(e.id);
      if (!(e.stage in t.stages)) ctx.addIssue({ code: 'custom', message: `${e.id}: unknown stage ${e.stage}` });
      if (e.kind === 'style' && !e.style) ctx.addIssue({ code: 'custom', message: `${e.id}: a style entry names its style` });
      if (e.kind === 'scenes' && !e.scenes.length) ctx.addIssue({ code: 'custom', message: `${e.id}: a scenes entry lists its scenes` });
    }
  });
export type Toolkit = z.infer<typeof Toolkit>;

export const loadToolkit = (path = TOOLKIT_PATH): Toolkit => Toolkit.parse(parse(readFileSync(path, 'utf8')));

/** GitHub's heading anchor for a title (same rule as the doc link check). */
const slug = (s: string) => s.trim().toLowerCase().replace(/[^\p{L}\p{N} _-]/gu, '').replace(/ /g, '-');
const link = (path: string) => {
  const [file, frag] = path.split('#');
  return `../../${file}${frag ? `#${frag}` : ''}`;
};

/** The reference page for people, generated from the YAML. */
export function toolkitMarkdown(t: Toolkit): string {
  const stages = Object.entries(t.stages);
  const count = (k: ToolkitEntry['kind']) => t.entries.filter((e) => e.kind === k).length;
  const out: string[] = [
    '# Toolkit: methods and tools for making content',
    '',
    '<!-- Generated from production/toolkit.yaml by `npm run docs:toolkit`. Edit the YAML, not this page. -->',
    '',
    `Every way Storygro makes content, in one bank: **${count('method')} methods**, **${count('tool')} tools**, **${count('style')} styles**, **${count('scenes')} scene families** and **${count('provider')} providers**, by production stage. Agents read [\`production/toolkit.yaml\`](../../production/toolkit.yaml) to pick an approach; this page is generated from it, and \`npm test\` fails when a command, style or scene is missing from the bank or a link is broken.`,
    '',
    '**Status:** *stable* — used across pieces · *pilot* — works, reviewed on one or two pieces · *planned* — not implemented.',
    '',
    '| Stage | Methods and tools |',
    '|---|---|',
    ...stages.map(([id, what]) => {
      const items = t.entries.filter((e) => e.stage === id).map((e) => `[${e.title}](#${slug(e.title)})`);
      return `| **${id}** — ${what} | ${items.join(' · ')} |`;
    }),
    '',
    'A new piece usually takes one entry per stage: a topic (choose), sources and facts (research), a script in a style (write, look), narration (voice), storyboard and render (make), QA and your own review (check), a package (ship).',
    '',
  ];
  for (const [n, [id, what]] of stages.entries()) {
    out.push(`## ${n + 1} · ${id[0]!.toUpperCase()}${id.slice(1)} — ${what}`, '');
    for (const e of t.entries.filter((x) => x.stage === id)) {
      out.push(`### ${e.title}`, '');
      const meta = [`*${e.kind} · ${e.status}*`];
      if (e.commands.length) meta.push(`commands: ${e.commands.map((c) => `\`${c}\``).join(', ')}`);
      if (e.style) meta.push(`style \`${e.style}\``);
      out.push(meta.join(' · '), '');
      out.push(e.what, '');
      if (e.scenes.length) out.push(`**Scenes:** ${e.scenes.map((s) => `\`${s}\``).join(', ')}`, '');
      if (e.when) out.push(`**Use when:** ${e.when}`, '');
      if (e.how) out.push(`**How:** \`${e.how.replace(/`/g, "'")}\``, '');
      const refs = [`[docs](${link(e.docs)})`, ...e.examples.map((x) => `[${x.split('/').slice(-2).join('/')}](${link(x)})`)];
      out.push(`**See:** ${refs.join(' · ')}`, '');
    }
  }
  return `${out.join('\n').trimEnd()}\n`;
}
