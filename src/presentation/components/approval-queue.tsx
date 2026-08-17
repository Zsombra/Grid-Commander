import type {
  ApprovalQueueResult,
  UnreadableAgentQueue,
} from '@/application/use-cases/read-approval-queue.query.js';
import type { PendingDecisionView } from '@/application/use-cases/read-pending-decisions.query.js';
import { WhyNotLoaded } from './why-not-loaded.js';

/**
 * Trades an agent has proposed and is waiting on a human for.
 *
 * Every value here comes from the decision the platform sent. **No currency
 * amount appears, and none may be added** (PE-2): BattleGrid computes no size
 * until a decision is accepted — a waiting row carries a percentage with every
 * fill field null — so a figure on this surface would be this product's own
 * arithmetic wearing the platform's authority. The proportion is what was sent,
 * and the proportion is what is shown.
 *
 * The window is fifteen minutes at most, so the time remaining is the most
 * perishable thing on the page and is rendered next to each decision rather
 * than once at the top.
 */

/**
 * How long is left, in the units a person under time pressure can act on.
 *
 * Rendered from a figure derived server-side (`msRemaining`): the Iron Rule
 * permits the derivation there and forbids a component rebuilding it from
 * `expiresAt`, which is also what stops this number disagreeing with the one
 * the binding checks.
 *
 * Null means the platform sent no expiry. That is **unknown**, not "expires
 * now", and it says so — guessing in either direction is a claim about someone
 * else's money that nobody made.
 */
function Remaining({ ms }: { ms: number | null }) {
  if (ms === null) {
    return <span className="text-sm text-text-secondary">No expiry was sent for this decision</span>;
  }
  if (ms === 0) {
    return (
      <span className="text-sm text-text-primary">
        The window has closed — this can no longer be answered
      </span>
    );
  }

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <span className="text-sm text-text-primary">
      {minutes > 0 ? `${minutes}m ${seconds}s left to answer` : `${seconds}s left to answer`}
    </span>
  );
}

/** A level the agent set, or an honest gap where the platform sent none. */
function Level({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-text-secondary">{label}</dt>
      <dd className="text-sm text-text-primary">{value === null ? 'not set' : value}</dd>
    </div>
  );
}

function Decision({ agentId, view }: { agentId: string; view: PendingDecisionView }) {
  const d = view.decision;
  const what = [d.direction, d.coinTicker].filter((p) => p !== null && p !== '').join(' ');

  return (
    <li className="space-y-3 rounded-gc-2 border border-consequence-border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-text-primary">
          {what === '' ? 'A proposed trade' : what}
        </span>
        <Remaining ms={view.msRemaining} />
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Level label="Entry" value={d.entryPrice} />
        <Level label="Stop" value={d.stopLoss} />
        <Level label="Target" value={d.takeProfit} />
        <Level label="Conviction" value={d.conviction} />
      </dl>

      {/*
        The proportion, said as a proportion. The sentence deliberately names
        what it is a proportion *of* and stops there: the platform resolves the
        actual size from the agent's headroom at the moment of acceptance, so
        two decisions accepted back to back size differently and no figure
        computed here would survive the gap.
      */}
      <p className="text-sm text-text-secondary">
        {d.positionSizePct === null
          ? 'The agent recorded no size for this trade.'
          : `Would stake ${d.positionSizePct}% of the agent's available funds${
              d.positionSizePreset === null ? '' : ` (${d.positionSizePreset})`
            }. BattleGrid sets the actual size when the trade is accepted.`}
      </p>

      {d.reasoning !== null && d.reasoning !== '' && (
        <p className="whitespace-pre-wrap text-sm text-text-secondary">{d.reasoning}</p>
      )}

      {/*
        One link, to the page that describes answering. Cancel and accept are
        not offered here: the consequence has to be stated before either is
        reachable, and a control on a list row is a control without one.
      */}
      <p className="text-sm">
        <a href={`/approvals/${agentId}/${d.id}`} className="underline">
          Answer this decision
        </a>
      </p>
    </li>
  );
}

/**
 * Agents whose queue could not be read.
 *
 * Never folded into "nothing is waiting". With one read per agent, a partial
 * failure is the ordinary failure, and an operator shown four agents and told
 * nothing about the fifth would reasonably conclude the fifth proposed nothing
 * — on the one surface where that mistake means a real trade expires
 * unanswered.
 */
function UnreadableAgents({ agents }: { agents: readonly UnreadableAgentQueue[] }) {
  if (agents.length === 0) return null;

  return (
    <section
      role="alert"
      className="space-y-2 rounded-gc-2 border border-danger-default bg-danger-subtle p-4"
    >
      <h2 className="text-base font-medium text-text-primary">
        {agents.length === 1 ? 'One agent could not be asked' : `${agents.length} agents could not be asked`}
      </h2>
      <p className="text-sm text-text-primary">
        Anything these agents have proposed is not shown below, and may be waiting.
      </p>
      <ul className="space-y-1 text-sm text-text-secondary">
        {agents.map((a) => (
          <li key={a.agentId}>
            {a.agentName}: {a.reason}
            <WhyNotLoaded cause={a.cause} subject="this agent’s proposals are" />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ApprovalQueue({ result }: { result: ApprovalQueueResult }) {
  if (result.kind === 'unreadable') {
    // The roster itself failed, so the product cannot even name which agents it
    // did not ask. Reporting this as an empty queue is the lie this product
    // refuses everywhere else.
    return (
      <section className="space-y-2">
        <h2 className="text-base font-medium text-text-primary">
          Your agents could not be read
        </h2>
        <p className="text-base text-text-secondary">{result.reason}</p>
        <div className="text-sm text-text-secondary">
          <WhyNotLoaded cause={result.cause} subject="your agents are" />
        </div>
        <p className="text-sm text-text-secondary">
          This is not the same as nothing waiting. A decision may be expiring right now.
        </p>
      </section>
    );
  }

  if (result.kind === 'no-agents') {
    return (
      <section className="space-y-2">
        <h2 className="text-base font-medium text-text-primary">You have no agents yet</h2>
        <p className="text-base text-text-secondary">
          An agent set to <strong>approval required</strong> proposes trades and waits for you.
          Those proposals appear here.
        </p>
      </section>
    );
  }

  if (result.kind === 'none') {
    return (
      <div className="space-y-4">
        <UnreadableAgents agents={result.unreadable} />
        {/*
          "Nothing is waiting" is only sayable when every agent actually
          answered. With one unasked, the true sentence is narrower — and the
          broad one is precisely the lie this component exists to refuse, since
          the agent nobody could reach is exactly where a trade might be
          expiring.
        */}
        {result.unreadable.length === 0 ? (
          <section className="space-y-2">
            <h2 className="text-base font-medium text-text-primary">Nothing is waiting</h2>
            <p className="text-base text-text-secondary">
              None of your agents has a trade waiting for an answer.
            </p>
          </section>
        ) : (
          <section className="space-y-2">
            <h2 className="text-base font-medium text-text-primary">
              Nothing is waiting from the agents that answered
            </h2>
            <p className="text-base text-text-secondary">
              Every agent that could be reached has nothing waiting. The ones above could
              not be asked, so this is not the whole account.
            </p>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <UnreadableAgents agents={result.unreadable} />
      {result.groups.map((group) => (
        <section key={group.agentId} className="space-y-2">
          <h2 className="text-base font-medium text-text-primary">
            <a href={`/agents/${group.agentId}`} className="underline">
              {group.agentName}
            </a>
          </h2>
          <ul className="space-y-3">
            {group.decisions.map((view) => (
              <Decision key={view.decision.id} agentId={group.agentId} view={view} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
