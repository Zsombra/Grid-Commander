import type {
  ExplorerPort,
  FieldResult,
  FieldSort,
  FieldWindow,
  LeaderboardResult,
} from '@/ports/explorer.js';

export interface FieldView {
  readonly field: FieldResult;
  readonly leaderboard: LeaderboardResult;
  readonly timeframe: FieldWindow;
  readonly sortBy: FieldSort;
}

/**
 * Where this account stands, and against what.
 *
 * The two reads are kept apart rather than merged into one view model. They
 * answer at different granularities — the field ranks agents, the
 * leaderboard ranks owners — and they fail independently: a leaderboard the
 * platform will not answer must not blank the field, and an operator who
 * can see neither should be told which of the two failed.
 */
export class ReadFieldQuery {
  constructor(private readonly explorer: ExplorerPort) {}

  async execute(req: {
    userId: string;
    accessToken: string;
    timeframe: FieldWindow;
    sortBy: FieldSort;
    limit?: number | undefined;
  }): Promise<FieldView> {
    const [field, leaderboard] = await Promise.all([
      this.explorer.readField(req),
      // PROFIT is the metric the rest of the product is denominated in.
      // Volume and score rank participation, not judgement.
      this.explorer.readLeaderboard({
        userId: req.userId,
        accessToken: req.accessToken,
        metric: 'PROFIT',
        timeframe: req.timeframe,
        limit: 10,
      }),
    ]);
    return { field, leaderboard, timeframe: req.timeframe, sortBy: req.sortBy };
  }
}
