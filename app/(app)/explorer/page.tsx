import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { FIELD_SORTS, FIELD_WINDOWS } from '@/ports/explorer.js';
import type { FieldSort, FieldWindow } from '@/ports/explorer.js';
import { BUTTON_SECONDARY, CONTROL, LABEL } from '@/presentation/components/control.js';
import { WhyNotLoaded } from '@/presentation/components/why-not-loaded.js';

/**
 * The field: who else is doing this, and how it is going for them.
 *
 * Every performance figure elsewhere in this product is unanchored. An
 * agent down $9.64 over three trades cannot be judged without knowing the
 * field is down $162 over 773 — so this page exists to be the denominator.
 *
 * Three platform behaviours it is built around, each established live
 * 2026-08-03 and each a way this page could lie if it were not:
 *
 *  - The entry list is sometimes shorter than the field it reports, and
 *    `limit` does not change that — 5 of 37 four runs running, then 37 of
 *    37 to the same request an hour later. Because it is intermittent
 *    there is no moment at which the list may be assumed whole, so the
 *    heading counts rows and the field total is stated separately.
 *  - A win rate can be absent, and absent is not zero.
 *  - Sorting by win rate promotes the smallest sample — first place was an
 *    agent at 100% on one trade — so every rate is printed beside its
 *    trade count.
 */

/** A percentage the platform may not have measured. Never falls back to 0. */
const rate = (v: number | null): string => (v === null ? 'not measured' : `${Math.round(v)}%`);

/** Money, signed, so a loss reads as a loss at a glance. */
const usd = (v: number | null): string =>
  v === null ? '—' : `${v < 0 ? '−' : ''}$${Math.abs(v).toFixed(2)}`;

const isWindow = (v: string | undefined): v is FieldWindow =>
  FIELD_WINDOWS.includes(v as FieldWindow);
const isSort = (v: string | undefined): v is FieldSort => FIELD_SORTS.includes(v as FieldSort);

const SORT_LABEL: Record<FieldSort, string> = {
  NET_PNL: 'net P&L',
  WIN_RATE: 'win rate',
  TRADE_COUNT: 'trades',
};

