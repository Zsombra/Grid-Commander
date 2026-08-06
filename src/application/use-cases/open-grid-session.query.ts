import type {
  GridDetailResult,
  GridResultsOutcome,
  GridSubmissionResult,
  MarketGridPort,
} from '@/ports/market-grid.js';

/**
 * One session, opened.
 *
 * Three reads, kept apart rather than merged into one view model — the same
 * shape `ReadFieldQuery` uses, and for the same reason: they answer different
 * questions, they fail independently, and a reader who can see none of them
 * should be told which one failed.
 *
 * They live here rather than in the arena's fan-out because results are a
 * per-session read, and the arena lists fifty sessions. A third call per row
 * is how the page that already hit a rate limit would hit it again.
 */
export interface GridSessionView {
  readonly sessionId: string;
  readonly detail: GridDetailResult;
  /**
   * Whether this account entered — from the submission check alone. The
   * player-grid tool answers a 500 for "you have not played" (established
   * live 2026-08-01), so it is not called here or anywhere.
   */
  readonly entered: GridSubmissionResult;
  readonly results: GridResultsOutcome;
}

export class OpenGridSessionQuery {
  constructor(private readonly grid: MarketGridPort) {}

  async execute(req: {
    userId: string;
    accessToken: string;
    sessionId: string;
  }): Promise<GridSessionView> {
    const [detail, entered, results] = await Promise.all([
      this.grid.sessionDetail(req),
      this.grid.hasSubmitted(req),
      // Asked unconditionally rather than only when the detail says SETTLED:
      // the platform's own refusal *is* the not-settled state, and gating the
      // question on a read that can fail would turn "the schedule did not
      // load" into "there are no results", which is a different claim.
      this.grid.results(req),
    ]);
    return { sessionId: req.sessionId, detail, entered, results };
  }
}
