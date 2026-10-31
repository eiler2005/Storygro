import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { z } from 'zod';

/*
 * A file-based publication ledger and metrics snapshots with a MANUAL adapter.
 *
 * Nothing here touches the network or a social platform. The ledger records what a person says they did
 * ("I uploaded this file to this account, here is the link"); it does not publish and cannot verify.
 * Everything below is pure except the four load/save helpers at the end of the ledger and metrics sections.
 */

export const DEFAULT_LEDGER_PATH = 'content/publishing/publications.json';
export const DEFAULT_METRICS_PATH = 'content/publishing/metrics.json';

export const PLATFORMS = ['instagram', 'youtube', 'tiktok', 'telegram', 'linkedin', 'other'] as const;
export const STATES = ['draft', 'approved', 'queued', 'uploading', 'processing', 'published', 'failed', 'cancelled'] as const;
export const FILE_ROLES = ['video', 'cover', 'subtitles', 'post'] as const;
export const WINDOWS = ['24h', '48h', '72h', '7d', '28d', '90d', 'lifetime'] as const;
export const DISTRIBUTIONS = ['unknown', 'organic', 'trial', 'paid', 'mixed'] as const;

export const Platform = z.enum(PLATFORMS);
export type Platform = z.infer<typeof Platform>;
export const State = z.enum(STATES);
export type State = z.infer<typeof State>;
export const FileRole = z.enum(FILE_ROLES);
export type FileRole = z.infer<typeof FileRole>;
export const MetricsWindow = z.enum(WINDOWS);
export type MetricsWindow = z.infer<typeof MetricsWindow>;

const PLATFORM_NAMES: Record<Platform, string> = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  telegram: 'Telegram',
  linkedin: 'LinkedIn',
  other: 'Other',
};

/** Parses with zod and fails with one readable message instead of a JSON dump of issues. */
function parseWith<T extends z.ZodType>(schema: T, input: unknown, what: string): z.output<T> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const lines = result.error.issues.map((i) => `  ✖ ${i.path.length ? `${i.path.join('.')}: ` : ''}${i.message}`);
  throw new Error(`invalid ${what}:\n${lines.join('\n')}`);
}

