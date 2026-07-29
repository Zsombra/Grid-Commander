import { describe, expect, it } from 'vitest';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpStrategyAdapter } from '@/infrastructure/battlegrid/strategy-adapter.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';

/**
 * One write, against the real platform, through the product's own path.
 *
 * Not in the default suite — `vitest.config.ts` includes `tests/**` but this
 * file guards on `BATTLEGRID_API_KEY`, so `npm test` skips it and CI can never
 * reach it. Run deliberately:
 *
 *     BATTLEGRID_API_KEY=bg_live_… npx vitest run tests/live/write-probe.test.ts
 *
 * **Why it exists.** Every read in this product returned an empty object for its
 * entire life, through four production gates and 561 tests, because the one
 * seam nothing modelled was the one that was wrong. Then the surface map found
 * that `archive_strategy` and `restore_strategy` had never sent
 * `expectedRevision` and could not have succeeded. Both were invisible to every
 * fake, and both were found the moment something real was called.
 *
 * The write path shares that exposure and nothing has retired it. Argument
 * shapes are now checked against declared schemas, but declared is not
 * observed, and this project has already been burned by exactly that gap.
 *
 * **What it touches.** A fork of a SYSTEM strategy — an object that did not
 * exist before this test and does not outlive it. It never touches an existing
 * strategy, never touches an agent, and never calls a wager tool. The sequence
 * is fork → compile (which writes nothing) → archive the fork.
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

function wire() {
  const clock = new FakeClock();
  const audit = new FakeAuditStore(clock);
  const confirmations = new FakeConfirmationStore(clock);
  const battlegrid = new McpBattleGridAdapter({
    config,
    audit,
    confirmations,
    // The personal path: the operator declares what the key carries, exactly as
    // a personal deployment does.
    heldScopes: new DeclaredScopes(['mcp:read']),
    remedy: 'repair-the-key',
    fetch: globalThis.fetch,
  });
  return { audit, confirmations, clock, strategies: new McpStrategyAdapter(battlegrid) };
}

live('a write reaches the real platform', () => {
  const who = { userId: 'owner', accessToken: KEY as string };

  it(
    'forks, compiles, and archives — the whole write path, on a throwaway object',
    { timeout: 120_000 },
    async () => {
      const { strategies, confirmations, clock, audit } = wire();

      // --- pick a target that harms nothing ---------------------------------
      const listing = await strategies.listStrategies(who);
      expect(listing.kind, 'the read path is a precondition for the write path').toBe('strategies');
      if (listing.kind !== 'strategies') return;

      const source = listing.strategies.find((s) => s.scope === 'SYSTEM' && s.boundAgentCount === 0);
      expect(source, 'need a SYSTEM strategy with nothing bound to it').toBeDefined();
      if (!source) return;
      // eslint-disable-next-line no-console
      console.log(`  source: ${source.name} (SYSTEM, r${source.revision}, ${source.boundAgentCount} bound)`);

      // --- 1. fork: creates a new private strategy --------------------------
      const fork = await strategies.forkStrategy({
        ...who,
        strategyId: source.id,
        sourceRevision: source.revision,
      });
      // eslint-disable-next-line no-console
      console.log(`  forked: ${fork.name} ${fork.id} r${fork.revision} scope=${fork.scope}`);

      expect(fork.id, 'a fork must be a different object').not.toBe(source.id);
      expect(fork.scope, 'a fork belongs to the user, not the platform').not.toBe('SYSTEM');
      expect(fork.revision).toBeGreaterThan(0);

      try {
        // --- 2. compile: effect-free, and the one tool returning a plan -----
        const compiled = await strategies.compilePlan({
          ...who,
          request: {
            operation: 'UPDATE',
            strategyId: fork.id,
            expectedRevision: fork.revision,
            intentSummary: 'Write-path probe: retag a throwaway fork',
            assumptions: ['Only the tagline changes'],
            coinSelection: { mode: 'ranked', limit: 9 },
            tagline: 'probe',
          },
        });
        // eslint-disable-next-line no-console
        console.log(`  compile: ${compiled.kind}${compiled.kind === 'rejected' ? ' — ' + compiled.reason : ''}`);

        expect(
          compiled.kind,
          'compile is classified read-only and must not need a confirmation',
        ).toBe('compiled');
        if (compiled.kind === 'compiled') {
          expect(compiled.planToken, 'a plan token is what binds apply to this plan').toBeTruthy();
          expect(compiled.approvedPlan).toBeTypeOf('object');
        }
      } finally {
        // --- 3. archive: destructive, and the fork stops existing -----------
        // In a finally block on purpose: a fork left behind by a failed probe is
        // litter on someone's real account.
        const token = 'probe-confirmation';
        await confirmations.issue({
          token,
          userId: who.userId,
          tool: 'archive_strategy',
          target: fork.id,
          consequence: `Archives the throwaway fork "${fork.name}".`,
          expiresAt: new Date(clock.now().getTime() + 300_000),
          consumedAt: null,
        });

        const archived = await strategies.setActive({
          ...who,
          strategyId: fork.id,
          expectedRevision: fork.revision,
          active: false,
          confirmationToken: token,
        });
        // eslint-disable-next-line no-console
        console.log(`  archive: ${archived.kind}`);

        expect(archived.kind, 'archive_strategy could not succeed before this session').toBe(
          'changed',
        );

        // The guard sequence ran for real: every mutating call is recorded, and
        // the record is written before the call rather than after it.
        const mutations = audit.entries.filter((e) => e.tool !== 'list_strategies');
        // eslint-disable-next-line no-console
        console.log(`  audit: ${mutations.map((e) => `${e.tool}=${e.outcome}`).join(' ')}`);
        expect(mutations.every((e) => e.outcome === 'succeeded')).toBe(true);
      }
    },
  );
});
