import type {
  ConditionClause,
  ConditionOutcome,
  ConditionReport,
  ConsultedSignal,
  EvaluationChain,
  EvaluationScorecard,
  ScoreAttribution,
  ThinkingCost,
} from '@/domain/agent/scorecard.js';

/**
 * One evaluation, mapped once for both readers.
 *
 * `get_signal_log` (owner) and `get_public_agent_signal_log_detail`
 * (public) return the *same* `log` shape; the public one nulls
 * `pipeline.attempt.ownerView` and `llmPartialReasoning` and nothing else.
 * Two copies of this mapper would be two things that drift, and the copy
 * that drifted would be the one nobody was looking at.
 *
 * `owned` is therefore the only parameter: it decides whether the
 * owner-only cost is read at all, rather than being read and hoped to be
 * null.
 */

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const list = (v: unknown): readonly unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> =>
  typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};

/**
 * One signal the agent consulted.
 *
 * Untriggered rows are kept, not filtered. They are most of the payload —
 * 51 of 64 on this account's own evaluation, 60 of 72 on a competitor's —
 * and what an agent looked at and dismissed is as much its strategy as
 * what fired.
 */
export function mapConsultedSignal(raw: unknown): ConsultedSignal | null {
  const s = obj(raw);
  const signalId = str(s['id']);
  // Unattributable evidence cannot be looked up by a reader, so it is
  // dropped rather than shown as a nameless signal.
  if (signalId === null) return null;
  return {
    signalId,
    module: str(s['module']),
    triggered: s['triggered'] === true,
    scorePercent: num(s['scorePercent']),
    bias: str(s['bias']),
    direction: str(s['direction']),
    isPrimary: s['isPrimary'] === true,
    required: s['required'] === true,
    effectiveAllocation: num(s['effectiveAllocation']),
    details: str(s['details']),
    indicatorValues: obj(s['indicatorValues']),
  };
}

export function mapAttribution(raw: unknown): ScoreAttribution | null {
  const a = obj(raw);
  const signalId = str(a['signalId']);
  if (signalId === null) return null;
  return {
    signalId,
    name: str(a['name']),
    scorePercent: num(a['scorePercent']),
    attributionPercent: num(a['attributionPercent']),
  };
}

/**
 * What the thinking cost — owner-only.
 *
 * Returns null when the platform reported nothing, rather than a cost of
 * zero. An evaluation that cost nothing to run and one whose price was not
 * published are different facts, and only one of them should reassure an
 * operator watching their spend.
 */
function mapCost(raw: unknown): ThinkingCost | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const v = raw as Record<string, unknown>;
  const cost: ThinkingCost = {
    modelDisplayName: str(v['modelDisplayName']),
    provider: str(v['provider']),
    billingType: str(v['billingType']),
    costUsd: num(v['costUsd']),
    durationMs: num(v['durationMs']),
    errorMessage: str(v['errorMessage']),
  };
  const empty =
    cost.modelDisplayName === null &&
    cost.provider === null &&
    cost.costUsd === null &&
    cost.durationMs === null;
  return empty ? null : cost;
}

function mapChain(pipeline: Record<string, unknown>): EvaluationChain {
  const attempt = obj(pipeline['attempt']);
  const decision = obj(pipeline['decision']);
  const execution = obj(pipeline['execution']);
  const outcome = obj(pipeline['outcome']);
  return {
    gateStatus: str(pipeline['evaluationGateStatus']),
    gateReason: str(pipeline['evaluationGateReason']),
    attemptResult: str(attempt['result']),
    attemptReasonCodes: list(attempt['reasonCodes']).filter(
      (c): c is string => typeof c === 'string',
    ),
    decision: str(decision['decision']),
    decisionDirection: str(decision['direction']),
    convictionPercent: num(decision['convictionPercent']),
    entryPrice: num(decision['entryPrice']),
    stopLoss: num(decision['stopLoss']),
    takeProfit: num(decision['takeProfit']),
    riskRewardRatio: num(decision['riskRewardRatio']),
    executionStatus: str(execution['status']),
    failureReason: str(execution['failureReason']),
    expiryReason: str(execution['expiryReason']),
    // Verbatim: JSON inside a string, and parsing it would model a shape
    // observed once. The enums above already say what happened.
    executionMessage: str(execution['executionMessage']),
    tradeOutcome: str(outcome['tradeOutcome']),
    netPnl: num(outcome['netPnl']),
  };
}

