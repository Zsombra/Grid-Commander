'use server';

import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { requiredInteger, requiredText } from '@/presentation/form.js';
import { spending } from '@/presentation/confirmation-refusal.js';

export async function performArchive(formData: FormData) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');

  const agentId = requiredText(formData, 'agentId');
  const result = await spending(
    () =>
      app.setLifecycle.execute({
        ...user.authority,
        agentId,
        to: 'ARCHIVED',
        expectedRevision: requiredInteger(formData, 'expectedRevision'),
        confirmationToken: requiredText(formData, 'confirmationToken'),
      }),
    (problem) => redirect(`/agents/${agentId}/archive?problem=${encodeURIComponent(problem)}`),
  );
  // A not-permitted archive that redirects to the roster looks exactly like a
  // successful one until the row fails to move. The reason returns to the
  // page that asked, where the person who clicked is still standing.
  if (result.kind === 'not-permitted') {
    redirect(`/agents/${agentId}/archive?problem=${encodeURIComponent(result.reason)}`);
  }
  redirect('/agents');
}
