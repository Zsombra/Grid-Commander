import { describe, expect, it } from 'vitest';
import {
  ConnectionRevokedError,
  DiscoveryUnavailableError,
  PlatformUnavailableError,
} from '@/domain/errors.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { unreadable } from '@/infrastructure/battlegrid/unreadable.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';

/**
 * What an operator reads when BattleGrid is not answering.
 *
 * Written from a real outage. On 2026-08-05 the platform returned **502 Bad
 * Gateway from nginx** — HTML, not JSON — all day, and the app was booted in
 * personal mode against the real key while it lasted.
 *
 * The structure held: nothing crashed, and every read came back `unreadable`
 * with `cause: 'unreachable'` rather than `empty`. What an operator actually
 * read did not:
 *
 *     Your roster could not be loaded. tools/call failed with 502
 *
 * `unreadable(err)` carries `err.message` to every surface, so a bare
 * `` new Error(`${method} failed with ${res.status}`) `` at the transport was
 * the sentence on five web pages and every MCP tool result.
 *
 * These are pinned against the shapes that outage produced, because the
 * condition is gone the moment the platform recovers and no fake would have
 * invented an HTML body behind a JSON content type.
 */

const config = {
  clientId: '',
  mcpUrl: 'https://mcp.example.invalid/mcp',
  authorizeUrl: 'https://mcp.example.invalid/authorize',
  tokenUrl: 'https://mcp.example.invalid/token',
  revokeUrl: 'https://mcp.example.invalid/revoke',
  redirectUri: '',
};

/** Exactly what nginx sent on 2026-08-05, content type and all. */
const NGINX_502 =
  '<html>\n<head><title>502 Bad Gateway</title></head>\n<body>\n' +
  '<center><h1>502 Bad Gateway</h1></center>\n<hr><center>nginx</center>\n</body>\n</html>\n';

function adapterAnswering(status: number, body: string, contentType = 'text/html') {
  const clock = new FakeClock();
  return new McpBattleGridAdapter({
    config,
    audit: new FakeAuditStore(clock),
    confirmations: new FakeConfirmationStore(clock),
    heldScopes: new DeclaredScopes(['mcp:read']),
    remedy: 'repair-the-key',
    fetch: (async () =>
      new Response(body, {
        status,
        headers: { 'content-type': contentType },
      })) as typeof globalThis.fetch,
  });
}

/**
 * A read, through the real adapter, against a transport that answers nothing.
 *
 * Discovery is what fails first — the adapter asks `tools/list` before it will
 * say what a tool does, and that request meets the same 502. Which is exactly
 * the live sequence: during the outage every surface failed at the transport,
 * not at a classification.
 */
const callTool = (a: McpBattleGridAdapter) =>
  a.callTool({
    userId: 'u1',
    accessToken: 'at',
    tool: 'list_intelligence_agents',
    args: {},
  });

describe('a gateway failure, as an operator reads it', () => {
  it('does not put the status line in front of a person', async () => {
    const err = await callTool(adapterAnswering(502, NGINX_502)).then(
      () => null,
      (e: unknown) => e as Error,
    );
    expect(err).toBeInstanceOf(PlatformUnavailableError);
    const reason = unreadable(err).reason;

    // The whole defect in one assertion: this is what five surfaces said.
    expect(reason, 'the reason must not be the protocol artefact').not.toBe(
      'tools/call failed with 502',
    );
    expect(reason, 'it says who is at fault, because that is the only question').toMatch(
      /BattleGrid/,
    );
    expect(reason).toMatch(/not with your account|not answering/i);
    // Kept, not dropped. Two people describing the same outage need the number.
    expect(reason, 'the status survives as diagnostics').toContain('502');
  });

  it('classifies as unreachable, not as a refusal', async () => {
    // The remedy for one is "wait" and for the other is "fix your credential".
    const err = await callTool(adapterAnswering(502, NGINX_502)).then(
      () => null,
      (e: unknown) => e as Error,
    );
    expect(unreadable(err).cause).toBe('unreachable');
  });

  it('never reports an unreadable as an absence', async () => {
    // The property the whole result-shape design exists for, asserted against
    // a platform that is genuinely gone rather than a fake that returns a
    // failure. That distinction had never been tested before this outage.
    const err = await callTool(adapterAnswering(502, NGINX_502)).then(
      () => null,
      (e: unknown) => e as Error,
    );
    expect(unreadable(err).kind).toBe('unreadable');
  });
});

describe('the four things a status can mean', () => {
  const reason = (status: number) => new PlatformUnavailableError(status).message;

  it('separates a gateway that could not reach anything', () => {
    for (const status of [502, 503, 504]) {
      expect(reason(status), String(status)).toMatch(/not answering/i);
      // Nothing about the request was examined, so nothing about it is at fault.
      expect(reason(status)).toMatch(/not with your account/i);
    }
  });

  it('separates the platform failing while handling the request', () => {
    // Distinct from the gateway case: here the request may well be implicated,
    // so it does not promise the operator that nothing they did matters.
    expect(reason(500)).toMatch(/failed while handling/i);
    expect(reason(500)).not.toMatch(/not with your account/i);
  });

  it('separates being rate-limited, which is not a fault at all', () => {
    expect(reason(429)).toMatch(/limiting how often/i);
    expect(reason(429)).toMatch(/Nothing is wrong/i);
  });

  it('separates a request the platform would not accept', () => {
    expect(reason(400)).toMatch(/refused this request/i);
    // And says the connection is fine, so nobody re-authorises over a bad request.
    expect(reason(400)).toMatch(/connection is still valid/i);
  });

  it('leaves a withdrawal of authority to the error that has a remedy', async () => {
    // 401/403 must never reach here — they are the one case an operator can act
    // on, and `PlatformUnavailableError` has no remedy to offer.
    for (const status of [401, 403]) {
      const err = await callTool(adapterAnswering(status, 'nope', 'text/plain')).then(
        () => null,
        (e: unknown) => e as Error,
      );
      expect(err, String(status)).toBeInstanceOf(ConnectionRevokedError);
      expect(unreadable(err).cause).toBe('refused');
    }
  });
});

describe('a refusal for an operation that could not be classified', () => {
  it('says what it did, not what the operation was', () => {
    /**
     * `get_agent_explorer` is a **read**. With discovery down it classifies as
     * unknown, unknown fails closed as destructive, and `/explorer` told an
     * operator that *configuration changes* were unavailable — during a total
     * outage, on a page that configures nothing.
     *
     * The refusal is right. The claim about what was refused was not ours to
     * make: this only ever knew the tool's name.
     */
    const message = new DiscoveryUnavailableError('get_agent_explorer').message;
    expect(message, 'it must not assert a category it cannot know').not.toMatch(
      /configuration change/i,
    );
    expect(message).toContain('get_agent_explorer');
    expect(message).toMatch(/could not confirm/i);
    expect(message, 'and that it therefore did not act').toMatch(/did not call it/i);
  });
});
