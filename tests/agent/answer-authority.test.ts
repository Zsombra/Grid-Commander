import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { AnswerDecisionCommand } from '@/application/use-cases/answer-decision.command.js';
import { ReadAnswerAuthorityQuery } from '@/application/use-cases/read-answer-authority.query.js';
import { levelsOf } from '@/domain/agent/pending-decision.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import { REQUESTED_SCOPES, STEP_UP_SCOPES } from '@/domain/connection/scope.js';
import { ScopeUnavailableError } from '@/domain/errors.js';
import { beginGuardedCall } from '@/infrastructure/battlegrid/call-path.js';
import type { EntryDecision } from '@/ports/agents.js';
import { anEntryDecision, FakeAgentsPort } from '../support/agent-fakes.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';

/**
 * Authority to answer a proposed trade: who may ask for it, when, and what
 * happens to an answer attempted without it.
 *
 * Change tasks 2.2, 2.3, 4.2, 4.6 and 7.1.
 */

const DECISION_ID = '6c11b3dc-28ea-4648-ab83-b4d5f14522e1';

const pending = (over: Parameters<typeof anEntryDecision>[0] = {}): EntryDecision =>
  anEntryDecision({
    id: DECISION_ID,
    status: 'PENDING',
    closedAt: null,
    entryPrice: 57.176,
    stopLoss: 57.73495777,
    takeProfit: 55.5,
    ...over,
  });

const SHOWN = levelsOf(pending());

const answering = (decision: EntryDecision | null) => {
  const agents = new FakeAgentsPort();
  agents.entryDecisions =
    decision === null ? { kind: 'none' } : { kind: 'entries', entries: [decision], total: 1 };
  return { agents, command: new AnswerDecisionCommand(agents) };
};

const req = (verb: 'accept' | 'cancel') => ({
  userId: 'u1',
  accessToken: 't1',
  agentId: 'a1',
  decisionId: DECISION_ID,
  verb,
  shown: SHOWN,
  confirmationToken: 'tok-1',
});

// -- 2.2 / 2.3 — the step-up, and who is allowed to begin one ---------------

describe('the standing posture is unchanged by the step-up existing', () => {
  it('still requests read scope alone at connect', () => {
    expect(REQUESTED_SCOPES).toEqual(['mcp:read']);
  });

  /**
   * The step-up carries the standing scope forward rather than replacing it.
   *
   * A grant replaces what the connection holds, so asking for wager alone would
   * trade away the authority every other surface in the product runs on — an
   * operator who granted it would find their agents unreadable.
   */
  it('asks for wager alongside read, never instead of it', () => {
    expect(STEP_UP_SCOPES).toContain('mcp:read');
    expect(STEP_UP_SCOPES).toContain('mcp:wager');
  });
});

describe('nothing but an operator at the point of use begins a step-up', () => {
  const files = (dir: string): string[] => {
    let out: string[] = [];
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) out = out.concat(files(full));
      else if (full.endsWith('.ts') || full.endsWith('.tsx')) out.push(full.replace(/\\/g, '/'));
    }
    return out;
  };

  const askers = [...files('src'), ...files('app')].filter((file) =>
    /stepUp:\s*true/.test(readFileSync(file, 'utf8')),
  );

  /**
   * **Task 2.3.** The widening happens in exactly one file, and that file is a
   * server action reached by submitting a form on the authority page.
   *
   * This is the structural half of "the product SHALL NOT begin a step-up on
   * its own initiative, on a schedule, in response to a model, or as a side
   * effect of reading anything". A second caller anywhere — a query, the MCP
   * server, a scheduled capture — would fail this, which is the point: the
   * requirement is about *who can ask*, and the only way to keep that true is to
   * count the askers.
   */
  it('has exactly one caller that asks for fund-committing authority', () => {
    expect(askers).toEqual(['app/(app)/approvals/authority/actions.ts']);
  });

  it('does not ask for it from any read, any recorder, or the MCP server', () => {
    const forbidden = askers.filter(
      (file) => file.includes('/query') || file.includes('/mcp/') || file.includes('capture'),
    );
    expect(forbidden, 'a step-up begun by anything but a person is not a step-up').toEqual([]);
  });

  /**
   * The default is what a caller gets by saying nothing.
   *
   * `execute()` with no argument must not widen. If the flag ever inverted, the
   * connect page — which passes nothing — would start requesting authority to
   * spend, and every user of the product would be asked for it.
   */
  it('leaves the connect flow asking for nothing extra', () => {
    const source = readFileSync('src/application/use-cases/connect.commands.ts', 'utf8');
    expect(source).toMatch(/req\.stepUp === true \? STEP_UP_SCOPES : REQUESTED_SCOPES/);
  });
});

