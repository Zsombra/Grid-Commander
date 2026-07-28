import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { requiredInteger, requiredText } from '@/presentation/form.js';

/** Archiving is reversible, and the copy the token was issued against says so. */
export default async function ArchivePage({ params }: { params: Promise<{ id: string }> }) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { id } = await params;
  const result = await app.describeArchive.execute({ ...user.authority, agentId: id });

  if (result.kind !== 'proposal') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Cannot archive</h1>
        <p role="alert" className="text-sm">{result.reason}</p>
      </main>
    );
  }

  const { proposal } = result;
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-xl font-medium">Archive {proposal.agentName}?</h1>
      <p role="alert" className="rounded border p-4 text-sm">{proposal.consequence}</p>
      <form action={performArchive} className="flex flex-wrap gap-3">
        <input type="hidden" name="agentId" value={proposal.agentId} />
        <input type="hidden" name="expectedRevision" value={proposal.expectedRevision} />
        <input type="hidden" name="confirmationToken" value={proposal.confirmationToken} />
        <button type="submit" className="rounded border px-4 py-2 text-sm">
          Archive {proposal.agentName} and free its slot
        </button>
        <a href={`/agents/${proposal.agentId}`} className="px-4 py-2 text-sm underline">
          Leave it active
        </a>
      </form>
    </main>
  );
}

export async function performArchive(formData: FormData) {
  'use server';
  const { app, user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');

  const agentId = requiredText(formData, 'agentId');
  await app.setLifecycle.execute({
    ...user.authority,
    agentId,
    to: 'ARCHIVED',
    expectedRevision: requiredInteger(formData, 'expectedRevision'),
    confirmationToken: requiredText(formData, 'confirmationToken'),
  });
  redirect('/agents');
}
