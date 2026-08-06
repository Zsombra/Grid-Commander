import { describe, expect, it } from 'vitest';
import { McpAgentAdapter } from '@/infrastructure/battlegrid/agent-adapter.js';
import { ReadQualificationQuery } from '@/application/use-cases/read-qualification.query.js';
import type { BattleGridPort, ToolCallRequest } from '@/ports/battlegrid.js';
import type { QualificationResult } from '@/ports/agents.js';
import type { MarketPort, RankedCoinsResult, RankingVocabulary } from '@/ports/market.js';
import type { RadarPort, RadarReadResult } from '@/ports/radar.js';
import { FakeAgentsPort } from '../support/agent-fakes.js';

/**
 * Would this agent take this coin, and what stops it.
 *
 * Every fixture below is a **live row of 2026-08-06**, taken by screening five
 * of the operator's agents against twelve coins. That sweep is the reason this
 * file has the shape it does — three of its findings changed the code:
 *
 * 1. **`requiredCount` came back `NOT_ENFORCED` with `count: 0, min: 0` on
 *    every one of the sixty verdicts.** Rendered as a measurement, that reads
 *    "0 signals triggered against a minimum of 0" — a gate that looks satisfied
 *    by accident, on a surface whose whole job is to say what is stopping the
 *    agent. This capability already carries the requirement for exactly this
 *    mistake, one surface out: *A Limit Nobody Set Is Not A Limit Of Zero*.
 * 2. **Long and short genuinely disagree.** CONTRARIAN on LINK stops long at
 *    `ATR_VOLATILITY_BELOW_MIN` and short at `CANDIDATE_LEVELS_UNAVAILABLE` —
 *    two different obstacles on one coin in one call.
 * 3. **One unknown ticker fails the whole call.** `NOT_FOUND` for the coin, no
 *    verdicts for the eleven that were fine.
 */

const who = { userId: 'u1', accessToken: 'at' };

/**
 * CONTRARIAN screening LINK. The row that proves the directions are two
 * answers: the gates are shared, the conclusions are not.
 */
const LIVE_LINK = {
  agentId: '24b92caf-dbe3-419e-a56c-8384238c3a9b',
  agentName: 'CONTRARIAN',
  coinTicker: 'LINK',
  coinName: 'Chainlink',
  evaluatedAt: '2026-08-06T15:43:37.634Z',
  strategyTimeframe: '1h',
  qualifies: false,
  firstFailReason: 'ATR_VOLATILITY_BELOW_MIN',
  long: {
    qualifies: false,
    firstFailReason: 'ATR_VOLATILITY_BELOW_MIN',
    candidateLevels: { ok: true, rejectionStage: null },
  },
  short: {
    qualifies: false,
    firstFailReason: 'CANDIDATE_LEVELS_UNAVAILABLE',
    candidateLevels: { ok: false, rejectionStage: 'SL_POLICY_FILTERED' },
  },
  gates: {
    aggregateScore: { verdict: 'CLEARED', scorePercent: 82, minScorePercent: 70 },
    requiredCount: { verdict: 'NOT_ENFORCED', count: 0, min: 0 },
    atrVolatility: { verdict: 'FAILING', atrPct: 0.6842068002428658, minAtrPct: 0.8 },
  },
};

/** CONTRARIAN screening CRCL: one point short of the bar. */
const LIVE_CRCL = {
  ...LIVE_LINK,
  coinTicker: 'CRCL',
  coinName: 'CRCL',
  firstFailReason: 'AGGREGATE_BELOW_MIN',
  long: { qualifies: false, firstFailReason: 'AGGREGATE_BELOW_MIN', candidateLevels: { ok: true, rejectionStage: null } },
  short: { qualifies: false, firstFailReason: 'AGGREGATE_BELOW_MIN', candidateLevels: { ok: true, rejectionStage: null } },
  gates: {
    aggregateScore: { verdict: 'FAILING', scorePercent: 69, minScorePercent: 70 },
    requiredCount: { verdict: 'NOT_ENFORCED', count: 0, min: 0 },
    atrVolatility: { verdict: 'CLEARED', atrPct: 1.6922734624615903, minAtrPct: 0.8 },
  },
};

