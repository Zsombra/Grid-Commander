import { acting } from '@/presentation/session.js';
import { JournalView } from '@/presentation/components/journal-view.js';
import { NotConnected } from '@/presentation/require-connection.js';

export default async function JournalPage({ params }: { params: Promise<{ id: string }> }) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { id } = await params;
  const roster = await app.listAgents.execute(user.authority);
  const agent =
    roster.roster.kind === 'agents'
      ? roster.roster.agents.find((a) => a.id === id)
      : undefined;

  const response = await app.readJournal.execute({ ...user.authority, agentId: id });

  return (
    <main className="mx-auto max-w-3xl p-6">
      <JournalView agentName={agent?.displayName ?? 'This agent'} response={response} />
    </main>
  );
}
