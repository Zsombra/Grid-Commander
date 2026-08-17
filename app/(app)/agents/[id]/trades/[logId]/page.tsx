import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { WhyNotLoaded } from '@/presentation/components/why-not-loaded.js';
import { TradeStoryView } from '@/presentation/components/trade-story.js';

/**
 * How one trade unfolded.
 *
 * The frozen chart with the levels as placed, then the audit trail of what
 * position management did to those levels while the trade was open — the
 * only surface where an operator can watch the trailing they configured
 * actually act on real money.
 *
 * Four states, four pages: a story, an evaluation that never became a
 * trade, an evaluation that is not this agent's, and a read that failed.
 * The platform keeps them apart and so does this route — a failed read
 * shown as "no such trade" would send an operator hunting for a trade
 * they watched happen.
 */
export default async function TradeStoryPage({
  params,
}: {
  params: Promise<{ id: string; logId: string }>;
}) {
  const { id, logId } = await params;
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const result = await app.readTradeStory.execute({ ...user.authority, agentId: id, logId });

  if (result.kind === 'unreadable') {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-xl font-medium">This trade&apos;s story could not be read</h1>
        <p role="alert" className="text-sm">{result.reason}</p>
        {/* The trade happened; only the reading failed. Distinct from
            not-found below, which is the platform saying there is no such
            evaluation at all. */}
        <WhyNotLoaded cause={result.cause} subject="this story is" />
        <p className="text-sm">
          <a href={`/agents/${id}/trades`} className="underline">Back to the trades</a>
        </p>
      </main>
    );
  }

  if (result.kind === 'no-trade') {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-xl font-medium">This evaluation never became a trade</h1>
        <p className="text-sm">
          The platform has no chart for it because no order was ever filled —
          the evaluation ran and stopped short of the market. That is an
          answer about the trade, not a failure to load one.
        </p>
        <p className="text-sm">
          <a href={`/agents/${id}/pipeline`} className="underline">
            What the agent decided instead
          </a>{' '}
          ·{' '}
          <a href={`/agents/${id}/trades`} className="underline">Back to the trades</a>
        </p>
      </main>
    );
  }

  if (result.kind === 'not-found') {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-xl font-medium">No such evaluation on this agent</h1>
        <p className="text-sm">
          The platform has no evaluation with this id belonging to this agent.
          If the link came from a trade row, the agent may have been switched
          underneath it.
        </p>
        <p className="text-sm">
          <a href={`/agents/${id}/trades`} className="underline">Back to the trades</a>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-xl font-medium">
        {result.chart.coinTicker === null
          ? 'How this trade unfolded'
          : `How the ${result.chart.coinTicker} trade unfolded`}
      </h1>
      <TradeStoryView chart={result.chart} audit={result.audit} />
      <p className="text-sm">
        <a href={`/agents/${id}/trades`} className="underline">Back to the trades</a>{' '}
        ·{' '}
        <a href={`/agents/${id}`} className="underline">Back to the agent</a>
      </p>
    </main>
  );
}
