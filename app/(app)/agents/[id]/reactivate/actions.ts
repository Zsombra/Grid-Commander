'use server';

import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { requiredInteger, requiredText } from '@/presentation/form.js';

export async function reactivate(formData: FormData) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');

  const agentId = requiredText(formData, 'agentId');
  const result = await app.setLifecycle.execute({
    ...user.authority,
    agentId,
    to: 'ACTIVE',
    expectedRevision: requiredInteger(formData, 'expectedRevision'),
  });
  // A refusal that redirects to the agent page is indistinguishable from
  // success — the page reloads, the status is unchanged, and the only
  // available reading is that the product ignored the click. The reason the
  // operation returned goes back to the surface that was acted from.
  if (result.kind === 'not-permitted') {
    redirect(`/agents/${agentId}/reactivate?problem=${encodeURIComponent(result.reason)}`);
  }
  redirect(`/agents/${agentId}`);
}
