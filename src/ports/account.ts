import type { BattlegridSubject } from '@/domain/connection/subject.js';
import type { FailureCause } from './failure.js';

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

/**
 * What the account holds, and what it is allowed to do.
 *
 * **A second interface rather than a second method on `AccountPort`**, and the
 * reason is a contract rather than tidiness: the two have opposite failure
 * philosophies and one interface cannot honestly carry both.
 *
 * `subjectFor` runs *before* an identity exists and swallows every failure into
 * `null`, deliberately — a deployment that cannot establish its own account id
 * must still work, and refusing on an unknown is what made
 * `apply_strategy_plan` unreachable in the first place. This read is the
 * opposite: it is an ordinary product read whose whole value is telling
 * *unreadable* apart from *empty*, so it must carry a `FailureCause` out and a
 * surface must be able to say which happened.
 *
 * Put them on one port and every future reader has to remember which methods
 * lie about failure and which do not.
 */
export interface AccountStatePort {
  readAccountState(params: { userId: string; accessToken: string }): Promise<AccountStateResult>;
}

/**
 * The account's own figures, as `get_account_state` sends them.
 *
 * Every field here was unread until 2026-08-10 — the tool is named twice in
 * `src/` and neither is a call. `account-adapter.ts` explains why it was not
 * chosen to answer *which account is this* (it carries no id), and that
 * correct decision is why the balance went unread for the life of the product.
 */
export interface AccountState {
  /**
   * The account's spendable balance in USDC.
   *
   * **A decimal string on the wire** — `"43.667427"` — parsed here because a
   * caller comparing a cap against it needs a number, and every call site
   * parsing for itself is how two screens come to disagree about a balance.
   * `null` where the platform sent nothing parseable; never `0`, which is a
   * balance rather than the absence of one.
   */
  readonly balanceUsd: number | null;
  /**
   * Whether a funded account exists at all.
   *
   * `false` is a real answer and is not a balance of zero. An account nobody
   * has funded and an account spent down to nothing are different situations,
   * and only one of them is fixed by depositing.
   */
  readonly hasAccount: boolean;
  /** Whether the trading wallet is provisioned. Carried, not interpreted. */
  readonly tradingWalletProvisioned: boolean;
  /**
   * Whether this credential may stake money through MCP.
   *
   * Read and deliberately unrendered here — it belongs beside the arena, whose
   * write path it governs. Carried so the surface that wants it does not need
   * a second read. See `two-account-facts-nothing-renders`.
   */
  readonly mcpWagerEnabled: boolean;
  /** Agent slots: how many this account may run, and how many are in use. */
  readonly agentSlotLimit: number | null;
  readonly agentSlotsUsed: number | null;
}

export type AccountStateResult =
  | { readonly kind: 'state'; readonly state: AccountState }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };
