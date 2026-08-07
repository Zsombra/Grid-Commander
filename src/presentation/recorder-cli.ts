import type { CaptureSignalsResult } from '@/application/use-cases/capture-signals.command.js';

/**
 * The recorder CLI's argument contract, apart from the process so it can be
 * tested without spawning one.
 *
 *   grid-commander-record                       capture the deployments
 *   grid-commander-record --coins BTC,ETH --interval 4h
 *
 * A usage problem is a refusal that names itself — the operator is reading a
 * cron log, and "exit 1" with no sentence is the kind of silence this
 * product does not ship.
 */
export type RecorderArgs =
  | { readonly kind: 'run'; readonly named?: { readonly coins: readonly string[]; readonly interval: string } | undefined }
  | { readonly kind: 'usage'; readonly problem: string };

export function parseRecorderArgs(argv: readonly string[]): RecorderArgs {
  let coins: string | null = null;
  let interval: string | null = null;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--coins') {
      const value = argv[++i];
      if (value === undefined) return { kind: 'usage', problem: '--coins needs a value, e.g. --coins BTC,ETH' };
      coins = value;
    } else if (arg === '--interval') {
      const value = argv[++i];
      if (value === undefined) return { kind: 'usage', problem: '--interval needs a value, e.g. --interval 4h' };
      interval = value;
    } else {
      return { kind: 'usage', problem: `unknown argument '${String(arg)}'` };
    }
  }

  if (coins !== null && interval === null) {
    return {
      kind: 'usage',
      problem: 'an interval is required when coins are named — add --interval, e.g. --interval 4h',
    };
  }
  if (coins === null && interval !== null) {
    return {
      kind: 'usage',
      problem:
        'an interval without coins does nothing — deployments are captured at their own timeframes; name coins with --coins',
    };
  }
  if (coins !== null && interval !== null) {
    return { kind: 'run', named: { coins: coins.split(','), interval } };
  }
  return { kind: 'run' };
}

/**
 * The summary a scheduler's log keeps. One line per outcome, reasons
 * included — a cron mail that says which coin failed and why is the
 * difference between a gap with an explanation and a mystery.
 */
export function summariseCapture(result: CaptureSignalsResult): string {
  const lines: string[] = [];
  const version = result.platformVersion ?? 'unknown';
  const p = result.provenance;
  const subject =
    p.kind === 'named'
      ? `named coins (${p.coins.join(', ')}) at ${p.interval}`
      : p.kind === 'deployments'
        ? `the account's deployments (${p.pairs.map((x) => `${x.coinTicker}@${x.timeframe}`).join(', ')})`
        : `nothing — ${p.reason}`;
  lines.push(`capture run ${result.runId} · platform ${version} · subject: ${subject}`);
  for (const r of result.recorded) {
    lines.push(`  recorded ${r.coinTicker}@${r.interval}: ${r.readingCount} signals`);
  }
  for (const f of result.failed) {
    lines.push(`  FAILED ${f.coinTicker}@${f.interval}: ${f.reason}`);
  }
  if (result.recorded.length === 0) {
    lines.push('  nothing was recorded — this run grew the record by nothing');
  }
  return lines.join('\n');
}
