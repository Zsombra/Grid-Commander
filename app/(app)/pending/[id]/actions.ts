'use server';

import { redirect } from 'next/navigation';
import { acting, requestApp } from '@/presentation/session.js';
import { editArguments, requiredText } from '@/presentation/form.js';
import { spending } from '@/presentation/confirmation-refusal.js';

export async function agree(formData: FormData) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');

  const id = requiredText(formData, 'id');
  // Read before the try: a FormError for an absent field must not be caught
  // and re-told as "unreadable values" — absence and malformation are
  // different failures, and only the second has a proposal to send back to.
  const rawChanges = requiredText(formData, 'changes');
  let changes: Record<string, unknown> = {};
  try {
    changes = JSON.parse(rawChanges) as Record<string, unknown>;
  } catch {
    redirect(`/pending/${id}?problem=${encodeURIComponent('the proposed values were unreadable')}`);
  }

  // The ordinary perform, with the ordinary confirmation. Nothing about this
  // path is special because a model suggested it — including the split, which
  // is the difference between merging a proposed limit onto the agent's config
  // and replacing all twenty with the one that was proposed.
  const { changes: rest, tradingConfigChanges } = editArguments(changes);

  const result = await spending(
    () =>
      app.updateAgent.execute({
        ...user.authority,
        agentId: requiredText(formData, 'agentId'),
        changes: rest,
        ...(tradingConfigChanges ? { tradingConfigChanges } : {}),
        confirmationToken: requiredText(formData, 'confirmationToken'),
      }),
    // Back to this proposal, where the Shell renders the reason on every branch
    // — including the one that now describes a world where the change landed.
    // The double-submit note below is the *other* half of the same story: that
    // one is a write that succeeded against a closed proposal, this one is a
    // confirmation already spent.
    (problem) => redirect(`/pending/${id}?problem=${encodeURIComponent(problem)}`),
  );

  if (result.kind !== 'updated') {
    const reason =
      result.kind === 'rejected'
        ? result.rejected.map((r) => `${r.field}: ${r.reason}`).join(' · ')
        : result.kind === 'invalid'
          ? result.issues.map((i) => `${i.field}: ${i.reason}`).join(' · ')
          : result.reason;
    redirect(`/pending/${id}?problem=${encodeURIComponent(reason)}`);
  }

  // Closed only after the write succeeded. Closing first would leave a
  // proposal marked agreed against a change that never happened.
  const closed = await app.resolveProposal.execute({
    userId: user.authority.userId,
    id,
    status: 'agreed',
  });
  if (!closed.closed) {
    // The change happened and the proposal was already resolved — a double
    // submit, most likely. Said rather than swallowed: the account moved, and
    // an operator seeing a silent redirect would not know it had.
    redirect(
      `/pending?problem=${encodeURIComponent(
        'The change was made, but this proposal had already been closed. Check the activity log.',
      )}`,
    );
  }
  redirect('/pending');
}

export async function decline(formData: FormData) {
  const { user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');
  const app = await requestApp();
  const closed = await app.resolveProposal.execute({
    userId: user.authority.userId,
    id: requiredText(formData, 'id'),
    status: 'declined',
  });
  // Nothing was written to the account either way, so a proposal that was
  // already resolved is not an error worth interrupting anyone over — but it
  // is not silence either.
  redirect(closed.closed ? '/pending' : '/pending?note=already-resolved');
}
