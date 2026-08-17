import { describe, expect, it } from 'vitest';
import { ReadWagerAuthorityQuery } from '@/application/use-cases/read-wager-authority.query.js';
import { FakeAccountStatePort } from '../support/agent-fakes.js';

/**
 * The account-side gate, read rather than assumed.
 *
 * Four outcomes, and the distinctions carry the meaning: permitted and
 * forbidden are the platform's answers; a missing account is not "wagering
 * disabled"; and unreadable is none of the above, carrying its cause so the
 * surface can explain itself.
 */

const who = { userId: 'owner', accessToken: 'tok' };

describe('whether the account could stake', () => {
  it('reports the platform permitting MCP wagers', async () => {
    const account = new FakeAccountStatePort();
    account.state = { ...account.state, mcpWagerEnabled: true };
    const result = await new ReadWagerAuthorityQuery(account).execute(who);
    expect(result).toEqual({ kind: 'authority', accountAllowsMcpWagers: true });
  });

  it('reports the platform forbidding them', async () => {
    const account = new FakeAccountStatePort();
    account.state = { ...account.state, mcpWagerEnabled: false };
    const result = await new ReadWagerAuthorityQuery(account).execute(who);
    expect(result).toEqual({ kind: 'authority', accountAllowsMcpWagers: false });
  });

  it('reports a missing account as its own fact, not as wagering disabled', async () => {
    const account = new FakeAccountStatePort();
    // The platform's flag can read true while no funded account exists — the
    // two fields are independent on the wire, and the absence must win.
    account.state = { ...account.state, hasAccount: false, mcpWagerEnabled: true };
    const result = await new ReadWagerAuthorityQuery(account).execute(who);
    expect(result).toEqual({ kind: 'no-account' });
  });

  it('passes an unreadable account state through with its cause', async () => {
    const account = new FakeAccountStatePort();
    account.readable = false;
    const result = await new ReadWagerAuthorityQuery(account).execute(who);
    expect(result.kind).toBe('unreadable');
    if (result.kind === 'unreadable') {
      expect(result.cause).toBe('unreachable');
      expect(result.reason).toContain('BattleGrid');
    }
  });
});
