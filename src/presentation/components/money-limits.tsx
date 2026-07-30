import type { Catalog } from '@/domain/agent/catalog.js';
import { undefaultableFields, UNBOUNDED_AT_ZERO } from '@/domain/agent/catalog.js';
import { CONTROL } from './control.js';

/**
 * The six questions BattleGrid will not answer for you.
 *
 * The platform declares a default for leverage, stop loss, trade count,
 * slippage and a dozen other knobs. It declares **none** for `tradingMode`,
 * `maxDailyLossUsd`, `maxCumulativeDrawdownUsd`, `maxConcurrentExposureUsd`,
 * `balanceThresholdUsd` or `minAllocationUsd` — which is to say, it will not
 * decide on anyone's behalf how much an agent may lose.
 *
 * Until this existed, `create_intelligence_agent` was called with no
 * `tradingConfig` at all. The button created something that trades real money
 * under limits this product could neither set nor name, on a page whose whole
 * design elsewhere is refusing to state what it does not know.
 *
 * The fields are not enumerated here. They come from `undefaultableFields`, so
 * if BattleGrid starts defaulting one it stops being asked, and if it stops
 * defaulting one it starts — without anyone remembering to edit this file.
 */
export function MoneyLimits({
  catalog,
  current,
}: {
  catalog: Catalog;
  /**
   * The agent's values, when editing rather than composing.
   *
   * One component for both, so the zero-means-unbounded warning cannot drift
   * between the screen that creates an agent and the screen that changes it —
   * which is exactly the drift `zero-does-not-mean-nothing` was written about.
   */
  current?: Readonly<Record<string, unknown>> | undefined;
}) {
  const asked = new Set(undefaultableFields(catalog));
  const value = (name: string): string | undefined => {
    const v = current?.[name];
    return v === null || v === undefined ? undefined : String(v);
  };

  return (
    <fieldset className="space-y-4 rounded-gc-2 border border-consequence-border bg-consequence-subtle p-4">
      <legend className="px-1 text-base font-medium text-text-primary">
        What this agent may do with money
      </legend>

      <p className="text-sm text-text-primary">
        BattleGrid sets sensible defaults for how this agent trades — leverage,
        stop loss, how many trades a day. It sets <strong>no default at all</strong>{' '}
        for the questions below, so they have to be answered here. An agent
        created without them trades under limits nobody chose.
      </p>

      {asked.has('tradingMode') && (
        <div className="space-y-1">
          <label htmlFor="tradingMode" className="block text-sm text-text-primary">
            Trading mode
          </label>
          {/*
            `OFF` first, and selected by default. It is the only answer that
            makes the other five harmless — an agent that does not trade cannot
            exceed a loss cap. This ordering is the difference between creating
            something that reasons and creating something that spends.
          */}
          <select id="tradingMode" name="tradingMode" defaultValue={value('tradingMode') ?? 'OFF'} className={CONTROL}>
            <option value="OFF">Off — reasons, never places a trade</option>
            <option value="APPROVAL_REQUIRED">
              Approval required — proposes trades, waits for you
            </option>
            <option value="FULL_EXECUTION">Full execution — trades on its own</option>
          </select>
          <p className="text-sm text-text-secondary">
            You can change this later. Starting at <strong>Off</strong> lets you
            read what the agent decides before any of it costs anything.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {asked.has('maxDailyLossUsd') && (
          <Money
            name="maxDailyLossUsd"
            current={value('maxDailyLossUsd')}
            label="Most it may lose in a day"
            hint="Trading stops for the day once this is reached."
          />
        )}
        {asked.has('maxCumulativeDrawdownUsd') && (
          <Money
            name="maxCumulativeDrawdownUsd"
            current={value('maxCumulativeDrawdownUsd')}
            label="Most it may lose in total"
            hint="Across its whole life, not per day."
          />
        )}
        {asked.has('maxConcurrentExposureUsd') && (
          <Money
            name="maxConcurrentExposureUsd"
            current={value('maxConcurrentExposureUsd')}
            label="Most it may have at risk at once"
            hint="The total of everything open at the same time."
          />
        )}
        {asked.has('balanceThresholdUsd') && (
          <Money
            name="balanceThresholdUsd"
            current={value('balanceThresholdUsd')}
            label="Stop if the balance falls below"
            hint="A floor. Trading stops rather than spending the last of it."
          />
        )}
        {asked.has('minAllocationUsd') && (
          <Money
            name="minAllocationUsd"
            current={value('minAllocationUsd')}
            label="Smallest single trade"
            hint="BattleGrid does not accept anything below 10."
          />
        )}
      </div>
    </fieldset>
  );
}

/**
 * One money field.
 *
 * **Composing: no default.** A pre-filled loss cap would be this product
 * choosing a number on the operator's behalf — the exact thing the absence of a
 * platform default says nobody should do.
 *
 * **Editing: the agent's own value.** The opposite reasoning, for the opposite
 * situation. The number already exists and the operator chose it; showing an
 * empty box would make every edit look like a fresh decision about all six, and
 * `tradingConfig` is all-or-nothing — a blank field submitted is a limit
 * removed, not a limit left alone.
 */
function Money({
  name,
  label,
  hint,
  current,
}: {
  name: string;
  label: string;
  hint: string;
  /** The agent's value when editing. Absent when composing — see below. */
  current?: string | undefined;
}) {
  /**
   * Where a zero removes the limit, say so here — beside the box it is typed
   * into, not in a paragraph above the form.
   *
   * BattleGrid reads `0` on these three as *no cap*. Under a label reading
   * "most it may lose in a day" and a hint promising "trading stops once this
   * is reached", `0` is the most cautious answer the wording offers and it
   * produces an agent nothing will stop. The safest input made the least
   * bounded agent, and nothing said so.
   */
  const unbounded = (UNBOUNDED_AT_ZERO as readonly string[]).includes(name);

  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm text-text-primary">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="number"
        min="0"
        step="any"
        required
        defaultValue={current}
        inputMode="decimal"
        aria-describedby={`${name}-hint`}
        className={CONTROL}
      />
      <p id={`${name}-hint`} className="text-sm text-text-secondary">
        {hint}
        {unbounded && (
          <>
            {' '}
            <strong className="text-text-primary">
              Entering 0 removes this limit — BattleGrid will not stop the agent
              on it at all.
            </strong>
          </>
        )}
      </p>
    </div>
  );
}
