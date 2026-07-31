import { beforeEach, describe, expect, it } from 'vitest';
import { beginGuardedCall, toDomainError } from '@/infrastructure/battlegrid/call-path.js';
import { classifyTool } from '@/domain/capability/classify.js';
import { CONFIRMATION_TTL_SECONDS } from '@/domain/capability/confirmation.js';
import type { ToolClass } from '@/domain/capability/tool-class.js';
import {
  ConfirmationRequiredError,
  DiscoveryUnavailableError,
  RevisionConflictError,
  ScopeUnavailableError,
} from '@/domain/errors.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';

const READ: ToolClass = { mutating: false, destructive: false, requiredScope: 'mcp:read', basis: 'annotations' };
const WRITE: ToolClass = { mutating: true, destructive: false, requiredScope: 'mcp:read', basis: 'annotations' };
const DESTRUCTIVE: ToolClass = { mutating: true, destructive: true, requiredScope: 'mcp:read', basis: 'annotations' };
const WAGER: ToolClass = { mutating: true, destructive: false, requiredScope: 'mcp:wager', basis: 'annotations' };

describe('beginGuardedCall', () => {
  let clock: FakeClock;
  let audit: FakeAuditStore;
  let confirmations: FakeConfirmationStore;

  beforeEach(() => {
    clock = new FakeClock();
    audit = new FakeAuditStore(clock);
    confirmations = new FakeConfirmationStore(clock);
  });

  const deps = (scopes: readonly ('mcp:read' | 'mcp:wager')[] = ['mcp:read']) => ({
    audit,
    confirmations,
    heldScopes: scopes,
  });

  it('lets a plain read through and records it', async () => {
    const id = await beginGuardedCall(deps(), {
      userId: 'u1',
      tool: 'get_account_state',
      classification: READ,
    });
    expect(id).toBeTruthy();
    expect(audit.entries[0]?.outcome).toBe('attempted');
  });

  /** R3 — refused before it is attempted. */
  describe('refuses_before_attempting', () => {
    it('refuses a tool needing authority we do not hold', async () => {
      await expect(
        beginGuardedCall(deps(['mcp:read']), {
          userId: 'u1',
          tool: 'submit_market_grid',
          classification: WAGER,
        }),
      ).rejects.toBeInstanceOf(ScopeUnavailableError);
    });

    it('writes no audit row for a refusal, because nothing was attempted', async () => {
      await expect(
        beginGuardedCall(deps(['mcp:read']), {
          userId: 'u1',
          tool: 'submit_market_grid',
          classification: WAGER,
        }),
      ).rejects.toThrow();
      expect(audit.entries).toHaveLength(0);
    });

    it('names the authority that would be needed', async () => {
      const err = await beginGuardedCall(deps(['mcp:read']), {
        userId: 'u1',
        tool: 'submit_market_grid',
        classification: WAGER,
      }).catch((e: unknown) => e);
      expect((err as ScopeUnavailableError).requiredScope).toBe('mcp:wager');
    });
  });

  /** R6 — an unclassifiable tool must not be performed. */
  it('refuses a tool it could not classify', async () => {
    await expect(
      beginGuardedCall(deps(), {
        userId: 'u1',
        tool: 'something_new',
        classification: classifyTool(undefined),
      }),
    ).rejects.toBeInstanceOf(DiscoveryUnavailableError);
  });

  it('refuses a mutating tool while discovery is degraded', async () => {
    await expect(
      beginGuardedCall(deps(), {
        userId: 'u1',
        tool: 'create_intelligence_agent',
        classification: { ...WRITE, basis: 'degraded-allowlist' },
      }),
    ).rejects.toBeInstanceOf(DiscoveryUnavailableError);
  });

  /** R7 — confirmation naming the consequence. */
  describe('requires_token_naming_consequence', () => {
    it('refuses a destructive operation with no confirmation', async () => {
      await expect(
        beginGuardedCall(deps(), {
          userId: 'u1',
          tool: 'rebind_intelligence_agent',
          classification: DESTRUCTIVE,
          target: 'agent-1',
        }),
      ).rejects.toBeInstanceOf(ConfirmationRequiredError);
    });

    it('names which way a confirmation failed — each cause has a different next step', async () => {
      const issue = (over: Partial<Parameters<typeof confirmations.issue>[0]> = {}) =>
        confirmations.issue({
          token: 't-cause',
          userId: 'u1',
          tool: 'archive_strategy',
          target: 's-1',
          consequence: 'Archives it.',
          expiresAt: new Date(clock.now().getTime() + 300_000),
          consumedAt: null,
          ...over,
        });
      const attempt = () =>
        beginGuardedCall(deps(), {
          userId: 'u1',
          tool: 'archive_strategy',
          classification: DESTRUCTIVE,
          target: 's-1',
          confirmationToken: 't-cause',
        }).then(() => null).catch((e: unknown) => e as Error);

      // Expired: nothing is wrong; review again.
      await issue({ expiresAt: new Date(clock.now().getTime() - 1) });
      expect(((await attempt()) as Error).message).toContain('expired');

      // Already used: the change may have landed.
      await issue({ consumedAt: clock.now() });
      expect(((await attempt()) as Error).message).toContain('already used');

      // Mismatched: the values changed since the consequence was read.
      await issue({ target: 's-other' });
      expect(((await attempt()) as Error).message).toContain('not what was agreed to');

      // Unknown: something is broken, not stale.
      confirmations.tokens.clear();
      expect(((await attempt()) as Error).message).toContain('not recognised');
    });

    it('distinguishes "none supplied" from "invalid", so the user can act on it', async () => {
      // The first guard is also enforced by the type checker — the mutation
      // that removes it does not compile. This pins the behaviour anyway,
      // because the two cases need different messages.
      const none = await beginGuardedCall(deps(), {
        userId: 'u1',
        tool: 'archive_strategy',
        classification: DESTRUCTIVE,
        target: 's-1',
      }).then(() => null).catch((e: unknown) => e as Error);
      expect((none as Error).message).toContain('no confirmation was supplied');

      const bad = await beginGuardedCall(deps(), {
        userId: 'u1',
        tool: 'archive_strategy',
        classification: DESTRUCTIVE,
        target: 's-1',
        confirmationToken: 'not-a-real-token',
      }).then(() => null).catch((e: unknown) => e as Error);
      expect((bad as Error).message).toContain('not recognised');
    });

    it('accepts a valid confirmation bound to that operation and target', async () => {
      await confirmations.issue({
        token: 'tok-1',
        userId: 'u1',
        tool: 'rebind_intelligence_agent',
        target: 'agent-1',
        consequence: 'Replaces the agent’s context sources, signal rules, prose and timeframe.',
        expiresAt: new Date(clock.now().getTime() + CONFIRMATION_TTL_SECONDS * 1000),
        consumedAt: null,
      });
      const id = await beginGuardedCall(deps(), {
        userId: 'u1',
        tool: 'rebind_intelligence_agent',
        classification: DESTRUCTIVE,
        confirmationToken: 'tok-1',
        target: 'agent-1',
      });
      expect(id).toBeTruthy();
      expect(audit.entries[0]?.destructive).toBe(true);
    });

    it('refuses a confirmation issued for a different target', async () => {
      await confirmations.issue({
        token: 'tok-1',
        userId: 'u1',
        tool: 'rebind_intelligence_agent',
        target: 'agent-1',
        consequence: 'x',
        expiresAt: new Date(clock.now().getTime() + 60_000),
        consumedAt: null,
      });
      await expect(
        beginGuardedCall(deps(), {
          userId: 'u1',
          tool: 'rebind_intelligence_agent',
          classification: DESTRUCTIVE,
          confirmationToken: 'tok-1',
          target: 'agent-2', // a different agent
        }),
      ).rejects.toBeInstanceOf(ConfirmationRequiredError);
    });

    it('refuses a confirmation issued for a different tool', async () => {
      await confirmations.issue({
        token: 'tok-1',
        userId: 'u1',
        tool: 'archive_strategy',
        target: 'agent-1',
        consequence: 'x',
        expiresAt: new Date(clock.now().getTime() + 60_000),
        consumedAt: null,
      });
      await expect(
        beginGuardedCall(deps(), {
          userId: 'u1',
          tool: 'rebind_intelligence_agent',
          classification: DESTRUCTIVE,
          confirmationToken: 'tok-1',
          target: 'agent-1',
        }),
      ).rejects.toBeInstanceOf(ConfirmationRequiredError);
    });

    it('refuses a replayed confirmation', async () => {
      await confirmations.issue({
        token: 'tok-1',
        userId: 'u1',
        tool: 'rebind_intelligence_agent',
        target: 'agent-1',
        consequence: 'x',
        expiresAt: new Date(clock.now().getTime() + 60_000),
        consumedAt: null,
      });
      const call = {
        userId: 'u1',
        tool: 'rebind_intelligence_agent',
        classification: DESTRUCTIVE,
        confirmationToken: 'tok-1',
        target: 'agent-1',
      } as const;
      await beginGuardedCall(deps(), call);
      await expect(beginGuardedCall(deps(), call)).rejects.toBeInstanceOf(ConfirmationRequiredError);
    });

    it('refuses an expired confirmation', async () => {
      await confirmations.issue({
        token: 'tok-1',
        userId: 'u1',
        tool: 'rebind_intelligence_agent',
        target: 'agent-1',
        consequence: 'x',
        expiresAt: new Date(clock.now().getTime() + 1_000),
        consumedAt: null,
      });
      clock.advance(2_000);
      await expect(
        beginGuardedCall(deps(), {
          userId: 'u1',
          tool: 'rebind_intelligence_agent',
          classification: DESTRUCTIVE,
          confirmationToken: 'tok-1',
          target: 'agent-1',
        }),
      ).rejects.toBeInstanceOf(ConfirmationRequiredError);
    });
  });

  /** R7 second scenario — nothing changes when confirmation is withheld. */
  it('nothing_changes when confirmation is withheld', async () => {
    await expect(
      beginGuardedCall(deps(), {
        userId: 'u1',
        tool: 'archive_strategy',
        classification: DESTRUCTIVE,
        target: 's-1',
      }),
    ).rejects.toThrow();
    expect(audit.entries).toHaveLength(0);
    expect(confirmations.tokens.size).toBe(0);
  });

  /** The order matters: classification decides, not scope. */
  it('classifies before checking scope, so scope is never the safety decision', async () => {
    // Holding wager scope must not make an unclassifiable tool callable.
    await expect(
      beginGuardedCall(deps(['mcp:read', 'mcp:wager']), {
        userId: 'u1',
        tool: 'mystery',
        classification: classifyTool(undefined),
      }),
    ).rejects.toBeInstanceOf(DiscoveryUnavailableError);
  });
});

describe('toDomainError', () => {
  /** R9 — a conflict is surfaced as itself, and carries no retry. */
  it('recognises a revision conflict', () => {
    const err = toDomainError(new Error('expectedRevision mismatch'), 'strategy', 3);
    expect(err).toBeInstanceOf(RevisionConflictError);
    expect((err as RevisionConflictError).expectedRevision).toBe(3);
  });

  it('tells the user their change was not applied', () => {
    const err = toDomainError(new Error('revision drift detected'), 'agent', 7);
    expect(err.message).toContain('not applied');
  });

  it('passes an unrelated error through unchanged', () => {
    const original = new Error('network unreachable');
    expect(toDomainError(original, 'agent')).toBe(original);
  });
});
