import type { BattlegridSubject } from '../connection/subject.js';
/**
 * The token BattleGrid issues alongside a compiled plan.
 *
 * `bgsp1.<base64url claims>.<signature>` — three parts, and the middle one
 * decodes without a key (findings-strategies F-1). The claims carry everything a
 * local check needs: when it expires, who it was issued to, which strategy, and
 * which revision it was compiled against.
 *
 * **The claims may only ever refuse.** The signature cannot be verified here, so
 * a token whose claims look fine has proven nothing — only the server decides
 * that a plan is acceptable. This is the same shape as the degraded-capability
 * allowlist in `connect-battlegrid-account` (DL-7), and it earns the same rule:
 * if a parse can grant, it is a violation.
 */

export interface PlanTokenClaims {
  readonly userId: string;
  readonly strategyId: string;
  readonly operation: string;
  readonly expectedRevision: number;
  readonly proposedRevision: number;
  readonly expiresAt: Date;
}

/**
 * Unparseable is *unknown*, not invalid.
 *
 * An unknown token is submitted and the server judges it — which is exactly the
 * behaviour we would have without a parser at all. Treating a layout change as a
 * refusal would break every apply the day BattleGrid bumps the token version.
 */
export type ParsedToken =
  | { readonly kind: 'claims'; readonly claims: PlanTokenClaims }
  | { readonly kind: 'unknown' };

export function parsePlanToken(token: string): ParsedToken {
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[1]) return { kind: 'unknown' };

  const claims = decodeClaims(parts[1]);
  if (!claims) return { kind: 'unknown' };

  const userId = str(claims['userId']);
  const strategyId = str(claims['strategyId']);
  const operation = str(claims['operation']);
  const expectedRevision = num(claims['expectedRevision']);
  const proposedRevision = num(claims['proposedRevision']);
  const expiresAtEpochMs = num(claims['expiresAtEpochMs']);

  if (
    userId === null ||
    strategyId === null ||
    operation === null ||
    expectedRevision === null ||
    proposedRevision === null ||
    expiresAtEpochMs === null
  ) {
    return { kind: 'unknown' };
  }

  return {
    kind: 'claims',
    claims: {
      userId,
      strategyId,
      operation,
      expectedRevision,
      proposedRevision,
      expiresAt: new Date(expiresAtEpochMs),
    },
  };
}

/** Why a plan will not be sent. Each is actionable; none is "it failed". */
export type LocalRefusal =
  | { readonly kind: 'expired'; readonly expiredAt: Date }
  | { readonly kind: 'different-user' }
  | { readonly kind: 'different-strategy'; readonly compiledFor: string }
  | { readonly kind: 'superseded'; readonly compiledAt: number; readonly current: number };

/**
 * What Grid-Commander can determine locally.
 *
 * Returns null when it has no reason to refuse — which is **not** the same as
 * "this plan is valid". The caller submits and the platform decides.
 */
export function refuseLocally(
  token: ParsedToken,
  /**
   * **`battlegridSubject`, never the product's own `userId`.**
   *
   * The token's `userId` claim is BattleGrid's account id. This parameter used to
   * be named `userId` too and was handed the product's *local* row id, which is
   * `'owner'` on a personal deployment and `random.token(16)` on a delegated one.
   * Neither can ever equal a BattleGrid account id, so every apply was refused
   * with "this plan was compiled for a different account" — on a plan compiled for
   * exactly that account.
   *
   * The type is the guard: supplying the local id no longer compiles.
   */
  context: {
    battlegridSubject: BattlegridSubject | null;
    strategyId: string;
    currentRevision?: number | undefined;
  },
  now: Date,
): LocalRefusal | null {
  if (token.kind === 'unknown') return null;
  const c = token.claims;

  if (c.expiresAt.getTime() <= now.getTime()) {
    return { kind: 'expired', expiredAt: c.expiresAt };
  }
  // Unknown is not mismatched. A `null` subject means the product could not
  // establish which account it is acting as, and refusing on a fact we do not hold
  // is what produced this defect in the first place — see DL-3.
  if (context.battlegridSubject !== null && c.userId !== context.battlegridSubject) {
    return { kind: 'different-user' };
  }
  if (c.strategyId !== context.strategyId) {
    return { kind: 'different-strategy', compiledFor: c.strategyId };
  }
  if (context.currentRevision !== undefined && c.expectedRevision !== context.currentRevision) {
    return { kind: 'superseded', compiledAt: c.expectedRevision, current: context.currentRevision };
  }
  return null;
}

/** What the user is told. Every case names the remedy, which is always: compile again. */
export function describeRefusal(refusal: LocalRefusal): string {
  switch (refusal.kind) {
    case 'expired':
      return (
        'This plan expired — BattleGrid only holds a compiled plan for five minutes, ' +
        'so that what you apply is measured against the state you reviewed. Compile again.'
      );
    case 'different-user':
      return 'This plan was compiled for a different account. Compile it again on yours.';
    case 'different-strategy':
      return 'This plan was compiled for a different strategy. Compile again for this one.';
    case 'superseded':
      return (
        `This strategy has changed since the plan was compiled — it was at revision ` +
        `${refusal.compiledAt} and is now at ${refusal.current}. Compile again so you ` +
        'review what would actually happen.'
      );
  }
}

function decodeClaims(segment: string): Record<string, unknown> | null {
  try {
    const padded = segment + '='.repeat((4 - (segment.length % 4)) % 4);
    const json = Buffer.from(padded, 'base64url').toString('utf8');
    const parsed: unknown = JSON.parse(json);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    // A layout we do not recognise. Unknown, not invalid — see above.
    return null;
  }
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}
