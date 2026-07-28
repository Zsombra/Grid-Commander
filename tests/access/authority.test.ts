import { describe, expect, it } from 'vitest';
import { CurrentUserQuery } from '@/application/use-cases/current-user.query.js';
import { ResolveAuthorityQuery, type TokenVault } from '@/application/use-cases/resolve-authority.query.js';
import { ConnectionRevokedError } from '@/domain/errors.js';
import { NOT_CONNECTED } from '@/domain/session/session.js';
import type { SessionPort } from '@/ports/session.js';
import type { BattleGridPort, TokenGrant } from '@/ports/battlegrid.js';
import { FakeClock, FakeConnectionStore } from '../support/fakes.js';

class MemoryVault implements TokenVault {
  constructor(
    private readonly tokens: Map<string, { accessToken: string; refreshToken: string | null }>,
  ) {}
  async read(userId: string) {
    return this.tokens.get(userId) ?? null;
  }
}

class RecordingSession implements SessionPort {
  cleared = 0;
  constructor(private readonly userId: string | null) {}
  async read() {
    return this.userId
      ? ({ kind: 'valid', session: { userId: this.userId, issuedAt: new Date(0) } } as const)
      : ({ kind: 'rejected', reason: 'absent' } as const);
  }
  async issue() {}
  async clear() {
    this.cleared += 1;
  }
}

function battlegrid(refresh: () => Promise<TokenGrant>): BattleGridPort {
  return {
    buildAuthorizationUrl: () => '',
    exchangeCode: async () => {
      throw new Error('not used');
    },
    refresh,
    revoke: async () => {},
    discoverTools: async () => [],
    callTool: async () => {
      throw new Error('not used');
    },
  };
}

async function connected(
  clock: FakeClock,
  opts: { expiresAt?: Date | null; refreshToken?: string | null; revoked?: boolean } = {},
) {
  const connections = new FakeConnectionStore(clock);
  await connections.upsert({
    userId: 'u1',
    battlegridSubject: 'sub-u1',
    scopes: ['mcp:read'],
    accessToken: 'stored-access',
    refreshToken: opts.refreshToken === undefined ? 'stored-refresh' : opts.refreshToken,
    accessTokenExpiresAt:
      opts.expiresAt === undefined ? new Date(clock.now().getTime() + 3_600_000) : opts.expiresAt,
  });
  if (opts.revoked) await connections.markRevoked('u1');
  return connections;
}

const vaultFor = (refreshToken: string | null = 'stored-refresh') =>
  new MemoryVault(new Map([['u1', { accessToken: 'stored-access', refreshToken }]]));

/** Authority is refreshed before use, not after failure. */
describe('resolving authority', () => {
  it('uses the stored token when it is not near expiry', async () => {
    const clock = new FakeClock();
    let refreshed = 0;
    const q = new ResolveAuthorityQuery(
      await connected(clock),
      vaultFor(),
      battlegrid(async () => {
        refreshed += 1;
        throw new Error('should not refresh');
      }),
      clock,
    );
    expect((await q.execute('u1')).accessToken).toBe('stored-access');
    expect(refreshed).toBe(0);
  });

  it('refreshes before the call when the token is near expiry', async () => {
    const clock = new FakeClock();
    const connections = await connected(clock, {
      // Inside the refresh margin: about to lapse, not yet lapsed.
      expiresAt: new Date(clock.now().getTime() + 5_000),
    });
    const q = new ResolveAuthorityQuery(
      connections,
      vaultFor(),
      battlegrid(async () => ({
        accessToken: 'fresh-access',
        refreshToken: 'fresh-refresh',
        expiresIn: 3600,
        scopes: ['mcp:read'],
        subject: 'sub-u1',
      })),
      clock,
    );
    expect((await q.execute('u1')).accessToken).toBe('fresh-access');
  });

  it('stores the refreshed authority, so the next call does not refresh again', async () => {
    const clock = new FakeClock();
    const connections = await connected(clock, {
      expiresAt: new Date(clock.now().getTime() + 5_000),
    });
    let refreshes = 0;
    const q = new ResolveAuthorityQuery(
      connections,
      vaultFor(),
      battlegrid(async () => {
        refreshes += 1;
        return {
          accessToken: 'fresh-access',
          refreshToken: 'fresh-refresh',
          expiresIn: 3600,
          scopes: ['mcp:read'],
          subject: 'sub-u1',
        };
      }),
      clock,
    );
    await q.execute('u1');
    await q.execute('u1');
    expect(refreshes).toBe(1);
  });

  it('keeps the old refresh token when the server returns none', async () => {
    const clock = new FakeClock();
    const connections = await connected(clock, {
      expiresAt: new Date(clock.now().getTime() + 5_000),
    });
    const q = new ResolveAuthorityQuery(
      connections,
      vaultFor(),
      battlegrid(async () => ({
        accessToken: 'fresh-access',
        refreshToken: null,
        expiresIn: 3600,
        scopes: ['mcp:read'],
        subject: 'sub-u1',
      })),
      clock,
    );
    await q.execute('u1');
    expect(connections.secrets.get('u1')?.refreshToken).toBe('stored-refresh');
  });
});

