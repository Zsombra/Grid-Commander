import { CONTROL, LABEL } from '@/presentation/components/control.js';
import { timeframeParam } from '@/presentation/column-form.js';
import type { ColumnControls } from '@/ports/strategies.js';

/**
 * The declared-or-withheld column controls, in one place.
 *
 * Extracted from the section editor when the metric workbench grew the same
 * controls — two copies of "never a guess, never blank" is how the two
 * surfaces come to disagree about what an unanswerable declaration looks
 * like, which is the exact drift the requirement *An Enumerated Column
 * Control Is Read From The Declaration Or Withheld* exists to prevent.
 */

/** A select over declared values, or a stated absence. Never a guess, never blank. */
export function Declared({
  name,
  label,
  values,
  chosen,
  optional = true,
}: {
  name: string;
  label: string;
  values: readonly string[];
  chosen: string | undefined;
  optional?: boolean;
}) {
  // A control the declaration could not answer for is withheld and said to be
  // withheld. Rendering an empty select would tell an author the platform
  // accepts nothing here, which is a different and false claim.
  if (values.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        {`${label}: BattleGrid's declaration did not name the values it accepts, so this control is not offered.`}
      </p>
    );
  }
  return (
    <label className={LABEL}>
      {label}
      <select name={name} className={CONTROL} defaultValue={chosen ?? ''}>
        {optional ? <option value="">— not set —</option> : null}
        {values.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Every timeframe the declaration pins, tagged so the two halves stay apart. */
export function timeframeOptions(controls: ColumnControls): readonly string[] {
  return [
    ...controls.relativeTimeframes.map((rel) => timeframeParam({ rel })),
    ...controls.absoluteTimeframes.map((abs) => timeframeParam({ abs })),
  ];
}
