import type { RadarDeployment } from '@/domain/agent/deployment.js';
import type { Confirmation } from '@/domain/capability/confirmation.js';
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
const TOOLS = {
  list: 'list_radar_deployments',
  upsert: 'upsert_radar_deployment',
  delete: 'delete_radar_deployment',
} as const;

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
        tool: TOOLS.list,
        args: {},
      });
      const payload = result.content as Record<string, unknown>;
      return { kind: 'deployments', deployments: mapDeployments(payload['policies']) };
    } catch (err) {
      return unreadable(err);
    }
  }

  /**
   * The `request.deploymentTimeframe` enum out of the *discovered* schema —
   * the same discovery every session already performs. Nothing here bakes in
   * today's thirteen values; a deployment after which the platform narrows
   * them narrows this product with it. Empty when the declaration cannot
   * answer, and the caller refuses to compose rather than guessing.
   */
  async deploymentTimeframes(params: {
    userId: string;
    accessToken: string;
  }): Promise<readonly string[]> {
    const tools = await this.battlegrid.discoverTools(params.accessToken);
    const upsert = tools.find((t) => t.name === TOOLS.upsert);
    const schema = (upsert?.inputSchema ?? {}) as Record<string, unknown>;
    const props = (schema['properties'] ?? {}) as Record<string, unknown>;
    const request = (props['request'] ?? {}) as Record<string, unknown>;
    const rprops = (request['properties'] ?? {}) as Record<string, unknown>;
    const tf = (rprops['deploymentTimeframe'] ?? {}) as Record<string, unknown>;
    const values = tf['enum'];
    return Array.isArray(values) ? values.filter((v): v is string => typeof v === 'string') : [];
  }

  /**
   * The one-slot shape, exactly as the record declares and the operator's own
   * account carries it: every slot field is required and the extras are sent
   * inert (`conditions: []`, `isDefault: true`, `minConviction/priority:
   * null`) — observed values, not inventions. Both objects are closed;
   * `payload-conformance` holds this composition against the record.
   */
  async upsertDeployment(params: {
    userId: string;
    accessToken: string;
    coinId: string;
    timeframe: string;
    enabled: boolean;
    agentId: string;
    expectedRevision: number | null;
    confirmation: Confirmation;
  }): Promise<{ readonly revision: number }> {
    const result = await this.battlegrid.callTool({
      userId: params.userId,
      accessToken: params.accessToken,
      tool: TOOLS.upsert,
      args: {
        coinId: params.coinId,
        request: {
          deploymentTimeframe: params.timeframe,
          enabled: params.enabled,
          expectedRevision: params.expectedRevision,
          slots: [
            {
              agentId: params.agentId,
              conditions: [],
              isDefault: true,
              minConviction: null,
              priority: null,
            },
          ],
        },
      },
      target: params.confirmation.target,
      confirmationToken: params.confirmation.token,
    });
    const payload = result.content as Record<string, unknown>;
    const revision = payload['revision'];
    if (typeof revision !== 'number') throw new RadarPayloadError('revision');
    return { revision };
  }

  async deleteDeployment(params: {
    userId: string;
    accessToken: string;
    coinId: string;
    expectedRevision: number;
    confirmation: Confirmation;
  }): Promise<{ readonly deleted: boolean }> {
    const result = await this.battlegrid.callTool({
      userId: params.userId,
      accessToken: params.accessToken,
      tool: TOOLS.delete,
      args: {
        coinId: params.coinId,
        confirm: true,
        expectedRevision: params.expectedRevision,
      },
      target: params.confirmation.target,
      confirmationToken: params.confirmation.token,
    });
    const payload = result.content as Record<string, unknown>;
    return { deleted: payload['deleted'] === true };
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
    // A policy without its revision cannot be written against — a defaulted 0
    // would present a fabricated expectedRevision and clobber concurrent work.
    const revision = p['revision'];
    if (typeof revision !== 'number') throw new RadarPayloadError('revision');

    const slots = Array.isArray(p['slots']) ? p['slots'] : [];
    const resolves = (p['resolvesNow'] ?? {}) as Record<string, unknown>;
    return {
      policyId,
      coinTicker,
      revision,
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
