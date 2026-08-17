import type { HeldScopes } from '@/domain/connection/held-scopes.js';
import { STEP_UP_PERMITS } from '@/domain/connection/scope.js';

/**
 * Whether this connection may answer a proposed trade.
 *
 * Exists so a surface can **gate by not rendering**. The UI checklist forbids a
 * disabled-but-present control, and `system.json` principle 10 says the same:
 * an action shown greyed out still tells the operator the product could do it
 * if they found the right lever, which is exactly the wrong belief to leave
 * behind on a money surface.
 *
 * **This is not the safety boundary and must never become one.** The refusal
 * that matters happens in `beginGuardedCall`, before any attempt, on every path
 * including ones that never render — architecture policy P1 is explicit that
 * scope is not a boundary, and a surface that decided for itself would be a
 * second opinion about whether a write is allowed. This query reads the same
 * `HeldScopes` the guard reads, and its only job is deciding what to *draw*.
 */

export type AnswerAuthorityResult =
  | { readonly kind: 'held' }
  | {
      readonly kind: 'absent';
      /** What the step-up would permit, in the words the operator is shown. */
      readonly permits: readonly string[];
    };

export class ReadAnswerAuthorityQuery {
  constructor(private readonly heldScopes: HeldScopes) {}

  async execute(req: { userId: string }): Promise<AnswerAuthorityResult> {
    const held = await this.heldScopes.forUser(req.userId);
    // An absent or unusable connection yields no scopes at all, which reads as
    // absent here — the correct answer. No connection is not "any authority".
    return held.includes('mcp:wager') ? { kind: 'held' } : { kind: 'absent', permits: STEP_UP_PERMITS };
  }
}
