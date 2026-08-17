import type { BlockReason, BlockSummary } from '@/domain/agent/blocks.js';
import { isStanding } from '@/domain/agent/blocks.js';

/**
 * What keeps stopping this agent, said in the platform's own terms.
 *
 * Two rules hold this whole file:
 *
 * 1. **The reason code is shown as it was sent.** No lookup table turning
 *    `INSUFFICIENT_EQUITY` into a sentence of ours. The platform declares
 *    nineteen codes, has replaced itself four times, and the commonest block on
 *    the operator's account — `AGENT_APPROVAL_EXPIRED`, 98× on one agent — is
 *    one whose meaning is not settled even in the platform's own reference. A
 *    wording table would be this product asserting something it does not know.
 * 2. **The numbers do the explaining.** The detail carries what was measured
 *    and what would have cleared it, so the pair is rendered as a comparison
 *    rather than as field names. That is legible without any interpretation of
 *    the code at all.
 */

/**
 * Which detail field is the measurement, and which is the bar it missed.
 *
 * Keyed on the **platform's own field names**, not on reason codes — the same
 * pairing appears under several codes, and a new code that sends a known pair
 * renders correctly on the day it ships. Every field outside this table still
 * renders; nothing is dropped for being unrecognised.
 */
const PAIRS: ReadonlyArray<readonly [measured: string, bar: string]> = [
  ['equityUsd', 'thresholdUsd'],
  ['equityUsd', 'minEquityUsd'],
  ['availableUsd', 'requiredUsd'],
  ['atrPct', 'minAtrPct'],
  ['closestSlDistancePct', 'minSlDistancePct'],
  ['bestRiskReward', 'minRiskReward'],
  ['executedToday', 'maxDailyTrades'],
];

/**
 * A figure, in the unit its **name** declares.
 *
 * `…Usd` is dollars and `…Pct` is a percentage the platform already scaled —
 * the same trap the qualification gates document, where passing an
 * already-percent through a fraction formatter renders 3970%. Deriving the
 * unit from the field name means a field nobody anticipated still renders in
 * the right one.
 */
function figure(name: string, value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return String(value);
  const rounded = Math.round(value * 100) / 100;
  if (name.endsWith('Usd')) return `$${rounded.toFixed(2)}`;
  if (name.endsWith('Pct')) return `${rounded}%`;
  return String(rounded);
}

/**
 * The detail, as comparisons plus whatever else came with it.
 *
 * A reason whose detail is empty returns nothing here and the caller says so —
 * `AGENT_APPROVAL_EXPIRED` sends `{}` every time and is the most common block
 * on this account. Hiding it because it carries no numbers would hide the
 * finding.
 */
function readDetail(detail: Readonly<Record<string, unknown>>): {
  readonly comparisons: readonly { measured: string; bar: string; label: string }[];
  readonly rest: readonly { name: string; value: string }[];
} {
  const used = new Set<string>();
  const comparisons: { measured: string; bar: string; label: string }[] = [];

  for (const [measured, bar] of PAIRS) {
    if (!(measured in detail) || !(bar in detail)) continue;
    if (used.has(measured) || used.has(bar)) continue;
    used.add(measured);
    used.add(bar);
    comparisons.push({
      measured: figure(measured, detail[measured]),
      bar: figure(bar, detail[bar]),
      label: bar,
    });
  }

  const rest = Object.entries(detail)
    .filter(([k]) => !used.has(k))
    // Objects and arrays (`rrRejectedPairs`) are carried rather than dropped,
    // but they are evidence for a different surface than this one.
    .map(([name, value]) => ({
      name,
      value: typeof value === 'object' && value !== null ? '(detail)' : figure(name, value),
    }));

  return { comparisons, rest };
}

/** How long a reason has been recurring, from the window that was read. */
function span(reason: BlockReason): string | null {
  if (reason.firstAt === null || reason.lastAt === null) return null;
  const day = (iso: string) => iso.slice(0, 10);
  return day(reason.firstAt) === day(reason.lastAt)
    ? `on ${day(reason.lastAt)}`
    : `from ${day(reason.firstAt)} to ${day(reason.lastAt)}`;
}

/**
 * When the window ends, to the minute.
 *
 * The date alone is not enough here. A summary that stopped at 06:00 and one
 * that stopped at 23:50 render the same day, and the question this surface
 * answers is whether the condition is current.
 */
function endOfWindow(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
}

