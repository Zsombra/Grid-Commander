'use server';

import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { behavior, optionalText, requiredText } from '@/presentation/form.js';
import { moneyAnswers } from '@/presentation/form.js';

export async function create(formData: FormData) {
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
    // wording reads after CarriedProblem's "Refused:" prefix. The composition
    // does not ride this bounce: the first press already landed, or may have,
    // so there is nothing the operator needs to re-enter.
    const sentence =
      result.originalOutcome === 'succeeded'
        ? 'this form was already submitted and the agent was created — the earlier press worked. It is on your agents page.'
        : 'this form was already submitted and the outcome is not yet recorded — it may have landed. Check your agents page before pressing again.';
    redirect(`/agents/new?problem=${encodeURIComponent(sentence)}`);
  }

  /**
   * The refusals, each with what was typed riding along — the edit action's
   * pattern. Carrying only the reason would send the person back to an empty
   * form, so a refusal naming one field would cost them every other one.
   *
   * The dedupe key stays behind on purpose: all three of these refuse before
   * the create is attempted, so no attempt exists under the old key, and the
   * re-rendered form mints a fresh one — the dedupe binds a form instance,
   * not the operator. `$ACTION*` is Next's transport, not composition.
   */
  const backTo = (problem: string): never => {
    const back = new URLSearchParams({ problem });
    for (const [k, v] of formData.entries()) {
      if (k === 'idempotencyKey' || k.startsWith('$ACTION')) continue;
      if (typeof v === 'string' && v.length > 0) back.set(k, v);
    }
    redirect(`/agents/new?${back.toString()}`);
  };

  switch (result.kind) {
    case 'at-capacity':
      return backTo(result.explanation);
    case 'no-catalog':
      return backTo(result.reason);
    case 'invalid':
      return backTo(result.issues.map((i) => `${i.field}: ${i.reason}`).join(' · '));
    default:
      // A sixth arm added to `CreateAgentResult` lands here and fails
      // typecheck, instead of falling off the end of the action the way
      // `at-capacity`, `invalid` and `no-catalog` did for the life of the
      // route (#245).
      return result satisfies never;
  }
}
