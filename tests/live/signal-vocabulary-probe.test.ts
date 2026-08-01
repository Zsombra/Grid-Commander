import { describe, expect, it } from 'vitest';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpStrategyAdapter } from '@/infrastructure/battlegrid/strategy-adapter.js';
import { ReadSignalLibraryQuery } from '@/application/use-cases/read-signal-library.query.js';
import { ReadSignalQuery } from '@/application/use-cases/read-signal.query.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';

/**
 * The signal vocabulary, read live through the product path — reads only.
 *
 * Gated on `BATTLEGRID_API_KEY` like its siblings:
 *
 *     BATTLEGRID_API_KEY=bg_live_… npx vitest run tests/live/signal-vocabulary-probe.test.ts
 *
 * Proves the two mappers against today's platform, not the recorded shapes:
 * the library groups every listed signal, and one signal's card carries the
 * platform's own authoring copy end to end.
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

const who = { userId: 'owner', accessToken: KEY as string };

function wire() {
  const clock = new FakeClock();
  const battlegrid = new McpBattleGridAdapter({
    config,
    audit: new FakeAuditStore(clock),
    confirmations: new FakeConfirmationStore(clock),
    heldScopes: new DeclaredScopes(['mcp:read']),
    remedy: 'repair-the-key',
    fetch: globalThis.fetch,
  });
  return new McpStrategyAdapter(battlegrid);
}

live('the signal vocabulary answers through the product path', () => {
  it('lists the library grouped by module', { timeout: 120_000 }, async () => {
    const result = await new ReadSignalLibraryQuery(wire()).execute(who);
    expect(result.kind).toBe('library');
    if (result.kind !== 'library') return;
    // 82 signals over 18 modules on 2026-08-01. Assert order-of-magnitude,
    // not the exact census — the vocabulary is the platform's to grow.
    const total = result.modules.reduce((n, m) => n + m.signals.length, 0);
    expect(total).toBeGreaterThan(50);
    expect(result.modules.length).toBeGreaterThan(10);
    expect(result.modules.map((m) => m.module)).toContain('RSI');
  });

  it('reads one card in the platform’s words, and refuses a ghost honestly', async () => {
    const strategies = wire();
    const card = await new ReadSignalQuery(strategies).execute({ ...who, signalId: 'rsi_oversold' });
    expect(card.kind).toBe('signal');
    if (card.kind !== 'signal') return;
    expect(card.definition.detects).toBeTruthy();
    expect(card.definition.fires).toBeTruthy();
    expect(card.definition.parameters.length).toBeGreaterThan(0);

    const ghost = await new ReadSignalQuery(strategies).execute({ ...who, signalId: 'not_a_signal' });
    expect(ghost.kind).toBe('no-such-signal');
  }, 120_000);
});
