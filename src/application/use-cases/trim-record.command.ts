import type { ConfirmationRefusalCause, ConfirmationStore } from '@/domain/capability/confirmation.js';
import { CONFIRMATION_TTL_SECONDS, confirmationTarget } from '@/domain/capability/confirmation.js';
import type { Clock } from '@/ports/clock.js';
import type { SignalRecordStore, TrimOutcome, TrimPreview } from '@/ports/signal-record.js';
import type { Randomness } from './connect.commands.js';

/**
 * Forgetting part of the signal record, with ceremony.
 *
 * The recorder's whole promise is that a gap can never be filled in later —
 * the platform serves current readings only. A trim is therefore the one act
 * in this product whose loss is *permanent by the product's own argument*, and
 * it goes through the same describe→confirm→perform ceremony as every other
 * destructive act: the description states what becomes unknowable, the
 * confirmation binds the boundary and the described extent, and the perform
 * spends it once.
 *
 * The boundary is the run. Coverage derives gaps from runs, so rows deleted
 * out from under a surviving run would leave the record claiming attempts
 * whose findings are invisible — a recorder lying about itself.
 */

/** The tool name the confirmation is issued and consumed against. */
export const TRIM_TOOL = 'signal-record:trim';

export interface DescribeTrimRequest {
  readonly userId: string;
  readonly before: Date;
}

export interface TrimProposal {
  readonly before: Date;
  readonly preview: TrimPreview;
  readonly consequence: string;
  readonly confirmationToken: string;
}

export type DescribeTrimResult =
  | { readonly kind: 'proposal'; readonly proposal: TrimProposal }
  /** Nothing falls before the boundary — there is nothing to agree to. */
  | { readonly kind: 'nothing-to-trim'; readonly reason: string };

export class DescribeTrimRecordQuery {
  constructor(
    private readonly store: SignalRecordStore,
    private readonly confirmations: ConfirmationStore,
    private readonly random: Randomness,
    private readonly clock: Clock,
  ) {}

  async execute(req: DescribeTrimRequest): Promise<DescribeTrimResult> {
    const preview = await this.store.trimPreview(req);
    if (preview.runs === 0) {
      return {
        kind: 'nothing-to-trim',
        reason: `No capture runs started before ${req.before.toISOString().slice(0, 10)} — there is nothing to trim.`,
      };
    }

    const span =
      preview.oldest !== null && preview.newest !== null
        ? `${preview.oldest.toISOString().slice(0, 10)} through ${preview.newest.toISOString().slice(0, 10)}`
        : 'an unstated span';
    const consequence =
      `${preview.runs} capture run${preview.runs === 1 ? '' : 's'} will be removed — ` +
      `${preview.captures} recorded capture${preview.captures === 1 ? '' : 's'}, ` +
      `${preview.failures} failed attempt${preview.failures === 1 ? '' : 's'} and ` +
      `${preview.readings} signal reading${preview.readings === 1 ? '' : 's'} across ` +
      `${preview.coinTickers.join(', ') || 'no coins'}, spanning ${span}. ` +
      `The platform serves current readings only, so nothing trimmed can ever be ` +
      `re-recorded: this span's gaps re-widen permanently, and every future mapper ` +
      `improvement loses these rows to be retroactive over.`;

    const confirmationToken = this.random.token(32);
    await this.confirmations.issue({
      token: confirmationToken,
      userId: req.userId,
      tool: TRIM_TOOL,
      target: confirmationTarget.signalRecordTrim(req.userId, req.before, preview.runs),
      consequence,
      expiresAt: new Date(this.clock.now().getTime() + CONFIRMATION_TTL_SECONDS * 1000),
      consumedAt: null,
    });

    return { kind: 'proposal', proposal: { before: req.before, preview, consequence, confirmationToken } };
  }
}

export interface TrimRecordRequest {
  readonly userId: string;
  readonly before: Date;
  /** The extent the describe showed — the agreement is to *this much* going. */
  readonly describedRuns: number;
  readonly confirmationToken: string;
}

export type TrimRecordResult =
  | { readonly kind: 'trimmed'; readonly outcome: TrimOutcome }
  | { readonly kind: 'refused'; readonly cause: ConfirmationRefusalCause; readonly reason: string };

/** What each refusal means for the person standing at the form. */
const REFUSALS: Record<ConfirmationRefusalCause, string> = {
  expired: 'The confirmation expired. Nothing was trimmed — review the description again.',
  'already-used': 'This confirmation was already spent. Check the record before trying again.',
  mismatched:
    'The record no longer matches what was described — likely another trim happened in between. ' +
    'Nothing was trimmed; describe it again.',
  unknown: 'The confirmation is not recognised. Nothing was trimmed.',
};

export class TrimRecordCommand {
  constructor(
    private readonly store: SignalRecordStore,
    private readonly confirmations: ConfirmationStore,
  ) {}

  async execute(req: TrimRecordRequest): Promise<TrimRecordResult> {
    const target = confirmationTarget.signalRecordTrim(req.userId, req.before, req.describedRuns);
    const spent = await this.confirmations.consume(req.confirmationToken, req.userId, TRIM_TOOL, target);
    if (spent === null) {
      const cause = await this.confirmations.diagnose(req.confirmationToken, req.userId, TRIM_TOOL, target);
      return { kind: 'refused', cause, reason: REFUSALS[cause] };
    }
    return { kind: 'trimmed', outcome: await this.store.trim({ userId: req.userId, before: req.before }) };
  }
}
