import type { DecisionLevels } from '@/domain/agent/pending-decision.js';
import { isAnswerable, levelsOf } from '@/domain/agent/pending-decision.js';
import type { ConfirmationStore } from '@/domain/capability/confirmation.js';
import { confirmationTarget, CONFIRMATION_TTL_SECONDS } from '@/domain/capability/confirmation.js';
import type { AgentsPort, DecisionAnswerVerb, EntryDecision } from '@/ports/agents.js';
import type { Clock } from '@/ports/clock.js';
import type { FailureCause } from '@/ports/failure.js';
import type { Randomness } from './connect.commands.js';

/**
 * One decision, described against the platform as it is right now, with the
 * confirmation that answering it will spend.
 *
 * The describe runs when the page is **opened**, not when the decision was
 * proposed — so the levels the operator reads, the consequence sentence, and
 * the token bound to both are all formed from one read taken at the moment
 * somebody is actually looking. This is the same shape `OpenProposalQuery` uses
 * for the same reason, and the reason is that a consequence computed earlier is
 * a claim about a world that may have moved.
 *
 * It does **not** perform anything. The re-read that guards the write is a
 * second, later read inside `AnswerDecisionCommand`; this one exists to render
 * and to mint. Two reads is the point — the binding compares them.
 */

/**
 * One verb, its consequence sentence, and the agreement that spends it.
 *
 * Kept per verb rather than per description because the two are not
 * interchangeable: `confirmationTarget.decisionAnswer` puts the verb *first*,
 * so a token minted to decline can never be spent opening the position.
 */
export interface DecisionAnswerOffer {
  readonly verb: DecisionAnswerVerb;
  /** The wording shown, stored on the token so the audit proves what was agreed. */
  readonly consequence: string;
  /**
   * Null when the connection cannot answer.
   *
   * A decision stays **fully readable** without fund-committing authority — the
   * requirement says so explicitly — but no agreement is minted for an act the
   * product cannot perform. An unspendable token would be a row in the
   * confirmation store recording that somebody was offered a choice they were
   * never actually offered.
   */
  readonly confirmationToken: string | null;
}

export interface DecisionAnswerDescription {
  readonly decision: EntryDecision;
  /** Milliseconds until the platform stops accepting an answer, floored at zero. */
  readonly msRemaining: number | null;
  /**
   * One entry per verb the caller asked about, in the order asked.
   *
   * **Both verbs are described from a single read, deliberately.** Accept and
   * cancel are offered together (5.3), and describing them in two calls would
   * mean two reads: the levels rendered would come from one and the accept
   * token would be bound to the other's. They agree in practice — a PENDING
   * decision's levels do not move — and "agree in practice" is the reasoning
   * this repository has been burned by. One read, one set of levels, one
   * agreement per verb.
   */
  readonly answers: readonly DecisionAnswerOffer[];
  /**
   * The levels the token is bound to, carried into the perform.
   *
   * Sent back through the form rather than re-derived later: the whole question
   * the binding answers is whether what is true *now* matches what the operator
   * *saw*, and a value re-read at perform time would compare the platform
   * against itself and always agree.
   */
  readonly shown: DecisionLevels;
}

/**
 * Expired, cancelled elsewhere, or already executed — told apart from a cancel
 * the operator performed.
 *
 * A decision that closed while the queue was on screen is not an error and not
 * something they did. The requirement obliges the product to say it expired
 * unanswered rather than report a cancel that never happened.
 */
