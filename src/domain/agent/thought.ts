/**
 * What an agent decided, and why.
 *
 * Every field here was read from a live account before it was typed. Three
 * defects this week came from modelling a declared schema instead of an
 * observed response, so `get_agent_thought_log` was called first and this was
 * written from what came back.
 */

export interface MarketSnapshot {
  /** The coin the agent was looking at. */
  readonly coinTicker: string;
  /** `UP` / `DOWN` observed; absent on some entries, so nullable rather than an enum. */
  readonly thesisDirection: string | null;
  readonly primaryTimeframe: string | null;
}

export interface ThoughtEntry {
  readonly id: string;
  readonly at: Date;
  readonly agentId: string;
  /** The agent's own prose. ~500 characters on the entries observed. */
  readonly reasoning: string;
  readonly snapshot: MarketSnapshot | null;
  /**
   * Both, or neither useful.
   *
   * A confidence of 0.35 says nothing alone; against a threshold of 0.35 it
   * says the agent was exactly at its own bar, and against 0.7 that it was well
   * under. What *followed* is `outcome`, and the two are adjacent rather than
   * causal — see the note above `stoodDown`.
   *
   * Null when the platform recorded no threshold. Never defaulted: a bar nobody
   * set is not a bar of zero, and every `ERROR` entry observed had neither.
   */
  readonly confidence: number | null;
  readonly threshold: number | null;
  /** As the platform named it. Not narrowed to a union — see `OUTCOMES`. */
  readonly outcome: string;
}

/**
 * The outcomes this product has copy for, and the four observed live.
 *
 * **Deliberately not a closed union.** This repository has twice hard-coded a
 * set the platform had already grown past: the surface map listed four
 * position-management presets where the server returned five, and
 * `BRAIN_PRESETS` still lists ten where the schema pins eleven. There is no
 * tool that enumerates outcomes, so a list here can only ever be a snapshot.
 *
 * An outcome missing from this map is shown as the platform named it. A
 * reasoning log that silently drops what it does not understand is worse than
 * one that prints a name the reader can search for.
 */
export const OUTCOMES: Readonly<Record<string, string>> = {
  AGENT_TRADE_THESIS: 'Formed a thesis',
  SUBMITTED: 'Submitted a trade',
  SKIPPED_LOW_CONFIDENCE: 'Stood down — not confident enough',
  ERROR: 'Failed partway',
  // Two more, found by the journal fix rendering them as bare identifiers on a
  // live page — which is the open map working as intended rather than a miss.
  // Neither is the agent choosing: one had no money and one had no session, and
  // `stoodDown` stays narrow for exactly that reason.
  SKIPPED_INSUFFICIENT_FUNDS: 'Could not act — not enough funds',
  SKIPPED_SESSION_UNAVAILABLE: 'Could not act — no session was open',
  // From an older account. Also not a decision: the agent was stopped by its own
  // spending cap before it could reason. `COST_LIMIT_REACHED` is the matching
  // activity event, and it carries the figures.
  SKIPPED_COST_LIMIT: 'Could not act — spending limit reached',
};

/** Copy for an outcome, or the platform's own name when there is none. */
export function describeOutcome(outcome: string): string {
  return OUTCOMES[outcome] ?? outcome;
}

/** Whether this product recognises the outcome, as distinct from showing it. */
export function isKnownOutcome(outcome: string): boolean {
  return outcome in OUTCOMES;
}

export type BarVerdict =
  | { readonly kind: 'cleared'; readonly by: number }
  | { readonly kind: 'short'; readonly by: number }
  /** No threshold recorded. Not a failure, and not a bar of zero. */
  | { readonly kind: 'no-bar' };

/**
 * Did the agent's confidence clear the bar it had to clear?
 *
 * Stated rather than left as two numbers side by side. The reader who has to
 * subtract them will sometimes subtract them the wrong way round, and the
 * answer is the whole point of recording both.
 *
 * Equal counts as cleared, which is a choice rather than a measurement. The one
 * boundary entry observed — 0.35 against 0.35 — produced `AGENT_TRADE_THESIS`,
 * and theses form on both sides of the bar, so it settles nothing about how
 * BattleGrid gates. Reading `>=` as cleared is the convention most readers
 * expect from "met the threshold"; if the platform ever proves otherwise, this
 * is the line to change and the comment that says why it was a guess.
 */
export function clearedItsBar(entry: ThoughtEntry): BarVerdict {
  const { confidence, threshold } = entry;
  if (confidence === null || threshold === null) return { kind: 'no-bar' };
  const margin = round(confidence - threshold);
  return margin >= 0 ? { kind: 'cleared', by: margin } : { kind: 'short', by: round(-margin) };
}

/** Floating-point noise makes `0.7 - 0.35` print as `0.35000000000000003`. */
function round(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

/**
 * What the bar actually governs — measured, not assumed.
 *
 * Across fifty live entries:
 *
 * ```
 * SUBMITTED                cleared 10   short  0
 * SKIPPED_LOW_CONFIDENCE   cleared  0   short  3
 * AGENT_TRADE_THESIS       cleared 29   short  6
 * ERROR                    no bar recorded, and no reasoning written
 * ```
 *
 * So the threshold decides whether a thesis becomes a **submission**, not
 * whether a thesis forms. An agent reasons its way to a view first and is gated
 * afterwards — six of the theses observed sat below their own bar and were
 * still recorded.
 *
 * This matters for what a surface may say. "Cleared the bar, so it acted" is
 * wrong; the reading is "here is the confidence, here is the bar, and here is
 * what followed", with the three left adjacent rather than causally chained.
 * The measurement above replaced an assumption of mine that read the arrow
 * backwards.
 */

/**
 * A cycle in which the agent decided to do nothing.
 *
 * Derived from the outcome rather than from the absence of a trade, because
 * "no trade recorded" is also what an error looks like, and the two are not the
 * same thing to someone asking why their agent is quiet.
 */
export function stoodDown(entry: ThoughtEntry): boolean {
  return entry.outcome === 'SKIPPED_LOW_CONFIDENCE';
}

/**
 * Whether the platform records prose for this kind of cycle.
 *
 * `ERROR` entries carry none — the agent failed before it wrote anything, and
 * both such entries observed had an empty `reasoning` and no threshold. A
 * surface must not present that as an agent that thought nothing; it is an
 * agent that did not get to think.
 */
export function reasonedAtAll(entry: ThoughtEntry): boolean {
  return entry.reasoning.trim().length > 0;
}
