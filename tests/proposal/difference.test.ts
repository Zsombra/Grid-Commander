import { describe, expect, it } from 'vitest';
import {
  changesAnything,
  departsFromProposal,
  reconcile,
} from '@/domain/proposal/difference.js';

/**
 * The one place this change can go quietly wrong.
 *
 * The failure is not a crash. It is a page that merges "what was proposed" and
 * "what will happen" into one sentence, and so agrees on the operator's behalf.
 * Every test here is a way that could happen.
 */

describe('a proposal read against the world as it is now', () => {
  it('reports a value the target does not hold as a change', () => {
    const d = reconcile({
      proposed: { tradingMode: 'OFF' },
      current: { tradingMode: 'FULL_EXECUTION' },
      refused: [],
    });
    expect(d).toEqual([
      { key: 'tradingMode', kind: 'will-change', proposed: 'OFF', current: 'FULL_EXECUTION' },
    ]);
  });

  it('reports a value the target already holds as already true', () => {
    // Not dropped. A page showing only the changes would report a smaller
    // change than was proposed, which is the product deciding for the operator
    // which parts of a suggestion mattered.
    const d = reconcile({
      proposed: { tradingMode: 'OFF' },
      current: { tradingMode: 'OFF' },
      refused: [],
    });
    expect(d[0]?.kind).toBe('already-true');
  });

  it('compares nested values structurally, not by reference', () => {
    // Otherwise every nested object renders as a change and the operator is
    // asked to agree to nothing.
    const d = reconcile({
      proposed: { presets: { smallPct: 30, mediumPct: 40 } },
      current: { presets: { mediumPct: 40, smallPct: 30 } },
      refused: [],
    });
    expect(d[0]?.kind).toBe('already-true');
  });

  it('treats a key the target does not carry as a change, not a match', () => {
    // `undefined === undefined` would call this settled and hide a value being
    // introduced.
    const d = reconcile({ proposed: { note: undefined }, current: {}, refused: [] });
    expect(d[0]?.kind).toBe('will-change');
  });

  it('lets a refusal win over a match', () => {
    // A field the platform will not take is not "already true" even when it
    // happens to equal the current value — saying settled would tell an
    // operator a rejected field is fine.
    const d = reconcile({
      proposed: { maxDailyLossUsd: 5 },
      current: { maxDailyLossUsd: 5 },
      refused: [{ field: 'maxDailyLossUsd', reason: 'owned by the strategy' }],
    });
    expect(d[0]?.kind).toBe('refused');
    expect(d[0] && 'reason' in d[0] ? d[0].reason : '').toContain('strategy');
  });

  it('keeps every proposed key, whatever became of it', () => {
    const d = reconcile({
      proposed: { a: 1, b: 2, c: 3 },
      current: { a: 9, b: 2 },
      refused: [{ field: 'c', reason: 'no' }],
    });
    // Three in, three out. A page cannot show what it was never given.
    expect(d.map((x) => x.key)).toEqual(['a', 'b', 'c']);
    expect(d.map((x) => x.kind)).toEqual(['will-change', 'already-true', 'refused']);
  });
});

describe('whether agreeing would do anything', () => {
  it('is false when every part is already true', () => {
    const d = reconcile({ proposed: { a: 1 }, current: { a: 1 }, refused: [] });
    // The page must say so rather than offering a confirmation that performs
    // nothing: an operator agreeing to a no-op is charged a decision for it.
    expect(changesAnything(d)).toBe(false);
  });

  it('is false when every part is refused', () => {
    const d = reconcile({ proposed: { a: 1 }, current: { a: 2 }, refused: [{ field: 'a', reason: 'no' }] });
    expect(changesAnything(d)).toBe(false);
  });

  it('is true when any part would change', () => {
    const d = reconcile({ proposed: { a: 1, b: 2 }, current: { a: 1, b: 9 }, refused: [] });
    expect(changesAnything(d)).toBe(true);
  });
});

describe('whether the fresh read disagreed with the proposal', () => {
  it('is false when everything proposed will happen as asked', () => {
    const d = reconcile({ proposed: { a: 1 }, current: { a: 2 }, refused: [] });
    expect(departsFromProposal(d)).toBe(false);
  });

  it('is true when anything was already true or refused', () => {
    // This is what makes the page say "not all of this is still current"
    // instead of quietly performing a smaller change.
    expect(departsFromProposal(reconcile({ proposed: { a: 1 }, current: { a: 1 }, refused: [] }))).toBe(true);
    expect(
      departsFromProposal(
        reconcile({ proposed: { a: 1 }, current: { a: 2 }, refused: [{ field: 'a', reason: 'no' }] }),
      ),
    ).toBe(true);
  });
});

