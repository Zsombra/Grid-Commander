'use server';

import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { requiredInteger, requiredText } from '@/presentation/form.js';
import { spending } from '@/presentation/confirmation-refusal.js';

export async function performRebind(formData: FormData) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');

  const agentId = requiredText(formData, 'agentId');
  const toStrategyId = requiredText(formData, 'toStrategyId');
  const result = await spending(
    () =>
      app.rebindAgent.execute({
        ...user.authority,
        agentId,
        toStrategyId,
        toStrategyRevision: requiredInteger(formData, 'toStrategyRevision'),
        expectedRevision: requiredInteger(formData, 'expectedRevision'),
        confirmationToken: requiredText(formData, 'confirmationToken'),
      }),
    // The comment below already describes a refusal escaping as a thrown error
    // and rendering a framework page in place of the reason. That was fixed for
    // the platform's CONFLICT; the confirmation guard's own refusal was still
    // doing it, and this is the same road for the same reason.
    (problem) => {
      const query = new URLSearchParams({ to: toStrategyId, problem });
      redirect(`/agents/${agentId}/rebind?${query.toString()}`);
    },
  );
  // A moved destination returns to this page: the describe re-runs against
  // what the platform holds now, so the fresh proposal and the reason it was
  // needed arrive together. A platform refusal takes the same road — it used
  // to escape as a thrown error, which rendered a framework error page in
  // place of the reason (the outcome-reaches-the-person requirement; the
  // CONFLICT case is live-confirmed).
  // Lost authority is not a refusal of this operation — nothing on this account
  // will work until it is fixed — so it travels under its own name and the page
  // renders no form for it.
  if (result.kind === 'authority-lost') {
    const query = new URLSearchParams({ to: toStrategyId, authority: result.reason });
    redirect(`/agents/${agentId}/rebind?${query.toString()}`);
  }
  if (result.kind === 'destination-moved' || result.kind === 'refused') {
    const query = new URLSearchParams({ to: toStrategyId, problem: result.reason });
    redirect(`/agents/${agentId}/rebind?${query.toString()}`);
  }
  redirect(`/agents/${agentId}`);
}
