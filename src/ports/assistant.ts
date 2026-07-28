import type { Answer, Consultation } from '@/domain/assistant/answer.js';
import type { AssistantDisclosure } from '@/domain/assistant/disclosure.js';
import type { ReadOnlyToolset } from '@/domain/assistant/toolset.js';

/**
 * Whatever answers the question.
 *
 * A port, deliberately: which model answers is a deployment decision that will
 * change, and none of this capability's requirements — read-only, attribution,
 * scoping, not-knowing — should move when it does. Every one of them is testable
 * against a fake returning scripted answers, which is the point. See design A-D.
 */
export interface AssistantPort {
  /**
   * `toolset` is the *only* set of operations available. An implementation MUST
   * NOT reach anything outside it, and `callTool` is the only way it can reach
   * anything at all.
   */
  answer(request: AssistantRequest): Promise<AssistantResponse>;

  /**
   * Where a question goes, for telling the user before they ask one.
   *
   * On the port rather than beside it: an implementation is the only thing that
   * knows whether answering leaves this product, and asking it is the only way
   * the disclosure cannot disagree with the deployment. A value read from
   * configuration in a second place would be a promise maintained by hand.
   *
   * Synchronous and free of the request, deliberately — it describes the
   * deployment, not an answer, and a page must be able to say it without
   * asking anything.
   */
  describe(): AssistantDisclosure;
}

export interface AssistantRequest {
  readonly question: string;
  readonly toolset: ReadOnlyToolset;
  /** Earlier turns, oldest first. */
  readonly history: readonly Turn[];
  /**
   * The only route to BattleGrid an implementation is given.
   *
   * Returns the tool's content, or throws. Throwing is how a failed read reaches
   * the answer as a named gap rather than as silence.
   */
  readonly callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}

export interface AssistantResponse {
  readonly text: string;
  /** Every tool reached while producing `text`, in order. */
  readonly consulted: readonly Consultation[];
}

export interface Turn {
  readonly role: 'user' | 'assistant';
  readonly text: string;
}

export type { Answer };