const Iso = z.iso.datetime({ offset: true });
const Sha256 = z.string().regex(/^[0-9a-f]{64}$/, 'expected a lower-case SHA-256 hex digest');
const Url = z.url().refine((u) => /^https?:\/\//i.test(u), 'expected an http(s) link');

// ───────────────────────────── ledger ─────────────────────────────

export const PublicationFile = z.strictObject({
  role: FileRole,
  /** relative to `releaseDir`, as listed in the release manifest */
  path: z.string().min(1),
  sha256: Sha256,
});
export type PublicationFile = z.infer<typeof PublicationFile>;

export const HistoryEntry = z.strictObject({ at: Iso, from: State, to: State, note: z.string().min(1).optional() });
export type HistoryEntry = z.infer<typeof HistoryEntry>;

export const Publication = z
  .strictObject({
    /** `<release>:<platform>:<account>:<variant>`, slugged; a deliberate repeat gets a `:2`, `:3` … suffix */
    id: z.string().min(1),
    /** the `release` id from manifest.json */
    release: z.string().min(1),
    /** the release folder, exactly as the person gave it */
    releaseDir: z.string().min(1),
    /** manifest.episode.id */
    episode: z.string().min(1),
    variant: z.string().min(1),
    lang: z.string().min(1),
    platform: Platform,
    /** e.g. `@handle`; as typed by the person */
    account: z.string().min(1),
    /** the only adapter today: a person uploads, the ledger records */
    adapter: z.literal('manual'),
    state: State,
    files: z.array(PublicationFile).min(1),
    createdAt: Iso,
    updatedAt: Iso,
    history: z.array(HistoryEntry),
    /** link to the live post; required once published */
    url: Url.optional(),
    /** the platform's own id of the post, when known */
    externalId: z.string().min(1).optional(),
    /** why the latest attempt failed; present only while the state is `failed` (the history keeps older reasons) */
    error: z.string().min(1).optional(),
  })
  .superRefine((p, ctx) => {
    if (p.state === 'published' && !p.url) ctx.addIssue({ code: 'custom', path: ['url'], message: 'a published publication needs a url' });
    if (p.state === 'failed' && !p.error) ctx.addIssue({ code: 'custom', path: ['error'], message: 'a failed publication needs the reason' });
  });
export type Publication = z.infer<typeof Publication>;

const uniqueIds = (items: { id: string }[], ctx: z.RefinementCtx) => {
  const seen = new Set<string>();
  items.forEach((p, i) => {
    if (seen.has(p.id)) ctx.addIssue({ code: 'custom', path: [i, 'id'], message: `duplicate publication id: ${p.id}` });
    seen.add(p.id);
  });
};

export const Ledger = z.strictObject({
  ledger: z.literal(1),
  publications: z.array(Publication).superRefine(uniqueIds),
});
export type Ledger = z.infer<typeof Ledger>;

export const emptyLedger = (): Ledger => ({ ledger: 1, publications: [] });

/** Allowed next states. `published` and `cancelled` are terminal. */
export const TRANSITIONS: Record<State, readonly State[]> = {
  draft: ['approved', 'cancelled'],
  approved: ['queued', 'uploading', 'cancelled'], // a manual upload may skip the queue
  queued: ['uploading', 'failed', 'cancelled'],
  uploading: ['processing', 'published', 'failed'],
  processing: ['published', 'failed'],
  published: [],
  failed: ['queued', 'uploading', 'cancelled'], // a retry keeps the history
  cancelled: [],
};

export const nextStates = (state: State): readonly State[] => TRANSITIONS[state];
export const canTransition = (from: State, to: State): boolean => TRANSITIONS[from].includes(to);

/** Lower-case, no leading `@`, anything that is not a letter, digit, `.`, `_` or `-` becomes `-`. */
export const slug = (text: string): string =>
  text
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/^-+|-+$/g, '');

export function findPublication(ledger: Ledger, id: string): Publication {
  const found = ledger.publications.find((p) => p.id === id);
  if (found) return found;
  const known = ledger.publications.slice(0, 5).map((p) => p.id);
  throw new Error(`no publication '${id}' in the ledger${known.length ? ` (known: ${known.join(', ')}${ledger.publications.length > 5 ? ', …' : ''})` : ' (the ledger is empty)'}`);
}

// ───────────────────────────── planning ─────────────────────────────

/** The parts of a release manifest.json this module relies on; other fields are allowed and ignored. */
export const ReleaseManifest = z.looseObject({
  release: z.string().min(1),
  episode: z.looseObject({ id: z.string().min(1) }),
  status: z.string(),
  variants: z.array(
    z.looseObject({
      id: z.string().min(1),
      lang: z.string().min(1),
      qa: z.looseObject({ verdict: z.string(), problem: z.string().optional() }),
      approved: z.looseObject({ approved: z.boolean() }),
    }),
  ),
  files: z.array(z.looseObject({ path: z.string().min(1), sha256: Sha256 })),
});
export type ReleaseManifest = z.infer<typeof ReleaseManifest>;

const posix = (p: string) => p.replaceAll('\\', '/');

/**
 * The variant's files, looked up directly under `<variant>/` (the carousel sub-folder is not a candidate):
 * video = `-web.mp4` if there is one, otherwise the master `.mp4`; cover = `*-cover.png`; subtitles = `*.srt`;
 * post = `post.md`. The video is required, the others are optional. More than one candidate for a role is
 * refused rather than guessed.
 */