function mapClause(raw: unknown): ConditionClause {
  const c = obj(raw);
  return {
    kind: str(c['kind']),
    sectionKey: str(c['sectionKey']),
    header: str(c['header']),
    op: str(c['op']),
    operand: str(c['operand']),
    literal: str(c['literal']),
    outcome: str(c['outcome']),
  };
}

function mapConditionOutcome(raw: unknown): ConditionOutcome | null {
  const o = obj(raw);
  const conditionKey = str(o['conditionKey']);
  // A verdict nobody can attribute to a condition cannot be looked up or
  // acted on — dropped rather than shown nameless, like an id-less signal.
  if (conditionKey === null) return null;
  return {
    conditionKey,
    name: str(o['name']),
    outcome: str(o['outcome']),
    required: o['required'] === true,
    evidence: list(o['evidence']).map(mapClause),
    provisional: o['provisional'] === true,
  };
}

/**
 * The condition evaluation, or null when the platform published none.
 *
 * v17.2.0's block, observed populated on OPEN, SKIPPED and PASS alike
 * (#133). Absent and null map the same way on purpose: the public detail
 * tool does not declare the block at all, so the public path lands here
 * without a special case.
 */
function mapConditions(raw: unknown): ConditionReport | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const v = raw as Record<string, unknown>;
  const counts = obj(v['counts']);
  return {
    outcomes: list(v['outcomes'])
      .map(mapConditionOutcome)
      .filter((o): o is ConditionOutcome => o !== null),
    trueCount: num(counts['trueCount']),
    total: num(counts['total']),
    unresolvedCount: num(counts['unresolvedCount']),
    strategyRevision: num(v['strategyRevision']),
    provisional: v['provisional'] === true,
    verdict: str(v['verdict']),
    decidedBy: str(v['decidedBy']),
  };
}

/**
 * The `log` object both tools return, or null when nothing is published.
 *
 * Null is a real answer: on 2026-08-03 four of twenty public logs answered
 * `{log: null}`, all of them `FAILED` evaluations.
 */
export function mapEvaluationScorecard(
  payload: Record<string, unknown>,
  opts: { owned: boolean },
): EvaluationScorecard | null {
  const raw = payload['log'];
  if (typeof raw !== 'object' || raw === null) return null;
  const log = raw as Record<string, unknown>;
  const scorecard = obj(log['scorecard']);
  const pipeline = obj(log['pipeline']);

  return {
    coinTicker: str(log['coinTicker']) ?? str(scorecard['coinTicker']),
    evaluatedAt: str(log['evaluatedAt']) ?? str(scorecard['evaluatedAt']),
    timeframesUsed: list(scorecard['timeframesUsed']).filter(
      (t): t is string => typeof t === 'string',
    ),
    aggregateScorePercent: num(log['aggregateScorePercent']),
    dominantBias: str(log['dominantBias']) ?? str(scorecard['dominantBias']),
    hasConflictingSignals:
      log['hasConflictingSignals'] === true || scorecard['hasConflictingSignals'] === true,
    terminalStatus: str(log['terminalStatus']),
    signals: list(scorecard['allEvaluatedSignals'])
      .map(mapConsultedSignal)
      .filter((s): s is ConsultedSignal => s !== null),
    attributions: list(log['attributions'])
      .map(mapAttribution)
      .filter((a): a is ScoreAttribution => a !== null),
    chain: mapChain(pipeline),
    // Read only where it can exist. On a public read the platform nulls it,
    // and a mapper that reached for it there would be asking a question it
    // already knows the answer to.
    cost: opts.owned ? mapCost(obj(pipeline['attempt'])['ownerView']) : null,
    conditions: mapConditions(log['conditionEvaluation']),
  };
}
