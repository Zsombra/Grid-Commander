'use server';

import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { requiredInteger, requiredText } from '@/presentation/form.js';
import { spending } from '@/presentation/confirmation-refusal.js';

export async function performUndeploy(formData: FormData) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');

  const agentId = requiredText(formData, 'agentId');
  const coinId = requiredText(formData, 'coinId');
  const result = await spending(
    () =>
      app.performUndeploy.execute({
        ...user.authority,
        agentId,
        coinId,
        expectedRevision: requiredInteger(formData, 'expectedRevision'),
        confirmationToken: requiredText(formData, 'confirmationToken'),
      }),
    (problem) => {
      const target = `/agents/${agentId}/undeploy/${encodeURIComponent(coinId)}`;
      redirect(`${target}?problem=${encodeURIComponent(problem)}`);
    },
  );
  // Lost authority is not a refusal of this operation — nothing on this account
  // will work until it is fixed — so it travels under its own name and the page
  // renders no form for it.
  if (result.kind === 'authority-lost') {
    const target = `/agents/${agentId}/undeploy/${encodeURIComponent(coinId)}`;
    redirect(`${target}?authority=${encodeURIComponent(result.reason)}`);
  }
  if (result.kind === 'refused') {
    const target = `/agents/${agentId}/undeploy/${encodeURIComponent(coinId)}`;
    redirect(`${target}?problem=${encodeURIComponent(result.reason)}`);
  }
  redirect(`/agents/${agentId}`);
}
