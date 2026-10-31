# Review and publish manually

For Reels learning, record the exact uploaded revision, actual post age and original metric labels. Use [the retention recipe](reels-retention.md#measure-the-published-version) for 24h/72h/7d captures and `metrics add … --distribution organic` (or `trial`, `paid`, `mixed`, `unknown`). Reports keep these groups separate and calculate watch ratio and events per 1,000 reached accounts only when inputs exist. Views alone cannot establish retention; the watch ratio is not completion.

Today the last automated step is `package`. Publishing is a person's action; Storygro keeps a ledger of what was done and uploads nothing.

1. **Review.** Watch and listen on a phone with the checklist in [quality § the human review](../explanation/quality.md#the-human-review-that-no-gate-replaces). Technical QA does not replace it.
2. **Plan.** `npm run storygro -- publish plan <release-dir> --variant ru --platform instagram --account @handle`
3. **Approve.** `npm run storygro -- publish approve <id>`
4. **Upload by hand.** `npm run storygro -- publish checklist <id>` prints Markdown for the person who uploads: platform and account, the exact files with SHA-256, the post text and the steps. Upload as the named account.
5. **Record.** `npm run storygro -- publish mark <id> published --url https://…`
6. **Metrics.** Copy numbers from the platform as snapshots: `npm run storygro -- metrics add <id> --window 7d --source "Instagram Insights" views=1200 likes=80`, then `metrics report` compares them.

States, files and rules: [publication ledger](../reference/publication-ledger.md). What performed well goes back into the [backlog ratings](choose-a-topic.md) by hand.

Upload and analytics adapters for platform APIs are planned, not implemented; they will need the owner's accounts.
