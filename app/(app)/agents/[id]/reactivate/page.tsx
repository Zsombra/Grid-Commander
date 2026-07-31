import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { ReactivatePrompt } from '@/presentation/components/agent-edit.js';
import { requiredInteger, requiredText } from '@/presentation/form.js';

/**
 * Bring an archived agent back.
 *
 * A route of its own rather than `archive?to=ACTIVE`. `SetLifecycleCommand`
 * takes a direction, which makes one page look sufficient — it is not. The
 * consequence differs, the heading differs, and the text a user agrees to
 * differs. Two consequences behind one URL is how someone confirms wording
 * written for the other operation. See DL-104.
 *
 * No confirmation token: reactivating restores a state the user chose before
 * and commits nothing. Archiving takes one because it frees a slot.
 */
export default async function ReactivatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ problem?: string }>;
}) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { id } = await params;
  const { problem } = await searchParams;
  const { roster, creation } = await app.listAgents.execute(user.authority);

  if (roster.kind === 'unreadable') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Could not load this agent</h1>
        <p role="alert" className="text-sm">{roster.reason}</p>
      </main>
    );
  }

  const agent = roster.kind === 'agents' ? roster.agents.find((a) => a.id === id) : undefined;
  if (!agent) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">No such agent</h1>
        <p className="text-sm">
          <a href="/agents" className="underline">Back to your agents</a>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-xl font-medium">Reactivate {agent.displayName}?</h1>
      {problem ? (
        <p role="alert" className="rounded border p-3 text-sm">{problem}</p>
      ) : null}
      <ReactivatePrompt
        agent={agent}
        action={reactivate}
        atCapacity={creation.kind === 'at-capacity' ? creation.explanation : undefined}
      />
    </main>
  );
}

export async function reactivate(formData: FormData) {
  'use server';
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