/**
 * A field the write **merges** rather than replaces.
 *
 * `tradingConfig` is the only one, and it is the one every "stop trading"
 * proposal names. `UpdateAgentCommand` folds the proposed members onto the
 * agent's current twenty and sends the result; comparing the partial against
 * the whole object can therefore only ever report a change, including for an
 * agent that is already off.
 *
 * That is not a cosmetic difference. The disposition table exists so an
 * operator can see what agreeing does; one that says "will change" about a
 * setting already in force is the product answering for them.
 */
describe('a value that is merged onto the target, not swapped for it', () => {
  const config = { tradingMode: 'OFF', maxDailyLossUsd: 300, maxLeverage: 5 };

  it('reads member by member, so an unchanged member says so', () => {
    const d = reconcile({
      proposed: { tradingConfig: { tradingMode: 'OFF' } },
      current: { tradingConfig: config },
      refused: [],
      merged: ['tradingConfig'],
    });
    expect(d).toEqual([{ key: 'tradingConfig.tradingMode', kind: 'already-true', proposed: 'OFF' }]);
    expect(changesAnything(d), 'agreeing would perform nothing').toBe(false);
  });

  it('names the member that changes, not the object it lives in', () => {
    const d = reconcile({
      proposed: { tradingConfig: { tradingMode: 'OFF', maxDailyLossUsd: 300 } },
      current: { tradingConfig: { ...config, tradingMode: 'APPROVAL_REQUIRED' } },
      refused: [],
      merged: ['tradingConfig'],
    });
    expect(d).toEqual([
      {
        key: 'tradingConfig.tradingMode',
        kind: 'will-change',
        proposed: 'OFF',
        current: 'APPROVAL_REQUIRED',
      },
      { key: 'tradingConfig.maxDailyLossUsd', kind: 'already-true', proposed: 300 },
    ]);
  });

  it('reports only the members proposed — the other seventeen are not a change', () => {
    // The merge keeps them. A row per untouched field would report a change
    // twenty times larger than the one being agreed to.
    const d = reconcile({
      proposed: { tradingConfig: { maxLeverage: 2 } },
      current: { tradingConfig: config },
      refused: [],
      merged: ['tradingConfig'],
    });
    expect(d.map((x) => x.key)).toEqual(['tradingConfig.maxLeverage']);
  });

  it('refuses the field whole, because the platform refuses the field and not a member', () => {
    const d = reconcile({
      proposed: { tradingConfig: { tradingMode: 'OFF' } },
      current: { tradingConfig: config },
      refused: [{ field: 'tradingConfig', reason: 'owned by the strategy' }],
      merged: ['tradingConfig'],
    });
    expect(d.map((x) => x.key)).toEqual(['tradingConfig']);
    expect(d[0]?.kind).toBe('refused');
  });

  it('falls back to the whole comparison when the target holds no config at all', () => {
    // Nothing to compare member against. Introducing a configuration is a
    // change, and saying so as one row is honest where inventing a row per
    // member would imply the agent held values it does not.
    const d = reconcile({
      proposed: { tradingConfig: { tradingMode: 'OFF' } },
      current: { tradingConfig: undefined },
      refused: [],
      merged: ['tradingConfig'],
    });
    expect(d).toEqual([
      {
        key: 'tradingConfig',
        kind: 'will-change',
        proposed: { tradingMode: 'OFF' },
        current: undefined,
      },
    ]);
  });

  it('leaves fields the caller did not name as merged alone', () => {
    // `displayName` is replaced, not merged. Expanding every object would make
    // the rule guess at what the write does with it.
    const d = reconcile({
      proposed: { positionSizePresets: { smallPct: 1 } },
      current: { positionSizePresets: { smallPct: 1, mediumPct: 2 } },
      refused: [],
      merged: ['tradingConfig'],
    });
    expect(d.map((x) => x.key)).toEqual(['positionSizePresets']);
    expect(d[0]?.kind, 'compared whole, so a partial is a change').toBe('will-change');
  });
});
