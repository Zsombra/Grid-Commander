import { describe, expect, it } from 'vitest';
import type { Strategy } from '@/domain/strategy/strategy.js';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpStrategyAdapter } from '@/infrastructure/battlegrid/strategy-adapter.js';
import { CompilePlanCommand } from '@/application/use-cases/compile-plan.command.js';
import { ApplyPlanCommand, DescribeApplyQuery } from '@/application/use-cases/apply-plan.command.js';
import {
  DescribeArchiveStrategyQuery,
  ForkStrategyCommand,
  SetStrategyActiveCommand,
} from '@/application/use-cases/strategy-lifecycle.command.js';
import { compileUpdateIntent } from '@/domain/strategy/compiled-plan.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';
import { SequentialRandom } from '../support/agent-fakes.js';

/**
 * A custom report table, created and then modified on a real strategy —
 * the operator's request of 2026-08-01: prove tables can be authored, not
 * only previewed.
 *
 * Gated on `BATTLEGRID_API_KEY` like its siblings:
 *
 *     BATTLEGRID_API_KEY=bg_live_… npx vitest run tests/live/custom-table-probe.test.ts
 *
 * The slot shuffle again (operator-authorized 2026-07-31): park an unbound
 * PRIVATE strategy, fork a SYSTEM one, then — on the zero-bound throwaway —
 * compile+apply a custom two-column momentum table, read it back, preview
 * it as the agent would read it, compile+apply a *modified* version of the
 * same table (a third column from a different family), read that back too,
 * and put everything back. Create and modify, both through the product's
 * own pipeline, both revision-checked.
 */

const KEY = process.env['BATTLEGRID_API_KEY'];
// Mutating probes need more than a credential.
//
// Gated on the key alone, `npm test` with one exported ran four of these
// concurrently against the operator's real account — forking, archiving and
// creating agents at the same time, tripping each other's optimistic
// concurrency. Observed 2026-08-04. `oauth-metadata.test.ts` had already
// established the principle in the other direction: do not tie a check to a
// variable whose meaning is not what the check needs.
//
//     BATTLEGRID_API_KEY=… BATTLEGRID_LIVE_WRITES=1 npx vitest run <this file>
const WRITES = process.env['BATTLEGRID_LIVE_WRITES'] === '1';
const live = KEY && WRITES ? describe : describe.skip;

const config = {
  clientId: '',
  mcpUrl: 'https://mcp.battlegrid.trade/mcp',
  authorizeUrl: 'https://mcp.battlegrid.trade/authorize',
  tokenUrl: 'https://mcp.battlegrid.trade/token',
  revokeUrl: 'https://mcp.battlegrid.trade/revoke',
  redirectUri: '',
};

const who = { userId: 'owner', accessToken: KEY as string };

