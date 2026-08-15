/**
 * What an agent's strategy can still build a trade on, at today's volatility.
 *
 * BattleGrid computes this and returns it on **one** tool —
 * `update_intelligence_agent` — as a byproduct of an edit. No read answers it;
 * checked across all 114 tools at v19.1.0. Every edit this product performed
 * before now threw the answer away at the adapter
 * (`the-feasibility-advisory-is-unread`, issue #291).
 *
 * The platform speaks in **bands**: "reachable stops span 0.76–2.27% on SOL".
 * An operator reads in **counts**: "9 of 12 armed coins can construct under
 * this ceiling". This module is that translation, and nothing else — it holds
 * no platform spelling, makes no call, and stores nothing.
 *
 * ## Why the vocabulary is ours and not the platform's
 *
 * `MIN_STOP_LOSS_PCT`, `FEASIBLE`, `ATR_UNAVAILABLE` are BattleGrid's words for
 * BattleGrid's concepts, and they are translated at the adapter. F-8 in
 * `tests/strategy/structure.test.ts` is the general form of the rule: a
 * server-held fact written down in this repository is a fact that can go stale
 * without anything failing. This module says `floor`, `ceiling`, `unpriced`.
 */

/**
 * Which dial stopped a coin.
 *
 * The platform names one of two. `null` is a real third answer — the coin fell
 * short of what the strategy asked for and neither bound was named responsible
 * — and is kept rather than folded into either, because "we do not know which
 * dial" and "the ceiling" are different things to tell someone who is about to
 * move a dial.
 */
export type BlockingDial = 'floor' | 'ceiling';

/**
 * A coin whose volatility the platform could not read.
 *
 * Its own shape, carrying **no numeric fields at all**, because that is how the
 * platform declares it — the union's first arm is `{ coinTicker, status }` and
 * nothing more. Modelling this as a priced coin with nulls would invite a
 * reader to treat a data gap as a trading constraint, which is the
 * `unreadable`-vs-`empty` distinction this product draws everywhere else.
 */
export interface UnpricedCoin {
  readonly kind: 'unpriced';
  readonly ticker: string;
}

/**
 * A coin the platform priced, with the band it can actually build a stop in.
 *
 * `status` keeps the platform's own two-way distinction rather than collapsing
 * to a boolean. `structural-only` means the strategy's requested stop is not
 * constructible on this coin today; whether some *other* stop is remains the
 * platform's business, and a boolean named `constructible` would be this
 * product asserting an answer to a question it was never told.
 */
export interface PricedCoin {
  readonly kind: 'priced';
  readonly ticker: string;
  readonly status: 'feasible' | 'structural-only';
  readonly atrPct: number;
  /** The narrowest stop constructible on this coin today. */
  readonly reachableMinPct: number;
  /** The widest — the ceiling, where the ceiling is what binds. */
  readonly reachableMaxPct: number;
  readonly requestedMinAtrMultiple: number;
  readonly requestedMinPct: number;
  readonly requestedMaxPct: number;
  /** Which dial is responsible, where the platform named one. */
  readonly blockedBy: BlockingDial | null;
  /** How far short the request fell. `null` is the platform declining to say. */
  readonly shortfallPct: number | null;
}

export type AdvisoryCoin = UnpricedCoin | PricedCoin;

/** The three dials the answer was computed under. All strategy-owned since v15. */
export interface FeasibilityDials {
  readonly minStopLossAtrMultiple: number;
  readonly maxStopLossPct: number;
  readonly minRiskRewardRatio: number;
}

/**
 * The platform's own counts.
 *
 * Kept separate from anything this product derives, and used for the headline,
 * because they are BattleGrid's claim and the curve below is ours. A surface
 * that blurred the two would present an arithmetic guess as a platform answer.
 */
export interface FeasibilityCounts {
  readonly total: number;
  readonly evaluated: number;
  readonly buildable: number;
  readonly volatilityUnavailable: number;
}

export interface FeasibilityAdvisory {
  readonly dials: FeasibilityDials;
  readonly counts: FeasibilityCounts;
  readonly coins: readonly AdvisoryCoin[];
}

export interface BlockedCoin {
  readonly ticker: string;
  readonly blockedBy: BlockingDial | null;
  readonly shortfallPct: number | null;
  readonly reachableMinPct: number;
  readonly reachableMaxPct: number;
}

/**
 * The advisory as an operator reads it.
 *
 * Three groups that do not overlap, each carrying the whole it was counted
 * over — a bare "9 can construct" is a number whose denominator the reader has
 * to go and find, on the one panel built so they do not have to.
 */
