import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  aDetail,
  aReportPreview,
  aStrategy,
  aTickerOutcome,
  berlinFullSendDown,
  berlinRegimeDown,
  FakeStrategiesPort,
} from '../support/strategy-fakes.js';
import { mapConditions } from '@/infrastructure/battlegrid/condition-mapper.js';
import { actingWith, notConnected } from './support/fake-acting.js';
import { rendered } from './support/render.js';

/**
 * Composing a condition that does not exist, and asking BattleGrid what it
 * would do.
 *
 * The two reading surfaces are already covered — `conditions.test.ts` for what
 * a condition says, `preview.test.ts` for what it did. What is guarded here is
 * everything that is new about *drafting*: that the surface cannot save and
 * says so, that a form this product cannot express is refused before anything
 * is sent, that a platform refusal arrives in the platform's own words, and
 * that the operator is told which conditions travelled with their draft.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const params = <T extends Record<string, string>>(p: T): Promise<T> => Promise.resolve(p);

async function draftRendered(id: string, search: Record<string, string> = {}) {
  const Page = (await import('../../app/(app)/strategies/[id]/conditions/page.js')).default;
  return rendered(await Page({ params: params({ id }), searchParams: Promise.resolve(search) }));
}

/**
 * The resolver joins each JSX expression as its own fragment, so an
 * interpolated sentence arrives with doubled spaces. Collapsing them lets a
 * test assert the sentence a reader sees rather than the whitespace the harness
 * produced.
 */
const said = (text: string): string => text.replace(/\s+/g, ' ');

/** A strategy carrying Berlin's real conditions, ready to be drafted against. */
function draftWorld() {
  const summary = aStrategy();
  const strategies = new FakeStrategiesPort([summary]);
  strategies.detail = {
    ...aDetail(summary),
    conditions: mapConditions([berlinFullSendDown(), berlinRegimeDown()]),
  };
  strategies.conditionsAsGiven = [berlinFullSendDown(), berlinRegimeDown()];
  current = actingWith({ strategies });
  return strategies;
}

/** A composed `is` clause on one row, as the form submits it. */
const A_CLAUSE: Record<string, string> = {
  try: '1',
  key: 'MY_DRAFT',
  name: 'My draft',
  verdict: 'DOWN',
  shape: 'single',
  'm0.kind': 'clause',
  'm0.section': 'includeRegimeContext',
  'm0.header': 'regTrend_now',
  'm0.op': 'is',
  'm0.label': 'trending down',
};

beforeEach(() => {
  current = actingWith();
});

describe('the composer, before anything is drafted', () => {
  it('names the strategy and offers the grammar', async () => {
    draftWorld();
    const r = await draftRendered('s1');
    expect(r.headings[0]).toContain('Midway (fork)');
    expect(r.text).toContain('Try it');
    expect(r.text).toContain('a group over the rows below');
  });

  it('says it cannot save, rather than leaving an absent control to imply it', async () => {
    draftWorld();
    const r = await draftRendered('s1');
    expect(r.text).toContain('Nothing composed here is saved');
    // The composer's promise, narrowed to the form when saving got a route of
    // its own (`a-drafted-condition-can-be-saved`) and no further. The form
    // still writes nothing; what changed is that the sentence now says which
    // thing cannot save, rather than claiming the page has no way onward — a
    // claim a link would have quietly made false.
    expect(r.text).toContain('Nothing is saved by this form');
    expect(r.text).toContain('There is no control in it that writes to the strategy');
  });

  it('states the grammar it does not build, and where the whole grammar is read', async () => {
    draftWorld();
    const r = await draftRendered('s1');
    expect(said(r.text)).toContain('builds one level of grouping');
    expect(r.text).toContain('reads any depth');
    expect(r.links).toContain('/strategies/s1');
  });

  it('nothing is sent while nothing is drafted', async () => {
    const strategies = draftWorld();
    await draftRendered('s1');
    // The strategy is read — the composer is built against it — and the
    // platform is asked nothing.
    expect(strategies.calls.some((c) => c.op === 'preview')).toBe(false);
  });

  it('a strategy with no conditions still offers the composer', async () => {
    const strategies = new FakeStrategiesPort([aStrategy()]);
    strategies.detail = aDetail();
    current = actingWith({ strategies });
    const r = await draftRendered('s1');
    // The author who has never seen the layer work is exactly the one this
    // surface is for, so it is not gated on already having a condition.
    expect(r.text).toContain('Try it');
  });
});

