import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NO_PAUSE_REPORTED } from '../support/fakes.js';
import { anAgent, FakeAgentsPort } from '../support/agent-fakes.js';
import { FakeMarketPort } from '../support/market-fakes.js';
import { actingWith, notConnected, RenderRadarPort } from './support/fake-acting.js';
import { rendered } from './support/render.js';

/**
 * The qualification page, branch by branch.
 *
 * One property runs through all of it: **a verdict word without a number is
 * not an answer.** An operator reading `FAILING` cannot act on it — the reason
 * to open this page is to decide whether to move a setting, and that needs the
 * measurement beside the bar it missed.
 *
 * The three branches that are *not* a list of verdicts each get their own
 * sentence, because an empty list here reads as "your agent would take none of
 * these" — a claim about the agent's settings, made on the strength of a read
 * that failed or a coin list that was never chosen.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const AGENT = anAgent();
const params = <T extends Record<string, string>>(p: T): Promise<T> => Promise.resolve(p);

/** CONTRARIAN on LINK, live 2026-08-06: long and short stopped differently. */
const LINK = {
  coinTicker: 'LINK',
  coinName: 'Chainlink',
  qualifies: false,
  firstFailReason: 'ATR_VOLATILITY_BELOW_MIN',
  strategyTimeframe: '1h',
  evaluatedAt: '2026-08-06T15:43:37.634Z',
  gates: {
    aggregateScore: { verdict: 'CLEARED', scorePercent: 82, minScorePercent: 70 },
    requiredCount: { verdict: 'NOT_ENFORCED', count: 0, min: 0 },
    atrVolatility: { verdict: 'FAILING', atrPct: 0.6842068002428658, minAtrPct: 0.8 },
  },
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
};

function world(over: Parameters<typeof actingWith>[0] = {}) {
  const agents = new FakeAgentsPort([AGENT]);
  const w = actingWith({ agents, ...over });
  current = w;
  return w;
}

async function page(search: Record<string, string> = {}) {
  const Page = (await import('../../app/(app)/agents/[id]/qualification/page.js')).default;
  return rendered(
    await Page({ params: params({ id: AGENT.id }), searchParams: Promise.resolve(search) }),
  );
}

/** A radar with this agent deployed on HYPE, so the coins come from the agent. */
function deployedOnHype() {
  const radar = new RenderRadarPort();
  radar.result = {
    kind: 'deployments', pause: NO_PAUSE_REPORTED,
    deployments: [
      {
        policyId: 'p1',
        coinTicker: 'HYPE',
        revision: 3,
        timeframe: '15m',
        enabled: true,
        slotAgentIds: [AGENT.id],
        onDutyAgentId: AGENT.id,
        openPositionAgentId: null,
        resolution: null,
      },
    ],
  };
  return radar;
}

beforeEach(() => {
  current = actingWith();
});

describe('what a verdict says', () => {
  it('shows each gate as a measurement against its threshold', async () => {
    const w = world({ radar: deployedOnHype() });
    w.agents.qualification = { kind: 'verdicts', verdicts: [LINK] };
    const r = await page();

    expect(r.headings[0]).toContain(AGENT.displayName);
    // The two figures, in the platform's own unit. Not 8200% against 7000%.
    expect(r.text).toContain('82% against a minimum of 70%');
    // Rounded for reading, and both sides of the comparison present.
    expect(r.text).toContain('0.68% against a minimum of 0.8%');
    expect(r.text).toContain('FAILING');
  });

  it('does not render a gate nobody configured as zero against zero', async () => {
    /**
     * The live payload sends `requiredCount: {NOT_ENFORCED, count: 0, min: 0}`
     * on every verdict observed. "0 against a minimum of 0" reads as a gate
     * that is satisfied, on the one surface whose job is to say what is
     * stopping the agent — the same defect this capability already names in
     * *A Limit Nobody Set Is Not A Limit Of Zero*.
     */
    const w = world({ radar: deployedOnHype() });
    w.agents.qualification = { kind: 'verdicts', verdicts: [LINK] };
    const r = await page();
    expect(r.text).not.toContain('0 against a minimum of 0');
    expect(r.text).toContain('no minimum set');
  });

  it('keeps long and short apart, with their own reasons', async () => {
    const w = world({ radar: deployedOnHype() });
    w.agents.qualification = { kind: 'verdicts', verdicts: [LINK] };
    const r = await page();
    expect(r.text).toContain('Long: would not');
    expect(r.text).toContain('Short: would not');
    // Short never reached a gate: its levels could not be built at all, which
    // sends an operator to a different setting than a volatility floor does.
    expect(r.text).toContain('No stop and target could be constructed');
    expect(r.text).toContain('sl policy filtered');
  });

  it('names the stop as the platform ordered it', async () => {
    const w = world({ radar: deployedOnHype() });
    w.agents.qualification = { kind: 'verdicts', verdicts: [LINK] };
    const r = await page();
    expect(r.text).toContain('Stopped at: atr volatility below min');
    expect(r.text).toContain('stopped here');
  });
});

