'use server';

import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { nullableInteger, requiredText } from '@/presentation/form.js';
import { spending } from '@/presentation/confirmation-refusal.js';

export async function performDeploy(formData: FormData) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');

  const agentId = requiredText(formData, 'agentId');
  const coinId = requiredText(formData, 'coinId');
  const timeframe = requiredText(formData, 'timeframe');
  const result = await spending(
    () =>
      app.performDeploy.execute({
        ...user.authority,
        agentId,
        coinId,
        timeframe,
        expectedRevision: nullableInteger(formData, 'expectedRevision'),
        confirmationToken: requiredText(formData, 'confirmationToken'),
      }),
    // Same road as a platform refusal, and the choice is preserved the same way
    // so the describe re-runs against what they picked.
    (problem) => {
      const query = new URLSearchParams({ coin: coinId, timeframe, problem });
      redirect(`/agents/${agentId}/deploy?${query.toString()}`);
    },
  );
  // The reason returns to the page that asked, where the person who clicked is
  // still standing — with their choice preserved so the describe re-runs.
  // Lost authority is not a refusal of this deployment — nothing on this
  // account will work until it is fixed — so it travels under its own name and
  // the page renders no form for it.
  if (result.kind === 'authority-lost') {
    const query = new URLSearchParams({ authority: result.reason });
    redirect(`/agents/${agentId}/deploy?${query.toString()}`);
  }
  if (result.kind === 'refused') {
    const query = new URLSearchParams({ coin: coinId, timeframe, problem: result.reason });
    redirect(`/agents/${agentId}/deploy?${query.toString()}`);
  }
  redirect(`/agents/${agentId}`);
}
