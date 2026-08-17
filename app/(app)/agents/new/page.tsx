import { randomUUID } from 'node:crypto';
import { acting } from '@/presentation/session.js';
import { AgentForm } from '@/presentation/components/agent-form.js';
import { CarriedProblem } from '@/presentation/components/carried-problem.js';
import { WhyNotLoaded } from '@/presentation/components/why-not-loaded.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { BUTTON_SECONDARY } from '@/presentation/components/control.js';
import { create } from './actions.js';

/**
 * Create.
 *
 * Capacity and the catalog are both resolved before the form renders, because
 * the requirement is that a user is told *before* composing an agent that cannot
 * be created — not after submitting one.
 *
 * `?problem=` is the aftermath of a bounced submit, and it mounts on EVERY
 * branch: a duplicate press whose first press succeeded arrives here at
 * capacity by construction, so the branch a bounce lands on is exactly the one
 * that must not drop it (#240's lesson, learned on archive).
 */
export default async function NewAgentPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const q = (await searchParams) ?? {};
  const raw = q['problem'];
  const first = Array.isArray(raw) ? raw[0] : raw;
  const problem = first && first.length > 0 ? first : null;

  const { creation } = await app.listAgents.execute(user.authority);
  if (creation.kind === 'at-capacity') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">No agent slots available</h1>
        <CarriedProblem problem={problem} />
        <p role="status" className="text-sm">{creation.explanation}</p>
        <p className="text-sm"><a href="/agents" className="underline">Back to your agents</a></p>
      </main>
    );
  }

  const catalog = await app.readCatalog.execute(user.authority);
  // Branching on the failure rather than on "not the good case". The negative
  // test needed a `: 'unknown'` fallback for a state the union does not have,
  // and it hid the `cause` the result carries — so this page told a user with a
  // rejected credential to wait for an outage that was not happening.
  if (catalog.kind === 'unreadable') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Cannot create an agent right now</h1>
        <CarriedProblem problem={problem} />
        <p role="alert" className="text-sm">
          The choices this form needs come from BattleGrid: {catalog.reason}
        </p>
        <WhyNotLoaded cause={catalog.cause} subject="BattleGrid’s catalogue is" />
        <p className="text-sm">
          <a href="/agents" className="underline">Back to your agents</a>
        </p>
      </main>
    );
  }

  // What the agent will read. Not in the catalog — that is the create tool's
  // own vocabulary — so it is a second read, and the form cannot be composed
  // without it any more than without the catalog.
  const { result: strategies, listings } = await app.listStrategies.execute(user.authority);

  if (strategies.kind === 'unreadable') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Cannot create an agent right now</h1>
        <CarriedProblem problem={problem} />
        <p role="alert" className="rounded-gc-2 border border-danger-default bg-danger-subtle p-4 text-sm text-text-primary">
          An agent reads a strategy, and the list of them could not be read:{' '}
          {strategies.reason}
        </p>
        <WhyNotLoaded cause={strategies.cause} subject="your strategies are" />
        <p className="text-sm">
          <a href="/agents" className={BUTTON_SECONDARY}>Back to your agents</a>
        </p>
      </main>
    );
  }

  // Readable and empty is its own answer, not a failure. `list_strategies`
  // returns BattleGrid's visible catalog alongside the operator's own, so
  // nothing at all means there is nothing to bind to — and nothing to fork
  // from either, which is why no next action is offered here.
  if (listings.length === 0) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Nothing to bind an agent to</h1>
        <CarriedProblem problem={problem} />
        <p className="text-sm text-text-primary">
          An agent reads a strategy, and no strategies are listed — not even
          BattleGrid&rsquo;s own. Your account is connected and nothing here has
          failed; there is simply nothing to bind to yet.
        </p>
        <p className="text-sm">
          <a href="/strategies" className={BUTTON_SECONDARY}>Look at your strategies</a>
        </p>
      </main>
    );
  }

  // What a bounce carried back, so a refusal naming one field does not cost
  // the operator every other one. `problem` is the banner, not composition,
  // and a dedupe key in the URL is never composition: the form's key is
  // minted per render, below, whatever the URL claims.
  const composed: Record<string, string> = {};
  for (const [key, value] of Object.entries(q)) {
    if (key === 'problem' || key === 'idempotencyKey') continue;
    const one = Array.isArray(value) ? value[0] : value;
    if (one && one.length > 0) composed[key] = one;
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-xl font-medium">New agent</h1>
      <CarriedProblem problem={problem} />
      {/* Minted here, per render, and carried through the form — see the note
          on the hidden input in AgentForm. A key minted inside `create` would
          be a new key per press and would dedupe nothing. The re-rendered form
          carries a FRESH key, so a deliberate second agent stays one press
          away — the dedupe binds a form instance, not the operator. */}
      <AgentForm
        catalog={catalog.catalog}
        strategies={listings}
        action={create}
        idempotencyKey={randomUUID()}
        composed={composed}
      />
    </main>
  );
}
