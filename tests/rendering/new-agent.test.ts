import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentForm } from '@/presentation/components/agent-form.js';
import { defaultCatalog } from '../support/agent-fakes.js';
import { aStrategy, FakeStrategiesPort } from '../support/strategy-fakes.js';
import { actingWith } from './support/fake-acting.js';
import { rendered } from './support/render.js';

/**
 * Creating an agent, from the form a person actually meets.
 *
 * The page rendered perfectly and could not be submitted: `create` reads
 * `strategyId` and `AgentForm` asked for everything except that, so every
 * submission threw `FormError` before the use case (#177). No test caught it
 * because the create tests exercised the use case directly and none of them
 * walked the form.
 *
 * So these are about the form: what it asks, what it refuses to render, and
 * the one thing it must never do — choose a strategy on the operator's behalf.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const BERLIN = aStrategy({ id: 'sys-1', name: 'Berlin', scope: 'SYSTEM', revision: 2 });
const CANNAE = aStrategy({ id: 'own-1', name: 'Cannae', scope: 'PRIVATE', revision: 7 });

function world(strategies: FakeStrategiesPort) {
  current = actingWith({ strategies });
}

const newAgentPage = async () => (await import('../../app/(app)/agents/new/page.js')).default;

/** The select the form must render, as an element rather than as prose. */
interface Reactish {
  readonly type: unknown;
  readonly props: Record<string, unknown> | null;
}
const isElement = (n: unknown): n is Reactish =>
  typeof n === 'object' && n !== null && 'type' in n && 'props' in n;

function elementNamed(node: unknown, tag: string, name: string): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = elementNamed(child, tag, name);
      if (hit) return hit;
    }
    return null;
  }
  if (!isElement(node)) return null;
  if (node.type === tag && node.props?.['name'] === name) return node.props;
  return elementNamed(node.props?.['children'], tag, name);
}

beforeEach(() => {
  world(new FakeStrategiesPort([BERLIN, CANNAE]));
});

/**
 * The form itself, not the page that mounts it — a page tree holds `AgentForm`
 * as an uninvoked element, so its controls do not exist until it is called.
 * The page-level tests below assert on rendered text instead.
 */
const listings = [
  { strategy: BERLIN, governs: 'Governs no agents', editable: false, fork: { kind: 'offered' } },
  { strategy: CANNAE, governs: 'Governs 2 agents', editable: true, fork: { kind: 'offered' } },
] as never;

describe('the new-agent form asks what the operation requires', () => {
  it('renders a strategy control at all', () => {
    const tree = AgentForm({ catalog: defaultCatalog(), strategies: listings, action: async () => {} });
    expect(
      elementNamed(tree, 'select', 'strategyId'),
      'create reads strategyId; a form that does not ask for it cannot be submitted',
    ).not.toBeNull();
  });

  it('offers every strategy the platform lists, its own and the operator’s', async () => {
    const Page = await newAgentPage();
    const r = await rendered(await Page());
    expect(r.text).toContain('Berlin');
    expect(r.text).toContain('Cannae');
    // Scope is on the option: it decides whether the strategy can later be
    // edited or only forked, and the roster row states it for the same reason.
    expect(r.text).toContain('BattleGrid');
    expect(r.text).toContain('Yours');
  });

  it('chooses nothing on the operator’s behalf', () => {
    const tree = AgentForm({ catalog: defaultCatalog(), strategies: listings, action: async () => {} });
    const select = elementNamed(tree, 'select', 'strategyId');
    // A strategy is the agent's whole reasoning; a default would bind money to
    // a policy nobody read.
    expect(select?.['defaultValue']).toBe('');
    expect(select?.['required']).toBe(true);
  });
});

describe('when there is nothing to bind to, there is no form', () => {
  it('renders no form when the strategy list cannot be read', async () => {
    const strategies = new FakeStrategiesPort([BERLIN]);
    strategies.readable = false;
    world(strategies);

    const Page = await newAgentPage();
    const tree = await Page();
    const r = await rendered(tree);

    expect(elementNamed(tree, 'select', 'strategyId')).toBeNull();
    expect(r.text).toContain('Cannot create an agent right now');
    // The cause, and the reassurance that the work is not gone.
    expect(r.text).toContain('BattleGrid did not respond');
    expect(r.text).toMatch(/does not mean/i);
  });

  it('renders no form when the platform lists no strategies at all', async () => {
    world(new FakeStrategiesPort([]));

    const Page = await newAgentPage();
    const tree = await Page();
    const r = await rendered(tree);

    expect(elementNamed(tree, 'select', 'strategyId')).toBeNull();
    expect(r.headings[0]).toBe('Nothing to bind an agent to');
    // An answer, not a failure: nothing here has broken.
    expect(r.text).toMatch(/nothing here has\s+failed|nothing here has failed/);
  });
});
