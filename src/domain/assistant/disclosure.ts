/**
 * Who answers, and therefore where a question goes.
 *
 * Every other requirement in this capability concerns what the assistant may
 * *read*. This is the only one about what it *emits*, and it exists because
 * answering is the one outbound path in this product the user did not authorise
 * by name — a BattleGrid connection is granted through a screen that says
 * BattleGrid on it.
 *
 * Two shapes, and the distinction is the whole point. A deployment with no model
 * sends nothing, and telling those users their data goes to a third party would
 * replace a missing true statement with a new false one.
 */
export type AssistantDisclosure =
  | { readonly kind: 'nothing-answers' }
  | {
      readonly kind: 'sends-outside';
      /**
       * The organisation that receives it. Not the model version: `claude-opus-5`
       * means nothing to someone checking on their trading agents, and pinning a
       * version into a user-facing sentence makes an upgrade a copy change.
       */
      readonly recipient: string;
    };

/**
 * The sentence the user reads.
 *
 * Composed here rather than in the page, so that the disclosure and the fact it
 * describes cannot drift apart. A page holding its own copy of this sentence is
 * exactly the failure this capability exists to prevent — the deployment would
 * change and the promise would not.
 */
export function describeDisclosure(disclosure: AssistantDisclosure): string {
  if (disclosure.kind === 'nothing-answers') {
    return (
      'No model is configured on this deployment, so the assistant cannot ' +
      'answer and nothing you type here leaves this product.'
    );
  }
  return (
    `Answering sends what I read from your account to ${disclosure.recipient}, ` +
    'outside this product. Everything else Grid-Commander does stays between ' +
    'you and BattleGrid. Each answer lists exactly what it read.'
  );
}
