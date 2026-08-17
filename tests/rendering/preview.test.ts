import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  aDetail,
  aMembership,
  aReportPreview,
  aStrategy,
  aTickerOutcome,
  FakeStrategiesPort,
} from '../support/strategy-fakes.js';
import { mapConditions } from '@/infrastructure/battlegrid/condition-mapper.js';
import { actingWith, notConnected } from './support/fake-acting.js';
import { rendered } from './support/render.js';

/**
 * The agent's-eye preview, branch by branch: the rendered report with its
 * cost, the membership summary, the refused draft in the platform's words —
 * and the fact that previewing writes nothing.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const params = <T extends Record<string, string>>(p: T): Promise<T> => Promise.resolve(p);

async function previewRendered(id: string, search: Record<string, string> = {}) {
  const Page = (await import('../../app/(app)/strategies/[id]/preview/page.js')).default;
  return rendered(await Page({ params: params({ id }), searchParams: Promise.resolve(search) }));
}

function previewWorld() {
  const summary = aStrategy();
  const strategies = new FakeStrategiesPort([summary]);
  strategies.detail = aDetail(summary);
  strategies.membership = [
    aMembership(),
    aMembership({ signalId: 'rsi_overbought', defaultAllocation: 1 }),
    aMembership({ signalId: 'macd_bull_cross', inReport: false, status: 'NOT_IN_REPORT' }),
  ];
  current = actingWith({ strategies });
  return strategies;
}

beforeEach(() => {
  current = actingWith();
});

describe('the preview page, branch by branch', () => {
  it('renders the report, its cost, and every budget gauge', async () => {
    previewWorld();
    const r = await previewRendered('s1');
    expect(r.headings[0]).toContain('Midway (fork)');
    expect(r.text).toContain('Price Action');
    expect(r.text).toContain('the last traded price');
    // The token estimate is a gauge now, not a sentence. v9 stopped returning
    // `estimatedTokenCount` and publishes it as used-against-cap, so the page
    // shows `estimatedTokens: 1767 of 16000` rather than "About 1393 tokens" —
    // and, critically, no longer claims it is unavailable while showing it.
    expect(r.text).toContain('estimatedTokens');
    expect(r.text).toContain('1767');
    expect(r.text).toContain('16000');
    expect(r.text, 'the count is never reported as missing').not.toContain('unavailable');
    // The counting model stays, as a note on the measurement.
    expect(r.text).toContain('o200k_base');
    expect(r.text).toContain('sections');
    expect(r.text).toContain('of  32');
    expect(r.text).toContain('nothing is saved or changed');
  });

  it('says which signals the composition feeds, and how many it starves', async () => {
    previewWorld();
    const r = await previewRendered('s1');
    expect(r.text).toContain('signal(s) can read this report');
    expect(r.text).toContain('1 cannot');
    expect(r.text).toContain('rsi_oversold');
    expect(r.text).toContain('platform default 2');
  });

  it('previewing writes nothing', async () => {
    const strategies = previewWorld();
    await previewRendered('s1');
    expect(strategies.calls.every((c) => c.op === 'preview')).toBe(true);
  });

  it('a refused draft shows the platform’s words on the same page', async () => {
    const strategies = previewWorld();
    strategies.previewOutcome = {
      kind: 'refused',
      reason: 'VALIDATION_ERROR: custom section requires a self-contained definition',
    };
    const r = await previewRendered('s1');
    expect(r.text).toContain('here is why');
    expect(r.text).toContain('self-contained definition');
    // Membership still renders — the derive succeeded independently.
    expect(r.text).toContain('can read this report');
  });

  it('explicit tickers reach the platform as composed', async () => {
    const strategies = previewWorld();
    await previewRendered('s1', { tickers: 'BTC, ETH' });
    const call = strategies.calls.find((c) => c.op === 'preview');
    expect(call?.payload).toMatchObject({ coinSelection: { mode: 'explicit', tickers: ['BTC', 'ETH'] } });
  });

  it('an unreadable strategy is not an empty preview', async () => {
    const strategies = new FakeStrategiesPort();
    strategies.detailReadable = false;
    current = actingWith({ strategies });
    const r = await previewRendered('s1');
    expect(r.headings[0]).toBe('The preview could not be read');
    expect(r.text).toContain('BattleGrid did not respond');
  });

  it('an unauthenticated request is offered the path to connect', async () => {
    current = { app: actingWith().app, user: notConnected };
    const r = await previewRendered('s1');
    expect(r.text).toContain('connect');
  });
});

/**
 * How the strategy's rules stand, coin by coin.
 *
 * This is the only surface holding live market state, so it is the only place
 * "would this rule fire right now" can be asked. Each test below guards one of
 * the three things the payload carries that must not be flattened.
 */
