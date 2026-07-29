import { describe, expect, it } from 'vitest';
import { mapRecord } from '@/infrastructure/battlegrid/agent-mapper.js';
import {
  describeEvent,
  eventBar,
  eventFacts,
  eventSentence,
  isSilent,
  settled,
} from '@/domain/agent/journal.js';
import {
  ACTIVE_JOURNAL,
  KEYS_THE_PLATFORM_DOES_NOT_SEND,
  NEWBORN_JOURNAL,
  OBSERVED_TOP_LEVEL_KEYS,
  STARVED_JOURNAL,
} from '../support/journal-payloads.js';

/**
 * The mapper, against what the platform actually answers.
 *
 * This did not exist, and that is the whole defect. `readJournal` read
 * `payload['entries'] ?? payload['journal']` — the response carries neither, so
 * the lookup missed, `Array.isArray(undefined)` was false, and the method
 * returned `empty`. Every agent's journal said the agent had recorded nothing,
 * on every account, for the life of the page.
 *
 * `tests/agent/journal.test.ts` covered that path and could not see it: its fake
 * returns whatever the test assigns, so it proved the query forwards a value it
 * was handed. The mapper — the only place the defect lived — was untested.
 *
 * So this file starts from a recorded payload. A test that starts from a fake's
 * return value can only ever prove the code agrees with itself.
 */
describe('an agent record is read from what BattleGrid sends', () => {
  it('finds activity where the platform puts it', () => {
    const record = mapRecord(ACTIVE_JOURNAL);
    expect(record.activity).toHaveLength(3);
    expect(record.thoughts).toHaveLength(1);
    expect(record.games).toHaveLength(1);
    expect(isSilent(record)).toBe(false);
  });

  /**
   * The regression, stated as the sentence a user saw.
   *
   * Re-injecting `payload['entries'] ?? payload['journal']` makes this fail:
   * both are undefined, every list is empty, and `isSilent` is true — which is
   * what the adapter turns into "has not recorded anything yet".
   */
  it('does not report a busy agent as silent', () => {
    for (const payload of [ACTIVE_JOURNAL, STARVED_JOURNAL, NEWBORN_JOURNAL]) {
      expect(isSilent(mapRecord(payload)), JSON.stringify(payload.username)).toBe(false);
    }
  });

  it('reads an event kind and its time', () => {
    const [skipped] = mapRecord(ACTIVE_JOURNAL).activity;
    expect(skipped?.kind).toBe('GRID_SKIPPED');
    expect(skipped?.at.toISOString()).toBe('2026-07-29T14:51:07.794Z');
  });

  it('carries detail whole rather than picking fields at the boundary', () => {
    const [skipped] = mapRecord(ACTIVE_JOURNAL).activity;
    // One kind, two observed shapes. A mapper that typed `metadata` to the first
    // would drop the second — which is the more urgent of the two.
    expect(skipped?.detail).toEqual({ reason: 'low_confidence', threshold: 0.7, confidence: 0.68 });
    const [starved] = mapRecord(STARVED_JOURNAL).activity;
    expect(Object.keys(starved?.detail ?? {})).toEqual(['reason']);
  });

  it('reads a thought through the same mapper the decision log uses', () => {
    const [thought] = mapRecord(ACTIVE_JOURNAL).thoughts;
    expect(thought?.outcome).toBe('SKIPPED_LOW_CONFIDENCE');
    expect(thought?.confidence).toBe(0.68);
    expect(thought?.threshold).toBe(0.7);
  });

  it('counts a submission’s picks and keeps its nulls', () => {
    const [game] = mapRecord(ACTIVE_JOURNAL).games;
    expect(game?.picks).toBe(9);
    expect(game?.score).toBeNull();
    expect(game?.outcome).toBeNull();
    expect(settled(game!)).toBe(false);
  });

  it('survives a payload with nothing in it', () => {
    const empty = mapRecord({ username: 'x', recentThoughts: [], recentActivity: [], recentGames: [] });
    expect(isSilent(empty)).toBe(true);
    // And a payload that is not an object at all, which is what a failed parse
    // upstream would hand it.
    expect(isSilent(mapRecord(null))).toBe(true);
    expect(isSilent(mapRecord('nonsense'))).toBe(true);
  });
});

