import type { RadarDeployment } from '@/domain/agent/deployment.js';
import type { RadarPort, RadarReadResult } from '@/ports/radar.js';
import type { McpBattleGridAdapter } from './mcp-adapter.js';
import { unreadable } from './unreadable.js';

/**
 * The radar module, read side only — `list_radar_deployments`, a read tool
 * with no arguments, mapped against the shape observed live 2026-07-31
 * (`docs/battlegrid-mcp-surface.json`): `policies[]`, each with `coinTicker`,
 * `deploymentTimeframe`, `enabled`, `slots[].agentId`, and a `resolvesNow`
 * naming who is on duty and who holds the position.
 */
const TOOL = 'list_radar_deployments';

export class McpRadarAdapter implements RadarPort {
  constructor(private readonly battlegrid: McpBattleGridAdapter) {}

  async listDeployments(params: {
    userId: string;
    accessToken: string;
  }): Promise<RadarReadResult> {
    try {
      const result = await this.battlegrid.callTool({
        userId: params.userId,
        accessToken: params.accessToken,
        tool: TOOL,
        args: {},
      });
      const payload = result.content as Record<string, unknown>;
      return { kind: 'deployments', deployments: mapDeployments(payload['policies']) };
    } catch (err) {
      return unreadable(err);
    }
  }
}

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

/**
 * A payload this cannot read refuses the whole read — it never drops the row.
 *
 * Dropping a malformed policy would be worse than failing: the agent slotted
 * into it would render as "not deployed", which is the exact lie the
 * unreadable state exists to prevent, produced one level down. A policy
 * without its id or coin, or a slot without its agent, throws; the adapter
 * turns that into `unreadable` and the page says the state is unknown.
 * `resolvesNow` is optional refinement — its absence nulls the fields and
 * never fails the row.
 */
export function mapDeployments(raw: unknown): readonly RadarDeployment[] {
  if (!Array.isArray(raw)) throw new RadarPayloadError('policies');
  return raw.map((entry: unknown): RadarDeployment => {
    const p = (entry ?? {}) as Record<string, unknown>;
    const policyId = str(p['policyId']);
    const coinTicker = str(p['coinTicker']) ?? str(p['coinId']);
    if (!policyId) throw new RadarPayloadError('policyId');
    if (!coinTicker) throw new RadarPayloadError('coinTicker');

    const slots = Array.isArray(p['slots']) ? p['slots'] : [];
    const resolves = (p['resolvesNow'] ?? {}) as Record<string, unknown>;
    return {
      policyId,
      coinTicker,
      timeframe: str(p['deploymentTimeframe']) ?? '',
      enabled: p['enabled'] === true,
      slotAgentIds: slots.map((s: unknown) => {
        const id = str(((s ?? {}) as Record<string, unknown>)['agentId']);
        if (!id) throw new RadarPayloadError('slots[].agentId');
        return id;
      }),
      onDutyAgentId: str(resolves['onDutyAgentId']),
      openPositionAgentId: str(resolves['openPositionAgentId']),
    };
  });
}

export class RadarPayloadError extends Error {
  constructor(field: string) {
    super(`BattleGrid returned a radar deployment with no usable "${field}"`);
  }
}
