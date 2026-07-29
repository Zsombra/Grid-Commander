import { describe, expect, it } from 'vitest';
import { ReadThoughtLogQuery } from '@/application/use-cases/read-thought-log.query.js';
import {
  clearedItsBar,
  describeOutcome,
  isKnownOutcome,
  OUTCOMES,
  reasonedAtAll,
  stoodDown,
} from '@/domain/agent/thought.js';
import { mapThought } from '@/infrastructure/battlegrid/agent-mapper.js';
import { aThought, FakeAgentsPort } from '../support/agent-fakes.js';

/**
 * Reading an agent's reasoning.
 *
 * Everything asserted here was observed on a live account before it was typed:
 * 340 entries, four outcomes, and one entry whose confidence exactly equalled
 * its threshold. Three defects this week came from modelling a declared schema
 * instead of an observed response.
 */

const who = { userId: 'u1', accessToken: 'at' };

describe('confidence against the bar it had to clear', () => {
  it('states that the bar was cleared rather than leaving two numbers', () => {
    const bar = clearedItsBar(aThought({ confidence: 0.7, threshold: 0.35 }));
    expect(bar.kind).toBe('cleared');
    expect(bar.kind === 'cleared' && bar.by).toBe(0.35);
  });

  it('treats equal as cleared, because the platform does', () => {
    // The entry observed at exactly 0.35 against a 0.35 threshold produced
    // AGENT_TRADE_THESIS, so the boundary passes.
    expect(clearedItsBar(aThought({ confidence: 0.35, threshold: 0.35 })).kind).toBe('cleared');
  });

  it('says how far short, not just that it fell short', () => {
    const bar = clearedItsBar(aThought({ confidence: 0.2, threshold: 0.35 }));
    expect(bar.kind).toBe('short');
    expect(bar.kind === 'short' && bar.by).toBe(0.15);
  });

  it('does not invent a bar that was never recorded', () => {
    // A threshold nobody set is not a threshold of zero — that would report
    // every unmeasured decision as comfortably cleared.
    expect(clearedItsBar(aThought({ threshold: null })).kind).toBe('no-bar');
    expect(clearedItsBar(aThought({ confidence: null })).kind).toBe('no-bar');
  });

  it('does not leak floating-point noise into the margin', () => {
    // 0.7 - 0.35 is 0.35000000000000003 in IEEE 754.
    const bar = clearedItsBar(aThought({ confidence: 0.7, threshold: 0.35 }));
    expect(String(bar.kind === 'cleared' && bar.by)).toBe('0.35');
  });
});

describe('an outcome the platform adds is shown, not dropped', () => {
  it('has copy for the four observed live', () => {
    for (const outcome of ['AGENT_TRADE_THESIS', 'SUBMITTED', 'SKIPPED_LOW_CONFIDENCE', 'ERROR']) {
      expect(OUTCOMES[outcome], `${outcome} was observed on the account`).toBeTruthy();
    }
  });

  it('shows an unknown outcome as the platform named it', () => {
    // Twice now this repo has hard-coded a set the platform had already grown
    // past. There is no tool that enumerates outcomes, so this list can only
    // ever be a snapshot.
    expect(describeOutcome('SOMETHING_NEW_2027')).toBe('SOMETHING_NEW_2027');
  });

  it('keeps recognised and merely-displayable apart', () => {
    expect(isKnownOutcome('SUBMITTED')).toBe(true);
    expect(isKnownOutcome('SOMETHING_NEW_2027')).toBe(false);
  });

  it('identifies standing down by outcome, not by absence of a trade', () => {
    // "No trade recorded" is also what an error looks like, and the two are not
    // the same thing to someone asking why their agent is quiet.
    expect(stoodDown(aThought({ outcome: 'SKIPPED_LOW_CONFIDENCE' }))).toBe(true);
    expect(stoodDown(aThought({ outcome: 'ERROR' }))).toBe(false);
    expect(stoodDown(aThought({ outcome: 'SUBMITTED' }))).toBe(false);
  });
});

