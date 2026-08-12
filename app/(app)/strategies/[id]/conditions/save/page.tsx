import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { compiledPlan, requiredText } from '@/presentation/form.js';
import { draftFromQuery } from '@/presentation/condition-form.js';
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from '@/presentation/components/control.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { WhyNotLoaded } from '@/presentation/components/why-not-loaded.js';
import { ConditionStructure } from '@/presentation/components/strategy-conditions.js';
import { CarriedProblem } from '@/presentation/components/carried-problem.js';

/**
 * Saving a condition — the other half of `/strategies/[id]/conditions`.
 *
 * Two steps on one route, the deploy and retune pattern. Without an edit in the
 * query the page is the strategy's condition list, with a way to remove each and
 * a way back to the composer. With one, the describe runs: the strategy is read
 * fresh, the whole list is composed, BattleGrid compiles it — which writes
 * nothing — the compiled post-state is checked against what was submitted, and
 * the token the confirm form spends is minted against the text on screen.
 *
 * **Why the whole list is the subject.** There is no per-condition tool; all 110
 * probed tools, 2026-08-06. `compile_strategy_plan` (UPDATE) → `apply_strategy_plan`
 * takes the strategy's entire `conditions` array and reconfigures every bound
 * agent atomically. So this page never says "add FLOW_UP" without also saying
 * what the strategy would be left defining.
 *
 * The composer itself lives one route up and still saves nothing. A draft
 * arrives here as the query it was tried under, so what is saved is what was
 * resolved against live market data — the same string, read by the same parser.
 */