export interface Opportunity {
  /** BattleGrid's own `buildable`, not a count this product made. */
  readonly buildable: number;
  /** BattleGrid's own `total` — every armed coin, priced or not. */
  readonly armed: number;
  /** BattleGrid's own `evaluated` — the coins it could price at all. */
  readonly evaluated: number;
  /**
   * Priced coins the strategy cannot build its requested stop on, with the
   * dial responsible where the platform named one.
   */
  readonly blocked: readonly BlockedCoin[];
  /** Tickers the platform could not price. Named, not merely counted. */
  readonly unpriced: readonly string[];
  /**
   * Whether the coins the platform listed reconcile with the counts it stated.
   *
   * Two independent checks, one answer, because the panel puts them side by
   * side and a reader meets any disagreement as one confusing screen:
   *
   * - the unpriced coins listed against `volatilityUnavailable`
   * - the blocked coins listed against `evaluated - buildable`
   *
   * The second is the one that bites. The headline is BattleGrid's own
   * `buildable` of `total`; the blocked sentence is counted off `coins[]`. If
   * the platform says 9 of 12 build and returns two coins that cannot, the
   * panel would print "9 of 12 can construct" above "2 coins cannot" — nine
   * and two out of twelve — and every figure on it would be individually
   * correct.
   *
   * They can disagree at all because `counts` and `coins` are separate fields
   * on a payload this product has never observed live: the tool is destructive,
   * so the surface record carries `"observed": null`. Where they disagree the
   * surface says so rather than quietly picking a winner.
   */
  readonly countsAgree: boolean;
}

export function opportunity(advisory: FeasibilityAdvisory): Opportunity {
  const priced = advisory.coins.filter((c): c is PricedCoin => c.kind === 'priced');
  const unpriced = advisory.coins.filter((c): c is UnpricedCoin => c.kind === 'unpriced');
  const blockedCount = priced.filter((c) => c.status === 'structural-only').length;

  return {
    buildable: advisory.counts.buildable,
    armed: advisory.counts.total,
    evaluated: advisory.counts.evaluated,
    blocked: priced
      .filter((c) => c.status === 'structural-only')
      .map((c) => ({
        ticker: c.ticker,
        blockedBy: c.blockedBy,
        shortfallPct: c.shortfallPct,
        reachableMinPct: c.reachableMinPct,
        reachableMaxPct: c.reachableMaxPct,
      })),
    unpriced: unpriced.map((c) => c.ticker),
    countsAgree:
      unpriced.length === advisory.counts.volatilityUnavailable &&
      blockedCount === advisory.counts.evaluated - advisory.counts.buildable,
  };
}

/**
 * Whether this product's arithmetic reproduces the platform's own answer.
 *
 * The gate on the ceiling curve, and the rule it enforces is simple: a
 * derivation that cannot reproduce BattleGrid's `buildable` at BattleGrid's
 * *current* ceiling has no business extrapolating from it to a lower one. If
 * counting `coins[]` at today's dial gives a different number from the one the
 * platform stated, then one of the two is describing something this product
 * does not understand, and the honest move is to draw nothing rather than a
 * curve that starts somewhere the headline says it does not.
 *
 * It also covers the truncated case for free: an advisory whose coins were
 * dropped to fit the carry cannot reproduce anything, so no curve is drawn over
 * bands that never arrived.
 */
export function curveIsFaithful(advisory: FeasibilityAdvisory): boolean {
  return constructibleUnder(advisory, advisory.dials.maxStopLossPct) === advisory.counts.buildable;
}

/**
 * How many coins would still construct under a candidate ceiling.
 *
 * **Derived by this product**, and every surface showing it must say so. The
 * derivation, stated here so it can be argued with: a coin's `reachableMinPct`
 * is the narrowest stop it can build today, so a ceiling at or above that
 * number still leaves it something to build, and a ceiling below it leaves
 * nothing. A coin already `structural-only` is never counted — lowering a
 * ceiling cannot make constructible a coin that is not constructible now.
 *
 * Computed here rather than in a component for the reason `AgainstDefault` and
 * `CapAgainstBalance` both give: a surface that works out a comparison for
 * itself will one day work it out upside down, and upside down on this figure
 * reads as headroom.
 */
export function constructibleUnder(advisory: FeasibilityAdvisory, ceilingPct: number): number {
  return advisory.coins.filter(
    (c) => c.kind === 'priced' && c.status === 'feasible' && c.reachableMinPct <= ceilingPct,
  ).length;
}

/**
 * The ceilings worth drawing the curve at.
 *
 * Read off the returned bands rather than picked: the only ceilings that say
 * anything are the ones where the count actually changes, and those are exactly
 * the distinct `reachableMinPct` values below the dial's current setting. A
 * hard-coded 2.00% would be shown to a fleet whose bands all sit near 0.4%,
 * where it means nothing.
 *
 * Highest first — the nearest candidate below the current ceiling — and capped
 * at three, because this is a sentence and not a table.
 */
export function candidateCeilings(advisory: FeasibilityAdvisory): readonly number[] {
  const current = advisory.dials.maxStopLossPct;
  const thresholds = advisory.coins
    .filter((c): c is PricedCoin => c.kind === 'priced' && c.status === 'feasible')
    .map((c) => c.reachableMinPct)
    .filter((pct) => pct < current);

  return [...new Set(thresholds)].sort((a, b) => b - a).slice(0, 3);
}

/**
 * Whether the advisory has anything to say at all.
 *
 * An advisory over zero armed coins is a real answer — the agent has nothing
 * deployed — and it is a different fact from the platform not answering, which
 * is `null` one layer out. The surface tells them apart; this says which of the
 * two it is holding.
 */
export function saysNothing(advisory: FeasibilityAdvisory): boolean {
  return advisory.counts.total === 0 && advisory.coins.length === 0;
}
