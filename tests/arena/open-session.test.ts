import { describe, expect, it } from 'vitest';
import { OpenGridSessionQuery } from '@/application/use-cases/open-grid-session.query.js';
import { ReadGameRulesQuery } from '@/application/use-cases/read-game-rules.query.js';
import { aGamePreset, aGridDetail, aGridSession, FakeMarketGridPort } from '../support/grid-fakes.js';

const who = { userId: 'u1', accessToken: 'at' };

describe('opening one session', () => {
  it('answers the schedule, the list row, the entered fact and the results state together', async () => {
    const grid = new FakeMarketGridPort();
    grid.stage(
      aGridSession({ id: 'ms-1', playersNeeded: 5 }),
      aGridDetail({ id: 'ms-1', status: 'PENDING' }),
    );
    grid.submitted.add('ms-1');

    const view = await new OpenGridSessionQuery(grid).execute({ ...who, sessionId: 'ms-1' });
    expect(view.sessionId).toBe('ms-1');
    expect(view.detail.kind === 'detail' && view.detail.detail.status).toBe('PENDING');
    // The session's own row off the list — the wider half of the overlap,
    // carrying what the detail never does.
    expect(view.summary.kind === 'summary' && view.summary.summary.playersNeeded).toBe(5);
    expect(view.entered).toEqual({ kind: 'submission', entered: true });
    expect(view.results).toEqual({ kind: 'not-settled' });
  });

  it('keeps the reads apart when the detail fails', async () => {
    /**
     * The property the arena had to learn the hard way, held here by
     * construction: a session whose schedule did not load still answers
     * whether this account entered it — and still carries its list row,
     * which is a different read of a different tool.
     */
    const grid = new FakeMarketGridPort();
    grid.stage(aGridSession({ id: 'ms-1' }));
    grid.unreadableDetail.add('ms-1');

    const view = await new OpenGridSessionQuery(grid).execute({ ...who, sessionId: 'ms-1' });
    expect(view.detail.kind).toBe('unreadable');
    expect(view.summary.kind).toBe('summary');
    expect(view.entered).toEqual({ kind: 'submission', entered: false });
  });

  it('keeps the reads apart when the list fails', async () => {
    // The mirror image: an unreadable list costs the list-only facts and
    // nothing else. The detail, the submission check and the results state
    // all still answer.
    const grid = new FakeMarketGridPort();
    grid.stage(aGridSession({ id: 'ms-1' }), aGridDetail({ id: 'ms-1', status: 'PENDING' }));
    grid.list = { kind: 'unreadable', reason: 'BattleGrid timed out', cause: 'unreachable' };

    const view = await new OpenGridSessionQuery(grid).execute({ ...who, sessionId: 'ms-1' });
    expect(view.summary).toEqual({
      kind: 'unreadable',
      reason: 'BattleGrid timed out',
      cause: 'unreachable',
    });
    expect(view.detail.kind).toBe('detail');
    expect(view.entered).toEqual({ kind: 'submission', entered: false });
    expect(view.results).toEqual({ kind: 'not-settled' });
  });

  it('names a session the list does not carry, rather than erring or saying nothing', async () => {
    // The list answered and this session was not among its rows — its own
    // state, distinct from an unreadable list. The arena lists the most
    // recent fifty; a session can outlive its row.
    const grid = new FakeMarketGridPort();
    grid.stage(aGridSession({ id: 'ms-other' }));
    grid.details.set('ms-9', aGridDetail({ id: 'ms-9' }));

    const view = await new OpenGridSessionQuery(grid).execute({ ...who, sessionId: 'ms-9' });
    expect(view.summary).toEqual({ kind: 'not-listed' });
    expect(view.detail.kind).toBe('detail');
  });

  it('asks for results even when the schedule could not be read', async () => {
    // Gating the question on the detail read would turn "the schedule did not
    // load" into "there are no results", which is a different claim.
    const grid = new FakeMarketGridPort();
    grid.stage(aGridSession({ id: 'ms-1' }));
    grid.unreadableDetail.add('ms-1');
    grid.outcome = { kind: 'settled', payloadUnmodelled: { leaderboard: [] } };

    const view = await new OpenGridSessionQuery(grid).execute({ ...who, sessionId: 'ms-1' });
    expect(view.results.kind).toBe('settled');
  });

  it('carries a settled payload without interpreting it', async () => {
    const grid = new FakeMarketGridPort();
    grid.stage(aGridSession({ id: 'ms-1' }), aGridDetail({ id: 'ms-1', status: 'SETTLED' }));
    grid.outcome = { kind: 'settled', payloadUnmodelled: { leaderboard: [], resolutions: [] } };

    const view = await new OpenGridSessionQuery(grid).execute({ ...who, sessionId: 'ms-1' });
    if (view.results.kind !== 'settled') throw new Error(view.results.kind);
    expect(Object.keys(view.results.payloadUnmodelled)).toEqual(['leaderboard', 'resolutions']);
  });
});

describe('reading the rulebook', () => {
  it('answers the presets the platform lists, whatever game they belong to', async () => {
    const grid = new FakeMarketGridPort();
    grid.rules = {
      kind: 'rules',
      presets: [aGamePreset(), aGamePreset({ id: 'p-2', name: 'COIN WARS', gameType: 'COIN_GRID' })],
    };
    const result = await new ReadGameRulesQuery(grid).execute(who);
    if (result.kind !== 'rules') throw new Error(result.kind);
    expect(result.presets.map((p) => p.gameType)).toEqual(['MARKET_GRID', 'COIN_GRID']);
    expect(result.presets[0]?.entryFee).toBe(10);
    expect(result.presets[0]?.coinsPerGame).toBe(9);
  });

  it('an unreadable rulebook stays unreadable — never a game with no price', async () => {
    const grid = new FakeMarketGridPort();
    grid.rules = { kind: 'unreadable', reason: 'BattleGrid timed out', cause: 'unreachable' };
    expect(await new ReadGameRulesQuery(grid).execute(who)).toEqual({
      kind: 'unreadable',
      reason: 'BattleGrid timed out',
      cause: 'unreachable',
    });
  });
});
