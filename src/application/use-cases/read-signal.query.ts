import type { FailureCause } from '@/ports/failure.js';
import type { SignalDefinition, StrategiesPort } from '@/ports/strategies.js';

export type SignalResult =
  | { readonly kind: 'signal'; readonly definition: SignalDefinition }
  | { readonly kind: 'no-such-signal' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

/**
 * One signal's authoring card.
 *
 * Membership first: the id comes from a URL, and the platform enum-rejects
 * unknown ids with a refusal this product would have to parse. Reading the
 * library first makes "no such signal" a fact derived from what the platform
 * lists — the roster pattern — and means no unlisted id is ever sent onward.
 */
export class ReadSignalQuery {
  constructor(private readonly strategies: StrategiesPort) {}

  async execute(req: {
    userId: string;
    accessToken: string;
    signalId: string;
  }): Promise<SignalResult> {
    const listed = await this.strategies.listSignals(req);
    if (listed.kind === 'unreadable') return listed;
    if (!listed.signals.some((s) => s.id === req.signalId)) return { kind: 'no-such-signal' };

    try {
      const definition = await this.strategies.signalDefinition(req);
      return { kind: 'signal', definition };
    } catch (err) {
      // Listed a moment ago but unreadable now — deployment skew, transport,
      // or a payload the mapper refused. All the same fact to the reader.
      const reason = err instanceof Error ? err.message : String(err);
      return { kind: 'unreadable', reason, cause: 'unreachable' };
    }
  }
}
