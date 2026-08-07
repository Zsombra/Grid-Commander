import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Agent } from '@/domain/agent/agent.js';
import { anAgent, FakeAgentsPort } from '../support/agent-fakes.js';
import { actingWith } from './support/fake-acting.js';
import { rendered } from './support/render.js';

/**
 * The brain under its human name, and the spend where stoppage is explained.
 *
 * Two halves of one mapping (`the-brains-name-and-the-spend-are-read`). The
 * brain: every agent observed reads back `brainPreset: "CUSTOM"` — the
 * response flattens the request's two-branch union — so the agent page used
 * to describe a Grok agent and a GLM agent with the same bare word. The
 * payload carries the name (`modelDisplayName`, observed "GLM-5.2"), and the
 * page now says it, claiming nothing about preset-vs-custom because that is
 * not readable back (`preset-custom-in-the-preset-branch-is-unestablished`).
 *
 * The spend: `/agents/[id]/limits` is titled "what would stop it", and spend
 * stops agents — the older account halted on
 * `COST_LIMIT_REACHED ($6.0544 / $6)`. No gauge, because no read publishes
 * the ceiling; the only cap ever seen was prose inside a breach message.
 *
 * Rendered rather than grepped, for the reason `binding.test.ts` gives: the
 * property is what a person reads.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const params = <T extends Record<string, string>>(p: T): Promise<T> => Promise.resolve(p);
const noSearch = Promise.resolve({});

/** The live shape of 2026-08-06: the flattened read-back, with the name. */
const NAMED = anAgent({
  brain: { kind: 'preset', preset: 'CUSTOM' },
  modelDisplayName: 'GLM-5.2',
});

function world(agents: FakeAgentsPort) {
  current = actingWith({ agents });
  return current as ReturnType<typeof actingWith>;
}

async function agentPage(agent: Agent) {
  const Page = (await import('../../app/(app)/agents/[id]/page.js')).default;
  return rendered(await Page({ params: params({ id: agent.id }), searchParams: noSearch }));
}

async function limitsPage(id: string) {
  const Page = (await import('../../app/(app)/agents/[id]/limits/page.js')).default;
  return rendered(await Page({ params: params({ id }) }));
}

beforeEach(() => {
  world(new FakeAgentsPort([anAgent()]));
});

describe('the brain, under the platform’s name for it', () => {
  it('shows the reported name where the bare discriminator used to be', async () => {
    world(new FakeAgentsPort([NAMED]));
    const r = await agentPage(NAMED);
    expect(r.text).toContain('GLM-5.2');
    expect(r.text).not.toContain('CUSTOM');
  });

  it('claims neither preset nor custom for it', async () => {
    // The distinction is not readable back, and the page must not invent it.
    world(new FakeAgentsPort([NAMED]));
    const r = await agentPage(NAMED);
    expect(r.text).not.toMatch(/is a preset|is custom|custom model/i);
  });

  it('falls back to what the page always showed when no name is reported', async () => {
    const unnamed = anAgent({ brain: { kind: 'preset', preset: 'CUSTOM' }, modelDisplayName: null });
    world(new FakeAgentsPort([unnamed]));
    const r = await agentPage(unnamed);
    // The honest bare word, not an invented name.
    expect(r.text).toContain('CUSTOM');
  });

  it('still shows a custom brain’s model id when that is all there is', async () => {
    const custom = anAgent({
      brain: {
        kind: 'custom',
        modelId: 'anthropic/claude-opus-4.6',
        behavior: { risk: 'MODERATE', outlook: 'REALIST', conviction: 'MEASURED' },
      },
      modelDisplayName: null,
    });
    world(new FakeAgentsPort([custom]));
    const r = await agentPage(custom);
    expect(r.text).toContain('anthropic/claude-opus-4.6');
  });
});

describe('the spend, where stoppage is explained', () => {
  it('shows the running total without a gauge, and says no ceiling is published', async () => {
    const spender = anAgent({ last24hCostUsd: 0.09022839 });
    world(new FakeAgentsPort([spender]));
    const r = await limitsPage(spender.id);
    expect(r.text).toContain('$0.0902');
    expect(r.text).toContain('publishes no ceiling to read it against');
    // The unbounded-gauge lesson, applied: a figure with no ceiling must not
    // read as proximity to one.
    expect(r.text).toContain('not how close it is to anything');
  });

  it('says spend can stop the agent — the sentence the page existed without', async () => {
    const spender = anAgent({ last24hCostUsd: 0.09022839 });
    world(new FakeAgentsPort([spender]));
    const r = await limitsPage(spender.id);
    expect(r.text).toContain('Spend is a further way BattleGrid can stop an agent.');
  });

  it('renders no cap parsed from anywhere', async () => {
    // The only cap ever observed was "$6" inside a breach message's prose,
    // which is not a read this product makes.
    const spender = anAgent({ last24hCostUsd: 0.09022839 });
    world(new FakeAgentsPort([spender]));
    const r = await limitsPage(spender.id);
    expect(r.text).not.toMatch(/\$0\.0902\s*(of|\/)/);
  });

  it('says when no figure was reported, rather than showing zero', async () => {
    world(new FakeAgentsPort([anAgent({ last24hCostUsd: null })]));
    const r = await limitsPage('a1');
    expect(r.text).toContain('did not report a spend figure');
    expect(r.text).not.toContain('$0');
  });

  it('an unreadable roster is an unreadable spend, with the shared explanation', async () => {
    const agents = new FakeAgentsPort([anAgent()]);
    agents.rosterReadable = false;
    world(agents);
    const r = await limitsPage('a1');
    expect(r.text).toContain('What this agent has spent could not be read');
    // The resolver joins text nodes with spaces, so the reassurance arrives
    // with its subject detached from the words around it.
    expect(r.text).toMatch(/This does not mean\s+what it has spent is\s+gone/);
    expect(r.text).not.toContain('did not report a spend figure');
  });
});
