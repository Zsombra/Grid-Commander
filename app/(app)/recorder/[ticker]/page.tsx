import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { CoinTimeline, SignalHistoryView } from '@/presentation/components/signal-record.js';

/**
 * One coin's recorded history — every capture and every failed attempt, and,
 * when `?signal=` names one, what that signal said across captures.
 *
 * `?signal=rsi_oversold` is a query parameter for the reason qualification's
 * `?coins=` is: a read with no consequence, a link someone can paste.
 */
export default async function CoinRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<{ signal?: string | string[] | undefined }>;
}) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { ticker } = await params;
  const { signal } = await searchParams;
  const signalId = Array.isArray(signal) ? signal[0] : signal;

  const history = await app.readSignalHistory.execute({
    userId: user.authority.userId,
    coinTicker: decodeURIComponent(ticker),
    signalId: signalId || undefined,
  });

  if (history.kind === 'unreadable') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 px-6 py-8">
        <h1 className="text-lg font-medium">Signal record</h1>
        <p className="font-medium">The record could not be read.</p>
        <p className="text-sm text-text-secondary">{history.reason}</p>
        <p className="text-sm">
          This does not mean nothing is recorded — the store did not answer, which says nothing
          about what it holds.
        </p>
      </main>
    );
  }

  if (history.kind === 'empty') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 px-6 py-8">
        <h1 className="text-lg font-medium">{history.coinTicker} — signal record</h1>
        <p className="text-sm">
          Nothing is recorded for {history.coinTicker}. Captures land here once a recorder run
          covers it — see <a href="/recorder">the record</a> for what is being recorded now.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-6 py-8">
      <h1 className="text-lg font-medium">{history.coinTicker} — signal record</h1>
      {history.signal !== null && (
        <SignalHistoryView signalId={history.signal.signalId} points={history.signal.points} />
      )}
      <h2 className="text-base font-medium">Captures</h2>
      <CoinTimeline entries={history.entries} />
    </main>
  );
}