/**
 * The fixture is the observed shape, and a future edit must not "fix" it.
 *
 * Without this, someone repairing a failing test by editing the payload to
 * match a wrong mapper would turn both green and leave the product broken —
 * which is precisely how a mapper written from imagination passed review in the
 * first place.
 */
describe('the recorded payload is what the platform sends', () => {
  it('carries the keys the live tool returned, and no others', () => {
    for (const payload of [ACTIVE_JOURNAL, STARVED_JOURNAL, NEWBORN_JOURNAL]) {
      expect(Object.keys(payload).sort()).toEqual([...OBSERVED_TOP_LEVEL_KEYS]);
    }
  });

  it('carries none of the keys the old mapper looked for', () => {
    const text = JSON.stringify([ACTIVE_JOURNAL, STARVED_JOURNAL, NEWBORN_JOURNAL]);
    for (const invented of KEYS_THE_PLATFORM_DOES_NOT_SEND) {
      expect(text, `"${invented}" is not a key BattleGrid sends`).not.toContain(`"${invented}":`);
    }
  });

  it('keeps a game’s outcome fields null, because none observed had settled', () => {
    const [game] = ACTIVE_JOURNAL.recentGames;
    for (const field of ['finalScore', 'rank', 'poolPayout', 'totalPayout', 'accuracy', 'outcome'] as const) {
      expect(game?.[field], `${field} was null on every game observed`).toBeNull();
    }
  });
});

describe('an event says what it can, and no more', () => {
  it('shows the platform’s sentence when it wrote one', () => {
    const [starved] = mapRecord(STARVED_JOURNAL).activity;
    expect(eventSentence(starved!)).toContain('Deposit USDC');
  });

  it('does not print a machine code as prose', () => {
    const [skipped] = mapRecord(ACTIVE_JOURNAL).activity;
    // `low_confidence` is a token; the numbers beside it say the same thing better.
    expect(eventSentence(skipped!)).toBeNull();
    expect(eventBar(skipped!)).toEqual({ confidence: 0.68, threshold: 0.7 });
  });

  it('reads no bar where the platform attached none', () => {
    const [starved] = mapRecord(STARVED_JOURNAL).activity;
    expect(eventBar(starved!)).toBeNull();
  });

  it('passes through facts no other reader took', () => {
    const [created] = mapRecord(NEWBORN_JOURNAL).activity;
    expect(eventFacts(created!)).toEqual([
      ['Strategy', 'Stalingrad'],
      ['Model', 'Grok 4'],
    ]);
  });

  it('drops the ids of the thing the reader is already looking at', () => {
    const submit = mapRecord(ACTIVE_JOURNAL).activity[2];
    expect(submit?.kind).toBe('AUTO_SUBMIT_TRIGGERED');
    expect(eventFacts(submit!)).toEqual([]);
  });

  /**
   * Open, like `OUTCOMES`. This repository has twice hard-coded a set the
   * platform had already grown past, and a reasoning log that silently drops
   * what it does not understand is worse than one that prints a name.
   */
  it('names an unknown kind as the platform named it', () => {
    expect(describeEvent('GRID_SKIPPED')).toBe('Skipped a round');
    expect(describeEvent('SOMETHING_ADDED_NEXT_QUARTER')).toBe('SOMETHING_ADDED_NEXT_QUARTER');
  });

  it('shows an unknown kind’s detail rather than dropping it', () => {
    const unknown = mapRecord({
      recentActivity: [
        { id: 'x', eventType: 'NEW_KIND', createdAt: '2026-07-29T00:00:00.000Z', metadata: { note: 'kept' } },
      ],
    }).activity[0];
    // A field with no copy still reads as a phrase, not a symbol.
    expect(eventFacts(unknown!)).toEqual([['Note', 'kept']]);
  });
});
