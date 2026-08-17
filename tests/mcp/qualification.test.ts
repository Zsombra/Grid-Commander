import { describe, expect, it } from 'vitest';
import { NO_PAUSE_REPORTED } from '../support/fakes.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildServer } from '@/mcp/server.js';
import type { App } from '@/composition.js';
import type { QualificationResult } from '@/ports/agents.js';
import type { RadarReadResult } from '@/ports/radar.js';
import { anAgent, FakeAgentsPort } from '../support/agent-fakes.js';
import { FakeMarketPort } from '../support/market-fakes.js';
import { actingWith, RenderRadarPort } from '../rendering/support/fake-acting.js';

/**
 * Screening, crossed to a model — and what has to cross with it.
 *
 * `read_qualification` is the only tool on this surface whose **subject** the
 * product may choose, and that makes it the only one that can be answered
 * honestly and still mislead. "None of these qualify" is a finding about the
 * agent when the agent's own deployments picked the coins, and a finding about
 * our fallback when a ranked list did. A model handed the verdicts without the
 * provenance tells an operator their agent is stuck.
 *
 * So most of what is asserted here is not about verdicts at all. It is about
 * which coins were screened, why those, and whether a model reading the body
 * top to bottom meets that before it meets an answer.
 */

const AGENT = anAgent();

/** One live row of 2026-08-06 — VELOCITY on HYPE, the coin it would take. */
const HYPE = {
  coinTicker: 'HYPE',
  coinName: 'Hype',
  qualifies: true,
  firstFailReason: null,
  strategyTimeframe: '1h',
  evaluatedAt: '2026-08-06T15:42:45.721Z',
  gates: {
    aggregateScore: { verdict: 'CLEARED', scorePercent: 95, minScorePercent: 70 },
    requiredCount: { verdict: 'NOT_ENFORCED', count: 0, min: 0 },
    atrVolatility: { verdict: 'CLEARED', atrPct: 0.9414655503508677, minAtrPct: 0.8 },
  },
  long: { qualifies: true, firstFailReason: null, candidateLevels: { ok: true, rejectionStage: null } },
  short: { qualifies: true, firstFailReason: null, candidateLevels: { ok: true, rejectionStage: null } },
};

const VERDICTS: QualificationResult = { kind: 'verdicts', verdicts: [HYPE] };

function deployedOn(tickers: readonly string[]): RadarReadResult {
  return {
    kind: 'deployments', pause: NO_PAUSE_REPORTED,
    deployments: tickers.map((coinTicker, i) => ({
      policyId: `p${String(i)}`,
      coinTicker,
      revision: 1,
      timeframe: '15m',
      enabled: true,
      slotAgentIds: [AGENT.id],
      onDutyAgentId: AGENT.id,
      openPositionAgentId: null,
      resolution: null,
    })),
  };
}

/**
 * The real use-cases over the suite's fakes, driven through a real client.
 *
 * The same `actingWith` composition the rendering tests use, so what answers a
 * tool call here is `ReadQualificationQuery` itself — the coin choice, the
 * fallback reason and the cap are the product's, not a stub's.
 */
