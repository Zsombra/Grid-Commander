import { beforeEach, describe, expect, it, vi } from 'vitest';
import { aSignal, aSignalDefinition, FakeStrategiesPort } from '../support/strategy-fakes.js';
import { actingWith, notConnected } from './support/fake-acting.js';
import { rendered } from './support/render.js';

/**
 * The signal library and its cards, branch by branch. The property that
 * matters most: every sentence a card shows is the platform's own copy — so
 * these tests assert the staged platform text appears, not product prose.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

const params = <T extends Record<string, string>>(p: T): Promise<T> => Promise.resolve(p);

async function libraryRendered() {
  const Page = (await import('../../app/(app)/strategies/signals/page.js')).default;
  return rendered(await Page());
}

async function signalRendered(id: string) {
  const Page = (await import('../../app/(app)/strategies/signals/[id]/page.js')).default;
  return rendered(await Page({ params: params({ id }) }));
}

beforeEach(() => {
  current = actingWith();
});

describe('the signal library, branch by branch', () => {
  it('an unreadable vocabulary says so — never an empty library', async () => {
    const strategies = new FakeStrategiesPort();
    strategies.signalsReadable = false;
    current = actingWith({ strategies });
    const r = await libraryRendered();
    expect(r.headings[0]).toBe('The signal library could not be read');
    expect(r.text).toContain('BattleGrid did not respond');
  });

  it('signals are grouped by module with the platform’s copy and a way in', async () => {
    const strategies = new FakeStrategiesPort();
    strategies.stageSignal(aSignalDefinition());
    strategies.stageSignal(
      aSignalDefinition({
        summary: aSignal({ id: 'macd_bull_cross', module: 'MACD', name: 'Bull Cross' }),
      }),
    );
    current = actingWith({ strategies });
    const r = await libraryRendered();
    expect(r.headings[0]).toBe('Signal library');
    expect(r.headings).toContain('RSI');
    expect(r.headings).toContain('MACD');
    expect(r.text).toContain('Oversold');
    expect(r.text).toContain('RSI-14 falls below 30');
    expect(r.text).toContain('Back to strategies');
  });
});

describe('a signal card, branch by branch', () => {
  it('shows the platform’s full definition for a listed signal', async () => {
    const strategies = new FakeStrategiesPort();
    strategies.stageSignal(aSignalDefinition());
    current = actingWith({ strategies });
    const r = await signalRendered('rsi_oversold');
    expect(r.headings[0]).toContain('Oversold');
    expect(r.text).toContain('RSI has fallen into oversold territory.');
    expect(r.text).toContain('Triggers when RSI(14) drops below the threshold.');
    expect(r.text).toContain('RSI = 27');
    expect(r.text).toContain('threshold');
    expect(r.text).toContain('default 30');
    expect(r.text).toContain('Mean-reversion entries');
    expect(r.text).toContain('Back to the signal library');
  });

  it('a signal with no parameters says so plainly', async () => {
    const strategies = new FakeStrategiesPort();
    strategies.stageSignal(aSignalDefinition({ parameters: [] }));
    current = actingWith({ strategies });
    const r = await signalRendered('rsi_oversold');
    expect(r.text).toContain('This signal takes no parameters.');
  });

  it('an unlisted id says "No such signal" and offers the library', async () => {
    const strategies = new FakeStrategiesPort();
    strategies.stageSignal(aSignalDefinition());
    current = actingWith({ strategies });
    const r = await signalRendered('ghost');
    expect(r.headings[0]).toBe('No such signal');
    expect(r.text).toContain('Back to the signal library');
  });

  it('a definition that fails after listing renders as unreadable, not missing', async () => {
    const strategies = new FakeStrategiesPort();
    strategies.signals = [aSignal()]; // listed but no definition staged
    current = actingWith({ strategies });
    const r = await signalRendered('rsi_oversold');
    expect(r.headings[0]).toBe('The signal could not be read');
  });
});

describe('the gate both pages share', () => {
  it('an unauthenticated request is offered the path to connect', async () => {
    current = { app: actingWith().app, user: notConnected };
    const r = await libraryRendered();
    expect(r.text).toContain('connect');
  });
});
