/** Writes docs/reference/toolkit.md from production/toolkit.yaml: npm run docs:toolkit */
import { writeFileSync } from 'node:fs';
import { loadToolkit, TOOLKIT_DOC, toolkitMarkdown } from '../src/toolkit.ts';

const t = loadToolkit();
writeFileSync(TOOLKIT_DOC, toolkitMarkdown(t));
console.log(`✔ ${TOOLKIT_DOC} (${t.entries.length} entries)`);
