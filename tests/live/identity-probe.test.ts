import { describe, expect, it } from 'vitest';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpAccountAdapter } from '@/infrastructure/battlegrid/account-adapter.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';

/**
 * The read that establishes which account a credential acts as, against the
 * real platform.
 *
 * `the-connection-asks-who-it-is` rewrote `McpAccountAdapter.subjectFor` from
 * "any failure is `null`" into three reported outcomes, because the delegated
 * connect path needs to tell an operator *which* non-answer it got. Every unit
 * test for that change supplies the answer through a fake. This is the one place
 * the rewritten mapper meets BattleGrid.
 *
 * **What this proves, exactly.** That the tool still exists at the probed
 * version, that its payload still carries `userId` at the top level, and that
 * the new three-outcome mapper reads it. Nothing more.
 *
 * **What it does not prove, and must not be read as proving.** This runs on a
 * personal `bg_live_` key. The open question (#203, gate finding PG-002) is
 * whether the same read answers for a **delegated OAuth access token** — and
 * that needs a person at a consent screen, so no test in this suite can settle
 * it. `tools/oauth_walk.py` is the harness for that walk.
 *
 * Stating the boundary here rather than leaving it inferable is the same
 * discipline the change added to `scripts/ci.sh`: a green probe named
 * "identity" would otherwise read as covering both paths, and reading a green
 * list as coverage it does not have is exactly how #203 survived audit,
 * archive, and twelve gates.
 *
 * Read-only. Names no mutating tool and constructs no `*Command`, which
 * `tests/architecture/live-writes.test.ts` enforces.
 *
 *   BATTLEGRID_API_KEY=bg_live_… npx vitest run --config vitest.live.config.ts \
 *     tests/live/identity-probe.test.ts
 */

const KEY = process.env['BATTLEGRID_API_KEY'];
const live = KEY ? describe : describe.skip;

const config = {
  clientId: '',
  mcpUrl: 'https://mcp.battlegrid.trade/mcp',
  authorizeUrl: 'https://mcp.battlegrid.trade/authorize',
  tokenUrl: 'https://mcp.battlegrid.trade/token',
  revokeUrl: 'https://mcp.battlegrid.trade/revoke',
  redirectUri: '',
};

function accountPort() {
  const clock = new FakeClock();
  const battlegrid = new McpBattleGridAdapter({
    config,
    audit: new FakeAuditStore(clock),
    confirmations: new FakeConfirmationStore(clock),
    heldScopes: new DeclaredScopes(['mcp:read']),
    remedy: 'repair-the-key',
    fetch: globalThis.fetch,
  });
  return new McpAccountAdapter(battlegrid);
}

live('the account read, against BattleGrid', () => {
  it('names the account behind a personal key', async () => {
    const result = await accountPort().subjectFor(KEY as string);

    if (result.kind !== 'subject') {
      throw new Error(
        `expected the platform to name an account; got ${result.kind}: ${result.reason}`,
      );
    }
    expect(result.subject.length).toBeGreaterThan(0);
    // A shape assertion, not a value one: the id belongs to whoever's key ran
    // this, and pinning it would make the probe personal to one account.
    expect(result.subject).toMatch(/^[0-9a-f-]{8,}$/i);
  }, 60_000);

  it('answers the same id twice, so identity is a fact and not a sample', async () => {
    const port = accountPort();
    const first = await port.subjectFor(KEY as string);
    const second = await port.subjectFor(KEY as string);
    expect(first.kind).toBe('subject');
    expect(second).toEqual(first);
  }, 60_000);

  /**
   * The failure path, driven rather than described.
   *
   * A credential the platform rejects must come back as a *reported* outcome,
   * never as a throw — `OwnerOnlyUser` catches, but `CompleteConnectionCommand`
   * reads the reason and puts it in front of a person. The old contract could
   * not express this at all: every failure was the same `null`.
   */
  it('reports rather than throws when the credential is refused', async () => {
    const result = await accountPort().subjectFor('bg_live_not-a-real-key');
    expect(result.kind).not.toBe('subject');
    if (result.kind === 'subject') throw new Error('unreachable');
    expect(result.reason.length).toBeGreaterThan(0);
  }, 60_000);
});
