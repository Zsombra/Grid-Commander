/**
 * A compiled plan: what BattleGrid says would happen, and the one thing that may
 * be sent back to make it happen.
 *
 * Compiling writes nothing. Applying writes everything, atomically, to every
 * agent bound to the strategy. Nothing in this file blurs that.
 */

export interface CompiledPlan {
  /** Exactly as returned. Never modified, never partially rebuilt. */
  readonly approvedPlan: Readonly<Record<string, unknown>>;
  readonly planToken: string;
  readonly reviewContext: Readonly<Record<string, unknown>>;
  /**
   * A digest of the intent this was compiled from.
   *
   * Without it, a user compiles A, edits the form to B, and applies — and A
   * lands, because the token is bound to A's post-state. The server would accept
   * it happily; it is a valid plan. It is just not the one on screen. See S-E.
   */
  readonly intentDigest: string;
}

/**
 * The fields `apply_strategy_plan` accepts, and no others.
 *
 * Written out because the projection is not mechanical: `postState.id` becomes
 * `strategyId`, `explicitRuleOverrides` becomes `rules`, the rest of `postState`
 * is unwrapped one level, and seven sibling fields must be dropped. Each of
 * those seven is an unknown-key error, so "hand back what you were given" fails
 * every time. See findings-strategies F-2.
 */
const PLAN_FIELDS_FROM_POST_STATE = [
  'name',
  'description',
  'tagline',
  'timeframe',
  // `regimeAutoDerive` and `regimeTimeframe` left this list 2026-08-15 —
  // see their entry in FIELDS_APPLY_REJECTS below.
  'marketReadText',
  'sections',
  'minAggregateScore',
  'minRequiredCount',
  'minAtrPct',
  // Required by the live schema since (at latest) 2026-07-31 — its absence
  // was the sixth dead write path: every apply this product composed was
  // rejected by input validation, and the conformance guard could not see it
  // because `request.plan` was exempted as pass-through. Mapped against the
  // real compile response: it lives in `postState`.
  'conditions',
  // The trade-level policy, moved onto the strategy by BattleGrid v15.0.0
  // (it lived in the agent's `tradingConfig` until v14). All three are
  // **required** on `apply_strategy_plan`, so omitting them refuses every
  // apply — the same shape as the `conditions` omission above, caught by
  // the conformance guard the hour v15 landed rather than by a live refusal.
  //
  // Note `minStopLossAtrMultiple`: v15 replaced the percentage floor with an
  // ATR-relative one, so a stop floor now adapts to each coin's volatility.
  'maxStopLossPct',
  'minStopLossAtrMultiple',
  'minRiskRewardRatio',
] as const;

/**
 * Everything the compiler returns that the applier rejects.
 *
 * Named rather than merely omitted, so the test can assert their absence by name
 * and a reader can see what the projection is protecting against.
 */
export const FIELDS_APPLY_REJECTS = [
  'postState',
  'proposedRevision',
  'viability',
  'mismatches',
  'diff',
  'authoringCatalogDigest',
  // `expectedRevision` left this list 2026-07-31: the live UPDATE/RESTORE
  // schema *requires* it — its absence was part of the sixth dead write path.
  //
  // `conditionVerdicts` joined it 2026-08-04. BattleGrid v5.0.0 dropped the
  // field from `apply_strategy_plan` entirely while keeping `conditions`, and
  // all three plan variants are `additionalProperties: false` — so sending it
  // rejects the whole payload, exactly as the seven originals do. Found by
  // re-probing the surface after noticing the record still said v3.0.0; the
  // tool count was 110 on both sides of the deployment.
  'conditionVerdicts',
  // `regimeAutoDerive` and `regimeTimeframe` joined 2026-08-15. The platform
  // deployed mid-session (the MCP connector dropped twice at ~07:00Z) and the
  // live apply began rejecting both as unrecognized keys — while the schema
  // served at that session's start still declared them required, and this
  // projection still sent them, so every apply the product composed was
  // refused (#285, the seventh dead write path; same shape as
  // `conditionVerdicts` above, caught by a live refusal rather than a probe).
  // Observed both ways in one minute: the plan WITH the keys refused with
  // `unrecognized_keys`, the identical plan WITHOUT them accepted — Salamis
  // revision 3 → 4, changedAxes CONDITIONS. Both stay in `postState` (the
  // compiler still returns them); the applier no longer takes them.
  'regimeAutoDerive',
  'regimeTimeframe',
  'bindingImpact',
  'reviewContext',
  'signalRules',
  'creationSeed',
] as const;

