/**
 * What an agent read while evaluating one candidate.
 *
 * These are the platform's shapes for *an evaluation*, not for any one
 * surface, and two ports need them: `ExplorerPort` reads them about other
 * people's agents and `AgentsPort` about the user's own. Declaring them
 * twice would guarantee the two drift, and the second copy would be the
 * one that quietly stopped matching the platform.
 *
 * The domain is the right home precisely because neither reading is more
 * canonical than the other — a signal that fired is the same fact whoever
 * owns the agent.
 */

/** One signal the agent consulted, whether or not it fired. */
export interface ConsultedSignal {
  readonly signalId: string;
  /** The family it belongs to, e.g. `RSI`, `FUNDING`, `PRICE_STRUCTURE`. */
  readonly module: string | null;
  readonly triggered: boolean;
  readonly scorePercent: number | null;
  readonly bias: string | null;
  readonly direction: string | null;
  /** Whether the composition treats this one as load-bearing. */
  readonly isPrimary: boolean;
  readonly required: boolean;
  readonly effectiveAllocation: number | null;
  /**
   * The platform's own sentence — "RSI(14) at 76.2 — not oversold". Carried
   * whole; it states the reading *and* the bar, which is the thing no
   * derived label could reconstruct.
   */
  readonly details: string | null;
  /** The raw numbers behind that sentence, as the platform grouped them. */
  readonly indicatorValues: Readonly<Record<string, unknown>>;
}

/** How much one signal contributed to the aggregate. */
export interface ScoreAttribution {
  readonly signalId: string;
  readonly name: string | null;
  readonly scorePercent: number | null;
  readonly attributionPercent: number | null;
}

/**
 * The chain a candidate followed.
 *
 * Every stage after the attempt is nullable because the chain genuinely
 * stops: a `SKIP` has a decision and no execution, an `EXPIRED` entry has
 * an execution and no outcome. A missing stage is omitted, never rendered
 * as an empty one.
 */
export interface EvaluationChain {
  readonly gateStatus: string | null;
  readonly gateReason: string | null;
  /** `LLM_APPROVED`, `LLM_DECLINED`, … — the platform's own vocabulary. */
  readonly attemptResult: string | null;
  readonly attemptReasonCodes: readonly string[];
  readonly decision: string | null;
  readonly decisionDirection: string | null;
  readonly convictionPercent: number | null;
  readonly entryPrice: number | null;
  readonly stopLoss: number | null;
  readonly takeProfit: number | null;
  readonly riskRewardRatio: number | null;
  readonly executionStatus: string | null;
  readonly failureReason: string | null;
  readonly expiryReason: string | null;
  /**
   * JSON inside a string, as the platform sends it. Carried verbatim and
   * never parsed — parsing means modelling a shape observed once, and the
   * enums above already say what happened in a form the platform commits
   * to.
   */
  readonly executionMessage: string | null;
  readonly tradeOutcome: string | null;
  readonly netPnl: number | null;
}

/**
 * What the thinking cost.
 *
 * Owner-only: BattleGrid nulls this on every public read, so it exists for
 * the user's own agents and nowhere else. It is the one thing this product
 * can say about an agent you own that it can never say about a stranger's
 * — and an operator tuning a strategy is paying this on every evaluation,
 * including the ones where fifty-one of sixty-four signals answered "no".
 */
export interface ThinkingCost {
  readonly modelDisplayName: string | null;
  readonly provider: string | null;
  /** Who paid: `PLATFORM`, or the operator's own key. */
  readonly billingType: string | null;
  /** Null when the platform did not report one. Never 0 in that case. */
  readonly costUsd: number | null;
  readonly durationMs: number | null;
  readonly errorMessage: string | null;
}

/** One evaluation, in full — the shape both surfaces render. */
export interface EvaluationScorecard {
  readonly coinTicker: string | null;
  readonly evaluatedAt: string | null;
  readonly timeframesUsed: readonly string[];
  readonly aggregateScorePercent: number | null;
  readonly dominantBias: string | null;
  readonly hasConflictingSignals: boolean;
  readonly terminalStatus: string | null;
  /** Every signal consulted — the untriggered ones are half the story. */
  readonly signals: readonly ConsultedSignal[];
  readonly attributions: readonly ScoreAttribution[];
  readonly chain: EvaluationChain;
  /** Present only for an agent the user owns. */
  readonly cost: ThinkingCost | null;
}
