import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DescribeEditQuery } from '@/application/use-cases/describe-edit.query.js';
import { UpdateAgentCommand } from '@/application/use-cases/update-agent.command.js';
import {
  anAgent,
  FakeAgentsPort,
  liveTradingConfig,
  SequentialRandom,
} from '../support/agent-fakes.js';
import { FakeClock, FakeConfirmationStore } from '../support/fakes.js';
import { digestOf } from '@/domain/capability/digest.js';
import { editIntent, MONEY_FIELDS } from '@/presentation/form.js';

/**
 * A confirmation authorises the change it described, and no other.
 *
 * The token bound to `agent.id`, so *any* submission naming the same agent
 * consumed it. An agreement to
 *
 *     Sets the most it may lose in a day to $25.
 *
 * was accepted by a submission carrying $25,000 — same user, same tool, same
 * agent. The consequence was stored, so the audit log recorded the sentence and
 * the mismatch was detectable afterwards and prevented nowhere.
 *
 * The store's `consume` is the real matching logic, so these drive it rather than
 * asserting two strings are equal: what matters is that a token issued by the
 * proposal can be spent by the apply, and only by the right apply.
 */

const who = { userId: 'u1', accessToken: 'at' };

function harness() {
  const clock = new FakeClock();
  /**
   * `liveTradingConfig()`, not a short literal.
   *
   * The platform requires every field once `tradingConfig` is present, so a
   * six-field fixture makes `applyEdit` report fourteen missing and the command
   * returns `invalid` before it ever writes — which is what the first draft of
   * this file did. A config that cannot exist proves nothing about a merge, and
   * that exact fixture mistake hid three unwritable fields for the life of the
   * edit path.
   */
  const port = new FakeAgentsPort([anAgent({ tradingConfig: liveTradingConfig() })]);
  const confirmations = new FakeConfirmationStore(clock);
  return {
    port,
    confirmations,
    propose: new DescribeEditQuery(port, confirmations, new SequentialRandom(), clock),
    apply: new UpdateAgentCommand(port),
  };
}

/** Propose, then apply, and report whether the token could actually be spent. */
async function proposeThenApply(
  h: ReturnType<typeof harness>,
  proposed: Readonly<Record<string, unknown>>,
  submitted: { changes: Record<string, unknown>; tradingConfigChanges?: Record<string, unknown> },
) {
  const proposal = await h.propose.execute({ ...who, agentId: 'a1', changes: proposed });
  if (proposal.kind !== 'proposal') throw new Error(`expected a proposal, got ${proposal.kind}`);

  const result = await h.apply.execute({
    ...who,
    agentId: 'a1',
    changes: submitted.changes,
    ...(submitted.tradingConfigChanges
      ? { tradingConfigChanges: submitted.tradingConfigChanges }
      : {}),
    confirmationToken: proposal.proposal.confirmationToken,
  });

  const write = h.port.calls.find((c) => c.op === 'update');
  // `enforce()` is what spends it in production; the store's own matching is what
  // `enforce()` calls. Driving the store directly checks the binding without
  // standing up an HTTP adapter.
  const spent = await h.confirmations.consume(
    proposal.proposal.confirmationToken,
    who.userId,
    'update_intelligence_agent',
    write?.target ?? '(the write bound nothing)',
  );
  return { result, spent, boundTo: write?.target };
}

