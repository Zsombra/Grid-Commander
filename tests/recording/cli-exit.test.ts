import { describe, expect, it } from 'vitest';
import { exitCodeFor } from '@/application/use-cases/capture-signals.command.js';
import type { CaptureSignalsResult } from '@/application/use-cases/capture-signals.command.js';
import { parseRecorderArgs, summariseCapture } from '@/presentation/recorder-cli.js';

/**
 * What a scheduler learns from the recorder: the exit code and the summary.
 *
 * Both are pure functions on purpose — the semantics the spec names ("a
 * capture that recorded nothing SHALL NOT exit as success") are testable
 * here without spawning a process, and `bin/grid-commander-record.ts` is
 * thin enough to hold nothing but parse → run → print → exit.
 */

const base: CaptureSignalsResult = {
  runId: 'run-1',
  provenance: { kind: 'named', interval: '4h', coins: ['BTC'] },
  platformVersion: 'v11.0.0',
  recorded: [],
  failed: [],
};

describe('a scheduler can tell a working recorder from a dead one', () => {
  it('exits zero when at least one coin recorded', () => {
    expect(
      exitCodeFor({
        ...base,
        recorded: [{ coinTicker: 'BTC', interval: '4h', captureId: 'c1', readingCount: 84 }],
        failed: [{ coinTicker: 'ETH', interval: '4h', reason: '504' }],
      }),
    ).toBe(0);
  });

  it('exits nonzero when every coin failed', () => {
    expect(
      exitCodeFor({ ...base, failed: [{ coinTicker: 'BTC', interval: '4h', reason: '502' }] }),
    ).toBe(1);
  });

  it('exits nonzero when nothing could be covered', () => {
    expect(
      exitCodeFor({
        ...base,
        provenance: { kind: 'nothing', reason: 'no deployments' },
      }),
    ).toBe(1);
  });
});

describe('a refusal names itself', () => {
  it('refuses named coins without an interval, saying what to add', () => {
    const parsed = parseRecorderArgs(['--coins', 'BTC,ETH']);
    expect(parsed.kind).toBe('usage');
    expect(parsed.kind === 'usage' && parsed.problem).toContain('--interval');
  });

  it('refuses an interval without coins, and says why it does nothing', () => {
    const parsed = parseRecorderArgs(['--interval', '4h']);
    expect(parsed.kind).toBe('usage');
    expect(parsed.kind === 'usage' && parsed.problem).toContain('deployments');
  });

  it('refuses an argument it does not know', () => {
    const parsed = parseRecorderArgs(['--cions', 'BTC']);
    expect(parsed.kind).toBe('usage');
    expect(parsed.kind === 'usage' && parsed.problem).toContain('--cions');
  });

  it('parses the two real invocations', () => {
    expect(parseRecorderArgs([])).toEqual({ kind: 'run' });
    expect(parseRecorderArgs(['--coins', 'BTC,ETH', '--interval', '4h'])).toEqual({
      kind: 'run',
      named: { coins: ['BTC', 'ETH'], interval: '4h' },
    });
  });
});

describe('the summary says what happened, reasons included', () => {
  it('names what recorded, what failed and why, and the platform generation', () => {
    const summary = summariseCapture({
      ...base,
      recorded: [{ coinTicker: 'BTC', interval: '4h', captureId: 'c1', readingCount: 84 }],
      failed: [{ coinTicker: 'ETH', interval: '4h', reason: 'tools/call failed with 504' }],
    });
    expect(summary).toContain('recorded BTC@4h: 84 signals');
    expect(summary).toContain('FAILED ETH@4h: tools/call failed with 504');
    expect(summary).toContain('v11.0.0');
  });

  it('says version unknown rather than omitting it', () => {
    const summary = summariseCapture({ ...base, platformVersion: null });
    expect(summary).toContain('platform unknown');
  });

  it('states plainly when a run grew the record by nothing', () => {
    const summary = summariseCapture({
      ...base,
      provenance: { kind: 'nothing', reason: 'the deployments could not be read: HTTP 502' },
    });
    expect(summary).toContain('nothing was recorded');
    expect(summary).toContain('HTTP 502');
  });
});