/** VELOCITY on HYPE — the coin it is deployed on, and would take. */
const LIVE_HYPE = {
  agentId: 'b507fe32-6333-4c5d-855d-f15b2f411807',
  agentName: 'VELOCITY',
  coinTicker: 'HYPE',
  coinName: 'Hype',
  evaluatedAt: '2026-08-06T15:42:45.721Z',
  strategyTimeframe: '1h',
  qualifies: true,
  firstFailReason: null,
  long: { qualifies: true, firstFailReason: null, candidateLevels: { ok: true, rejectionStage: null } },
  short: { qualifies: true, firstFailReason: null, candidateLevels: { ok: true, rejectionStage: null } },
  gates: {
    aggregateScore: { verdict: 'CLEARED', scorePercent: 95, minScorePercent: 70 },
    requiredCount: { verdict: 'NOT_ENFORCED', count: 0, min: 0 },
    atrVolatility: { verdict: 'CLEARED', atrPct: 0.9414655503508677, minAtrPct: 0.8 },
  },
};

function adapterOver(respond: (req: ToolCallRequest) => unknown) {
  const calls: ToolCallRequest[] = [];
  const battlegrid: BattleGridPort = {
    buildAuthorizationUrl: () => '',
    exchangeCode: async () => {
      throw new Error('unused');
    },
    refresh: async () => {
      throw new Error('unused');
    },
    revoke: async () => {},
    discoverTools: async () => [],
    callTool: async (request) => {
      calls.push(request);
      const content = respond(request);
      if (content instanceof Error) throw content;
      return {
        content,
        classification: {
          mutating: false,
          destructive: false,
          requiredScope: 'mcp:read',
          basis: 'annotations',
        },
        auditEntryId: 'a1',
      };
    },
  };
  return { adapter: new McpAgentAdapter(battlegrid), calls };
}

