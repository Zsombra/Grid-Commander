import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { WhyNotLoaded } from '@/presentation/components/why-not-loaded.js';
import { BUTTON_PRIMARY, BUTTON_SECONDARY, CONTROL, LABEL } from '@/presentation/components/control.js';
import { optionalText, requiredText } from '@/presentation/form.js';

/**
 * Take a private copy of a strategy you cannot edit.
 *
 * No confirmation token, deliberately. Forking creates something new and
 * changes nothing that exists — there is no blast radius to name. A confirmation
 * here would train users to click through confirmations that carry no
 * consequence, which is how the ones that do carry one stop being read.
 * See DL-105.
 *
 * The fork is taken at the revision the user was looking at, not at "latest":
 * copying whatever happens to be current would copy a version they never saw.
 */
export default async function ForkStrategyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ problem?: string; name?: string }>;
}) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { id } = await params;
  const { problem, name } = await searchParams;
  const { result, listings, forking } = await app.listStrategies.execute(user.authority);

  if (result.kind === 'unreadable') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Could not load this strategy</h1>
        <p role="alert" className="text-sm">{result.reason}</p>
        <WhyNotLoaded cause={result.cause} subject="this strategy is" />
        {/* The roster, not the strategy: the read that would have said the
            strategy is there is the one that failed. */}
        <p className="text-sm">
          <a href="/strategies" className="underline">Back to your strategies</a>
        </p>
      </main>
    );
  }

  const listing = listings.find((l) => l.strategy.id === id);
  if (!listing) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">No such strategy</h1>
        <p className="text-sm">
          <a href="/strategies" className="underline">Back to your strategies</a>
        </p>
      </main>
    );
  }

  const { strategy } = listing;

  if (forking.kind === 'at-capacity') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">No room for another strategy</h1>
        {/* Before the work, not after submitting it. */}
        {/* Reachable by address only, now that neither the roster nor the
            strategy page offers a copy it cannot make. It still has to refuse
            honestly, and still has to lead somewhere. */}
        <p role="status" className="text-sm">{forking.explanation}</p>
        <p className="text-sm">
          <a href={`/strategies/${strategy.id}`} className="underline">
            Back to {strategy.name}
          </a>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-xl font-medium">Make your own copy of {strategy.name}?</h1>

      {/* BattleGrid's answer to a fork it declined, whole and unglossed. What
          it means is the platform's to say — this page adds no diagnosis the
          platform did not state. */}
      {problem ? (
        <p role="alert" className="rounded-gc-2 border border-border-default p-3 text-sm">{problem}</p>
      ) : null}

      <p className="text-sm">
        {strategy.name} belongs to BattleGrid and cannot be edited. A copy is
        yours, editable, and starts identical to revision {strategy.revision} — the
        one you are looking at.
      </p>
      <p className="text-sm">
        Nothing about {strategy.name} changes, and no agent bound to it is
        affected. The copy has no agents until you bind one.
      </p>

      <form action={forkStrategy} className="space-y-4">
        <input type="hidden" name="strategyId" value={strategy.id} />
        <div className="space-y-1">
          <label htmlFor="name" className={LABEL}>Name for the copy (optional)</label>
          {/* maxLength 50 is the platform's declared bound on the argument,
              pre-stated the way the agent forms pre-state displayName's 80. */}
          <input
            id="name"
            name="name"
            type="text"
            maxLength={50}
            defaultValue={name}
            className={CONTROL}
          />
          {/* The whole truth about naming, and no more of it: what blank does,
              and the one thing a name of your own buys. Not "avoids an error" —
              nothing established supports that claim. */}
          <p className="text-sm">
            Left blank, BattleGrid names the copy &ldquo;{strategy.name} (fork)&rdquo;
            — and names every copy of {strategy.name} the same way. A name of
            your own tells your copies apart.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="submit" className={BUTTON_PRIMARY}>
            Make my copy
          </button>
          {/* The strategy being copied, not the roster. */}
          <a href={`/strategies/${strategy.id}`} className={BUTTON_SECONDARY}>
            Cancel
          </a>
        </div>
      </form>
    </main>
  );
}

export async function forkStrategy(formData: FormData) {
  'use server';
  const { app, user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');

  const strategyId = requiredText(formData, 'strategyId');
  const name = optionalText(formData, 'name');
  // The use case takes the whole strategy, not an id: it forks at the revision
  // that was on screen, which only the loaded object knows.
  const { listings } = await app.listStrategies.execute(user.authority);
  const listing = listings.find((l) => l.strategy.id === strategyId);
  if (!listing) redirect('/strategies');

  const result = await app.forkStrategy.execute({
    ...user.authority,
    strategy: listing.strategy,
    ...(name === null ? {} : { name }),
  });

  if (result.kind === 'refused') {
    // Back to the form acted from, with BattleGrid's reason and the typed
    // name intact — a refusal that also discards what was typed makes the
    // operator start over on top of being refused.
    const query = new URLSearchParams({ problem: result.reason });
    if (name !== null) query.set('name', name);
    redirect(`/strategies/${strategyId}/fork?${query.toString()}`);
  }

  redirect(`/strategies/${result.strategy.id}/edit`);
}
