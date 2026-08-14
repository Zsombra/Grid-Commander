import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentForm } from '@/presentation/components/agent-form.js';
import { defaultCatalog, FakeAgentsPort } from '../support/agent-fakes.js';
import { aStrategy, FakeStrategiesPort } from '../support/strategy-fakes.js';
import { actingWith } from './support/fake-acting.js';
import { rendered } from './support/render.js';

/** Any stable value: these tests assert on structure, not on the key itself. */
const KEY = 'test-idempotency-key';

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
    const tree = AgentForm({ catalog: defaultCatalog(), strategies: listings, action: async () => {}, idempotencyKey: KEY });
    expect(
      elementNamed(tree, 'select', 'strategyId'),
      'create reads strategyId; a form that does not ask for it cannot be submitted',
    ).not.toBeNull();
  });

  it('offers every strategy the platform lists, its own and the operator’s', async () => {
    const Page = await newAgentPage();
    const r = await rendered(await Page({}));
    expect(r.text).toContain('Berlin');
    expect(r.text).toContain('Cannae');
    // Scope is on the option: it decides whether the strategy can later be
    // edited or only forked, and the roster row states it for the same reason.
    expect(r.text).toContain('BattleGrid');
    expect(r.text).toContain('Yours');
  });

  it('chooses nothing on the operator’s behalf', () => {
    const tree = AgentForm({ catalog: defaultCatalog(), strategies: listings, action: async () => {}, idempotencyKey: KEY });
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
    const tree = await Page({});
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
    const tree = await Page({});
    const r = await rendered(tree);

    expect(elementNamed(tree, 'select', 'strategyId')).toBeNull();
    expect(r.headings[0]).toBe('Nothing to bind an agent to');
    // An answer, not a failure: nothing here has broken.
    expect(r.text).toMatch(/nothing here has\s+failed|nothing here has failed/);
  });
});

/**
 * The aftermath of a bounced submit. A duplicate press redirects back here
 * with `?problem=`, and the sentence must render on whatever branch the
 * re-render takes — a duplicate whose first press succeeded arrives at
 * capacity by construction, which is exactly the branch that historically
 * dropped a carried reason (#240).
 */
describe('a carried problem renders on every branch', () => {
  const PROBLEM = 'this form was already submitted and the agent was created';
  const withProblem = { searchParams: Promise.resolve({ problem: PROBLEM }) };

  it('renders the sentence above the form', async () => {
    const Page = await newAgentPage();
    const r = await rendered(await Page(withProblem));
    expect(r.text).toContain('Refused:');
    expect(r.text).toContain(PROBLEM);
    // The form is still there, with a fresh key — a deliberate second agent
    // stays one press away.
    expect(r.text).toContain('New agent');
  });

  it('renders the sentence on the no-strategies branch too', async () => {
    world(new FakeStrategiesPort([]));
    const Page = await newAgentPage();
    const r = await rendered(await Page(withProblem));
    expect(r.headings[0]).toBe('Nothing to bind an agent to');
    expect(r.text).toContain(PROBLEM);
  });

  it('renders the sentence on the unreadable-strategies branch too', async () => {
    const strategies = new FakeStrategiesPort([BERLIN]);
    strategies.readable = false;
    world(strategies);
    const Page = await newAgentPage();
    const r = await rendered(await Page(withProblem));
    expect(r.text).toContain('Cannot create an agent right now');
    expect(r.text).toContain(PROBLEM);
  });

  it('renders nothing extra when no problem is carried', async () => {
    const Page = await newAgentPage();
    const r = await rendered(await Page({ searchParams: Promise.resolve({}) }));
    expect(r.text).not.toContain('Refused:');
  });
});

/**
 * The action itself, walked. The command mapping and the rendered sentence
 * are each tested elsewhere; this covers the seam between them — which
 * sentence each outcome picks, and where the bounce lands. A swapped ternary
 * would pass every other test.
 */
