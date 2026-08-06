import type { AgentsPort, EntryDecision, StageResult } from '@/ports/agents.js';
import type { FailureCause } from '@/ports/failure.js';
import type { ExposureTotals, OpenPosition, PositionsPort } from '@/ports/positions.js';

/**
 * What one agent has at stake, and what it tried to stake and could not.
 *
 * Two questions on one surface because an operator asks them together: *is my
 * money in the market right now*, and *is this agent actually able to get it
 * there*. Both were answerable from reads this product already had, and
 * neither was shown.
 */

/**
 * How wide a window of decisions to read looking for the one that opened a
 * position.
 *
 * `list_entry_decisions` accepts `limit` in 1–50 and defaults to 10. The
 * default is the wrong window for this join: `THE .0` decided sixty entries,
 * so ten rows is a few hours of its history, and a position held overnight
 * would report its decided stop as unknown while the row that has it sits on
 * page two. Fifty is the platform's maximum in one call, and where the
 * decision still falls outside it the answer is *unknown* rather than
 * *unmoved* — the window is admitted, never papered over.
 */
const DECISION_WINDOW = 50;

/**
 * Entries that never became an order.
 *
 * Derived from the funnel the pipeline page already renders — no new read.
 * What changes is that a count becomes a statement: `/pipeline` shows
 * "27 executed · 28 failed · 5 expired" in a row of figures, which is where 28
 * looks like a number rather than half of everything the agent decided.
 */
export interface FillFailures {
  readonly failed: number;
  readonly executed: number;
  /** How many entries were decided in total, which is what makes it mean something. */
  readonly decided: number;
  /**
   * More failed than succeeded.
   *
   * The platform's own two counts set against each other, rather than a
   * threshold this product picked. On the account this was built against:
   * 28 failed, 27 executed.
   */
  readonly dominant: boolean;
  /**
   * The platform's own fill rate, carried separately and labelled as theirs.
   *
   * Deliberately not reconciled with the counts: BattleGrid reported
   * `fillRatePercent: 63` where 27 of 60 is 45%, so the two are computed
   * differently and this product does not know how. Showing them as one figure
   * would invent an agreement that does not exist.
   */
  readonly platformFillRatePercent: number | null;
}

/**
 * One level — the stop or the target — as the decision set it, against where
 * position management has since put it.
 *
 * The comparison is made here and not in the component, for the reason
 * `DecisionList` gives about confidence against its threshold: a surface that
 * works out `effective - decided` for itself will one day work it out
 * backwards. On a stop, backwards reads as *protected* when the truth is
 * *exposed*.
 */
export type LevelAsDecided =
  /** The decision set this level and nothing has moved it since. */
  | { readonly kind: 'as-decided'; readonly decided: number }
  | {
      readonly kind: 'moved';
      readonly decided: number;
      readonly effective: number;
      /**
       * Which way it travelled, in the only terms that mean anything for a
       * stop: whether it now takes more of the position out of harm, or less.
       *
       * Null on a target, where protection is not what the number is for. Null
       * too when BattleGrid names a side this product cannot read a direction
       * from — `direction` is carried as sent and never interpreted, and a
       * guess here would be a claim about how much money is protected.
       */
      readonly protects: 'more' | 'less' | null;
    }
  /**
   * Nothing to set the current value against — the decision recorded no such
   * level, or the position reports none now.
   *
   * A state of its own because two absences are not agreement: folded into
   * `as-decided`, a stop that has vanished from a live position would render
   * as a stop that never moved. `decided` is carried so the half that does
   * exist can still be said.
   */
  | { readonly kind: 'incomparable'; readonly decided: number | null };

/** What the decision that opened a position asked for, level by level. */
export interface DecidedLevels {
  readonly stop: LevelAsDecided;
  readonly target: LevelAsDecided;
}

/**
 * One open position, and the decision behind it where that could be found.
 *
 * `asDecided` is null when no decision matched the position's `decisionId` —
 * which is **unknown, never unmoved**. A position whose decision aged out of
 * the window read, or whose decision list did not answer, is a position whose
 * stop may well have been walked; saying nothing there reads as saying it has
 * not.
 */
export interface HeldPosition {
  readonly position: OpenPosition;
  readonly asDecided: DecidedLevels | null;
}

