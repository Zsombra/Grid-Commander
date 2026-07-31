import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { AgentEditConfirm, AgentEditForm } from '@/presentation/components/agent-edit.js';
import {
  editIntent,
  MONEY_FIELDS,
  positionFromTransport,
  presetPosition,
  requiredText,
} from '@/presentation/form.js';

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
        <p role="alert" className="text-sm">{roster.reason}</p>
      </main>
    );
  }

  const agent = roster.kind === 'agents' ? roster.agents.find((a) => a.id === id) : undefined;
  if (!agent) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">No such agent</h1>
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
        <AgentEditForm agent={agent} catalog={catalog.catalog} problem={query['problem']} />
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
   * described. A preset resolves to the catalog's own fourteen values (a
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
          <AgentEditForm
            agent={agent}
            catalog={catalog.catalog}
            problem={`The catalog does not carry a configuration for "${pmChoice}", so choosing it would send values nobody stated.`}
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
        <AgentEditForm agent={agent} catalog={catalog.catalog} problem={why} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
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


/**
 * Apply what was agreed to.
 *
 * This spends a token it did not mint. The token came back on the form the
 * previous request rendered, which is the only arrangement in which a
 * confirmation attests to anything: a person read the consequence, then pressed
 * a button.
 */
export async function applyEdit(formData: FormData) {
  'use server';
  const { app, user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');

  const agentId = requiredText(formData, 'agentId');
  const confirmationToken = requiredText(formData, 'confirmationToken');

  /**
   * Read by name, never by sweeping the form.
   *
   * This iterated `formData.entries()` and skipped the two keys it knew about,
   * which meant Next's own `$ACTION_ID_…` field arrived as a proposed change:
   *
   *     $ACTION_ID_405…: "$ACTION_ID_405…" is not a field this agent owns.
   *
   * Found by driving the real button in a browser — a hand-built request does
   * not carry that field, and no unit test would have invented it. `partitionEdit`
   * refused it rather than sending it, which is the layered defence working, but
   * a denylist of framework internals can never be complete. An allowlist can.
   */
  const intent = editIntent(
    {
      // `tc.` marks a trading-config field, so the two sets cannot be confused by
      // a name that appears in both. Stripped here, because the digest is over
      // the intent's own field names — the prefix is transport.
      get: (name) => {
        const value = formData.get(
          (MONEY_FIELDS as readonly string[]).includes(name) ? `tc.${name}` : name,
        );
        return typeof value === 'string' ? value : null;
      },
    },
    { name: ['displayName'], money: MONEY_FIELDS },
  );

  const { tradingConfig, ...changes } = intent;

  /**
   * The position object, off the same `pm.*` transport and through the same
   * coercion the review used — so the digest this request recomputes is the
   * digest the token was issued for. Merged under `tradingConfig` exactly as
   * the review merged it.
   */
  const position = positionFromTransport({
    get: (name) => {
      const value = formData.get(name);
      return typeof value === 'string' ? value : null;
    },
  });
  const fullConfig = position
    ? { ...((tradingConfig ?? {}) as Record<string, unknown>), positionManagement: position }
    : (tradingConfig as Record<string, unknown> | undefined);

  const result = await app.updateAgent.execute({
    ...user.authority,
    agentId,
    changes,
    ...(fullConfig ? { tradingConfigChanges: fullConfig } : {}),
    confirmationToken,
  });

  if (result.kind === 'updated') redirect(`/agents/${agentId}`);

  const reasons =
    result.kind === 'rejected'
      ? result.rejected.map((r) => `${r.field}: ${r.reason}`)
      : result.kind === 'invalid'
        ? result.issues.map((i) => `${i.field}: ${i.reason}`)
        : [result.reason];

  redirect(`/agents/${agentId}/edit?problem=${encodeURIComponent(reasons.join(' · '))}`);
}

