import { describe, expect, it } from 'vitest';
import { ProposalDifference } from '@/presentation/components/proposal-difference.js';
import { reconcile } from '@/domain/proposal/difference.js';
import { rendered } from './support/render.js';

/**
 * The page's most important paragraph, tested on its own.
 *
 * `/pending/[id]` is the only surface where "what was proposed" and "what will
 * happen" both exist. Every assertion here is a way the component could quietly
 * merge them and agree on the operator's behalf.
 */

const text = async (dispositions: Parameters<typeof ProposalDifference>[0]['dispositions']) =>
  (await rendered(ProposalDifference({ dispositions }))).text;

describe('what was proposed, beside what it does', () => {
  it('shows a value that will change, and what it changes from', async () => {
    const t = await text(
      reconcile({ proposed: { tradingMode: 'OFF' }, current: { tradingMode: 'FULL_EXECUTION' }, refused: [] }),
    );
    expect(t).toContain('tradingMode');
    expect(t).toContain('OFF');
    expect(t).toMatch(/will change, from\s+FULL_EXECUTION/);
  });

  it('shows a value that is already true rather than dropping it', async () => {
    // Dropping it would report a smaller change than was proposed — the
    // product deciding which parts of a suggestion mattered.
    const t = await text(reconcile({ proposed: { tradingMode: 'OFF' }, current: { tradingMode: 'OFF' }, refused: [] }));
    expect(t).toContain('tradingMode');
    expect(t).toMatch(/already the case/);
  });

  it('shows a refused value with the reason rather than omitting it', async () => {
    // Omitting it would report a larger change than will happen.
    const t = await text(
      reconcile({
        proposed: { maxDailyLossUsd: 5 },
        current: { maxDailyLossUsd: 9 },
        refused: [{ field: 'maxDailyLossUsd', reason: 'owned by the strategy' }],
      }),
    );
    expect(t).toMatch(/not accepted/);
    expect(t).toContain('owned by the strategy');
  });

  it('says plainly when this is not what was proposed', async () => {
    const t = await text(reconcile({ proposed: { a: 1 }, current: { a: 1 }, refused: [] }));
    // Before the table, because a reader who stops at the first sentence must
    // still learn that the suggestion no longer entirely applies.
    expect(t).toMatch(/not exactly what was proposed/);
    expect(t).toMatch(/read again just now/);
  });

  it('says nothing departed when the proposal still applies in full', async () => {
    const t = await text(reconcile({ proposed: { a: 1 }, current: { a: 2 }, refused: [] }));
    expect(t).not.toMatch(/not exactly what was proposed/);
  });

  it('says there is nothing to agree to when nothing would change', async () => {
    const t = await text(reconcile({ proposed: { a: 1 }, current: { a: 1 }, refused: [] }));
    expect(t).toMatch(/nothing to agree to/);
  });

  it('does not say that when something would change', async () => {
    const t = await text(reconcile({ proposed: { a: 1, b: 2 }, current: { a: 1, b: 9 }, refused: [] }));
    expect(t).not.toMatch(/nothing to agree to/);
  });

  it('distinguishes the three states in words, not by colour alone', async () => {
    const t = await text(
      reconcile({
        proposed: { a: 1, b: 2, c: 3 },
        current: { a: 9, b: 2 },
        refused: [{ field: 'c', reason: 'no' }],
      }),
    );
    // An operator must be able to tell these apart without seeing hue.
    expect(t).toMatch(/will change/);
    expect(t).toMatch(/already the case/);
    expect(t).toMatch(/not accepted/);
  });

  it('renders an unset current value as unset rather than as nothing', async () => {
    const t = await text(reconcile({ proposed: { note: 'x' }, current: {}, refused: [] }));
    expect(t).toMatch(/\(not set\)/);
  });
});
