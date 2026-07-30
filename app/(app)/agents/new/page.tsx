import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { AgentForm } from '@/presentation/components/agent-form.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { behavior, optionalText, requiredText } from '@/presentation/form.js';
import { moneyAnswers } from '@/presentation/form.js';

/**
 * Create.
 *
 * Capacity and the catalog are both resolved before the form renders, because
 * the requirement is that a user is told *before* composing an agent that cannot
 * be created — not after submitting one.
 */
export default async function NewAgentPage() {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { creation } = await app.listAgents.execute(user.authority);
  if (creation.kind === 'at-capacity') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">No agent slots available</h1>
        <p role="status" className="text-sm">{creation.explanation}</p>
        <p className="text-sm"><a href="/agents" className="underline">Back to your agents</a></p>
      </main>
    );
  }

  const catalog = await app.readCatalog.execute(user.authority);
  if (catalog.kind !== 'catalog') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Cannot create an agent right now</h1>
        <p role="alert" className="text-sm">
          The choices this form needs come from BattleGrid, and it could not be
          reached: {catalog.kind === 'unreadable' ? catalog.reason : 'unknown'}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-xl font-medium">New agent</h1>
      <AgentForm catalog={catalog.catalog} action={create} />
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
  });

  if (result.kind === 'created') redirect(`/agents/${result.agent.id}`);
}
