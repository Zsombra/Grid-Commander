import { acting } from '@/presentation/session.js';
import { draftFromQuery, MEMBER_SLOTS } from '@/presentation/condition-form.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { WhyNotLoaded } from '@/presentation/components/why-not-loaded.js';
import { ConditionOutcomes } from '@/presentation/components/condition-outcomes.js';
import {
  ConditionComposer,
  DraftedCondition,
} from '@/presentation/components/condition-composer.js';
import type { CoinSelection } from '@/ports/strategies.js';

/**
 * Draft a condition and ask BattleGrid what it would do.
 *
 * `/strategies/[id]` says what a strategy's conditions *are*.
 * `/strategies/[id]/preview` says what they *did*, on live coins. This page
 * asks the third question — what would a condition you have not written do —
 * and it is the only one of the three that an author can act on.
 *
 * **Nothing here writes.** The single platform call is
 * `preview_strategy_report`, the same read the preview page makes, annotated
 * `readOnlyHint: true` and `destructiveHint: false`. There is no server action
 * in this file; a draft lives in the URL and nowhere else.
 *
 * Saving one is a separate act on a separate route, `conditions/save`, reached
 * from here carrying the draft's own query — so what is saved is what was
 * resolved, read back by the same parser. That route compiles the strategy's
 * whole condition list, states what it would become, and asks for agreement;
 * this one still cannot save anything, and still says so.
 */

/**
 * The draft's own query, ready to be re-attached to the save route.
 *
 * The saved condition has to be the one that was tried, and the draft exists
 * only as this query string — so it travels whole rather than being rebuilt
 * from the parsed definition, which would be a second serialisation of a
 * grammar that already has one.
 */
function draftQuery(q: Record<string, string | string[] | undefined>): string {
  const out = new URLSearchParams();
  for (const [key, value] of Object.entries(q)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (typeof first === 'string') out.set(key, first);
  }
  return out.toString();
}

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

