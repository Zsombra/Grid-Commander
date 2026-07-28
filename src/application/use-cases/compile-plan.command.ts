import { createHash } from 'node:crypto';
import type { CompiledPlan } from '@/domain/strategy/compiled-plan.js';
import {
  blastRadius,
  changedAxes,
  concerns,
  confirmationSummary,
  isViable,
  proposedRevision,
  type Concern,
} from '@/domain/strategy/compiled-plan.js';
import type { StrategiesPort } from '@/ports/strategies.js';

export interface CompilePlanRequest {
  readonly userId: string;
  readonly accessToken: string;
  /** The composed intent, exactly as it will be sent to the compiler. */
  readonly request: Readonly<Record<string, unknown>>;
}

/** What a user reviews before deciding. Nothing here has happened. */
export interface PlanReview {
  readonly plan: CompiledPlan;
  readonly viable: boolean;
  readonly concerns: readonly Concern[];
  readonly changedAxes: readonly string[];
  readonly boundAgentCount: number | null;
  readonly proposedRevision: number | null;
  /** The platform's own account of the operation. Ours would be a second one. */
  readonly summary: string | null;
  readonly expiresAt: Date | null;
}

export type CompilePlanResult =
  | { readonly kind: 'review'; readonly review: PlanReview }
  | { readonly kind: 'rejected'; readonly reason: string };

/**
 * Compile a proposed change.
 *
 * **This writes nothing.** It is a separate use case from applying, rather than a
 * flag on one, because the platform made compiling effect-free precisely so a
 * human could look before committing — and a boolean between the two is one typo
 * from reconfiguring a fleet.
 */
export class CompilePlanCommand {
  constructor(private readonly strategies: StrategiesPort) {}

  async execute(req: CompilePlanRequest): Promise<CompilePlanResult> {
    const result = await this.strategies.compilePlan(req);
    if (result.kind === 'rejected') return { kind: 'rejected', reason: result.reason };

    const { approvedPlan, reviewContext, planToken } = result;

    return {
      kind: 'review',
      review: {
        plan: {
          approvedPlan,
          reviewContext,
          planToken,
          // Binds the plan to the intent that produced it. Without this a user
          // compiles A, edits the form to B, and applies — and A lands, because
          // the token is bound to A's post-state. See S-E.
          intentDigest: digestOf(req.request),
        },
        viable: isViable(approvedPlan),
        // Shown, never enforced. `viable` is the gate — see S-C.
        concerns: concerns(approvedPlan),
        changedAxes: changedAxes(approvedPlan),
        boundAgentCount: blastRadius(approvedPlan),
        proposedRevision: proposedRevision(approvedPlan),
        summary: confirmationSummary(reviewContext),
        expiresAt: readExpiry(approvedPlan),
      },
    };
  }
}

/**
 * A stable digest of the composed intent.
 *
 * Keys are sorted so that two structurally identical intents digest identically
 * regardless of how they were built — otherwise a re-render that reorders an
 * object would discard a perfectly good plan.
 */
export function digestOf(value: unknown): string {
  return createHash('sha256').update(canonicalise(value)).digest('hex');
}

function canonicalise(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalise).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalise(v)}`).join(',')}}`;
}

function readExpiry(approvedPlan: Readonly<Record<string, unknown>>): Date | null {
  const raw = approvedPlan['expiresAt'];
  if (typeof raw !== 'string') return null;
  const at = new Date(raw);
  return Number.isNaN(at.getTime()) ? null : at;
}
