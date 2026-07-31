import { acting } from '@/presentation/session.js';
import { AgentRoster } from '@/presentation/components/agent-roster.js';
import { NotConnected } from '@/presentation/require-connection.js';

export default async function AgentsPage() {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { roster, creation } = await app.listAgents.execute(user.authority);
  // Whether each agent is acting, from the radar — the fact the ACTIVE
  // badge hides. Unreadable is a state the component renders honestly,
  // not a reason to hide the column.
  const deployments = await app.readDeployments.summary(user.authority);

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-xl font-medium">Agents</h1>
      <AgentRoster roster={roster} creation={creation} deployments={deployments} />
    </main>
  );
}
