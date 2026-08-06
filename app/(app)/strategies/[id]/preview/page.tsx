import { acting } from '@/presentation/session.js';
import { CONTROL } from '@/presentation/components/control.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { WhyNotLoaded } from '@/presentation/components/why-not-loaded.js';
import type { CoinSelection } from '@/ports/strategies.js';

/**
 * The agent's-eye view: what an agent bound to this strategy would actually
 * read, rendered live by the platform over a bounded coin selection —
 * saving nothing, changing nothing. Beneath it, the same composition's
 * signal membership: which weights would do something, and which rules the
 * report cannot feed.
 */

function selectionFrom(q: Record<string, string | string[] | undefined>): CoinSelection {
  const one = (key: string): string | undefined => {
    const v = q[key];
    const s = Array.isArray(v) ? v[0] : v;
    return s && s.length > 0 ? s : undefined;
  };
  const tickers = one('tickers');
  if (tickers) {
    return {
      mode: 'explicit',
      tickers: tickers
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0),
    };
  }
  const limit = Number.parseInt(one('limit') ?? '3', 10);
  return { mode: 'ranked', limit: Number.isFinite(limit) && limit >= 1 ? Math.min(limit, 100) : 3 };
}

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const q = await searchParams;
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const selection = selectionFrom(q);
  const result = await app.previewComposition.execute({
    ...user.authority,
    strategyId: id,
    coinSelection: selection,
  });

  if (result.kind === 'strategy-missing') {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-xl font-medium">No such strategy</h1>
        <p className="text-sm">
          <a href="/strategies" className="underline">Back to strategies</a>
        </p>
      </main>
    );
  }

  if (result.kind === 'unreadable') {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-xl font-medium">The preview could not be read</h1>
        <p role="alert" className="text-sm">{result.reason}</p>
        {/* The preview is rendered on demand and never stored, so the subject
            is the composition it was rendered from — the thing an author
            would fear they had broken. */}
        <WhyNotLoaded cause={result.cause} subject="this strategy is" />
        <p className="text-sm">
          <a href={`/strategies/${id}`} className="underline">Back to the strategy</a>
        </p>
      </main>
    );
  }

  const { strategy, outcome, membership } = result;
  const feeds = membership.filter((m) => m.inReport);
  const starves = membership.length - feeds.length;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-xl font-medium">What an agent reads on {strategy.name}</h1>
      <p className="text-sm">
        Rendered live by BattleGrid from the strategy&apos;s current composition
        — nothing is saved or changed by previewing.
      </p>

      <form method="get" className="flex flex-wrap items-end gap-3 text-sm">
        <label className="block">
          Top ranked coins
          <input
            type="text"
            name="limit"
            className={CONTROL}
            defaultValue={selection.mode === 'ranked' ? String(selection.limit) : ''}
          />
        </label>
        <label className="block">
          …or explicit tickers (comma-separated)
          <input
            type="text"
            name="tickers"
            className={CONTROL}
            defaultValue={selection.mode === 'explicit' ? selection.tickers.join(', ') : ''}
          />
        </label>
        <button type="submit" className="rounded border px-4 py-2 text-sm">
          Preview again
        </button>
      </form>

      {outcome.kind === 'refused' ? (
        <section className="space-y-2">
          <h2 className="text-base font-medium">The platform refused this draft — here is why</h2>
          <p role="alert" className="rounded border p-3 text-sm">{outcome.reason}</p>
        </section>
      ) : (
        <>
          <section className="space-y-2 text-sm">
            <h2 className="text-base font-medium">Cost</h2>
            {/* Every figure against its ceiling, the token estimate among them.
                v9 moved that estimate into the budget as used/cap and stopped
                returning it separately; this page used to read the standalone
                field, get nothing, and print "Token estimate unavailable"
                immediately above the gauge that had it. */}
            <ul className="space-y-1">
              {outcome.preview.budget.map((g) => (
                <li key={g.name}>
                  {g.name}: {g.used} of {g.cap}
                </li>
              ))}
            </ul>
            {outcome.preview.tokenCountModel ? (
              // A note on how the budget was measured, not a qualifier hanging
              // off a number that is not there.
              <p className="text-text-secondary">
                Tokens counted as {outcome.preview.tokenCountModel}.
              </p>
            ) : null}
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-medium">The report, as the agent receives it</h2>
            {outcome.preview.sections.map((s) => (
              <details key={s.sectionKey} className="rounded border p-3 text-sm">
                <summary className="font-medium">{s.title}</summary>
                <p className="whitespace-pre-wrap pt-2">{s.text}</p>
              </details>
            ))}
          </section>
        </>
      )}

      <section className="space-y-2 text-sm">
        <h2 className="text-base font-medium">What this composition can feed</h2>
        <p>
          {feeds.length} signal(s) can read this report
          {starves > 0 ? ` · ${starves} cannot — weighting them would do nothing` : ''}.
        </p>
        {feeds.length > 0 ? (
          <ul className="space-y-1">
            {feeds.map((m) => (
              <li key={m.signalId}>
                <a href={`/strategies/signals/${m.signalId}`} className="underline">
                  {m.signalId}
                </a>
                {m.defaultAllocation !== null ? ` · platform default ${m.defaultAllocation}` : ''}
              </li>
            ))}
          </ul>
        ) : (
          <p role="alert">
            No signal can read this report — an agent bound to it would weigh
            nothing.
          </p>
        )}
      </section>

      <p className="text-sm">
        <a href={`/strategies/${strategy.id}`} className="underline">Back to {strategy.name}</a>
      </p>
    </main>
  );
}