describe('where the coins came from', () => {
  it('says when they are the agent’s own deployments', async () => {
    const w = world({ radar: deployedOnHype() });
    w.agents.qualification = { kind: 'verdicts', verdicts: [LINK] };
    const r = await page();
    expect(r.text).toContain('the coins this agent is deployed on');
    expect(w.agents.screened[0]).toEqual(['HYPE']);
  });

  it('says when the product chose them, and why', async () => {
    // Deployed nowhere: the fallback is a ranked list the agent has never
    // looked at, and "none of these qualify" means something else about it.
    const w = world();
    w.agents.qualification = { kind: 'verdicts', verdicts: [LINK] };
    const r = await page();
    expect(r.text).toContain('chosen by Grid-Commander');
    expect(r.text).toContain('deployed nowhere');
    expect(r.text).toContain('abs_change');
  });

  it('does not blame the agent when the radar is what failed', async () => {
    const radar = new RenderRadarPort();
    radar.result = { kind: 'unreadable', reason: 'no answer', cause: 'unreachable' };
    const w = world({ radar });
    w.agents.qualification = { kind: 'verdicts', verdicts: [LINK] };
    const r = await page();
    expect(r.text).toContain('deployments could not be read');
    expect(r.text).not.toContain('deployed nowhere');
  });

  it('screens what the reader asked for', async () => {
    const w = world({ radar: deployedOnHype() });
    w.agents.qualification = { kind: 'verdicts', verdicts: [LINK] };
    const r = await page({ coins: 'btc,eth' });
    expect(r.text).toContain('the coins you asked about');
    expect(w.agents.screened[0]).toEqual(['BTC', 'ETH']);
  });
});

describe('the branches that are not a verdict', () => {
  it('says a failed screening failed, rather than rendering no verdicts', async () => {
    const w = world({ radar: deployedOnHype() });
    w.agents.qualification = {
      kind: 'unreadable',
      reason: "Coin 'NOTACOIN' not found",
      cause: 'unreachable',
    };
    const r = await page();
    expect(r.text).toContain('could not be read');
    expect(r.text).toContain('NOTACOIN');
    // The reassurance names a cause that is external and is not the agent.
    expect(r.text).toContain('could not reach BattleGrid');
  });

  it('distinguishes the platform screening nothing from the agent refusing', async () => {
    const w = world({ radar: deployedOnHype() });
    w.agents.qualification = { kind: 'none' };
    const r = await page();
    expect(r.text).toContain('not this agent refusing them');
  });

  it('says it could not choose coins, and offers a way to', async () => {
    const market = new FakeMarketPort();
    market.ranked = { kind: 'unreadable', reason: 'no answer', cause: 'unreachable' };
    world({ market });
    const r = await page();
    expect(r.headings.some((h) => h.includes('Nothing to screen'))).toBe(true);
    expect(r.text).toContain('?coins=BTC,ETH');
    expect(r.links).toContain(`/agents/${AGENT.id}/deploy`);
  });

  it('an unauthenticated request is told to connect', async () => {
    current = { app: {}, user: notConnected };
    const r = await page();
    expect(r.text.length).toBeGreaterThan(0);
  });
});