describe('what the surface may say about the authority it holds', () => {
  it('reports authority as held when the connection carries wager scope', async () => {
    const query = new ReadAnswerAuthorityQuery(new DeclaredScopes(['mcp:read', 'mcp:wager']));
    expect(await query.execute({ userId: 'u1' })).toEqual({ kind: 'held' });
  });

  it('reports it absent on a read-only connection, and names what it would permit', async () => {
    const query = new ReadAnswerAuthorityQuery(new DeclaredScopes(['mcp:read']));
    const result = await query.execute({ userId: 'u1' });

    expect(result.kind).toBe('absent');
    // The words the operator is shown come from one place, so the two surfaces
    // that render them cannot drift apart.
    expect(result.kind === 'absent' && result.permits.join(' ')).toMatch(/opens a position with your money/);
    expect(result.kind === 'absent' && result.permits.join(' ')).toMatch(/commits nothing/);
  });

  /**
   * No connection is not "any authority". An absent or unusable connection
   * yields no scopes at all, and the honest reading of that is absent.
   */
  it('reports it absent when the connection holds nothing at all', async () => {
    const query = new ReadAnswerAuthorityQuery(new DeclaredScopes([]));
    expect((await query.execute({ userId: 'u1' })).kind).toBe('absent');
  });
});

// -- 4.2 — an answer without the authority is refused before any call --------

describe('an answer attempted without fund-committing authority', () => {
  const guard = () => {
    const clock = new FakeClock();
    const audit = new FakeAuditStore(clock);
    return {
      audit,
      deps: {
        audit,
        confirmations: new FakeConfirmationStore(clock),
        heldScopes: ['mcp:read' as const],
      },
    };
  };

  const answerCall = (tool: string) => ({
    userId: 'u1',
    tool,
    classification: {
      mutating: true,
      destructive: true,
      requiredScope: 'mcp:wager' as const,
      basis: 'annotations' as const,
    },
  });

  /**
   * **Task 4.2.** Both verbs, because both require the authority — cancelling
   * commits nothing and BattleGrid still demands wager scope for it, which is
   * exactly why scope can never be read as a safety boundary (P1).
   */
  it.each(['accept_entry_decision', 'cancel_entry_decision'])(
    'refuses %s before it is attempted',
    async (tool) => {
      const { deps } = guard();
      await expect(beginGuardedCall(deps, answerCall(tool))).rejects.toBeInstanceOf(
        ScopeUnavailableError,
      );
    },
  );

  it('names the authority that was missing', async () => {
    const { deps } = guard();
    const err: unknown = await beginGuardedCall(deps, answerCall('cancel_entry_decision')).catch(
      (e: unknown) => e,
    );
    expect((err as Error).message).toContain('mcp:wager');
  });

  /**
   * A refusal is not an attempt, and the audit answers "what did this product do
   * to your account". For a refusal the honest answer is "nothing" — recording
   * it as attempted would make the log's central claim false.
   */
  it('records no attempt for the refused answer', async () => {
    const { audit, deps } = guard();
    await beginGuardedCall(deps, answerCall('cancel_entry_decision')).catch(() => undefined);
    expect(audit.entries).toEqual([]);
  });
});

// -- 4.6 / 7.1 — the ack is not an outcome, and expiry is reported as expiry --

describe('what the product may claim after answering', () => {
  /**
   * **Task 4.6.** The platform's answer is two keys — the decision id and a
   * boolean — with no status, no timestamp and no echo of what changed. The
   * observed cancel of 2026-08-15 returned `{decisionId, cancelled: true}` and
   * nothing else.
   *
   * So the port returns `void` and the result carries only what this product
   * already knew before it called. A UI cannot render an outcome from that and
   * must re-read; anything richer here would invite someone to trust an ack.
   */
  it('carries no platform payload on a performed answer', async () => {
    const { command } = answering(pending());

    const result = await command.execute(req('cancel'));

    expect(result.kind).toBe('answered');
    expect(Object.keys(result)).toEqual(['kind', 'verb', 'decisionId']);
  });

  it('returns nothing from the port itself, so no ack can be rendered', async () => {
    const agents = new FakeAgentsPort();
    const returned = await agents.answerEntryDecision({
      decisionId: DECISION_ID,
      verb: 'cancel',
      confirmation: { token: 'tok-1', target: 'ignored' },
    });
    expect(returned).toBeUndefined();
  });
});

