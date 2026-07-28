import type { AssistantDescription } from '@/application/use-cases/describe-assistant.query.js';

/**
 * Where this question is about to go.
 *
 * Sits with the question box rather than in a footer, and before the input
 * rather than after it. Asking is opt-in per question, so this sentence *is* the
 * consent — someone who reads it can decline by not asking. A disclosure below
 * the fold is one you find after the thing it warns about.
 *
 * It holds no wording of its own. The sentence is composed in the domain, so a
 * deployment that changes what answers changes what the user is told, with no
 * second copy to keep in step.
 */
export function AssistantDisclosureNote({ description }: { description: AssistantDescription }) {
  const sends = description.disclosure.kind === 'sends-outside';

  return (
    <p
      // `notice`, deliberately not `danger`. This is a fact about the deployment
      // for the user to weigh, not a failure and not a hazard — and styling it
      // as an alarm is how people learn to dismiss it.
      className={
        sends
          ? 'rounded-gc-2 border border-l-4 border-notice-border border-l-notice-default bg-notice-subtle p-4 text-base text-text-primary'
          : 'text-base text-text-secondary'
      }
    >
      {description.sentence}
    </p>
  );
}