export class PlanProjectionError extends Error {
  constructor(missing: string) {
    super(`The compiled plan is missing "${missing}"; it cannot be applied as it stands`);
  }
}

/**
 * Project `approvedPlan` onto the plan `apply_strategy_plan` accepts.
 *
 * The one place this transformation exists. Doing it inline at a call site would
 * mean two renames, one unwrap and seven omissions reproduced by hand, and the
 * failure is a server rejection after the user has confirmed a destructive
 * operation.
 */
export function toApplyPlan(
  approvedPlan: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  const postState = approvedPlan['postState'];
  if (typeof postState !== 'object' || postState === null) {
    throw new PlanProjectionError('postState');
  }
  const post = postState as Record<string, unknown>;

  const strategyId = post['id'];
  if (typeof strategyId !== 'string' || !strategyId) throw new PlanProjectionError('postState.id');

  const operation = approvedPlan['operation'];
  if (typeof operation !== 'string' || !operation) throw new PlanProjectionError('operation');

  const expiresAt = approvedPlan['expiresAt'];
  if (typeof expiresAt !== 'string' || !expiresAt) throw new PlanProjectionError('expiresAt');

  const plan: Record<string, unknown> = {
    operation,
    strategyId,
    expiresAt,
    // `explicitRuleOverrides` on the way out is `rules` on the way in. The names
    // differ because they mean different things to the two sides; the rename is
    // not cosmetic.
    rules: approvedPlan['explicitRuleOverrides'] ?? [],
    // Top-level on the approved plan, not in postState. UPDATE and RESTORE
    // plans require it; a CREATE plan does not accept it, and the compiler
    // omits it there — copied only when present, never invented.
    ...(approvedPlan['expectedRevision'] !== undefined
      ? { expectedRevision: approvedPlan['expectedRevision'] }
      : {}),
  };

  for (const field of PLAN_FIELDS_FROM_POST_STATE) {
    plan[field] = post[field] ?? null;
  }

  return plan;
}

/**
 * Whether this plan may be applied at all.
 *
 * `viability.viable` decides. **`mismatches` does not.**
 *
 * A one-word tagline edit came back with two mismatches and `viable: true`
 * (findings-strategies F-5). They describe the strategy's existing signal
 * configuration, not the change, and the user cannot fix them from here. A client
 * that blocked on a non-empty `mismatches` would refuse routine edits with no way
 * around it — and the array being empty *feels* like the success condition, which
 * is what makes it the easiest way to get this wrong.
 */
export function isViable(approvedPlan: Readonly<Record<string, unknown>>): boolean {
  const viability = approvedPlan['viability'];
  if (typeof viability !== 'object' || viability === null) return false;
  return (viability as Record<string, unknown>)['viable'] === true;
}

export interface Concern {
  readonly code: string;
  readonly message: string;
}

/** Shown, never enforced. See `isViable`. */
export function concerns(approvedPlan: Readonly<Record<string, unknown>>): readonly Concern[] {
  const raw = approvedPlan['mismatches'];
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry: unknown): Concern[] => {
    const m = (entry ?? {}) as Record<string, unknown>;
    const code = typeof m['code'] === 'string' ? m['code'] : null;
    if (!code) return [];
    return [{ code, message: typeof m['message'] === 'string' ? m['message'] : code }];
  });
}

/** How many agents this apply would reconfigure. The platform's count, not ours. */
export function blastRadius(approvedPlan: Readonly<Record<string, unknown>>): number | null {
  const impact = approvedPlan['bindingImpact'];
  if (typeof impact !== 'object' || impact === null) return null;
  const count = (impact as Record<string, unknown>)['boundAgentCount'];
  return typeof count === 'number' ? count : null;
}

