import type { Catalog } from '@/domain/agent/catalog.js';
import type { ValidationIssue } from '@/domain/agent/trading-config.js';
import { CONVICTIONS, OUTLOOKS, RISKS } from '@/domain/agent/brain.js';
import { BUTTON_PRIMARY, CONTROL, LABEL } from './control.js';
import { MoneyLimits } from './money-limits.js';

/**
 * The create form.
 *
 * Every choice comes from the catalog argument, which was read from the live
 * platform — including the brain presets, which came from a hand-written list
 * until 2026-08-06 and were a value short of the schema for the whole of that
 * time. Nothing here is a literal list of BattleGrid values: the repo's own
 * surface map already fell a preset behind the server inside a week
 * (findings-agents F-3), and a form built from it would offer a stale set and
 * reject a valid one.
 *
 * The three behavior enums are the exception: they are closed in the tool
 * schema, typed in the domain, and rendered from those constants.
 */
export function AgentForm({
  catalog,
  action,
  issues = [],
}: {
  catalog: Catalog;
  /**
   * The operation this form performs. Required, so that a form which submits
   * nowhere is a type error rather than a page that renders perfectly and does
   * nothing — which is what this was for the whole life of the project.
   */
  action: (formData: FormData) => Promise<void>;
  issues?: readonly ValidationIssue[];
}) {
  const issueFor = (field: string) => issues.find((i) => i.field === field)?.reason;

  return (
    <form action={action} className="space-y-6">
      {issues.length > 0 && (
        <div role="alert" className="rounded border p-3 text-sm">
          <p className="font-medium">
            {issues.length} value{issues.length === 1 ? '' : 's'} need attention.
          </p>
        </div>
      )}

      <Field label="Name" name="displayName" error={issueFor('displayName')}>
        <input
          id="displayName"
          name="displayName"
          type="text"
          maxLength={80}
          required
          className={CONTROL}
        />
      </Field>

      <fieldset className="space-y-3">
        <legend className="font-medium">Brain</legend>
        <p className="text-sm">
          A preset carries its own model and trading temperament. Choosing a model
          yourself means setting the temperament too — one or the other, never both.
        </p>

        {/*
          No presets means the declaration did not answer, not that BattleGrid
          has none — the list is read from the create tool's own schema, and an
          empty select would state the second while only the first is known. The
          model route's values came from a catalogue call that did answer, so it
          stays open and is what the sentence sends the operator to.
        */}
        {catalog.brainPresets.length === 0 ? (
          <p role="status" className="text-sm">
            BattleGrid did not declare which brain presets it accepts, so none are
            offered here. Choose a model and set the temperament yourself.
          </p>
        ) : (
          <Field label="Preset" name="brainPreset" error={issueFor('brain.preset')}>
            <select id="brainPreset" name="brainPreset" className={CONTROL}>
              <option value="">Choose a model instead</option>
              {catalog.brainPresets.map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Model" name="modelId" error={issueFor('brain.modelId')}>
          <select id="modelId" name="modelId" className={CONTROL}>
            <option value="">Use a preset instead</option>
            {catalog.models.map((m) => (
              <option key={m.modelId} value={m.modelId}>
                {m.displayName} ({m.provider})
              </option>
            ))}
          </select>
        </Field>

        <Choice label="Risk" name="risk" options={RISKS} />
        <Choice label="Outlook" name="outlook" options={OUTLOOKS} />
        <Choice label="Conviction" name="conviction" options={CONVICTIONS} />
      </fieldset>

      {/*
        Position management, offered from the platform's own catalog.

        This select existed once before, wired to nothing — the action sent
        `tradingConfig: null` and the choice was discarded — and was removed,
        because offering a setting and dropping it is worse than not asking.
        It returns now that the values exist to send: the catalog states each
        preset's complete twelve-field configuration, `mapPositionPresets`
        carries it to the domain, and choosing COLT sends BattleGrid's COLT
        values with the label beside them. Only presets whose configuration
        actually arrived are offered — a label with no values behind it is the
        old defect wearing a new control. CUSTOM stays first and default: it is
        today's behavior, named as a choice instead of imposed as the only one.
      */}
      <fieldset className="space-y-3">
        <legend className="font-medium">Position management</legend>
        <p className="text-sm">
          A preset is BattleGrid&apos;s own twelve values for how positions are
          tightened, trailed and timed out. CUSTOM uses the assembled defaults.
        </p>
        <Field label="Preset" name="positionPreset" error={issueFor('positionPreset')}>
          <select id="positionPreset" name="positionPreset" className={CONTROL}>
            <option value="CUSTOM">CUSTOM — the assembled defaults</option>
            {catalog.positionManagementPresets
              .filter((p) => p.config !== null)
              .map((p) => (
                <option key={p.preset} value={p.preset}>
                  {p.label} — {p.description}
                </option>
              ))}
          </select>
        </Field>
      </fieldset>

      <MoneyLimits catalog={catalog} />


      <button type="submit" className={BUTTON_PRIMARY}>
        Create agent
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  error,
  children,
}: {
  label: string;
  name: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className={LABEL}>
        {label}
      </label>
      {children}
      {/* Named, not colour-coded: the reason must survive without the styling. */}
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

function Choice({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: readonly string[];
}) {
  return (
    <Field label={label} name={name}>
      <select id={name} name={name} className={CONTROL}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </Field>
  );
}