function pickFiles(files: ReleaseManifest['files'], variant: string): { picked: PublicationFile[]; problems: string[] } {
  const own = files
    .map((f) => ({ path: f.path, sha256: f.sha256, name: posix(f.path) }))
    .filter((f) => f.name.startsWith(`${variant}/`) && !f.name.slice(variant.length + 1).includes('/'))
    .map((f) => ({ ...f, base: f.name.slice(variant.length + 1) }));
  const problems: string[] = [];
  const one = (role: FileRole, candidates: typeof own, required: boolean): PublicationFile[] => {
    if (candidates.length === 1) return [{ role, path: candidates[0]!.path, sha256: candidates[0]!.sha256 }];
    if (candidates.length > 1) problems.push(`${variant}: ambiguous ${role} — ${candidates.map((c) => c.path).join(', ')}`);
    else if (required) problems.push(`${variant}: no ${role} file in the release manifest (expected ${variant}/<name>-web.mp4 or <name>.mp4)`);
    return [];
  };
  const web = own.filter((f) => f.base.endsWith('-web.mp4'));
  const master = own.filter((f) => f.base.endsWith('.mp4') && !f.base.endsWith('-web.mp4'));
  const picked = [
    ...one('video', web.length ? web : master, true),
    ...one('cover', own.filter((f) => f.base.endsWith('-cover.png')), false),
    ...one('subtitles', own.filter((f) => f.base.endsWith('.srt')), false),
    ...one('post', own.filter((f) => f.base === 'post.md'), false),
  ];
  return { picked, problems };
}

const sameTarget = (p: Publication, release: string, platform: Platform, account: string, variant: string) =>
  p.release === release && p.platform === platform && slug(p.account) === slug(account) && p.variant === variant;

export interface PlanInput {
  /** the release folder as given on the command line */
  releaseDir: string;
  /** the parsed manifest.json of that release */
  manifest: unknown;
  variant: string;
  platform: string;
  account: string;
  now?: Date;
  /** plan a second publication of the same release/platform/account/variant on purpose */
  again?: boolean;
}

/**
 * Adds a `draft` publication of one variant of a release to one named account. Refuses (with every reason
 * at once) when the release is not `ready-for-review`, the variant's QA is not `pass`, its script is not
 * approved, there is no video, or the same release/platform/account/variant is already in the ledger in any
 * state except `failed`/`cancelled` (unless `again`). Returns a new ledger; the input is not modified.
 */
