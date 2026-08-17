import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { AgentEditConfirm, AgentEditForm } from '@/presentation/components/agent-edit.js';
import { CarriedProblem } from '@/presentation/components/carried-problem.js';
import { WhyNotLoaded } from '@/presentation/components/why-not-loaded.js';
import {
  editIntent,
  MONEY_FIELDS,
  positionFromTransport,
  presetPosition,
} from '@/presentation/form.js';
import { applyEdit } from './actions.js';

/**
 * Change what an agent owns, in two requests.
 *
 * The first renders the form. Submitting it is a **GET** — it navigates back
 * here carrying what was typed, and this page then proposes the change and
 * renders the consequence the confirmation was issued against. The second
 * request, from that confirm form, applies it.
 *
 * The split is the point. This page used to hold one server action that called
 * `describeEdit` and spent the token it was handed four lines later, in the same
 * request — so the sentence a person was meant to agree to was computed, stored
 * for the audit, and read by nobody. `update-cannot-carry-a-confirmation` had
 * already named that as *the fix that would be wrong*; it was fixed in the
 * command and reappeared here. See
 * `tests/architecture/confirmation-is-human.test.ts`.
 *
 * The trading-config caveat this file used to carry is gone with it. Three keys
 * still come back on read and are rejected on write — `applyEdit` drops them,
 * which is exactly what `the-edit-path-cannot-succeed-either` built it to do.
 */
export default async function EditAgentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { id } = await params;
  const query = await searchParams;

  const [{ roster }, catalog] = await Promise.all([
    app.listAgents.execute(user.authority),
    app.readCatalog.execute(user.authority),
  ]);

  if (roster.kind === 'unreadable') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Could not load this agent</h1>
        {/* On every branch, unconditionally — a bounced apply can land while
            *any* of the seven is the one that answers, and the reason in the
            URL is the only record of what that click did. The branch's own
            failure below is a different fact and both are owed. */}
        <CarriedProblem problem={query['problem']} />
        <p role="alert" className="text-sm">{roster.reason}</p>
        {/* Said before the form is refused rather than after: an editor who
            cannot see their agent should know whether to wait or to reconnect,
            and those are opposite actions. */}
        <WhyNotLoaded cause={roster.cause} subject="this agent is" />
      </main>
    );
  }

  const agent = roster.kind === 'agents' ? roster.agents.find((a) => a.id === id) : undefined;
  if (!agent) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">No such agent</h1>
        <CarriedProblem problem={query['problem']} />
        <p className="text-sm">
          <a href="/agents" className="underline">Back to your agents</a>
        </p>
      </main>
    );
  }

  if (catalog.kind !== 'catalog') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Edit {agent.displayName}</h1>
        <CarriedProblem problem={query['problem']} />
        {/*
          The form asks the catalog which limits BattleGrid refuses to default.
          Without it this page cannot know what to ask for, and guessing would
          produce a form that omits a limit — which `tradingConfig` reads as
          removing it.
        */}
        <p role="alert" className="text-sm">
          The catalog of what BattleGrid will accept could not be read, so this
          form cannot say which limits it has to ask for. {catalog.reason}
        </p>
        <p className="text-sm">
          <a href={`/agents/${agent.id}`} className="underline">Back to {agent.displayName}</a>
        </p>
      </main>
    );
  }

  // The form branch: nothing proposed, no token in existence.
  if (query['review'] !== '1') {
    return (
      <main className="mx-auto max-w-3xl space-y-6 p-6">
        <h1 className="text-xl font-medium">Edit {agent.displayName}</h1>
        {/* The bounced reason renders here, not through the form's `problem`
            prop — that prop now carries only a refusal formed on the branch
            rendering it, so the two facts cannot double-render as one. */}
        <CarriedProblem problem={query['problem']} />
        <AgentEditForm
          agent={agent}
          catalog={catalog.catalog}
          composed={query}
        />
      </main>
    );
  }

  /**
   * The review branch. Every value is carried forward from the query, so what
   * the token is issued against is what the confirm form will post.
   *
   * `describeEdit` refuses a field the agent does not own, so a parameter added
   * to the URL by hand is rejected here rather than sent to BattleGrid.
   */
  const intent = editIntent(
    { get: (name) => query[name] ?? null },
    { name: ['displayName'], money: MONEY_FIELDS },
  );

  /**
   * The position choice, resolved to values *here*, before anything is
   * described. A preset resolves to the catalog's own twelve values (a
   * preset the catalog cannot answer for is refused); CUSTOM reads the
   * fields as typed, through the same coercion the apply will use; no
   * choice contributes nothing. The confirmation is bound to the resolved
   * values, so what the person agrees to is what will be sent — the label
   * is never sent alone.
   */
  const pmChoice = query['pmPreset'] ?? '';
  let position: Record<string, unknown> | null = null;
  if (pmChoice === 'CUSTOM') {
    position = positionFromTransport({
      get: (name) =>
        name === 'pm.positionManagementPreset' ? 'CUSTOM' : (query[name] ?? null),
    });
  } else if (pmChoice !== '') {
    const resolved = presetPosition(catalog.catalog, pmChoice);
    if (!resolved) {
      return (
        <main className="mx-auto max-w-3xl space-y-6 p-6">
          <h1 className="text-xl font-medium">Edit {agent.displayName}</h1>
          <CarriedProblem problem={query['problem']} />
          <AgentEditForm
            agent={agent}
            catalog={catalog.catalog}
            problem={`The catalog does not carry a configuration for "${pmChoice}", so choosing it would send values nobody stated.`}
            composed={query}
          />
        </main>
      );
    }
    position = { ...resolved };
  }

  if (position) {
    intent['tradingConfig'] = {
      ...((intent['tradingConfig'] ?? {}) as Record<string, unknown>),
      positionManagement: position,
    };
  }
  const { tradingConfig: proposedConfig, ...proposedChanges } = intent;
  // The flat money fields ride as tc.* hidden inputs; the position object has
  // its own pm.* transport, so it is split out rather than stringified flat.
  const flatConfig = Object.fromEntries(
    Object.entries((proposedConfig ?? {}) as Record<string, unknown>).filter(
      ([key]) => key !== 'positionManagement',
    ),
  );

  const proposed = await app.describeEdit.execute({
    ...user.authority,
    agentId: id,
    // The same coercion the apply uses. These were two — this kept `"25"` and the
    // apply produced `25` — which was harmless while nothing compared them and
    // would refuse every honest edit now that the confirmation is bound to the
    // values. See DL-5.
    changes: intent,
  });

  if (proposed.kind !== 'proposal') {
    const why =
      'reason' in proposed ? proposed.reason : proposed.rejected.map((r) => r.reason).join(' · ');
    return (
      <main className="mx-auto max-w-3xl space-y-6 p-6">
        <h1 className="text-xl font-medium">Edit {agent.displayName}</h1>
        <CarriedProblem problem={query['problem']} />
        <AgentEditForm agent={agent} catalog={catalog.catalog} problem={why} composed={query} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <CarriedProblem problem={query['problem']} />
      <AgentEditConfirm
        agent={agent}
        consequence={proposed.proposal.consequence}
        confirmationToken={proposed.proposal.confirmationToken}
        changes={proposedChanges as Record<string, string | number>}
        tradingConfigChanges={flatConfig as Record<string, string | number>}
        positionChanges={position}
        action={applyEdit}
      />
    </main>
  );
}