describe('mapping what the server actually returns', () => {
  const live = {
    id: 'tl_1',
    agentId: 'a1',
    createdAt: '2026-07-29T13:56:33.385Z',
    reasoning: 'LDO is trading below VWAP…',
    confidenceScore: 0.35,
    confidenceScorePercent: 35,
    confidenceThreshold: 0.35,
    confidenceThresholdPercent: 35,
    outcome: 'AGENT_TRADE_THESIS',
    marketSnapshot: { coinTicker: 'LDO', thesisDirection: 'UP', primaryTimeframe: '1h' },
    parsedPicks: [],
    gridPick: null,
    coinGridSessionId: null,
  };

  it('keeps the float rather than the percent', () => {
    const t = mapThought(live);
    expect(t.confidence).toBe(0.35);
    expect(t.threshold).toBe(0.35);
  });

  it('preserves a null direction instead of guessing one', () => {
    // Absent on roughly a third of the entries observed.
    const t = mapThought({ ...live, marketSnapshot: { ...live.marketSnapshot, thesisDirection: null } });
    expect(t.snapshot?.thesisDirection).toBeNull();
  });

  it('preserves an absent threshold as absent', () => {
    const t = mapThought({ ...live, confidenceThreshold: null });
    expect(t.threshold).toBeNull();
  });

  it('does not substitute a recognised outcome for a missing one', () => {
    expect(mapThought({ ...live, outcome: undefined }).outcome).toBe('UNKNOWN');
    expect(isKnownOutcome(mapThought({ ...live, outcome: undefined }).outcome)).toBe(false);
  });

  it('has no snapshot rather than an empty one', () => {
    expect(mapThought({ ...live, marketSnapshot: null }).snapshot).toBeNull();
  });
});

describe('reading the log', () => {
  it('keeps “has not reasoned yet” apart from “could not be read”', async () => {
    // The distinction the roster's three states exist for. Collapsing it is how
    // every page said the account was empty for the life of the product.
    const port = new FakeAgentsPort();
    port.thoughts = { kind: 'empty' };
    expect((await new ReadThoughtLogQuery(port).execute(who)).kind).toBe('none');

    port.thoughts = { kind: 'unreadable', reason: 'BattleGrid did not respond', cause: 'unreachable' };
    const failed = await new ReadThoughtLogQuery(port).execute(who);
    expect(failed.kind).toBe('unreadable');
    expect(failed.kind === 'unreadable' && failed.reason).toMatch(/did not respond/);
  });

  it('shows a declined decision alongside the ones acted on', async () => {
    const port = new FakeAgentsPort();
    port.thoughts = {
      kind: 'entries',
      total: 340,
      entries: [
        aThought({ id: 'a', outcome: 'SUBMITTED' }),
        aThought({ id: 'b', outcome: 'SKIPPED_LOW_CONFIDENCE', confidence: 0.2, threshold: 0.35 }),
      ],
    };
    const res = await new ReadThoughtLogQuery(port).execute(who);
    expect(res.kind).toBe('decisions');
    if (res.kind !== 'decisions') return;

    expect(res.decisions).toHaveLength(2);
    const declined = res.decisions.find((d) => d.entry.id === 'b');
    expect(declined?.declined, 'a decision to do nothing is still a decision').toBe(true);
    expect(declined?.bar.kind).toBe('short');
    expect(declined?.outcome).toMatch(/not confident enough/i);
  });

  it('reports the account total, not the page length', async () => {
    const port = new FakeAgentsPort();
    port.thoughts = { kind: 'entries', total: 340, entries: [aThought()] };
    const res = await new ReadThoughtLogQuery(port).execute(who);
    expect(res.kind === 'decisions' && res.total).toBe(340);
  });
});

/**
 * What the bar governs, measured against fifty live entries rather than assumed.
 *
 * ```
 * SUBMITTED                cleared 10   short  0
 * SKIPPED_LOW_CONFIDENCE   cleared  0   short  3
 * AGENT_TRADE_THESIS       cleared 29   short  6
 * ```
 *
 * I assumed clearing the bar was what produced a thesis. It is not — six theses
 * sat below their own bar. The threshold gates submission, not thinking.
 */
describe('the bar gates submission, not thinking', () => {
  it('does not treat a thesis below its bar as impossible', () => {
    const below = aThought({ outcome: 'AGENT_TRADE_THESIS', confidence: 0.25, threshold: 0.35 });
    expect(clearedItsBar(below).kind).toBe('short');
    // It formed a thesis anyway, and the product must show it as one.
    expect(stoodDown(below), 'a thesis below the bar is not a stand-down').toBe(false);
    expect(describeOutcome(below.outcome)).toBe('Formed a thesis');
  });

  it('recognises a cycle in which the agent never wrote anything', () => {
    // ERROR entries carry no prose and no threshold: the agent failed before it
    // got to think, which is not the same as thinking nothing.
    const failed = aThought({ outcome: 'ERROR', reasoning: '', confidence: null, threshold: null });
    expect(reasonedAtAll(failed)).toBe(false);
    expect(clearedItsBar(failed).kind).toBe('no-bar');
    expect(reasonedAtAll(aThought())).toBe(true);
  });
});