export function planPublication(ledger: Ledger, input: PlanInput): { ledger: Ledger; publication: Publication } {
  const current = parseWith(Ledger, ledger, 'ledger');
  const manifest = parseWith(ReleaseManifest, input.manifest, 'release manifest');
  const platform = parseWith(Platform, input.platform, 'platform');
  const account = input.account.trim();
  if (!slug(account)) throw new Error('publication refused: the account must contain a handle or name, e.g. @handle');
  const variant = manifest.variants.find((v) => v.id === input.variant);
  if (!variant)
    throw new Error(`publication refused: release ${manifest.release} has no variant '${input.variant}' (variants: ${manifest.variants.map((v) => v.id).join(', ') || 'none'})`);

  const problems: string[] = [];
  if (manifest.status !== 'ready-for-review') problems.push(`release status is '${manifest.status}', not 'ready-for-review'`);
  if (variant.qa.verdict !== 'pass') problems.push(`QA verdict of ${variant.id} is '${variant.qa.verdict}', not 'pass'${variant.qa.problem ? ` (${variant.qa.problem})` : ''}`);
  if (variant.approved.approved !== true) problems.push(`${variant.id}: script and facts are not approved in their current state`);
  const { picked, problems: fileProblems } = pickFiles(manifest.files, variant.id);
  problems.push(...fileProblems);
  if (!input.again) {
    const duplicate = current.publications.find(
      (p) => sameTarget(p, manifest.release, platform, account, variant.id) && p.state !== 'failed' && p.state !== 'cancelled',
    );
    if (duplicate)
      problems.push(`${duplicate.id} already covers this release, platform, account and variant (state ${duplicate.state}); plan another on purpose with --again`);
  }
  if (problems.length) throw new Error(`publication refused:\n${problems.map((p) => `  ✖ ${p}`).join('\n')}`);

  const base = [slug(manifest.release), platform, slug(account), variant.id].join(':');
  const taken = new Set(current.publications.map((p) => p.id));
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}:${n}`;
  const at = (input.now ?? new Date()).toISOString();
  const publication: Publication = {
    id,
    release: manifest.release,
    releaseDir: input.releaseDir,
    episode: manifest.episode.id,
    variant: variant.id,
    lang: variant.lang,
    platform,
    account,
    adapter: 'manual',
    state: 'draft',
    files: picked,
    createdAt: at,
    updatedAt: at,
    history: [],
  };
  return { ledger: parseWith(Ledger, { ...current, publications: [...current.publications, publication] }, 'ledger'), publication };
}

// ───────────────────────────── transitions ─────────────────────────────

export interface TransitionOptions {
  /** the reason (required for `failed`) or any remark; kept in the history */
  note?: string;
  /** link to the live post (required for `published` unless already recorded) */
  url?: string;
  externalId?: string;
  now?: Date;
}

/**
 * Moves one publication to a new state, validating the graph and what each state needs, and appends to its
 * history. Returns a new ledger; the input is not modified.
 */
export function transition(ledger: Ledger, id: string, to: string, opts: TransitionOptions = {}): { ledger: Ledger; publication: Publication } {
  const current = parseWith(Ledger, ledger, 'ledger');
  const target = parseWith(State, to, 'state');
  const publication = findPublication(current, id);
  if (!canTransition(publication.state, target)) {
    const allowed = nextStates(publication.state);
    throw new Error(
      `cannot move ${id} from '${publication.state}' to '${target}': ${allowed.length ? `allowed next states are ${allowed.map((s) => `'${s}'`).join(', ')}` : `'${publication.state}' is final, no further transitions`}`,
    );
  }
  const note = opts.note?.trim() || undefined;
  const url = opts.url === undefined ? publication.url : parseWith(Url, opts.url.trim(), 'url');
  const externalId = opts.externalId === undefined ? publication.externalId : parseWith(z.string().trim().min(1), opts.externalId, 'external id');
  if (target === 'published' && !url) throw new Error(`cannot mark ${id} as published without a url of the live post (--url <link>)`);
  if (target === 'failed' && !note) throw new Error(`cannot mark ${id} as failed without the reason (--note "<what happened>")`);

  const at = (opts.now ?? new Date()).toISOString();
  const { error: _previous, ...rest } = publication; // a retry clears the current error; the history keeps the old reason
  const next: Publication = {
    ...rest,
    state: target,
    updatedAt: at,
    history: [...publication.history, { at, from: publication.state, to: target, ...(note ? { note } : {}) }],
    ...(url ? { url } : {}),
    ...(externalId ? { externalId } : {}),
    ...(target === 'failed' ? { error: note } : {}),
  };
  const updated = parseWith(Ledger, { ...current, publications: current.publications.map((p) => (p.id === id ? next : p)) }, 'ledger');
  return { ledger: updated, publication: findPublication(updated, id) };
}

// ───────────────────────────── text for people ─────────────────────────────

const cell = (s: string) => s.replace(/\|/g, '/').replace(/\s+/g, ' ').trim();

/** A table of publications for `publish list`. */
export function publicationsMarkdown(ledger: Ledger): string {
  const l = parseWith(Ledger, ledger, 'ledger');
  if (!l.publications.length) return 'No publications in the ledger.\n';
  return [
    '| Id | State | Platform | Account | Episode | Variant | Link |',
    '|---|---|---|---|---|---|---|',
    ...l.publications.map(
      (p) =>
        `| ${cell(p.id)} | ${p.state} | ${PLATFORM_NAMES[p.platform]} | ${cell(p.account)} | ${cell(p.episode)} | ${cell(p.variant)} | ${p.url ? `[open](${p.url})` : '—'} |`,
    ),
    '',
  ].join('\n');
}

const fenceFor = (text: string) => '`'.repeat(Math.max(3, Math.max(0, ...(text.match(/`+/g) ?? []).map((m) => m.length)) + 1));

