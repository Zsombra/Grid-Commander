import type { Agent } from '@/domain/agent/agent.js';
import { isEditable, isReactivatable } from '@/domain/agent/agent.js';
import { CONTROL } from './control.js';

/**
 * The editable-agent forms, and the refusals that replace them.
 *
 * These live here rather than in the route because `app/` may not import the
 * domain — routes call use cases and do not reach past them (W-D). The gate is
 * a domain predicate, so the component that depends on it belongs in the
 * presentation layer, exactly as `agent-actions.tsx` does.
 */

export function AgentRenameForm({
  agent,
  action,
}: {
  agent: Agent;
  action: (formData: FormData) => Promise<void>;
}) {
  if (!isEditable(agent)) return null;
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="agentId" value={agent.id} />
      <label htmlFor="displayName" className="block text-sm font-medium">Name</label>
      <input
        id="displayName"
        name="displayName"
        type="text"
        defaultValue={agent.displayName}
        maxLength={80}
        required
        className={CONTROL}
      />
      <button type="submit" className="rounded border px-4 py-2 text-sm">Rename</button>
    </form>
  );
}

export function AgentEditForm({
  agent,
  action,
  problem,
}: {
  agent: Agent;
  action: (formData: FormData) => Promise<void>;
  problem?: string | undefined;
}) {
  if (!isEditable(agent)) {
    return (
      <div className="space-y-4">
        <p role="alert" className="text-sm">
          BattleGrid does not permit Grid-Commander to change {agent.displayName}.
        </p>
        <p className="text-sm">
          <a href={`/agents/${agent.id}`} className="underline">Back to the agent</a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {problem && <p role="alert" className="rounded border p-3 text-sm">{problem}</p>}
      <AgentRenameForm agent={agent} action={action} />
      <section className="space-y-1">
        <h2 className="font-medium">Not editable here</h2>
        <p className="text-sm">
          Context sources, signal rules, prose and timeframe are inherited from{' '}
          {agent.binding.strategyName}. They change by editing that strategy, or by
          rebinding — which replaces all of them.
        </p>
        <p className="text-sm">
          Money limits are not yet editable from Grid-Commander. BattleGrid takes the
          trading configuration all at once, so a partial change resets the fields it
          omits — a form that sends one value would quietly clear the rest.
        </p>
      </section>
    </div>
  );
}

export function ReactivatePrompt({
  agent,
  action,
  atCapacity,
}: {
  agent: Agent;
  action: (formData: FormData) => Promise<void>;
  atCapacity?: string | undefined;
}) {
  if (!isReactivatable(agent)) {
    return (
      <div className="space-y-4">
        <p role="alert" className="text-sm">{agent.displayName} is not archived.</p>
        <p className="text-sm">
          <a href={`/agents/${agent.id}`} className="underline">Back to the agent</a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm">
        It returns to your roster bound to {agent.binding.strategyName} at revision{' '}
        {agent.binding.strategyRevision}, with the configuration it had when it was
        archived. Reactivating takes an agent slot.
      </p>
      {/* Capacity before the act, not after the refusal. */}
      {atCapacity && <p role="alert" className="rounded border p-3 text-sm">{atCapacity}</p>}
      <form action={action} className="flex flex-wrap gap-3">
        <input type="hidden" name="agentId" value={agent.id} />
        <input type="hidden" name="expectedRevision" value={agent.revision} />
        <button type="submit" className="rounded border px-4 py-2 text-sm">
          Reactivate {agent.displayName}
        </button>
        <a href={`/agents/${agent.id}`} className="px-4 py-2 text-sm underline">
          Leave it archived
        </a>
      </form>
    </div>
  );
}
