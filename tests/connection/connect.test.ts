import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CompleteConnectionCommand,
  DisconnectCommand,
  StartConnectionCommand,
  type Randomness,
  type TokenSource,
} from '@/application/use-cases/connect.commands.js';
import { ConnectionRevokedError, UntrustedCallbackError } from '@/domain/errors.js';
import type { BattleGridPort, TokenGrant } from '@/ports/battlegrid.js';
import { FakeClock, FakeConnectionStore, FakeTransactionStore } from '../support/fakes.js';

class SequentialRandom implements Randomness {
  private n = 0;
  token(): string {
    return `r${++this.n}`;
  }
  codeChallengeS256(verifier: string): string {
    return `challenge(${verifier})`;
  }
}

function fakePort(overrides: Partial<BattleGridPort> = {}): BattleGridPort {
  const grant: TokenGrant = {
    accessToken: 'at-1',
    refreshToken: 'rt-1',
    expiresIn: 3600,
    scopes: ['mcp:read'],
    subject: 'bg-subject-1',
  };
  return {
    buildAuthorizationUrl: ({ state, codeChallenge, scopes }) =>
      `https://mcp.battlegrid.trade/authorize?state=${state}&code_challenge=${encodeURIComponent(codeChallenge)}&scope=${encodeURIComponent(scopes.join(' '))}`,
    exchangeCode: async () => grant,
    refresh: async () => grant,
    revoke: async () => undefined,
    discoverTools: async () => [],
    callTool: async () => {
      throw new Error('not used');
    },
    ...overrides,
  };
}

describe('StartConnectionCommand', () => {
  let clock: FakeClock;
  let transactions: FakeTransactionStore;

  beforeEach(() => {
    clock = new FakeClock();
    transactions = new FakeTransactionStore();
  });

  const start = (port = fakePort()) =>
    new StartConnectionCommand(port, transactions, new SequentialRandom(), clock);

  /** R1 — connecting by authorization. */
  it('connects_by_authorization: sends the user to BattleGrid', async () => {
    const res = await start().execute();
    expect(res.authorizationUrl).toContain('https://mcp.battlegrid.trade/authorize');
    expect(res.authorizationUrl).toContain('code_challenge');
  });

  /** R3 — read scope only. */
  it('requests_read_only: never asks for wager authority', async () => {
    const res = await start().execute();
    expect(res.authorizationUrl).toContain('mcp%3Aread');
    expect(res.authorizationUrl).not.toContain('wager');
  });

  it('never asks the user for a credential', async () => {
    // The command takes no credential parameter at all — asserted structurally
    // by its signature, and here by there being nothing to pass.
    const res = await start().execute();
    expect(res).not.toHaveProperty('apiKey');
    expect(StartConnectionCommand.prototype.execute.length).toBe(0);
  });

  it('records a single-use pending transaction', async () => {
    const res = await start().execute();
    expect(transactions.transactions.has(res.state)).toBe(true);
  });
});

