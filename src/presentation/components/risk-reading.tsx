import type {
  AgainstDefault,
  Management,
  Reading,
  RiskReading,
} from '@/application/use-cases/read-risk-reading.query.js';
import type { Ending, ExitGeometry } from '@/application/use-cases/read-trading-record.query.js';
import { shareOf } from '@/application/use-cases/read-trading-record.query.js';
import { WhyNotLoaded } from './why-not-loaded.js';

/**
 * Each setting against the thing that makes it safe or unsafe.
 *
 * A configuration screen has no opinion, and that is the failure this panel
 * exists to fix. `maxDailyTrades: 34` beside a platform default of 10, and a
 * median move of −0.62% beside the stop that produced it, are the same numbers
 * the operator already had — set against something for the first time.
 *
 * Three sections, three reads, **rendered independently**. An operator whose
 * catalog read timed out still learns what their agent's trades did.
 *
 * Every derived figure says it is derived. BattleGrid publishes an aggregate of
 * its own that has answered zeros on agents with real losses, so a figure this
 * product computed and a figure the platform published are different claims and
 * the surface must not blur them.
 */
export function RiskReadingPanel({ reading }: { reading: RiskReading }) {
  return (
    <section className="space-y-6">
      <Section
        heading="Against the platform’s defaults"
        subject="the platform’s defaults are"
        nothing="This agent carries no numeric settings to compare."
        reading={reading.ceilings}
        render={(rows) => <Defaults rows={rows} />}
      />
      <Section
        heading="How its trades ended"
        subject="this agent’s trades are"
        nothing="This agent has closed nothing yet."
        reading={reading.geometry}
        render={(g) => <Geometry geometry={g} />}
      />
      <Section
        heading="What ends a position early"
        subject="this agent’s position management is"
        nothing="This agent carries no position-management settings."
        reading={reading.management}
        render={(m) => <ManagementBody management={m} />}
      />
    </section>
  );
}

/**
 * One section, with the three states its read can be in.
 *
 * The unreadable branch lives here and not at each call site, the same shape
 * `StageNote` uses on the pipeline page: one place tests the kind, and the
 * shared sentence sits inside that test rather than behind a wrapper of our
 * own. Three sections would otherwise be three chances to hand-roll the
 * explanation slightly differently, which is the drift `WhyNotLoaded` exists
 * to prevent.
 *
 * `nothing` is a sentence rather than a flag because "closed nothing yet" and
 * "carries no settings" are different facts, and both are different again from
 * a read that failed.
 */
function Section<T>({
  heading,
  subject,
  nothing,
  reading,
  render,
}: {
  heading: string;
  subject: string;
  nothing: string;
  reading: Reading<T>;
  render: (value: T) => React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <H>{heading}</H>
      {reading.kind === 'unreadable' ? (
        <>
          <p role="alert" className="text-sm text-text-secondary">
            This could not be read: {reading.reason}
          </p>
          <WhyNotLoaded cause={reading.cause} subject={subject} />
        </>
      ) : reading.kind === 'none' ? (
        <p className="text-sm text-text-secondary">{nothing}</p>
      ) : (
        render(reading.value)
      )}
    </div>
  );
}

/**
 * A number, at the precision the field's own name implies.
 *
 * The same rule `stoppages.tsx` derives its units by: `…Usd` is dollars,
 * `…Pct` a percentage the platform already scaled. A field nobody anticipated
 * still renders in the right unit.
 */
function figure(field: string, value: number): string {
  const rounded = Math.round(value * 10000) / 10000;
  if (field.endsWith('Usd')) return `$${rounded}`;
  if (field.endsWith('Pct')) return `${rounded}%`;
  return String(rounded);
}

