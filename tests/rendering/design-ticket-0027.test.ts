import { beforeEach, describe, expect, it, vi } from 'vitest';
import { anAgent, FakeAgentsPort } from '../support/agent-fakes.js';
import { aProposal, FakeProposalStore } from '../support/proposal-fakes.js';
import { actingWith } from './support/fake-acting.js';
import { rendered } from './support/render.js';
import { resetPending, setPending } from './support/form-status.js';
import { BUTTON_SECONDARY } from '@/presentation/components/control.js';

/**
 * DT-0027 — the one secondary submit that performs says it is working.
 *
 * `/pending/[id]` offers two submits against the same proposal. #153 gave Agree
 * a pending state and left Decline silent, because `PerformButton` wore the
 * primary weight and promoting a deliberately secondary control to the page's
 * main weight is a visual claim about a destructive choice. DT-0027 designed
 * the secondary weight's treatment; this is it, wired.
 *
 * Structural, like DT-0022's tests: a class name is a string on a prop, so its
 * presence is checkable here and what it *looks* like is not. `render.ts` states
 * that it collects no attributes on purpose, which is why the walkers below are
 * local to this file rather than added to the harness.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const RESTING = 'Decline — this closes the proposal permanently';
const WORKING = 'Declining…';
const AGREE_RESTING = 'Agree and make this change';

/**
 * The proposal branch — the only one that renders either form.
 *
 * `displayName` rather than `aProposal`'s default `tradingMode`, because the
 * default is rejected whole and lands on `no-op`, whose Shell renders no form
 * at all. `recordedAt` sits inside the staleness horizon of the harness clock.
 */
function aReadyProposal(): void {
  const proposals = new FakeProposalStore();
  proposals.rows = [
    aProposal({
      id: 'p1',
      userId: 'owner',
      target: 'a1',
      recordedAt: new Date('2026-07-27T11:00:00Z'),
      proposedValues: { changes: { displayName: 'Vanguard II' } },
    }),
  ];
  current = actingWith({
    proposals,
    agents: new FakeAgentsPort([anAgent({ id: 'a1', displayName: 'Volatilis' })]),
  }) as unknown as { app: unknown; user: unknown };
}

async function proposalPage(): Promise<unknown> {
  const Page = (await import('../../app/(app)/pending/[id]/page.js')).default;
  return Page({
    params: Promise.resolve({ id: 'p1' }),
    searchParams: Promise.resolve({}),
  } as never);
}

interface Reactish {
  readonly type: unknown;
  readonly props: Record<string, unknown> | null;
}

const isReactish = (n: unknown): n is Reactish =>
  typeof n === 'object' && n !== null && 'props' in n && 'type' in n;

/**
 * Every rendered node of a given intrinsic type, as an element.
 *
 * Calls function components, the way `render.ts` and DT-0022's `classNames` do.
 * A walker that only descends `props.children` never enters `PerformButton` and
 * would report zero buttons for a page whose submits are all components — which
 * is exactly the vacuity DT-0022's own `disabled` walker has, noted there.
 */
async function nodesOfType(tag: string, node: unknown, out: Reactish[] = []): Promise<Reactish[]> {
  if (node === null || node === undefined || typeof node === 'boolean') return out;
  if (Array.isArray(node)) {
    for (const c of node) await nodesOfType(tag, c, out);
    return out;
  }
  if (node instanceof Promise) return nodesOfType(tag, await node, out);
  if (!isReactish(node)) return out;
  const { type, props } = node;
  if (type === tag) out.push(node);
  if (typeof type === 'function') {
    return nodesOfType(tag, (type as (p: unknown) => unknown)(props ?? {}), out);
  }
  return nodesOfType(tag, props?.['children'], out);
}

/** The button whose own rendered text carries `needle`. */
async function submitSaying(tree: unknown, needle: string): Promise<Reactish | undefined> {
  for (const b of await nodesOfType('button', tree)) {
    if ((await rendered(b)).text.includes(needle)) return b;
  }
  return undefined;
}

const childrenOf = (n: Reactish): Reactish[] => {
  const c = n.props?.['children'];
  return (Array.isArray(c) ? c : [c]).filter(isReactish);
};

const indicatorOf = (b: Reactish): Reactish | undefined =>
  childrenOf(b).find((c) => c.props?.['aria-hidden'] === 'true');

beforeEach(() => {
  // No `vi.resetModules()` here, deliberately. Resetting re-runs the react-dom
  // mock factory, which re-imports the form-status module and can hand the page
  // a different `pending` variable from the one `setPending` below drives.
  // DT-0022's file makes the same choice for the same reason.
  resetPending();
  aReadyProposal();
});