function one(q: Record<string, string | string[] | undefined>, key: string): string {
  const raw = q[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * The query this describe was formed from, minus the problem it may carry.
 *
 * Round-tripped through the form so a refusal returns to a describe over the
 * same edit rather than to a blank page. Rebuilt with `URLSearchParams` rather
 * than carried as a path: the value comes back from a browser, and a query
 * string can only ever be re-attached to a route this file names.
 */
function editQuery(q: Record<string, string | string[] | undefined>): string {
  const out = new URLSearchParams();
  for (const [key, value] of Object.entries(q)) {
    if (key === 'problem') continue;
    const first = Array.isArray(value) ? value[0] : value;
    if (typeof first === 'string') out.set(key, first);
  }
  return out.toString();
}

export default async function SaveConditionPage({
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

  const remove = one(q, 'remove');
  const parsed = draftFromQuery(q);
  const result = await app.describeConditionWrite.execute({
    ...user.authority,
    strategyId: id,
    // A malformed draft describes nothing and is not sent: a form that does not
    // describe a definition is not a change BattleGrid can be asked to compile.
    edit:
      remove.length > 0
        ? { kind: 'remove', conditionKey: remove }
        : parsed.kind === 'draft'
          ? { kind: 'compose', condition: parsed.condition }
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
        {/* The strategy, not the edit: a condition list is submitted whole, so
            without a fresh read of what the strategy defines there is nothing
            to compose an edit against. */}
        <WhyNotLoaded cause={result.cause} subject="this strategy is" />
        <p className="text-sm">
          <a href={`/strategies/${id}`} className="underline">Back to the strategy</a>
        </p>
      </main>
    );
  }

  const { strategy, existing } = result;
  const composer = `/strategies/${strategy.id}/conditions`;
  const problem = one(q, 'problem');

  const list = (
    <section className="space-y-2">
      <h2 className="text-base font-medium">What {strategy.name} defines now</h2>
      {existing.length === 0 ? (
        <p className="text-sm text-text-secondary">
          {`This strategy defines no conditions. Anything saved here would be its first.`}
        </p>
      ) : (
        <ul className="space-y-2 text-sm">
          {existing.map((c) => (
            <li key={c.conditionKey} className="rounded-gc-2 border border-border-default p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">{c.name}</span>
                <span className="text-xs uppercase text-text-secondary">
                  {c.conditionKey}
                  {c.verdict === null ? ' · a named building block' : ` · calls ${c.verdict}`}
                </span>
              </div>
              <div className="mt-1">
                <ConditionStructure
                  definition={c.definition}
                  defined={new Set(existing.map((e) => e.conditionKey))}
                />
              </div>
              <p className="mt-2 text-sm">
                <a
                  href={`/strategies/${strategy.id}/conditions/save?remove=${encodeURIComponent(c.conditionKey)}`}
                  className="underline"
                >
                  Remove it from the strategy
                </a>
                {' · '}
                <a
                  href={`${composer}?try=1&from=${encodeURIComponent(c.conditionKey)}&key=${encodeURIComponent(c.conditionKey)}&name=${encodeURIComponent(c.name)}&verdict=${c.verdict ?? ''}`}
                  className="underline"
                >
                  Change it
                </a>
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  const back = (
    <p className="text-sm">
      <a href={`/strategies/${strategy.id}`} className="underline">Back to {strategy.name}</a>
      {' · '}
      <a href={composer} className="underline">Compose a condition</a>
    </p>
  );

  const head = (
    <>
      <h1 className="text-xl font-medium">Save a condition to {strategy.name}</h1>
      <CarriedProblem problem={problem} />
    </>
  );

  if (result.kind === 'listing') {
    return (
      <main className="mx-auto max-w-3xl space-y-6 p-6">
        {head}
        <p className="text-sm">
          {`BattleGrid has no tool that writes one condition, so saving any of them resubmits the strategy's whole condition list and reconfigures every bound agent at once. Nothing on this page has been compiled yet.`}
        </p>
        {parsed.kind === 'malformed' && (
          <section className="space-y-2">
            <h2 className="text-base font-medium">This draft is not finished</h2>
            {/* Ours to say, and said as ours. These are rows that do not
                describe a definition at all, so there is nothing to compile and
                BattleGrid has no opinion to report — showing the list below
                without this would read as the draft having been forgotten. */}
            <ul role="alert" className="space-y-1 rounded-gc-2 border border-border-default p-3 text-sm">
              {/* Keyed by position, not by the sentence. Two rows can be
                  malformed the same way, and keying on the text collapses them
                  into one — the operator then fixes one row and meets the
                  other. */}
              {parsed.problems.map((problem, i) => (
                <li key={i}>{problem}</li>
              ))}
            </ul>
            <p className="text-sm text-text-secondary">
              <a href={`${composer}?${editQuery(q)}`} className="underline">
                Finish it in the composer
              </a>
              {' — nothing was compiled and nothing was saved.'}
            </p>
          </section>
        )}
        {list}
        {back}
      </main>
    );
  }

  if (result.kind === 'no-such-condition') {
    return (
      <main className="mx-auto max-w-3xl space-y-6 p-6">
        {head}
        <p role="alert" className="rounded-gc-2 border border-border-default p-3 text-sm">
          {`This strategy defines no condition called ${result.conditionKey}, so there was nothing to change or remove. It may have been renamed or removed since this link was made.`}
        </p>
        {list}
        {back}
      </main>
    );
  }

  if (result.kind === 'inexpressible') {
    return (
      <main className="mx-auto max-w-3xl space-y-6 p-6">
        {head}
        <h2 className="text-base font-medium">Part of this draft cannot be sent to BattleGrid</h2>
        <ul role="alert" className="space-y-1 rounded-gc-2 border border-border-default p-3 text-sm">
          {/* Position, not text: two entries can be unreadable for the same
              stated reason, and both have to be shown. */}
          {result.reasons.map((reason, i) => (
            <li key={i}>Not understood by Grid-Commander: {reason}</li>
          ))}
        </ul>
        <p className="text-sm text-text-secondary">
          {`Nothing was compiled and nothing was saved. Grid-Commander will not write back a form it did not understand — a guessed shape would reach the platform as though you had composed it.`}
        </p>
        {back}
      </main>
    );
  }

  if (result.kind === 'drift') {
    return (
      <main className="mx-auto max-w-3xl space-y-6 p-6">
        {head}
        <h2 className="text-base font-medium">
          BattleGrid would save something other than what was submitted
        </h2>
        <ul role="alert" className="space-y-1 rounded-gc-2 border border-border-default p-3 text-sm">
          {/* Position, not text — the platform can report identical drift on
              two entries. */}
          {result.reasons.map((reason, i) => (
            <li key={i}>{reason}</li>
          ))}
        </ul>
        <p className="text-sm text-text-secondary">
          {`Nothing was written — compiling changes nothing — and no confirmation was minted. This edit names only the condition list, so a plan that moves anything else is not the change that was composed, and agreeing to it would be agreeing to something nobody described.`}
        </p>
        {list}
        {back}
      </main>
    );
  }

  if (result.kind === 'refused') {
    return (
      <main className="mx-auto max-w-3xl space-y-6 p-6">
        {head}
        <h2 className="text-base font-medium">BattleGrid refused this change — here is why</h2>
        {/* The platform's words, whole. Its validator names the offending path
            and what is legal in its place, and that teaching is the most useful
            thing this surface can show. */}
        <p role="alert" className="rounded-gc-2 border border-border-default p-3 text-sm">{result.reason}</p>
        <p className="text-sm">{`Nothing was written.`}</p>
        {list}
        {back}
      </main>
    );
  }

  const { proposal } = result;
  const named = proposal.listKeys.map((k) => k ?? '(an entry with no key)');
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      {head}
      {/* The stored consequence, rendered as the text the token was issued
          against — never a second wording of it. */}
      <p role="alert" className="whitespace-pre-line rounded-gc-2 border border-border-default p-4 text-sm">
        {proposal.consequence}
      </p>

      <section className="space-y-2">
        <h2 className="text-base font-medium">The whole list that would be submitted</h2>
        <p className="text-sm text-text-secondary">
          {`Every one of these is resubmitted, because BattleGrid takes the condition list whole. The strategy would be left defining ${named.length} condition(s).`}
        </p>
        {named.length === 0 ? (
          <p className="text-sm">{`None — the strategy would define no conditions at all.`}</p>
        ) : (
          <ol className="list-inside list-decimal space-y-1 text-sm">
            {/* Position, not key. `named` maps every key-less entry to the
                same literal placeholder, so keying on it renders one row where
                the strategy would define two — a miscount on the sentence
                directly above, which states how many conditions survive. */}
            {named.map((key, i) => (
              <li key={i}>
                {key}
                {key === proposal.conditionKey ? ` — ${proposal.standing}` : ''}
              </li>
            ))}
          </ol>
        )}
      </section>

      {proposal.dangling.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-base font-medium">These references would have nothing to resolve</h2>
          <ul role="alert" className="space-y-1 rounded-gc-2 border border-border-default p-3 text-sm">
            {proposal.dangling.map((key) => (
              <li key={key}>
                {`${key} is referred to by a condition in the list above and defined by none of them.`}
              </li>
            ))}
          </ul>
          <p className="text-sm text-text-secondary">
            {`Shown, not blocked. Whether BattleGrid accepts a dangling reference is its ruling to make, and it will say so in its own words.`}
          </p>
        </section>
      )}

      <form action={saveConditions} className="flex flex-wrap gap-3">
        <input type="hidden" name="strategyId" value={proposal.strategyId} />
        <input type="hidden" name="plan" value={JSON.stringify(proposal.plan)} />
        <input type="hidden" name="confirmationToken" value={proposal.confirmationToken} />
        <input type="hidden" name="draft" value={editQuery(q)} />
        <button type="submit" className={BUTTON_PRIMARY}>
          Save this condition list
        </button>
        <a href={`/strategies/${proposal.strategyId}`} className={BUTTON_SECONDARY}>
          Leave things as they are
        </a>
      </form>
      {back}
    </main>
  );
}

/**
 * Apply the plan that was reviewed — not a freshly compiled one.
 *
 * The compiled plan travels through the form for the reason the section
 * editor's does: recompiling here would produce a plan with the same intent
 * digest and possibly different contents, and what is applied must be what was
 * reviewed. It is not trusted — the confirmation is bound to
 * `strategy:<id>#<intentDigest>`, so a plan altered in transit digests
 * differently, the consume fails, and the write is refused before BattleGrid is
 * asked.
 *
 * A refusal returns to a fresh describe over the same edit. The revision moved,
 * or the token expired, or the platform declined: all three are fixed by
 * looking at the change again against the strategy as it is now.
 */
export async function saveConditions(formData: FormData) {
  'use server';
  const { app, user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');

  const strategyId = requiredText(formData, 'strategyId');
  const draft = formData.get('draft');
  try {
    await app.applyPlan.execute({
      ...user.authority,
      strategyId,
      plan: compiledPlan(formData, 'plan'),
      confirmationToken: requiredText(formData, 'confirmationToken'),
    });
  } catch (err) {
    const query = new URLSearchParams(typeof draft === 'string' ? draft : '');
    query.set('problem', err instanceof Error ? err.message : String(err));
    redirect(`/strategies/${strategyId}/conditions/save?${query.toString()}`);
  }
  // The proof is the re-read: the strategy page draws its conditions from
  // `get_strategy`, not from anything this action was told.
  redirect(`/strategies/${strategyId}`);
}
