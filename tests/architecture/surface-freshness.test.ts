import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
     *
     * Kept as its own assertion for the vocabulary's sake, and **superseded in
     * scope** by `every committed record of the surface names one server`
     * below: this pair was compared and a third record was not, which is how
     * `battlegrid-mcp-capabilities.json` sat a major version behind (#198).
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

/**
 * Every committed record of the BattleGrid surface names one server.
 *
 * Three artifacts in `docs/` describe the same MCP server, written by three
 * different commands. Two of them were compared to each other — the check
 * directly above — and the third was not, so
 * `docs/battlegrid-mcp-capabilities.json` sat at **v17.2.0** while the surface
 * record said **v18.2.0**, hiding 188 output-schema leaves across 11 tools
 * (#198).
 *
 * **The guard that should have caught it was reading the wrong thing.**
 * `refresh_declared` in `tools/probe_mcp_surface.py` refuses when the two files
 * "disagree about which tools exist", on the stated grounds that a differing
 * tool set means snapshots of different deployments. v18 added no tools: the
 * count held at 114, none added, none removed, and the two files agreed
 * perfectly about which tools existed while describing generations a major
 * version apart. A guard written against *"a count that has not moved proves
 * nothing"* concluded currency from a matching set of names.
 *
 * So this sweep is **derived rather than enumerated**. A fourth record arriving
 * and not being compared is the same bug a third time, and a hard-coded pair is
 * exactly how it happened twice.
 *
 * Needs no credential and no network: every input is committed. There is
 * therefore no honest "could not check" state here, and none is offered —
 * unlike the live comparison, whose source can legitimately be unreachable.
 */
describe('every committed record of the surface names one server', () => {
  interface Named {
    readonly file: string;
    readonly version: string | undefined;
  }

  /**
   * A record's server identity, under either convention.
   *
   * `surface` and `vocabulary` are curated records and carry `server`.
   * `capabilities` is a faithful dump of the MCP handshake and carries the
   * protocol's own `serverInfo` — deliberately, because its value is being
   * diffable against what the server actually said. Reading both is honest;
   * rewriting one to match the other would edit the artifact whose point is
   * that it is unedited.
   */
  function versionOf(parsed: Record<string, unknown>): string | undefined {
    for (const key of ['server', 'serverInfo']) {
      const block = parsed[key];
      if (block && typeof block === 'object') {
        const v = (block as Record<string, unknown>)['version'];
        if (typeof v === 'string' && v.length > 0) return v;
      }
    }
    return undefined;
  }

  /**
   * Every `*.json` in a directory that claims to describe the MCP server.
   *
   * The directory is a parameter so the **failure** paths can be exercised.
   * Read against `docs/` alone, this sweep can only ever be tested while the
   * real records agree — which is to say its refusal could rot unnoticed, which
   * is the exact condition that produced #198 and that this file exists to end.
   * A guard whose failure path is only ever proven by a hand-run mutation is
   * proven until the person who ran it closes their terminal.
   */
  function records(dir = 'docs'): Named[] {
    return readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => `${dir}/${f}`)
      .map((file) => {
        const parsed = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
        const describesTheSurface = 'server' in parsed || 'serverInfo' in parsed;
        return describesTheSurface ? { file, version: versionOf(parsed) } : null;
      })
      .filter((r): r is Named => r !== null);
  }

  /** Writes records into a scratch directory and hands back its path. */
  function fixture(files: Record<string, unknown>): string {
    const dir = mkdtempSync(join(tmpdir(), 'records-'));
    for (const [name, body] of Object.entries(files)) {
      writeFileSync(join(dir, name), JSON.stringify(body));
    }
    return dir.split('\\').join('/');
  }

  const AT = (version: string) => ({ server: { name: 'battlegrid', version } });

  it('finds every record, and does not quietly find none', () => {
    /**
     * The sweep is derived from content, so a record that *loses* its server
     * block drops out of it silently — and a sweep over nothing passes. The
     * three known records are named here for that reason only: not as the
     * source of the list, but as proof the derivation still reaches them.
     */
    const found = records().map((r) => r.file);
    for (const known of [
      'docs/battlegrid-mcp-surface.json',
      'docs/battlegrid-vocabulary.json',
      'docs/battlegrid-mcp-capabilities.json',
    ]) {
      expect(found, `${known} no longer declares a server — it dropped out of the sweep`).toContain(
        known,
      );
    }
  });

  it('names a version in every one of them', () => {
    for (const { file, version } of records()) {
      expect(
        version,
        `${file} names no server version, so it cannot be compared — re-probe: ${REPROBE}`,
      ).toBeTruthy();
    }
  });

  it('agrees on which server, across all of them', () => {
    const found = records();
    const versions = [...new Set(found.map((r) => r.version))];
    expect(
      versions.length,
      `these records describe different generations of the server:\n` +
        found.map((r) => `    ${r.file} -> ${r.version ?? '(none)'}`).join('\n') +
        `\n  re-probe: ${REPROBE}` +
        `\n  re-capture the dump: BATTLEGRID_API_KEY=… python3 tools/capture_mcp_dump.py`,
    ).toBe(1);
  });

  /**
   * The refusal, driven rather than described.
   *
   * The assertions above run against the real records, which agree — so on
   * their own they can only ever prove the *passing* path, and the failing path
   * would be exactly as unexercised as the guard this change replaced. #198
   * happened because a refusal nobody had seen fire stopped being able to fire.
   * These feed it the drift.
   */
  describe('and refuses when they do not', () => {
    it('fails on two records from different generations', () => {
      const dir = fixture({ 'surface.json': AT('18.2.0'), 'caps.json': AT('17.2.0') });
      const versions = [...new Set(records(dir).map((r) => r.version))];
      expect(versions.sort()).toEqual(['17.2.0', '18.2.0']);
      expect(versions.length, 'a mismatched pair must not read as agreement').not.toBe(1);
    });

    it('sees identical tool sets as no evidence at all', () => {
      /**
       * The case the old guard could not see, and the reason this change
       * exists: v18 added no tools. Both records carry the *same* tool list —
       * identical, not merely the same size — and differ only in version.
       */
      const tools = [{ name: 'list_user_active_positions' }, { name: 'get_signal_log' }];
      const dir = fixture({
        'surface.json': { ...AT('18.2.0'), tools },
        'caps.json': { serverInfo: { name: 'battlegrid', version: '17.2.0' }, tools },
      });
      const found = records(dir);
      const toolNames = found.map((r) =>
        JSON.stringify(
          (JSON.parse(readFileSync(r.file, 'utf8')).tools as { name: string }[]).map((t) => t.name),
        ),
      );
      expect(new Set(toolNames).size, 'the fixture must have identical tool sets').toBe(1);
      expect(
        new Set(found.map((r) => r.version)).size,
        'matching tool sets must not conclude currency',
      ).toBe(2);
    });

    it('treats a record with no version as uncomparable, not as agreeing', () => {
      const dir = fixture({
        'surface.json': AT('18.2.0'),
        'caps.json': { server: { name: 'battlegrid' } },
      });
      const found = records(dir);
      expect(found.length, 'a record declaring a server stays in the sweep').toBe(2);
      expect(
        found.some((r) => r.version === undefined),
        'an absent version is not a match',
      ).toBe(true);
    });

    it('reads either spelling of the server block', () => {
      // The curated records carry `server`; the handshake dump carries
      // `serverInfo`. Same fact, two names — and missing one is how the dump
      // escaped the sweep for a major version.
      const dir = fixture({
        'curated.json': AT('18.2.0'),
        'dump.json': { serverInfo: { name: 'battlegrid', version: '18.2.0' } },
      });
      expect(records(dir).map((r) => r.version)).toEqual(['18.2.0', '18.2.0']);
    });
  });
});
