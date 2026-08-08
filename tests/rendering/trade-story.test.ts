import { beforeEach, describe, expect, it, vi } from 'vitest';
import { actingWith, notConnected } from './support/fake-acting.js';
import { rendered } from './support/render.js';
import { aTradeChart, anAuditEvent, aTradeOutcome, FakeAgentsPort } from '../support/agent-fakes.js';

/**
 * The trade-story page, state by state. The states the platform keeps apart
 * must land as different sentences: never-filled is not not-found, an
 * unreadable trail is not an empty one, and a trail with no address is
 * neither. And the one price discipline this page adds: audit prices are
 * shown as the exact strings the platform sent.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

async function storyRendered(id = 'a1', logId = 'l1') {
  const Page = (await import('../../app/(app)/agents/[id]/trades/[logId]/page.js')).default;
  return rendered(await Page({ params: Promise.resolve({ id, logId }) }));
}

async function tradesRendered(id = 'a1') {
  const Page = (await import('../../app/(app)/agents/[id]/trades/page.js')).default;
  return rendered(
    await Page({ params: Promise.resolve({ id }), searchParams: Promise.resolve({}) }),
  );
}

const asRead = (text: string): string => text.replace(/\s+/g, ' ');

beforeEach(() => {
  current = actingWith();
});

describe('the trade story page', () => {
  it('renders the chart with the platform’s labels and the placed-levels caveat', async () => {
    const acting = actingWith();
    acting.agents.tradeChart = { kind: 'chart', chart: aTradeChart() };
    acting.agents.positionAudit = { kind: 'events', events: [anAuditEvent()] };
    current = acting;

    const page = await storyRendered();
    expect(page.headings[0]).toBe('How the WIF trade unfolded');
    // The SVG's accessible title carries the platform's facts.
    expect(asRead(page.text)).toContain('2 frozen candles');
    // Levels drawn with the platform's display labels and exact prices.
    expect(page.text).toContain('Stop Loss 0.1368296');
    expect(page.text).toContain('Take Profit 0.1409912');
    expect(page.text).toContain('ENTRY 0.13783108');
    expect(page.text).toContain('EXIT 0.14099');
    // One word must not mean two numbers: the lines are labelled as placed.
    expect(asRead(page.text)).toContain('levels as placed');
    expect(asRead(page.text)).toContain('Frozen by the platform at 2026-08-08T05:41:24.459Z');
  });

  it('shows a reprice with both prices exactly as sent', async () => {
    const acting = actingWith();
    acting.agents.tradeChart = { kind: 'chart', chart: aTradeChart() };
    acting.agents.positionAudit = { kind: 'events', events: [anAuditEvent()] };
    current = acting;

    const page = await storyRendered();
    const text = asRead(page.text);
    expect(text).toContain('SL_REPLACED');
    // Trailing zeros intact: these are the platform's decimal strings, and a
    // float excursion anywhere between the wire and the page would eat them.
    expect(text).toContain('0.13682960 → 0.13802000');
    expect(text).toContain('a 0.87% move');
    expect(text).toContain('source BREAK_EVEN');
    expect(text).toContain('the platform judged it improved protection');
    expect(text).toContain('+0.14% vs entry');
  });

  it('says an evaluation never became a trade, as an answer', async () => {
    const acting = actingWith();
    acting.agents.tradeChart = { kind: 'no-trade' };
    current = acting;

    const page = await storyRendered();
    expect(page.headings[0]).toBe('This evaluation never became a trade');
    expect(asRead(page.text)).toContain('not a failure to load one');
  });

  it('keeps not-found and unreadable apart', async () => {
    const acting = actingWith();
    acting.agents.tradeChart = { kind: 'not-found' };
    current = acting;
    const notFound = await storyRendered();
    expect(notFound.headings[0]).toBe('No such evaluation on this agent');

    const failing = actingWith();
    failing.agents.tradeChart = {
      kind: 'unreadable',
      reason: 'BattleGrid did not respond',
      cause: 'unreachable',
    };
    current = failing;
    const unreadable = await storyRendered();
    expect(unreadable.headings[0]).toBe("This trade's story could not be read");
    expect(unreadable.text).toContain('BattleGrid did not respond');
  });

  it('keeps the three trail absences apart', async () => {
    // No address: the chart named no position.
    const noAddress = actingWith();
    noAddress.agents.tradeChart = { kind: 'chart', chart: aTradeChart({ positionId: null }) };
    current = noAddress;
    expect(asRead((await storyRendered()).text)).toContain(
      'named no position for this trade',
    );

    // Empty: the platform answered with no events.
    const empty = actingWith();
    empty.agents.tradeChart = { kind: 'chart', chart: aTradeChart() };
    empty.agents.positionAudit = { kind: 'none' };
    current = empty;
    expect(asRead((await storyRendered()).text)).toContain('no lifecycle events');

    // Unreadable: the read failed, and the chart stays up.
    const failing = actingWith();
    failing.agents.tradeChart = { kind: 'chart', chart: aTradeChart() };
    failing.agents.positionAudit = {
      kind: 'unreadable',
      reason: 'BattleGrid did not respond',
      cause: 'unreachable',
    };
    current = failing;
    const page = await storyRendered();
    expect(asRead(page.text)).toContain('The audit trail could not be read');
    expect(page.text).toContain('Stop Loss 0.1368296');
  });

  it('carries an event kind it does not recognise into the trail', async () => {
    const acting = actingWith();
    acting.agents.tradeChart = { kind: 'chart', chart: aTradeChart() };
    acting.agents.positionAudit = {
      kind: 'events',
      events: [anAuditEvent({ kind: 'MARGIN_TOPPED_UP', fromPrice: null, toPrice: null, price: '1.5' })],
    };
    current = acting;
    expect(asRead((await storyRendered()).text)).toContain('MARGIN_TOPPED_UP');
  });

  it('refuses to render for the unauthenticated', async () => {
    current = { app: actingWith().app, user: notConnected };
    const page = await storyRendered();
    expect(page.text).toContain('You are not connected to BattleGrid');
  });
});

describe('the trades list', () => {
  it('links each trade with an evaluation to its story', async () => {
    const agents = new FakeAgentsPort();
    agents.tradeOutcomes = {
      kind: 'outcomes',
      outcomes: [
        aTradeOutcome({ id: 't1', signalLogId: 'log-9' }),
        aTradeOutcome({ id: 't2', signalLogId: null }),
      ],
      total: 2,
    };
    current = actingWith({ agents });

    const page = await tradesRendered('a1');
    // One outcome carries the address, one does not — one link, not two.
    expect(page.links).toContain('/agents/a1/trades/log-9');
    expect(page.links.filter((l) => l.includes('/trades/')).length).toBe(1);
    expect(page.text).toContain('How it unfolded');
  });
});