/**
 * Which axes of the strategy would move.
 *
 * Taken from the server's own diff rather than computed by comparing before and
 * after: recomputing it would be a second opinion on a question the platform
 * already answered, and the two would disagree eventually.
 */
export function changedAxes(approvedPlan: Readonly<Record<string, unknown>>): readonly string[] {
  const diff = approvedPlan['diff'];
  if (typeof diff !== 'object' || diff === null) return [];
  const axes = (diff as Record<string, unknown>)['changedAxes'];
  return Array.isArray(axes) ? axes.filter((a): a is string => typeof a === 'string') : [];
}

/**
 * The platform's own account of what applying would do.
 *
 * Used verbatim as the confirmation copy. BattleGrid names the operation, the
 * revision, the changed axes and the blast radius; composing our own would be a
 * second description of one act, and they would disagree the first time
 * BattleGrid changed a behaviour. See S-D.
 */
export function confirmationSummary(
  reviewContext: Readonly<Record<string, unknown>>,
): string | null {
  const summary = reviewContext['confirmationSummary'];
  return typeof summary === 'string' && summary.length > 0 ? summary : null;
}

export function proposedRevision(approvedPlan: Readonly<Record<string, unknown>>): number | null {
  const revision = approvedPlan['proposedRevision'];
  return typeof revision === 'number' ? revision : null;
}

/**
 * The compile UPDATE request, assembled in one place.
 *
 * This literal lived inline on the edit page, and the conformance guard —
 * with nothing to import — mirrored it, with a comment admitting the mirror.
 * A drift in the page's shape would have left the guard checking yesterday's
 * payload and passing. Now the page (through its presentation wrapper) and
 * the guard both call this, so what is checked is what is sent
 * (`compile-intent-shape-lives-in-two-places`).
 *
 * `coinSelection` is pinned here deliberately: ranked, limit 9 — the one
 * composition the platform was observed to accept, not an operator choice
 * this product offers yet.
 */
export function compileUpdateIntent(input: {
  readonly strategyId: string;
  readonly expectedRevision: number;
  readonly intentSummary: string;
  readonly assumptions: readonly string[];
  readonly tagline: string;
  readonly sections: ReadonlyArray<{ readonly kind: string; readonly sectionKey: string }>;
}): Readonly<Record<string, unknown>> {
  return {
    operation: 'UPDATE' as const,
    strategyId: input.strategyId,
    expectedRevision: input.expectedRevision,
    intentSummary: input.intentSummary,
    assumptions: input.assumptions,
    coinSelection: { mode: 'ranked' as const, limit: 9 },
    tagline: input.tagline,
    sections: input.sections,
  };
}

/**
 * The compile UPDATE request that changes the condition list, and nothing else.
 *
 * A second builder rather than four optional fields on the first, and the
 * asymmetry is the point: the section editor restates `tagline` and `sections`
 * and never mentions `conditions`; this restates `conditions` and never
 * mentions the other two. One builder taking all of them would let a caller
 * compose an UPDATE that restates the whole strategy — the payload nobody has
 * observed, and the one that could silently overwrite an axis its surface never
 * offered to change.
 *
 * **What it omits is load-bearing, and it is observed rather than assumed.**
 * `compile_strategy_plan` fills its `postState` from the stored strategy for
 * every field the request leaves out — established live on 2026-08-06 against a
 * fork carrying two conditions, where an UPDATE naming no `conditions` came
 * back with both of them in `postState` and wrote nothing
 * (`an-update-that-omits-conditions-is-unobserved`). That is what makes an
 * intent this narrow safe, and it is exactly why `postStateDrift` reads the
 * answer back on every compile rather than trusting the finding to hold.
 *
 * `coinSelection` is pinned as it is on its sibling: ranked, limit 9 — the one
 * composition the platform was observed to accept, not an operator choice.
 */
export function compileConditionsIntent(input: {
  readonly strategyId: string;
  readonly expectedRevision: number;
  readonly intentSummary: string;
  readonly assumptions: readonly string[];
  /** The whole list, in order — the platform takes no smaller unit. */
  readonly conditions: readonly Readonly<Record<string, unknown>>[];
}): Readonly<Record<string, unknown>> {
  return {
    operation: 'UPDATE' as const,
    strategyId: input.strategyId,
    expectedRevision: input.expectedRevision,
    intentSummary: input.intentSummary,
    assumptions: input.assumptions,
    coinSelection: { mode: 'ranked' as const, limit: 9 },
    // Always present, even when empty. `[]` is the composed intent of removing
    // the last condition, and omitting it is the request that preserves them —
    // the two are opposite acts and the difference is one key.
    conditions: [...input.conditions],
  };
}

