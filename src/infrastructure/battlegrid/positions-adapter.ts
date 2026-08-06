import type { ExposureResult, OpenPosition } from '@/ports/positions.js';
import type { PositionsPort } from '@/ports/positions.js';
import type { BattleGridPort } from '@/ports/battlegrid.js';
import { malformed, messageOf, unreadable } from './unreadable.js';

/**
 * What every agent on the account is holding, mapped from the payload recorded
 * live 2026-08-06 — the first time this shape had ever been observed.
 *
 * It was unmodelled for months because the tools answered empty on the account
 * every probe ran against, and this product does not model a shape nobody has
 * seen. A second account with a trading agent is what unblocked it.
 */
const TOOLS = {
  active: 'list_user_active_positions',
} as const;

export class McpPositionsAdapter implements PositionsPort {
  // The port, not the concrete adapter. Nothing here needs more than
  // `callTool`, and depending on the class would put this file behind the
  // guard sequence's implementation rather than in front of its contract.
  constructor(private readonly battlegrid: BattleGridPort) {}

  async readActivePositions(params: {
    userId: string;
    accessToken: string;
  }): Promise<ExposureResult> {
    let payload: Record<string, unknown>;
    try {
      const result = await this.battlegrid.callTool({
        userId: params.userId,
        accessToken: params.accessToken,
        tool: TOOLS.active,
        args: {},
      });
      payload = result.content as Record<string, unknown>;
    } catch (err) {
      return unreadable(err);
    }

    const raw = payload['positions'];
    // An envelope without the key is a read that did not answer — not an
    // account holding nothing. The distinction the roster has enforced since
    // the beginning, and it matters more here than almost anywhere: this is
    // the surface that says whether money is at stake.
    if (!Array.isArray(raw)) return malformed('the exposure carried no positions');
    if (raw.length === 0) return { kind: 'none' };

    const totalsRaw = (
      typeof payload['totals'] === 'object' && payload['totals'] !== null ? payload['totals'] : {}
    ) as Record<string, unknown>;

    try {
      return {
        kind: 'exposure',
        exposure: {
          totals: {
            openPositionCount: num(totalsRaw['openPositionCount']),
            activeAgentCount: num(totalsRaw['activeAgentCount']),
            unpricedPositionCount: num(totalsRaw['unpricedPositionCount']),
            marginedUsd: num(totalsRaw['marginedUsd']),
            currentNotionalUsd: num(totalsRaw['currentNotionalUsd']),
            unrealizedPnlUsd: num(totalsRaw['unrealizedPnlUsd']),
            roePct: num(totalsRaw['roePct']),
            generatedAtMs: num(totalsRaw['generatedAtMs']),
            pricingStatus: text(totalsRaw['pricingStatus']),
          },
          positions: raw.map(mapPosition),
        },
      };
    } catch (err) {
      return malformed(messageOf(err));
    }
  }
}

export class PositionPayloadError extends Error {
  constructor(field: string) {
    super(`BattleGrid returned an open position with no usable "${field}"`);
  }
}

/**
 * One position row.
 *
 * Three fields are worth refusing over — the position's own id, the agent it
 * belongs to, and the market. A position that cannot be attributed to an agent
 * would appear under the wrong one, and this is a surface about money at risk.
 * Everything else is preserved-or-null, and **null never becomes zero**: an
 * unpriced position has an unknown result, not a flat one.
 */
export function mapPosition(raw: unknown): OpenPosition {
  const p = (raw ?? {}) as Record<string, unknown>;
  const positionId = text(p['positionId']);
  if (positionId === null) throw new PositionPayloadError('positionId');
  const agentId = text(p['agentId']);
  if (agentId === null) throw new PositionPayloadError('agentId');
  const coinTicker = text(p['coinTicker']);
  if (coinTicker === null) throw new PositionPayloadError('coinTicker');

  return {
    positionId,
    agentId,
    coinTicker,
    direction: text(p['direction']) ?? 'UNSTATED',
    entryFillPrice: num(p['entryFillPrice']),
    markPrice: num(p['markPrice']),
    entryNotionalUsd: num(p['entryNotionalUsd']),
    currentNotionalUsd: num(p['currentNotionalUsd']),
    marginedUsd: num(p['marginedUsd']),
    unrealizedPnlUsd: num(p['unrealizedPnlUsd']),
    roePct: num(p['roePct']),
    effectiveLeverage: num(p['effectiveLeverage']),
    effectiveStopLoss: num(p['effectiveStopLoss']),
    effectiveTakeProfit: num(p['effectiveTakeProfit']),
    liquidationPrice: num(p['liquidationPrice']),
    conviction: num(p['conviction']),
    timeHorizon: text(p['timeHorizon']),
    openedAt: text(p['openedAt']),
    pricingStatus: text(p['pricingStatus']),
    status: text(p['status']),
    decisionId: text(p['decisionId']),
    signalLogId: text(p['signalLogId']),
  };
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function text(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}
