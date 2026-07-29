/**
 * An agent's own record: what it did, what it thought, and how it went.
 *
 * Three parts because BattleGrid keeps three, under three names, in one
 * response. The product read none of them: the adapter looked for `entries`,
 * found nothing, and told every user that every agent had recorded nothing —
 * for as long as the page has existed.
 *
 * So every field below was read off a live account first, across three agents
 * chosen to disagree with each other: one active and trading, one archived
 * having failed for want of funds, one created and never run. A field that
 * appeared in none of them is not here.
 */

import type { ThoughtEntry } from './thought.js';

/**
 * Something the agent did, as the platform logged it.
 *
 * This is the part an operator comes for. "Why is my agent quiet" is answered
 * here and nowhere else in the product — the thought log says what it reasoned,
 * and this says what happened next.
 */
export interface ActivityEvent {
  readonly id: string;
  readonly at: Date;
  /** As the platform named it. Not narrowed — see `EVENTS`. */
  readonly kind: string;
  /**
   * Whatever the platform attached, unread.
   *
   * **Deliberately not a typed union.** The shape differs per `kind`, and
   * `GRID_SKIPPED` alone was observed carrying two: `{reason, threshold,
   * confidence}` when an agent stood down on confidence, and `{reason}` with
   * English prose when it was halted. A type that fitted the first would have
   * dropped the second — which is the more urgent of the two.
   */
  readonly detail: Readonly<Record<string, unknown>>;
}

/**
 * A submission, and what became of it.
 *
 * `score` is null while the session is open. Every one of the ten games
 * observed was pending, so what a *settled* game reads like is not established
 * here and nothing about it is guessed: `outcome` carries the platform's own
 * string when there is one, exactly as a thought's outcome does.
 */
export interface GameResult {
  readonly at: Date;
  readonly gameType: string;
  readonly confidence: number | null;
  readonly reasoning: string;
  /** How many cells were picked. The picks themselves belong to the grid view. */
  readonly picks: number;
  readonly score: number | null;
  readonly rank: number | null;
  readonly payoutUsd: number | null;
  readonly outcome: string | null;
}

export interface AgentRecord {
  readonly activity: readonly ActivityEvent[];
  readonly thoughts: readonly ThoughtEntry[];
  readonly games: readonly GameResult[];
}

/** Nothing in any of the three. Distinct from unreadable — see `JournalResult`. */
export function isSilent(record: AgentRecord): boolean {
  return (
    record.activity.length === 0 && record.thoughts.length === 0 && record.games.length === 0
  );
}

/**
 * The event kinds this product has copy for, and the six observed live.
 *
 * **Open, like `OUTCOMES`.** There is no tool that enumerates event kinds, so a
 * closed union here could only ever be a snapshot of one afternoon's account —
 * and this repository has shipped that mistake twice already. An unrecognised
 * kind is shown under the platform's own name, which a reader can at least
 * search for.
 */
export const EVENTS: Readonly<Record<string, string>> = {
  AGENT_CREATED: 'Created',
  GRID_GENERATED: 'Built a grid',
  GRID_SUBMITTED: 'Submitted a grid',
  AUTO_SUBMIT_TRIGGERED: 'Submitted automatically',
  GRID_SKIPPED: 'Skipped a round',
  INSUFFICIENT_FUNDS: 'Not enough funds',
  SESSION_SETTLED: 'Session settled',
  SUMMARY_GENERATED: 'Wrote a summary',
};

export function describeEvent(kind: string): string {
  return EVENTS[kind] ?? kind;
}

export function isKnownEvent(kind: string): boolean {
  return kind in EVENTS;
}

/**
 * The platform's own sentence about an event, where it wrote one.
 *
 * `reason` is the field it uses, and it holds two different things: a code
 * (`low_confidence`) when the detail is elsewhere in the same object, and a
 * finished English sentence when it is not —
 *
 *     "Insufficient balance. Required: $10, Available: $0. Deposit USDC to
 *      your HyperLiquid perps account."
 *
 * That sentence is the most useful text BattleGrid produces about an agent, and
 * it is why this function exists rather than the surface reading `detail.reason`
 * itself. A code is not shown as prose: it reads as a stray identifier, and the
 * numbers beside it say the same thing better.
 */
export function eventSentence(event: ActivityEvent): string | null {
  const reason = event.detail['reason'];
  if (typeof reason !== 'string' || reason.length === 0) return null;
  return isCode(reason) ? null : reason;
}

/** `low_confidence` is a machine token; the sentence above is not. */
function isCode(reason: string): boolean {
  return /^[a-z0-9]+(_[a-z0-9]+)*$/.test(reason);
}

/**
 * A confidence reading attached to an event, where the platform attached one.
 *
 * `GRID_SKIPPED` carries `{confidence, threshold}` alongside its code, which is
 * the same pairing `clearedItsBar` reads on a thought. Returned as a pair or not
 * at all: a confidence without its bar says nothing, which is the reason that
 * function exists.
 */
export function eventBar(event: ActivityEvent): { confidence: number; threshold: number } | null {
  const confidence = event.detail['confidence'];
  const threshold = event.detail['threshold'];
  if (typeof confidence !== 'number' || typeof threshold !== 'number') return null;
  return { confidence, threshold };
}

/**
 * Detail worth showing that the two readers above did not take.
 *
 * `AGENT_CREATED` carries `{strategyName, modelDisplayName}` — the two facts
 * that answer "what is this thing" — and nothing else in this product shows
 * them next to a date. Rather than enumerate the kinds and guess at the next
 * one, whatever is left after the known readers is passed through as pairs.
 *
 * `agentId` and `sessionId` are dropped: they identify the row the reader is
 * already looking at, and a page of UUIDs buries the sentence beside it.
 */
const READ_ELSEWHERE = new Set(['reason', 'confidence', 'threshold', 'agentId', 'sessionId']);

/**
 * Copy for the detail fields observed, and a readable fallback for the rest.
 *
 * The fallback is the point. Enumerating every field would make an unlisted one
 * render as `modelDisplayName` beside its value, which is a debug dump on a page
 * someone reads to understand their agent — and the platform will add fields.
 * Splitting the camel case is not copy, but it is a phrase rather than a symbol.
 */
const FACT_LABELS: Readonly<Record<string, string>> = {
  strategyName: 'Strategy',
  modelDisplayName: 'Model',
  picksCount: 'Picks',
  score: 'Score',
  rank: 'Rank',
};

export function describeFact(key: string): string {
  const known = FACT_LABELS[key];
  if (known !== undefined) return known;
  const words = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function eventFacts(event: ActivityEvent): ReadonlyArray<readonly [string, string]> {
  return Object.entries(event.detail)
    .filter(([key, value]) => !READ_ELSEWHERE.has(key) && value !== null && value !== undefined)
    .map(
      ([key, value]) =>
        [describeFact(key), typeof value === 'string' ? value : JSON.stringify(value)] as const,
    );
}

/**
 * Has this submission been scored?
 *
 * A pending game reports `finalScore: null`, and every game observed was
 * pending. Rendering that as `0` would show a submission that has not been
 * judged as one that scored nothing — the same defect as a gauge with no
 * ceiling reading "0 remaining", and wrong in the same direction: it looks like
 * a result.
 */
export function settled(game: GameResult): boolean {
  return game.score !== null;
}
