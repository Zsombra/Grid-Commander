import { beforeEach, describe, expect, it, vi } from 'vitest';
import { aStrategy, FakeStrategiesPort } from '../support/strategy-fakes.js';
import { actingWith } from './support/fake-acting.js';
import { rendered } from './support/render.js';

/**
 * The fork form: what it says about naming, and what a refusal looks like
 * from it.
 *
 * The copy is the subject here. The form explains exactly what a blank name
 * does — the platform names the copy `<parent> (fork)` — and gives naming its
 * one true reason: a name of your own tells your copies apart. It must not
 * promise more; the 500-on-collision is the platform's misbehaviour
 * (`forking-a-name-that-exists-is-a-500`), a colliding *chosen* name has never
 * been probed, and a page explaining platform internals it cannot back is the
 * dishonesty this product exists to avoid.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const BERLIN = aStrategy({ id: 'sys-1', name: 'Berlin', scope: 'SYSTEM', revision: 2 });

const params = () => Promise.resolve({ id: 'sys-1' });
const noSearch = Promise.resolve({});

function world() {
  const w = actingWith({ strategies: new FakeStrategiesPort([BERLIN]) });
  current = w;
  return w;
}

beforeEach(() => {
  world();
});

/**
 * The element the typed name survives in. `rendered()` reads text nodes and
 * hrefs; a control's value is a prop, not a text node, so form-state survival
 * is asserted on the element itself rather than on prose about it.
 */
interface Reactish {
  readonly type: unknown;
  readonly props: Record<string, unknown> | null;
}
const isElement = (n: unknown): n is Reactish =>
  typeof n === 'object' && n !== null && 'type' in n && 'props' in n;

function inputNamed(node: unknown, name: string): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = inputNamed(child, name);
      if (hit) return hit;
    }
    return null;
  }
  if (!isElement(node)) return null;
  if (node.type === 'input' && node.props?.['name'] === name) return node.props;
  return inputNamed(node.props?.['children'], name);
}

const forkPage = async () => (await import('../../app/(app)/strategies/[id]/fork/page.js')).default;

describe('the fork form and its name field', () => {
  it('names the strategy and says exactly what a blank name does', async () => {
    const Page = await forkPage();
    const r = await rendered(await Page({ params: params(), searchParams: noSearch }));
    expect(r.headings[0]).toContain('Berlin');
    // Each phrase lives in a single text node — the resolver joins nodes with
    // spaces, so a sentence spanning an interpolation cannot be matched whole.
    expect(r.text).toContain('Left blank, BattleGrid names the copy');
    expect(r.text).toContain('(fork)');
    expect(r.text).toContain('A name of your own tells your copies apart');
  });

  it('promises nothing a name has not been proven to buy', async () => {
    // The one reason to name is the one the truth supports. Anything about
    // errors avoided would be this product explaining a platform internal it
    // cannot back — the collision 500 is unprobed for chosen names.
    const Page = await forkPage();
    const r = await rendered(await Page({ params: params(), searchParams: noSearch }));
    expect(r.text).not.toMatch(/error|avoid|collision|conflict/i);
  });

  it('pre-states the declared bound instead of discovering it by refusal', async () => {
    // fork_strategy declares name as 1–50 characters. 50 on the control is the
    // same treatment displayName's declared 80 gets on the agent forms.
    const Page = await forkPage();
    const tree = await Page({ params: params(), searchParams: noSearch });
    const input = inputNamed(tree, 'name');
    expect(input?.['maxLength']).toBe(50);
    // Optional means optional — a required name would repeal the platform
    // default the page just explained.
    expect(input?.['required']).toBeUndefined();
  });
});

describe('a refused fork, seen from the form', () => {
  const REASON = '{"code":"INTERNAL_ERROR","message":"Internal server error"}';

  it('shows the platform’s answer whole and keeps the typed name', async () => {
    const Page = await forkPage();
    const tree = await Page({
      params: params(),
      searchParams: Promise.resolve({ problem: REASON, name: 'Dunkirk, mark two' }),
    });
    const r = await rendered(tree);
    // The platform's words, unglossed — no diagnosis it did not state.
    expect(r.text).toContain(REASON);
    // The form is still the form: the operator can go again without retyping.
    expect(inputNamed(tree, 'name')?.['defaultValue']).toBe('Dunkirk, mark two');
    expect(r.headings[0]).toContain('Berlin');
  });
});
