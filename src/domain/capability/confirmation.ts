import { digestOf } from './digest.js';

/**
 * Evidence that a human was shown what a destructive operation would do.
 *
 * A boolean `confirmed: true` proves nothing — any caller can set it. A token
 * is issued alongside the rendered consequence and bound to the operation and
 * target it was issued for, so it cannot be replayed against a different
 * action.
 */
export interface ConfirmationToken {
  readonly token: string;
  readonly userId: string;
  readonly tool: string;
  /** The specific thing being changed — an agent id, a strategy id. */
  readonly target: string;
  /** The wording the user was actually shown. Stored so the audit can prove it. */
  readonly consequence: string;
  readonly expiresAt: Date;
  readonly consumedAt: Date | null;
}

/**
 * A confirmation as it travels to a write, and what it authorises.
 *
 * One value rather than two parameters, because a token and the target it is
 * bound to are one fact. They used to travel separately — the token from the
 * command, the target composed by the adapter — so the adapter decided what a
 * user had agreed to. Four adapters happened to include the operation's values;
 * the one for `update_intelligence_agent` did not, and that is the whole defect.
 */
export interface Confirmation {
  readonly token: string;
  /** Built with `confirmationTarget`. Never composed at a call site. */
  readonly target: string;
}

/**
 * Why a consume refused — each cause has a different next step for the
 * person who hit it: expired means review again, nothing is wrong;
 * already-used means the change may have landed; mismatched means the values
 * changed since they agreed; unknown means something is broken, not stale.
 */
export type ConfirmationRefusalCause = 'unknown' | 'mismatched' | 'already-used' | 'expired';

export interface ConfirmationStore {
  issue(token: ConfirmationToken): Promise<void>;
  /** Single-use. Returns null if unknown, expired, already used, or mismatched. */
  consume(token: string, userId: string, tool: string, target: string): Promise<ConfirmationToken | null>;
  /**
   * The post-mortem for a failed consume: read-only, called only after
   * `consume` returned null, so `consume` stays the single atomic spender.
   * A benign race between the two reads mis-names the cause at worst; it
   * never spends anything.
   */
  diagnose(token: string, userId: string, tool: string, target: string): Promise<ConfirmationRefusalCause>;
}

export function isValid(token: ConfirmationToken, now: Date): boolean {
  return token.consumedAt === null && token.expiresAt.getTime() > now.getTime();
}

/**
 * What a confirmation is bound to — built here, and nowhere else.
 *
 * `consume` matches the user, the tool, the target and the token. **Not the
 * values.** So the values have to be *in* the target, or an agreement about $25
 * authorises a submission carrying $25,000: same user, same tool, same agent.
 *
 * Four of five flows already did this, each composing the string itself, and the
 * fifth was written without it — the one carrying money. Five construction sites
 * where four happened to be right is the whole causal story of that defect, so
 * the fix is that there is one site, and it takes the values as arguments.
 *
 * That is the load-bearing property: `agentEdit` **cannot be called without the
 * intent**. The compiler enforces the binding; `edit-binding.test.ts` enforces
 * that nothing bypasses the compiler by composing a string inline.
 *
 * The two identity cases are here deliberately. Leaving a bare id inline would
 * mean the shared construction covers only *some* flows, and the guard would need
 * to know which — and a guard with an exception is a guard that gets exceptions
 * added instead of defects fixed.
 */