describe('the create action bounces a duplicate to the surface acted from', () => {
  function duplicateSubmit() {
    const form = new FormData();
    form.set('displayName', 'Dup');
    form.set('brainPreset', 'ROMMEL');
    form.set('strategyId', 'own-1');
    form.set('tradingMode', 'OFF');
    form.set('minAllocationUsd', '10');
    form.set('balanceThresholdUsd', '10');
    form.set('maxConcurrentExposureUsd', '100');
    form.set('maxCumulativeDrawdownUsd', '100');
    form.set('maxDailyLossUsd', '50');
    form.set('idempotencyKey', 'k-dup');
    return form;
  }

  async function bounceOf(outcome: 'succeeded' | 'attempted'): Promise<string> {
    const { FakeAgentsPort } = await import('../support/agent-fakes.js');
    const { actingWith } = await import('./support/fake-acting.js');
    const agents = new FakeAgentsPort([]);
    agents.duplicateOf = outcome;
    current = actingWith({ agents, strategies: new FakeStrategiesPort([BERLIN, CANNAE]) });

    const { create } = await import('../../app/(app)/agents/new/actions.js');
    try {
      await create(duplicateSubmit());
    } catch (err) {
      // `redirect()` works by throwing; the destination rides in the digest.
      return String((err as { digest?: string }).digest ?? '');
    }
    throw new Error('the action neither redirected nor threw — the refusal went nowhere');
  }

  it('a duplicate of a succeeded create says the press worked, on /agents/new', async () => {
    const digest = decodeURIComponent(await bounceOf('succeeded'));
    expect(digest).toContain('/agents/new?problem=');
    expect(digest).toContain('the agent was created');
  });

  it('a duplicate of an undecided create says to check the roster first', async () => {
    const digest = decodeURIComponent(await bounceOf('attempted'));
    expect(digest).toContain('/agents/new?problem=');
    expect(digest).toContain('may have landed');
  });
});

/**
 * The three arms that used to fall off the end of the action (#245): the
 * refused press returned undefined and the page re-rendered unchanged, so a
 * swallowed refusal read exactly like a page reload. Each arm is walked to its
 * bounce here — the reason it returned, on `/agents/new`, with what was
 * composed riding along and the dedupe key deliberately left behind.
 */
describe('a refused create bounces back with what was composed', () => {
  function composedSubmit(overrides: Record<string, string> = {}) {
    const form = new FormData();
    form.set('displayName', 'Meridian');
    form.set('brainPreset', 'ROMMEL');
    form.set('strategyId', 'own-1');
    form.set('tradingMode', 'OFF');
    form.set('minAllocationUsd', '10');
    form.set('balanceThresholdUsd', '10');
    form.set('maxConcurrentExposureUsd', '100');
    form.set('maxCumulativeDrawdownUsd', '100');
    form.set('maxDailyLossUsd', '50');
    form.set('idempotencyKey', 'k-bounce');
    // Next's transport rides in real submissions (see the edit action's
    // allowlist note) — the bounce must not carry it into a visible URL.
    form.set('$ACTION_ID_405deadbeef', 'framework-transport');
    for (const [k, v] of Object.entries(overrides)) form.set(k, v);
    return form;
  }

  /** The bounce's query, parsed — URLSearchParams owns the +/%20 question. */
  async function bounceQuery(
    prepare: (agents: FakeAgentsPort) => void,
    form = composedSubmit(),
  ): Promise<{ landing: string; params: URLSearchParams }> {
    const agents = new FakeAgentsPort([]);
    prepare(agents);
    current = actingWith({ agents, strategies: new FakeStrategiesPort([BERLIN, CANNAE]) });

    const { create } = await import('../../app/(app)/agents/new/actions.js');
    try {
      await create(form);
    } catch (err) {
      // `redirect()` works by throwing; the destination rides in the digest.
      const digest = String((err as { digest?: string }).digest ?? '');
      const url = digest.split(';')[2] ?? '';
      const at = url.indexOf('?');
      return {
        landing: at === -1 ? url : url.slice(0, at),
        params: new URLSearchParams(at === -1 ? '' : url.slice(at + 1)),
      };
    }
    throw new Error('the action neither redirected nor threw — the refusal went nowhere');
  }

  it('at capacity: the platform’s explanation, with the composition carried', async () => {
    const { landing, params } = await bounceQuery((agents) => {
      agents.slots = { limit: 3, used: 3, remaining: 0, rankName: 'Recruit III' };
    });
    expect(landing).toBe('/agents/new');
    expect(params.get('problem')).toContain('all 3 of your agent slots');
    expect(params.get('displayName')).toBe('Meridian');
    expect(params.get('maxDailyLossUsd')).toBe('50');
  });

  it('no catalog: the read’s own reason, with the composition carried', async () => {
    const { landing, params } = await bounceQuery((agents) => {
      agents.catalogReadable = false;
    });
    expect(landing).toBe('/agents/new');
    expect(params.get('problem')).toContain('catalog unavailable');
    expect(params.get('strategyId')).toBe('own-1');
  });

  it('invalid: each reason names its field, with the composition carried', async () => {
    const { landing, params } = await bounceQuery(
      () => {},
      composedSubmit({ brainPreset: 'NAPOLEON' }),
    );
    expect(landing).toBe('/agents/new');
    expect(params.get('problem')).toContain('brain.preset');
    expect(params.get('problem')).toContain('is not a brain preset');
    // The refused value itself rides back — fixing it must not cost the rest.
    expect(params.get('brainPreset')).toBe('NAPOLEON');
    expect(params.get('displayName')).toBe('Meridian');
  });

  it('the dedupe key and framework transport stay behind', async () => {
    const { params } = await bounceQuery((agents) => {
      agents.catalogReadable = false;
    });
    // A fresh key is minted by the re-render — carrying the old one would
    // read as protection while providing none (the form instance is gone).
    expect(params.has('idempotencyKey')).toBe(false);
    expect([...params.keys()].filter((k) => k.startsWith('$ACTION'))).toEqual([]);
  });
});