export type DescribeDecisionAnswerResult =
  | { readonly kind: 'answerable'; readonly description: DecisionAnswerDescription }
  | {
      readonly kind: 'no-longer-answerable';
      readonly decision: EntryDecision;
      readonly status: string | null;
      readonly closedAt: string | null;
    }
  | { readonly kind: 'gone' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

export class DescribeDecisionAnswerQuery {
  constructor(
    private readonly agents: AgentsPort,
    private readonly confirmations: ConfirmationStore,
    private readonly random: Randomness,
    private readonly clock: Clock,
  ) {}

  async execute(req: {
    userId: string;
    accessToken: string;
    agentId: string;
    decisionId: string;
    /**
     * The verbs to describe, in render order. One read serves all of them.
     */
    verbs: readonly DecisionAnswerVerb[];
    /**
     * Whether to issue a confirmation for this describe.
     *
     * False when the connection holds no fund-committing authority. The surface
     * decides that from `ReadAnswerAuthorityQuery`; it governs what is *drawn*
     * and minted, never whether a write is permitted — that refusal belongs to
     * `beginGuardedCall` and runs regardless (P1).
     */
    mintConfirmation: boolean;
  }): Promise<DescribeDecisionAnswerResult> {
    const stage = await this.agents.readEntryDecisions({
      userId: req.userId,
      accessToken: req.accessToken,
      agentId: req.agentId,
    });

    if (stage.kind === 'unreadable')
      return { kind: 'unreadable', reason: stage.reason, cause: stage.cause };
    if (stage.kind === 'none') return { kind: 'gone' };

    const decision = stage.entries.find((d) => d.id === req.decisionId);
    if (decision === undefined) return { kind: 'gone' };

    if (!isAnswerable(decision)) {
      return {
        kind: 'no-longer-answerable',
        decision,
        status: decision.status,
        closedAt: decision.closedAt,
      };
    }

    const shown = levelsOf(decision);
    const answers: DecisionAnswerOffer[] = [];

    for (const verb of req.verbs) {
      const consequence = describeAnswer(verb, decision);

      if (!req.mintConfirmation) {
        answers.push({ verb, consequence, confirmationToken: null });
        continue;
      }

      const confirmationToken = this.random.token(32);

      await this.confirmations.issue({
        token: confirmationToken,
        userId: req.userId,
        // Asked of the port rather than written here: the literal belongs to the
        // adapter (A10), and a second copy could drift into a token that can
        // never be consumed.
        tool: this.agents.answerDecisionTool(verb),
        /**
         * The verb, the decision and the three levels — never the decision alone.
         *
         * Accept and cancel produce **different** targets on purpose, so a token
         * issued for a decline can never be spent opening the position. The
         * precedent is `agentDeploy`/`agentUndeploy`, and the asymmetry here is
         * far worse than that pair's: one of these commits nothing and the other
         * spends real money.
         *
         * Both are minted from the **same** `shown`, which is what lets the two
         * offers be rendered side by side without either being bound to levels
         * the operator never saw.
         */
        target: confirmationTarget.decisionAnswer(verb, decision.id, shown),
        consequence,
        expiresAt: new Date(this.clock.now().getTime() + CONFIRMATION_TTL_SECONDS * 1000),
        consumedAt: null,
      });

      answers.push({ verb, consequence, confirmationToken });
    }

    return {
      kind: 'answerable',
      description: {
        decision,
        msRemaining: remainingMs(decision.expiresAt, this.clock.now().getTime()),
        answers,
        shown,
      },
    };
  }
}

/**
 * The consequence sentence, in the product's own words.
 *
 * No currency amount appears here and none may be added (PE-2): the platform
 * computes no size until the decision is accepted, so any figure would be this
 * product's arithmetic wearing the platform's authority, on a confirmation,
 * about money. The proportion is what the platform sent, and it is what is said.
 */
function describeAnswer(verb: DecisionAnswerVerb, decision: EntryDecision): string {
  const what = [decision.direction, decision.coinTicker].filter((p) => p !== null && p !== '').join(' ');
  const subject = what === '' ? 'this trade' : what;

  if (verb === 'cancel') {
    return `Cancels the proposed ${subject}. Nothing is bought or sold and no money moves. The agent will not propose this trade again on its own.`;
  }

  const proportion =
    decision.positionSizePct === null
      ? 'the proportion of its funds the agent chose'
      : `${decision.positionSizePct}% of the agent's available funds`;

  return `Opens a real position: ${subject}, staking ${proportion}. This spends your money at BattleGrid immediately, and the size is set by the platform at the moment you confirm.`;
}

function remainingMs(expiresAt: string | null, now: number): number | null {
  if (expiresAt === null) return null;
  const at = Date.parse(expiresAt);
  if (Number.isNaN(at)) return null;
  return Math.max(0, at - now);
}
