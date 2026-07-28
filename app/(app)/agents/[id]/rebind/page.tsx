import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { RebindConfirm } from '@/presentation/components/rebind-confirm.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { requiredInteger, requiredText } from '@/presentation/form.js';

/**
 * Propose a rebind, and render what the confirmation was issued against.
 *
 * The consequence text on screen is the same string stored with the token, so
 * what the user reads, what they agree to, and what the audit can later prove
 * are one thing rather than three that drift.
 */
export default async function RebindPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ to?: string; name?: string }>;
}) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { id } = await params;
  const { to, name } = await searchParams;
  if (!to) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Choose a strategy to rebind to</h1>
        <p className="text-sm">
          Strategy browsing is not built yet. Supply a strategy id to continue.
        </p>
      </main>
    );
  }

  const result = await app.describeRebind.execute({
    ...user.authority,
    agentId: id,
    toStrategyId: to,
    toStrategyName: name ?? to,
  });

  if (result.kind !== 'proposal') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Cannot rebind</h1>
        <p role="alert" className="text-sm">{result.reason}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <RebindConfirm proposal={result.proposal} action={performRebind} />
    </main>
  );
}

export async function performRebind(formData: FormData) {
  'use server';
  const { app, user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');

  const agentId = requiredText(formData, 'agentId');
  await app.rebindAgent.execute({
    ...user.authority,
    agentId,
    toStrategyId: requiredText(formData, 'toStrategyId'),
    expectedRevision: requiredInteger(formData, 'expectedRevision'),
    confirmationToken: requiredText(formData, 'confirmationToken'),
  });
  redirect(`/agents/${agentId}`);
}
