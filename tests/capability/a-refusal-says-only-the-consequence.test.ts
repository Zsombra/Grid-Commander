import { describe, expect, it } from 'vitest';
import { spending } from '@/presentation/confirmation-refusal.js';
import { ConfirmationRequiredError, RevisionConflictError } from '@/domain/errors.js';

/**
 * `spending()`, actually run.
 *
 * The module at the centre of the #232 fix shipped with no test that called
 * it. Every check on it was a scan over its own source — `spending(` appears
 * in a page, therefore the page is protected — which is how it reached nine
 * routes forwarding the wrong half of the error to the operator.
 *
 * `ConfirmationRequiredError` composes its `message` as
 * `"<tool>" is destructive and needs confirmation: <consequence>`. That
 * preamble contradicts every sentence it introduces on this path: the person
 * reading it *did* confirm. `consequence` is the half the product wrote for
 * them, and this pins which one arrives.
 */

const refusal = (consequence: string): ConfirmationRequiredError =>
  new ConfirmationRequiredError('update_intelligence_agent', consequence);

/** Stands in for `redirect()`, which is also a throw that never returns. */
const divert = (seen: string[]) => (problem: string): never => {
  seen.push(problem);
  throw new Error('DIVERTED');
};

describe('the refusal a spent confirmation earns', () => {
  it('carries the consequence, not the sentence that contradicts it', async () => {
    const seen: string[] = [];
    const spent = 'this confirmation was already used — the change may have landed; check its state before retrying';

    await expect(
      spending(() => Promise.reject(refusal(spent)), divert(seen)),
    ).rejects.toThrow('DIVERTED');

    expect(seen).toEqual([spent]);
    // The three things the preamble would have added, named individually so a
    // regression says which one came back.
    expect(seen[0], 'no raw MCP tool name reaches the operator').not.toContain(
      'update_intelligence_agent',
    );
    expect(seen[0], 'never tell someone who confirmed that confirmation is needed').not.toContain(
      'needs confirmation',
    );
    expect(seen[0]).not.toContain('is destructive');
  });

  it('says "expired" without telling someone who just agreed to agree first', async () => {
    const seen: string[] = [];
    const expired = 'the confirmation expired — nothing is wrong; review the change and agree to it again';

    await expect(
      spending(() => Promise.reject(refusal(expired)), divert(seen)),
    ).rejects.toThrow('DIVERTED');

    expect(seen).toEqual([expired]);
  });

  it('returns the result untouched when nothing refuses', async () => {
    const seen: string[] = [];
    const result = await spending(async () => ({ kind: 'updated' as const }), divert(seen));

    expect(result).toEqual({ kind: 'updated' });
    expect(seen, 'the refusal road must not be walked on success').toEqual([]);
  });

  it('re-throws anything that is not a refusal', async () => {
    // An outage, a lost connection and a bug have no next step to name.
    // Turning one into a `?problem=` would tell the operator a falsehood
    // about whose fault it was.
    const seen: string[] = [];
    const conflict = new RevisionConflictError('agent', 3, 4);

    await expect(spending(() => Promise.reject(conflict), divert(seen))).rejects.toBe(conflict);
    expect(seen).toEqual([]);
  });

  it('does not catch a redirect thrown by the refusal road itself', async () => {
    // `redirect()` works by throwing. `onRefused` runs inside the catch, so
    // its throw must escape rather than be re-caught — the property that lets
    // the redirect live outside the try.
    const nextRedirect = new Error('NEXT_REDIRECT');
    await expect(
      spending(
        () => Promise.reject(refusal('gone')),
        (): never => {
          throw nextRedirect;
        },
      ),
    ).rejects.toBe(nextRedirect);
  });
});
