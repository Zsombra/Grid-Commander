/**
 * An answer, and what it was built from.
 *
 * This is the only capability in the product whose output is generated rather
 * than derived. Everything else returns what BattleGrid said or refuses; prose
 * can be confidently wrong in a way a tool result cannot, which is why an answer
 * and its reads are one object rather than two.
 */

export interface Consultation {
  readonly tool: string;
  readonly outcome: 'read' | 'failed';
  /** Present when the read failed, so the answer can name what is missing. */
  readonly failure?: string | undefined;
}

/**
 * Three shapes, and the distinction between the first two is the point.
 *
 * `grounded` — read something, answering about the account.
 * `general`  — read nothing, so the answer is not a statement about the account.
 * `refused`  — could not answer, and says why.
 *
 * "I did not look anything up" and "I looked and found nothing" are different
 * claims, and collapsing them would let a model's prior knowledge be presented
 * as a reading of the user's setup. See design A-B.
 */
export type Answer =
  | {
      readonly kind: 'grounded';
      readonly text: string;
      readonly consulted: readonly Consultation[];
      /** Named when any consultation failed, so the answer is not read as complete. */
      readonly incomplete: readonly string[];
    }
  | { readonly kind: 'general'; readonly text: string }
  | { readonly kind: 'refused'; readonly reason: string };

/**
 * Build an answer from the reads that produced it.
 *
 * A failed consultation degrades the answer rather than the request — a user
 * asking "how many agents do I have and which strategies do they use?" is better
 * served by "you have three; I could not read your strategies" than by an error.
 * The line that must not be crossed is silence: the missing part is *named*, or
 * the answer reads as complete and the user has no way to know otherwise. See
 * design A-C.
 */
export function ground(text: string, consulted: readonly Consultation[]): Answer {
  if (consulted.length === 0) return { kind: 'general', text };
  return {
    kind: 'grounded',
    text,
    consulted,
    incomplete: consulted.filter((c) => c.outcome === 'failed').map((c) => c.tool),
  };
}

/** Whether any part of what the answer needed did not arrive. */
export function isComplete(answer: Answer): boolean {
  return answer.kind !== 'grounded' || answer.incomplete.length === 0;
}

/**
 * The sentence appended when something did not return.
 *
 * Composed here rather than left to the model: the one thing a model must not be
 * trusted to do is decide whether to mention that its own information was
 * incomplete.
 */
export function describeIncompleteness(answer: Answer): string | null {
  if (answer.kind !== 'grounded' || answer.incomplete.length === 0) return null;
  const list = answer.incomplete.join(', ');
  return (
    `Part of this is missing: I could not read ${list}. ` +
    'Treat anything that would have depended on it as unknown rather than absent.'
  );
}

/** What the assistant says when it cannot establish something. */
export const CANNOT_ESTABLISH =
  'I do not have what I would need to answer that. I can only read your own ' +
  'BattleGrid account — your agents, your strategies, and the record of what ' +
  'Grid-Commander has done on your behalf.';

/** What the assistant says about anything outside the connected account. */
export const OUTSIDE_THIS_ACCOUNT =
  'That is outside your account, and I only read your own setup. I would be ' +
  'guessing, and a guess that sounds like a reading is worse than no answer.';