describe('mapping one coin against one agent’s gates', () => {
  it('carries every gate as a measurement beside its threshold', async () => {
    const { adapter, calls } = adapterOver(() => ({ verdicts: [LIVE_CRCL] }));
    const result = await adapter.readCoinQualification({
      ...who,
      agentId: 'a-1',
      coinTickers: ['CRCL'],
    });
    if (result.kind !== 'verdicts') throw new Error(result.kind);
    const v = result.verdicts[0];

    /**
     * 69 against 70. **Not 6900% against 7000%**, which is what happens the
     * moment a percent the platform already expressed as one is passed through
     * a fraction formatter — the trap `pipeline/page.tsx` documents and this
     * payload walks straight into, because the sibling `list_signal_logs` row
     * sends the same quantity as `aggregateScore: 0.993`. One tool, fractions;
     * its neighbour, percents.
     */
    expect(v?.gates.aggregateScore).toEqual({
      verdict: 'FAILING',
      scorePercent: 69,
      minScorePercent: 70,
    });
    // The volatility figure is kept at full precision. Rounding belongs to the
    // surface, which can say 1.69%; a mapper that rounded would make the
    // difference between 0.7999 and 0.8 unrecoverable.
    expect(v?.gates.atrVolatility.atrPct).toBe(1.6922734624615903);
    expect(v?.gates.atrVolatility.minAtrPct).toBe(0.8);
    expect(v?.strategyTimeframe).toBe('1h');
    expect(calls[0]?.tool).toBe('get_agent_coin_qualification');
    expect(calls[0]?.args).toMatchObject({ agentId: 'a-1', coinTickers: ['CRCL'] });
  });

  it('keeps a gate nobody configured as unenforced, not as zero-against-zero', async () => {
    /**
     * `requiredCount: {verdict: NOT_ENFORCED, count: 0, min: 0}` on all sixty
     * live verdicts. The pair is meaningless — what is true is the verdict, and
     * a reader shown "0 of 0" would conclude the gate was met.
     */
    const { adapter } = adapterOver(() => ({ verdicts: [LIVE_HYPE] }));
    const result = await adapter.readCoinQualification({ ...who, agentId: 'a-1', coinTickers: ['HYPE'] });
    if (result.kind !== 'verdicts') throw new Error(result.kind);
    expect(result.verdicts[0]?.gates.requiredCount.verdict).toBe('NOT_ENFORCED');
  });

  it('maps long and short as two answers, because they are', async () => {
    const { adapter } = adapterOver(() => ({ verdicts: [LIVE_LINK] }));
    const result = await adapter.readCoinQualification({ ...who, agentId: 'a-1', coinTickers: ['LINK'] });
    if (result.kind !== 'verdicts') throw new Error(result.kind);
    const v = result.verdicts[0];

    // Long is stopped by a gate. Short never got to one — its stop and target
    // could not be constructed at all, which is a different problem with a
    // different fix, and one collapsed verdict would name neither.
    expect(v?.long.firstFailReason).toBe('ATR_VOLATILITY_BELOW_MIN');
    expect(v?.long.candidateLevels).toEqual({ ok: true, rejectionStage: null });
    expect(v?.short.firstFailReason).toBe('CANDIDATE_LEVELS_UNAVAILABLE');
    expect(v?.short.candidateLevels).toEqual({ ok: false, rejectionStage: 'SL_POLICY_FILTERED' });
  });

  it('takes the first failing gate from the platform rather than deriving it', async () => {
    /**
     * LINK's `aggregateScore` reads CLEARED and its `atrVolatility` FAILING, so
     * on this row a derivation would agree. It is still wrong to derive: the
     * platform stops at the first failure and a later gate may hold a reading
     * from before it mattered, or none. The value is carried, never computed —
     * asserted here so a future refactor that "simplifies" it fails.
     */
    const { adapter } = adapterOver(() => ({ verdicts: [LIVE_LINK] }));
    const result = await adapter.readCoinQualification({ ...who, agentId: 'a-1', coinTickers: ['LINK'] });
    if (result.kind !== 'verdicts') throw new Error(result.kind);
    expect(result.verdicts[0]?.firstFailReason).toBe('ATR_VOLATILITY_BELOW_MIN');
  });

  it('says nothing about verdicts a payload it cannot read would have held', async () => {
    // `unreadable`, not `none`. An empty verdict list rendered as an answer
    // says "your agent would take none of these" — a claim about the agent's
    // settings, made on the strength of a read that failed.
    const { adapter } = adapterOver(() => ({}));
    const result = await adapter.readCoinQualification({ ...who, agentId: 'a-1', coinTickers: ['BTC'] });
    expect(result.kind).toBe('unreadable');
  });

  it('reports the platform’s refusal of one bad ticker as unreadable', async () => {
    /**
     * Live: `?coins=BTC,NOTACOIN` answers
     * `{"code":"NOT_FOUND","message":"Coin 'NOTACOIN' not found"}` and no
     * verdicts at all — eleven good tickers screened and discarded. The
     * product cannot fix that; it can decline to present it as eleven coins
     * the agent would not take.
     */
    const { adapter } = adapterOver(() => new Error("Coin 'NOTACOIN' not found"));
    const result = await adapter.readCoinQualification({
      ...who,
      agentId: 'a-1',
      coinTickers: ['BTC', 'NOTACOIN'],
    });
    if (result.kind !== 'unreadable') throw new Error(result.kind);
    expect(result.reason).toContain('NOTACOIN');
  });

  it('does not spend a call on no coins', async () => {
    // The schema's `minItems: 1` refuses it. Answering here costs one round
    // trip less and says the same thing.
    const { adapter, calls } = adapterOver(() => ({ verdicts: [] }));
    const result = await adapter.readCoinQualification({ ...who, agentId: 'a-1', coinTickers: [] });
    expect(result.kind).toBe('none');
    expect(calls).toEqual([]);
  });

  it('sends at most the twelve the platform screens', async () => {
    const { adapter, calls } = adapterOver(() => ({ verdicts: [LIVE_HYPE] }));
    await adapter.readCoinQualification({
      ...who,
      agentId: 'a-1',
      coinTickers: Array.from({ length: 20 }, (_, i) => `C${i}`),
    });
    expect((calls[0]?.args as { coinTickers: string[] }).coinTickers).toHaveLength(12);
  });
});