export type ExposureView =
  | {
      readonly kind: 'holding';
      readonly positions: readonly HeldPosition[];
      /** Account-wide, so a single agent's page can say what else is at risk. */
      readonly totals: ExposureTotals;
    }
  | { readonly kind: 'flat' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

export interface AgentExposure {
  readonly exposure: ExposureView;
  /** Null when the funnel could not be read, or the agent decided nothing. */
  readonly fills: FillFailures | null;
}

export class ReadExposureQuery {
  constructor(
    private readonly positions: PositionsPort,
    private readonly agents: AgentsPort,
  ) {}

  async execute(req: {
    readonly userId: string;
    readonly accessToken: string;
    readonly agentId: string;
  }): Promise<AgentExposure> {
    // Independent reads, kept independent: an unreadable funnel must not blank
    // a position that answered, and an unreadable decision list must not blank
    // either. The pipeline page's rule, one surface out and now over three
    // reads rather than two.
    const [active, funnel, decisions] = await Promise.all([
      this.positions.readActivePositions(req),
      this.agents.readOwnFunnel(req),
      this.agents.readEntryDecisions({ ...req, limit: DECISION_WINDOW }),
    ]);

    return { exposure: view(active, req.agentId, byId(decisions)), fills: fills(funnel) };
  }
}

/**
 * The decisions this agent recorded, by the id a position points at.
 *
 * Empty for a stage that was unreadable or that returned nothing — which is
 * what keeps the reads independent. Every position then reports its decided
 * stop as unknown and loses nothing else, rather than the whole holding
 * disappearing because one of three reads failed.
 */
function byId(stage: StageResult<EntryDecision>): ReadonlyMap<string, EntryDecision> {
  if (stage.kind !== 'entries') return new Map();
  return new Map(stage.entries.map((d) => [d.id, d]));
}

function view(
  active: Awaited<ReturnType<PositionsPort['readActivePositions']>>,
  agentId: string,
  decisions: ReadonlyMap<string, EntryDecision>,
): ExposureView {
  if (active.kind === 'unreadable') {
    return { kind: 'unreadable', reason: active.reason, cause: active.cause };
  }
  // The platform answered with nothing open anywhere on the account, so this
  // agent is flat. Distinct from a read that failed.
  if (active.kind === 'none') return { kind: 'flat' };

  const mine = active.exposure.positions
    .filter((p) => p.agentId === agentId)
    .map((p) => held(p, p.decisionId === null ? undefined : decisions.get(p.decisionId)));
  if (mine.length === 0) return { kind: 'flat' };
  return { kind: 'holding', positions: mine, totals: active.exposure.totals };
}

/**
 * One position joined to the decision that opened it.
 *
 * The join is the whole feature and it needs no new read: the position carries
 * `decisionId` and the decision carries `id`, `stopLoss` and `takeProfit`.
 * Live 2026-08-06, the pair this exists for: decision `4f1096e9…` recorded
 * `stopLoss: 55.67456526` and its position reported `effectiveStopLoss:
 * 55.954`, trailing having walked the stop 28 cents up a $56 instrument.
 */
function held(position: OpenPosition, decision: EntryDecision | undefined): HeldPosition {
  if (decision === undefined) return { position, asDecided: null };
  return {
    position,
    asDecided: {
      stop: level(decision.stopLoss, position.effectiveStopLoss, position.direction),
      // No side is passed for the target on purpose — see `protects` below.
      target: level(decision.takeProfit, position.effectiveTakeProfit, null),
    },
  };
}

function level(
  decided: number | null,
  effective: number | null,
  direction: string | null,
): LevelAsDecided {
  if (decided === null || effective === null) return { kind: 'incomparable', decided };
  if (decided === effective) return { kind: 'as-decided', decided };
  return {
    kind: 'moved',
    decided,
    effective,
    protects: direction === null ? null : protects(direction, decided, effective),
  };
}

/**
 * Which way a stop travelled, read against the side of the trade.
 *
 * A long is protected by a stop that rises and a short by one that falls, so
 * the same arithmetic means opposite things on the two sides. The live case is
 * a LONG that went 55.67456526 → 55.954, which is more protection; the
 * identical pair on a SHORT would be less.
 *
 * `direction` is matched against the enum BattleGrid declares — LONG or SHORT
 * — rather than parsed. Anything else is a side this product does not know how
 * to read, and null there costs the operator a sentence where a guess would
 * cost them the truth about how much of the position is covered.
 *
 * A target gets no direction at all: a take-profit in a new place is a
 * different exit, not more or less protection.
 */
function protects(direction: string, decided: number, effective: number): 'more' | 'less' | null {
  if (direction === 'LONG') return effective > decided ? 'more' : 'less';
  if (direction === 'SHORT') return effective < decided ? 'more' : 'less';
  return null;
}

function fills(funnel: Awaited<ReturnType<AgentsPort['readOwnFunnel']>>): FillFailures | null {
  if (funnel.kind !== 'funnel') return null;
  const { failed, executed, enterDecisions, fillRatePercent } = funnel.funnel;
  // An agent that has decided no entries has no fill record — reporting
  // "0 of 0 failed" would be a finding about nothing.
  if (failed === null || executed === null || enterDecisions === null) return null;
  if (enterDecisions === 0) return null;
  return {
    failed,
    executed,
    decided: enterDecisions,
    dominant: failed >= executed && failed > 0,
    platformFillRatePercent: fillRatePercent,
  };
}
