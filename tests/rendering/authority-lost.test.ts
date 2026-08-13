import { beforeEach, describe, expect, it, vi } from 'vitest';
import { anAgent, FakeAgentsPort } from '../support/agent-fakes.js';
import { actingWith } from './support/fake-acting.js';
import { rendered } from './support/render.js';

/**
 * The ceremony pages, when the account's authority is gone.
 *
 * The defect: a revoked connection was flattened into `{kind:'refused'}` and
 * rendered as "Refused: your BattleGrid connection is no longer valid" above a
 * live confirmation form. Both halves were wrong — it is not a refusal of that
 * operation, and pressing the button again cannot work.
 *
 * So these assert the two things that matter: the sentence survives whole
 * (it carries the deployment's own remedy), and there is nothing to press.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const AGENT = anAgent({ id: 'a1', displayName: 'Vanguard' });
const DELEGATED = 'Your BattleGrid connection is no longer valid. Connect your account again.';
/** The same failure on a deployment holding a configured key. */
const PERSONAL =
  'Your BattleGrid connection is no longer valid. ' +
  'Check the BATTLEGRID_API_KEY this deployment was configured with, then restart it.';

beforeEach(() => {
  current = actingWith({ agents: new FakeAgentsPort([AGENT]) });
});

/** Any control that would perform something. */
interface Reactish {
  readonly type: unknown;
  readonly props: Record<string, unknown> | null;
}
const isElement = (n: unknown): n is Reactish =>
  typeof n === 'object' && n !== null && 'type' in n && 'props' in n;

function hasAny(node: unknown, tags: readonly string[]): boolean {
  if (Array.isArray(node)) return node.some((c) => hasAny(c, tags));
  if (!isElement(node)) return false;
  if (typeof node.type === 'string' && tags.includes(node.type)) return true;
  return hasAny(node.props?.['children'], tags);
}

const pages = [
  {
    name: 'deploy',
    load: async () => (await import('../../app/(app)/agents/[id]/deploy/page.js')).default,
    args: (authority: string) => ({
      params: Promise.resolve({ id: 'a1' }),
      searchParams: Promise.resolve({ coin: 'BTC', timeframe: '15m', authority }),
    }),
  },
  {
    name: 'undeploy',
    load: async () => (await import('../../app/(app)/agents/[id]/undeploy/[coin]/page.js')).default,
    args: (authority: string) => ({
      params: Promise.resolve({ id: 'a1', coin: 'BTC' }),
      searchParams: Promise.resolve({ authority }),
    }),
  },
  {
    name: 'rebind',
    load: async () => (await import('../../app/(app)/agents/[id]/rebind/page.js')).default,
    args: (authority: string) => ({
      params: Promise.resolve({ id: 'a1' }),
      searchParams: Promise.resolve({ to: 's-new', authority }),
    }),
  },
] as const;

for (const page of pages) {
  describe(`${page.name}: authority gone`, () => {
    it('says the authority is no longer valid, in the words the failure carried', async () => {
      const Page = await page.load();
      const r = await rendered(await Page(page.args(DELEGATED) as never));

      expect(r.headings[0]).toBe('Your BattleGrid authority is no longer valid');
      // Verbatim — the remedy in it belongs to this deployment.
      expect(r.text).toContain(DELEGATED);
      // And not dressed as a refusal of the operation that was attempted.
      expect(r.text).not.toContain('Refused:');
    });

    it('offers nothing to press', async () => {
      const Page = await page.load();
      const tree = await Page(page.args(DELEGATED) as never);

      expect(
        hasAny(tree, ['form', 'button']),
        'a control that cannot succeed is not made honest by the sentence above it',
      ).toBe(false);
    });

    it('states that nothing was changed', async () => {
      const Page = await page.load();
      const r = await rendered(await Page(page.args(DELEGATED) as never));
      expect(r.text).toContain('Nothing was changed');
    });

    /**
     * A remedy is a target, not a sentence — DT-0006's ruling for
     * `NotConnected`, applied one step later where it matters more. Which
     * remedy exists is a property of the deployment, so the two branches are
     * two deployments, not two failures.
     */
    it('offers the remedy where the deployment has one', async () => {
      current = actingWith({ agents: new FakeAgentsPort([AGENT]), remedy: 'reconnect' });
      const Page = await page.load();
      const r = await rendered(await Page(page.args(DELEGATED) as never));

      // On `links`, never on `text`: a label without an href reads identically
      // and would pass a reasonable-looking assertion while going nowhere.
      expect(r.links).toContain('/connect');
      // Still not the control that performs the operation.
      expect(hasAny(await Page(page.args(DELEGATED) as never), ['form', 'button'])).toBe(false);
    });

    it('offers no control where no control can perform the remedy', async () => {
      current = actingWith({ agents: new FakeAgentsPort([AGENT]), remedy: 'repair-the-key' });
      const Page = await page.load();
      const r = await rendered(await Page(page.args(PERSONAL) as never));

      // Nothing to click, because replacing an environment variable and
      // restarting a process is not something a link can do. Offering one
      // would send the operator to a page that says there is nothing to
      // connect — the false affordance the requirement forbids.
      expect(r.links).not.toContain('/connect');
      expect(r.text).toContain(PERSONAL);
    });

    it('renders the carried sentence verbatim under either deployment', async () => {
      current = actingWith({ agents: new FakeAgentsPort([AGENT]), remedy: 'repair-the-key' });
      const Page = await page.load();
      const r = await rendered(await Page(page.args(PERSONAL) as never));
      expect(r.text).toContain('BATTLEGRID_API_KEY');
    });
  });
}
