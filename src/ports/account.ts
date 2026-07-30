import type { BattlegridSubject } from '@/domain/connection/subject.js';

/**
 * Which BattleGrid account a credential acts as.
 *
 * One question, so one port. It exists because `Authority` needs BattleGrid's
 * identity and a `bg_live_` key does not carry it: the delegated path is handed a
 * subject by the authorization grant, and a personal deployment has to ask.
 *
 * Separate from `AgentsPort` and `StrategiesPort` on purpose — neither is about
 * who we are, and widening one of them to answer it would put an identity read
 * behind a roster interface.
 */
export interface AccountPort {
  /**
   * BattleGrid's id for the account this credential belongs to, or `null`.
   *
   * **`null` is a real answer and must not be treated as a mismatch.** A
   * deployment that cannot establish its own account id must still be able to
   * work; the platform refuses anything genuinely foreign. Refusing on an
   * unknown is what made `apply_strategy_plan` unreachable in the first place.
   */
  subjectFor(accessToken: string): Promise<BattlegridSubject | null>;
}
