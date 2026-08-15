import type { AnswerRefusal, DecisionLevels } from '@/domain/agent/pending-decision.js';
import { checkAnswerable } from '@/domain/agent/pending-decision.js';
import type { Confirmation } from '@/domain/capability/confirmation.js';
import type { AgentsPort, DecisionAnswerVerb, EntryDecision } from '@/ports/agents.js';

/**
 * Answering a trade an agent proposed.
 *
 * The order here is the safety property, and it is the only reason this class
 * exists rather than the surface calling the port:
 *
 *   1. re-read the decision
 *   2. verify all five binding conditions against that read
 *   3. only then let the port run its own guards and perform the write
 *
 * Step 2 cannot be skipped by a caller, because the port method is not reachable
 * from anywhere else in the application layer. Step 3's guards — classification,
 * scope, the confirmation consume, the audit row — all live behind the port and
 * are not duplicated here; duplicating them would create a second opinion about
 * whether a write was allowed.
 */

export interface AnswerDecisionRequest {
  readonly userId: string;
  readonly accessToken: string;
  readonly agentId: string;
  readonly decisionId: string;
  readonly verb: DecisionAnswerVerb;
  /**
   * The three price levels as they were rendered to the operator.
   *
   * Carried from the surface rather than re-derived, because the whole question
   * is whether what is true now matches what they saw. Re-deriving it here from
   * a fresh read would compare the platform against itself and always agree.
   */
  readonly shown: DecisionLevels;
  readonly confirmation: Confirmation;
  readonly idempotencyKey?: string | undefined;
}

export type AnswerDecisionResult =
  | { readonly kind: 'answered'; readonly verb: DecisionAnswerVerb; readonly decisionId: string }
  | { readonly kind: 'refused'; readonly refusal: AnswerRefusal };

export class AnswerDecisionCommand {
  constructor(private readonly agents: AgentsPort) {}

  async execute(req: AnswerDecisionRequest): Promise<AnswerDecisionResult> {
    const current = await this.findDecision(req);

    const check = checkAnswerable(req.shown, current);
    if (check.kind === 'refused') {
      // Nothing is sent, and nothing is audited. A refusal here never reached
      // BattleGrid, so recording it as an attempt would put an operation in the
      // user's audit log that never left this process — the same reasoning the
      // guard path already applies to a scope refusal.
      return { kind: 'refused', refusal: check.refusal };
    }

    await this.agents.answerEntryDecision({
      userId: req.userId,
      accessToken: req.accessToken,
      decisionId: req.decisionId,
      verb: req.verb,
      confirmation: req.confirmation,
      idempotencyKey: req.idempotencyKey,
    });

    return { kind: 'answered', verb: req.verb, decisionId: req.decisionId };
  }

  /**
   * The decision as it is right now, or null if it cannot be found.
   *
   * An unreadable stage is deliberately treated the same as a missing decision:
   * both mean this product cannot currently say what it would be answering, and
   * in that state the only safe act is to refuse. Distinguishing them would
   * offer the operator a difference they cannot act on differently.
   */
  private async findDecision(req: AnswerDecisionRequest): Promise<EntryDecision | null> {
    const stage = await this.agents.readEntryDecisions({
      userId: req.userId,
      accessToken: req.accessToken,
      agentId: req.agentId,
    });
    if (stage.kind !== 'entries') return null;
    return stage.entries.find((d) => d.id === req.decisionId) ?? null;
  }
}