/**
 * What a person needs to upload one publication by hand: the account, the exact files with their checksums,
 * the post text and the steps, including how to report back. States plainly that Storygro uploads nothing.
 */
export function checklist(publication: Publication, postText?: string): string {
  const p = parseWith(Publication, publication, 'publication');
  const platform = PLATFORM_NAMES[p.platform];
  const cmd = (rest: string) => `\`storygro publish mark ${p.id} ${rest}\``;
  const status =
    p.state === 'draft'
      ? `State is **draft**: run \`storygro publish approve ${p.id}\` before uploading.`
      : p.state === 'published' || p.state === 'cancelled'
        ? `State is **${p.state}**: there is nothing to upload.`
        : `State: **${p.state}**.`;
  const text = postText?.trim();
  const fence = fenceFor(text ?? '');
  const hasExtras = p.files.some((f) => f.role === 'cover' || f.role === 'subtitles');
  return [
    `# Upload checklist — ${p.id}`,
    '',
    `> **Manual adapter.** Storygro does not upload anything and does not talk to ${platform}. You upload by hand; this ledger only records what you report. Marking a publication \`published\` is your statement that the post is live.`,
    '',
    status,
    '',
    '| | |',
    '|---|---|',
    `| Platform | ${platform} |`,
    `| Account | ${cell(p.account)} (check that you are logged in to exactly this account) |`,
    `| Episode / variant | ${cell(p.episode)} / ${cell(p.variant)} (${cell(p.lang)}) |`,
    `| Release | ${cell(p.release)} |`,
    '',
    '## Files',
    '',
    '| Role | File | SHA-256 |',
    '|---|---|---|',
    ...p.files.map((f) => `| ${f.role} | \`${cell(join(p.releaseDir, f.path))}\` | \`${f.sha256}\` |`),
    '',
    'Before uploading, `shasum -a 256 <file>` must print the hash above; otherwise the file is not the one that was reviewed.',
    '',
    '## Post text',
    '',
    ...(text ? [`${fence}text`, text, fence] : ['(not provided: use the `post` file above, or write the text yourself and record the difference in `--note`)']),
    '',
    '## Steps',
    '',
    `1. Open ${platform} and log in as ${cell(p.account)}.`,
    `2. Optional: record that you started with ${cmd('uploading')}.`,
    `3. Upload the video${hasExtras ? ', then add the cover and subtitles where the platform allows' : ''}.`,
    '4. Paste the post text above as it is.',
    `5. After it is live, copy the link and run ${cmd('published --url <link>')}.`,
    `6. If the upload failed or was rejected, run ${cmd('failed --note "<what happened>"')}.`,
    `7. If the app timed out and you do not know whether it posted, look at the account first; uploading again can create a duplicate.`,
    '',
  ].join('\n');
}

// ───────────────────────────── ledger files ─────────────────────────────

function readJson(path: string, what: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`${path}: cannot read ${what}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/** Writes pretty JSON with a trailing newline, creating the folder; a temp file and rename keep a crash from truncating the original. */
function writeJson(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`);
  renameSync(tmp, path);
}

/** The ledger at `path`, or an empty one when the file does not exist yet. */
export function loadLedger(path: string = DEFAULT_LEDGER_PATH): Ledger {
  if (!existsSync(path)) return emptyLedger();
  return parseWith(Ledger, readJson(path, 'the publication ledger'), `ledger ${path}`);
}