export default async function ExplorerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const q = await searchParams;
  const one = (k: string): string | undefined => {
    const v = q[k];
    return Array.isArray(v) ? v[0] : v;
  };
  // Only the platform's own enums reach the adapter. An unrecognised value
  // in the URL falls back rather than being forwarded.
  const timeframe: FieldWindow = isWindow(one('window')) ? (one('window') as FieldWindow) : 'ALL_TIME';
  const sortBy: FieldSort = isSort(one('sort')) ? (one('sort') as FieldSort) : 'NET_PNL';

  const { field, leaderboard } = await app.readField.execute({
    ...user.authority,
    timeframe,
    sortBy,
  });

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-xl font-medium">The field</h1>
      <p className="text-sm">
        Every other agent on BattleGrid, and where this account sits among
        them. Reads only.
      </p>

      <section className="space-y-2">
        <h2 className="text-base font-medium">Where you stand</h2>
        {leaderboard.kind === 'unreadable' ? (
          <>
            <p role="alert" className="text-sm">
              Your standing could not be read: {leaderboard.reason}
            </p>
            {/* The branch below says BattleGrid does not place this account
                yet. Unread and unplaced must not read alike — one is about
                the platform, the other about this account's results. */}
            <WhyNotLoaded cause={leaderboard.cause} subject="your standing is" />
          </>
        ) : leaderboard.leaderboard.own === null ? (
          <p className="text-sm">
            BattleGrid does not place this account on the profit leaderboard
            yet.
          </p>
        ) : (
          <p className="text-sm">
            Rank {leaderboard.leaderboard.own.rank ?? '—'} by profit
            {leaderboard.leaderboard.own.percentile !== null
              ? `, ahead of ${Math.round(leaderboard.leaderboard.own.percentile)}% of players`
              : ''}
            {leaderboard.leaderboard.own.value !== null
              ? ` · ${usd(leaderboard.leaderboard.own.value)}`
              : ''}
            .
          </p>
        )}

        {/*
          The rows the rank is a rank *among*.

          They were empty when this page was written — the 2026-08-06 surface
          probe recorded `"leaderboard": []` — and they are not now: ten arrive
          on every metric. `ExplorerPort` has modelled them the whole time and
          nothing read them, which is the same gap `binding.state` sat in until
          the platform answered ORPHANED and the roster said "Bound".

          Rendered only when the standing itself was readable, so an outage
          produces one sentence about one failure rather than two about the
          same one.
        */}
        {leaderboard.kind === 'leaderboard' ? (
          leaderboard.leaderboard.entries.length === 0 ? (
            <p className="text-sm">
              {`BattleGrid ranks no players by profit in this window.`}
            </p>
          ) : (
            <ol className="space-y-1 text-sm">
              {leaderboard.leaderboard.entries.map((e, i) => {
                /*
                  Matched on the platform's id and nothing else. This account
                  *is* in this list — measured 2026-08-06, rank 7 by profit
                  inside a top ten — so leaving it unmarked would print one
                  fact twice and claim two. Rank would tie; `displayName` is a
                  string the other player picks.

                  Both ids may be null, and `null === null` is true, so the
                  presence check is what stops two unidentified rows from both
                  reading as yours.
                */
                const own = leaderboard.leaderboard.own;
                const isOwn = e.userId !== null && own !== null && e.userId === own.userId;
                return (
                  <li
                    key={e.userId ?? `${e.displayName}#${i}`}
                    className={isOwn ? 'font-medium' : undefined}
                  >
                    {e.rank ?? '—'}. {e.displayName} · {usd(e.value)}
                    {isOwn ? `${' '}— this account` : ''}
                  </li>
                );
              })}
            </ol>
          )
        ) : null}

        {field.kind === 'field' ? (
          field.field.ownAgents.length === 0 ? (
            <p className="text-sm">None of this account&apos;s agents are ranked in the field.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {field.field.ownAgents.map((a) => (
                <li key={a.agentId}>
                  <a href={`/agents/${a.agentId}`} className="underline">
                    {a.agentName}
                  </a>{' '}
                  — rank {a.rank ?? '—'} · {usd(a.totalNetPnl)}
                </li>
              ))}
            </ul>
          )
        ) : null}
      </section>

      {field.kind === 'unreadable' ? (
        <section className="space-y-2">
          <h2 className="text-base font-medium">The field could not be read</h2>
          {/* Not an empty field: rendering zero agents would say this
              account competes against nobody. */}
          <p role="alert" className="text-sm">
            {field.reason}
          </p>
          <WhyNotLoaded cause={field.cause} subject="the field is" />
        </section>
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="text-base font-medium">The field itself</h2>
            <p className="text-sm">
              {field.field.stats.totalAgents ?? '—'} agents ·{' '}
              {field.field.stats.winCount ?? '—'} wins and{' '}
              {field.field.stats.lossCount ?? '—'} losses · win rate{' '}
              {rate(field.field.stats.winRatePercent)}
            </p>
            <p className="text-sm">
              Net {usd(field.field.stats.totalNetPnl)} across the field,{' '}
              {usd(field.field.stats.avgNetPnl)} per trade on average.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-medium">
              {/* The count is of rows rendered, never of the field. */}
              {field.field.shown} agent{field.field.shown === 1 ? '' : 's'} shown, by{' '}
              {SORT_LABEL[sortBy]}
            </h2>

            <form method="get" className="flex flex-wrap items-end gap-3 text-sm">
              <div className="space-y-1">
                <label htmlFor="window" className={LABEL}>
                  Window
                </label>
                <select id="window" name="window" defaultValue={timeframe} className={CONTROL}>
                  {FIELD_WINDOWS.map((w) => (
                    <option key={w} value={w}>
                      {w.replace('_', ' ').toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="sort" className={LABEL}>
                  Sort by
                </label>
                <select id="sort" name="sort" defaultValue={sortBy} className={CONTROL}>
                  {FIELD_SORTS.map((s) => (
                    <option key={s} value={s}>
                      {SORT_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
              {/* Wore the text input's treatment, `w-full` and all, so it broke
                  onto its own row instead of sitting at the end of the one it
                  belongs to. It re-asks the question in the query string. */}
              <button type="submit" className={BUTTON_SECONDARY}>
                Apply
              </button>
            </form>

            {/*
              The platform reports a field larger than the list it returns,
              and no limit widens it. Saying so is the difference between a
              partial view and a wrong one.
            */}
            {field.field.stats.totalAgents !== null &&
            field.field.shown < field.field.stats.totalAgents ? (
              <p className="text-sm">
                BattleGrid counts {field.field.stats.totalAgents} agents in this
                window but returned {field.field.shown}. This is not the whole
                field.
              </p>
            ) : null}

            {sortBy === 'WIN_RATE' ? (
              <p className="text-sm">
                Sorted by win rate, the top of this list is usually the
                smallest sample — check the trade count before reading a rank
                as skill.
              </p>
            ) : null}

            {field.field.agents.length === 0 ? (
              <p className="text-sm">BattleGrid returned no agents for this window.</p>
            ) : (
              <ul className="space-y-3">
                {field.field.agents.map((a) => (
                  <li key={a.agentId} className="rounded border p-3 text-sm space-y-1">
                    <p className="font-medium">
                      {a.rank !== null ? `#${a.rank} ` : ''}
                      {/* Every row opens. A field you can only read totals
                          from cannot answer what the leaders do. */}
                      <a href={`/explorer/${a.agentId}`} className="underline">
                        {a.agentName}
                      </a>
                      {a.modelDisplayName ? ` · ${a.modelDisplayName}` : ''}
                      {a.ownerDisplayName ? ` · ${a.ownerDisplayName}` : ''}
                    </p>
                    {/* The platform's own billing, unparaphrased. */}
                    {a.subtitle ? <p>{a.subtitle}</p> : null}
                    <p>
                      {usd(a.totalNetPnl)} · win rate {rate(a.winRatePercent)} over{' '}
                      {a.tradeCount ?? '—'} trade{a.tradeCount === 1 ? '' : 's'}
                      {a.roiPercent !== null ? ` · ROI ${a.roiPercent.toFixed(2)}%` : ''}
                    </p>
                    {a.bestTrade || a.worstTrade ? (
                      <p>
                        Best {usd(a.bestTrade?.netPnl ?? null)}
                        {a.bestTrade?.coinTicker ? ` on ${a.bestTrade.coinTicker}` : ''} · worst{' '}
                        {usd(a.worstTrade?.netPnl ?? null)}
                        {a.worstTrade?.coinTicker ? ` on ${a.worstTrade.coinTicker}` : ''}
                      </p>
                    ) : null}
                    {a.objective ? <p>{a.objective}</p> : null}
                    <p className="text-text-secondary">
                      {a.tenureDays !== null ? `${a.tenureDays} days old` : 'age unknown'}
                      {a.strategyName ? ` · ${a.strategyName}` : ''}
                      {a.activeTradeCount ? ` · ${a.activeTradeCount} open now` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {field.field.vendors.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-base font-medium">By model</h2>
              <p className="text-sm">
                Which vendors&apos; agents are actually making money, across
                everyone who runs them.
              </p>
              <ul className="space-y-1 text-sm">
                {field.field.vendors.map((v) => (
                  <li key={v.provider}>
                    {v.provider} — {v.agentCount ?? '—'} agent
                    {v.agentCount === 1 ? '' : 's'} · {v.tradeCount ?? '—'} trade
                    {v.tradeCount === 1 ? '' : 's'} · win rate {rate(v.winRatePercent)} ·{' '}
                    {usd(v.totalNetPnl)}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {field.field.generatedAt ? (
            <p className="text-sm text-text-secondary">
              BattleGrid generated this at {field.field.generatedAt}.
            </p>
          ) : null}
        </>
      )}
    </main>
  );
}