export const confirmationTarget = {
  /** Archive, reactivate. The operation carries no values beyond the agent. */
  agent: (agentId: string): string => agentId,

  /**
   * An edit, bound to the change that was described.
   *
   * `intent` is what the user submitted, **not what reaches the wire**.
   * `UpdateAgentCommand` merges the typed fields onto the agent's current config
   * and sends all twenty, because a partial `tradingConfig` does not error on
   * BattleGrid — it resets what it omits. Digesting the merge would bind the
   * agreement to an object the proposal never described. See DL-6.
   */
  agentEdit: (agentId: string, intent: Readonly<Record<string, unknown>>): string =>
    `agent:${agentId}#${digestOf(intent)}`,

  /**
   * Bound to the trio — this agent, that destination, *at the revision that
   * was described* — not to the verb. A token meaning only "a rebind was
   * confirmed" could carry agreement about one agent onto another (DL-5);
   * one bound to the pair alone could carry agreement about one revision of
   * the destination onto a configuration the user never saw described
   * (`rebind-is-not-bound-to-the-revision-it-read`).
   */
  agentRebind: (agentId: string, toStrategyId: string, toRevision: number): string =>
    `agent:${agentId}->strategy:${toStrategyId}@r${toRevision}`,

  /**
   * Deploying binds the *pair* — this agent, that market — and the verb.
   * Deploy and undeploy are opposite acts on the same pair, so they must not
   * share a target: a token agreeing to stop an agent could otherwise be
   * spent starting it. The timeframe and revision are deliberately not bound;
   * the platform's own `expectedRevision` check refuses a stale submission.
   */
  agentDeploy: (agentId: string, coinId: string): string =>
    `agent:${agentId}=>coin:${coinId}`,

  agentUndeploy: (agentId: string, coinId: string): string =>
    `agent:${agentId}=/=coin:${coinId}`,

  /**
   * Answering a proposed trade: bound to the verb, the decision, and the three
   * price levels that were on screen.
   *
   * **The verb is first because it is the part that must never be shared.**
   * `agentDeploy`/`agentUndeploy` are separate for exactly this reason — a
   * token agreeing to stop an agent must not start one — and here the asymmetry
   * is far worse than that pair. Cancelling commits nothing; accepting opens a
   * position at real size. A shared target would let an agreement to *decline* a
   * trade authorise *buying* it.
   *
   * The levels are in the target because BattleGrid publishes no revision on a
   * decision (PE-1), so there is no version to bind and the values are all
   * there is. `consume` matches the target, not the values, so values that are
   * not in the target are values nobody agreed to — the `agentEdit` precedent,
   * and the reason this whole module exists.
   *
   * Liveness is deliberately **not** bound here: `status` and `closedAt` move
   * on their own, so a token carrying them would refuse for the wrong reason
   * and at the wrong layer. `checkAnswerable` tests those against the re-read.
   */
  decisionAnswer: (
    verb: 'accept' | 'cancel',
    decisionId: string,
    levels: Readonly<{ entryPrice: number | null; stopLoss: number | null; takeProfit: number | null }>,
  ): string =>
    `decision:${decisionId}/${verb}#${digestOf({
      entryPrice: levels.entryPrice,
      stopLoss: levels.stopLoss,
      takeProfit: levels.takeProfit,
    })}`,

  /** Archive, restore. The revision comes from a re-read, not from the form. */
  strategy: (strategyId: string): string => strategyId,

  /**
   * Bound to the plan, not to the strategy: two plans for one strategy are two
   * different acts, and a confirmation for one must not authorise the other.
   *
   * Takes the digest rather than computing it, because BattleGrid's compile step
   * issues it and the plan carries it. Digesting the plan again here would be a
   * second opinion on which bytes constitute the intent.
   */
  strategyPlan: (strategyId: string, intentDigest: string): string =>
    `strategy:${strategyId}#${intentDigest}`,

  /**
   * Retuning one signal rule: bound to the strategy *at the revision that
   * was described*, the signal, and a digest of the exact values proposed.
   * Value-carrying and fleet-wide, so it gets both precedents at once —
   * `agentEdit`'s value digest and the rebind trio's revision. A tampered
   * hidden field, values or `expectedRevision` alike, fails the recomputed
   * target here before the platform is ever asked; the platform's own
   * CONFLICT check remains behind it. See DL-1.
   */
  strategyRule: (
    strategyId: string,
    revision: number,
    signalId: string,
    intent: Readonly<Record<string, unknown>>,
  ): string => `strategy:${strategyId}@r${revision}/rule:${signalId}#${digestOf(intent)}`,

  /**
   * Trimming the signal record: bound to the boundary *and the described
   * extent*. The record only appends at now, so the runs before a past moment
   * cannot grow — a changed count means another trim intervened between
   * describe and perform, and the agreement no longer describes what would
   * go. The one destructive act against this product's own store, and the
   * loss is permanent in a way BattleGrid's archives are not: nothing trimmed
   * can ever be re-recorded.
   */
  signalRecordTrim: (userId: string, before: Date, runs: number): string =>
    `signal-record:${userId}<-${before.toISOString()}#runs:${runs}`,
};

/** Long enough to read the consequence, short enough not to be left lying around. */
export const CONFIRMATION_TTL_SECONDS = 300;
