import type { FailureCause } from '@/ports/failure.js';
import type {
  GridDetailResult,
  GridResultsOutcome,
  GridSessionSummary,
  GridSubmissionResult,
  MarketGridPort,
} from '@/ports/market-grid.js';

/**
 * One session, opened.
 *
 * Four reads, kept apart rather than merged into one view model — the same
 * shape `ReadFieldQuery` uses, and for the same reason: they answer different
 * questions, they fail independently, and a reader who can see none of them
 * should be told which one failed.
 *
 * The submission check and the results read live here rather than in the
 * arena's fan-out because they are per-session reads, and the arena lists
 * fifty sessions. The *list* read is the opposite case: the arena already
 * makes it once, and this page makes it once more for the session it is
 * about, because the two payloads overlap and neither contains the other
 * (measured live 2026-08-06) — the list alone carries the players still
 * needed, the host, and how the money is split.
 */
export interface GridSessionView {
  readonly sessionId: string;
  readonly detail: GridDetailResult;
  /**
   * This session's own row off the list — the wider half of the overlap.
   * `not-listed` is its own named state: the list answered and this session
   * was not among its rows, which is not an error and must not be rendered
   * as one, or as silently nothing.
   */
  readonly summary: GridSummaryOutcome;
  /**
   * Whether this account entered — from the submission check alone. The
   * player-grid tool answers a 500 for "you have not played" (established
   * live 2026-08-01), so it is not called here or anywhere.
   */
  readonly entered: GridSubmissionResult;
  readonly results: GridResultsOutcome;
}

export type GridSummaryOutcome =
  | { readonly kind: 'summary'; readonly summary: GridSessionSummary }
  | { readonly kind: 'not-listed' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

export class OpenGridSessionQuery {
  constructor(private readonly grid: MarketGridPort) {}

  async execute(req: {
    userId: string;
    accessToken: string;
    sessionId: string;
  }): Promise<GridSessionView> {
    const [detail, listed, entered, results] = await Promise.all([
      this.grid.sessionDetail(req),
      // The whole list, not a per-id read: there is no tool that answers one
      // list row, and inventing a port method for it would be a second way to
      // ask a question the list already answers. The row is found by id below
      // — the adapter has already normalised the list's `sessionId` and the
      // detail's `id` to one name, so the rename does not reach this layer.
      this.grid.listSessions(req),
      this.grid.hasSubmitted(req),
      // Asked unconditionally rather than only when the detail says SETTLED:
      // the platform's own refusal *is* the not-settled state, and gating the
      // question on a read that can fail would turn "the schedule did not
      // load" into "there are no results", which is a different claim.
      this.grid.results(req),
    ]);

    const row =
      listed.kind === 'sessions'
        ? listed.sessions.find((s) => s.id === req.sessionId)
        : undefined;
    const summary: GridSummaryOutcome =
      listed.kind === 'unreadable'
        ? listed
        : row
          ? { kind: 'summary', summary: row }
          : { kind: 'not-listed' };

    return { sessionId: req.sessionId, detail, summary, entered, results };
  }
}