live('a custom table can be created and modified on a real strategy', () => {
  it(
    'frees a slot, forks, adds a table, modifies it, verifies both, and puts everything back',
    { timeout: 600_000 },
    async (ctx) => {
      const clock = new FakeClock();
      const confirmations = new FakeConfirmationStore(clock);
      const battlegrid = new McpBattleGridAdapter({
        config,
        audit: new FakeAuditStore(clock),
        confirmations,
        heldScopes: new DeclaredScopes(['mcp:read']),
        remedy: 'repair-the-key',
        fetch: globalThis.fetch,
      });
      const strategies = new McpStrategyAdapter(battlegrid);
      const describeArchive = new DescribeArchiveStrategyQuery(
        confirmations,
        new SequentialRandom(),
        clock,
      );
      const setActive = new SetStrategyActiveCommand(strategies);

      const archiveOf = async (subject: Strategy) => {
        const proposal = await describeArchive.execute({ ...who, strategy: subject });
        if (proposal.kind !== 'proposal') throw new Error(`no archive proposal: ${proposal.reason}`);
        return setActive.execute({
          ...who,
          strategy: subject,
          active: false,
          confirmationToken: proposal.proposal.confirmationToken,
        });
      };
      const freshOf = async (id: string): Promise<Strategy> => {
        const read = await strategies.readStrategy({ ...who, strategyId: id });
        if (read.kind !== 'strategy') throw new Error(`cannot re-read ${id}`);
        return read.detail.summary;
      };

      /** Compile+apply one intent through the full product pipeline. */
      const land = async (subject: Strategy, summaryText: string, sections: unknown[]) => {
        const intent = compileUpdateIntent({
          strategyId: subject.id,
          expectedRevision: subject.revision,
          intentSummary: summaryText,
          assumptions: ['Only the sections change'],
          tagline: subject.tagline ?? 'probe',
          sections: sections as Parameters<typeof compileUpdateIntent>[0]['sections'],
        });
        const compiled = await new CompilePlanCommand(strategies).execute({ ...who, request: intent });
        if (compiled.kind !== 'review') {
          throw new Error(`compile ${compiled.kind}: ${'reason' in compiled ? compiled.reason : ''}`);
        }
        expect(compiled.review.viable, 'the platform must call the plan viable').toBe(true);
        const proposed = await new DescribeApplyQuery(
          confirmations,
          new SequentialRandom(),
          clock,
        ).execute({
          userId: who.userId,
          battlegridSubject: null,
          accessToken: who.accessToken,
          strategyId: subject.id,
          plan: compiled.review.plan,
          currentIntent: intent,
          currentRevision: subject.revision,
        });
        if (proposed.kind !== 'proposal') throw new Error(`apply refused locally: ${proposed.reason}`);
        await new ApplyPlanCommand(strategies).execute({
          ...who,
          strategyId: subject.id,
          plan: compiled.review.plan,
          confirmationToken: proposed.proposal.confirmationToken,
        });
      };

      const listing = await strategies.listStrategies(who);
      if (listing.kind !== 'strategies') throw new Error('cannot read strategies');
      const source = listing.strategies.find((s) => s.scope === 'SYSTEM');
      const slotHolder = listing.strategies.find(
        (s) => s.scope === 'PRIVATE' && s.isActive && s.boundAgentCount === 0,
      );
      if (!source || !slotHolder) {
        ctx.skip();
        return;
      }
      // eslint-disable-next-line no-console
      console.log(`  slot: parking ${slotHolder.name} (0 bound)`);
      const parked = await archiveOf(slotHolder);
      expect(parked.kind).toBe('changed');

      let fork: Strategy | undefined;
      try {
        const forked = await new ForkStrategyCommand(strategies).execute({ ...who, strategy: source, sourceRevision: source.revision });
        if (forked.kind !== 'forked') throw new Error('fork refused with a slot free');
        fork = forked.strategy;
        const forkDetail = await strategies.readStrategy({ ...who, strategyId: fork.id });
        if (forkDetail.kind !== 'strategy') throw new Error('cannot read the fork back');
        const baseSections = forkDetail.detail.sections.map((s) => ({
          kind: s.kind,
          sectionKey: s.sectionKey,
        }));
        // eslint-disable-next-line no-console
        console.log(`  fork: ${fork.name} r${fork.revision} · ${baseSections.length} sections`);

        // --- create: a two-column momentum table --------------------------
        /**
         * **The platform mints the key, not the client.** Supplying a
         * `custom:<uuid>` of our own is refused —
         * `REPORT_CUSTOM_SECTION_NOT_OWNED`, "does not belong to this
         * strategy" (observed live 2026-08-01). `sectionKey` is optional in
         * the schema precisely because a new custom section is *defined*
         * inline and named by the server; only an existing one is referenced
         * by key.
         */
        const tableV1 = {
          kind: 'custom',
          title: 'Probe Momentum Table',
          timeframe: '1h',
          columns: [
            { metric: 'RSI14', transformId: 'value', timeframe: { rel: 'anchor' } },
            { metric: 'ADX', transformId: 'value', timeframe: { rel: 'anchor' } },
          ],
        };
        await land(fork, 'Add a custom momentum table', [...baseSections, tableV1]);
        const afterCreate = await strategies.readStrategy({ ...who, strategyId: fork.id });
        if (afterCreate.kind !== 'strategy') throw new Error('cannot re-read after create');
        const baseKeys = new Set(baseSections.map((s) => s.sectionKey));
        const created = afterCreate.detail.sections.find((s) => !baseKeys.has(s.sectionKey));
        // eslint-disable-next-line no-console
        console.log(
          `  create: r${afterCreate.detail.summary.revision} sections=${afterCreate.detail.sections.length} minted=${String(created?.sectionKey)}`,
        );
        /**
         * Does an UPDATE that never mentions the regime settings preserve
         * them? `compileUpdateIntent` sends sections and tagline only, and a
         * platform that treated omission as "set to default" would silently
         * flip a strategy's regime configuration — the `agentEdit` failure
         * mode, one layer up. Recorded either way.
         */
        // eslint-disable-next-line no-console
        console.log(
          `  regime: autoDerive ${String(forkDetail.detail.regimeAutoDerive)} -> ${String(afterCreate.detail.regimeAutoDerive)}, timeframe ${String(forkDetail.detail.regimeTimeframe)} -> ${String(afterCreate.detail.regimeTimeframe)}`,
        );

        /**
         * What the platform *returns* for a saved custom section — the fact
         * that decides whether this product can preview a strategy that has
         * one. Read raw, because the domain's `StrategySection` carries only
         * `kind` and `sectionKey` and would hide the answer.
         */
        const raw = await battlegrid.callTool({
          userId: who.userId,
          accessToken: who.accessToken,
          tool: 'get_strategy',
          args: { strategyId: fork.id },
        });
        const rawSections =
          ((raw.content as Record<string, unknown>)['strategy'] as Record<string, unknown> | undefined)?.[
            'sections'
          ] ?? [];
        const rawCustom = (Array.isArray(rawSections) ? rawSections : []).find((s: unknown) =>
          String(((s ?? {}) as Record<string, unknown>)['sectionKey'] ?? '').startsWith('custom:'),
        );
        // eslint-disable-next-line no-console
        console.log(`  saved custom section as read: ${JSON.stringify(rawCustom)}`);
        expect(created, 'the created table must appear on the strategy').toBeDefined();
        const tableKey = created!.sectionKey;

        // --- the table renders as the agent would read it -----------------
        const preview = await strategies.previewReport({
          ...who,
          timeframe: afterCreate.detail.summary.timeframe,
          // Auto-derive, explicitly: `regimeTimeframe` is REQUIRED when
          // `regimeAutoDerive` is false (live, 2026-08-01), and a preview
          // is not the place to re-litigate the strategy's regime setting.
          regimeAutoDerive: true,
          // The minted key, so the preview describes the table as saved.
          sections: [{ ...tableV1, sectionKey: tableKey }],
          coinSelection: { mode: 'explicit', tickers: ['BTC'] },
        });
        if (preview.kind === 'refused') {
          // eslint-disable-next-line no-console
          console.log(`  preview REFUSED: ${preview.reason.slice(0, 300)}`);
        }
        expect(preview.kind).toBe('preview');
        if (preview.kind === 'preview') {
          // eslint-disable-next-line no-console
          console.log(
            `  preview: "${preview.preview.sections[0]?.title ?? ''}" — ${String(preview.preview.sections[0]?.text ?? '').slice(0, 100)}`,
          );
          expect(preview.preview.sections[0]?.title).toBe('Probe Momentum Table');
        }

        // --- modify: a third column from another family -------------------
        // Now the key exists and IS supplied — that is what modifying a
        // table means: reference the one the strategy owns and restate it.
        fork = await freshOf(fork.id);
        const tableV2 = {
          ...tableV1,
          sectionKey: tableKey,
          title: 'Probe Momentum Table v2',
          columns: [
            ...tableV1.columns,
            { metric: 'CVD', transformId: 'value', timeframe: { rel: 'anchor' } },
          ],
        };
        await land(fork, 'Widen the custom table with a flow column', [...baseSections, tableV2]);
        const afterModify = await strategies.readStrategy({ ...who, strategyId: fork.id });
        if (afterModify.kind !== 'strategy') throw new Error('cannot re-read after modify');
        const modified = afterModify.detail.sections.find((s) => s.sectionKey === tableKey);
        // eslint-disable-next-line no-console
        console.log(
          `  modify: r${afterModify.detail.summary.revision} table still present=${String(Boolean(modified))}`,
        );
        expect(modified, 'the modified table must persist under the same key').toBeDefined();
        expect(afterModify.detail.summary.revision).toBeGreaterThan(afterCreate.detail.summary.revision);
        fork = afterModify.detail.summary;
      } finally {
        if (fork) {
          const parkFork = await archiveOf(await freshOf(fork.id));
          // eslint-disable-next-line no-console
          console.log(`  cleanup: fork parked (${parkFork.kind})`);
        }
        const restored = await setActive.execute({
          ...who,
          strategy: await freshOf(slotHolder.id),
          active: true,
        });
        // eslint-disable-next-line no-console
        console.log(`  cleanup: ${slotHolder.name} restored (${restored.kind})`);
        expect(restored.kind).toBe('changed');
      }
    },
  );
});
