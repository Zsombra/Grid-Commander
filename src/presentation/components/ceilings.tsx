import type { Limit } from '@/application/use-cases/read-budget.query.js';

/**
 * How close an agent is to the ceilings that would stop it.
 *
 * Every reading is computed in the query. The one rule this file must not break
 * is that a gauge with no ceiling never renders a number for its headroom: the
 * platform sends `remaining: 0` there, and "0 remaining" says the opposite of
 * what it means.
 */
export function Ceilings({
  limits,
  unbounded,
  warnings,
  halted,
}: {
  limits: readonly Limit[];
  unbounded: readonly string[];
  warnings: readonly string[];
  halted: boolean;
}) {
  return (
    <section className="space-y-4">
      {halted && (
        <p role="alert" className="rounded-gc-2 border border-consequence-border bg-consequence-subtle p-3 text-sm font-medium text-text-primary">
          BattleGrid has stopped this agent.
        </p>
      )}

      {warnings.map((w) => (
        <p key={w} role="alert" className="rounded-gc-2 border border-consequence-border p-3 text-sm text-text-primary">
          {w}
        </p>
      ))}

      <ul className="space-y-3">
        {limits.map((l) => (
          <li key={l.name} className="space-y-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-text-primary">{l.label}</span>
              {l.binds ? (
                <span className="text-sm text-text-secondary">
                  {l.gauge.used} of {l.gauge.ceiling} · {l.gauge.remaining} left
                </span>
              ) : (
                /*
                  No number here, deliberately. The platform reports
                  `remaining: 0` for a limit that does not exist, and printing
                  it would tell the operator this agent is out of headroom when
                  in fact nothing will ever stop it.
                */
                <span className="text-sm text-text-secondary">
                  {l.gauge.used} used · <strong>no limit set</strong>
                </span>
              )}
            </div>
            {l.gauge.breached && (
              <p role="alert" className="text-sm text-text-primary">
                This limit has been breached.
              </p>
            )}
          </li>
        ))}
      </ul>

      {unbounded.length > 0 && (
        <p className="text-sm text-text-secondary">
          Nothing will stop this agent on <strong>{unbounded.join(', ')}</strong>.
          No ceiling is set for {unbounded.length === 1 ? 'it' : 'them'}, so the
          figures above are what it has used, not how close it is to anything.
        </p>
      )}
    </section>
  );
}
