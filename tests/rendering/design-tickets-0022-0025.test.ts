import { beforeEach, describe, expect, it, vi } from 'vitest';
import { anAgent, FakeAgentsPort } from '../support/agent-fakes.js';
import { actingWith } from './support/fake-acting.js';
import { rendered } from './support/render.js';
import { resetPending, setPending } from './support/form-status.js';

/**
 * What DT-0022 and DT-0023 asked for, checked where a user would meet it.
 *
 * Both are presentation, so both are asserted structurally rather than by
 * appearance: this harness collects text, links and values, and deliberately
 * not what CSS decides. A class name is a string on a prop — its presence is
 * checkable here, what it *looks like* is not, and pretending otherwise is the
 * vacuity `render.ts` warns about at length.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const AGENT = anAgent({ id: 'a1', displayName: 'Vanguard' });
const params = <T extends Record<string, string>>(p: T): Promise<T> => Promise.resolve(p);

/**
 * Every className reached in the tree, so a class can be asserted present.
 *
 * Calls nested components the way `render.ts` does, and for the same reason: a
 * walker that only descends into `props.children` never enters a component, so
 * it would report zero classes for a page whose whole body is one — which is
 * exactly what the first cut of this file did, and it failed loudly rather than
 * passing empty. Kept local rather than added to the harness: `render.ts` states
 * that what CSS decides is not assertable there, and collecting class names
 * would blur that line for every other test.
 */
async function classNames(node: unknown, out: string[] = []): Promise<string[]> {
  if (node === null || node === undefined || typeof node === 'boolean') return out;
  if (Array.isArray(node)) {
    for (const c of node) await classNames(c, out);
    return out;
  }
  if (node instanceof Promise) return classNames(await node, out);
  if (typeof node !== 'object' || !('props' in node) || !('type' in node)) return out;

  const { type, props } = node as { type: unknown; props: Record<string, unknown> | null };
  const cn = props?.['className'];
  if (typeof cn === 'string') out.push(cn);
  if (typeof type === 'function') {
    return classNames((type as (p: unknown) => unknown)(props ?? {}), out);
  }
  return classNames(props?.['children'], out);
}

beforeEach(() => {
  resetPending();
  current = actingWith({ agents: new FakeAgentsPort([AGENT]) });
});

describe('DT-0022: a submitted confirmation says it is working', () => {
  async function deployPage() {
    const Page = (await import('../../app/(app)/agents/[id]/deploy/page.js')).default;
    return Page({
      params: params({ id: 'a1' }),
      searchParams: Promise.resolve({ coin: 'BTC', timeframe: '15m' }),
    } as never);
  }

  it('says nothing about working while it is at rest', async () => {
    const r = await rendered(await deployPage());
    expect(r.text).toContain('Deploy Vanguard');
    expect(r.text).not.toContain('Deploying');
  });

  it('swaps the label for its progressive form while the submit is in flight', async () => {
    const idle = await rendered(await deployPage());
    setPending(true);
    const busy = await rendered(await deployPage());

    // The label is the carrier, not the spinner: it is what a screen reader
    // announces, and it is what survives prefers-reduced-motion.
    //
    // Asserted on the one token that only the progressive form contains.
    // `rendered()` joins every text node with a space, so `{'Deploy '}{name}`
    // arrives as 'Deploy  Vanguard' and any assertion spanning an interpolation
    // boundary is counting spaces rather than testing the feature.
    expect(busy.text).toContain('Deploying');
    expect(idle.text).not.toContain('Deploying');
    // And the page still says what it is for — the heading did not move.
    expect(busy.text).toContain('BTC');
  });

  it('does not disable the control, because DT-0022 refused that trigger', async () => {
    setPending(true);
    const tree = await deployPage();
    // Styling `disabled` is presentation; entering it removes an affordance and
    // is #153's question for /propose. If this ever starts failing, the change
    // that broke it needs a spec change, not a fix here.
    const disabled = JSON.stringify(await classNames(tree));
    expect(disabled).toBeTruthy();
    const anyDisabledProp = (function find(node: unknown): boolean {
      if (Array.isArray(node)) return node.some(find);
      if (typeof node !== 'object' || node === null || !('props' in node)) return false;
      const props = (node as { props: Record<string, unknown> | null }).props;
      if (props?.['disabled'] === true) return true;
      return find(props?.['children']);
    })(tree);
    expect(anyDisabledProp).toBe(false);
  });

  it('carries the disabled treatment on the primitive even though nothing enters it', async () => {
    const { BUTTON_PRIMARY } = await import('@/presentation/components/control.js');
    // Defined and available. A future control that genuinely cannot be spent
    // gets a stated look rather than an invented one.
    expect(BUTTON_PRIMARY).toContain('disabled:bg-bg-sunken');
    expect(BUTTON_PRIMARY).toContain('disabled:text-text-disabled');
    expect(BUTTON_PRIMARY).toContain('disabled:cursor-not-allowed');
    // No opacity: it fades against the panel rather than the page.
    expect(BUTTON_PRIMARY).not.toContain('opacity');
  });
});

describe('DT-0023: a terminal failure stops looking like a refusal', () => {
  const DELEGATED = 'Your BattleGrid connection is no longer valid. Connect your account again.';

  async function undeployPage(authority: string) {
    const Page = (await import('../../app/(app)/agents/[id]/undeploy/[coin]/page.js')).default;
    return Page({
      params: params({ id: 'a1', coin: 'BTC' }),
      searchParams: Promise.resolve({ authority }),
    } as never);
  }

  it('gives the authority panel a leading edge', async () => {
    const classes = await classNames(await undeployPage(DELEGATED));
    const panel = classes.find((c) => c.includes('bg-danger-subtle'));
    expect(panel, 'the danger panel should be present at all').toBeTruthy();
    expect(panel).toContain('border-l-4');
  });

  it('leaves CarriedProblem without one, which is the whole point', async () => {
    // Rendered on the same surface, from the same tokens, so the comparison is
    // between two panels a user could see one after the other.
    const { CarriedProblem } = await import('@/presentation/components/carried-problem.js');
    const classes = await classNames(CarriedProblem({ problem: 'A revision moved.' }));
    const panel = classes.find((c) => c.includes('bg-danger-subtle'));
    expect(panel, 'CarriedProblem should still wear danger').toBeTruthy();
    expect(panel).not.toContain('border-l-4');
  });

  it('keeps both remedy branches identical apart from the anchor', async () => {
    current = actingWith({ agents: new FakeAgentsPort([AGENT]), remedy: 'reconnect' });
    const withAnchor = await classNames(await undeployPage(DELEGATED));
    current = actingWith({ agents: new FakeAgentsPort([AGENT]), remedy: 'repair-the-key' });
    const without = await classNames(await undeployPage(DELEGATED));

    // The panel is styled the same on both; only the anchor's classes differ.
    const panelOf = (cs: string[]) => cs.find((c) => c.includes('bg-danger-subtle'));
    expect(panelOf(withAnchor)).toBe(panelOf(without));
    expect(withAnchor.length).toBeGreaterThan(without.length);
  });
});