export default async function DraftConditionPage({
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

  const parsed = draftFromQuery(q);
  const result = await app.tryCondition.execute({
    ...user.authority,
    strategyId: id,
    coinSelection: selectionFrom(q),
    // A malformed submission still reads the strategy, so the composer comes
    // back filled in with what was typed rather than blank. Sending nothing is
    // the point: a form that does not describe a definition is not a question
    // BattleGrid can be asked.
    draft:
      parsed.kind === 'draft'
        ? { kind: 'composed', condition: parsed.condition }
        : parsed.kind === 'from-existing'
          ? parsed
          : null,
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
        <h1 className="text-xl font-medium">The strategy could not be read</h1>
        <p role="alert" className="text-sm">{result.reason}</p>
        {/* The draft is not the subject here — the strategy a draft is composed
            against is, because a composer with nothing to compose against is
            what actually failed. */}
        <WhyNotLoaded cause={result.cause} subject="this strategy is" />
        <p className="text-sm">
          <a href={`/strategies/${id}`} className="underline">Back to the strategy</a>
        </p>
      </main>
    );
  }

  const { strategy, existing } = result;
  const back = (
    <p className="text-sm">
      <a href={`/strategies/${strategy.id}`} className="underline">Back to {strategy.name}</a>
    </p>
  );

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-xl font-medium">Draft a condition for {strategy.name}</h1>
      <p className="text-sm">
        Conditions decide direction — signals produce a score, and a condition decides
        whether it is consulted. Compose one here and BattleGrid resolves it against live
        market data, beside this strategy&apos;s own conditions.{' '}
        <strong>
          {`Nothing composed here is saved until you take the separate step of saving it.`}
        </strong>
      </p>
      <p className="text-sm">
        {`Saving is a separate act, on its own page: it compiles the strategy's whole condition list, states what that list would become, and asks you to agree before anything is written.`}{' '}
        <a href={`/strategies/${strategy.id}/conditions/save`} className="underline">
          What this strategy defines now
        </a>
        {' — and where a condition is removed.'}
      </p>
      <p className="text-sm text-text-secondary">
        This composer builds one level of grouping over up to {MEMBER_SLOTS} members. The
        platform&apos;s grammar nests further, and{' '}
        <a href={`/strategies/${strategy.id}`} className="underline">
          the strategy page
        </a>{' '}
        reads any depth — a condition too deeply nested to compose here is still shown
        there in full.
      </p>

      {existing.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-base font-medium">Start from one this strategy already has</h2>
          <p className="text-sm text-text-secondary">
            Takes the definition whole, at whatever depth it has, and lets you give it a
            different key or a different call. This is the only way to ask a question about a
            condition too deeply nested for the rows below to build.
          </p>
          <ul className="space-y-1 text-sm">
            {existing.map((c) => (
              <li key={c.conditionKey}>
                <a
                  // The source's own identity travels in the link so a bare
                  // click does not silently demote a directional call to a
                  // building block — the verdict select submits a definite
                  // value, and "none" is one of them.
                  href={`/strategies/${strategy.id}/conditions?try=1&from=${encodeURIComponent(c.conditionKey)}&key=${encodeURIComponent(c.conditionKey)}&name=${encodeURIComponent(c.name)}&verdict=${c.verdict ?? ''}`}
                  className="underline"
                >
                  {c.name} ({c.conditionKey})
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.kind === 'no-such-condition' && (
        <p role="alert" className="rounded border p-3 text-sm">
          {/* Not a blank composer. A stale link and a fresh start look identical
              as an empty form, and the operator who followed the link is
              entitled to know which they got. */}
          This strategy defines no condition called {result.sourceKey}, so there was nothing to
          start from. It may have been renamed or removed since this link was made.
        </p>
      )}

      {parsed.kind === 'malformed' && (
        <section className="space-y-2">
          <h2 className="text-base font-medium">This draft is not finished</h2>
          {/* Ours to say, and said as ours. These are rows that do not describe
              a definition at all — nothing was sent, so BattleGrid has no
              opinion to report and none is implied. */}
          <ul role="alert" className="space-y-1 rounded border p-3 text-sm">
            {parsed.problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </section>
      )}

      {result.kind === 'inexpressible' && (
        <section className="space-y-2">
          <h2 className="text-base font-medium">
            Part of this draft cannot be sent to BattleGrid
          </h2>
          <ul role="alert" className="space-y-1 rounded border p-3 text-sm">
            {result.reasons.map((reason) => (
              <li key={reason}>Not understood by Grid-Commander: {reason}</li>
            ))}
          </ul>
          <p className="text-sm text-text-secondary">
            Nothing was sent. Grid-Commander will not write back a form it did not
            understand — a guessed shape would reach the platform as though you had
            composed it.
          </p>
        </section>
      )}

      {(result.kind === 'tried' || result.kind === 'inexpressible') && (
        <DraftedCondition
          draft={result.draft}
          existing={existing}
          standing={result.kind === 'tried' ? result.standing : undefined}
          alongside={result.kind === 'tried' ? result.alongside : undefined}
        />
      )}

      {result.kind === 'tried' && (
        <p className="text-sm">
          <a
            // The draft's own query, carried whole — so the describe on the
            // other side reads the same rows this one resolved, rather than a
            // second rendering of them.
            href={`/strategies/${strategy.id}/conditions/save?${draftQuery(q)}`}
            className="underline"
          >
            {`Save this draft to ${strategy.name}`}
          </a>
          {` — you will see what the whole condition list would become, and agree to it, before anything is written.`}
        </p>
      )}

      {result.kind === 'tried' &&
        (result.outcome.kind === 'refused' ? (
          <section className="space-y-2">
            <h2 className="text-base font-medium">BattleGrid refused this draft — here is why</h2>
            {/* The platform's words, whole. Its validator names the offending
                path and what is legal in its place, and that teaching is the
                most useful thing this surface can show. */}
            <p role="alert" className="rounded border p-3 text-sm">{result.outcome.reason}</p>
          </section>
        ) : (
          <ConditionOutcomes
            outcomes={result.outcome.preview.conditionOutcomes}
            // Every condition sent, the draft among them — so the "returned no
            // outcome" case counts what was actually asked about rather than
            // what the strategy happens to define.
            conditionsAsked={result.alongside + 1}
            subject="Grid-Commander sent"
          />
        ))}

      <ConditionComposer q={q} existing={existing} />
      {back}
    </main>
  );
}