async function connected(
  options: {
    radar?: RadarReadResult;
    qualification?: QualificationResult;
    market?: FakeMarketPort;
  } = {},
) {
  const agents = new FakeAgentsPort([AGENT]);
  agents.qualification = options.qualification ?? VERDICTS;
  const radar = new RenderRadarPort();
  radar.result = options.radar ?? deployedOn(['HYPE', 'PURR']);
  const market = options.market ?? new FakeMarketPort();

  const server = buildServer({
    app: actingWith({ agents, radar, market }).app as unknown as App,
    authority: { userId: 'owner', accessToken: 'tok' },
  });
  const client = new Client({ name: 'test', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, agents, market };
}

const text = (result: unknown): string =>
  ((result as { content: { text: string }[] }).content[0]?.text ?? '');

interface Screening {
  kind: string;
  screening?: string;
  reason?: string;
  source?: { kind: string; coins: string[]; dropped: number; because?: string; metric?: string };
  result?: { kind: string; verdicts?: { coinTicker: string; qualifies: boolean }[] };
}

async function screen(
  client: Client,
  args: Record<string, unknown> = { agentId: AGENT.id },
): Promise<{ body: string; parsed: Screening; isError: boolean }> {
  const result = await client.callTool({ name: 'read_qualification', arguments: args });
  const body = text(result);
  return {
    body,
    parsed: JSON.parse(body) as Screening,
    isError: (result as { isError?: boolean }).isError === true,
  };
}

describe('asking a model’s question about now', () => {
  it('offers the tool with the agent required and the coins optional', async () => {
    const { client } = await connected();
    const { tools } = await client.listTools();
    const tool = tools.find((t) => t.name === 'read_qualification');

    expect(tool?.inputSchema.required).toEqual(['agentId']);
    expect(tool?.inputSchema.properties).toHaveProperty('coinTickers');
    // Screening changes nothing: the platform annotates the call read-only and
    // the use-case behind it reaches no Command.
    expect(tool?.annotations?.readOnlyHint).toBe(true);
    /**
     * The description is a static string a model repeats with the tool's own
     * authority, so it may not carry a tally of anything the platform owns —
     * including the coins one call screens, which is BattleGrid's number and
     * has moved before. `annotations.test.ts` holds that for every tool; this
     * asserts the part only this tool can get wrong, which is telling the model
     * that the provenance travels with the verdicts.
     */
    expect(tool?.description).toMatch(/where the coins came from/i);
  });

  it('screens the agent’s own coins, and says that is what they are', async () => {
    const { client, agents } = await connected({ radar: deployedOn(['HYPE', 'PURR']) });
    const { parsed } = await screen(client);

    expect(agents.screened[0]).toEqual(['HYPE', 'PURR']);
    expect(parsed.source?.kind).toBe('deployments');
    expect(parsed.screening).toContain('HYPE, PURR');
    expect(parsed.screening).toContain('deployed on');
    expect(parsed.result?.verdicts?.[0]?.coinTicker).toBe('HYPE');
  });

  it('says the product chose the coins, and which ranking they came off', async () => {
    /**
     * The failure this whole tool is shaped around. An agent deployed nowhere
     * is screened against coins it has never looked at, and a model that
     * reports the verdicts alone reports a stuck agent — when what it has is a
     * screening of the wrong markets.
     */
    const { client } = await connected({ radar: deployedOn([]) });
    const { parsed } = await screen(client);

    expect(parsed.source?.kind).toBe('ranked');
    expect(parsed.source?.because).toBe('not-deployed');
    expect(parsed.screening).toContain('Grid-Commander chose these');
    expect(parsed.screening).toContain('deployed nowhere');
    // The ranking is named because "nothing qualifies" is a different claim per
    // metric and interval, and the model is told not to draw the conclusion.
    expect(parsed.screening).toContain(String(parsed.source?.metric));
    expect(parsed.screening).toMatch(/not this agent’s own|never have looked/);
  });

  it('does not call a radar that would not answer a deployment of none', async () => {
    /**
     * Both roads end at the ranked list and only one of them is a fact about
     * the agent. Telling an operator "this agent is deployed nowhere" because
     * the radar hiccuped is the mistake `AgentDeploymentResult` exists to
     * prevent, and dropping the reason at this boundary reintroduces it.
     */
    const { client } = await connected({
      radar: { kind: 'unreadable', reason: 'BattleGrid did not answer', cause: 'unreachable' },
    });
    const { parsed } = await screen(client);

    expect(parsed.source?.because).toBe('deployments-unreadable');
    expect(parsed.screening).toContain('could not be read');
    expect(parsed.screening).not.toContain('deployed nowhere');
  });

  it('honours the coins a model names, and says they are the ones asked for', async () => {
    const { client, agents } = await connected({ radar: deployedOn(['HYPE']) });
    const { parsed } = await screen(client, { agentId: AGENT.id, coinTickers: ['btc', ' eth '] });

    // Upper-cased and trimmed by the use-case: the platform's tickers are
    // upper-case and a symbol a model copied out of prose is not.
    expect(agents.screened[0]).toEqual(['BTC', 'ETH']);
    expect(parsed.source?.kind).toBe('requested');
    expect(parsed.screening).toContain('you asked about');
  });

  it('ignores a coin argument that is not a list of tickers', async () => {
    // A model sending `coinTickers: "BTC"` or a number in the array must not
    // turn into a screening of `"1"`, which BattleGrid answers by refusing the
    // whole call for an unknown coin.
    const { client, agents } = await connected({ radar: deployedOn(['HYPE']) });
    const { parsed } = await screen(client, { agentId: AGENT.id, coinTickers: 'BTC' });

    expect(agents.screened[0]).toEqual(['HYPE']);
    expect(parsed.source?.kind).toBe('deployments');
  });

  it('says it could not choose rather than screening nothing', async () => {
    const market = new FakeMarketPort();
    market.ranked = { kind: 'unreadable', reason: 'no answer', cause: 'unreachable' };
    const { client, agents } = await connected({ radar: deployedOn([]), market });
    const { parsed, isError } = await screen(client);

    expect(parsed.kind).toBe('no-coins');
    expect(parsed.reason).toBeTruthy();
    // Not a verdict list, and not a tool failure. An empty verdict list would
    // read as "this agent would take none of them" — a claim about the agent
    // made on the strength of a subject that was never chosen.
    expect(parsed.result).toBeUndefined();
    expect(agents.screened).toEqual([]);
    expect(isError).toBe(false);
  });

  it('passes an unreadable screening through as data, with the source still stated', async () => {
    const { client } = await connected({
      radar: deployedOn(['HYPE']),
      qualification: { kind: 'unreadable', reason: 'BattleGrid did not answer', cause: 'unreachable' },
    });
    const { parsed, isError } = await screen(client);

    expect(isError).toBe(false);
    expect(parsed.result?.kind).toBe('unreadable');
    // The coins were still chosen, so where they came from is still an answer —
    // and a read that failed must not be narrated as coins that did not qualify.
    expect(parsed.source?.kind).toBe('deployments');
    expect(parsed.screening).toContain('HYPE');
  });

  it('reports what the platform’s cap dropped instead of truncating in silence', async () => {
    const many = Array.from({ length: 15 }, (_, i) => `C${String(i)}`);
    const { client } = await connected({ radar: deployedOn(many) });
    const { parsed } = await screen(client);

    expect(parsed.source?.dropped).toBeGreaterThan(0);
    expect(parsed.screening).toContain('left out');
  });

  it('puts where the coins came from ahead of the verdicts in the body', async () => {
    /**
     * The one structural assertion, and the reason this tool does not simply
     * return the use-case's own object. A model paraphrasing a JSON body reads
     * it top to bottom and will carry the verdicts; the provenance has to be
     * something it meets first, not a discriminator two levels down that a
     * summary drops.
     */
    const { client } = await connected({ radar: deployedOn([]) });
    const { body, parsed } = await screen(client);

    expect(body.indexOf('"screening"')).toBeGreaterThan(-1);
    expect(body.indexOf('"screening"')).toBeLessThan(body.indexOf('"result"'));
    expect(body.indexOf('"source"')).toBeLessThan(body.indexOf('"result"'));
    // And the sentence names every coin that was screened, so a model quoting
    // it cannot quote a subject narrower than the one it answers about.
    for (const coin of parsed.source?.coins ?? []) expect(parsed.screening).toContain(coin);
  });
});
