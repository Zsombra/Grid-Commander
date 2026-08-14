'use server';

import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { requiredInteger, requiredText } from '@/presentation/form.js';
import { spending } from '@/presentation/confirmation-refusal.js';

export async function performRetune(formData: FormData) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');

  const strategyId = requiredText(formData, 'strategyId');
  const signalId = requiredText(formData, 'signalId');
  const allocation = requiredInteger(formData, 'allocation');
  const required = requiredText(formData, 'required') === '1';
  const paramsJson = formData.get('paramsJson');
  const ruleParams =
    typeof paramsJson === 'string' && paramsJson.length > 0
      ? (JSON.parse(paramsJson) as Record<string, number>)
      : undefined;

  const result = await spending(
    () =>
      app.retuneRule.execute({
        ...user.authority,
        strategyId,
        signalId,
        expectedRevision: requiredInteger(formData, 'expectedRevision'),
        intent: { allocation, required, ruleParams },
        confirmationToken: requiredText(formData, 'confirmationToken'),
      }),
    // The refused arm's road, with the same choice preserved so the describe
    // re-runs against the fresh strategy.
    (problem) => {
      const query = new URLSearchParams({ a: String(allocation), problem });
      if (required) query.set('req', '1');
      redirect(`/strategies/${strategyId}/rules/${signalId}?${query.toString()}`);
    },
  );

  // Lost authority is not a refusal of this operation — nothing on this account
  // will work until it is fixed — so it travels under its own name and the page
  // renders no form for it.
  if (result.kind === 'authority-lost') {
    const query = new URLSearchParams({ authority: result.reason });
    redirect(`/strategies/${strategyId}/rules/${signalId}?${query.toString()}`);
  }
  if (result.kind === 'refused') {
    // Back to the surface acted from, with the choice preserved so the
    // describe re-runs against the fresh strategy.
    const query = new URLSearchParams({ a: String(allocation), problem: result.reason });
    if (required) query.set('req', '1');
    if (ruleParams) for (const [k, v] of Object.entries(ruleParams)) query.set(`p_${k}`, String(v));
    redirect(`/strategies/${strategyId}/rules/${signalId}?${query.toString()}`);
  }
  redirect(`/strategies/${strategyId}`);
}