describe('a drafted condition, resolved by the platform', () => {
  it('sends the draft with the strategy’s own conditions and shows the outcomes', async () => {
    const strategies = draftWorld();
    strategies.previewOutcome = {
      kind: 'preview',
      preview: aReportPreview({ conditionOutcomes: [aTickerOutcome()] }),
    };
    const r = await draftRendered('s1', A_CLAUSE);

    const call = strategies.calls.find((c) => c.op === 'preview');
    const sent = call?.payload?.['conditions'] as Array<Record<string, unknown>>;
    expect(sent).toHaveLength(3);
    expect(sent[2]).toMatchObject({ conditionKey: 'MY_DRAFT', name: 'My draft', verdict: 'DOWN' });
    // The strategy's own go as the platform sent them, byte for byte — never
    // rebuilt from the domain, which would drop an unrecognised form.
    expect(sent[0]).toEqual(berlinFullSendDown());

    // The outcomes render through the same component the preview surface uses,
    // so evidence, provisional marking and the three-state counts are the ones
    // already specified rather than a second rendering of them.
    expect(r.text).toContain('BTC');
    expect(r.text).toContain('regTrend_now');
    expect(r.text).toContain('Provisional');
    expect(r.text).toContain('Grid-Commander computes none of them');
  });

  it('draws the draft as structure, in the same words a saved condition is drawn in', async () => {
    draftWorld();
    const r = await draftRendered('s1', A_CLAUSE);
    expect(r.text).toContain('The draft');
    expect(r.text).toContain('My draft');
    // The reading component's own words, reached through the same code path
    // `/strategies/[id]` uses — the column named with its section, the operator
    // in words, the label quoted.
    expect(said(r.text)).toContain('regTrend_now (includeRegimeContext) is');
    expect(r.text).toContain('trending down');
    expect(r.text).toContain('calls DOWN');
  });

  it('a draft carrying no verdict is shown as a building block, not as an absence', async () => {
    draftWorld();
    const r = await draftRendered('s1', { ...A_CLAUSE, verdict: '' });
    expect(r.text).toContain('a named building block, calling nothing');
    expect(r.text).not.toContain('calls DOWN');
  });

  it('says the draft was sent alongside the strategy’s own conditions', async () => {
    draftWorld();
    const r = await draftRendered('s1', A_CLAUSE);
    expect(said(r.text)).toContain("Sent alongside the strategy's 2 own condition(s)");
    expect(r.text).toContain('had something to resolve against');
  });

  it('says when the draft stood in an existing condition’s place, and sends the key once', async () => {
    const strategies = draftWorld();
    const r = await draftRendered('s1', { ...A_CLAUSE, key: 'REGIME_DOWN' });

    const sent = strategies.calls.find((c) => c.op === 'preview')?.payload?.['conditions'] as Array<
      Record<string, unknown>
    >;
    expect(sent).toHaveLength(2);
    // One key, one condition. Two under the same key is a list with no answer
    // to which of them a reference names.
    expect(sent.filter((c) => c['conditionKey'] === 'REGIME_DOWN')).toHaveLength(1);
    expect(said(r.text)).toContain("Sent in place of the strategy's own REGIME_DOWN");
    expect(r.text).toContain('not the saved condition');
  });

  it('a group over several rows keeps its threshold and its members', async () => {
    const strategies = draftWorld();
    await draftRendered('s1', {
      try: '1',
      key: 'MY_GROUP',
      name: 'Two of three',
      verdict: 'UP',
      shape: 'group',
      groupOp: 'N_OF',
      n: '2',
      'm0.kind': 'ref',
      'm0.ref': 'REGIME_DOWN',
      'm1.kind': 'clause',
      'm1.header': 'rsi14',
      'm1.op': 'gte',
      'm1.value': '70',
      'm2.kind': 'clause',
      'm2.section': 'includeCvd',
      'm2.header': 'CVD_trend',
      'm2.op': 'in',
      'm2.labels': 'rising, flat',
    });
    const sent = strategies.calls.find((c) => c.op === 'preview')?.payload?.['conditions'] as Array<
      Record<string, unknown>
    >;
    expect(sent[2]?.['definition']).toEqual({
      kind: 'group',
      op: 'N_OF',
      n: 2,
      members: [
        { kind: 'conditionRef', conditionKey: 'REGIME_DOWN' },
        // A column belonging to no section keeps its declared null rather than
        // becoming an empty string, which would address nothing.
        { kind: 'clause', column: { sectionKey: null, header: 'rsi14' }, op: 'gte', value: 70 },
        {
          kind: 'clause',
          column: { sectionKey: 'includeCvd', header: 'CVD_trend' },
          op: 'in',
          labels: ['rising', 'flat'],
        },
      ],
    });
  });

  it('an explicit coin selection reaches the platform as composed', async () => {
    const strategies = draftWorld();
    await draftRendered('s1', { ...A_CLAUSE, tickers: 'BTC, ETH' });
    expect(strategies.calls.find((c) => c.op === 'preview')?.payload).toMatchObject({
      coinSelection: { mode: 'explicit', tickers: ['BTC', 'ETH'] },
    });
  });

  it('trying a draft writes nothing', async () => {
    const strategies = draftWorld();
    await draftRendered('s1', A_CLAUSE);
    // The preview is the only platform call this surface can make. No compile,
    // no apply, no rule write — there is nothing on the page that could.
    expect(strategies.calls.every((c) => c.op === 'preview')).toBe(true);
  });
});