export function saveLedger(path: string, ledger: Ledger): void {
  writeJson(path, parseWith(Ledger, ledger, 'ledger'));
}

// ───────────────────────────── metrics ─────────────────────────────

/** Metric names per platform, in report column order. Anything else needs the `x-` prefix. */
export const METRICS: Record<Platform, readonly string[]> = {
  instagram: ['views', 'reach', 'likes', 'comments', 'shares', 'saves', 'follows', 'avgWatchSec',
    'sends', 'nonFollowerReach', 'totalWatchSec', 'durationSec', 'skipRatePct', 'completionRatePct'],
  youtube: ['views', 'likes', 'comments', 'shares', 'subscribersGained', 'avgViewDurationSec', 'avgPercentViewed'],
  tiktok: ['views', 'likes', 'comments', 'shares'],
  telegram: ['views', 'likes', 'comments', 'shares'],
  linkedin: ['views', 'likes', 'comments', 'shares'],
  other: ['views', 'likes', 'comments', 'shares'],
};
const CUSTOM_METRIC = /^x-[A-Za-z0-9][A-Za-z0-9_.-]*$/;
export const isMetricName = (platform: Platform, name: string): boolean => METRICS[platform].includes(name) || CUSTOM_METRIC.test(name);

export const Snapshot = z.strictObject({
  publicationId: z.string().min(1),
  window: MetricsWindow,
  /** when the numbers were read from the platform */
  capturedAt: Iso,
  /** where the numbers came from, e.g. "Instagram Insights screenshot" */
  source: z.string().trim().min(1, 'say where the numbers came from'),
  /** Omitted in older files: unknown, never silently treated as organic. */
  distribution: z.enum(DISTRIBUTIONS).optional(),
  /** only the metrics that were actually reported; a missing metric is absent, never 0 */
  values: z.record(z.string().min(1), z.number().min(0))
    .refine((v) => Object.keys(v).length > 0, 'at least one metric value')
    .superRefine((v, ctx) => {
      for (const name of ['skipRatePct', 'completionRatePct']) {
        if (v[name] !== undefined && v[name]! > 100)
          ctx.addIssue({ code: 'custom', path: [name], message: `${name} must be between 0 and 100` });
      }
      if (v.durationSec === 0)
        ctx.addIssue({ code: 'custom', path: ['durationSec'], message: 'durationSec must be positive' });
    }),
});
export type Snapshot = z.infer<typeof Snapshot>;

export const MetricsStore = z.strictObject({ metrics: z.literal(1), snapshots: z.array(Snapshot) });
export type MetricsStore = z.infer<typeof MetricsStore>;

export const emptyMetrics = (): MetricsStore => ({ metrics: 1, snapshots: [] });

/**
 * Turns `name=number` arguments (`views=1200 likes=80`) into values. A blank or malformed number is an error:
 * `Number('')` is 0, and a missing metric must not become a measured zero.
 */
export function parseMetricPairs(pairs: string[]): Record<string, number> {
  const values: Record<string, number> = {};
  for (const pair of pairs) {
    const m = /^([A-Za-z][A-Za-z0-9_.-]*)=(.*)$/.exec(pair);
    if (!m) throw new Error(`metric '${pair}' must look like name=number`);
    const [, name, raw] = m as unknown as [string, string, string];
    if (!/^\d+(?:\.\d+)?$/.test(raw.trim())) throw new Error(`metric '${name}' needs a non-negative number, got '${raw}'`);
    if (Object.hasOwn(values, name)) throw new Error(`metric '${name}' is given twice`);
    values[name] = Number(raw.trim());
  }
  if (!Object.keys(values).length) throw new Error('no metric values given (expected name=number, e.g. views=1200)');
  return values;
}

export interface SnapshotInput {
  publicationId: string;
  window: string;
  capturedAt: string;
  source: string;
  distribution?: string;
  values: Record<string, number>;
}

