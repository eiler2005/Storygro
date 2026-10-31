# Build Reels people want to finish and share

**Status: owner-adopted production workflow, 31 October 2026.** Required for new Reels and deliberately authorised revisions. The owner asked to put the research into repository rules and use it for the next episode. Adoption makes the direction and measurement process mandatory; audience effects remain unmeasured hypotheses. The [Football Legends research](../../content/research/reels-growth-2026-10-31/README.md) records the observations, successful examples and limits. Episode approvals still follow the existing content workflow.

## Write the promise before making pictures

Describe one viewer, one obstacle and one satisfying answer. For family content, consider a parent watching with a child as well as a football fan encountering the Reel alone. The situation should make sense without knowing the player's name or previous episodes.

Draft three openings in the existing spec's `hooks:` field: a visible conflict, an unexpected choice and a concrete question. These are review alternatives, not automatically rendered experiments. Choose one pairing of picture and narration.

Keep a supplied script verbatim when instructed. Put an optional adaptation and its reason in `DIRECTION.md`/`review.yaml`; do not silently shorten it or invent historical drama. A generic demonstration is not a factual reconstruction of a named match.

## Make the identity part of the action

Football Legends still opens with both exact series titles, the golden-football emblem, player name and verified nickname or editorial trait. Keep Matvey and Sofia. Compose a problem beneath the identity: a closing defender, a ball heading towards the corner, or two players racing for a rebound. The hosts can react from the side of the action rather than pose for an unrelated introductory portrait.

Use existing `series-cover` props and `revealAt` cues. Do not flash the identity too quickly to read or add silent seconds for it. The story can begin in the initial picture while narration starts immediately. Keep identity, important faces and the visual clue in the central square. Follow the [Reels format standard](instagram-without-cropping.md); never shrink the whole edit into a safe rectangle.

A profile cover and an opening in an autoplay feed serve different discovery paths. A recognisable cover alone does not prove a stronger opening; grid views do not disclose where discovery happened. Preserve the first-frame requirement while testing the action behind it.

## Build a causal sequence

Write what changes at each beat and what question remains. A zoom, swell or cut can support a change but cannot supply it on its own.

| Beat | What the viewer receives | Picture direction |
|---|---|---|
| Opening | An obstacle and reason to care | Show ball, obstacle and intended action together |
| Early answer | A result that honours the promise | Reveal where the player/ball went; do not hide every answer until the end |
| Complication | Why the obvious solution is insufficient | Opponent adapts, passing lane closes, or team still needs help |
| Mechanism | What the hero notices and does | Wide setup → decisive detail → consequence; preserve screen direction |
| Payoff | Resolution and a sourced fact giving it meaning | Award or team contribution; avoid another unrelated biography |
| Exit | One useful takeaway or natural question | Return to the opening with new understanding |

As an **editorial hypothesis**, make the situation clear in the first few seconds and offer a first reward roughly within the opening 5–8 seconds. These are review prompts, not automatic gates or Instagram thresholds. No ideal cut interval, retention percentage or duration has been established. Readability and the selected voice determine exact cues.

Test a complete 45–60-second script separately from the current approximately 80–90-second Football Legends format when adaptation is authorised. Keep the voice speed. Do not change length, opening, cast, music and ending together and attribute the result to one of them.

## Direct for a small screen

- Make hero, obstacle and ball easy to find in a thumbnail-sized view. Rich fabric, weather, crowd and architecture support a clear foreground.
- Plan consecutive states of one action, not unrelated impressive poses. Preserve kit, likeness, ball design, light and screen direction.
- Use a close-up for a decisive detail, then show its consequence. A pass that opens the defence needs both lane and receiver.
- Tie a gentle visual joke to the story and the hosts' reaction. Keep metaphors distinct from history and human anatomy.
- Change sound at meaningful actions and keep speech intelligible. Avoid constant impacts, flashes or unrelated motion.
- Review captions over real action: short phrases above platform UI, clear of faces, hands, ball and clue.

Images stay text-free and use the selected built-in GPT Image tool. Record actual prompts, references and checksums. External frames, characters, voices and music do not become our assets.

## Direction worksheet

Copy this into the episode's `DIRECTION.md`. It is a required editorial worksheet, **not a new reel YAML schema**. Fill in the promise, opening choice and beat map before generating pictures or narration; complete timeline measurements and viewing checks after rendering. Link owner questions from `review.yaml`.

