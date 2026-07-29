import type { ActivityEvent, GameResult } from '@/domain/agent/journal.js';
import {
  describeEvent,
  describeGameOutcome,
  eventBar,
  eventFacts,
  eventSentence,
  settled,
} from '@/domain/agent/journal.js';
import type { ThoughtEntry } from '@/domain/agent/thought.js';
import { clearedItsBar, describeOutcome, stoodDown } from '@/domain/agent/thought.js';
import type { AgentsPort } from '@/ports/agents.js';
import type { FailureCause } from '@/ports/failure.js';

export interface ReadAgentJournalRequest {
  readonly userId: string;
  readonly accessToken: string;
  readonly agentId: string;
  readonly limit?: number | undefined;
}

/** One thing the agent did, with the readings a surface would otherwise derive. */
export interface Happening {
  readonly event: ActivityEvent;
  /** Copy where this product has it, the platform's own name where it does not. */
  readonly kind: string;
  /** The platform's own sentence, where it wrote one rather than a code. */
  readonly sentence: string | null;
  readonly bar: { readonly confidence: number; readonly threshold: number } | null;
  readonly facts: ReadonlyArray<readonly [string, string]>;
}

/** One decision, mirroring `Decision` in `read-thought-log.query`. */
export interface Reasoning {
  readonly entry: ThoughtEntry;
  readonly outcome: string;
  readonly bar: ReturnType<typeof clearedItsBar>;
  readonly declined: boolean;
}

export interface Submission {
  readonly game: GameResult;
  /** False while the session is open. Never rendered as a score of zero. */
  readonly settled: boolean;
  /**
   * Copy where this product has it, the platform's own name where it does not.
   *
   * Null while the session is open. `WON`, `PLACED` and `NO_WIN` are what an
   * older account produced, and none of them can be inferred from the score:
   * one live row is `WON` at rank 1 with a payout of zero and a score of −177.
   */
  readonly outcome: string | null;
}

export type JournalReading =
  | {
      readonly kind: 'record';
      readonly happenings: readonly Happening[];
      readonly reasonings: readonly Reasoning[];
      readonly submissions: readonly Submission[];
    }
  | { readonly kind: 'none' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

export interface ReadAgentJournalResponse {
  readonly journal: JournalReading;
  /**
   * Whose record this is.
   *
   * Two records exist in this product and they answer different questions. The
   * journal answers "what did my agent think?"; the audit log answers "what did
   * *this product* do to my account?". Carrying the answer in the response,
   * rather than leaving the view to imply it, is what keeps the distinction from
   * eroding as surfaces are added.
   */
  readonly recordOf: 'agent';
  readonly heading: string;
}

/**
 * An agent's own record, read.
 *
 * The derivations happen here rather than in the page, for the two reasons
 * `ReadThoughtLogQuery` gives: `app/` may not import the domain, and a surface
 * that works a reading out for itself will one day work it out backwards.
 *
 * The three states are the port's, unchanged. What changed underneath is which
 * facts produce them — `empty` used to be reachable by the adapter looking for a
 * key the platform does not send, which made "your agent has done nothing" the
 * product's answer for every agent that ever existed.
 */
export class ReadAgentJournalQuery {
  constructor(private readonly agents: AgentsPort) {}

  async execute(req: ReadAgentJournalRequest): Promise<ReadAgentJournalResponse> {
    const result = await this.agents.readJournal(req);
    return {
      journal: read(result),
      recordOf: 'agent',
      heading: 'What this agent thought and did, as BattleGrid recorded it',
    };
  }
}

function read(result: Awaited<ReturnType<AgentsPort['readJournal']>>): JournalReading {
  if (result.kind === 'unreadable') {
    return { kind: 'unreadable', reason: result.reason, cause: result.cause };
  }
  if (result.kind === 'empty') return { kind: 'none' };

  const { record } = result;
  return {
    kind: 'record',
    happenings: record.activity.map((event) => ({
      event,
      kind: describeEvent(event.kind),
      sentence: eventSentence(event),
      bar: eventBar(event),
      facts: eventFacts(event),
    })),
    reasonings: record.thoughts.map((entry) => ({
      entry,
      outcome: describeOutcome(entry.outcome),
      bar: clearedItsBar(entry),
      declined: stoodDown(entry),
    })),
    submissions: record.games.map((game) => ({
      game,
      settled: settled(game),
      outcome: game.outcome === null ? null : describeGameOutcome(game.outcome),
    })),
  };
}