/**
 * Adds a snapshot of a published publication. Metric names are checked against the publication's platform
 * (plus `x-…` custom metrics), values must be finite and non-negative, and a second snapshot with the same
 * publication, window and capture time is refused. Returns a new store; the inputs are not modified.
 */
export function addSnapshot(ledger: Ledger, store: MetricsStore, input: SnapshotInput): { store: MetricsStore; snapshot: Snapshot } {
  const l = parseWith(Ledger, ledger, 'ledger');
  const s = parseWith(MetricsStore, store, 'metrics store');
  const snapshot = parseWith(Snapshot, input, 'snapshot');
  const publication = findPublication(l, snapshot.publicationId);
  if (publication.state !== 'published')
    throw new Error(`metrics can only be recorded for published publications; ${publication.id} is '${publication.state}'`);
  const unknown = Object.keys(snapshot.values).filter((name) => !isMetricName(publication.platform, name));
  if (unknown.length)
    throw new Error(
      `unknown metric${unknown.length > 1 ? 's' : ''} ${unknown.map((n) => `'${n}'`).join(', ')} for ${PLATFORM_NAMES[publication.platform]}; allowed: ${METRICS[publication.platform].join(', ')}; a custom metric must start with 'x-'`,
    );
  const at = Date.parse(snapshot.capturedAt);
  if (s.snapshots.some((x) => x.publicationId === snapshot.publicationId && x.window === snapshot.window && Date.parse(x.capturedAt) === at))
    throw new Error(`a ${snapshot.window} snapshot of ${snapshot.publicationId} captured at ${snapshot.capturedAt} is already recorded`);
  return { store: parseWith(MetricsStore, { ...s, snapshots: [...s.snapshots, snapshot] }, 'metrics store'), snapshot };
}

export const REPORT_FOOTER =
  'Snapshots are what the platform reported at capture time; compare only the same platform and window; early numbers are not evidence of cause.';

const number = (v: number) => v.toLocaleString('en-US');

/** Diagnostics from one snapshot only. Missing operands and zero denominators stay missing. */
export function instagramDiagnostics(values: Record<string, number>): Record<string, number> {
  const result: Record<string, number> = {};
  const ratio = (name: string, numerator: string, denominator: string, scale: number) => {
    const a = values[numerator], b = values[denominator];
    if (a !== undefined && b !== undefined && Number.isFinite(a) && a >= 0 && Number.isFinite(b) && b > 0) {
      const value = a / b * scale;
      if (Number.isFinite(value)) result[name] = value;
    }
  };
  ratio('watchRatioPct', 'avgWatchSec', 'durationSec', 100);
  for (const name of ['likes', 'sends', 'shares', 'saves', 'follows'])
    ratio(`${name}Per1kReach`, name, 'reach', 1000);
  return result;
}

/**
 * One table per platform, measurement window and distribution — incompatible cohorts stay apart.
 * Rows are publications (the latest snapshot in that group),
 * columns the metrics that were reported; an unreported metric is shown as —.
 */