```markdown
# Story direction

Status: draft / technical review / owner-reviewed (only after an actual decision)
Viewer and viewing situation:
One-sentence promise:
Why someone would send this to a friend or family member:
Essential facts and source IDs:
Supplied text: verbatim required / adaptation authorised (where):

## Opening alternatives
1. Picture + first sentence + promised answer:
2. Picture + first sentence + promised answer:
3. Picture + first sentence + promised answer:
Selected idea and reason:
Required first-frame identity and crop check:

## Beat map
| Scene / cue | Situation changes because… | Viewer question | Payoff cue | Image/action | Source or labelled invention |
|---|---|---|---|---|---|

First useful result, measured on the real timeline:
Longest stretch without new information, and why it earns its time:
Ending resolves opening; one optional question; no repeated summary:
Silent opening review: situation understandable?
Phone review: identity, faces, ball and clue readable; speech clear?

## One experiment
Experiment ID and one changed factor:
Reference/control and what stays fixed:
Primary metric and secondary checks:
Capture windows and distribution mode:
Confounders: topic/player, post age, audience, paid exposure:
Result: pending / promising / inconclusive / rejected
Evidence links and next decision:
```

## Apply the first pilot to the next episode

The next newly commissioned Football Legends episode uses **FL-R1**, the first stage of the research plan adopted by the owner on 31 October 2026. Record that ID in its `DIRECTION.md`. The treatment is readable hero/obstacle action beneath the complete identity at frame zero, with an early visible consequence; Matvey and Sofia react within the story. Keep the selected narrator, voice speed, duration band and ending approach. Choose a comparable posed-opening release as the reference and record its exact revision, duration and limitations before publication.

Do not bundle the shorter-script test FL-R2 or the ending test FL-R3 into FL-R1. Historical accuracy, intelligibility, a causal story and an honest payoff remain baseline quality requirements. If other substantial changes are necessary, list them and treat the comparison as exploratory; different players and audiences already limit attribution. If the primary opening metric is unavailable, record it as missing and leave the opening result inconclusive rather than substitute views as proof.

The next episode is a production commitment, not a completed experiment: its script, render, publication and results are still pending. Keep the experiment's result empty until evidence exists. The [experiment plan](../../content/research/reels-growth-2026-10-31/experiments.yaml) records the selected stage; a request for the next episode supplies its brief through the normal workflow.

## Measure the published version

Record exact release/file checksum, post URL, cover revision, publication time and distribution. A changed local cover is not evidence that a live post changed. If uploaded bytes are unknown, keep that uncertainty in research; do not invent approvals or ledger entries to fit observations.

Capture comparable snapshots around **24h, 72h and 7d**, retaining actual capture time and post age. A fourteen-hour observation belongs in research (or explicitly labelled lifetime data), not a falsely precise 24h window. Missing metrics stay absent.

After recording a real publication in the [manual ledger](../reference/publication-ledger.md), use `metrics`. These values are **illustrative only**:

```sh
npm run storygro -- metrics add <publication-id> --window 72h \
  --distribution organic --at 2026-11-03T12:00:00+03:00 \
  --source "Instagram Insights; cumulative since publication; age 72h; UI labels retained privately" \
  views=2400 reach=1800 avgWatchSec=29 durationSec=55 shares=30 saves=12 follows=9
npm run storygro -- metrics report
```

Keep original screenshots/exports in ignored `private/`. Record original labels and denominators. `sends` requires an explicitly reported sends count; a general share count stays `shares`. `completionRatePct` requires a platform-reported completion definition. `skipRatePct` is the UI percentage, not one minus average watch ratio.

The report calculates watch time relative to duration and events per 1,000 reached accounts from the **same snapshot**. Watch ratio can exceed 100% with replays and is not completion. Unknown, organic, trial, paid and mixed exposure have separate tables. Account, age, length, topic and audience still need to be comparable; the report does not rank winners.

## Learn from repeated comparisons

Choose one primary metric before posting: opening skip rate for an opening test, average watch seconds together with watch ratio for a length test, sends/reach for a sharing test. Track reach and follows/reach alongside it: a shorter video with a higher ratio does not automatically win. When a retention curve is available, compare its drops to actual scene/cue times.

Start with a small pilot, then replicate across several comparable releases. A handful of different players is directional evidence, not statistical proof. Keep weak results too; do not choose the winning metric afterwards. Record “inconclusive” when necessary and retain production time/cost.

Trial Reels can explore non-follower response if available. Label trials separately, record any transition to showing everyone and classify cumulative mixed exposure as mixed. Sequential trials are not a randomised split test. Do not bulk repost the existing winner. Publication remains a separate authorised action.

See the [next experiments](../../content/research/reels-growth-2026-10-31/experiments.yaml) and [primary sources](../../content/research/reels-growth-2026-10-31/sources.md). This method adds no automatic Insights collection, engagement automation or API publishing.
