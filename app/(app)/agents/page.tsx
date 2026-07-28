import { acting } from '@/presentation/session.js';
import { AgentRoster } from '@/presentation/components/agent-roster.js';
import { NotConnected } from '@/presentation/require-connection.js';

export default async function AgentsPage() {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { roster, creation } = await app.listAgents.execute(user.authority);

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-xl font-medium">Agents</h1>
      <AgentRoster roster={roster} creation={creation} />
    </main>
  );
}
