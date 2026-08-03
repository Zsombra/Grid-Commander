import type {
  SimulationResult,
  SimulationSignal,
  StrategiesPort,
} from '@/ports/strategies.js';
import { SIMULATION_SIGNAL_CAP } from '@/ports/strategies.js';

/**
 * What a re-weighting would have scored.
 *
 * The cap is checked here rather than at the port: the platform refuses
 * more than twenty signals outright, and a caller that discovers that from
 * an error has already lost the chance to explain *why* an evaluation
 * cannot be re-scored. Refusing locally with the reason is the same
 * discipline the confirmation flows use — say what is wrong before the
 * platform does.
 */
export class SimulateAggregateQuery {
  constructor(private readonly strategies: StrategiesPort) {}

  async execute(req: {
    userId: string;
    accessToken: string;
    signals: readonly SimulationSignal[];
    gate: number;
  }): Promise<SimulationResult> {
    if (req.signals.length === 0) {
      return { kind: 'refused', reason: 'No signals fired on this evaluation, so there is nothing to re-weight.' };
    }
    if (req.signals.length > SIMULATION_SIGNAL_CAP) {
      return {
        kind: 'refused',
        reason:
          `This evaluation fired ${req.signals.length} signals and BattleGrid's simulator accepts ` +
          `at most ${SIMULATION_SIGNAL_CAP}. Dropping some to fit would score a different composition ` +
          `than the one that ran.`,
      };
    }
    return this.strategies.simulateAggregate(req);
  }
}