function Reason({ reason, partial }: { reason: BlockReason; partial: boolean }) {
  const { comparisons, rest } = readDetail(reason.detail);
  const standing = isStanding(reason);
  const when = span(reason);

  return (
    <li className="space-y-1 rounded-gc-2 border border-border-default p-3 text-sm">
      <p className="font-medium">
        {/* The platform's code, verbatim. Never our paraphrase of it. */}
        {`${reason.reasonCode} · ${reason.count}${standing ? ' times' : ' time'}` +
          `${when ? ` · ${when}` : ''}` +
          `${reason.gateStage ? ` · ${reason.gateStage.toLowerCase()} stage` : ''}`}
      </p>

      {/*
        The sentence that makes it actionable — and it is built from figures,
        not from any belief about what the code means.
      */}
      {comparisons.map((c) => (
        <p key={c.label}>
          {`${c.measured} against ${c.bar}`}
          {/* Which side would resolve it, named as the platform named it. */}
          {` — ${c.bar} is what clears this`}
        </p>
      ))}

      {rest.length > 0 ? (
        <p className="text-text-secondary">
          {rest.map((r) => `${r.name}: ${r.value}`).join(' · ')}
        </p>
      ) : null}

      {/* A reason the platform declines to explain is still a reason. */}
      {comparisons.length === 0 && rest.length === 0 ? (
        <p>BattleGrid gave no detail for this one.</p>
      ) : null}

      {reason.coinTickers.length > 0 ? (
        <p className="text-text-secondary">{`On ${reason.coinTickers.join(', ')}`}</p>
      ) : null}

      {standing ? (
        <p>
          {`This has happened ${reason.count} times${partial ? ' in the part of the history that could be read' : ''}, ` +
            'so it is a standing condition rather than one bad cycle.'}
        </p>
      ) : null}
    </li>
  );
}

/**
 * The verdict, wherever the agent is read.
 *
 * Deliberately leads with the dominant reason rather than a count of reasons:
 * "stopped 98 times by AGENT_APPROVAL_EXPIRED" is the sentence an operator
 * needs, and it is the one a list of ten recent rows cannot produce.
 */
export function Stoppages({ summary }: { summary: BlockSummary }) {
  const worst = summary.reasons[0];
  const refused = summary.refused;
  const partial = refused !== null;

  return (
    <section className="space-y-2">
      <h2 className="text-base font-medium">What has been stopping it</h2>

      {worst && isStanding(worst) ? (
        <p className="text-sm font-medium">
          {`Mostly one thing: ${worst.reasonCode}, ${worst.count} times` +
            `${span(worst) ? ` ${span(worst)}` : ''}` +
            `${partial ? ', in what could be read' : ''}.`}
        </p>
      ) : null}

      <ul className="space-y-2">
        {summary.reasons.map((r) => (
          <Reason key={r.reasonCode} reason={r} partial={partial} />
        ))}
      </ul>

      {/*
        The hole, admitted — and admitted louder than the window is, because a
        window is visibly a window and a hole is not. BattleGrid refuses on
        specific rows and the refusals cluster at the newest end (#100), so the
        rows missing here are the recent ones and this surface answers what is
        stopping the agent *now*. A partial summary rendered without this line
        would be worse than the outage it works around: an outage is visibly
        nothing, and a partial summary looks like everything.
      */}
      {refused !== null ? (
        <p className="text-sm text-text-secondary">
          {`BattleGrid would not serve ${refused.windows} ` +
            `${refused.windows === 1 ? 'window' : 'windows'} of this history — up to ` +
            `${refused.rows} blocks, the most recent ones, are not counted above.` +
            `${summary.windowEndsAt === null ? '' : ` What is counted ends ${endOfWindow(summary.windowEndsAt)}.`}`}
        </p>
      ) : null}

      {/*
        The window, admitted. A summary of the most recent 100 of 118 that
        presented itself as the whole history would be the silent truncation
        this repository keeps writing tests against.
      */}
      {summary.total !== null && summary.total > summary.readCount ? (
        <p className="text-sm text-text-secondary">
          {partial
            ? // Not "the most recent": on this path the most recent are exactly
              // the ones that refused, so the phrase would be precisely inverted.
              `Summarised ${summary.readCount} of ${summary.total}.`
            : `Summarised the ${summary.readCount} most recent of ${summary.total} — ` +
              'there are older ones this does not count.'}
        </p>
      ) : null}
    </section>
  );
}
