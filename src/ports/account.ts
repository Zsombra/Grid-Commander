import type { Scope } from '@/domain/connection/scope.js';
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
/**
 * BattleGrid's id for an account, or why it could not be named.
 *
 * Three outcomes, kept as three, because two callers read them oppositely and
 * one of them needs to tell an operator what happened. A call that did not come
 * back and a call that came back naming nobody are different situations: the
 * first may be an outage and the second is the platform answering a question
 * about an account it does not recognise. Collapsing them is how the original
 * defect read as "BattleGrid is down" when it was really "we asked the wrong
 * thing".
 */
export type AccountIdentityResult =
  /** BattleGrid named the account. */
  | { readonly kind: 'subject'; readonly subject: BattlegridSubject }
  /** No usable answer came back — the tool is gone, the call failed, or the payload was not one. */
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause }
  /** An answer came back, and it named no account. */
  | { readonly kind: 'unnamed'; readonly reason: string };

export interface AccountPort {
  /**
   * Which BattleGrid account this credential acts as.
   *
   * **This port reports; it does not decide.** An unknown identity is survivable
   * for one caller and fatal for the other, so the policy lives at each call
   * site rather than here:
   *
   * - `OwnerOnlyUser` **must** keep working without an answer. Its `userId` is
   *   the constant `'owner'`, so an identity exists regardless, and refusing on
   *   an unknown is exactly what made `apply_strategy_plan` unreachable in the
   *   first place. It collapses every non-answer to `null`, and says so there.
   * - `CompleteConnectionCommand` **cannot**. For a delegated connection the
   *   subject *is* the key the workspace is found by, so an unknown there would
   *   collide every unidentified connection on one key and hand the second user
   *   the first one's account. It refuses, and releases the grant.
   *
   * This used to return `BattlegridSubject | null` with the first caller's
   * tolerance baked in as the contract. It was correct for that caller and
   * quietly wrong for any other, which is the kind of rule this codebase has
   * been bitten by repeatedly: one written for the case in front of it, read
   * later as if it were general.
   *
   * **`grantedScopes` is required by the delegated caller and omitted by the
   * personal one**, and the asymmetry is the whole lesson of 2026-08-13. The
   * guard that decides whether a call may go out reads a user's authority from
   * their stored connection. This read happens *before* that connection exists,
   * so the lookup answers "no authority at all" and the call is refused for
   * lacking the very scope the grant in hand is holding. A personal deployment
   * never hits it, because its scopes come from configuration — which is why
   * every test, and both live probes, passed while the delegated path could not
   * complete a single connection.
   *
   * Pass the scopes the grant carries. Omit them only where the deployment's
   * authority is already known without a connection.
   */
  subjectFor(
    accessToken: string,
    grantedScopes?: readonly Scope[] | undefined,
  ): Promise<AccountIdentityResult>;
}

/**
 * What the account holds, and what it is allowed to do.
 *
 * **A second interface rather than a second method on `AccountPort`**, and the
 * reason is a contract rather than tidiness: the two have opposite failure
 * philosophies and one interface cannot honestly carry both.
 *
 * `subjectFor` runs *before* an identity exists: it takes a bare credential,
 * because there is no user yet to attribute the call to. This read is an
 * ordinary product read for a user we already know — it takes `{userId,
 * accessToken}`, is audited and scoped like every other, and its whole value is
 * telling *unreadable* apart from *empty* on a surface someone is looking at.
 *
 * **The original justification for this split no longer holds, and the split
 * does.** It was written as "one lies about failure and one does not":
 * `subjectFor` swallowed everything into `null` while this carried a
 * `FailureCause` out. Both now report honestly, so that sentence is retired —
 * but the preconditions still differ, and a port whose methods disagree about
 * whether an identity exists yet is one every future reader has to hold two
 * mental models for.
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
