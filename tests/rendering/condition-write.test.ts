import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  aDetail,
  anApprovedPlan,
  aStrategy,
  berlinFullSendDown,
  berlinRegimeDown,
  FakeStrategiesPort,
} from '../support/strategy-fakes.js';
import { mapConditions } from '@/infrastructure/battlegrid/condition-mapper.js';
import { actingWith, notConnected } from './support/fake-acting.js';
import { rendered } from './support/render.js';

/**
 * The save surface: what an operator reads before agreeing to a condition write.
 *
 * The unit suite holds what is *composed* — the list, the drift check, the
 * binding. What is held here is what is *said*, because a describe that
 * computes a consequence nobody can read is the shape
 * `confirmation-is-human.test.ts` exists to forbid: the whole list rather than
 * the one condition, the references the edit would strand, the agents it
 * reaches, and — on every refusing branch — that nothing was written.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const params = <T extends Record<string, string>>(p: T): Promise<T> => Promise.resolve(p);

async function saveRendered(
  id: string,
  search: Record<string, string | string[] | undefined> = {},
) {
  const Page = (await import('../../app/(app)/strategies/[id]/conditions/save/page.js')).default;
  return rendered(await Page({ params: params({ id }), searchParams: Promise.resolve(search) }));
}

/** A strategy carrying Berlin's real conditions, and a compiler that echoes. */
function saveWorld() {
  const summary = aStrategy({ boundAgentCount: 3, revision: 5 });
  const strategies = new FakeStrategiesPort([summary]);
  const conditions = [berlinFullSendDown(), berlinRegimeDown()];
  strategies.detail = { ...aDetail(summary), conditions: mapConditions(conditions) };
  strategies.conditionsAsGiven = conditions;
  strategies.compilePlan = async (p: { request: Readonly<Record<string, unknown>> }) => {
    strategies.calls.push({ op: 'compile', payload: p.request });
    return {
      kind: 'compiled',
      approvedPlan: anApprovedPlan({
        postState: {
          ...(anApprovedPlan()['postState'] as Record<string, unknown>),
          tagline: summary.tagline,
          sections: [],
          conditions: (p.request['conditions'] ?? []) as Record<string, unknown>[],
        },
        bindingImpact: { boundAgentCount: 3 },
      }),
      reviewContext: { confirmationSummary: 'BattleGrid: UPDATE Midway (fork) r5 → r6.' },
      planToken: 'tok-plan',
    };
  };
  current = actingWith({ strategies });
  return strategies;
}

/** A composed `is` clause on one row, as the composer's form submits it. */
const A_DRAFT: Record<string, string> = {
  try: '1',
  key: 'FLOW_UP',
  name: 'Flow rising',
  verdict: 'UP',
  shape: 'single',
  'm0.kind': 'clause',
  'm0.section': 'includeRegimeContext',
  'm0.header': 'CVD_trend',
  'm0.op': 'gt',
  'm0.value': '0',
};

beforeEach(() => {
  current = actingWith();
});

describe('the surface before an edit is asked for', () => {
  it('shows what the strategy defines now and compiles nothing', async () => {
    const strategies = saveWorld();
    const r = await saveRendered('s1');
    expect(r.headings[0]).toContain('Midway (fork)');
    expect(r.text).toContain('FULL_SEND_DOWN');
    expect(r.text).toContain('REGIME_DOWN');
    expect(strategies.calls.some((c) => c.op === 'compile')).toBe(false);
  });

  it('states why one condition cannot be written on its own', async () => {
    saveWorld();
    const r = await saveRendered('s1');
    expect(r.text).toContain('BattleGrid has no tool that writes one condition');
    expect(r.text).toContain("resubmits the strategy's whole condition list");
  });

  it('offers a way to remove each one, and a way back to the composer', async () => {
    saveWorld();
    const r = await saveRendered('s1');
    expect(r.links).toContain('/strategies/s1/conditions/save?remove=REGIME_DOWN');
    expect(r.links).toContain('/strategies/s1/conditions');
    expect(r.links).toContain('/strategies/s1');
  });

  it('says a strategy with no conditions has none, rather than rendering nothing', async () => {
    const strategies = new FakeStrategiesPort([aStrategy()]);
    strategies.detail = aDetail();
    current = actingWith({ strategies });
    const r = await saveRendered('s1');
    expect(r.text).toContain('This strategy defines no conditions');
  });
});

describe('describing what saving a draft would do', () => {
  it('names the whole list, not only the condition being added', async () => {
    saveWorld();
    const r = await saveRendered('s1', A_DRAFT);
    expect(r.text).toContain('The whole list that would be submitted');
    expect(r.text).toContain('FULL_SEND_DOWN');
    expect(r.text).toContain('FLOW_UP');
    expect(r.text).toContain('Every one of these is resubmitted');
  });

  it('renders the consequence the token was issued against, blast radius and all', async () => {
    saveWorld();
    const r = await saveRendered('s1', A_DRAFT);
    // The platform's own account first, ours appended — never substituted.
    expect(r.text).toContain('BattleGrid: UPDATE Midway (fork) r5 → r6.');
    expect(r.text).toContain('3 agents are bound to this strategy');
    expect(r.text).toContain('takes the condition list whole');
  });

  it('offers the agreement as a form bound to an action, carrying the reviewed plan', async () => {
    saveWorld();
    const r = await saveRendered('s1', A_DRAFT);
    expect(r.text).toContain('Save this condition list');
    // Declining goes to the strategy, never to the roster.
    expect(r.links).toContain('/strategies/s1');
  });

  it('names what a removal would strand before anything is agreed to', async () => {
    saveWorld();
    const r = await saveRendered('s1', { remove: 'REGIME_DOWN' });
    expect(r.text).toContain('These references would have nothing to resolve');
    expect(r.text).toContain(
      'REGIME_DOWN is referred to by a condition in the list above and defined by none of them.',
    );
    expect(r.text).toContain('Shown, not blocked.');
  });
});

/**
 * The regression #194 could not write.
 *
 * `/strategies/[id]/conditions/save` lists what the whole submission would be,
 * and `named` maps every key-less entry to one literal placeholder. Keying the
 * list on that string rendered one row where the strategy would define two —
 * a miscount on the sentence directly above it, which states how many
 * conditions survive.
 *
 * That was fixed by keying on position. The test written to hold it fixed
 * passed against the broken code too, because the harness counted nodes and a
 * key collision only removes a node during reconciliation. It was deleted
 * rather than kept. `duplicateKeys` is what lets it exist.
 */
describe('a list whose entries have no keys', () => {
  /** Two conditions the platform returned with no key of their own. */
  function keylessWorld() {
    const strategies = saveWorld();
    const keyless = [
      { name: 'One without a key', verdict: 'DOWN', required: false, definition: { kind: 'group', op: 'AND', members: [] } },
      { name: 'Another without a key', verdict: 'UP', required: false, definition: { kind: 'group', op: 'AND', members: [] } },
    ] as Record<string, unknown>[];
    // Non-null: saveWorld() has just set it. Spreading the nullable field
    // would widen every property to optional.
    strategies.detail = { ...strategies.detail!, conditions: mapConditions(keyless) };
    strategies.conditionsAsGiven = keyless;
    return strategies;
  }

  it('renders one row per entry rather than collapsing them', async () => {
    keylessWorld();
    const r = await saveRendered('s1', A_DRAFT);
    expect(r.text).toContain('The whole list that would be submitted');
    // The placeholder appears for each key-less entry.
    expect(r.text).toContain('(an entry with no key)');
    // And the rows do not collide, which is the thing no assertion on `text`
    // or on node count could ever have said.
    expect(r.duplicateKeys).toEqual([]);
  });
});

