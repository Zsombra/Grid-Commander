import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { describeRemedy } from '@/domain/connection/remedy.js';
import type { Remedy } from '@/domain/connection/remedy.js';
import { ConnectionRevokedError } from '@/domain/errors.js';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { ConnectionScopes } from '@/infrastructure/battlegrid/connection-scopes.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore, FakeConnectionStore } from '../support/fakes.js';

/**
 * What the product tells you to do, on a deployment that can actually do it.
 *
 * The diagnosis is deliberately one message for every cause — nobody should have
 * to tell an expired token from a forged cookie (design W-C). The *remedy* is the
 * opposite: it depends entirely on how the deployment got its authority, and
 * naming the wrong one sends someone looking for a button that was removed on
 * purpose. That is what personal mode shipped doing.
 */

const config = {
  clientId: 'client-1',
  mcpUrl: 'https://mcp.battlegrid.trade/mcp',
  authorizeUrl: 'https://mcp.battlegrid.trade/authorize',
  tokenUrl: 'https://mcp.battlegrid.trade/token',
  revokeUrl: 'https://mcp.battlegrid.trade/revoke',
  redirectUri: 'http://localhost:3000/api/auth/battlegrid/callback',
};

/** Answers `tools/list` normally so discovery succeeds, then refuses the call. */
function refusingFetch(status: number): typeof globalThis.fetch {
  return (async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? '{}')) as { method?: string };
    if (body.method === 'tools/list') {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: {
            tools: [
              {
                name: 'get_account_state',
                description: 'Read account state',
                annotations: { readOnlyHint: true },
              },
            ],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return new Response('unauthorized', { status });
  }) as typeof globalThis.fetch;
}

function adapter(remedy: Remedy, status = 401): McpBattleGridAdapter {
  const clock = new FakeClock();
  const connections = new FakeConnectionStore(clock);
  void connections.upsert({
    userId: 'u1',
    battlegridSubject: 'sub-u1',
    scopes: ['mcp:read'],
    accessToken: 'at',
    refreshToken: null,
    accessTokenExpiresAt: null,
  });
  return new McpBattleGridAdapter({
    config,
    audit: new FakeAuditStore(clock),
    confirmations: new FakeConfirmationStore(clock),
    heldScopes: new ConnectionScopes(connections),
    remedy,
    fetch: refusingFetch(status),
  });
}

const refuse = (remedy: Remedy, status = 401): Promise<string> =>
  adapter(remedy, status)
    .callTool({ userId: 'u1', accessToken: 'stale', tool: 'get_account_state', args: {} })
    .then(() => '')
    .catch((e: unknown) => (e as Error).message);

describe('the sentence for each remedy', () => {
  it('tells a delegated user to reconnect', () => {
    expect(describeRemedy('reconnect')).toBe('Reconnect to continue.');
  });

  it('tells an operator which variable to fix', () => {
    // Naming the variable matters: the person reading this is the person who
    // set it, and "check your credentials" would send them to the same dead end
    // the old message did.
    expect(describeRemedy('repair-the-key')).toMatch(/BATTLEGRID_API_KEY/);
  });

  it('tells the operator to restart, because the key is read at startup', () => {
    // Replacing the key without one changes nothing, and a remedy that leaves
    // the product still broken is the same defect in a new sentence.
    expect(describeRemedy('repair-the-key')).toMatch(/restart/i);
  });

  it('never tells an operator to reconnect', () => {
    // The defect, stated directly. `/connect` is not in the navigation and the
    // OAuth client is unset by design; there is nothing to reconnect to.
    expect(describeRemedy('repair-the-key').toLowerCase()).not.toContain('reconnect');
  });

  it('never tells a delegated user about an environment variable', () => {
    // The reverse mistake: a user of someone else's deployment cannot set it,
    // and naming it leaks how that deployment is configured.
    expect(describeRemedy('reconnect')).not.toMatch(/BATTLEGRID_API_KEY/);
  });
});