describe('starting from a condition the strategy already has', () => {
  it('offers every existing condition as a starting point, identity and all', async () => {
    draftWorld();
    const r = await draftRendered('s1');
    expect(r.text).toContain('Start from one this strategy already has');
    // The source's own verdict rides the link. A bare click must not demote a
    // directional call to a building block, and the verdict select always
    // submits a definite value.
    expect(r.links).toContain(
      '/strategies/s1/conditions?try=1&from=FULL_SEND_DOWN&key=FULL_SEND_DOWN&name=Full%20send%20%E2%80%94%20down&verdict=DOWN',
    );
    expect(r.links.some((l) => l.includes('from=REGIME_DOWN') && l.endsWith('verdict='))).toBe(
      true,
    );
  });

  it('takes the definition whole, at a depth the rows cannot build', async () => {
    const strategies = draftWorld();
    await draftRendered('s1', {
      try: '1',
      from: 'FULL_SEND_DOWN',
      key: 'FULL_SEND_UP',
      name: 'Full send — up',
      verdict: 'UP',
    });
    const sent = strategies.calls.find((c) => c.op === 'preview')?.payload?.['conditions'] as Array<
      Record<string, unknown>
    >;
    const draft = sent.find((c) => c['conditionKey'] === 'FULL_SEND_UP');
    // The identity is the operator's, the definition is the strategy's — which
    // is what makes this a question rather than a re-read of what it holds.
    expect(draft?.['verdict']).toBe('UP');
    expect(draft?.['definition']).toEqual(berlinFullSendDown()['definition']);
  });

  it('a stale link says the condition is gone rather than showing a blank form', async () => {
    const strategies = draftWorld();
    const r = await draftRendered('s1', { try: '1', from: 'NO_SUCH_KEY' });
    expect(said(r.text)).toContain('defines no condition called NO_SUCH_KEY');
    expect(r.text).toContain('renamed or removed');
    expect(strategies.calls.some((c) => c.op === 'preview')).toBe(false);
  });

  it('says the rows are ignored while a seed is carried', async () => {
    draftWorld();
    const r = await draftRendered('s1', { try: '1', from: 'REGIME_DOWN', verdict: '' });
    expect(said(r.text)).toContain('taken whole from REGIME_DOWN');
    // The holding control is among what the seed overrides, and the note
    // says so — an ignored control the page is silent about is the defect
    // class `A Field Offered Reaches The Operation It Configures` names.
    expect(said(r.text)).toContain('the holding choice are ignored');
    expect(r.text).toContain('Start from scratch');
  });

  it('offers the holding choice, optional first as the platform’s default', async () => {
    draftWorld();
    const r = await draftRendered('s1');
    expect(r.text).toContain('optional — BattleGrid’s default');
    expect(r.text).toContain('required — the strategy insists on it');
  });

  it('composes required only on the explicit choice, and optional on everything else', async () => {
    for (const [holding, expected] of [
      ['must-hold', true],
      ['', false],
      ['REQUIRED', false], // a value the select does not offer understates
    ] as const) {
      const strategies = draftWorld();
      await draftRendered('s1', { ...A_CLAUSE, holding });
      const sent = strategies.calls.find((c) => c.op === 'preview')?.payload?.[
        'conditions'
      ] as Array<Record<string, unknown>>;
      const draft = sent.find((c) => c['conditionKey'] === 'MY_DRAFT');
      expect(draft?.['required'], `holding=${holding}`).toBe(expected);
    }
  });

  it('a seeded condition carrying a form we cannot express is refused, and nothing is sent', async () => {
    const strategies = draftWorld();
    // A grammar the platform has extended and this product has not caught up
    // with — the case the layer's whole history says will happen again. The
    // mapper reads it as unrecognised, which is right for a reader; writing it
    // back would mean inventing a shape for it.
    const extended = {
      conditionKey: 'FROM_THE_FUTURE',
      name: 'A shape nobody models',
      verdict: 'UP',
      definition: { kind: 'group', op: 'XOR', members: [{ kind: 'conditionRef', conditionKey: 'FLOW_UP' }] },
    };
    strategies.detail = {
      ...aDetail(aStrategy()),
      conditions: mapConditions([extended]),
    };
    strategies.conditionsAsGiven = [extended];

    const r = await draftRendered('s1', { try: '1', from: 'FROM_THE_FUTURE' });
    expect(r.text).toContain('cannot be sent to BattleGrid');
    expect(r.text).toContain('unknown group operator "XOR"');
    expect(r.text).toContain('a guessed shape would reach the platform');
    // The whole point: nothing left this product.
    expect(strategies.calls.some((c) => c.op === 'preview')).toBe(false);
    // And the draft still renders, with the part nobody models named rather
    // than dropped — the reading behaviour the strategy page already has.
    expect(r.text).toContain('Not understood by Grid-Commander');
  });
});

