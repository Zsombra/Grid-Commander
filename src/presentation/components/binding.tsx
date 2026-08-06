import type { StrategyBinding } from '@/domain/agent/agent.js';
import { isBound, isOrphaned } from '@/domain/agent/agent.js';

/**
 * What an agent is bound to, and what BattleGrid says about that binding.
 *
 * One component for both surfaces that describe a binding — the roster row and
 * `/agents/[id]` — because they said different things about the same field and
 * one of them was a hard-coded word. The roster read:
 *
 *     Bound to {strategyName} at revision {strategyRevision}
 *
 * with **"Bound" written into the JSX** and `binding.state` mapped, carried
 * through the whole product, and rendered nowhere. On 2026-08-06 the second
 * account's `Volatilis` came back `ORPHANED` and rendered identically to a
 * healthy agent: *"Bound to Volatilis — imported at revision 7"*, which is
 * precisely what was not true.
 *
 * What this may say about `ORPHANED` is deliberately narrow. The state's
 * operational meaning is unestablished — whether the strategy was archived,
 * deleted or forked away, whether the agent goes on running what it
 * materialized, whether rebinding repairs it. So the sentence states the two
 * things the payload supports: the strategy can no longer be read, and the
 * revision its configuration came from. Anything past that would be this
 * product's guess wearing the platform's voice.
 */
export function BindingSummary({ binding }: { binding: StrategyBinding }) {
  if (isBound(binding)) {
    return (
      <>
        Bound to <span className="font-medium">{binding.strategyName}</span> at revision{' '}
        {binding.strategyRevision}.
      </>
    );
  }

  if (isOrphaned(binding)) {
    return (
      <>
        Binding <span className="font-medium">ORPHANED</span> — the strategy it was bound to,{' '}
        {binding.strategyName}, can no longer be read. Its configuration was materialized from
        revision {binding.strategyRevision}, and BattleGrid says nothing else about what that
        means for this agent.
      </>
    );
  }

  /**
   * A third state, rendered as the platform's own word.
   *
   * BattleGrid declares two and this repository has twice been shown a
   * vocabulary it thought was closed. `UNKNOWN` also lands here, which is the
   * mapper's word for a payload that carried no state at all — both are
   * reported and neither is interpreted.
   */
  return (
    <>
      Binding state <span className="font-medium">{binding.state}</span> — Grid-Commander has no
      reading of that state, and does not claim the binding is either intact or broken. Its
      configuration was materialized from {binding.strategyName} at revision{' '}
      {binding.strategyRevision}.
    </>
  );
}

/**
 * Where the agent's inherited configuration comes from, and what may be said
 * about it while the binding is not intact.
 *
 * The bound sentence is the one `/agents/[id]` has always carried. It was
 * printed unconditionally, under a heading reading "Inherited from its
 * strategy", for a binding that may point at a strategy nobody can read —
 * telling the operator to go and edit something that is not there.
 *
 * The other sentence names the revision the configuration was materialized at
 * and stops. It does not say the agent is still running on it, does not say
 * why the binding broke, and does not offer rebinding as the remedy: the
 * backlog item that found this
 * (`an-orphaned-agent-is-shown-as-bound`) records all three as unestablished,
 * and the way to establish them is to archive a strategy on the test account
 * and read the agent back.
 */
export function BindingInheritance({ binding }: { binding: StrategyBinding }) {
  if (isBound(binding)) {
    return (
      <>
        Its context sources, signal rules, prose and timeframe come from there and are changed
        by editing that strategy, or by rebinding — which replaces all of them.
      </>
    );
  }

  return (
    <>
      Its context sources, signal rules, prose and timeframe were materialized onto this agent
      at that revision. Nothing here says what BattleGrid does with them while the binding is in
      this state, or what would change it — neither has been established.
    </>
  );
}
