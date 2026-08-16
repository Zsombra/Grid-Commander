import type { BudgetBlock, Limit, SizingBase } from '@/application/use-cases/read-budget.query.js';

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
  sizing = null,
  block = null,
}: {
  limits: readonly Limit[];
  unbounded: readonly string[];
  warnings: readonly string[];
  halted: boolean;
  sizing?: SizingBase | null;
  block?: BudgetBlock | null;
}) {
  return (
    <section className="space-y-4">
      {halted && (
        <p role="alert" className="rounded-gc-2 border border-consequence-border bg-consequence-subtle p-3 text-sm font-medium text-text-primary">
          BattleGrid has stopped this agent.
        </p>
      )}

      <BlockedNotice block={block} />
      <SizingPanel sizing={sizing} />

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

/**
 * What is left under the exposure cap, and what that remainder is *for*.
 *
 * The cap alone reads as prudence. It is not a ceiling that trips — BattleGrid
 * sizes each new entry from what remains beneath it, so entries shrink as it
 * fills and one eventually falls under the exchange minimum and is refused
 * without exposure ever being named. An operator reading a remaining balance
 * will read it as room to keep going; naming the mechanism is the difference
 * between that and knowing why the agent went quiet.
 *
 * **No projected order size appears here and none may be added.** That figure
 * is `headroom x sizePct x effectiveLeverage` — the preset is this product's to
 * apply, the platform publishes no per-preset projection, and computing one is
 * what `the-approval-can-be-answered` refused as PE-2 on the neighbouring money
 * surface. `tests/agent/sizing-base.test.ts` scans this file for it.
 */
function SizingPanel({ sizing }: { sizing: SizingBase | null }) {
  // No exposure gauge at all, or a cap the platform reports unconfigured. An
  // unbounded cap has no proportion to be full of, and `0% used` would describe
  // a limit that does not exist.
  if (sizing === null || !sizing.configured) return null;

  return (
    <section className="space-y-1 rounded-gc-2 border border-border-default p-3">
      <h3 className="text-sm font-medium text-text-primary">What is left to trade with</h3>
      <p className="text-sm text-text-secondary">
        {sizing.committedUsd === null
          ? 'BattleGrid reported nothing committed against this cap.'
          : `${sizing.committedUsd} committed`}
        {sizing.headroomUsd === null ? '' : ` · ${sizing.headroomUsd} left`}
      </p>
      <p className="text-sm text-text-primary">
        BattleGrid sizes each new trade from what is left, not from the cap
        {sizing.authorizedNotionalUsd === null
          ? '.'
          : ` — it reports that ${sizing.authorizedNotionalUsd} of position is currently authorized.`}
      </p>
      <p className="text-sm text-text-secondary">
        As this falls, each new trade is smaller. Below the exchange minimum they stop
        being placed at all, and BattleGrid does not say why.
      </p>
    </section>
  );
}

/**
 * A budget-side stop the platform names itself.
 *
 * The one place BattleGrid states this directly rather than leaving it to be
 * inferred from an agent that quietly stopped acting. Where it blocked an agent
 * and gave no reason, this says so rather than supplying the likeliest one.
 */
function BlockedNotice({ block }: { block: BudgetBlock | null }) {
  if (block === null) return null;

  return (
    <p role="alert" className="rounded-gc-2 border border-consequence-border bg-consequence-subtle p-3 text-sm text-text-primary">
      {block.reason === null
        ? 'BattleGrid reports this agent’s budget blocked, and gave no reason for it.'
        : `BattleGrid reports this agent’s budget blocked: ${block.reason}`}
      {block.since === null ? '' : ` Since ${block.since.toISOString().replace('T', ' ').slice(0, 16)} UTC.`}
      {block.overSubscribed ? ' Its limits are over-subscribed.' : ''}
    </p>
  );
}