describe('CompleteConnectionCommand', () => {
  let clock: FakeClock;
  let transactions: FakeTransactionStore;
  let connections: FakeConnectionStore;
  // One generator across the whole test, so two connections never collide on
  // an id the way two fresh generators would.
  let random: SequentialRandom;

  beforeEach(() => {
    clock = new FakeClock();
    transactions = new FakeTransactionStore();
    connections = new FakeConnectionStore(clock);
    random = new SequentialRandom();
  });

  const complete = (port = fakePort()) =>
    new CompleteConnectionCommand(port, transactions, connections, random, clock);

  async function pending(state = 's1') {
    await transactions.create({
      state,
      codeVerifier: 'v1',
      createdAt: clock.now(),
      expiresAt: new Date(clock.now().getTime() + 600_000),
    });
    return state;
  }

  it('establishes a connection the user can act through', async () => {
    const state = await pending();
    const res = await complete().execute({ state, code: 'c1' });
    expect((await connections.findByUserId(res.userId))?.status).toBe('active');
  });

  /**
   * The response is the identity, whole — not a bag with an identity in it.
   *
   * It used to carry `connectionId` and `isReturningUser`, which the callback
   * route never read (PG-003), and the id it carried named no row after a
   * reconnection: the writer returned the id it minted while the upsert left the
   * existing row's key in place. The only assertion guarding it was
   * `expect(res.connectionId).toBeTruthy()`, which the fake satisfied because
   * the fake replaces the stored connection — so the check agreed with the code
   * and disagreed with the database.
   *
   * Asserted as a whole rather than field by field, so the next field to arrive
   * here is a decision made in this file rather than something that accumulates.
   */
  it('answers with the identity to act as, and nothing else', async () => {
    const res = await complete().execute({ state: await pending(), code: 'c1' });
    expect(Object.keys(res)).toEqual(['userId']);
  });

  /** R1 — an untrusted response is refused and stores nothing. */
  describe('state_mismatch_refused', () => {
    it('refuses a response with no matching pending request', async () => {
      await expect(complete().execute({ state: 'never-issued', code: 'c1' })).rejects.toBeInstanceOf(
        UntrustedCallbackError,
      );
      expect(connections.connections.size).toBe(0);
    });

    it('refuses a replayed state', async () => {
      const state = await pending();
      await complete().execute({ state, code: 'c1' });
      await expect(complete().execute({ state, code: 'c1' })).rejects.toBeInstanceOf(
        UntrustedCallbackError,
      );
    });

    it('refuses an expired authorization', async () => {
      const state = await pending();
      clock.advance(11 * 60 * 1000);
      await expect(complete().execute({ state, code: 'c1' })).rejects.toBeInstanceOf(
        UntrustedCallbackError,
      );
      expect(connections.connections.size).toBe(0);
    });
  });

  /** R1 — declined consent stores nothing. */
  it('declined_stores_nothing: a rejected code creates no connection', async () => {
    const state = await pending();
    const port = fakePort({
      exchangeCode: async () => {
        throw new Error('access_denied');
      },
    });
    await expect(complete(port).execute({ state, code: 'c1' })).rejects.toThrow('access_denied');
    expect(connections.connections.size).toBe(0);
  });

  /** R1 — unreachable mid-flow leaves nothing partial. */
  it('no_partial_connection: an unreachable server leaves nothing behind', async () => {
    const state = await pending();
    const port = fakePort({
      exchangeCode: async () => {
        throw new Error('ECONNREFUSED');
      },
    });
    await expect(complete(port).execute({ state, code: 'c1' })).rejects.toThrow();
    expect(connections.connections.size).toBe(0);
    expect(transactions.transactions.size).toBe(0); // consumed, not left dangling
  });

  /**
   * R2 — the connection is the identity.
   *
   * These asserted `isReturningUser`, the response's *report* of what happened
   * here. The report is gone; the thing it reported on is the requirement, so it
   * is asserted where it lives — in the store, which is also the only place a
   * future surface could ask.
   */
  describe('returning_user_same_workspace', () => {
    it('recognises a returning user by their BattleGrid subject', async () => {
      const first = await complete().execute({ state: await pending('s1'), code: 'c1' });
      const second = await complete().execute({ state: await pending('s2'), code: 'c2' });
      expect(second.userId).toBe(first.userId);
      // One workspace, not two that happen to share an id: the second callback
      // proposed nothing new, and the connection it resolved to is the one
      // holding the subject that came back.
      expect(connections.connections.size).toBe(1);
      expect((await connections.findByUserId(second.userId))?.battlegridSubject).toBe(
        'bg-subject-1',
      );
    });

    it('treats a different subject as a different user', async () => {
      const first = await complete().execute({ state: await pending('s1'), code: 'c1' });
      const other = fakePort({
        exchangeCode: async () => ({
          accessToken: 'at-2',
          refreshToken: null,
          expiresIn: 60,
          scopes: ['mcp:read'] as const,
          subject: 'bg-subject-2',
        }),
      });
      const second = await complete(other).execute({ state: await pending('s2'), code: 'c2' });
      expect(second.userId).not.toBe(first.userId);
      // And a workspace each, rather than one identity adopting both accounts.
      expect(connections.connections.size).toBe(2);
    });
  });

  /** DL-8 — an absent expires_in must not become a comfortable default. */
  it('treats a missing expires_in as expiring almost immediately', async () => {
    const port = fakePort({
      exchangeCode: async () => ({
        accessToken: 'at',
        refreshToken: null,
        expiresIn: undefined,
        scopes: ['mcp:read'] as const,
        subject: 'sub',
      }),
    });
    const res = await complete(port).execute({ state: await pending(), code: 'c1' });
    const conn = await connections.findByUserId(res.userId);
    const seconds = (conn!.accessTokenExpiresAt!.getTime() - clock.now().getTime()) / 1000;
    expect(seconds).toBeLessThanOrEqual(60);
  });
});

describe('DisconnectCommand', () => {
  let clock: FakeClock;
  let connections: FakeConnectionStore;
  const tokens: TokenSource = { accessTokenFor: async () => 'at-1' };

  beforeEach(async () => {
    clock = new FakeClock();
    connections = new FakeConnectionStore(clock);
    await connections.upsert({
      userId: 'u1',
      battlegridSubject: 'sub',
      scopes: ['mcp:read'],
      accessToken: 'at-1',
      refreshToken: 'rt-1',
      accessTokenExpiresAt: new Date(clock.now().getTime() + 3600_000),
    });
  });

  /** R10 — revocation happens at BattleGrid, not merely locally. */
  it('revokes_at_battlegrid', async () => {
    const revoke = vi.fn(async () => undefined);
    await new DisconnectCommand(fakePort({ revoke }), connections, tokens).execute('u1');
    expect(revoke).toHaveBeenCalledWith('at-1');
    expect((await connections.findByUserId('u1'))?.status).toBe('revoked');
  });

  it('does not claim a revocation that failed upstream', async () => {
    const port = fakePort({
      revoke: async () => {
        throw new Error('revocation endpoint unavailable');
      },
    });
    await expect(
      new DisconnectCommand(port, connections, tokens).execute('u1'),
    ).rejects.toThrow();
    // Still active — telling the user it is revoked when it is not would be worse.
    expect((await connections.findByUserId('u1'))?.status).toBe('active');
  });

  /** R10 — authority withdrawn at BattleGrid instead. */
  it('fails_cleanly_and_offers_reconnect when already revoked', async () => {
    await connections.markRevoked('u1');
    await expect(
      new DisconnectCommand(fakePort(), connections, tokens).execute('u1'),
    ).rejects.toBeInstanceOf(ConnectionRevokedError);
    const err: unknown = await new DisconnectCommand(fakePort(), connections, tokens)
      .execute('u1')
      .then(() => null)
      .catch((e: unknown) => e);
    expect((err as Error).message.toLowerCase()).toContain('reconnect');
  });
});
