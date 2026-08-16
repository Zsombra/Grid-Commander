import { describe, expect, it } from 'vitest';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpAgentAdapter } from '@/infrastructure/battlegrid/agent-adapter.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';

/**
 * A tripwire on probe residue: the roster, counted rather than guessed at.
 *
 * `a-probe-agent-is-archived-on-the-first-account` (#201) weighs four ways to
 * stop this repository leaving throwaway agents on the operator's account, and
 * concludes that only one of them would have caught the recurrence it was
 * re-filed for. The other three prevent creates that pass through them, and
 * **neither create that actually happened passed through anything**:
 * `GC probe shape II` (2026-08-13) and `Probe 238 Dedupe` (2026-08-14, traced
 * to `openspec/JOURNAL.md`) were both operator-authorized hand walks that
 * reached `create_intelligence_agent` through the adapter without touching
 * `tests/support/probe-agent.ts`. No fixture, teardown, or binding in this
 * repository can reach a hand walk. A tripwire can notice afterwards.
 *
 * **What this proves.** That the number of agents on the account which are not
 * the operator's own has not grown since it was last counted.
 *
 * **What it does not prove, and must not be read as proving.** That the residue
 * is gone, or that it can be cleaned up from here. It cannot: no tool on the
 * 114 deletes an agent, `archive_intelligence_agent` is the whole of cleanup,
 * and all ten are already archived. Only the operator, in BattleGrid's own UI,
 * can reduce this number. A green run means *unchanged*, never *fine*.
 *
 * Read-only. Names no mutating tool and constructs no `*Command`, which
 * `tests/architecture/live-writes.test.ts` enforces.
 *
 *   BATTLEGRID_API_KEY=bg_live_… npx vitest run --config vitest.live.config.ts \
 *     tests/live/residue-probe.test.ts
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

/**
 * The operator's own agents, by display name.
 *
 * **Classification is by exclusion, and that is the whole design.** The nine
 * residue agents known before 2026-08-16 share two prefixes — `GC probe` and
 * `Grid-Commander probe`. The tenth is called `Probe 238 Dedupe` and shares
 * neither. A prefix match would therefore have missed **exactly the create this
 * check exists for**, which is this repository's characteristic defect: matching
 * how a thing is spelled rather than what it reaches. Nothing constrains what a
 * future hand walk names its throwaway, so nothing may be assumed about it.
 *
 * What *is* stable is the short list of agents the operator meant to have. A
 * new one is a deliberate act and belongs here as a deliberate edit.
 *
 * Measured 2026-08-16 at v19.2.0: three ACTIVE, three ARCHIVED.
 */
const OPERATORS_OWN: readonly string[] = [
  'Vanguard',
  'Undertow',
  'Breakwater',
  'THE .0',
  'Volatilis',
  'Quadratorum',
];

/**
 * What the residue counted to when this check was written.
 *
 * Not a budget. It is the number that was true on 2026-08-16, recorded so that
 * an eleventh row fails the run and a human looks at why. Raising it is the
 * correct response *after* establishing what created the new one and recording
 * that in #201 — never as the first move to make a red run green.
 */
const RESIDUE_AT_LAST_COUNT = 10;

live('probe residue on the operator account', () => {
  const who = { userId: 'owner', accessToken: KEY as string };

  it('has not grown since it was last counted', { timeout: 60_000 }, async () => {
    const clock = new FakeClock();
    const battlegrid = new McpBattleGridAdapter({
      config,
      audit: new FakeAuditStore(clock),
      confirmations: new FakeConfirmationStore(clock),
      heldScopes: new DeclaredScopes(['mcp:read']),
      remedy: 'repair-the-key',
      fetch: globalThis.fetch,
    });
    const agents = new McpAgentAdapter(battlegrid);

    // The adapter already sends `statuses: ['ACTIVE','ARCHIVED']`. Hand-building
    // the call is how the first version of #201 got the answer wrong: it guessed
    // `includeArchived: true`, which the tool rejects, then read the default
    // ACTIVE-only response and concluded the rest was uncheckable.
    const roster = await agents.listAgents(who);

    expect(roster.kind, 'the roster must answer before anything can be counted').toBe('agents');
    if (roster.kind !== 'agents') return;

    const names = roster.agents.map((a) => a.displayName);
    const own = names.filter((n) => OPERATORS_OWN.includes(n));
    const residue = roster.agents.filter((a) => !OPERATORS_OWN.includes(a.displayName));

    // Vacuity guard. If the allowlist matches nothing, every row reads as
    // residue and the count above is measuring the allowlist going stale rather
    // than the account gaining a throwaway. Those are different findings and
    // must not arrive as the same failure.
    expect(own.length, `no agent on the roster is the operator's own — the allowlist has gone stale, not the account: ${names.join(', ')}`).toBeGreaterThan(0);

    // eslint-disable-next-line no-console
    console.log(
      `  roster ${roster.agents.length}: ${own.length} the operator's, ${residue.length} residue` +
        (residue.length > 0 ? `\n  residue: ${residue.map((a) => `${a.displayName} [${a.status}]`).join(', ')}` : ''),
    );

    expect(
      residue.length,
      `probe residue grew to ${residue.length} (was ${RESIDUE_AT_LAST_COUNT} on 2026-08-16). ` +
        `Something created an agent outside tests/support/probe-agent.ts. ` +
        `Find what, record it in #201, then raise RESIDUE_AT_LAST_COUNT. ` +
        `Rows: ${residue.map((a) => a.displayName).join(', ')}`,
    ).toBeLessThanOrEqual(RESIDUE_AT_LAST_COUNT);
  });
});
