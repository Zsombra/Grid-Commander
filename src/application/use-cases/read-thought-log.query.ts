import type { ThoughtEntry } from '@/domain/agent/thought.js';
import { clearedItsBar, describeOutcome, stoodDown } from '@/domain/agent/thought.js';
import type { AgentsPort } from '@/ports/agents.js';
import type { FailureCause } from '@/ports/failure.js';

export interface ReadThoughtLogRequest {
  readonly userId: string;
  readonly accessToken: string;
  /** Omitted reads every agent's reasoning, aggregated. */
  readonly agentId?: string | undefined;
  readonly limit?: number | undefined;
}

/** One decision, with the readings a surface would otherwise have to derive. */
export interface Decision {
  readonly entry: ThoughtEntry;
  /** Copy where this product has it, the platform's own name where it does not. */
  readonly outcome: string;
  readonly bar: ReturnType<typeof clearedItsBar>;
  readonly declined: boolean;
}

export type ReadThoughtLogResult =
  | {
      readonly kind: 'decisions';
      readonly decisions: readonly Decision[];
      /** The account's total — never less than this page, and a short history can fit in it whole (#293). */
      readonly total: number;
    }
  | { readonly kind: 'none' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

/**
 * What an agent decided, and why.
 *
 * Three states, deliberately, matching the roster's. An agent that has not
 * reasoned yet and a log that failed to load are different facts, and the
 * product has already shipped one defect from collapsing that distinction —
 * every read returned `{}` for the life of the product and every page said the
 * account was empty.
 *
 * The derivations happen here rather than in the page, because `app/` may not
 * import the domain and because a surface that computes
 * `confidence - threshold` itself will eventually compute it backwards.
 */
export class ReadThoughtLogQuery {
  constructor(private readonly agents: AgentsPort) {}

  async execute(req: ReadThoughtLogRequest): Promise<ReadThoughtLogResult> {
    const log = await this.agents.readThoughtLog(req);

    if (log.kind === 'unreadable') {
      return { kind: 'unreadable', reason: log.reason, cause: log.cause };
    }
    if (log.kind === 'empty') return { kind: 'none' };

    return {
      kind: 'decisions',
      total: log.total,
      decisions: log.entries.map((entry) => ({
        entry,
        outcome: describeOutcome(entry.outcome),
        bar: clearedItsBar(entry),
        declined: stoodDown(entry),
      })),
    };
  }
}