/** A radar that answers whatever the test needs, including not at all. */
class StubRadar implements RadarPort {
  constructor(private readonly result: RadarReadResult) {}
  async listDeployments(): Promise<RadarReadResult> {
    return this.result;
  }
  async deploymentTimeframes(): Promise<readonly string[]> {
    return ['15m'];
  }
  async upsertDeployment(): Promise<{ revision: number }> {
    throw new Error('reads only');
  }
  async deleteDeployment(): Promise<{ deleted: boolean }> {
    throw new Error('reads only');
  }
}

class StubMarket implements MarketPort {
  vocabulary: RankingVocabulary = {
    metrics: ['abs_change', 'rsi_activity', 'volume'],
    intervals: ['1m', '15m', '1h', '4h'],
  };
  ranked: RankedCoinsResult = {
    kind: 'coins',
    coins: [
      { ticker: 'CRCL', rank: 1, latestMetricValue: 4.34 },
      { ticker: 'INTC', rank: 2, latestMetricValue: 2.81 },
    ],
  };
  readonly asked: Array<{ metric: string; interval: string }> = [];
  async topRankedCoins(p: { metric: string; interval: string }): Promise<RankedCoinsResult> {
    this.asked.push({ metric: p.metric, interval: p.interval });
    return this.ranked;
  }
  async rankingVocabulary(): Promise<RankingVocabulary> {
    return this.vocabulary;
  }
}

function deployedOn(tickers: readonly string[]): RadarReadResult {
  return {
    kind: 'deployments',
    deployments: tickers.map((coinTicker, i) => ({
      policyId: `p${i}`,
      coinTicker,
      revision: 1,
      timeframe: '15m',
      enabled: true,
      slotAgentIds: ['a-1'],
      onDutyAgentId: 'a-1',
      openPositionAgentId: null,
    })),
  };
}

function screening(
  radar: RadarReadResult,
  market = new StubMarket(),
  qualification: QualificationResult = { kind: 'verdicts', verdicts: [] },
) {
  const agents = new FakeAgentsPort([]);
  agents.qualification = qualification;
  return {
    agents,
    market,
    query: new ReadQualificationQuery(agents, new StubRadar(radar), market),
  };
}