describe('every branch that mints nothing says nothing was written', () => {
  it('a condition the strategy does not define', async () => {
    saveWorld();
    const r = await saveRendered('s1', { remove: 'NOT_THERE' });
    expect(r.text).toContain('This strategy defines no condition called NOT_THERE');
    // Distinguished from an empty form: the operator followed a link and is
    // entitled to know which they got.
    expect(r.text).not.toContain('Save this condition list');
  });

  it('a draft the composer never finished', async () => {
    const strategies = saveWorld();
    const r = await saveRendered('s1', { ...A_DRAFT, 'm0.op': 'nonsense' });
    // A row this parser cannot turn into a definition never reaches the
    // describe at all — nothing is compiled, and the reason is ours rather than
    // the platform's, so it is said as ours.
    expect(strategies.calls.some((c) => c.op === 'compile')).toBe(false);
    expect(r.text).toContain('This draft is not finished');
    expect(r.text).toContain('nothing was compiled and nothing was saved');
  });

  it('a draft carrying a form this product will not write back', async () => {
    const strategies = saveWorld();
    // Seeded from a condition whose definition maps to `unrecognised`: the
    // shape reaches the serialiser and is refused there, before any compile.
    strategies.conditionsAsGiven = [
      { conditionKey: 'ODD_ONE', name: 'Odd', verdict: null, definition: { kind: 'xor' } },
    ];
    strategies.detail = {
      ...aDetail(aStrategy()),
      conditions: mapConditions(strategies.conditionsAsGiven),
    };
    const r = await saveRendered('s1', {
      try: '1',
      from: 'ODD_ONE',
      key: 'ODD_TWO',
      name: 'Odd two',
      verdict: 'UP',
    });
    expect(strategies.calls.some((c) => c.op === 'compile')).toBe(false);
    expect(r.text).toContain('Part of this draft cannot be sent to BattleGrid');
    expect(r.text).toContain('Nothing was compiled and nothing was saved');
  });

  it('a plan whose post-state moved something this edit never named', async () => {
    const strategies = saveWorld();
    strategies.compilePlan = async () => ({
      kind: 'compiled',
      approvedPlan: anApprovedPlan({
        postState: {
          ...(anApprovedPlan()['postState'] as Record<string, unknown>),
          tagline: 'a tagline nobody asked to change',
          conditions: [berlinFullSendDown(), berlinRegimeDown()],
        },
      }),
      reviewContext: { confirmationSummary: 'BattleGrid: UPDATE' },
      planToken: 'tok-plan',
    });
    const r = await saveRendered('s1', A_DRAFT);
    expect(r.text).toContain('BattleGrid would save something other than what was submitted');
    expect(r.text).toContain('a tagline nobody asked to change');
    expect(r.text).toContain('Nothing was written');
    expect(r.text).not.toContain('Save this condition list');
  });

  it('a compiler refusal, in the platform’s own words', async () => {
    const strategies = saveWorld();
    strategies.compilePlan = async () => ({
      kind: 'rejected',
      reason: 'CONDITION_COLUMN_UNKNOWN: no column "CVD_trend" in this report',
      refusal: null,
    });
    const r = await saveRendered('s1', A_DRAFT);
    expect(r.text).toContain('CONDITION_COLUMN_UNKNOWN');
    expect(r.text).toContain('Nothing was written.');
  });

  it('a strategy that could not be read explains itself rather than reading as empty', async () => {
    const strategies = saveWorld();
    strategies.detailReadable = false;
    const r = await saveRendered('s1', A_DRAFT);
    expect(r.headings[0]).toContain('could not be read');
    expect(r.text).toContain('does not mean');
  });

  it('a refusal from the perform comes back on the same surface', async () => {
    saveWorld();
    const r = await saveRendered('s1', { ...A_DRAFT, problem: 'CONFLICT: revision 5 has moved' });
    expect(r.text).toContain('CONFLICT: revision 5 has moved');
  });

  it('someone who has not connected is asked to', async () => {
    current = { app: {}, user: notConnected };
    const r = await saveRendered('s1');
    expect(r.text).toContain('Connect');
  });
});

/**
 * A refusal the strategy's own prose caused, said as that.
 *
 * The body below is the real one, recorded live 2026-08-06 on the first removal
 * the condition-write probe attempted (#111). It is the only observation of
 * this shape, so it is the fixture — modelling it from a guess at what the
 * platform "probably" sends is how three of the dead paths in HANDOFF.md began.
 */
const MARKER_REFUSAL = JSON.stringify({
  code: 'VALIDATION_ERROR',
  message:
    "[market-read] strategy f34788df: marker '{ALL_AGREE_UP}' names neither a column this " +
    "strategy's report renders nor one of its conditions",
  details: {
    authoringCode: 'MARKET_READ_MARKER_UNKNOWN',
    path: ['marketReadText', 184],
    context: { token: 'ALL_AGREE_UP', lookupKind: 'reportHeader', nearestKey: 'ALL_AGREE_DOWN' },
  },
});

