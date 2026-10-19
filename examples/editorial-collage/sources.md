# Sources and claim boundaries

Checked on 2026-10-19. This episode is an original editorial explanation of agent verification, not a forecast of developer employment.

| Material | Source | Used for |
|---|---|---|
| Agent feedback and coding verification | [Anthropic — Building effective agents](https://www.anthropic.com/engineering/building-effective-agents), 2024-12-19 | Tool execution, tests and human review provide feedback beyond a model's statement that it finished. General principle only; the article's old SDK details are not treated as current implementation advice. |
| Verifiable acceptance criteria | [Claude Code — Best practices](https://code.claude.com/docs/en/best-practices) | Give the agent a way to verify its work: explicit criteria, tests and evidence. This is guidance, not a claim that tests prove every requirement. |
| Validation example | [demo.mjs](https://github.com/eiler2005/Storygro/blob/main/examples/editorial-collage/demo.mjs), authored for this episode | An intentionally broken `value => true` validator accepts an empty string. The replacement passes four chosen fixture cases. This is **illustrative**, not a captured model failure, benchmark or production email-validation library. |
| Visual reference | [HelioCore_HR — YouTube Short](https://www.youtube.com/shorts/gHFDPVjbOco) | Visual grammar only: squared paper, cut-out figures, torn labels and framed inserts. [Observed analysis](https://github.com/eiler2005/Storygro/blob/main/content/research/references/gHFDPVjbOco.md). No source footage, likeness, voice, script or music is redistributed. |

The recommendation to plan checks and retain a human release decision is the author's workflow proposal. The film makes no numeric productivity, job-loss or error-rate claims. Technical frame sizes and timing are output metadata, not research findings.

All displayed demo strings are bound from [facts.json](https://github.com/eiler2005/Storygro/blob/main/examples/editorial-collage/facts.json). Reproduce the example with `node examples/editorial-collage/demo.mjs` from the repository root. Passing these fixture cases is deliberately narrower than proving a validator production-ready.
