import type { FailureCause } from '@/ports/failure.js';
import type { SignalSummary, StrategiesPort } from '@/ports/strategies.js';

/** One module's signals, in the platform's listing order. */
export interface SignalModuleGroup {
  readonly module: string;
  readonly signals: readonly SignalSummary[];
}

export type SignalLibraryResult =
  | { readonly kind: 'library'; readonly modules: readonly SignalModuleGroup[] }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

/**
 * The signal library, grouped by module for display.
 *
 * There is no `empty` state on purpose: the vocabulary is the platform's own
 * catalogue, and a platform listing zero signals is indistinguishable in
 * consequence from one that could not be read — either way there is nothing
 * to author with, and saying "no signals exist" would assert something this
 * product cannot know. Zero signals renders as unreadable.
 */
export class ReadSignalLibraryQuery {
  constructor(private readonly strategies: StrategiesPort) {}

  async execute(req: { userId: string; accessToken: string }): Promise<SignalLibraryResult> {
    const listed = await this.strategies.listSignals(req);
    if (listed.kind === 'unreadable') return listed;
    if (listed.signals.length === 0) {
      return {
        kind: 'unreadable',
        reason: 'BattleGrid listed no strategy signals — the vocabulary did not load',
        cause: 'unreachable',
      };
    }

    const order: string[] = [];
    const byModule = new Map<string, SignalSummary[]>();
    for (const signal of listed.signals) {
      const group = byModule.get(signal.module);
      if (group) group.push(signal);
      else {
        order.push(signal.module);
        byModule.set(signal.module, [signal]);
      }
    }
    return {
      kind: 'library',
      modules: order.map((module) => ({ module, signals: byModule.get(module) ?? [] })),
    };
  }
}
