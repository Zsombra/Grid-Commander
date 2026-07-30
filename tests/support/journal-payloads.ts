/**
 * What `get_agent_journal` actually answers.
 *
 * Recorded from three live agents chosen to disagree with each other: one
 * active and trading, one archived having failed for want of funds, one created
 * and never run. The key names, the value *types*, and crucially which fields
 * come back `null` are exactly as the platform sent them.
 *
 * **Identifiers and prose are replaced; structure is not.** The repository is
 * public and this is one operator's account — so the UUIDs are invented, the
 * account name is invented, and the reasoning text is shortened. Nothing that
 * decides a mapping was touched: `recentActivity`, `recentGames`,
 * `recentThoughts`, `eventType`, `metadata`, `createdAt`, `submittedAt`,
 * `finalScore`, `outcome` are the platform's own names, and every `null` below
 * is a `null` the platform sent.
 *
 * The one message kept verbatim is the insufficient-funds sentence. It is the
 * single most useful thing BattleGrid says about an agent that is not trading,
 * the product showed none of it, and a paraphrase would not prove that the
 * sentence survives the mapper intact.
 */

/** An agent that is running: skipping on confidence, generating, auto-submitting. */
export const ACTIVE_JOURNAL = {
  username: 'anOperator',
  recentThoughts: [
    {
      id: '11111111-1111-4111-8111-111111111111',
      agentId: 'aaaaaaaa-1111-4111-8111-111111111111',
      userId: 'uuuuuuuu-1111-4111-8111-111111111111',
      marketGridSessionId: 'ssssssss-1111-4111-8111-111111111111',
      coinGridSessionId: null,
      outcome: 'SKIPPED_LOW_CONFIDENCE',
      marketSnapshot: { coinTicker: null, thesisDirection: null, primaryTimeframe: '1h' },
      reasoning: 'Market is risk-off; most top movers trade below VWAP.',
      confidenceScore: 0.68,
      confidenceScorePercent: 68,
      confidenceThreshold: 0.7,
      confidenceThresholdPercent: 70,
      usageEventId: 'eeeeeeee-1111-4111-8111-111111111111',
      createdAt: '2026-07-29T14:51:06.671Z',
    },
  ],
  recentActivity: [
    {
      id: 'dddddddd-1111-4111-8111-111111111111',
      agentId: 'aaaaaaaa-1111-4111-8111-111111111111',
      userId: 'uuuuuuuu-1111-4111-8111-111111111111',
      eventType: 'GRID_SKIPPED',
      marketGridSessionId: 'ssssssss-1111-4111-8111-111111111111',
      coinGridSessionId: null,
      thoughtLogId: null,
      // The code-plus-numbers shape.
      metadata: { reason: 'low_confidence', threshold: 0.7, confidence: 0.68 },
      createdAt: '2026-07-29T14:51:07.794Z',
    },
    {
      id: 'dddddddd-2222-4222-8222-222222222222',
      agentId: 'aaaaaaaa-1111-4111-8111-111111111111',
      userId: 'uuuuuuuu-1111-4111-8111-111111111111',
      eventType: 'GRID_GENERATED',
      marketGridSessionId: 'ssssssss-1111-4111-8111-111111111111',
      coinGridSessionId: null,
      thoughtLogId: null,
      // Observed empty. An event kind can carry no detail at all.
      metadata: {},
      createdAt: '2026-07-29T14:50:02.000Z',
    },
    {
      id: 'dddddddd-3333-4333-8333-333333333333',
      agentId: 'aaaaaaaa-1111-4111-8111-111111111111',
      userId: 'uuuuuuuu-1111-4111-8111-111111111111',
      eventType: 'AUTO_SUBMIT_TRIGGERED',
      marketGridSessionId: 'ssssssss-1111-4111-8111-111111111111',
      coinGridSessionId: null,
      thoughtLogId: null,
      // Nothing but the ids of the things the reader is already looking at.
      metadata: {
        agentId: 'aaaaaaaa-1111-4111-8111-111111111111',
        sessionId: 'ssssssss-1111-4111-8111-111111111111',
      },
      createdAt: '2026-07-29T14:49:00.000Z',
    },
  ],
  recentGames: [
    {
      playerId: 'pppppppp-1111-4111-8111-111111111111',
      thoughtLogId: '11111111-1111-4111-8111-111111111111',
      agentId: 'aaaaaaaa-1111-4111-8111-111111111111',
      gameType: 'MARKET_GRID',
      marketGridSessionId: 'ssssssss-1111-4111-8111-111111111111',
      confidenceScore: 0.72,
      confidenceScorePercent: 72,
      reasoning: 'Selected the nine coins with the largest absolute VWAP deviation.',
      cells: Array.from({ length: 9 }, (_, position) => ({
        position,
        coinId: 'BTC',
        prediction: 'UP',
        isCaptain: position === 0,
        isCorrect: null,
        basePoints: null,
        captainPoints: null,
        finalPoints: null,
        changePercent: null,
      })),
      submittedAt: '2026-07-29T06:51:46.381Z',
      // Every game observed on the account was pending. All eight of these were
      // null, and that is the fact the surface has to survive.
      finalScore: null,
      rank: null,
      poolPayout: null,
      jackpotPayout: null,
      totalPayout: null,
      isItm: false,
      accuracy: null,
      totalChangeCapture: null,
      netChangeCapture: null,
      captainChangePercent: null,
      ownerView: { provider: 'anthropic', modelId: 'a-model', costUsd: 0.01, durationMs: 1000 },
      outcome: null,
    },
  ],
};

