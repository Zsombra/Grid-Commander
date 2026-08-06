import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { WhyNotLoaded } from '@/presentation/components/why-not-loaded.js';

/**
 * What the agent did with the money.
 *
 * The trades it closed, newest first, with every figure the platform sent
 * — both fees, both sides' slippage, the leverage and the conviction it
 * acted on, and why it ended. Beneath them a summary **this product
 * computed from these trades**, said in those words: BattleGrid publishes
 * an aggregate of its own and it has answered zeros on agents carrying
 * real losses, so a total shown here must never be mistaken for one the
 * platform stands behind.
 */

const money = (v: number | null): string =>
  v === null ? '—' : `${v < 0 ? '−' : '+'}$${Math.abs(v).toFixed(4)}`;

function duration(seconds: number | null): string {
  if (seconds === null) return 'unknown';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default async function TradesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { page: pageRaw } = await searchParams;
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const parsed = Number.parseInt(pageRaw ?? '1', 10);
  const page = Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
  const result = await app.readTradingRecord.execute({ ...user.authority, agentId: id, page });

  if (result.kind === 'unreadable') {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-xl font-medium">The trading record could not be read</h1>
        <p role="alert" className="text-sm">{result.reason}</p>
        {/* The trades happened; only the reading of them failed. Said here
            because this is the surface where a blank page most reads as money
            having disappeared. */}
        <WhyNotLoaded cause={result.cause} subject="these trades are" />
        <p className="text-sm">
          <a href={`/agents/${id}`} className="underline">Back to the agent</a>
        </p>
      </main>
    );
  }

  if (result.kind === 'none') {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-xl font-medium">No closed trades yet</h1>
        {/* Not a summary of zeros: "has not traded" and "traded to nothing"
            are different facts, and only one of them is a result. */}
        <p className="text-sm">
          This agent has not closed a trade. Nothing here is a judgement about
          how it performs — there is simply nothing to judge yet.
        </p>
        <p className="text-sm">
          <a href={`/agents/${id}`} className="underline">Back to the agent</a>
        </p>
      </main>
    );
  }

  const { outcomes, summary, total } = result;
  const shownSoFar = outcomes.length + (page - 1) * outcomes.length;
  const more = total !== null && shownSoFar < total;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-xl font-medium">What this agent did with the money</h1>

      <section className="space-y-2 rounded border p-4 text-sm">
        <h2 className="text-base font-medium">
          {summary.closed} closed trade{summary.closed === 1 ? '' : 's'} on this page
        </h2>
        <p>
          {summary.wins} won · {summary.losses} lost
          {summary.flat > 0 ? ` · ${summary.flat} flat` : ''} · net {money(summary.netPnl)} after{' '}
          {money(summary.feesPaid)} in fees
        </p>
        <p>Average time in a position: {duration(summary.averageDurationSeconds)}</p>
        <p>
          Closed because:{' '}
          {summary.closeReasons.map((r) => `${r.reason} (${r.count})`).join(', ')}
        </p>
        {/* The honesty line this whole surface turns on. */}
        <p className="text-text-secondary">
          These totals are computed from the trades listed below, not published
          by BattleGrid. Its own performance figures read zero for this account.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-medium">The trades</h2>
        <ul className="space-y-3">
          {outcomes.map((o) => (
            <li key={o.id} className="rounded border p-3 text-sm space-y-1">
              <p className="font-medium">
                {o.coinTicker} {o.direction} · net {money(o.netPnl)}
              </p>
              <p>
                Entry {o.entryFillPrice ?? '—'} → exit {o.exitFillPrice ?? '—'} ·{' '}
                {o.effectiveLeverage !== null ? `${o.effectiveLeverage}× leverage` : 'leverage unstated'} ·
                held {duration(o.durationSeconds)}
              </p>
              <p>
                Fees {money(o.totalFees)} · slippage in {o.slippageEntry ?? '—'}, out{' '}
                {o.slippageExit ?? '—'}
              </p>
              <p>
                {o.closeReason ? `Closed ${o.closeReason}` : 'Close reason unstated'}
                {o.closedBy ? ` by ${o.closedBy}` : ''}
                {o.conviction !== null
                  ? ` · opened at ${Math.round(o.conviction * 100)}% conviction`
                  : ''}
              </p>
              {o.closedAt ? <p className="text-text-secondary">Closed {o.closedAt}</p> : null}
            </li>
          ))}
        </ul>
      </section>

      <p className="text-sm">
        {total !== null ? `${total} closed trade(s) in total. ` : ''}
        {page > 1 ? (
          <>
            <a href={`/agents/${id}/trades?page=${page - 1}`} className="underline">
              Previous page
            </a>{' '}
            ·{' '}
          </>
        ) : null}
        {more ? (
          <>
            <a href={`/agents/${id}/trades?page=${page + 1}`} className="underline">
              Next page
            </a>{' '}
            ·{' '}
          </>
        ) : null}
        <a href={`/agents/${id}`} className="underline">Back to the agent</a>
      </p>
    </main>
  );
}
