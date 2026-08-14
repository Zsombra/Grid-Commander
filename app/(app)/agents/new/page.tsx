import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { AgentForm } from '@/presentation/components/agent-form.js';
import { CarriedProblem } from '@/presentation/components/carried-problem.js';
import { WhyNotLoaded } from '@/presentation/components/why-not-loaded.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { BUTTON_SECONDARY } from '@/presentation/components/control.js';
import { behavior, optionalText, requiredText } from '@/presentation/form.js';
import { moneyAnswers } from '@/presentation/form.js';

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
} = {}) {
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
      />
    </main>
  );
}

export async function create(formData: FormData) {
  'use server';
  const { app, user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');

  const preset = optionalText(formData, 'brainPreset');

  const result = await app.createAgent.execute({
    ...user.authority,
    displayName: requiredText(formData, 'displayName'),
    // The union is decided here, once, from which control the user used. The
    // server rejects a brain carrying both variants.
    brain: preset
      ? { kind: 'preset', preset }
      : {
          kind: 'custom',
          modelId: requiredText(formData, 'modelId'),
          // Validated against the domain's guards, not cast into shape.
          behavior: behavior(formData),
        },
    strategyId: requiredText(formData, 'strategyId'),
    // Was `null` — which meant every agent this button created traded under
    // limits the product neither set nor could name. BattleGrid declares no
    // default for the money questions, so leaving them out did not inherit
    // something sensible; it left them unanswered.
    // The six questions BattleGrid refuses to default. The command assembles
    // the rest from the catalog and refuses if any of these is unanswered.
    money: moneyAnswers(formData),
    // A catalog preset's own values, or CUSTOM for the assembled set. The
    // command refuses a name the catalog cannot answer for.
    positionPreset: optionalText(formData, 'positionPreset') ?? undefined,
    // The key the form was rendered with, so a resubmit of that form is the
    // same command rather than a second one. `?? undefined` rather than a
    // freshly minted fallback: a key invented here would be new on every press
    // and would read as protection while providing none.
    idempotencyKey: optionalText(formData, 'idempotencyKey') ?? undefined,
  });

  if (result.kind === 'created') redirect(`/agents/${result.agent.id}`);
  if (result.kind === 'duplicate') {
    // A second press of the same form. Which sentence depends on what the
    // first press did — carried as a field, never parsed from a message. The
    // wording reads after CarriedProblem's "Refused:" prefix.
    const sentence =
      result.originalOutcome === 'succeeded'
        ? 'this form was already submitted and the agent was created — the earlier press worked. It is on your agents page.'
        : 'this form was already submitted and the outcome is not yet recorded — it may have landed. Check your agents page before pressing again.';
    redirect(`/agents/new?problem=${encodeURIComponent(sentence)}`);
  }
}
