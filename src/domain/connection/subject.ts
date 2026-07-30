/**
 * BattleGrid's identity for an account, as a type the product cannot fabricate.
 *
 * A branded string, and the brand is the point. `Authority.userId` is also a
 * string — `'owner'` on a personal deployment, `random.token(16)` on a delegated
 * one — and for the life of the project it was passed where BattleGrid's account id
 * belonged. The comparison could never pass, so applying a compiled plan was
 * refused in every deployment configuration.
 *
 * Naming the field `battlegridSubject` was tried first and is not enough:
 * `battlegridSubject: req.userId` type-checks when both sides are `string`. That
 * was written into a decision log as *"supplying the local id no longer compiles"*
 * and it was false — caught by re-injecting the defect rather than by reasoning
 * about it. The brand makes the sentence true.
 *
 * `asSubject` is the only way to make one, so every value of this type came from
 * somewhere that genuinely holds BattleGrid's answer.
 */
export type BattlegridSubject = string & { readonly __battlegridSubject: unique symbol };

/**
 * Assert that a string is BattleGrid's identity for an account.
 *
 * Call this **only** where the value came from BattleGrid — an authorization
 * grant, a stored `battlegrid_subject`, or a read of the platform. Calling it on a
 * locally-minted id would reintroduce the defect this type exists to prevent, and
 * would be visible as exactly that at the call site.
 */
export function asSubject(value: string): BattlegridSubject {
  return value as BattlegridSubject;
}