/** Losing authority is one outcome, however it was lost. */
describe('every way of losing authority reports the same thing', () => {
  const cases: Array<[string, () => Promise<ResolveAuthorityQuery>]> = [
    [
      'no connection at all',
      async () => {
        const clock = new FakeClock();
        return new ResolveAuthorityQuery(
          new FakeConnectionStore(clock),
          vaultFor(),
          battlegrid(async () => {
            throw new Error('unused');
          }),
          clock,
        );
      },
    ],
    [
      'the connection was revoked here',
      async () => {
        const clock = new FakeClock();
        return new ResolveAuthorityQuery(
          await connected(clock, { revoked: true }),
          vaultFor(),
          battlegrid(async () => {
            throw new Error('unused');
          }),
          clock,
        );
      },
    ],
    [
      'expired with nothing to refresh from',
      async () => {
        const clock = new FakeClock();
        return new ResolveAuthorityQuery(
          await connected(clock, { expiresAt: new Date(clock.now().getTime() - 1), refreshToken: null }),
          vaultFor(null),
          battlegrid(async () => {
            throw new Error('unused');
          }),
          clock,
        );
      },
    ],
    [
      'BattleGrid refused the refresh',
      async () => {
        const clock = new FakeClock();
        return new ResolveAuthorityQuery(
          await connected(clock, { expiresAt: new Date(clock.now().getTime() - 1) }),
          vaultFor(),
          battlegrid(async () => {
            throw new Error('invalid_grant');
          }),
          clock,
        );
      },
    ],
  ];

  for (const [name, build] of cases) {
    it(`reports ${name} as a revoked connection`, async () => {
      const q = await build();
      await expect(q.execute('u1')).rejects.toBeInstanceOf(ConnectionRevokedError);
    });
  }
});

/** A request acts for exactly one identified user. */
describe('who this request acts for', () => {
  const authorityFor = async (clock: FakeClock, connections: FakeConnectionStore) =>
    new ResolveAuthorityQuery(
      connections,
      vaultFor(),
      battlegrid(async () => {
        throw new Error('unused');
      }),
      clock,
    );

  it('acts for the user the session identifies', async () => {
    const clock = new FakeClock();
    const connections = await connected(clock);
    const q = new CurrentUserQuery(
      new RecordingSession('u1'),
      connections,
      await authorityFor(clock, connections),
    );
    const result = await q.execute();
    expect(result.kind).toBe('acting');
    expect(result.kind === 'acting' && result.authority.userId).toBe('u1');
  });

  it('refuses a request with no session', async () => {
    const clock = new FakeClock();
    const connections = new FakeConnectionStore(clock);
    const q = new CurrentUserQuery(
      new RecordingSession(null),
      connections,
      await authorityFor(clock, connections),
    );
    expect(await q.execute()).toEqual({ kind: 'not-connected', message: NOT_CONNECTED });
  });

  /**
   * A signed cookie is evidence of a previous session, not of a BattleGrid
   * grant. Treating an unknown user as a first visit would make the cookie,
   * rather than the grant, the thing that decides who someone is.
   */
  it('refuses a session naming a user who does not exist, and discards it', async () => {
    const clock = new FakeClock();
    const connections = new FakeConnectionStore(clock);
    const sessions = new RecordingSession('ghost');
    const q = new CurrentUserQuery(sessions, connections, await authorityFor(clock, connections));

    expect((await q.execute()).kind).toBe('not-connected');
    expect(sessions.cleared).toBe(1);
    // No user was created from the session.
    expect(await connections.findByUserId('ghost')).toBeNull();
  });

  it('reports a revoked connection the same way as an absent session', async () => {
    const clock = new FakeClock();
    const connections = await connected(clock, { revoked: true });
    const q = new CurrentUserQuery(
      new RecordingSession('u1'),
      connections,
      await authorityFor(clock, connections),
    );
    expect(await q.execute()).toEqual({ kind: 'not-connected', message: NOT_CONNECTED });
  });
});
