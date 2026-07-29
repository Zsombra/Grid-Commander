import type { Agent } from '@/domain/agent/agent.js';
import type { Catalog } from '@/domain/agent/catalog.js';
import { isEditable, isReactivatable } from '@/domain/agent/agent.js';
import { CONTROL } from './control.js';
import { MoneyLimits } from './money-limits.js';

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
  /**
   * A control that cannot work is not offered — and its absence is explained.
   *
   * This returned `null`, so an archived agent showed a blank space where the
   * name box had been. Correct in that nothing dead was rendered, and silent in
   * a way that reads as the page forgetting rather than refusing.
   *
   * The two reasons are not interchangeable. A platform-locked agent will never
   * be editable here. An **archived** one is the operator's own decision and is
   * one button away from being undone — on this very page. Saying so is the
   * difference between a dead end and a next step.
   */
  if (!isEditable(agent)) {
    return (
      <p className="text-sm text-text-secondary">
        {agent.status === 'ARCHIVED'
          ? `${agent.displayName} is retired, so it cannot be renamed. Reactivating it makes changes possible again — its history is kept either way.`
          : `BattleGrid does not permit Grid-Commander to rename ${agent.displayName}.`}
      </p>
    );
  }

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

/**
 * Everything an agent owns, on one form — and it does not submit anything.
 *
 * **A GET form, deliberately.** It navigates to the same page carrying what was
 * typed, and that page proposes the change and renders the consequence. The
 * change is applied by a *second* request, from the form the confirm view
 * draws.
 *
 * That split is the point of this component's rewrite. Before it, one server
 * action called `describeEdit` and then spent the token it had just been
 * handed, four lines later, in the same request — so the consequence was
 * computed, stored for the audit, and read by nobody. `update-cannot-carry-a-
 * confirmation` had already named that as the fix that would be wrong; it was
 * fixed in the command and reappeared in the action.
 *
 * `tests/architecture/confirmation-is-human.test.ts` is what stops it coming
 * back a third time.
 */
export function AgentEditForm({
  agent,
  catalog,
  problem,
}: {
  agent: Agent;
  catalog: Catalog;
  problem?: string | undefined;
}) {
  if (!isEditable(agent)) {
    return (
      <div className="space-y-4">
        <p role="alert" className="text-sm">
          {agent.status === 'ARCHIVED'
            ? `${agent.displayName} is retired, so it cannot be changed. Reactivating it makes changes possible again.`
            : `BattleGrid does not permit Grid-Commander to change ${agent.displayName}.`}
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

      <form method="get" className="space-y-6">
        {/* Puts the page into its confirm branch on the next request. */}
        <input type="hidden" name="review" value="1" />

        <div className="space-y-2">
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
        </div>

        {/**
         * Prefilled from what the agent runs on now.
         *
         * `tradingConfig` is all-or-nothing: a field left blank is a limit
         * removed, not a limit left alone. An empty box would make an edit to
         * one number silently reset the other five.
         */}
        <MoneyLimits catalog={catalog} current={agent.tradingConfig?.fields} />

        <div className="flex flex-wrap gap-3">
          <button type="submit" className="rounded border px-4 py-2 text-sm">
            Review the change
          </button>
          <a href={`/agents/${agent.id}`} className="px-4 py-2 text-sm underline">
            Back to {agent.displayName}
          </a>
        </div>
      </form>

      <section className="space-y-1">
        <h2 className="font-medium">Not editable here</h2>
        <p className="text-sm">
          Context sources, signal rules, prose and timeframe are inherited from{' '}
          {agent.binding.strategyName}. They change by editing that strategy, or by
          rebinding — which replaces all of them.
        </p>
      </section>
    </div>
  );
}

/**
 * What the confirmation was issued against, rendered so a person reads it.
 *
 * The consequence is passed in rather than composed here: it is the same string
 * stored with the token, so what the user reads, what they agree to, and what
 * the audit can later prove are one thing rather than three that drift. Same
 * reasoning as `RebindConfirm`.
 *
 * The submitted values ride along as hidden fields. Note the limit of that:
 * `consume(token, userId, tool, target)` matches on the agent, not on the
 * values, so a token issued for one set would be accepted with another if these
 * fields were edited. That is a product-wide property — `rebind` carries
 * `toStrategyId` the same way — and it is filed rather than half-fixed here.
 */
export function AgentEditConfirm({
  agent,
  consequence,
  confirmationToken,
  changes,
  tradingConfigChanges,
  action,
}: {
  agent: Agent;
  consequence: string;
  confirmationToken: string;
  changes: Readonly<Record<string, string>>;
  tradingConfigChanges: Readonly<Record<string, string>>;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action} className="space-y-4">
      <h2 className="text-lg font-medium">Change {agent.displayName}?</h2>

      <div role="alert" className="rounded-gc-2 border border-consequence-border p-4 text-sm">
        <p>{consequence}</p>
      </div>

      <input type="hidden" name="agentId" value={agent.id} />
      <input type="hidden" name="confirmationToken" value={confirmationToken} />
      {Object.entries(changes).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {Object.entries(tradingConfigChanges).map(([k, v]) => (
        <input key={k} type="hidden" name={`tc.${k}`} value={v} />
      ))}

      <div className="flex flex-wrap gap-3">
        <button type="submit" className="rounded border px-4 py-2 text-sm">
          Apply this to {agent.displayName}
        </button>
        <a href={`/agents/${agent.id}/edit`} className="px-4 py-2 text-sm underline">
          Change something else
        </a>
      </div>
    </form>
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
