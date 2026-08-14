import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DescribeEditQuery } from '@/application/use-cases/describe-edit.query.js';
import { UpdateAgentCommand } from '@/application/use-cases/update-agent.command.js';
import {
  anAgent,
  FakeAgentsPort,
  liveTradingConfig,
  SequentialRandom,
} from '../support/agent-fakes.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';
import { beginGuardedCall } from '@/infrastructure/battlegrid/call-path.js';
import { ConfirmationRequiredError } from '@/domain/errors.js';
import { digestOf } from '@/domain/capability/digest.js';
import { editArguments, editIntent, MONEY_FIELDS } from '@/presentation/form.js';
import { slashed } from '../support/source-tree.js';

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

  it('builds no request at all when the amount was altered', async () => {
    /**
     * The scenario's second clause, joined up.
     *
     * The test above proves the token cannot be spent — which is the *precondition*
     * for the refusal, not the refusal. `FakeAgentsPort` does not run `enforce()`,
     * so in that test the fake agent is happily modified. Two facts were each
     * tested and never composed: that differing values produce differing targets
     * (above), and that `enforce()` refuses a differing target (`call-path.test.ts`).
     *
     * This drives the guard with the target the write actually bound, so the
     * refusal is demonstrated rather than inferred. `enforce()` consumes at step 3,
     * before the audit entry at step 4 and before any HTTP — so a refusal here is
     * "no request was built", not "the request failed".
     */
    const h = harness();
    const proposal = await h.propose.execute({
      ...who,
      agentId: 'a1',
      changes: { tradingConfig: { maxDailyLossUsd: 25 } },
    });
    if (proposal.kind !== 'proposal') throw new Error('expected a proposal');

    await h.apply.execute({
      ...who,
      agentId: 'a1',
      changes: {},
      tradingConfigChanges: { maxDailyLossUsd: 25000 },
      confirmationToken: proposal.proposal.confirmationToken,
    });
    const boundTo = h.port.calls.find((c) => c.op === 'update')?.target as string;

    const audit = new FakeAuditStore(new FakeClock());
    await expect(
      beginGuardedCall(
        {
          audit,
          confirmations: h.confirmations,
          heldScopes: ['mcp:read'],
        },
        {
          userId: who.userId,
          tool: 'update_intelligence_agent',
          classification: {
            mutating: true,
            destructive: true,
            requiredScope: 'mcp:read',
            basis: 'annotations',
          },
          confirmationToken: proposal.proposal.confirmationToken,
          target: boundTo,
        },
      ),
      'the guard must refuse the altered submission',
    ).rejects.toBeInstanceOf(ConfirmationRequiredError);

    // And nothing was recorded as attempted, because the refusal precedes the
    // audit entry. A recorded attempt would mean a request had been built.
    expect(audit.entries, 'refused before anything was attempted').toEqual([]);
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
    // One reader per request, and the requests live in two modules now: the
    // review branch on the page, the apply in the colocated actions.ts
    // (`the-build-checks-what-next-generates`).
    const page = readFileSync('app/(app)/agents/[id]/edit/page.tsx', 'utf8');
    const action = readFileSync('app/(app)/agents/[id]/edit/actions.ts', 'utf8');
    expect(page.match(/editIntent\(/g) ?? [], 'the review request, one reader').toHaveLength(1);
    expect(action.match(/editIntent\(/g) ?? [], 'the apply request, one reader').toHaveLength(1);
    for (const [where, source] of [['page', page], ['action', action]] as const) {
      expect(source, `the form-side coercion is gone (${where})`).not.toMatch(/function numberish/);
      expect(source, `the query-side filter is gone (${where})`).not.toMatch(/function pick/);
      expect(source, `Number() on a money field would be a second coercion (${where})`).not.toMatch(
        /Number\(/,
      );
    }
  });

  it('digests differently for different amounts', () => {
    // The whole point, stated at the level the binding uses.
    expect(digestOf(fromQuery({ maxDailyLossUsd: '25' }))).not.toBe(
      digestOf(fromQuery({ maxDailyLossUsd: '25000' })),
    );
  });
});

/**
 * The one pair that is walked against a real account, driven here instead.
 *
 * `tests/live/write-probe.test.ts` is the only place `update_intelligence_agent`
 * is exercised against the live platform carrying a trading-config change, and
 * it described an empty `tradingConfig` while submitting `maxDailyTrades: 7`.
 * Two intents, two digests, and a token the apply could not spend — so the write
 * was refused by this product's own guard before a request was built, and the
 * step could never reach `updated`. The guard was right; the pair was wrong. It
 * predates the narrowing of the target from the bare agent id to a digest of the
 * intent, and nothing ran the probe afterwards to notice.
 *
 * That is the reason this block exists at all rather than the fix being left to
 * a live run. A probe that may only be run deliberately, against somebody's real
 * BattleGrid account, is not evidence of anything on the days nobody runs it —
 * so the pair it walks is pinned where the whole suite can see it.
 */
describe("the live write probe's trading-limit pair", () => {
  /** Exactly what the probe describes, and — after the split — what it submits. */
  const LIMIT_INTENT = { tradingConfig: { maxDailyTrades: 7 } } as const;

  it('mints a confirmation its own submission can spend', async () => {
    const h = harness();
    // Split by the product's own function, which is what the probe now calls.
    // Composing the two halves here would prove something about this test.
    const { changes, tradingConfigChanges } = editArguments(LIMIT_INTENT);
    const { result, spent } = await proposeThenApply(h, LIMIT_INTENT, {
      changes: { ...changes },
      ...(tradingConfigChanges ? { tradingConfigChanges: { ...tradingConfigChanges } } : {}),
    });

    expect(result.kind, 'the probe cannot assert "updated" on a write the guard refuses').toBe(
      'updated',
    );
    expect(spent, 'the describe and the apply must form the same target').not.toBeNull();

    // And the merge the probe asserts on afterwards: the one field it named,
    // with the money caps it never mentioned still standing.
    const sent = h.port.agents.get('a1')?.tradingConfig?.fields ?? {};
    expect(sent['maxDailyTrades']).toBe(7);
    expect(sent['maxDailyLossUsd'], 'a limit edit must not clear the caps').toBe(300);
    expect(sent['tradingMode'], 'nor re-enable trading').toBe('OFF');
  });

  it('was refused while the describe and the apply disagreed', async () => {
    /**
     * The defect, run deliberately, so the test above is not merely asserting
     * that a fake agrees with itself. An empty `tradingConfig` is a different
     * intent from one carrying a value — `editIntent` keeps absent and empty
     * apart on purpose, and the digest keeps them apart too.
     */
    const h = harness();
    const { spent, boundTo } = await proposeThenApply(
      h,
      { tradingConfig: {} },
      { changes: {}, tradingConfigChanges: { maxDailyTrades: 7 } },
    );

    expect(spent, 'a token for "some config change" must not authorise this one').toBeNull();
    expect(boundTo, 'the write bound the value it was about to send').toMatch(/^agent:a1#/);
  });

  it('composes both halves from one intent, through the shared split', () => {
    /**
     * The pair above is the probe's pair only while the probe forms it that
     * way. What regresses is not the binding — it is a second literal written
     * beside the first, at a different moment, which is precisely what was
     * there. So the property is stated against the source directly.
     *
     * Comments are stripped first: this file and that one both describe the
     * defect on purpose, and only code can reintroduce it. Same treatment, and
     * the same reason, as `live-writes.test.ts`.
     */
    const code = readFileSync('tests/live/write-probe.test.ts', 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

    expect(code, 'the probe splits its intent the way the product does').toContain(
      'editArguments(',
    );
    expect(
      code,
      'an empty tradingConfig describes a change the probe does not apply',
    ).not.toMatch(/tradingConfig:\s*\{\s*\}/);
  });
});

describe('no caller composes a target inline', () => {
  /**
   * The guard `confirmation.ts` has claimed since the binding landed, written
   * down at last. `agentEdit` cannot be called without the intent — that is
   * what makes the binding load-bearing — but only while every target goes
   * through the builders. A caller composing `agent:${id}#${digest}` by hand
   * re-opens the seam: it can compose the string from values the person never
   * saw, and the compiler has no opinion about string contents.
   */
  const TARGET_SHAPES = [/agent:\$\{/, /->strategy:\$\{/, /strategy:\$\{[^}]*\}#\$\{/];

  function tsFilesUnder(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return tsFilesUnder(path);
      return entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') ? [slashed(path)] : [];
    });
  }

  it('every target-shaped template literal lives in the builder file', () => {
    const composers = tsFilesUnder('src').filter((file) => {
      const source = readFileSync(file, 'utf8');
      return TARGET_SHAPES.some((shape) => shape.test(source));
    });
    expect(
      composers,
      'targets are built with confirmationTarget, never composed at a call site',
    ).toEqual(['src/domain/capability/confirmation.ts']);
    // The builder itself must register — an empty match list would mean the
    // shapes drifted and this scan went blind, not that the code got cleaner.
  });
});