describe('which coins get screened, and saying so', () => {
  it('screens the coins the agent is deployed on', async () => {
    const { query, agents } = screening(deployedOn(['HYPE', 'PURR']));
    const out = await query.execute({ ...who, agentId: 'a-1' });
    if (out.kind !== 'screened') throw new Error(out.kind);
    expect(out.source.kind).toBe('deployments');
    expect(out.source.coins).toEqual(['HYPE', 'PURR']);
    expect(agents.screened[0]).toEqual(['HYPE', 'PURR']);
  });

  it('screens the platform’s ranked list when the agent is deployed nowhere', async () => {
    const { query, market } = screening(deployedOn([]));
    const out = await query.execute({ ...who, agentId: 'a-1' });
    if (out.kind !== 'screened') throw new Error(out.kind);
    if (out.source.kind !== 'ranked') throw new Error(out.source.kind);
    expect(out.source.coins).toEqual(['CRCL', 'INTC']);
    expect(out.source.because).toBe('not-deployed');
    // Named on the result because the answer means nothing without them:
    // "nothing qualifies" is a different claim per metric and interval.
    expect(out.source.metric).toBe('abs_change');
    expect(out.source.interval).toBe('1h');
    expect(market.asked).toEqual([{ metric: 'abs_change', interval: '1h' }]);
  });

  it('does not call a radar failure a deployment of none', async () => {
    /**
     * Both roads end at the ranked list; only one of them means the agent is
     * idle. Telling an operator "this agent is deployed nowhere" because the
     * radar hiccuped is the mistake `AgentDeploymentResult` exists to prevent,
     * and it would be reintroduced here by dropping the reason.
     */
    const { query } = screening({
      kind: 'unreadable',
      reason: 'BattleGrid did not answer',
      cause: 'unreachable',
    });
    const out = await query.execute({ ...who, agentId: 'a-1' });
    if (out.kind !== 'screened') throw new Error(out.kind);
    if (out.source.kind !== 'ranked') throw new Error(out.source.kind);
    expect(out.source.because).toBe('deployments-unreadable');
  });

  it('prefers what it likes only among what the platform declares', async () => {
    const market = new StubMarket();
    market.vocabulary = { metrics: ['volume'], intervals: ['4h'] };
    const { query } = screening(deployedOn([]), market);
    const out = await query.execute({ ...who, agentId: 'a-1' });
    if (out.kind !== 'screened') throw new Error(out.kind);
    if (out.source.kind !== 'ranked') throw new Error(out.source.kind);
    // Neither preference is on offer, so neither is sent. An interval this
    // product likes is not an interval BattleGrid accepts.
    expect(out.source.metric).toBe('volume');
    expect(out.source.interval).toBe('4h');
  });

  it('says it could not choose rather than screening none', async () => {
    const market = new StubMarket();
    market.ranked = { kind: 'unreadable', reason: 'no answer', cause: 'unreachable' };
    const { query, agents } = screening(deployedOn([]), market);
    const out = await query.execute({ ...who, agentId: 'a-1' });
    expect(out.kind).toBe('no-coins');
    // And screened nothing: an empty screening would render as a verdict.
    expect(agents.screened).toEqual([]);
  });

  it('stops when the platform declares no vocabulary to rank by', async () => {
    const market = new StubMarket();
    market.vocabulary = { metrics: [], intervals: [] };
    const { query } = screening(deployedOn([]), market);
    expect((await query.execute({ ...who, agentId: 'a-1' })).kind).toBe('no-coins');
  });

  it('honours coins the caller named over anything it would have chosen', async () => {
    const { query, agents } = screening(deployedOn(['HYPE']));
    const out = await query.execute({ ...who, agentId: 'a-1', coinTickers: ['btc', ' eth '] });
    if (out.kind !== 'screened') throw new Error(out.kind);
    expect(out.source.kind).toBe('requested');
    // Upper-cased and trimmed: the platform's tickers are upper-case, and a
    // link someone typed is not.
    expect(agents.screened[0]).toEqual(['BTC', 'ETH']);
  });

  it('drops a duplicate rather than spending a slot on it', async () => {
    // One coin deployed at two timeframes arrives twice, and the platform
    // counts both against a cap of twelve.
    const { query, agents } = screening(deployedOn(['HYPE', 'HYPE', 'PURR']));
    await query.execute({ ...who, agentId: 'a-1' });
    expect(agents.screened[0]).toEqual(['HYPE', 'PURR']);
  });

  it('reports what the cap left out instead of truncating in silence', async () => {
    const many = Array.from({ length: 15 }, (_, i) => `C${i}`);
    const { query } = screening(deployedOn(many));
    const out = await query.execute({ ...who, agentId: 'a-1', coinTickers: many });
    if (out.kind !== 'screened') throw new Error(out.kind);
    expect(out.source.coins).toHaveLength(12);
    expect(out.source.dropped).toBe(3);
  });
});
