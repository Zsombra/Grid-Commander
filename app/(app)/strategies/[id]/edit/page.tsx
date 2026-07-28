import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { compiledPlan, requiredText } from '@/presentation/form.js';
import { PlanReviewPanel } from '@/presentation/components/plan-review.js';
import { NotConnected } from '@/presentation/require-connection.js';

/**
 * Compose a change, compile it, and review what applying would do.
 *
 * Compiling on this page produces the review panel. There is no control here
 * that applies — applying is an action on a review, reached only by compiling
 * first, because the platform made compiling effect-free so a human could look
 * before committing. See S-G.
 */
export default async function EditStrategyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tagline?: string }>;
}) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { id } = await params;
  const { tagline } = await searchParams;

  const vocabulary = await app.readVocabulary.execute(user.authority);
  if (!vocabulary.composable) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-2xl font-medium text-text-primary">Cannot edit this strategy right now</h1>
        <p role="alert" className="text-sm">
          The vocabulary a strategy is composed from comes from BattleGrid, and it
          could not be read. Composing a change without it would mean guessing at
          values the platform will reject.
        </p>
      </main>
    );
  }

  const { result } = await app.listStrategies.execute(user.authority);
  const strategy = result.kind === 'strategies' ? result.strategies.find((s) => s.id === id) : undefined;
  if (!strategy) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-2xl font-medium text-text-primary">No such strategy</h1>
        <p className="text-sm">
          <a href="/strategies" className="underline">Back to your strategies</a>
        </p>
      </main>
    );
  }

  if (!tagline) {
    return (
      <main className="mx-auto max-w-2xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-medium text-text-primary">Edit {strategy.name}</h1>
          <p className="mt-1 text-sm font-medium">
            {strategy.boundAgentCount === 0
              ? 'No agents are bound to this strategy.'
              : `${strategy.boundAgentCount} agent${strategy.boundAgentCount === 1 ? '' : 's'} would be reconfigured by an applied change.`}
          </p>
        </div>
        <form method="get" className="space-y-3">
          <label htmlFor="tagline" className="block text-sm font-medium">Tagline</label>
          <input
            id="tagline"
            name="tagline"
            type="text"
            defaultValue={strategy.tagline ?? ''}
            className="w-full rounded border p-2"
          />
          <button type="submit" className="rounded border px-4 py-2 text-sm">
            Compile — see what this would do, without doing it
          </button>
        </form>
      </main>
    );
  }

  // Held in one place: it is both what is compiled and what `describeApply`
  // digests to check the screen still matches the plan.
  const intent = {
    operation: 'UPDATE' as const,
    strategyId: id,
    expectedRevision: strategy.revision,
    intentSummary: `Change the tagline of ${strategy.name}`,
    assumptions: ['Only the tagline changes'],
    coinSelection: { mode: 'ranked' as const, limit: 9 },
    tagline,
  };

  const compiled = await app.compilePlan.execute({ ...user.authority, request: intent });

  if (compiled.kind === 'rejected') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-2xl font-medium text-text-primary">BattleGrid could not compile this</h1>
        <p role="alert" className="text-sm">{compiled.reason}</p>
        <p className="text-sm">Nothing was changed.</p>
      </main>
    );
  }

  const proposal = await app.describeApply.execute({
    ...user.authority,
    strategyId: id,
    plan: compiled.review.plan,
    currentIntent: intent,
    currentRevision: strategy.revision,
  });

  if (proposal.kind === 'refused') {
    return (
      <main className="mx-auto max-w-2xl space-y-6 p-6">
        <h1 className="text-2xl font-medium text-text-primary">Review: {strategy.name}</h1>
        {/* The review still renders — the user should see what was compiled even
            when it cannot be applied, because the reason usually names what to
            change. */}
        <PlanReviewPanel review={compiled.review} action={apply} applyBlockedBecause={proposal.reason} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-medium text-text-primary">Review: {strategy.name}</h1>
      <PlanReviewPanel
        review={compiled.review}
        action={apply}
        confirmation={{
          strategyId: id,
          confirmationToken: proposal.proposal.confirmationToken,
          consequence: proposal.proposal.consequence,
        }}
      />
    </main>
  );
}

/**
 * Apply the plan that was reviewed — not a freshly compiled one.
 *
 * The compiled plan travels through the form rather than being recompiled here.
 * Recompiling would produce a plan with the same intent digest and possibly
 * different contents, and "what is applied is what was reviewed" is a
 * requirement rather than an aspiration.
 *
 * Carrying it through the browser is safe because it is not trusted: the
 * confirmation is bound to `strategy:<id>#<intentDigest>`, so a plan altered in
 * transit produces a different digest, the confirmation fails to consume, and
 * the write is refused before it reaches BattleGrid.
 */
export async function apply(formData: FormData) {
  'use server';
  const { app, user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');

  const strategyId = requiredText(formData, 'strategyId');
  await app.applyPlan.execute({
    ...user.authority,
    strategyId,
    plan: compiledPlan(formData, 'plan'),
    confirmationToken: requiredText(formData, 'confirmationToken'),
  });
  redirect('/strategies');
}