describe('DT-0027: the decline submit says it is working', () => {
  it('renders both submits, so the rest of this file is not asserting on nothing', async () => {
    const tree = await proposalPage();
    expect((await submitSaying(tree, 'Decline')), 'the proposal branch must render Decline').toBeDefined();
    expect((await submitSaying(tree, AGREE_RESTING)), 'and Agree beside it').toBeDefined();
  });

  it('says nothing about working while it is at rest', async () => {
    const decline = await submitSaying(await proposalPage(), 'Decline');
    expect((await rendered(decline)).text).toContain(RESTING);
    // Not `toBeUndefined` — the wiring emits `aria-busy={pending}` always, so
    // at rest the prop is present and false. An absence assertion would fail
    // against correct code.
    expect(decline?.props?.['aria-busy']).not.toBe(true);
    expect(indicatorOf(decline as Reactish)).toBeUndefined();
  });

  it('swaps the label and says it is busy while the submit is in flight', async () => {
    setPending(true);
    const decline = await submitSaying(await proposalPage(), 'Declining');
    expect(decline).toBeDefined();
    const text = (await rendered(decline)).text;
    expect(text).toContain(WORKING);
    expect(text).not.toContain('this closes the proposal permanently');
    expect(decline?.props?.['aria-busy']).toBe(true);
  });

  it('keeps the secondary weight — a working control is not a promoted one', async () => {
    setPending(true);
    const decline = await submitSaying(await proposalPage(), 'Declining');
    const cn = String(decline?.props?.['className']);
    expect(cn).toContain(BUTTON_SECONDARY);
    // The page exists to offer agreement. If Decline ever wears the primary
    // treatment, the page has started claiming it is neutral between agreeing
    // and declining, which is a visual claim about a destructive choice.
    expect(cn).not.toContain('bg-accent-default');
  });

  it('marks the indicator decorative and hides it under prefers-reduced-motion', async () => {
    setPending(true);
    const decline = await submitSaying(await proposalPage(), 'Declining');
    const spinner = indicatorOf(decline as Reactish);
    expect(spinner, 'the indicator must exist and be decorative').toBeDefined();
    const cn = String(spinner?.props?.['className']);
    // Hidden rather than paused: tokens.css sets `animation-duration: 80ms`
    // under reduced motion, which does not stop a spin — it accelerates it.
    expect(cn).toContain('motion-reduce:hidden');
    // The label carries the state either way, which is the test of whether an
    // indicator is allowed to exist at all.
    expect((await rendered(decline)).text).toContain(WORKING);
  });

  it('draws the indicator in its label’s colour, not the accent', async () => {
    // system.json v3: "A working control's indicator wears its label's colour".
    // `accent.text` is white and would be invisible on a bordered transparent
    // control; `accent.default` would make a working secondary louder than a
    // resting primary beside it.
    setPending(true);
    const decline = await submitSaying(await proposalPage(), 'Declining');
    const cn = String(indicatorOf(decline as Reactish)?.props?.['className']);
    expect(cn).toContain('border-text-primary');
    expect(cn).not.toContain('border-accent-text');
    expect(cn).not.toContain('border-accent-default');
  });

  it('renders the same indicator as the primary, in a different colour', async () => {
    setPending(true);
    const tree = await proposalPage();
    const agree = await submitSaying(tree, 'Making the change');
    const decline = await submitSaying(tree, 'Declining');
    const spin = (b: Reactish | undefined): string =>
      String(indicatorOf(b as Reactish)?.props?.['className']);
    // One object in two colours, not two spinners: size, spin, shape, gap and
    // the reduced-motion rule must be identical.
    expect(spin(decline).replace('border-text-primary', '§')).toBe(
      spin(agree).replace('border-accent-text', '§'),
    );
  });

  it('leaves the box alone — the treatment adds no ground and no border', async () => {
    const idle = await submitSaying(await proposalPage(), 'Decline');
    const idleClass = String(idle?.props?.['className']);
    setPending(true);
    const busy = await submitSaying(await proposalPage(), 'Declining');
    // A control that resized or re-grounded on submission would move at the
    // exact moment the user is watching to see whether anything happened.
    expect(String(busy?.props?.['className'])).toBe(idleClass);
  });

  it('sits in its own form, so its pending state is its own', async () => {
    // The runtime independence is NOT observable here: the react-dom mock is
    // suite-wide, so `setPending(true)` drives every consumer on the page at
    // once. What is checkable is the structural fact it rests on — Decline and
    // Agree are separate `<form action=…>` elements.
    const forms = await nodesOfType('form', await proposalPage());
    const texts = await Promise.all(forms.map(async (f) => (await rendered(f)).text));
    expect(texts.filter((t) => t.includes('Decline'))).toHaveLength(1);
    expect(texts.filter((t) => t.includes('Decline') && t.includes(AGREE_RESTING))).toHaveLength(0);
  });
});

describe('DT-0027: the constant', () => {
  it('gains no class for the loading state, because there is nowhere to put one', async () => {
    // `disabled` is a CSS pseudo-class, so DT-0022 could hang `disabled:` rules
    // off BUTTON_PRIMARY. "Loading" is not one — it is a fact the component
    // knows from `useFormStatus`, and nothing a stylesheet can select. The
    // whole treatment is the indicator and the label swap.
    expect(BUTTON_SECONDARY).not.toMatch(/loading/);
    expect(BUTTON_SECONDARY).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(BUTTON_SECONDARY).not.toContain('opacity');
    expect(BUTTON_SECONDARY).not.toContain('rgb');
    // The treatment keeps what the constant already carries.
    expect(BUTTON_SECONDARY).toContain('border-border-default');
    expect(BUTTON_SECONDARY).toContain('text-text-primary');
  });
});
