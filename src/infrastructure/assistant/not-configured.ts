import type { AssistantPort, AssistantResponse } from '@/ports/assistant.js';

/**
 * The assistant, when no model has been configured for this deployment.
 *
 * Design A-D makes the model a port precisely so that *which* model answers is a
 * deployment decision. This is what that decision looks like before it is made:
 * an honest refusal rather than a half-built adapter to a model nobody chose.
 *
 * It reads nothing, so the use case produces a `general` answer — which is the
 * correct shape. The product is not claiming anything about the user's account,
 * and the surface says so.
 */
export class NotConfiguredAssistant implements AssistantPort {
  async answer(): Promise<AssistantResponse> {
    return {
      text:
        'The assistant is not available on this deployment — no model has been ' +
        'configured for it. Everything it could tell you is on the pages ' +
        'themselves: your agents and what they are bound to, your strategies and ' +
        'how many agents each governs, and the audit log of everything ' +
        'Grid-Commander has done on your behalf.',
      consulted: [],
    };
  }
}