/**
 * The other half of the bounce: what rides back must be *in the form* when it
 * renders. A form re-rendered from nothing reads identically in text to one
 * holding what was typed — so nothing here asserts on text, and nothing
 * asserts a select's prefill through `values` either: every `<option value>`
 * lands in `values` too, so "own-1 is present" is true on a first visit and
 * proves nothing. Selects are read as `defaultValue` props; pass-through
 * components (Choice, MoneyLimits) as the props they were handed.
 */
describe('the re-rendered form holds what was composed', () => {
  const composed = {
    displayName: 'Meridian',
    strategyId: 'own-1',
    brainPreset: 'NAPOLEON',
    risk: 'AGGRESSIVE',
    maxDailyLossUsd: '50',
  };

  /** Any element whose `name` prop matches — function-typed ones included. */
  function elementWithNameProp(node: unknown, name: string): Record<string, unknown> | null {
    if (Array.isArray(node)) {
      for (const child of node) {
        const hit = elementWithNameProp(child, name);
        if (hit) return hit;
      }
      return null;
    }
    if (!isElement(node)) return null;
    if (node.props?.['name'] === name) return node.props;
    return elementWithNameProp(node.props?.['children'], name);
  }

  it('every control kind takes its default from what was carried', () => {
    const tree = AgentForm({
      catalog: defaultCatalog(),
      strategies: listings,
      action: async () => {},
      idempotencyKey: KEY,
      composed,
    });
    expect(elementNamed(tree, 'input', 'displayName')?.['defaultValue']).toBe('Meridian');
    expect(elementNamed(tree, 'select', 'strategyId')?.['defaultValue']).toBe('own-1');
    expect(elementNamed(tree, 'select', 'brainPreset')?.['defaultValue']).toBe('NAPOLEON');
    // The behavior enums render inside Choice, uninvoked in this tree — the
    // property owned here is that the carried value reaches it.
    expect(elementWithNameProp(tree, 'risk')?.['current']).toBe('AGGRESSIVE');
  });

  it('the money questions receive the carried answers', () => {
    const tree = AgentForm({
      catalog: defaultCatalog(),
      strategies: listings,
      action: async () => {},
      idempotencyKey: KEY,
      composed,
    });
    // MoneyLimits is the one element in the tree carrying both a catalog and
    // a `current` — the same prop the edit surface fills, for the same reason.
    const money = (function find(node: unknown): Record<string, unknown> | null {
      if (Array.isArray(node)) {
        for (const child of node) {
          const hit = find(child);
          if (hit) return hit;
        }
        return null;
      }
      if (!isElement(node)) return null;
      if (node.props?.['catalog'] && node.props?.['current']) return node.props;
      return find(node.props?.['children']);
    })(tree);
    expect((money?.['current'] as Record<string, unknown>)?.['maxDailyLossUsd']).toBe('50');
  });

  it('the page passes the carried query through, and the reason renders above', async () => {
    const Page = await newAgentPage();
    const r = await rendered(
      await Page({
        searchParams: Promise.resolve({
          ...composed,
          problem: 'brain.preset: "NAPOLEON" is not a brain preset.',
          idempotencyKey: 'k-injected',
        }),
      }),
    );
    expect(r.text).toContain('Refused:');
    expect(r.text).toContain('is not a brain preset');
    // Input-borne values — never option values, so present only if carried.
    expect(r.values).toContain('Meridian');
    expect(r.values).toContain('50');
    // The key from the URL is adopted nowhere: the form's key is minted per
    // render, and a carried one would read as protection while providing none.
    expect(r.values).not.toContain('k-injected');
  });

  it('a first visit still chooses nothing on the operator’s behalf', () => {
    const tree = AgentForm({
      catalog: defaultCatalog(),
      strategies: listings,
      action: async () => {},
      idempotencyKey: KEY,
    });
    expect(elementNamed(tree, 'select', 'strategyId')?.['defaultValue']).toBe('');
    expect(elementNamed(tree, 'input', 'displayName')?.['defaultValue']).toBeUndefined();
  });
});
