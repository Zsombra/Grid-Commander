import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Agent } from '@/domain/agent/agent.js';
import { anAgent, FakeAgentsPort } from '../support/agent-fakes.js';
import { actingWith } from './support/fake-acting.js';
import { rendered } from './support/render.js';

/**
 * What the two surfaces that describe a binding actually say about it.
 *
 * The defect these close: `agent.binding.state` was mapped, carried through
 * the domain, and rendered nowhere, while the roster row wrote the word
 * **"Bound"** into its JSX. On 2026-08-06 the second account returned
 * `Volatilis` with `bindingState: ORPHANED` and this product rendered *"Bound
 * to Volatilis — imported at revision 7"* — a definite claim the payload
 * contradicts, on the field that says whether the agent's configuration has a
 * source at all.
 *
 * Rendered rather than grepped, because the property is what a person reads.
 * A source-text check on `binding.state` would pass on a component that
 * printed the state into a `title` attribute nobody sees.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const params = <T extends Record<string, string>>(p: T): Promise<T> => Promise.resolve(p);
const noSearch = Promise.resolve({});

/** The live shape of 2026-08-06: an archived agent whose binding is orphaned. */
const ORPHANED = anAgent({
  binding: {
    strategyId: 's1',
    strategyName: 'Volatilis — imported',
    strategyRevision: 7,
    state: 'ORPHANED',
  },
  status: 'ARCHIVED',
});

function world(agent: Agent) {
  current = actingWith({ agents: new FakeAgentsPort([agent]) });
}

async function agentPage(agent: Agent) {
  const Page = (await import('../../app/(app)/agents/[id]/page.js')).default;
  return rendered(await Page({ params: params({ id: agent.id }) }));
}

async function roster() {
  const Page = (await import('../../app/(app)/agents/page.js')).default;
  return rendered(await Page());
}

beforeEach(() => {
  world(anAgent());
});

describe('an orphaned binding, on the roster', () => {
  it('does not say the agent is bound', async () => {
    world(ORPHANED);
    const r = await roster();
    expect(r.text).not.toContain('Bound to');
  });

  it('says the strategy can no longer be read, and names it', async () => {
    world(ORPHANED);
    const r = await roster();
    expect(r.text).toContain('ORPHANED');
    expect(r.text).toContain('can no longer be read');
    expect(r.text).toContain('Volatilis — imported');
  });

  it('names the revision the configuration was materialized from', async () => {
    // The one fact about what it is running on that the payload supports.
    world(ORPHANED);
    const r = await roster();
    // The resolver joins text nodes with spaces, so the interpolated number
    // arrives detached from the words around it.
    expect(r.text).toMatch(/materialized from revision\s+7/);
  });

  it('asserts nothing about why, or about what would repair it', async () => {
    /**
     * Unestablished, and the backlog item says so explicitly: whether the
     * strategy was archived, deleted or forked away, and whether rebinding is
     * the remedy. A surface that guessed would be the same defect in a new
     * direction.
     */
    world(ORPHANED);
    const r = await roster();
    expect(r.text).not.toMatch(/rebind/i);
    expect(r.text).not.toMatch(/deleted|was archived|forked/i);
  });
});

describe('an orphaned binding, on the agent’s own page', () => {
  it('says the same thing the roster says', async () => {
    world(ORPHANED);
    const r = await agentPage(ORPHANED);
    expect(r.text).toContain('ORPHANED');
    expect(r.text).toContain('can no longer be read');
    expect(r.text).not.toContain('Bound to');
  });

  it('stops telling the operator to go and edit a strategy nobody can read', async () => {
    /**
     * The page printed "Its context sources, signal rules, prose and timeframe
     * come from there and are changed by editing that strategy" under a
     * heading reading "Inherited from its strategy" — for a binding that
     * points at nothing readable.
     */
    world(ORPHANED);
    const r = await agentPage(ORPHANED);
    expect(r.text).not.toContain('come from there');
    expect(r.text).toContain('were materialized onto this agent at that revision');
  });

  it('offers no reading of the state it does not have', async () => {
    world(ORPHANED);
    const r = await agentPage(ORPHANED);
    expect(r.text).toContain('neither has been established');
  });
});

describe('a binding the platform says is intact', () => {
  it('still reads as bound, on both surfaces', async () => {
    const bound = anAgent(); // state: 'BOUND'
    world(bound);
    expect((await roster()).text).toContain('Bound to');
    expect((await agentPage(bound)).text).toContain('Bound to');
  });

  it('keeps the inheritance sentence, which is true of this case', async () => {
    const bound = anAgent();
    world(bound);
    expect((await agentPage(bound)).text).toContain('come from there');
  });
});

describe('a binding state this product has no reading of', () => {
  const unknown = anAgent({
    binding: {
      strategyId: 's1',
      strategyName: 'Volatilis — imported',
      strategyRevision: 7,
      // What `mapAgent` writes when the payload carried no binding state, and
      // the shape a third platform value would arrive in.
      state: 'UNKNOWN',
    },
  });

  it('shows the platform’s own word and claims neither intact nor broken', async () => {
    world(unknown);
    const r = await roster();
    expect(r.text).toContain('UNKNOWN');
    expect(r.text).toContain('does not claim the binding is either intact or broken');
    expect(r.text).not.toContain('Bound to');
  });

  it('does the same on the agent page', async () => {
    world(unknown);
    const r = await agentPage(unknown);
    expect(r.text).toContain('UNKNOWN');
    expect(r.text).not.toContain('Bound to');
  });
});