describe('a refusal the prose caused is named as that', () => {
  const refusing = (body: string) => {
    const strategies = saveWorld();
    strategies.compilePlan = async () => ({ kind: 'rejected', reason: body, refusal: null });
    return strategies;
  };

  it('says the description names it, and which marker', async () => {
    const strategies = saveWorld();
    // The adapter is what parses; here the port hands the parsed shape through.
    strategies.compilePlan = async () => ({
      kind: 'rejected',
      reason: MARKER_REFUSAL,
      refusal: {
        message: 'marker not known',
        authoringCode: 'MARKET_READ_MARKER_UNKNOWN',
        path: ['marketReadText', 184],
        context: { token: 'ALL_AGREE_UP', nearestKey: 'ALL_AGREE_DOWN' },
      },
    });
    const r = await saveRendered('s1', A_DRAFT);
    expect(r.text).toContain('own description names it');
    expect(r.text).toContain('ALL_AGREE_UP');
    // The platform's suggestion, attributed to the platform.
    expect(r.text).toContain('ALL_AGREE_DOWN');
    expect(r.text).toContain('Nothing was written');
    // The scenario's last clause: what they composed is still there. A refusal
    // that also discards the edit makes the operator start over on top of being
    // refused — the rule every other refusing branch here already follows.
    expect(r.text).toContain('FLOW_UP');
  });

  it('offers no suggestion of its own when the platform gave none', async () => {
    const strategies = saveWorld();
    strategies.compilePlan = async () => ({
      kind: 'rejected',
      reason: 'refused',
      refusal: {
        message: 'marker not known',
        authoringCode: 'MARKET_READ_MARKER_UNKNOWN',
        path: [],
        context: { token: 'ALL_AGREE_UP' },
      },
    });
    const r = await saveRendered('s1', A_DRAFT);
    expect(r.text).toContain('ALL_AGREE_UP');
    expect(r.text).not.toContain('nearest key it recognises');
  });

  it('leaves any other code as the platform worded it, unclassified', async () => {
    const strategies = saveWorld();
    strategies.compilePlan = async () => ({
      kind: 'rejected',
      reason: 'CONDITION_COLUMN_UNKNOWN: no column "CVD_trend" in this report',
      refusal: {
        message: 'no such column',
        authoringCode: 'CONDITION_COLUMN_UNKNOWN',
        path: [],
        context: { token: 'CVD_trend' },
      },
    });
    const r = await saveRendered('s1', A_DRAFT);
    expect(r.text).toContain('BattleGrid refused this change');
    expect(r.text).not.toContain('own description names it');
  });

  it('claims nothing from a refusal that carried no structure', async () => {
    refusing('BattleGrid is not answering right now');
    const r = await saveRendered('s1', A_DRAFT);
    expect(r.text).toContain('BattleGrid refused this change');
    expect(r.text).toContain('BattleGrid is not answering right now');
    expect(r.text).not.toContain('own description names it');
  });
});


/**
 * #317 — the draft that comes back from a refusal is the draft that was sent.
 *
 * `editQuery` round-trips the query so a refused save returns to a describe over
 * the same edit. It used to keep only the first value of a repeated param and
 * drop the rest silently, so an operator who hand-edited the query — which the
 * `strategy-conditions-save` manifest names as a supported thing to do — could
 * get back a draft missing part of itself, and the page would describe an edit
 * nobody submitted.
 *
 * The collapse is still correct in `one()`, which wants a scalar. It was wrong
 * here, where the whole job is fidelity.
 */
describe('a draft carrying a repeated param survives the round trip', () => {
  it('keeps every value, not just the first', async () => {
    saveWorld();
    const r = await saveRendered('s1', { ...A_DRAFT, 'm0.value': ['0', '7'] });

    // The round-tripped query reaches the page as a link back to the composer
    // and as the confirm form's hidden `draft` field; which of the two renders
    // depends on the branch, so this asserts over both rather than pinning one.
    const carriers = [...r.links, ...r.values].filter(
      (v) => typeof v === 'string' && v.includes('m0.value'),
    );
    expect(carriers.length, 'the draft is carried back somewhere').toBeGreaterThan(0);
    for (const carried of carriers) {
      expect(carried).toContain('m0.value=0');
      expect(carried, 'the second value was dropped — #317').toContain('m0.value=7');
    }
  });

  it('still drops the problem it may have arrived with', async () => {
    saveWorld();
    const r = await saveRendered('s1', { ...A_DRAFT, problem: ['one', 'two'] });
    for (const carried of [...r.links, ...r.values]) {
      expect(carried).not.toContain('problem=one');
      expect(carried).not.toContain('problem=two');
    }
  });
});
