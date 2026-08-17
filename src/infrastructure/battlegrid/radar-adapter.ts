import type { RadarDeployment, RadarPause, RadarResolution } from '@/domain/agent/deployment.js';
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
      return {
        kind: 'deployments',
        deployments: mapDeployments(payload['policies']),
        // The other declared output. It was discarded here for the life of the
        // product, and the agent page said "on duty: scanning" through a
        // three-day platform pause because of it (#311).
        pause: mapPause(payload['summary']),
      };
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
      resolution: p['resolvesNow'] ? resolution(resolves) : null,
    };
  });
}

/**
 * Whether the radar is running, off the fleet summary.
 *
 * Non-fatal at every field, and **nullable at every field**, which is the whole
 * contract. `summary` is declared required beside `policies` and all fourteen
 * of its fields are required within it — but a declaration is not an
 * observation on this platform, and the one substitution this mapper must never
 * make is absence into `false`. A radar answer without a summary is a read that
 * did not answer; rendering it as a running radar would state, on this
 * product's authority, that automation is live. `regimeAutoDerive` cost that
 * lesson at v19 and it is the same shape here.
 *
 * Note the asymmetry the platform itself draws: `radarPaused` is a boolean
 * about the radar, `platformPaused` a **count** of deployed coins it has
 * stopped. Two facts, carried apart, because their remedies differ.
 */
function mapPause(raw: unknown): RadarPause {
  const s = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const paused = s['radarPaused'];
  return {
    radarPaused: typeof paused === 'boolean' ? paused : null,
    platformPaused: count(s['platformPaused']),
    coinsDeployed: count(s['coinsDeployed']),
    scanning: count(s['scanning']),
  };
}

/** A count the platform sent. A non-number is not a zero. */
const count = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

/**
 * What the platform resolved, carried rather than interpreted.
 *
 * Absent stays absent at every field. A missing `qualified` is not `false`, and
 * a missing `section` is not `SCANNING` — the whole value of this block is
 * telling *the platform declined* apart from *the platform was silent*, and a
 * default would erase exactly that.
 *
 * Non-fatal by construction, matching the row mapper above: `policyId`,
 * `coinTicker` and `revision` throw because a write cannot be composed without
 * them, and nothing here is write-critical. A resolution that arrives malformed
 * costs a sentence on a surface, not a refused deployment.
 */
function resolution(resolves: Record<string, unknown>): RadarResolution {
  const qualified = resolves['qualified'];
  return {
    qualified: typeof qualified === 'boolean' ? qualified : null,
    // Verbatim. Two block values have ever been observed, so anything else is
    // still the platform's word for something and is shown as such.
    qualificationBlock: str(resolves['qualificationBlock']),
    section: str(resolves['section']),
    cooldownUntil: date(resolves['cooldownUntil']),
    // Whether it is still running is not the adapter's to say — it has no
    // clock, and inventing one here is what the boundary rule forbids. The
    // read fills this in against the injected clock.
    cooldownActive: null,
    regime: str(resolves['regimeUsed']),
    regimeConviction: str(resolves['regimeConviction']),
  };
}

/** A timestamp the platform sent, or null — an unparseable one is not a date. */
const date = (v: unknown): Date | null => {
  if (typeof v !== 'string' || !v) return null;
  const parsed = new Date(v);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export class RadarPayloadError extends Error {
  constructor(field: string) {
    super(`BattleGrid returned a radar deployment with no usable "${field}"`);
  }
}
