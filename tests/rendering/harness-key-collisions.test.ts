import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { rendered } from './support/render.js';

/**
 * The harness reading a key.
 *
 * `#194` concluded that no test in this project can observe a React key
 * collision, because the harness never reconciles. The first half of that is
 * true and the conclusion drawn from it was wrong: **the collision's *effect*
 * needs reconciliation, the *key* does not.** A React element is
 * `{$$typeof, type, key, ref, props}` — the key is a property of the object the
 * walker already visits, and React reconciles siblings within one array, which
 * is where the walk already iterates.
 *
 * The cost of the blind spot is on record. A test written for two colliding
 * key-less entries on `/strategies/[id]/conditions/save` passed against the
 * fixed code and against the broken code alike, verified by reverting the fix,
 * and was deleted rather than kept. The defect was then fixed with nothing able
 * to hold it fixed.
 *
 * These fixtures are built with `createElement` rather than JSX so the keys are
 * unmistakably the thing under test: `key` is the second argument's `key`
 * property, not something a transform decided.
 */

const li = (key: string | null, text: string) =>
  createElement('li', key === null ? {} : { key }, text);

describe('a key seen twice among siblings', () => {
  it('is reported', async () => {
    const r = await rendered(createElement('ul', {}, [li('a', 'one'), li('a', 'two')]));
    expect(r.duplicateKeys).toEqual(['a']);
  });

  it('is reported once per extra occurrence, so the count is the damage', async () => {
    const r = await rendered(
      createElement('ul', {}, [li('a', 'one'), li('a', 'two'), li('a', 'three')]),
    );
    // Three rows sharing one key render as one. Two rows are lost, and two is
    // what this reports.
    expect(r.duplicateKeys).toEqual(['a', 'a']);
  });

  it('still renders both nodes, which is exactly why text cannot catch it', async () => {
    const r = await rendered(createElement('ul', {}, [li('a', 'one'), li('a', 'two')]));
    // The assertion a reasonable test would make, passing while the page is
    // wrong. This is the failure #194 records, reproduced deliberately.
    expect(r.text).toContain('one');
    expect(r.text).toContain('two');
  });
});

describe('what is not a collision', () => {
  it('distinct keys are not', async () => {
    const r = await rendered(createElement('ul', {}, [li('a', 'one'), li('b', 'two')]));
    expect(r.duplicateKeys).toEqual([]);
  });

  it('siblings with no keys at all are not', async () => {
    // The guard that stops this collector inverting into a false positive.
    // Most elements are not in arrays and carry no key; folding `null` under
    // one pseudo-key would report a collision on nearly every page, and a loud
    // wrong answer is worse than the quiet blind spot it replaced.
    const r = await rendered(createElement('ul', {}, [li(null, 'one'), li(null, 'two')]));
    expect(r.duplicateKeys).toEqual([]);
  });

  it('the same key in two different arrays is not', async () => {
    // React reconciles within one array. Two lists that each have a row keyed
    // `a` are not in conflict, and reporting them would train people to ignore
    // this field.
    const r = await rendered(
      createElement('div', {}, [
        createElement('ul', { key: 'first' }, [li('a', 'one')]),
        createElement('ul', { key: 'second' }, [li('a', 'two')]),
      ]),
    );
    expect(r.duplicateKeys).toEqual([]);
  });

  it('a single keyed child is not', async () => {
    const r = await rendered(createElement('ul', {}, [li('a', 'one')]));
    expect(r.duplicateKeys).toEqual([]);
  });
});

describe('the collision is found wherever the array is', () => {
  it('inside a nested component', async () => {
    const List = () => createElement('ul', {}, [li('dup', 'one'), li('dup', 'two')]);
    const r = await rendered(createElement('section', {}, createElement(List, {})));
    // The walk calls nested components the way React would, so a collision
    // inside one is as visible as a collision at the top.
    expect(r.duplicateKeys).toEqual(['dup']);
  });

  it('inside an async server component', async () => {
    const List = async () => createElement('ul', {}, [li('dup', 'one'), li('dup', 'two')]);
    const r = await rendered(createElement('section', {}, createElement(List, {})));
    expect(r.duplicateKeys).toEqual(['dup']);
  });
});
