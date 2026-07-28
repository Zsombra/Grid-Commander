import type { Catalog } from '@/domain/agent/catalog.js';
import type { ValidationIssue } from '@/domain/agent/trading-config.js';
import { CONVICTIONS, OUTLOOKS, RISKS } from '@/domain/agent/brain.js';

/**
 * The create form.
 *
 * Every choice comes from the catalog argument, which was read from the live
 * platform. Nothing here is a literal list of BattleGrid values — the repo's own
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
          className="w-full rounded border p-2"
        />
      </Field>

      <fieldset className="space-y-3">
        <legend className="font-medium">Brain</legend>
        <p className="text-sm">
          A preset carries its own model and trading temperament. Choosing a model
          yourself means setting the temperament too — one or the other, never both.
        </p>

        <Field label="Preset" name="brainPreset" error={issueFor('brain.preset')}>
          <select id="brainPreset" name="brainPreset" className="w-full rounded border p-2">
            <option value="">Choose a model instead</option>
            {catalog.brainPresets.map((preset) => (
              <option key={preset} value={preset}>
                {preset}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Model" name="modelId" error={issueFor('brain.modelId')}>
          <select id="modelId" name="modelId" className="w-full rounded border p-2">
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

      <fieldset className="space-y-3">
        <legend className="font-medium">Position management</legend>
        <Field label="Preset" name="positionManagementPreset">
          <select
            id="positionManagementPreset"
            name="positionManagementPreset"
            className="w-full rounded border p-2"
          >
            {catalog.positionManagementPresets.map((p) => (
              <option key={p.preset} value={p.preset}>
                {p.label} — {p.description}
              </option>
            ))}
            <option value="CUSTOM">Custom</option>
          </select>
        </Field>
      </fieldset>

      <button type="submit" className="rounded border px-4 py-2 text-sm">
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
      <label htmlFor={name} className="block text-sm font-medium">
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
      <select id={name} name={name} className="w-full rounded border p-2">
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </Field>
  );
}