export function metricsReport(ledger: Ledger, store: MetricsStore): string {
  const l = parseWith(Ledger, ledger, 'ledger');
  const s = parseWith(MetricsStore, store, 'metrics store');
  const byId = new Map(l.publications.map((p) => [p.id, p]));
  const lines = ['# Metrics report', ''];
  const orphans = s.snapshots.filter((x) => !byId.has(x.publicationId));
  let tables = 0;
  for (const platform of PLATFORMS) {
    for (const [window, distribution] of WINDOWS.flatMap((w) => DISTRIBUTIONS.map((d) => [w, d] as const))) {
      const group = s.snapshots.filter((x) => x.window === window && byId.get(x.publicationId)?.platform === platform
        && (x.distribution ?? 'unknown') === distribution);
      if (!group.length) continue;
      const latest = new Map<string, Snapshot>();
      for (const x of group) {
        const prev = latest.get(x.publicationId);
        if (!prev || Date.parse(x.capturedAt) > Date.parse(prev.capturedAt)) latest.set(x.publicationId, x);
      }
      const rows = [...latest.values()]
        .map((x) => ({ x, p: byId.get(x.publicationId)! }))
        .sort((a, b) => a.p.episode.localeCompare(b.p.episode) || a.p.variant.localeCompare(b.p.variant) || a.p.account.localeCompare(b.p.account) || a.p.id.localeCompare(b.p.id));
      const present = new Set(rows.flatMap(({ x }) => Object.keys(x.values)));
      const columns = [...METRICS[platform].filter((m) => present.has(m)), ...[...present].filter((m) => !METRICS[platform].includes(m)).sort()];
      lines.push(
        `## ${PLATFORM_NAMES[platform]} — ${window}${distribution === 'unknown' ? '' : ` — ${distribution}`}`,
        '',
        `| Episode | Variant | Account | Link | Captured | Source | ${columns.join(' | ')} |`,
        `|---|---|---|---|---|---|${columns.map(() => '---').join('|')}|`,
        ...rows.map(
          ({ x, p }) =>
            `| ${cell(p.episode)} | ${cell(p.variant)} | ${cell(p.account)} | ${p.url ? `[open](${p.url})` : '—'} | ${x.capturedAt.slice(0, 16).replace('T', ' ')} | ${cell(x.source)} | ${columns
              .map((m) => (m in x.values ? number(x.values[m]!) : '—'))
              .join(' | ')} |`,
        ),
        '',
      );
      const superseded = group.length - rows.length;
      if (superseded) lines.push(`Showing the latest snapshot per publication; ${superseded} earlier snapshot(s) of this window are kept in the metrics file.`, '');
      lines.push(`Distribution: ${distribution}. Compare the same account, actual post age and audience context; window labels alone do not establish comparability.`, '');
      if (platform === 'instagram') {
        const derived = rows.map(({ x, p }) => ({ p, values: instagramDiagnostics(x.values) }));
        const names = [...new Set(derived.flatMap((r) => Object.keys(r.values)))];
        if (names.length) lines.push(
          '### Instagram diagnostics (calculated)', '',
          `| Episode | Variant | Account | Link | ${names.join(' | ')} |`,
          `|---|---|---|---|${names.map(() => '---').join('|')}|`,
          ...derived.map(({ p, values }) => `| ${cell(p.episode)} | ${cell(p.variant)} | ${cell(p.account)} | ${p.url ? `[open](${p.url})` : '—'} | ${names.map((n) => values[n] === undefined ? '—' : number(Number(values[n]!.toFixed(2)))).join(' | ')} |`),
          '',
          'watchRatioPct = average watch seconds / duration × 100; it is NOT completion rate and may exceed 100 with replays. Per1kReach columns are events per 1,000 reached accounts, not probabilities. Sends and shares remain separate; no missing inputs are borrowed from another snapshot. No ranking or causal uplift is inferred.',
          '',
        );
      }
      tables++;
    }
  }
  if (!tables) lines.push('No snapshots recorded yet.', '');
  if (orphans.length) lines.push(`${orphans.length} snapshot(s) refer to publications that are not in the ledger and are not shown: ${[...new Set(orphans.map((o) => o.publicationId))].join(', ')}.`, '');
  lines.push(REPORT_FOOTER, '');
  return lines.join('\n');
}

/** The metrics store at `path`, or an empty one when the file does not exist yet. */
export function loadMetrics(path: string = DEFAULT_METRICS_PATH): MetricsStore {
  if (!existsSync(path)) return emptyMetrics();
  return parseWith(MetricsStore, readJson(path, 'the metrics file'), `metrics ${path}`);
}

export function saveMetrics(path: string, store: MetricsStore): void {
  writeJson(path, parseWith(MetricsStore, store, 'metrics store'));
}
