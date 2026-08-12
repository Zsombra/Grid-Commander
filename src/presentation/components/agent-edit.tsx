import type { Agent } from '@/domain/agent/agent.js';
import type { Catalog } from '@/domain/agent/catalog.js';
import { isEditable, isReactivatable } from '@/domain/agent/agent.js';
import {
  POSITION_MANAGEMENT_FIELDS,
  positionDrift,
  positionFieldKind,
} from '@/domain/agent/trading-config.js';
import { BindingInheritance, BindingSummary } from './binding.js';
import { BUTTON_PRIMARY, BUTTON_SECONDARY, CONTROL, LABEL } from './control.js';
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
      <label htmlFor="displayName" className={LABEL}>Name</label>
      <input
        id="displayName"
        name="displayName"
        type="text"
        defaultValue={agent.displayName}
        maxLength={80}
        required
        className={CONTROL}
      />
      <button type="submit" className={BUTTON_PRIMARY}>Rename</button>
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
      {problem && <p role="alert" className="rounded-gc-2 border border-danger-default bg-danger-subtle p-4 text-sm text-text-primary">{problem}</p>}

      <form method="get" className="space-y-6">
        {/* Puts the page into its confirm branch on the next request. */}
        <input type="hidden" name="review" value="1" />

        <div className="space-y-2">
          <label htmlFor="displayName" className={LABEL}>Name</label>
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

        <PositionManagement catalog={catalog} current={agent.tradingConfig?.fields} />

        <div className="flex flex-wrap gap-3">
          {/* Secondary, like every other submit that only asks: this form
              composes the proposal and reaches no operation. The primary in
              this flow belongs to `AgentEditConfirm`, one request later. */}
          <button type="submit" className={BUTTON_SECONDARY}>
            Review the change
          </button>
          <a href={`/agents/${agent.id}`} className={BUTTON_SECONDARY}>
            Back to {agent.displayName}
          </a>
        </div>
      </form>

      <section className="space-y-1">
        <h2 className="font-medium">Not editable here</h2>
        {/*
          Through the shared components, not a sentence of its own. This copy
          used to name the strategy and say the fields "change by editing that
          strategy" — advice that sends an operator at a strategy an ORPHANED
          binding says cannot be read. Four surfaces describe a binding and
          they drifted once already.
        */}
        <p className="text-sm">
          <BindingSummary binding={agent.binding} />{' '}
          <BindingInheritance binding={agent.binding} />
        </p>
      </section>
    </div>
  );
}

/**
 * How an agent exits its positions, with the truth about the label.
 *
 * The drift line comes first because it is the fact the label hides: a
 * preset is a name beside twelve independent values and nothing on the
 * platform makes them agree, so an agent may name one preset and carry
 * values that are not that preset's. The choice semantics are stated on the control:
 * a preset sends BattleGrid's own values wholesale, CUSTOM sends the
 * fields below as edited, and no choice sends nothing at all — position
 * management is replaced as one object, so there is no field-at-a-time.
 */
