import { readFileSync } from 'node:fs';

/**
 * Floors derived from the committed surface record, for probes that used to
 * carry literals.
 *
 * `write-probe` asserted a config read was `> 20` fields wide and
 * `proposal-probe` `> 19` — both set when the config had 23 fields. BattleGrid
 * v17 collapsed the exit model, a healthy read became 18, and the first-ever
 * create on the testing account (2026-08-11) failed on width alone while every
 * mutation in the audit trail succeeded. A literal encodes the platform of the
 * day it was typed; the record is regenerated against the platform of today.
 */
interface Surface {
  tools: Array<{ name: string; input_required_paths?: string[] }>;
}

/** How many `tradingConfig` children the recorded write schema requires. */
export function recordedTradingConfigChildren(): number {
  const surface = JSON.parse(
    readFileSync('docs/battlegrid-mcp-surface.json', 'utf8'),
  ) as Surface;
  const update = surface.tools.find((t) => t.name === 'update_intelligence_agent');
  const children = new Set(
    (update?.input_required_paths ?? [])
      .filter((p) => p.startsWith('tradingConfig.'))
      .map((p) => p.split('.')[1] as string),
  );
  if (children.size === 0) {
    throw new Error(
      'the record names no required tradingConfig children — re-probe: ' +
        'BATTLEGRID_API_KEY=… python3 tools/probe_mcp_surface.py',
    );
  }
  return children.size;
}
