import { describe, expect, it } from 'vitest';
import { asSubject, type BattlegridSubject } from '@/domain/connection/subject.js';

/**
 * The brand is the guard, so something has to guard the brand.
 *
 * `refuseLocally` compares BattleGrid's account id against
 * `Authority.battlegridSubject`, and the only thing stopping a future change from
 * routing the product's own `userId` there again is that `BattlegridSubject` is a
 * branded type. Widen it to `string` and every call site starts compiling again,
 * silently — `apply_strategy_plan` goes back to being refused in every deployment,
 * and no test in this suite would notice.
 *
 * Vitest does not typecheck, so an ordinary assertion cannot express this.
 * `@ts-expect-error` can: `tsc` fails when the error it claims does **not** occur.
 * These lines are therefore checked by `npm run typecheck`, and they fail the moment
 * the brand is removed.
 *
 * This gap was found by verifying the change that introduced the brand. The brand
 * itself was found by re-injecting the defect and discovering that a rename — which
 * a decision log had already claimed was sufficient — enforced nothing.
 */
describe('BattleGrid’s identity cannot be confused with the product’s own', () => {
  it('does not accept a plain string where a subject belongs', () => {
    // @ts-expect-error a locally-minted id is not BattleGrid's identity
    const fromLocalId: BattlegridSubject = 'owner';
    // @ts-expect-error nor is a random one
    const fromRandom: BattlegridSubject = '9f2c1ab30e5d4471';

    // Referenced so the assignments are not dead code, and so the test also
    // states the runtime truth: the brand costs nothing at runtime.
    expect(String(fromLocalId)).toBe('owner');
    expect(String(fromRandom)).toHaveLength(16);
  });

  it('accepts one asserted at a boundary that genuinely holds it', () => {
    // `asSubject` is the only constructor, so every value of this type came from
    // somewhere that holds BattleGrid's answer — a grant, a stored subject, or a
    // read of the platform.
    const subject: BattlegridSubject = asSubject('bb334a1e-2ac2-4956-8dea-7c7cf01097b9');
    expect(subject).toBe('bb334a1e-2ac2-4956-8dea-7c7cf01097b9');
  });
});
