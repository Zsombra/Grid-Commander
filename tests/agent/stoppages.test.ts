import { describe, expect, it } from 'vitest';
import { isStanding, summariseBlocks } from '@/domain/agent/blocks.js';
import type { GateBlock } from '@/ports/agents.js';
import { ReadStoppagesQuery } from '@/application/use-cases/read-stoppages.query.js';
import { FakeAgentsPort } from '../support/agent-fakes.js';

/**
 * What keeps stopping an agent.
 *
 * Every fixture is a live row of 2026-08-06. The sweep behind them: **371 gate
 * blocks across the operator's five agents**, and almost all of them one of a
 * handful of reasons repeating —
 *
 * | agent | blocks | dominant reason |
 * |---|---|---|
 * | CONTRARIAN | 118 | `AGENT_APPROVAL_EXPIRED` 98× |
 * | Fade Master II | 122 | `INSUFFICIENT_EQUITY` 80× |
 * | Fade Master | 80 | `EXCHANGE_MIN_NOTIONAL_UNREACHABLE` 79× |
 *
 * Two findings shaped the code. The commonest block on the whole account
 * carries **no detail at all**, so a surface that rendered only reasons with
 * numbers would hide the biggest one. And
 * `EXCHANGE_MIN_NOTIONAL_UNREACHABLE` carries `minEquityUsd` — the platform
 * publishing arithmetic the backlog item assumed would have to be derived from
 * scraped rejection text.
 */

const who = { userId: 'u1', accessToken: 'at' };

/**
 * A live row. Typed as `GateBlock` rather than `BlockRow` so the same fixture
 * feeds both the fold (which takes the structural shape) and the port double
 * (which returns the port's) — the two staying compatible is itself the point
 * of declaring `BlockRow` structurally.
 */
function row(over: Partial<GateBlock> = {}): GateBlock {
  return {
    id: 'b1',
    coinTicker: null,
    gateStage: 'ACCOUNT',
    reasonCode: 'INSUFFICIENT_EQUITY',
    reasonDetail: { equityUsd: 4.199037, thresholdUsd: 10 },
    at: '2026-08-06T15:56:41.197Z',
    ...over,
  };
}

/** The reason with no detail — and the most common one on the account. */
const APPROVAL = (at: string): GateBlock =>
  row({ reasonCode: 'AGENT_APPROVAL_EXPIRED', reasonDetail: {}, at });

/** Fade Master, 79×: the platform doing the arithmetic for us. */
const NOTIONAL = row({
  gateStage: 'TOKEN',
  reasonCode: 'EXCHANGE_MIN_NOTIONAL_UNREACHABLE',
  reasonDetail: { equityUsd: 89.490186, minEquityUsd: 1000, smallPct: 1, maxLeverage: 1 },
  at: '2026-04-30T03:51:44.281Z',
});

