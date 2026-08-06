import { acting } from '@/presentation/session.js';
import { AgentRoster } from '@/presentation/components/agent-roster.js';
import { NotConnected } from '@/presentation/require-connection.js';

export default async function AgentsPage() {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { roster, creation } = await app.listAgents.execute(user.authority);
  /**
   * Whether each agent is acting, from the radar — the fact the ACTIVE badge
   * hides. Unreadable is a state the component renders honestly, not a reason
   * to hide the column.
   *
   * The roster travels with the request because the radar cannot say whether
   * an agent is archived, and a slot held by one is not a market being
   * scanned. Read here rather than a second time in the query: this page has
   * already paid for the roster, and the two rows must be built from the same
   * one or they can disagree about a lifecycle within a single render.
   */
  const deployments = await app.readDeployments.summary({
    ...user.authority,
    roster: roster.kind === 'agents' ? roster.agents : [],
  });

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-xl font-medium">Agents</h1>
      <AgentRoster roster={roster} creation={creation} deployments={deployments} />
    </main>
  );
}