describe('the change performed is the change described', () => {
  /**
   * The load-bearing test, and the one most likely to be missing.
   *
   * A binding that refuses tampered submissions *and* honest ones looks like it
   * is working. It presents as "the edit form stopped working", and the obvious
   * fix — loosen the binding — restores the defect. See DL-5.
   *
   * It nearly happened: the review read its values from a query string and kept
   * `"25"`, while the apply read a form and produced `25`. Those digest
   * differently, so every honest edit would have been refused. Found by comparing
   * the two coercions before writing the binding; there is now one coercion.
   */
  it('lets an unaltered submission through, exactly once', async () => {
    const h = harness();
    const { result, spent } = await proposeThenApply(
      h,
      { displayName: 'Vol II', tradingConfig: { maxDailyLossUsd: 25 } },
      { changes: { displayName: 'Vol II' }, tradingConfigChanges: { maxDailyLossUsd: 25 } },
    );

    expect(result.kind, 'an honest edit must succeed').toBe('updated');
    expect(spent, 'the token the proposal issued must be spendable by the apply').not.toBeNull();
    expect(h.port.calls.filter((c) => c.op === 'update')).toHaveLength(1);
  });

  it('refuses a submission carrying a different amount', async () => {
    const h = harness();
    // Agreed to $25. Submitted $25,000 — the hidden field edited in the browser.
    const { spent, boundTo } = await proposeThenApply(
      h,
      { tradingConfig: { maxDailyLossUsd: 25 } },
      { changes: {}, tradingConfigChanges: { maxDailyLossUsd: 25000 } },
    );

    expect(spent, 'a token for $25 must not authorise $25,000').toBeNull();
    expect(boundTo, 'the write bound the amount it was about to send').toMatch(/^agent:a1#/);
  });

  it('refuses a submission carrying a different name', async () => {
    const h = harness();
    const { spent } = await proposeThenApply(
      h,
      { displayName: 'Vol II' },
      { changes: { displayName: 'Something else entirely' } },
    );
    expect(spent).toBeNull();
  });

  it('gives two proposals for one agent two different authorisations', async () => {
    const h = harness();
    const first = await h.propose.execute({
      ...who,
      agentId: 'a1',
      changes: { tradingConfig: { maxDailyLossUsd: 25 } },
    });
    const second = await h.propose.execute({
      ...who,
      agentId: 'a1',
      changes: { tradingConfig: { maxDailyLossUsd: 50 } },
    });
    if (first.kind !== 'proposal' || second.kind !== 'proposal') throw new Error('expected both');

    const targets = [...h.confirmations.tokens.values()].map((t) => t.target);
    expect(new Set(targets).size, 'two changes, two authorisations').toBe(2);
    // Both name the same agent. Before this change that made them interchangeable.
    for (const target of targets) expect(target).toMatch(/^agent:a1#/);
  });

  it('binds the intent, not the twenty fields that reach the wire', async () => {
    /**
     * `UpdateAgentCommand` merges onto the agent's current config and sends all
     * twenty fields, because a partial `tradingConfig` does not error on
     * BattleGrid — it resets what it omits. The proposal described the one field
     * the user typed.
     *
     * So the digest cannot be over the payload. This asserts the two disagree in
     * size and the binding still holds, which is the whole of DL-6.
     */
    const h = harness();
    const { result, spent } = await proposeThenApply(
      h,
      { tradingConfig: { maxDailyLossUsd: 40 } },
      { changes: {}, tradingConfigChanges: { maxDailyLossUsd: 40 } },
    );

    expect(result.kind).toBe('updated');
    expect(spent, 'one typed field agreed to, twenty sent').not.toBeNull();
    const sent = h.port.agents.get('a1')?.tradingConfig?.fields ?? {};
    expect(Object.keys(sent).length, 'the wire carries the whole config').toBeGreaterThan(1);
    expect(sent['maxDailyLossUsd']).toBe(40);
  });

  it('spends the token once, so a replay finds nothing', async () => {
    const h = harness();
    const { spent, boundTo } = await proposeThenApply(
      h,
      { displayName: 'Vol II' },
      { changes: { displayName: 'Vol II' } },
    );
    expect(spent).not.toBeNull();
    const again = await h.confirmations.consume(
      spent?.token ?? '',
      who.userId,
      'update_intelligence_agent',
      boundTo ?? '',
    );
    expect(again, 'single use survives the binding change').toBeNull();
  });
});

/**
 * Both requests form the same intent from the same input.
 *
 * The edit is two requests reading two different sources: the review reads a
 * query string, the apply reads a `FormData` with `tc.`-prefixed money fields.
 * Each had its own coercion — the review kept `"25"`, the apply produced `25` —
 * and while nothing compared them that was invisible.
 *
 * Binding the confirmation to the values makes it fatal: `"25"` and `25` digest
 * differently, so **every honest edit would be refused**, and the obvious fix
 * would be to loosen the binding. See DL-5.
 *
 * This block exists because re-injecting the split coercion did **not** fail the
 * tests above: they build the two intents directly and never go through the
 * page's readers, so they cannot see a divergence. The property needed its own
 * check, which is the difference between a fix and a guarded fix.
 */
describe('the two requests agree on what was submitted', () => {
  const FIELDS = { name: ['displayName'], money: [...MONEY_FIELDS] } as const;

  /** The review's source: a query string, bare field names. */
  const fromQuery = (q: Record<string, string>) =>
    editIntent({ get: (name) => q[name] ?? null }, FIELDS);

  /** The apply's source: a form, money fields under `tc.`. */
  const fromForm = (q: Record<string, string>) => {
    const form = new FormData();
    for (const [k, v] of Object.entries(q)) {
      form.set((MONEY_FIELDS as readonly string[]).includes(k) ? `tc.${k}` : k, v);
    }
    return editIntent(
      {
        get: (name) => {
          const value = form.get(
            (MONEY_FIELDS as readonly string[]).includes(name) ? `tc.${name}` : name,
          );
          return typeof value === 'string' ? value : null;
        },
      },
      FIELDS,
    );
  };

  it('produces the same intent from a query string and a form', () => {
    const typed = { displayName: 'Vol II', maxDailyLossUsd: '25', minAllocationUsd: '10' };
    expect(fromForm(typed)).toEqual(fromQuery(typed));
  });

  it('digests the same, which is what the confirmation is bound to', () => {
    const typed = { maxDailyLossUsd: '25' };
    // Asserted through `digestOf` rather than by deep equality alone: the digest
    // is the thing that has to match, and `"25"` vs `25` is deep-unequal *and*
    // digest-unequal. Both statements have to hold.
    expect(digestOf(fromForm(typed))).toBe(digestOf(fromQuery(typed)));
  });

  it('makes money a number, so what was agreed is what the platform accepts', () => {
    const intent = fromQuery({ maxDailyLossUsd: '25' });
    expect(intent).toEqual({ tradingConfig: { maxDailyLossUsd: 25 } });
  });

  it('keeps a value the platform will reject as what was typed', () => {
    // `NaN` would be a fabrication, and the platform should refuse the user's
    // actual input rather than a number we invented from it.
    expect(fromQuery({ maxDailyLossUsd: 'lots' })).toEqual({
      tradingConfig: { maxDailyLossUsd: 'lots' },
    });
  });

  it('omits tradingConfig entirely when no money field was touched', () => {
    // Absent and empty are different intents, and the digest must tell them
    // apart: `{}` under `tradingConfig` would describe a configuration change
    // that changes nothing.
    expect(fromQuery({ displayName: 'Vol II' })).toEqual({ displayName: 'Vol II' });
  });

  it('leaves the page with one reader, not two', () => {
    /**
     * The agreement above is guaranteed by construction — one function, called
     * twice — and that is stronger than any assertion about its output. What can
     * still regress is someone adding a *second* reader, at which point the two
     * can drift again and only a live edit would show it.
     *
     * So this is the property stated directly: the edit page coerces money
     * through `editIntent` and nowhere else. It had a `pick` for the query and a
     * `numberish` for the form; both are gone, and their absence is the check.
     */
    const page = readFileSync('app/(app)/agents/[id]/edit/page.tsx', 'utf8');
    expect(page.match(/editIntent\(/g) ?? [], 'both requests, one reader').toHaveLength(2);
    expect(page, 'the form-side coercion is gone').not.toMatch(/function numberish/);
    expect(page, 'the query-side filter is gone').not.toMatch(/function pick/);
    expect(page, 'Number\\(\\) on a money field would be a second coercion').not.toMatch(
      /Number\(/,
    );
  });

  it('digests differently for different amounts', () => {
    // The whole point, stated at the level the binding uses.
    expect(digestOf(fromQuery({ maxDailyLossUsd: '25' }))).not.toBe(
      digestOf(fromQuery({ maxDailyLossUsd: '25000' })),
    );
  });
});
