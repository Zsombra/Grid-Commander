import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../support/canonical-json.js';

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
  instructions?: {
    chars?: number;
    sha256?: string;
    sha256_normalised?: string;
    addressee_normalisation?: { pattern?: string; replacement?: string };
    text?: string;
  };
  prompts?: Array<{
    name?: string;
    body?: string | null;
    body_sha256?: string;
    fetch_failed?: string;
  }>;
  resources?: Array<{
    name?: string;
    uri?: string;
    content?: string | null;
    content_sha256?: string;
    fetch_failed?: string;
  }>;
  authoring_vocabulary?: {
    note?: string;
    categories?: Record<
      string,
      { sha256?: string; payload?: Record<string, unknown>; fetch_failed?: string }
    >;
  };
}

const sha256 = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');

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

describe('the record carries every surface the server declares', () => {
  /**
   * The server declares four capability surfaces at `initialize`. For the
   * life of this record it carried one. Tool parity was genuine — and it was
   * the only thing checked, so a deploy that rewrote the strategy-authoring
   * contract or the grid-format rules *in prose* would have moved no test in
   * this repository. These assertions make a tools-only record fail the way
   * a versionless record already does.
   */
  it('carries the server instructions, digested', () => {
    expect(surface.instructions, `no instructions recorded — re-probe: ${REPROBE}`).toBeDefined();
    const ins = surface.instructions ?? {};
    expect(ins.text, `re-probe: ${REPROBE}`).toBeTruthy();
    expect(ins.sha256).toBe(sha256(ins.text ?? ''));
    expect(ins.chars).toBe((ins.text ?? '').length);
  });

  it('normalises the addressee by a rule the record itself states', () => {
    /**
     * The instructions greet the connected account by name. The record is
     * shared; the greeting is not. The comparable digest is taken after the
     * recorded normalisation — recomputed here from the record's own pattern,
     * so the Python that wrote it and the TypeScript that checks it cannot
     * drift apart without this failing.
     */
    const ins = surface.instructions ?? {};
    const rule = ins.addressee_normalisation ?? {};
    expect(rule.pattern, 'the record must state its own normalisation').toBeTruthy();
    const normalised = (ins.text ?? '').replace(
      new RegExp(rule.pattern ?? ''),
      rule.replacement ?? '',
    );
    expect(ins.sha256_normalised).toBe(sha256(normalised));
    // When the greeting is present the rule must actually bite — identical
    // digests would mean the guard is comparing account-addressed text again.
    // Guarded on the pattern matching so that a server which someday drops
    // the greeting fails the comparison honestly, not this assertion.
    if (new RegExp(rule.pattern ?? '').test(ins.text ?? '')) {
      expect(ins.sha256_normalised, 'the normalisation changed nothing').not.toBe(ins.sha256);
    }
  });

  it('carries every prompt with a fetched, digest-verified body', () => {
    const prompts = surface.prompts ?? [];
    expect(prompts.length, `no prompts recorded — re-probe: ${REPROBE}`).toBeGreaterThan(0);
    for (const p of prompts) {
      // A named failure is an honest *probe* outcome, but a committed record
      // is the one the guards read — shipping it with holes is how a surface
      // goes back to being unrecorded one entry at a time.
      expect(p.fetch_failed, `${String(p.name)}: body fetch failed — re-probe: ${REPROBE}`)
        .toBeUndefined();
      expect(p.body, `${String(p.name)} has no body`).toBeTruthy();
      expect(p.body_sha256, String(p.name)).toBe(sha256(p.body ?? ''));
    }
  });

  it('carries every resource with fetched, digest-verified content', () => {
    const resources = surface.resources ?? [];
    expect(resources.length, `no resources recorded — re-probe: ${REPROBE}`).toBeGreaterThan(0);
    for (const r of resources) {
      expect(r.fetch_failed, `${String(r.uri)}: read failed — re-probe: ${REPROBE}`).toBeUndefined();
      expect(r.content, `${String(r.uri)} has no content`).toBeTruthy();
      expect(r.content_sha256, String(r.uri)).toBe(sha256(r.content ?? ''));
    }
  });
});

describe('the authoring vocabulary is recorded as values, not shapes', () => {
  /**
   * The one exception to shapes-only, held to its purpose. The shape-record
   * once reduced `strategyConditions: 16` to `"int"` beside a compile schema
   * declaring `maxItems: 64` — a fourfold over-commitment nothing could see.
   * These assertions fail a record that regresses to shapes, ships a hole,
   * or hand-edits a payload without its digest.
   */
  const vocab = surface.authoring_vocabulary;
  const categories = Object.entries(vocab?.categories ?? {});

  it('carries every category, digest-verified, none failed', () => {
    expect(vocab, `no authoring vocabulary recorded — re-probe: ${REPROBE}`).toBeDefined();
    expect(categories.length, `no categories recorded — re-probe: ${REPROBE}`).toBeGreaterThan(0);
    for (const [name, entry] of categories) {
      expect(entry.fetch_failed, `${name}: fetch failed — re-probe: ${REPROBE}`).toBeUndefined();
      expect(entry.payload, `${name} has no payload`).toBeDefined();
      expect(entry.sha256, name).toBe(sha256(canonicalJson(entry.payload)));
    }
  });

  it('records values where the shape-record recorded type names', () => {
    for (const [name, entry] of categories) {
      const budgets = (entry.payload?.['budgets'] ?? {}) as Record<string, unknown>;
      expect(Object.keys(budgets).length, `${name}: no budgets`).toBeGreaterThan(0);
      for (const [gauge, value] of Object.entries(budgets)) {
        expect(typeof value, `${name}.budgets.${gauge} is a ${typeof value}, not a number`).toBe(
          'number',
        );
      }
      const timeframes = entry.payload?.['timeframes'];
      expect(Array.isArray(timeframes), `${name}: timeframes missing`).toBe(true);
      expect((timeframes as unknown[]).length, `${name}: no enabled timeframes`).toBeGreaterThan(0);
      for (const tf of timeframes as unknown[]) {
        expect(typeof tf, name).toBe('string');
      }
    }
  });
});

describe('the reference renders what the record carries', () => {
  /**
   * The generator loaded the instructions and discarded them on every run —
   * `init.get("instructions", "")`, written into memory, never into the
   * document. These assertions hold the human-readable reference to the
   * machine record so that cannot happen again.
   */
  const reference = readFileSync('docs/BATTLEGRID_MCP_REFERENCE.md', 'utf8');

  it('contains the server instructions verbatim', () => {
    expect(reference).toContain('## Server instructions');
    expect(reference, 'the instructions text itself, not just a heading').toContain(
      (surface.instructions?.text ?? '').slice(0, 200),
    );
  });

  it('contains a body for every recorded prompt and resource', () => {
    for (const p of surface.prompts ?? []) {
      expect(reference, `prompt ${String(p.name)}`).toContain('### `' + String(p.name) + '`');
    }
    for (const r of surface.resources ?? []) {
      expect(reference, `resource ${String(r.uri)}`).toContain(String(r.uri));
    }
    expect(reference, 'a captured record leaves no placeholder in the reference').not.toContain(
      'not captured in this dump',
    );
  });
});