describe('a refused credential, on each kind of deployment', () => {
  it('keeps one diagnosis for both', async () => {
    // W-C is not being weakened. What went wrong is still said one way.
    const both = await Promise.all([refuse('reconnect'), refuse('repair-the-key')]);
    for (const message of both) {
      expect(message).toContain('Your BattleGrid connection is no longer valid.');
    }
  });

  it('names the key when the deployment holds one', async () => {
    expect(await refuse('repair-the-key')).toMatch(/BATTLEGRID_API_KEY/);
  });

  it('does not offer reconnection when the deployment holds a key', async () => {
    expect((await refuse('repair-the-key')).toLowerCase()).not.toContain('reconnect');
  });

  it('still offers reconnection on the delegated path, unchanged', async () => {
    // The message a delegated user saw before this change, byte for byte.
    expect(await refuse('reconnect')).toBe(
      'Your BattleGrid connection is no longer valid. Reconnect to continue.',
    );
  });

  it('applies to a 403 as well as a 401', async () => {
    expect(await refuse('repair-the-key', 403)).toMatch(/BATTLEGRID_API_KEY/);
  });
});

describe('which remedy applies is decided once, where the app is assembled', () => {
  const composition = () => readFileSync('src/composition.ts', 'utf8');

  it('binds the key remedy to a personal deployment', () => {
    expect(composition()).toMatch(/personal\s*\?\s*'repair-the-key'\s*:\s*'reconnect'/);
  });

  it('passes it to the one adapter that can reach a refusal', () => {
    expect(composition()).toMatch(/remedy:/);
  });

  it('is not decided per request', async () => {
    // Two calls on one adapter cannot disagree, because the adapter holds the
    // answer rather than deriving it from anything a request carries.
    const a = adapter('repair-the-key');
    const call = () =>
      a
        .callTool({ userId: 'u1', accessToken: 'stale', tool: 'get_account_state', args: {} })
        .then(() => '')
        .catch((e: unknown) => (e as Error).message);
    expect(await call()).toBe(await call());
  });
});

describe('the error refuses to guess', () => {
  it('takes a remedy rather than defaulting to one', () => {
    // A default is how a construction site silently inherits the wrong
    // deployment's advice — which is the bug this change exists to remove. The
    // type system enforces it; this states why, so nobody adds one back as a
    // convenience.
    const source = readFileSync('src/domain/errors.ts', 'utf8');
    expect(source).toMatch(/constructor\(remedy: Remedy\)/);
    expect(source).not.toMatch(/remedy: Remedy = /);
  });

  it('composes the sentence rather than holding a second copy', () => {
    expect(new ConnectionRevokedError('reconnect').message).toContain(
      describeRemedy('reconnect'),
    );
    expect(new ConnectionRevokedError('repair-the-key').message).toContain(
      describeRemedy('repair-the-key'),
    );
  });
});

describe('offering to connect where there is nothing to connect', () => {
  const page = () => readFileSync('app/connect/page.tsx', 'utf8');
  const nothing = () => readFileSync('src/presentation/components/nothing-to-connect.tsx', 'utf8');

  it('checks the deployment before rendering the consent page', () => {
    expect(page()).toMatch(/if \(personal\) return <NothingToConnect \/>;/);
  });

  it('renders no submit control on a personal deployment', () => {
    // The old page's button built an /authorize URL with an empty client_id.
    expect(nothing()).not.toMatch(/<button|<form/);
  });

  it('does not describe a grant nobody is being asked for', () => {
    expect(nothing()).not.toMatch(/ConsentSummary/);
  });

  it('names the same remedy the failure message does, from the same source', () => {
    // Two copies of a sentence become two sentences, and this is the page
    // someone lands on when the first one was not enough.
    expect(nothing()).toMatch(/describeRemedy\('repair-the-key'\)/);
  });

  it('says why there is nothing to connect, not merely that there is not', () => {
    expect(nothing()).toMatch(/configured with/i);
  });
});