describe('what stops before the platform is asked', () => {
  it('a half-filled row is named as ours, and nothing is sent', async () => {
    const strategies = draftWorld();
    const r = await draftRendered('s1', {
      try: '1',
      key: 'MY_DRAFT',
      shape: 'single',
      'm0.kind': 'clause',
      'm0.op': 'is',
      // No header, so there is no column to compare against and no definition
      // to build.
    });
    expect(r.text).toContain('This draft is not finished');
    expect(r.text).toContain('names no column header');
    expect(strategies.calls.some((c) => c.op === 'preview')).toBe(false);
  });

  it('an empty submission says so rather than asking BattleGrid an empty question', async () => {
    const strategies = draftWorld();
    const r = await draftRendered('s1', { try: '1', key: 'MY_DRAFT', shape: 'single' });
    expect(r.text).toContain('fill in at least one row');
    expect(strategies.calls.some((c) => c.op === 'preview')).toBe(false);
  });

  it('a single-row draft with several rows filled asks which was meant', async () => {
    draftWorld();
    const r = await draftRendered('s1', {
      ...A_CLAUSE,
      'm1.kind': 'ref',
      'm1.ref': 'FLOW_UP',
    });
    expect(said(r.text)).toContain('Choose a group, or clear the extra rows');
  });

  it('the composer comes back carrying what was typed', async () => {
    draftWorld();
    const r = await draftRendered('s1', A_CLAUSE);
    // A refused or finished attempt must not blank the form — the fix is on
    // the page the operator is already looking at.
    expect(r.text).toContain('Try it');
  });
});

describe('a platform refusal is the platform’s to word', () => {
  it('shows BattleGrid’s reason on the same page, and invents no outcome', async () => {
    const strategies = draftWorld();
    strategies.previewOutcome = {
      kind: 'refused',
      reason: 'VALIDATION_ERROR: conditions[2].conditionKey must match ^[A-Z][A-Z0-9_]{1,39}$',
    };
    const r = await draftRendered('s1', { ...A_CLAUSE, key: 'my_draft' });
    expect(r.text).toContain('BattleGrid refused this draft');
    expect(r.text).toContain('must match');
    // An illegal key is not checked here on purpose: the platform's validator
    // names the offending path and what is legal in its place, and that
    // teaching is what this surface exists to show.
    expect(r.text).not.toContain('How these rules stand right now');
  });

  it('an unreadable strategy is not an empty composer', async () => {
    const strategies = new FakeStrategiesPort();
    strategies.detailReadable = false;
    current = actingWith({ strategies });
    const r = await draftRendered('s1');
    expect(r.headings[0]).toBe('The strategy could not be read');
    expect(r.text).toContain('BattleGrid did not respond');
  });

  it('an unauthenticated request is offered the path to connect', async () => {
    current = { app: actingWith().app, user: notConnected };
    const r = await draftRendered('s1');
    expect(r.text).toContain('connect');
  });
});
