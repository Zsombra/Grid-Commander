/**
 * What has been stopping an agent, and whether it is still stopping it.
 *
 * The platform records every block as its own row. Read as a list, the
 * ninety-eighth occurrence of one reason looks exactly like the first — which
 * is how an agent can sit unable to trade for a week while the surface reports
 * normally. Observed 2026-08-06: **371 blocks across five agents**, almost all
 * of them one of a handful of reasons repeating.
 *
 * So the rows are folded into reasons. The fold is derived **entirely from the
 * rows the platform returned** — no table of which codes this product believes
 * are permanent, because such a table is a guess that goes stale silently, and
 * `AGENT_APPROVAL_EXPIRED` (the commonest block on the account, 98× on one
 * agent) is a code whose meaning is not even settled.
 *
 * The domain declares the input structurally rather than importing the port's
 * `GateBlock`. Ports already import domain types; importing back would close a
 * cycle for no gain, and the fold needs four fields.
 */

/** The minimum a block must carry to be folded. Structurally a `GateBlock`. */
export interface BlockRow {
  readonly coinTicker: string | null;
  readonly gateStage: string;
  readonly reasonCode: string;
  readonly reasonDetail: Readonly<Record<string, unknown>>;
  readonly at: string | null;
}

/** One reason, and everything the window says about it. */
export interface BlockReason {
  readonly reasonCode: string;
  /** `ACCOUNT` or `TOKEN` — whether it is about the account or one market. */
  readonly gateStage: string;
  readonly count: number;
  /** Oldest and newest occurrence **within the window read**, not ever. */
  readonly firstAt: string | null;
  readonly lastAt: string | null;
  /**
   * The first non-empty detail seen for this reason.
   *
   * Non-empty rather than newest: `AGENT_APPROVAL_EXPIRED` sends `{}` on every
   * occurrence, and a reason that sometimes carries figures should show them.
   * Empty here means the platform attached nothing to any of them, which is a
   * finding rather than a gap to fill.
   */
  readonly detail: Readonly<Record<string, unknown>>;
  /** Markets this reason hit. Empty when it was account-wide. */
  readonly coinTickers: readonly string[];
}

/**
 * Rows the platform refused to serve while this summary was being assembled.
 *
 * Not the same as rows that were never asked for. `total` already admits the
 * window; this admits a **hole inside** it. The distinction matters because
 * the refusals cluster at the head of the history (#100), so the rows missing
 * from a summary assembled around them are the newest ones — and this surface
 * answers *what is stopping this agent now*.
 */
export interface RefusedRows {
  /** How many windows the platform declined. */
  readonly windows: number;
  /**
   * How many rows those windows span.
   *
   * The size of the gap, not a count of rows known to exist: the windows are
   * a fixed size and the platform may have had fewer rows to put in one. It is
   * an upper bound, and the surface words it as one.
   */
  readonly rows: number;
}

export interface BlockSummary {
  /** Most frequent first; ties broken by most recent. */
  readonly reasons: readonly BlockReason[];
  /** How many rows this summary actually folded. */
  readonly readCount: number;
  /**
   * What the platform says exists, when it said.
   *
   * Carried so the surface can admit its window. A summary over the most
   * recent 100 of 118 that presents itself as the agent's whole history is the
   * silent-truncation failure this repository keeps writing tests against.
   */
  readonly total: number | null;
  /**
   * The newest occurrence anywhere in the rows folded.
   *
   * `total` says how big the window was; this says **where it ends**. A count
   * over a window that stops eighteen hours ago, rendered without that fact,
   * reads as current. Null when no row carried a timestamp at all.
   */
  readonly windowEndsAt: string | null;
  /**
   * Null when the platform served the history whole.
   *
   * Deliberately not optional: a fold that can omit this field is a fold that
   * can report a partial summary as a complete one, which is the failure the
   * whole change exists to prevent.
   */
  readonly refused: RefusedRows | null;
}

/**
 * Fold blocks into reasons.
 *
 * Order within a reason is not assumed: the platform returns newest first
 * today, and `firstAt`/`lastAt` are computed by comparing timestamps rather
 * than by taking the ends of the array. A list that arrived in a different
 * order would otherwise report a window backwards.
 */
export function summariseBlocks(
  rows: readonly BlockRow[],
  total: number | null,
  refused: RefusedRows | null,
): BlockSummary {
  const byReason = new Map<string, {
    reasonCode: string;
    gateStage: string;
    count: number;
    firstAt: string | null;
    lastAt: string | null;
    detail: Readonly<Record<string, unknown>>;
    coins: Set<string>;
  }>();

  for (const row of rows) {
    const found = byReason.get(row.reasonCode);
    const entry = found ?? {
      reasonCode: row.reasonCode,
      gateStage: row.gateStage,
      count: 0,
      firstAt: null,
      lastAt: null,
      detail: {},
      coins: new Set<string>(),
    };
    entry.count += 1;
    if (row.at !== null) {
      if (entry.firstAt === null || row.at < entry.firstAt) entry.firstAt = row.at;
      if (entry.lastAt === null || row.at > entry.lastAt) entry.lastAt = row.at;
    }
    // First non-empty wins, so a reason that carries figures on some rows and
    // not others still shows them.
    if (Object.keys(entry.detail).length === 0 && Object.keys(row.reasonDetail).length > 0) {
      entry.detail = row.reasonDetail;
    }
    if (row.coinTicker !== null) entry.coins.add(row.coinTicker);
    if (!found) byReason.set(row.reasonCode, entry);
  }

  const reasons = [...byReason.values()]
    .map((e) => ({
      reasonCode: e.reasonCode,
      gateStage: e.gateStage,
      count: e.count,
      firstAt: e.firstAt,
      lastAt: e.lastAt,
      detail: e.detail,
      coinTickers: [...e.coins],
    }))
    .sort((a, b) => b.count - a.count || (b.lastAt ?? '').localeCompare(a.lastAt ?? ''));

  // Computed by comparison, like the per-reason window above, so a list that
  // arrived oldest-first still reports the end of the window and not its start.
  let windowEndsAt: string | null = null;
  for (const row of rows) {
    if (row.at !== null && (windowEndsAt === null || row.at > windowEndsAt)) windowEndsAt = row.at;
  }

  return { reasons, readCount: rows.length, total, windowEndsAt, refused };
}

/**
 * Whether a reason has happened more than once in the window read.
 *
 * The whole distinction this module exists for, and deliberately the dumbest
 * possible rule: **it repeated**. Not "we classified this code as structural" —
 * that would be this product asserting something about the platform's
 * vocabulary, and the evidence for repetition is already in hand.
 */
export function isStanding(reason: BlockReason): boolean {
  return reason.count > 1;
}