describe('the conditions, resolved against real coins', () => {
  /**
   * The resolver joins each JSX expression as its own fragment, so an
   * interpolated sentence arrives with doubled spaces. Collapsing them lets a
   * test assert the sentence a reader sees rather than the whitespace the
   * harness produced.
   */
  const said = (text: string): string => text.replace(/\s+/g, ' ');

  /** Berlin's `REGIME_DOWN`, as `get_strategy` sends it (live, 2026-08-04). */
  const CONDITION = {
    conditionKey: 'REGIME_DOWN',
    name: 'Regime trending down',
    verdict: null,
    definition: {
      kind: 'clause',
      column: { sectionKey: 'includeRegimeContext', header: 'regTrend_now' },
      op: 'is',
      label: 'trending down',
    },
  };

  /** A strategy that defines conditions, previewed with the outcomes it got back. */
  function conditionedWorld(over: { defined?: number; outcomes?: boolean } = {}) {
    const strategies = previewWorld();
    const summary = aStrategy();
    const defined = over.defined ?? 1;
    strategies.detail = {
      ...aDetail(summary),
      conditions: mapConditions(
        Array.from({ length: defined }, (_, i) => ({
          ...CONDITION,
          conditionKey: `${CONDITION.conditionKey}_${i}`,
        })),
      ),
    };
    strategies.conditionsAsGiven = [CONDITION];
    if (over.outcomes !== false) {
      strategies.previewOutcome = {
        kind: 'preview',
        preview: aReportPreview({ conditionOutcomes: [aTickerOutcome()] }),
      };
    }
    return strategies;
  }

  it('names each coin and shows the platform’s outcome for each condition on it', async () => {
    conditionedWorld();
    const r = await previewRendered('s1');
    expect(r.text).toContain('How these rules stand right now');
    expect(r.text).toContain('BTC');
    expect(r.text).toContain('Regime, HTF and ADX agree — up');
    expect(r.text).toContain('FALSE');
    expect(r.text).toContain('TRUE');
    // The claim of authorship, stated where the outcomes are.
    expect(r.text).toContain('Grid-Commander computes none of them');
  });

  it('shows the clause-level reason: what was observed against what was required', async () => {
    conditionedWorld();
    const r = await previewRendered('s1');
    expect(r.text).toContain('regTrend_now');
    expect(r.text).toContain('includeRegimeContext');
    // The pair that answers *why* the rule did not fire. A verdict alone tells
    // an author their rule failed and leaves them to guess which part.
    expect(r.text).toContain('trending up');
    expect(r.text).toContain('ranging');
  });

  it('marks a provisional outcome as still able to change', async () => {
    conditionedWorld();
    const r = await previewRendered('s1');
    expect(r.text).toContain('Provisional');
    expect(r.text).toContain('the bar is not closed');
    expect(r.text).toContain('1 still provisional');
  });

  it('a settled outcome is not dressed as a provisional one', async () => {
    const strategies = conditionedWorld();
    strategies.previewOutcome = {
      kind: 'preview',
      preview: aReportPreview({
        conditionOutcomes: [
          {
            ticker: 'ETH',
            outcomes: [
              {
                conditionKey: 'SETTLED',
                name: 'Settled',
                outcome: 'FALSE',
                provisional: false,
                counts: null,
                evidence: [],
              },
            ],
          },
        ],
      }),
    };
    const r = await previewRendered('s1');
    expect(r.text).toContain('FALSE');
    // The distinguishing label appears on a provisional outcome and nowhere
    // else. Rendering the two identically is the defect this guards.
    expect(r.text).not.toContain('Provisional');
    expect(r.text).not.toContain('still provisional');
  });

  it('shows unresolved beside held, never summed into it', async () => {
    const strategies = conditionedWorld();
    strategies.previewOutcome = {
      kind: 'preview',
      preview: aReportPreview({
        conditionOutcomes: [
          {
            ticker: 'SOL',
            outcomes: [
              {
                conditionKey: 'THREE_OF_FIVE',
                name: 'Three of five',
                outcome: 'UNRESOLVED',
                provisional: false,
                counts: { trueCount: 2, total: 5, unresolvedCount: 2 },
                evidence: [],
              },
            ],
          },
        ],
      }),
    };
    const r = await previewRendered('s1');
    expect(said(r.text)).toContain('2 of 5 members held');
    expect(r.text).toContain('2 could not be resolved');
    expect(r.text).toContain('neither held nor failed');
    // The number that must not exist: three that did not hold. Two failed and
    // two were unresolved, and calling it three is the collapse.
    expect(r.text).not.toContain('3 did not hold');
  });

  it('a condition that is not a threshold group shows no counts at all', async () => {
    conditionedWorld();
    const r = await previewRendered('s1');
    // `counts: null` on ALL_AGREE_UP. Absent is not zero of zero.
    expect(r.text).not.toContain('0 of 0');
  });

  it('an evidence form the product does not model is reported, and the rest renders', async () => {
    const strategies = conditionedWorld();
    strategies.previewOutcome = {
      kind: 'preview',
      preview: aReportPreview({
        conditionOutcomes: [
          {
            ticker: 'BTC',
            outcomes: [
              {
                conditionKey: 'MIXED',
                name: 'Mixed',
                outcome: 'FALSE',
                provisional: false,
                counts: null,
                evidence: [
                  { kind: 'unmodelled', outcome: 'FALSE', reason: 'an explanation of a kind Grid-Commander does not model: "conditionRef"' },
                ],
              },
            ],
          },
        ],
      }),
    };
    const r = await previewRendered('s1');
    expect(r.text).toContain('Mixed');
    expect(r.text).toContain('Not understood by Grid-Commander');
    expect(r.text).toContain('does not model');
  });

  it('a strategy with no conditions says direction is decided by its signals', async () => {
    previewWorld();
    const r = await previewRendered('s1');
    expect(r.text).toContain('defines no conditions');
    expect(r.text).toContain('signals alone');
  });

  it('conditions with no outcome is a different sentence from no conditions', async () => {
    const strategies = conditionedWorld({ defined: 2 });
    strategies.previewOutcome = { kind: 'preview', preview: aReportPreview() };
    const r = await previewRendered('s1');
    // Two empty lists, two different facts. A reader shown the same words for
    // both cannot tell which they have.
    expect(said(r.text)).toContain('defines 2 conditions');
    expect(r.text).toContain('returned no outcome');
    expect(r.text).not.toContain('defines no conditions');
  });
});
