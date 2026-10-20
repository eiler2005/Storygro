// Fails when a relative link or image in a Markdown file points to a missing file or heading.
// External URLs are not fetched. Narration markup such as [11%](=eleven percent) is not a link.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gitExecutable } from './check-git-media.mjs';

const LINK = /(?:\]\(|(?:src|href)=")([^)"\s]+)/g;
const SKIP = /^(https?:|mailto:|\/|=)/;

/** GitHub's heading anchors: lower case, punctuation dropped, spaces to hyphens, repeats numbered. */
export function anchors(markdown) {
  const seen = new Map();
  const out = new Set();
  let fence = false;
  for (const line of markdown.split('\n')) {
    if (line.startsWith('```')) fence = !fence;
    const m = !fence && /^#{1,6} (.+)/.exec(line);
    if (!m) continue;
    const text = m[1].replace(/`/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
    const slug = text.trim().toLowerCase().replace(/[^\p{L}\p{N} _-]/gu, '').replace(/ /g, '-');
    const n = seen.get(slug) ?? 0;
    seen.set(slug, n + 1);
    out.add(n ? `${slug}-${n}` : slug);
  }
  return out;
}

export function brokenLinks(cwd = process.cwd()) {
  const files = execFileSync(gitExecutable(), ['ls-files', '--cached', '--others', '--exclude-standard', '*.md'], { cwd, encoding: 'utf8' })
    .split('\n')
    .filter((f) => f && existsSync(join(cwd, f)));
  const problems = [];
  for (const file of files) {
    const text = readFileSync(join(cwd, file), 'utf8').replace(/```[\s\S]*?```/g, '');
    for (const [, target] of text.matchAll(LINK)) {
      if (SKIP.test(target)) continue;
      const [path, frag] = target.split('#');
      const abs = path ? normalize(join(cwd, dirname(file), decodeURI(path))) : join(cwd, file);
      if (!existsSync(abs)) problems.push({ file, target, reason: 'missing file' });
      else if (frag && abs.endsWith('.md') && statSync(abs).isFile() && !anchors(readFileSync(abs, 'utf8')).has(frag))
        problems.push({ file, target, reason: 'missing heading' });
    }
  }
  return problems;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const problems = brokenLinks();
  for (const p of problems) console.error(`  ${p.file}: ${p.target} (${p.reason})`);
  if (problems.length) {
    console.error(`Doc links: ${problems.length} broken link(s).`);
    process.exitCode = 1;
  } else console.log('Doc links: every relative link resolves.');
}
