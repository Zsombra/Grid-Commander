import { describe, expect, it } from 'vitest';
import { checkBound, type Catalog } from '@/domain/agent/catalog.js';
import { mapCatalog } from '@/infrastructure/battlegrid/agent-mapper.js';

/**
 * The datasets BattleGrid v9.0.0 added, and what this product does with each.
 *
 * Reconciled 2026-08-06 by reading the live payloads rather than the release
 * notes. Three outcomes, and the middle one is the reason this file exists:
 *
 * 1. **Flows already.** The perp/spot flow module — `includePerpSpotFlow`, the
 *    `FLOW_DIVERGENCE` signals, `PERP_SPOT_*`/`SPOT_CVD`/`RVOL`/`BB_WIDTH_PCT`
 *    — needs no code. Vocabulary is read at runtime and
 *    `tests/strategy/structure.test.ts` forbids writing it into source, so a
 *    new metric appears and a removed one (`VOLUME_RATIO`) stops appearing.
 * 2. **Must not be adopted.** Two new bounds that look like the ones we
 *    already map and are in different units. Pinned below.
 * 3. **Added.** `previewExecutionLimits`, which was genuinely unread.
 */

/** The live `tradingDefaults` of 2026-08-06, both bound families intact. */
const V9_CATALOG_PAYLOAD = {
  tradingDefaults: {
    defaults: { defaultMinTradeConviction: 0.35, defaultGridMinConfidence: 0.7 },
    bounds: {
      minimumTradingEquityUsd: 10,
      minimumAllocationUsd: 10,
      // What we map. Fractions, matching the config fields they bound.
      agentMinConfidenceFloor: 0.3,
      agentMinTradeConvictionFloor: 0.2,
      // New in v9. The *same limits*, expressed as percentages.
      agentMinConfidenceFloorPercent: 30,
      agentMinTradeConvictionFloorPercent: 20,
    },
  },
};

describe('the two bounds v9 added are duplicates in another unit', () => {
  // `mapCatalog(models, tradingConfig, brainPresets)` — the catalog is assembled
  // from three reads, and only the middle one carries the bounds registry.
  const catalog: Catalog = mapCatalog([], V9_CATALOG_PAYLOAD, []);

  it('bounds confidence and conviction as fractions, matching the fields', () => {
    /**
     * `gridMinConfidence` defaults to 0.7 and `minTradeConviction` to 0.35 —
     * fractions. The floors we map are 0.3 and 0.2, in the same unit, so the
     * comparison is meaningful.
     */
    expect(checkBound(catalog, 'gridMinConfidence', 0.7)).toEqual({ ok: true });
    expect(checkBound(catalog, 'minTradeConviction', 0.35)).toEqual({ ok: true });
    // And they genuinely bound: below the floor is refused, with the reason.
    expect(checkBound(catalog, 'gridMinConfidence', 0.2).ok).toBe(false);
    expect(checkBound(catalog, 'minTradeConviction', 0.1).ok).toBe(false);
  });

  it('does not adopt the percent-expressed copies', () => {
    /**
     * **The trap this file exists for.** `agentMinConfidenceFloorPercent: 30`
     * arrived in v9 beside `agentMinConfidenceFloor: 0.3`, and `BOUND_KEYS` is
     * a hand-maintained table of registry keys — so "reconcile the new dataset"
     * reads as an invitation to add the new names to it.
     *
     * Doing that would compare a config value of **0.7 against a floor of 30**
     * and refuse every valid configuration in the product, on the surface where
     * an operator sets how confident an agent must be before it trades.
     *
     * The fraction keys are still published and still correct. The percent ones
     * are the same limits for a caller that works in percent, and this product
     * does not.
     */
    const floors = Object.entries(catalog.bounds).filter(([, b]) => (b.min ?? 0) >= 20);
    expect(
      floors,
      'a bound of 30 could only have come from a percent key mapped onto a fractional field',
    ).toEqual([]);
  });

  it('leaves a field the registry does not bound unvalidatable, not unbounded', () => {
    // The pre-existing rule, re-asserted because the fix above is a decision
    // *not* to add a bound — and "no bound" must keep meaning "cannot check".
    expect(checkBound(catalog, 'maxDailyTrades', 999)).toEqual({ ok: 'unvalidatable' });
  });
});

describe('the one dataset that was genuinely unread', () => {
  it('carries the preview ceilings off the discovery call', async () => {
    /**
     * `preview_strategy_report` used to publish its own limits and now says
     * they are "served by discovery, not by this result". Discovery is
     * `list_strategy_vocabulary` — the same call the section templates already
     * come from, so this costs nothing.
     */
    const { FakeStrategiesPort, aDetail } = await import('../support/strategy-fakes.js');
    const { ReadSectionOptionsQuery } = await import(
      '@/application/use-cases/read-section-options.query.js'
    );
    const port = new FakeStrategiesPort();
    port.detail = aDetail();
    const result = await new ReadSectionOptionsQuery(port).execute({
      userId: 'u1',
      accessToken: 'at',
      strategyId: 's1',
    });
    expect(result.kind).toBe('ready');
    if (result.kind !== 'ready') throw new Error('unreachable');
    expect(result.limits).toEqual({ maxResultBytes: 256000, deadlineMs: 15000 });
  });

  it('reports no ceiling rather than a guessed one', async () => {
    /**
     * v5 published none of this, and a platform that stops publishing is a
     * state rather than an error. An invented ceiling would be read as the
     * platform's and composed against — worse than an absent one, which simply
     * says nothing.
     */
    const { FakeStrategiesPort, aDetail } = await import('../support/strategy-fakes.js');
    const { ReadSectionOptionsQuery } = await import(
      '@/application/use-cases/read-section-options.query.js'
    );
    const port = new FakeStrategiesPort();
    port.detail = aDetail();
    port.previewLimits = null;
    const result = await new ReadSectionOptionsQuery(port).execute({
      userId: 'u1',
      accessToken: 'at',
      strategyId: 's1',
    });
    if (result.kind !== 'ready') throw new Error('unreachable');
    expect(result.limits).toBeNull();
  });
});