/**
 * The two surfaces the first change did not reach.
 *
 * `bound-and-on-duty-are-claims-the-payload-must-back` fixed the roster and
 * `/agents/[id]` — the two the backlog item named — and its own author filed
 * the remainder rather than letting it pass. Both were the sentence
 * `/agents/[id]` used to carry, and the reactivate one is the pointed case:
 * `Volatilis` is **ARCHIVED and ORPHANED**, so its reactivate confirmation is
 * exactly the page an operator opens, with the word "bound" in it.
 */
describe('the edit and reactivate copy', () => {
  async function editPage(agent: Agent) {
    world(agent);
    const Page = (await import('../../app/(app)/agents/[id]/edit/page.js')).default;
    return rendered(await Page({ params: params({ id: agent.id }), searchParams: noSearch }));
  }

  async function reactivatePage(agent: Agent) {
    world(agent);
    const Page = (await import('../../app/(app)/agents/[id]/reactivate/page.js')).default;
    return rendered(await Page({ params: params({ id: agent.id }), searchParams: noSearch }));
  }

  it('the reactivate confirmation does not say an orphaned agent returns bound', async () => {
    const r = await reactivatePage(ORPHANED);
    /**
     * The claim, not the phrase. `BindingSummary` legitimately says "the
     * strategy it **was bound to** … can no longer be read" — past tense and
     * accurate — so a bare `not.toContain('bound to')` fails on the very
     * sentence that fixes the defect. What must not survive is the assertion
     * that reactivating *returns it bound*.
     */
    expect(r.text).not.toContain('returns to your roster bound to');
    expect(r.text).not.toContain('Bound to');
    expect(r.text).toContain('ORPHANED');
    expect(r.text).toContain('can no longer be read');
  });

  it('the reactivate confirmation still says what reactivating does', async () => {
    // The split: what it returns *with* is a fact about reactivation and is
    // true whatever the binding says. Only the claim about the binding moved.
    const r = await reactivatePage(ORPHANED);
    expect(r.text).toContain('configuration it had when it was archived');
    expect(r.text).toContain('takes an agent slot');
  });

  it('a healthy binding still reads as bound on reactivate', async () => {
    const bound = anAgent({ status: 'ARCHIVED' });
    const r = await reactivatePage(bound);
    expect(r.text).toContain('Bound to');
  });

  it('the edit page stops sending an orphaned agent to edit its strategy', async () => {
    /**
     * "They change by editing that strategy" is advice, and for an ORPHANED
     * binding it points at a strategy the platform says cannot be read. An
     * editable agent is ACTIVE by definition, so this needs an active agent
     * whose binding is nonetheless orphaned — which the platform permits and
     * this product must not assume away.
     */
    const activeOrphan = anAgent({ ...ORPHANED, status: 'ACTIVE' });
    const r = await editPage(activeOrphan);
    expect(r.text).toContain('ORPHANED');
    expect(r.text).not.toContain('changed by editing that strategy');
  });

  it('the edit page still explains inheritance for a healthy binding', async () => {
    const r = await editPage(anAgent());
    expect(r.text).toContain('Bound to');
    expect(r.text).toContain('editing that strategy');
  });
});

/**
 * A refusal keeps what was composed.
 *
 * The edit form used to be re-rendered from the agent's *stored* values on
 * every refusing branch, so a refusal naming one field cost the person every
 * other one they had typed. Deploy's refused describe already showed typing
 * surviving a bounce; this page did not.
 */
describe('a refused edit keeps what was entered', () => {
  /** Active and bound — ORPHANED is ARCHIVED, and archived agents get no form. */
  const EDITABLE = anAgent({ status: 'ACTIVE' });

  async function editWith(agent: Agent, search: Record<string, string>) {
    world(agent);
    const Page = (await import('../../app/(app)/agents/[id]/edit/page.js')).default;
    return rendered(
      await Page({ params: params({ id: agent.id }), searchParams: Promise.resolve(search) }),
    );
  }

  it('an unresolvable preset leaves the typed name in the form', async () => {
    // review=1 is what asks for the describe; the preset is resolved there.
    const r = await editWith(EDITABLE, {
      review: '1',
      displayName: 'Renamed while composing',
      pmPreset: 'NOT_A_PRESET',
    });
    // The refusal is stated...
    expect(r.text).toContain('does not carry a configuration');
    // ...and the name they typed is still in the field, not the agent's stored
    // one. Asserted on `values`, not `text`: a defaultValue is a prop, and an
    // assertion on text here passes whatever the field holds.
    expect(r.values).toContain('Renamed while composing');
    expect(r.values).not.toContain(EDITABLE.displayName);
  });

  it('a first visit still prefills from the agent, not from nothing', async () => {
    const r = await editWith(EDITABLE, {});
    expect(r.values).toContain(EDITABLE.displayName);
  });
});
