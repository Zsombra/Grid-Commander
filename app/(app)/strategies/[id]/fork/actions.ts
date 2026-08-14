'use server';

import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { optionalText, requiredInteger, requiredText } from '@/presentation/form.js';

export async function forkStrategy(formData: FormData) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');

  const strategyId = requiredText(formData, 'strategyId');
  const name = optionalText(formData, 'name');
  // The revision the page named, from the form. The re-read below cannot
  // supply it: that read answers "does this still exist", and its revision is
  // whatever is current now, which is the thing being guarded against.
  const sourceRevision = requiredInteger(formData, 'sourceRevision');
  const { result: reread, listings } = await app.listStrategies.execute(user.authority);
  // A failed re-read is an outcome too. This action used to land the person
  // on /strategies with no word — a click that did nothing, unexplained. The
  // typed name travels back with the reason, as the refused arm below already
  // does.
  if (reread.kind === 'unreadable') {
    const query = new URLSearchParams({
      problem: `Nothing was attempted: your strategies could not be re-read (${reread.reason}).`,
    });
    if (name !== null) query.set('name', name);
    redirect(`/strategies/${strategyId}/fork?${query.toString()}`);
  }
  const listing = listings.find((l) => l.strategy.id === strategyId);
  if (!listing) {
    const query = new URLSearchParams({
      problem:
        'Nothing was attempted: this strategy is no longer in your list — it may have been removed in another session.',
    });
    if (name !== null) query.set('name', name);
    redirect(`/strategies/${strategyId}/fork?${query.toString()}`);
  }

  // The name pre-flight, on the listing this action just re-read. BattleGrid
  // answers a fork into a taken name with an unexplained "Internal server
  // error" (#102 — measured eight times across five majors, on both the
  // default and the chosen-name arm), and the operator has decided that
  // defect will not be reported upstream — so refusing before sending is the
  // only place the experience can improve. PRIVATE names only: any PRIVATE
  // row in this listing is the user's own (foreign ones are hidden), while a
  // SYSTEM-name collision has never been measured and pre-refusing it could
  // block a copy the platform would accept. Exact match only, for the same
  // reason. A collision created by another session between this read and the
  // platform's answer still lands on the refused arm below, whole and
  // unglossed — this narrows the road to the crash; it does not close it.
  const resultingName = name ?? `${listing.strategy.name} (fork)`;
  const taken = listings.some(
    (l) => l.strategy.scope === 'PRIVATE' && l.strategy.name === resultingName,
  );
  if (taken) {
    const query = new URLSearchParams({
      problem:
        name === null
          ? `Nothing was attempted: you already have a strategy named "${resultingName}", and BattleGrid answers a copy into a taken name with "Internal server error" — measured, not documented. Type a name of your own to tell the copies apart.`
          : `Nothing was attempted: you already have a strategy named "${resultingName}", and BattleGrid answers a copy into a taken name with "Internal server error" — measured, not documented. Pick a name you do not already have.`,
    });
    if (name !== null) query.set('name', name);
    redirect(`/strategies/${strategyId}/fork?${query.toString()}`);
  }

  const result = await app.forkStrategy.execute({
    ...user.authority,
    // The re-read's strategy for identity and existence; the form's revision
    // for what gets copied. Two different questions, two different sources.
    strategy: listing.strategy,
    sourceRevision,
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