describe('a decision that closed between being shown and being answered', () => {
  /**
   * **Task 7.1**, both paths. Expiry is reported as expiry — never as a cancel
   * the operator performed, and never as an accept that opened a position.
   *
   * Liveness is checked before the levels, so an expired decision whose prices
   * happen to be unchanged still refuses as expired rather than as unchanged.
   */
  it.each(['accept', 'cancel'] as const)('refuses a %s on an expired decision', async (verb) => {
    const { command } = answering(
      pending({ status: 'EXPIRED', closedAt: '2026-08-15T13:33:10.729Z' }),
    );

    const result = await command.execute(req(verb));

    expect(result.kind).toBe('refused');
    expect(result.kind === 'refused' && result.refusal.kind).toBe('not-answerable');
    expect(
      result.kind === 'refused' && result.refusal.kind === 'not-answerable' && result.refusal.status,
    ).toBe('EXPIRED');
  });

  it.each(['accept', 'cancel'] as const)('sends nothing to the platform on a %s', async (verb) => {
    const { agents, command } = answering(
      pending({ status: 'EXPIRED', closedAt: '2026-08-15T13:33:10.729Z' }),
    );

    await command.execute(req(verb));

    expect(agents.calls, 'a refused answer never reached BattleGrid').toEqual([]);
  });

  /**
   * `closedAt` alone is not a liveness test. It stays null on an EXECUTED
   * decision — observed 2026-08-15 — so a `closedAt`-only check would treat a
   * live position's decision as answerable and offer to cancel a trade that is
   * already open.
   */
  it('refuses an executed decision even though it was never closed', async () => {
    const { command } = answering(pending({ status: 'EXECUTED', closedAt: null }));

    const result = await command.execute(req('cancel'));

    expect(result.kind).toBe('refused');
    expect(result.kind === 'refused' && result.refusal.kind).toBe('not-answerable');
  });
});

// -- 7.3 — what the audit says about a refused answer ----------------------

describe('a refused answer, and what the audit may claim about it', () => {
  /**
   * **Task 7.3, and the correction that came with it.**
   *
   * The change's delta spec originally obliged the product to audit *every*
   * refusal "with its reason". DL-9 overturned that during execution and the
   * spec now carries the distinction, because the codebase already had a tested
   * position and it was the right one:
   *
   * - an answer **attempted** and rejected by BattleGrid is audited as a failed
   *   attempt — something was done to the account and it did not work;
   * - an answer **refused before the attempt**, by the binding or by the
   *   authority guard, is audited nowhere — nothing left this process, and a
   *   row saying otherwise would make the log's central claim false.
   *
   * The reason still reaches the operator. It reaches them on the surface,
   * which is where a person can act on it, rather than in a log they would have
   * to go looking for.
   */
  it('writes no audit row when the binding refuses, and sends nothing', async () => {
    const { agents, command } = answering(pending({ entryPrice: 99.9 }));

    const result = await command.execute(req('cancel'));

    expect(result.kind).toBe('refused');
    expect(result.kind === 'refused' && result.refusal.kind).toBe('levels-moved');
    // The port is never reached, so there is nothing for an audit to record.
    expect(agents.calls).toEqual([]);
  });

  it('names which level moved, and from what to what', async () => {
    const { command } = answering(pending({ stopLoss: 60 }));

    const result = await command.execute(req('cancel'));

    const moved =
      result.kind === 'refused' && result.refusal.kind === 'levels-moved' ? result.refusal.moved : [];
    expect(moved).toEqual([{ field: 'stopLoss', shown: 57.73495777, now: 60 }]);
  });

  /**
   * A decision that cannot be read at all refuses the same way, and for the
   * same reason: in that state the product cannot say what it would be
   * answering, and the only safe act is to send nothing.
   */
  it('refuses and sends nothing when the decision cannot be found', async () => {
    const { agents, command } = answering(null);

    const result = await command.execute(req('cancel'));

    expect(result.kind === 'refused' && result.refusal.kind).toBe('gone');
    expect(agents.calls).toEqual([]);
  });

  /**
   * The other half: an attempt that reached the platform and failed is not
   * swallowed. The command lets it throw rather than returning a refusal,
   * because a failed attempt and a refused one are different events and the
   * audit row for the attempt has already been written by the guard.
   */
  it('does not disguise a platform failure as a binding refusal', async () => {
    const { agents, command } = answering(pending());
    agents.answerFails = new Error('BattleGrid refused the answer');

    await expect(command.execute(req('cancel'))).rejects.toThrow('BattleGrid refused the answer');
    // It was attempted — the call reached the port, which is what the audit records.
    expect(agents.calls).toHaveLength(1);
  });
});
