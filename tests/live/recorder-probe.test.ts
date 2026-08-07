import { describe, expect, it } from 'vitest';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpMarketAdapter } from '@/infrastructure/battlegrid/market-adapter.js';
import { McpRadarAdapter } from '@/infrastructure/battlegrid/radar-adapter.js';
import { CaptureSignalsCommand } from '@/application/use-cases/capture-signals.command.js';
import { ReadSignalHistoryQuery } from '@/application/use-cases/read-signal-history.query.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import { systemClock } from '@/ports/clock.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';
import { InMemorySignalRecordStore } from '../support/recording-fakes.js';

/**
 * The recorder, against the platform that is running now — reads only.
 *
 *     BATTLEGRID_API_KEY=bg_live_… npx vitest run tests/live/recorder-probe.test.ts
 *
 * One full capture through the product path: deployments choose the coins,
 * `get_coin_signal_preview` answers per coin, and the mapper's keep-rate is
 * printed raw-vs-mapped — the standing lesson made visible, because a
 * recorder's dropped field is not a bug fix away, it is history lost.
 *
 * The store is the in-memory fake: persistence is proven against a real
 * PostgreSQL in `tests/db/signal-record.test.ts`, and a live probe writing
 * rows into whatever DATABASE_URL happens to be set would make a *read*
 * probe mutate somebody's record.
 *
 * No `BATTLEGRID_LIVE_WRITES` gate: every platform call on this path is a
 * read, and `tests/architecture/live-writes.test.ts` holds that this file
 * stays that way.
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
  return { market: new McpMarketAdapter(battlegrid), radar: new McpRadarAdapter(battlegrid) };
}

live('a capture records what the signals said, live', () => {
  it('captures the deployed coins and the record reads back', { timeout: 300_000 }, async () => {
    const { market, radar } = wire();
    const store = new InMemorySignalRecordStore();
    const command = new CaptureSignalsCommand(market, radar, store, systemClock);

    const result = await command.execute(who);

    // The account has deployments; a run that covered nothing is a finding.
    // eslint-disable-next-line no-console
    console.log(
      `  run ${result.runId} · platform ${result.platformVersion ?? 'unknown'} · ` +
        `${String(result.recorded.length)} recorded, ${String(result.failed.length)} failed`,
    );
    for (const f of result.failed) {
      // eslint-disable-next-line no-console
      console.log(`    FAILED ${f.coinTicker}@${f.interval}: ${f.reason}`);
    }

    expect(result.provenance.kind).toBe('deployments');
    expect(result.recorded.length).toBeGreaterThan(0);

    // The platform names its generation on the handshake this product makes.
    expect(result.platformVersion).toBeTruthy();

    // The mapper's keep-rate, printed raw-vs-mapped: the payload's signal
    // rows against the readings kept, and the header keys against the whole
    // stored answer.
    const first = store.captures[0];
    expect(first).toBeDefined();
    if (first === undefined) return;
    const rawRows = Array.isArray(first.raw['allEvaluatedSignals'])
      ? (first.raw['allEvaluatedSignals'] as unknown[]).length
      : 0;
    // eslint-disable-next-line no-console
    console.log(
      `  ${first.coinTicker}@${first.interval}: raw carries ${String(Object.keys(first.raw).length)} header keys, ` +
        `${String(rawRows)} signal rows; mapped ${String(first.readings.length)} readings`,
    );
    // Every attributable signal row maps — a keep-rate below the row count
    // means rows with no id, which the platform has never sent.
    expect(first.readings.length).toBe(rawRows);
    // The population is the whole library's evaluation, not a fired subset.
    expect(first.readings.length).toBeGreaterThan(50);
    expect(first.readings.some((r) => !r.triggered)).toBe(true);
    // The raw answer holds what the domain deliberately does not map.
    expect(first.raw['comparison']).toBeDefined();

    // And the record reads back through the same query the surfaces use.
    const history = await new ReadSignalHistoryQuery(store).execute({
      userId: 'owner',
      coinTicker: first.coinTicker,
    });
    expect(history.kind).toBe('history');
    if (history.kind !== 'history') return;
    expect(history.entries[0]?.kind).toBe('recorded');
    expect(history.entries[0]?.platformVersion).toBe(result.platformVersion);
  });
});