/** Archived, and it never traded. The reason is in the activity log and nowhere else. */
export const STARVED_JOURNAL = {
  username: 'anOperator',
  recentThoughts: [],
  recentActivity: [
    {
      id: 'dddddddd-4444-4444-8444-444444444444',
      agentId: 'aaaaaaaa-2222-4222-8222-222222222222',
      userId: 'uuuuuuuu-1111-4111-8111-111111111111',
      eventType: 'INSUFFICIENT_FUNDS',
      marketGridSessionId: null,
      coinGridSessionId: null,
      thoughtLogId: null,
      // Verbatim. A finished English sentence under the same key that elsewhere
      // holds a machine code — which is why `eventSentence` has to tell them apart.
      metadata: {
        reason:
          'Insufficient balance. Required: $10, Available: $0. Deposit USDC to your HyperLiquid perps account.',
      },
      createdAt: '2026-07-28T09:00:00.000Z',
    },
    {
      id: 'dddddddd-5555-4555-8555-555555555555',
      agentId: 'aaaaaaaa-2222-4222-8222-222222222222',
      userId: 'uuuuuuuu-1111-4111-8111-111111111111',
      eventType: 'GRID_SKIPPED',
      marketGridSessionId: null,
      coinGridSessionId: null,
      thoughtLogId: null,
      metadata: { reason: 'Agent aaaaaaaa-2222-4222-8222-222222222222 is halted — new wagers are blocked.' },
      createdAt: '2026-07-28T08:00:00.000Z',
    },
  ],
  recentGames: [],
};

/** Created, never run. One event, and the two facts that say what it is. */
export const NEWBORN_JOURNAL = {
  username: 'anOperator',
  recentThoughts: [],
  recentActivity: [
    {
      id: 'dddddddd-6666-4666-8666-666666666666',
      agentId: 'aaaaaaaa-3333-4333-8333-333333333333',
      userId: 'uuuuuuuu-1111-4111-8111-111111111111',
      eventType: 'AGENT_CREATED',
      marketGridSessionId: null,
      coinGridSessionId: null,
      thoughtLogId: null,
      metadata: { strategyName: 'Stalingrad', modelDisplayName: 'Grok 4' },
      createdAt: '2026-07-29T13:15:00.000Z',
    },
  ],
  recentGames: [],
};

/** The four keys the live tool returns, and no others. */
export const OBSERVED_TOP_LEVEL_KEYS = [
  'recentActivity',
  'recentGames',
  'recentThoughts',
  'username',
] as const;

/**
 * Names the old mapper looked for, none of which the platform sends.
 *
 * Kept so a test can assert they are absent. `entries` was the one that made
 * every agent's journal read "has not recorded anything yet" for the life of
 * the page; the rest were invented in the same breath.
 */
export const KEYS_THE_PLATFORM_DOES_NOT_SEND = [
  'entries',
  'journal',
  'at',
  'type',
  'kind',
  'summary',
  'title',
  'detail',
] as const;