describe('folding blocks into reasons', () => {
  it('counts a reason and reports the window it spans', () => {
    const summary = summariseBlocks(
      [
        APPROVAL('2026-08-06T10:15:45.836Z'),
        APPROVAL('2026-07-30T22:45:00.000Z'),
        APPROVAL('2026-08-01T09:00:00.000Z'),
      ],
      118,
    );
    const [reason] = summary.reasons;
    expect(reason?.reasonCode).toBe('AGENT_APPROVAL_EXPIRED');
    expect(reason?.count).toBe(3);
    // Computed by comparing timestamps, not by taking the ends of the array —
    // the middle row above is deliberately out of order.
    expect(reason?.firstAt).toBe('2026-07-30T22:45:00.000Z');
    expect(reason?.lastAt).toBe('2026-08-06T10:15:45.836Z');
  });

  it('calls a repeat a standing condition and a single event not', () => {
    const summary = summariseBlocks([row(), row({ at: '2026-08-06T15:35:40.870Z' })], 2);
    expect(isStanding(summary.reasons[0]!)).toBe(true);
    expect(isStanding(summariseBlocks([row()], 1).reasons[0]!)).toBe(false);
  });

  it('orders by how often, not by how recent', () => {
    /**
     * CONTRARIAN's real shape: 98 approval blocks going back a week, and two
     * equity blocks from today. Newest-first ordering would lead with the pair
     * and bury the ninety-eight — which is the whole failure this fold exists
     * to fix.
     */
    const summary = summariseBlocks(
      [
        row({ at: '2026-08-06T15:56:41.197Z' }),
        row({ at: '2026-08-06T15:35:40.870Z' }),
        ...Array.from({ length: 5 }, (_, i) => APPROVAL(`2026-08-0${i + 1}T10:00:00.000Z`)),
      ],
      118,
    );
    expect(summary.reasons.map((r) => r.reasonCode)).toEqual([
      'AGENT_APPROVAL_EXPIRED',
      'INSUFFICIENT_EQUITY',
    ]);
  });

  it('keeps a detail that is empty empty, rather than inventing one', () => {
    // The finding: the account's most frequent block carries `{}` on every
    // occurrence. It must survive the fold as itself.
    const summary = summariseBlocks([APPROVAL('2026-08-06T10:15:45.836Z')], 1);
    expect(summary.reasons[0]?.detail).toEqual({});
  });

  it('takes the first non-empty detail for a reason that sometimes carries one', () => {
    const summary = summariseBlocks(
      [
        row({ reasonCode: 'DAILY_TRADE_LIMIT_REACHED', reasonDetail: {} }),
        row({
          reasonCode: 'DAILY_TRADE_LIMIT_REACHED',
          reasonDetail: { executedToday: 11, maxDailyTrades: 10 },
        }),
      ],
      2,
    );
    expect(summary.reasons[0]?.detail).toEqual({ executedToday: 11, maxDailyTrades: 10 });
  });

  it('collects the markets a token-stage reason hit', () => {
    const summary = summariseBlocks(
      [
        { ...NOTIONAL, coinTicker: 'BTC' },
        { ...NOTIONAL, coinTicker: 'ETH' },
        { ...NOTIONAL, coinTicker: 'BTC' },
      ],
      3,
    );
    expect(summary.reasons[0]?.coinTickers).toEqual(['BTC', 'ETH']);
    expect(summary.reasons[0]?.gateStage).toBe('TOKEN');
  });

  it('carries what it read and what exists, so a window can be admitted', () => {
    const summary = summariseBlocks([row(), row()], 118);
    expect(summary.readCount).toBe(2);
    expect(summary.total).toBe(118);
  });
});

describe('reading what stops an agent', () => {
  function query(stage: FakeAgentsPort['gateBlocks']) {
    const agents = new FakeAgentsPort([]);
    agents.gateBlocks = stage;
    return { agents, query: new ReadStoppagesQuery(agents) };
  }

  it('summarises the blocks the platform returned', async () => {
    const { query: q, agents } = query({
      kind: 'entries',
      entries: [row(), row({ at: '2026-08-06T15:35:40.870Z' })],
      total: 118,
    });
    const out = await q.execute({ ...who, agentId: 'a-1' });
    if (out.kind !== 'summary') throw new Error(out.kind);
    expect(out.summary.reasons[0]?.count).toBe(2);
    expect(out.summary.total).toBe(118);
    // Asks for the platform's page maximum, so the fold sees a real window
    // rather than the ten the pipeline stage reads.
    expect(agents.gateBlockLimits).toEqual([100]);
  });

  it('says nothing has stopped it when nothing has', async () => {
    const { query: q } = query({ kind: 'none' });
    expect((await q.execute({ ...who, agentId: 'a-1' })).kind).toBe('none');
  });

  it('never reports a failed read as an agent nothing has stopped', async () => {
    /**
     * The distinction the whole result type exists for. "Nothing has stopped
     * this agent" is good news; saying it because the read failed sends
     * someone away reassured about an agent that has been stuck for a week.
     */
    const { query: q } = query({
      kind: 'unreadable',
      reason: 'BattleGrid did not answer',
      cause: 'unreachable',
    });
    const out = await q.execute({ ...who, agentId: 'a-1' });
    expect(out.kind).toBe('unreadable');
  });
});
