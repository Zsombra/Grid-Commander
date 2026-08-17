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
  private inFlight: Promise<void> | null = null;

  constructor(private readonly source: DiscoverySource) {}

  /**
   * Single-flight: concurrent calls share one discovery read. Ten parallel
   * tool calls used to mean ten parallel `tools/list` requests, and one
   * failing degraded that caller's whole read (found live 2026-08-01 by the
   * metric index, the first surface to fan out). Sequential calls still
   * re-discover every time — freshness is per burst, not per process, so
   * the staleness rule the server states is intact. Classifications come
   * from platform-global annotations, which is why sharing the read across
   * concurrent users changes nothing they could observe.
   */
  async load(accessToken: string): Promise<CapabilityView> {
    if (!this.inFlight) {
      this.inFlight = this.source
        .discoverTools(accessToken)
        .then((tools) => {
          this.map = buildClassificationMap(tools);
          this.failed = false;
        })
        .catch(() => {
          // Deliberately not rethrown: the product keeps working, read-only.
          this.map = null;
          this.failed = true;
        })
        .finally(() => {
          this.inFlight = null;
        });
    }
    await this.inFlight;
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
