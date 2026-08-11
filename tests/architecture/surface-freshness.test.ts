import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The surface record must be able to tell you it is stale.
 *
 * Nine test files gate what this product puts on the wire against
 * `docs/battlegrid-mcp-surface.json` — `mcp-conformance`, `wire-values`,
 * `payload-conformance`, `deployment`, `position-presets`, and two Python
 * probes among them. Every one of them is only as current as that file.
 *
 * BattleGrid shipped **v3.0.0 → v5.0.0** and no check in this repository
 * failed, because the record named no version. The tool count was 110 before
 * and 110 after, so counting proved nothing; underneath it, enums moved
 * (`ATR_PCT` arrived, `CHANGE_RANK` / `VOLUME_RANK` / `crossSectional` left),
 * required arguments moved (`entryStrategy` replaced two booleans on policy
 * slots), and a context module changed from always-included to omissible.
 *
 * Nothing broke — vocabulary is read at runtime and the policy tools are
 * unmodelled — but nothing *could have* broken loudly either, and that is the
 * defect this file exists for.
 *
 * This half runs offline and asserts only that the record is comparable at all.
 * The comparison itself needs the live server and lives in
 * `tests/live/surface-freshness.test.ts`. Splitting them is deliberate: an
 * offline check cannot know what BattleGrid is running today, and one that
 * implied it could would be the same lie in a new place.
 */

interface Surface {
  source?: string;
  server?: { name?: string; version?: string; protocol?: string };
  probed_at?: string;
  tool_count?: number;
  tools: unknown[];
}

const REPROBE = 'BATTLEGRID_API_KEY=… python3 tools/probe_mcp_surface.py';

const surface = JSON.parse(readFileSync('docs/battlegrid-mcp-surface.json', 'utf8')) as Surface;

describe('the surface record names the server it was taken from', () => {
  it('records a server name and version', () => {
    expect(surface.server, `no server recorded — re-probe: ${REPROBE}`).toBeDefined();
    expect(surface.server?.name, `re-probe: ${REPROBE}`).toBeTruthy();
    expect(surface.server?.version, `re-probe: ${REPROBE}`).toBeTruthy();
  });

  it('records when it was taken', () => {
    expect(surface.probed_at, `re-probe: ${REPROBE}`).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
    );
  });

  it('does not offer the tool count as evidence of currency', () => {
    /**
     * The one assertion here that is about wording rather than data.
     *
     * `tool_count` is the field a reader reaches for to decide whether the
     * record is current, and it is the field that proved nothing across two
     * major versions. The note carries that warning to whoever opens the file,
     * because the next person to eyeball 110-and-110 and move on will not have
     * read this test.
     */
    const note = JSON.parse(readFileSync('docs/battlegrid-mcp-surface.json', 'utf8')).note as string;
    expect(note).toContain('tool_count');
    expect(note).toMatch(/stale/i);
  });

  it('is the artifact the conformance guards actually read', () => {
    /**
     * Guards against this file drifting into decoration: if the checks that
     * gate the wire stop reading this artifact, freshening it protects nothing.
     */
    const readers = [
      'tests/architecture/mcp-conformance.test.ts',
      'tests/architecture/wire-values.test.ts',
      'tests/architecture/payload-conformance.test.ts',
    ];
    for (const file of readers) {
      expect(readFileSync(file, 'utf8'), file).toContain('docs/battlegrid-mcp-surface.json');
    }
  });
});

describe('the vocabulary record carries values it can be compared by', () => {
  /**
   * The carve-out from shape-only, held to its own terms (#92). The
   * vocabulary artifact exists because `strategyConditions: 16` recorded as
   * `"int"` is a budget nothing can compare — so a vocabulary record whose
   * budgets are not numbers has collapsed back into a shape record, and that
   * is asserted here rather than discovered at authoring time. The live
   * comparison itself is in `tests/live/surface-freshness.test.ts`, same
   * split as the surface record above.
   */
  const REPROBE_VOCAB = 'BATTLEGRID_API_KEY=… python3 tools/probe_vocabulary.py';

  interface Vocabulary {
    server?: { name?: string; version?: string };
    probed_at?: string;
    vocabulary?: Record<
      string,
      { budgets?: Record<string, unknown>; timeframes?: unknown[]; transforms?: unknown[] }
    >;
  }

  const artifact = JSON.parse(
    readFileSync('docs/battlegrid-vocabulary.json', 'utf8'),
  ) as Vocabulary;

  it('names the server it was taken from, and when', () => {
    expect(artifact.server?.name, `re-probe: ${REPROBE_VOCAB}`).toBeTruthy();
    expect(artifact.server?.version, `re-probe: ${REPROBE_VOCAB}`).toBeTruthy();
    expect(artifact.probed_at, `re-probe: ${REPROBE_VOCAB}`).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
    );
  });

  it('was taken from the same server version as the surface record', () => {
    /**
     * The two artifacts gate the same wire and regenerate by different
     * commands. Taken at different versions, whichever is older is describing
     * a platform that is gone — and nothing else compares them to each other.
     */
    expect(artifact.server?.version, `re-probe both: ${REPROBE} · ${REPROBE_VOCAB}`).toBe(
      surface.server?.version,
    );
  });

  it('records values, not shapes', () => {
    const categories = Object.entries(artifact.vocabulary ?? {});
    expect(categories.length, `no categories recorded — ${REPROBE_VOCAB}`).toBeGreaterThan(0);
    for (const [category, payload] of categories) {
      const budgets = Object.entries(payload.budgets ?? {});
      expect(budgets.length, `${category} records no budgets`).toBeGreaterThan(0);
      for (const [name, value] of budgets) {
        // `"int"` is the shape of a budget; 16 is a budget.
        expect(typeof value, `${category} budget ${name} is a shape, not a value`).toBe('number');
      }
      expect(payload.timeframes?.length, `${category} records no timeframes`).toBeGreaterThan(0);
      expect(payload.transforms?.length, `${category} records no transforms`).toBeGreaterThan(0);
    }
  });

  it('is the artifact the live vocabulary gate actually reads', () => {
    expect(readFileSync('tests/live/surface-freshness.test.ts', 'utf8')).toContain(
      'docs/battlegrid-vocabulary.json',
    );
  });
});
