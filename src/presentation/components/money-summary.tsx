import type { Agent } from '@/domain/agent/agent.js';
import { unboundedCaps } from '@/domain/agent/catalog.js';

const LABELS: Readonly<Record<string, string>> = {
  maxConcurrentExposureUsd: 'how much may be at risk at once',
  maxCumulativeDrawdownUsd: 'how much it may lose in total',
  maxDailyLossUsd: 'how much it may lose in a day',
};

/**
 * What an agent's money limits actually are.
 *
 * This line read `agent.tradingConfig ? 'configured' : 'not configured'`, so
 * "configured" meant *an object came back* rather than *limits are set*. The
 * live account's active agent carries a complete twenty-field configuration in
 * which two of the three caps are zero — which BattleGrid reads as no cap — and
 * the page called that configured.
 *
 * A truthy object standing in for a fact nobody established is the same shape as
 * the budget gauge whose `remaining: 0` meant *no ceiling* and read as *no
 * headroom*. Both on the subject of money, both inverting the truth.
 */
export function MoneySummary({ agent }: { agent: Agent }) {
  if (!agent.tradingConfig) {
    return <>not set — this agent trades under whatever BattleGrid defaults</>;
  }

  const unbounded = unboundedCaps(agent.tradingConfig.fields);
  if (unbounded.length === 0) return <>set</>;

  return (
    <>
      set, except{' '}
      <strong className="text-text-primary">
        {unbounded.map((f) => LABELS[f] ?? f).join(', ')}
      </strong>{' '}
      — {unbounded.length === 1 ? 'that has' : 'those have'} no ceiling at all
    </>
  );
}
