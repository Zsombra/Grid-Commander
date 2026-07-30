import type { FailureCause } from '@/ports/failure.js';

/**
 * Why a read produced nothing, said accurately.
 *
 * The reassurance is the point of this sentence and does not vary: a user
 * looking at an empty panel where their work should be needs to know their work
 * still exists. It earns that by naming a cause that is obviously external and
 * obviously not deletion — so the cause has to be the right one.
 *
 * For a long time it was not. Every failure said "could not reach BattleGrid",
 * including a 401, where BattleGrid was reached and answered. That is the more
 * dangerous half to get wrong, because it is the reassuring half: it says the
 * problem is transient and on somebody else's side, and someone with a bad
 * credential waits for an outage that is not happening.
 *
 * Shared by the roster and the strategy list so the two cannot drift, and taking
 * `subject` rather than holding two copies of the sentence.
 */
export function WhyNotLoaded({ cause, subject }: { cause: FailureCause; subject: string }) {
  return (
    <p className="mt-2">
      This does not mean {subject} gone —{' '}
      {cause === 'refused'
        ? 'BattleGrid refused the authority Grid-Commander presented, so it was not allowed to ask.'
        : 'Grid-Commander could not reach BattleGrid to ask.'}
    </p>
  );
}
