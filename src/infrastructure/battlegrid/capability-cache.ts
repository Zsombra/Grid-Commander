import { buildClassificationMap, classifyDegraded } from '@/domain/capability/classify.js';
import type { DiscoveredTool, ToolClass } from '@/domain/capability/tool-class.js';

export interface DiscoverySource {
  discoverTools(accessToken: string): Promise<readonly DiscoveredTool[]>;
}

export interface CapabilityView {
  readonly degraded: boolean;
  classify(tool: string): ToolClass;
}

/**
 * Per-session capability discovery.
 *
 * The server states that its tool list is not authoritative after a deployment,
 * so this is refreshed per session rather than cached at build time. A failure
 * degrades to a read-only view rather than failing the whole session — R5's
 * third scenario — and the degraded view can only ever refuse.
 */
export class CapabilityCache {
  private map: ReadonlyMap<string, ToolClass> | null = null;
  private failed = false;

  constructor(private readonly source: DiscoverySource) {}

  async load(accessToken: string): Promise<CapabilityView> {
    try {
      const tools = await this.source.discoverTools(accessToken);
      this.map = buildClassificationMap(tools);
      this.failed = false;
    } catch {
      // Deliberately not rethrown: the product keeps working, read-only.
      this.map = null;
      this.failed = true;
    }
    return this.view();
  }

  view(): CapabilityView {
    const map = this.map;
    const degraded = this.failed || map === null;
    return {
      degraded,
      classify: (tool: string): ToolClass =>
        degraded ? classifyDegraded(tool) : classifyFrom(map!, tool),
    };
  }
}

/** A name absent from the discovered set is unknown, and unknown fails closed. */
function classifyFrom(map: ReadonlyMap<string, ToolClass>, tool: string): ToolClass {
  return map.get(tool) ?? { mutating: true, destructive: true, requiredScope: 'mcp:wager', basis: 'unknown' };
}