/**
 * What a condition write claims it leaves alone, checked against the compiler.
 *
 * A compile writes nothing, so its `postState` is the platform telling us what
 * it *would* save — free, and the only moment this product can see what its
 * omissions actually did before a human is asked to agree to them. Rather than
 * carrying the 2026-08-06 finding forward as an assumption, every condition
 * write re-establishes it: the compiler is asked, and a plan whose post-state
 * moved an axis the surface never offered to change is refused rather than
 * described.
 *
 * Three checks, each at the level the finding was actually observed at:
 *
 * - **The condition keys, in order.** Whether the submitted list was taken
 *   whole. Deliberately not a byte comparison — the compiler normalises what it
 *   returns, and asserting equality this product has never observed would refuse
 *   honest writes for a shape nobody has established.
 * - **The tagline**, compared as text with empty and absent read alike, since
 *   the read and the plan disagree about which one they use for "none".
 * - **The section keys**, as a set. Order inside `sections` is the compiler's;
 *   membership is the claim — nothing added, nothing dropped.
 */
export interface UnchangedElsewhere {
  /** The keys of the list submitted, in order. `null` for an entry carrying none. */
  readonly conditionKeys: readonly (string | null)[];
  readonly tagline: string | null;
  readonly sectionKeys: readonly string[];
}

export function postStateDrift(
  approvedPlan: Readonly<Record<string, unknown>>,
  expected: UnchangedElsewhere,
): readonly string[] {
  const postState = approvedPlan['postState'];
  if (typeof postState !== 'object' || postState === null) {
    return ['BattleGrid returned a plan with no post-state, so what it would save cannot be read.'];
  }
  const post = postState as Record<string, unknown>;
  const drift: string[] = [];

  const compiled = Array.isArray(post['conditions'])
    ? (post['conditions'] as unknown[]).map((entry) => {
        const key = ((entry ?? {}) as Record<string, unknown>)['conditionKey'];
        return typeof key === 'string' && key.length > 0 ? key : null;
      })
    : null;
  if (compiled === null) {
    drift.push(
      `The plan carries no condition list at all, and ${expected.conditionKeys.length} condition(s) were submitted.`,
    );
  } else if (!sameSequence(compiled, expected.conditionKeys)) {
    drift.push(
      `The conditions submitted were ${name(expected.conditionKeys)}, and the plan would save ${name(compiled)}.`,
    );
  }

  const tagline = text(post['tagline']);
  if (tagline !== text(expected.tagline)) {
    drift.push(
      `The tagline would become ${quoted(tagline)}, and this strategy's tagline is ${quoted(expected.tagline)}.`,
    );
  }

  const sections = Array.isArray(post['sections'])
    ? (post['sections'] as unknown[]).flatMap((entry) => {
        const key = ((entry ?? {}) as Record<string, unknown>)['sectionKey'];
        return typeof key === 'string' ? [key] : [];
      })
    : [];
  if (!sameSet(sections, expected.sectionKeys)) {
    drift.push(
      `The report sections would become ${name(sections)}, and this strategy reads ${name(expected.sectionKeys)}.`,
    );
  }

  return drift;
}

const sameSequence = (a: readonly (string | null)[], b: readonly (string | null)[]): boolean =>
  a.length === b.length && a.every((entry, i) => entry === b[i]);

const sameSet = (a: readonly string[], b: readonly string[]): boolean =>
  sameSequence([...a].sort(), [...b].sort());

/** Empty and absent are one state here; the read and the plan spell it differently. */
const text = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

const name = (keys: readonly (string | null)[]): string =>
  keys.length === 0 ? 'none' : keys.map((k) => k ?? '(an entry with no key)').join(', ');

const quoted = (value: string | null): string => (value === null ? 'empty' : `"${value}"`);