/** A percentage for reading, one decimal, with a real minus sign (U+2212). */
function pct(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded < 0 ? '−' : ''}${Math.abs(rounded)}%`;
}

function duration(seconds: number): string {
  if (seconds < 90) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 90) return `${minutes} min`;
  const hours = Math.round((seconds / 3600) * 10) / 10;
  return `${hours} h`;
}

function Defaults({ rows }: { rows: readonly AgainstDefault[] }) {
  const compared = rows.filter((c) => c.platformDefault !== null && c.writable);
  const uncompared = rows.filter((c) => c.platformDefault === null && c.writable);
  /**
   * Read here, owned elsewhere.
   *
   * The agent read still returns the trade-level policy BattleGrid v15 moved
   * onto the strategy, so the comparison is real — `maxStopLossPct: 1` against
   * a declared default of 5 is exactly the reading this panel exists to give.
   * It is separated rather than dropped, because a number an operator cannot
   * change from here, shown beside eight they can, is an invitation to try.
   */
  const elsewhere = rows.filter((c) => !c.writable && c.platformDefault !== null);

  return (
    <>
      <ul className="space-y-2">
        {compared.map((c) => (
          <li key={c.field} className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-mono text-sm text-text-primary">{c.field}</span>
            <span className="text-sm text-text-secondary">
              {figure(c.field, c.value)}
              {c.matchesDefault ? (
                <> · the platform&rsquo;s default</>
              ) : (
                <>
                  {' '}
                  against a default of {figure(c.field, c.platformDefault as number)}
                  {c.multiple !== null && (
                    <>
                      {' · '}
                      <strong className="text-text-primary">
                        {Math.round(c.multiple * 100) / 100}×
                      </strong>
                    </>
                  )}
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
      {uncompared.length > 0 && (
        <p className="text-sm text-text-secondary">
          BattleGrid declares no default for{' '}
          <strong className="text-text-primary">{uncompared.map((c) => c.field).join(', ')}</strong>
          , so {uncompared.length === 1 ? 'it is' : 'they are'} shown without a comparison. It will
          not decide on anyone&rsquo;s behalf how much an agent may lose.
        </p>
      )}

      {elsewhere.length > 0 && (
        <div className="space-y-2 border-t border-border-subtle pt-3">
          <p className="text-sm text-text-secondary">
            These are read from the agent and <strong className="text-text-primary">set on its
            strategy</strong> — BattleGrid moved the trade-level policy across, so changing them
            here is not possible.
          </p>
          <ul className="space-y-2">
            {elsewhere.map((c) => (
              <li key={c.field} className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-mono text-sm text-text-secondary">{c.field}</span>
                <span className="text-sm text-text-secondary">
                  {figure(c.field, c.value)}
                  {c.matchesDefault ? (
                    <> · the platform&rsquo;s default</>
                  ) : (
                    <>
                      {' '}
                      against a default of {figure(c.field, c.platformDefault as number)}
                      {c.multiple !== null && (
                        <>
                          {' · '}
                          <strong className="text-text-primary">
                            {Math.round(c.multiple * 100) / 100}×
                          </strong>
                        </>
                      )}
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function Geometry({ geometry }: { geometry: ExitGeometry }) {
  return (
    <>
      <ul className="space-y-2">
        {geometry.endings.map((e) => (
          <Row key={e.reason} ending={e} geometry={geometry} />
        ))}
      </ul>
      <p className="text-sm text-text-secondary">
        Computed by Grid-Commander from {geometry.measured} closed{' '}
        {geometry.measured === 1 ? 'trade' : 'trades'}
        {geometry.from && geometry.to && (
          <>
            {' '}
            closed between {geometry.from.toISOString().slice(0, 10)} and{' '}
            {geometry.to.toISOString().slice(0, 10)}
          </>
        )}
        , not published by BattleGrid.
        {geometry.unmeasurable > 0 && (
          <>
            {' '}
            {geometry.unmeasurable} {geometry.unmeasurable === 1 ? 'trade' : 'trades'} carried no
            measurable move and {geometry.unmeasurable === 1 ? 'is' : 'are'} excluded from the
            figures above.
          </>
        )}
      </p>
      {geometry.medianDurationSeconds !== null && (
        <p className="text-sm text-text-secondary">
          Its positions last a median of{' '}
          <strong className="text-text-primary">{duration(geometry.medianDurationSeconds)}</strong>.
        </p>
      )}
    </>
  );
}

function Row({ ending, geometry }: { ending: Ending; geometry: ExitGeometry }) {
  const share = shareOf(ending, geometry);
  return (
    <li className="space-y-1">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-mono text-sm text-text-primary">{ending.reason}</span>
        <span className="text-sm text-text-secondary">
          {ending.count} {ending.count === 1 ? 'trade' : 'trades'}
          {share !== null && <> · {Math.round(share)}%</>}
          {/*
            Wins and losses from the trade's net, never from its close reason.
            `HYPE` closed at +$0.0731 with `closeReason: STOP_LOSS` because
            position management had trailed the stop into profit — a surface
            reading a stop-out as a loss reports a protected winner as a
            failure, on the screen built to explain losses.
          */}
          {' · '}
          {ending.wins}W/{ending.losses}L
        </span>
      </div>
      <p className="text-sm text-text-secondary">
        {ending.medianMovePct === null ? (
          <>
            Too few measurable trades here to state a median move
            {ending.unmeasurable > 0 && <> ({ending.unmeasurable} unmeasurable)</>}.
          </>
        ) : (
          <>
            Median move <strong className="text-text-primary">{pct(ending.medianMovePct)}</strong>{' '}
            from entry
          </>
        )}
      </p>
    </li>
  );
}

function ManagementBody({ management }: { management: Management }) {
  return (
    <>
      {management.enabled ? (
        <ul className="space-y-1 text-sm text-text-secondary">
          <li>
            Trailing stop:{' '}
            <strong className="text-text-primary">
              {management.trailingEnabled ? 'on' : 'off'}
            </strong>
          </li>
          <li>
            Time decay:{' '}
            <strong className="text-text-primary">
              {management.timeDecayEnabled ? 'on' : 'off'}
            </strong>
          </li>
        </ul>
      ) : (
        <p className="text-sm text-text-secondary">
          Position management is <strong className="text-text-primary">off</strong>. Its trailing
          and time-decay values are set but govern nothing.
        </p>
      )}
      {management.preset !== null && management.differing.length > 0 && (
        <p className="text-sm text-text-secondary">
          Its values differ from{' '}
          <strong className="text-text-primary">{management.preset}</strong> on{' '}
          {management.differing.join(', ')} — the label alone does not describe what it does.
        </p>
      )}
    </>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="font-medium text-text-primary">{children}</h2>;
}
