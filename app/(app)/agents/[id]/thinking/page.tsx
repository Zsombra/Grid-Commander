import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { AgentPageHeading } from '@/presentation/components/agent-page-heading.js';
import { DecisionList } from '@/presentation/components/decisions.js';
import { WhyNotLoaded } from '@/presentation/components/why-not-loaded.js';

/**
 * What an agent decided, and why.
 *
 * The reading — confidence against the bar, whether the agent stood down —
 * happens in `ReadThoughtLogQuery`. This page renders what it is handed and
 * imports no domain (W-D).
 *
 * The roster is read for the agent's name, as `journal` and `limits` do. The
 * heading said "What this agent decided" on an account with eleven agents, which
 * identifies none of them.
 */
export default async function ThinkingPage({ params }: { params: Promise<{ id: string }> }) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { id } = await params;
  const [log, roster] = await Promise.all([
    app.readThoughtLog.execute({ ...user.authority, agentId: id, limit: 20 }),
    app.listAgents.execute(user.authority),
  ]);
  const agent =
    roster.roster.kind === 'agents' ? roster.roster.agents.find((a) => a.id === id) : undefined;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <AgentPageHeading
        subject="what it decided"
        agentId={id}
        agentName={agent?.displayName ?? null}
        sibling={{ href: `/agents/${id}/limits`, label: 'What would stop it' }}
      />

      {log.kind === 'unreadable' && (
        <WhyNotLoaded subject="this agent’s reasoning is" cause={log.cause} />
      )}

      {log.kind === 'none' && (
        <p className="text-sm text-text-secondary">
          This agent has not recorded a decision yet. That is different from its
          reasoning being unavailable — nothing failed to load.
        </p>
      )}

      {log.kind === 'decisions' && (
        <>
          <p className="text-sm text-text-secondary">
            Showing {log.decisions.length} of {log.total} decisions, newest first.
            Cycles the agent declined to act on are included.
          </p>
          <DecisionList decisions={log.decisions} />
        </>
      )}
    </main>
  );
}
