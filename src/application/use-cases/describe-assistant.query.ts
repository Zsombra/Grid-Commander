import type { AssistantDisclosure } from '@/domain/assistant/disclosure.js';
import { describeDisclosure } from '@/domain/assistant/disclosure.js';
import type { AssistantPort } from '@/ports/assistant.js';

export interface AssistantDescription {
  readonly disclosure: AssistantDisclosure;
  /** The sentence to show. Composed in the domain so no surface writes its own. */
  readonly sentence: string;
}

/**
 * What to tell someone before they ask a question.
 *
 * Thin to the point of looking unnecessary, and it is not: a route may not
 * import infrastructure, so without this the page would have no way to reach the
 * configured port and the disclosure would end up as a hardcoded sentence beside
 * the deployment it is supposed to describe. Two sources for one fact is how a
 * deployment changes and a promise does not.
 *
 * It resolves no session and reads nothing from BattleGrid. This describes the
 * deployment, not the user — a page must be able to say it before anyone has
 * asked anything.
 */
export class DescribeAssistantQuery {
  constructor(private readonly assistant: AssistantPort) {}

  execute(): AssistantDescription {
    const disclosure = this.assistant.describe();
    return { disclosure, sentence: describeDisclosure(disclosure) };
  }
}