export function PositionManagement({
  catalog,
  current,
}: {
  catalog: Catalog;
  current: Readonly<Record<string, unknown>> | undefined;
}) {
  const pm = (current?.['positionManagement'] ?? null) as Readonly<
    Record<string, unknown>
  > | null;
  const drift = pm ? positionDrift(pm, catalog) : null;
  const label = typeof pm?.['positionManagementPreset'] === 'string'
    ? (pm['positionManagementPreset'] as string)
    : null;
  const offerable = catalog.positionManagementPresets.filter((p) => p.config !== null);

  return (
    <section className="space-y-3">
      <h2 className="font-medium">Position management</h2>

      {drift && drift.differing.length > 0 ? (
        <p role="status" className="rounded-gc-2 border border-border-default p-3 text-sm">
          This agent names {drift.preset}, but its values differ from the
          catalog&apos;s {drift.preset} on: {drift.differing.join(', ')}. The
          label is not the truth here — the fields below are.
        </p>
      ) : drift ? (
        <p className="text-sm">Matches the catalog&apos;s {drift.preset} exactly.</p>
      ) : label === 'CUSTOM' ? (
        <p className="text-sm">CUSTOM — these twelve values are this agent&apos;s own.</p>
      ) : null}

      <label className={LABEL}>
        Manage like
        <select name="pmPreset" defaultValue="" className={CONTROL}>
          <option value="">Leave it as it is</option>
          {offerable.map((p) => (
            <option key={p.preset} value={p.preset}>
              {p.label} — BattleGrid&apos;s own values
            </option>
          ))}
          <option value="CUSTOM">CUSTOM — the fields below, as edited</option>
        </select>
      </label>
      <p className="text-sm text-text-secondary">
        Picking a preset sends BattleGrid&apos;s twelve values for it and the
        fields below are ignored. Picking CUSTOM sends the fields below exactly
        as edited. Leaving the choice alone changes nothing here.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {POSITION_MANAGEMENT_FIELDS.map((field) => {
          const kind = positionFieldKind(field);
          const value = pm?.[field];
          if (kind === 'boolean') {
            return (
              <label key={field} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name={`pm.${field}`} defaultChecked={value === true} />
                {field}
              </label>
            );
          }
          return (
            <label key={field} className={LABEL}>
              {field}
              <input
                type={kind === 'number' ? 'number' : 'text'}
                step="any"
                name={`pm.${field}`}
                defaultValue={value === undefined ? '' : String(value)}
                className={CONTROL}
              />
            </label>
          );
        })}
      </div>
    </section>
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
 * The submitted values ride along as hidden fields — and editing them buys
 * nothing: the confirmation's target digests the proposed values, so a form
 * posting different ones fails to consume the token. That property arrived
 * with `a-confirmation-binds-to-what-was-agreed`; an earlier version of this
 * comment predates it.
 */
export function AgentEditConfirm({
  agent,
  consequence,
  confirmationToken,
  changes,
  tradingConfigChanges,
  positionChanges,
  action,
}: {
  agent: Agent;
  consequence: string;
  confirmationToken: string;
  /**
   * The intent, carried back so the apply posts exactly what was proposed.
   *
   * `string | number` because the money fields are numbers by the time they get
   * here — one coercion now forms the intent for both requests, so what the
   * confirmation was issued against and what this form posts are the same values.
   * Typing them as `string` would mean re-coercing on the way out and digesting
   * something else.
   */
  changes: Readonly<Record<string, string | number>>;
  tradingConfigChanges: Readonly<Record<string, string | number>>;
  /**
   * The resolved position-management object, when the proposal carries one.
   * Serialized as `pm.*` fields and read back by the same typed coercion the
   * review used — String→Number and 'true'→true round-trip losslessly, so
   * the digest the apply recomputes is the digest the token was issued for.
   */
  positionChanges?: Readonly<Record<string, unknown>> | null;
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
      {Object.entries(positionChanges ?? {}).map(([k, v]) => (
        <input key={`pm.${k}`} type="hidden" name={`pm.${k}`} value={String(v)} />
      ))}

      <div className="flex flex-wrap gap-3">
        <button type="submit" className={BUTTON_PRIMARY}>
          Apply this to {agent.displayName}
        </button>
        <a href={`/agents/${agent.id}/edit`} className={BUTTON_SECONDARY}>
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
      {/*
        Split deliberately. What it returns *with* — the configuration it had
        when archived, and the slot it takes — is a fact about reactivation and
        is true whatever the binding says. What it returns *bound to* is a claim
        about the binding, and this is the page where getting it wrong costs
        most: the agent all of this was found on (`Volatilis`, 2026-08-06) is
        ARCHIVED **and** ORPHANED, so its reactivate confirmation is exactly
        where an operator would have read "bound to" about a strategy that
        cannot be read.
      */}
      <p className="text-sm">
        It returns to your roster with the configuration it had when it was archived.
        Reactivating takes an agent slot.
      </p>
      <p className="text-sm">
        <BindingSummary binding={agent.binding} />
      </p>
      {/* Capacity before the act, not after the refusal. */}
      {atCapacity && <p role="alert" className="rounded-gc-2 border border-border-default p-3 text-sm">{atCapacity}</p>}
      <form action={action} className="flex flex-wrap gap-3">
        <input type="hidden" name="agentId" value={agent.id} />
        <input type="hidden" name="expectedRevision" value={agent.revision} />
        <button type="submit" className={BUTTON_PRIMARY}>
          Reactivate {agent.displayName}
        </button>
        <a href={`/agents/${agent.id}`} className={BUTTON_SECONDARY}>
          Leave it archived
        </a>
      </form>
    </div>
  );
}
