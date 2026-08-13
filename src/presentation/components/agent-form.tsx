import { PerformButton } from '@/presentation/components/perform-button.js';
import type { Catalog } from '@/domain/agent/catalog.js';
import type { StrategyListing } from '@/application/use-cases/list-strategies.query.js';
import type { ValidationIssue } from '@/domain/agent/trading-config.js';
import { CONVICTIONS, OUTLOOKS, RISKS } from '@/domain/agent/brain.js';
import { CONTROL, LABEL } from './control.js';
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
  strategies,
  action,
  idempotencyKey,
  issues = [],
}: {
  catalog: Catalog;
  /**
   * A dedupe key for this render, minted by the page.
   *
   * Required rather than optional, and minted by the caller rather than here:
   * this is a server component, but a default computed in the component body
   * would still be one key per render of *this* subtree, and the guarantee has
   * to be owned by whoever renders the page. Making it required means a second
   * create surface cannot quietly ship without one.
   */
  idempotencyKey: string;
  /**
   * What the new agent may read, as the platform lists it.
   *
   * Required, and not part of `catalog`: the catalog is the create tool's own
   * vocabulary — models, presets, bounds, defaults — and it has never carried
   * strategies. That is why this form asked for everything `create` reads
   * except the one field it could not obtain, and why every submission threw
   * `FormError: strategyId is required` before reaching the use case for the
   * whole life of the page (#177).
   */
  strategies: readonly StrategyListing[];
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
      {/*
        The dedupe key, minted once when this form rendered.

        Creating an agent is one of the few writes in the product with no
        single-use confirmation to spend — there is no describe step to mint one
        — so a resubmit is refused by nothing on this side. BattleGrid accepts a
        key for exactly this: "a retry with the same key returns the original
        result rather than repeating the command."

        Carried as a hidden input rather than minted inside the action, and that
        is the whole mechanism: a value minted per *call* would be a fresh key on
        every press and would dedupe nothing. Minted per *render*, a resubmit of
        this form — a double press, a back-button replay, a second tab opened
        from the same page — sends the key it was rendered with.

        Whether BattleGrid would also refuse the duplicate by name is untested
        (the probe that answered it for `fork_strategy` could not reach create,
        with no agent slot free). This does not depend on the answer.
      */}
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {issues.length > 0 && (
        <div role="alert" className="rounded-gc-2 border border-border-default p-3 text-sm">
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

      {/*
        The agent's reasoning, and the one field `create` requires that this
        form never asked for.

        Nothing is preselected. Every other choice here either carries a
        platform-declared default or is deliberately refused one (the six money
        fields the platform will not answer for anybody). A strategy is not a
        setting on the agent — the platform materializes its context modules,
        signal rules, prose and timeframe onto it, so it *is* how the agent will
        reason about the operator's money. Choosing one on their behalf would
        bind funds to a policy nobody read.

        Scope is on the option, not implied by order: "BattleGrid" and "Yours"
        decide whether the strategy can later be edited or only forked, and a
        roster row states it for the same reason.
      */}
      <Field label="Strategy" name="strategyId" error={issueFor('strategyId')}>
        <select id="strategyId" name="strategyId" required defaultValue="" className={CONTROL}>
          <option value="" disabled>
            Choose what this agent reads
          </option>
          {strategies.map(({ strategy }) => (
            <option key={strategy.id} value={strategy.id}>
              {strategy.name} — {strategy.scope === 'SYSTEM' ? 'BattleGrid' : 'Yours'}, revision{' '}
              {strategy.revision}
            </option>
          ))}
        </select>
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


      <PerformButton pendingLabel="Creating the agent…">
        Create agent
      </PerformButton>
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
