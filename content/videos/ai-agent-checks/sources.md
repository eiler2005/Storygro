# Sources — «Где проверять работу ИИ-агента»

> Checked 2026-10-19. How the topic was chosen: [trend scan](../../research/ai-agent-checks/README.md).

| # | Claim | Source | Verified | Caveat |
|---|---|---|---|---|
| S1 | The best 2024 agent (gpt-4o, function calling) solved ~61% of retail tasks on the first try; succeeding on all 8 repeats of the same task: under 25% | Yao, Shinn, Razavi, Narasimhan — *τ-bench*, [arXiv 2406.12045](https://arxiv.org/abs/2406.12045): "succeed on <50% of the tasks, and are quite inconsistent (pass^8 <25% in retail)"; intro: "~61% on τ-retail" | Abstract re-read 2026-10-19 | 2024 models; simulated customer; newer models score higher (τ²-bench 2025: GPT-4.1 retail 74% once, 53% four times in a row), the gap between once and every time remains |
| S2 | A company is responsible for what its chatbot tells customers | Moffatt v. Air Canada, 2024 BCCRT 149 (14 Feb 2024): "It should be obvious to Air Canada that it is responsible for all the information on its website… It makes no difference whether the information comes from a static page or a chatbot." | Quotes via several legal commentaries (primary page 403) | A small-claims tribunal decision, not a court precedent; damages C$650.88 |
| S3 | Put checks where an error is costly; human checkpoints, sandboxes, guardrails | Anthropic, [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) (19 Dec 2024): "higher costs, and the potential for compounding errors"; "pause for human feedback at checkpoints" | Read 2026-10-19 | Vendor guidance, not a measurement; the three rules in the video are the episode's recommendation |
| S4 | Agents can fail while every call succeeds (trend context) | Laminar, [Launch HN](https://news.ycombinator.com/item?id=50154029) (19 Oct 2026): "An agent can click the wrong button or cite the wrong document while every call completes successfully." | Post read via HN API | Company claim; not shown in the video |

Not used: "agents fail 75% of the time" (misreads pass^8), "30% of office jobs" (TheAgentCompany is 175 simplified tasks), Gartner's "40%" (a forecast of project cancellations).
