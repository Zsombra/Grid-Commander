import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The architecture, asserted.
 *
 * The ESLint rules enforce these too, but a lint rule is configuration someone
 * can relax in a hurry. These tests fail the build, and they name the policy
 * they are protecting so the reason survives.
 */

function filesUnder(dir: string, ext = '.ts'): string[] {
  let out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out = out.concat(filesUnder(full, ext));
    else if (full.endsWith(ext)) out.push(full);
  }
  return out;
}

/**
 * Drop comments so a scan can forbid a *use* of something while permitting the
 * explanation of why it is forbidden.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
}

const imports = (file: string): string[] =>
  [...readFileSync(file, 'utf8').matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]!);

/**
 * The rules, as named functions rather than regexes written where they are used.
 *
 * Not tidiness. Audited 2026-08-10 by mutation (GitHub #87): making `imports()`
 * return nothing left this file reporting **13 passed (13)**, with five rules
 * blind — P6, `src/mcp` reaches no port, the domain imports nothing outward, use
 * cases depend on ports, and W-D. That is the dependency rule in its entirety,
 * silent on one line, and no test anywhere signalled it.
 *
 * A matcher can only be fed a known violation if the proof can reach the same
 * one the scan uses. Where a pattern stayed inline, `the rules catch what they
 * were written for` at the bottom of this file would have had to retype it —
 * and a proof that retypes the rule guards its own copy, which is precisely how
 * `identifiers.test.ts` came to pass with both of its live matchers dead.
 */
const readsConsole = (code: string): boolean =>
  /(^|[^.\w])console\.(log|info|warn|error|debug)\s*\(/.test(code);

const constructsAdapter = (code: string): boolean => /new\s+Mcp\w*Adapter|new\s+Drizzle\w+/.test(code);

const decrypts = (code: string): boolean => /\.decrypt\s*\(/.test(code);

/** Readings of *now*. `new Date(ms)` formats a stamp the platform sent and is pure. */
const readsNow = (code: string): string[] =>
  [...code.matchAll(/Date\.now\s*\(\s*\)|new\s+Date\s*\(\s*\)/g)].map((m) => m[0]);

const requestedScopes = (source: string): string =>
  /REQUESTED_SCOPES[^=]*=\s*\[([^\]]*)\]/.exec(source)?.[1] ?? '';

/**
 * `agent-adapter.ts` is the single declared exception: the brain presets are a
 * closed enum in the create tool's schema with no endpoint that lists them, so
 * they live at the boundary where a schema surprise lands.
 */
const PLATFORM_VALUES = ['WEBLEY', 'BERETTA', 'WALTHER', 'anthropic/claude'];

const namesPlatformValue = (text: string): string[] => PLATFORM_VALUES.filter((v) => text.includes(v));

/**
 * A file outside the repository, for feeding `imports()` a violation.
 *
 * Outside deliberately: `imports()` takes a path and reads it, so proving it
 * means writing a file — and a fixture written under `src/` or `tests/` would
 * be scanned by the very rules above on the next run, or swept into a commit by
 * `git add -A`. That has happened here before.
 */
function aTempFile(content: string): string {
  const file = join(mkdtempSync(join(tmpdir(), 'boundaries-proof-')), 'subject.ts');
  writeFileSync(file, content);
  return file;
}

/**
 * This product speaks MCP twice, in opposite directions.
 *
 *   as a CLIENT of BattleGrid   → src/infrastructure/battlegrid/
 *   as a SERVER to the operator → src/mcp/
 *
 * The rule below named only the first for months, because only the first
 * existed. Its reason is unchanged and still binds everything: every
 * guarantee this product makes lives behind `BattleGridPort`, and one file
 * calling the platform around it makes all of them advisory.
 *
 * The server side calls nothing outward — it answers a model that connected
 * to us — so it cannot bypass anything. Two named directories rather than
 * one, and a third still fails.
 */
describe('P6 — one way in', () => {
  it('imports the MCP SDK only where each direction lives', () => {
    const offenders: string[] = [];
    for (const file of filesUnder('src')) {
      if (file.includes('infrastructure/battlegrid')) continue;
      if (file.includes('src/mcp/')) continue;
      if (imports(file).some((i) => i.startsWith('@modelcontextprotocol/'))) offenders.push(file);
    }
    expect(offenders, 'every guarantee lives behind BattleGridPort; one bypass makes them advisory').toEqual([]);
  });

  it('lets the server side reach nothing outward', () => {
    // The permission above is safe only because `src/mcp/` opens no
    // connection. If it ever builds a URL or touches a port, the widening
    // has become the loophole it was written not to be.
    for (const file of filesUnder('src/mcp')) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).not.toMatch(/https?:\/\//);
      expect(imports(file).filter((i) => i.startsWith('@/ports/')), file).toEqual([]);
    }
  });
});

describe('Clean Architecture — dependencies point inward', () => {
  it('the domain imports nothing outward', () => {
    const forbidden = [
      '@/infrastructure', '@/application', '@/presentation',
      'drizzle-orm', 'postgres', 'next', 'react', '@modelcontextprotocol',
    ];
    const offenders: Array<[string, string]> = [];
    for (const file of filesUnder('src/domain')) {
      for (const i of imports(file)) {
        if (forbidden.some((f) => i === f || i.startsWith(`${f}/`))) offenders.push([file, i]);
      }
    }
    expect(offenders, 'the domain must be testable without a database, a network, or a framework').toEqual([]);
  });

  it('use cases depend on ports, not on concrete adapters', () => {
    const offenders: Array<[string, string]> = [];
    for (const file of filesUnder('src/application')) {
      for (const i of imports(file)) {
        if (i.startsWith('@/infrastructure') || i === 'drizzle-orm' || i.startsWith('drizzle-orm/') || i === 'postgres') {
          offenders.push([file, i]);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('no credential ever reaches a log', () => {
  it('nothing in src/ calls console directly', () => {
    const offenders = filesUnder('src').filter((f) => readsConsole(readFileSync(f, 'utf8')));
    expect(offenders, 'use the structured logger, whose redaction list covers tokens').toEqual([]);
  });
});

describe('D-3 — no path can reach a wager-scoped operation', () => {
  it('requests only mcp:read', () => {
    const scope = readFileSync('src/domain/connection/scope.ts', 'utf8');
    const requested = requestedScopes(scope);
    expect(requested).toContain('mcp:read');
    expect(requested).not.toContain('mcp:wager');
  });
});

describe('W-D — routes are thin, and W-E — one way in', () => {
  const routeFiles = () => [...filesUnder('app', '.tsx'), ...filesUnder('app', '.ts')];

  /**
   * Everything a route might be tempted to do is already implemented and tested
   * one layer down. A route that re-checks capacity, or re-validates a bound,
   * creates a second answer that will drift from the first — and the first is
   * the one with the tests.
   */
  it('no file under app/ imports infrastructure or the domain', () => {
    const offenders: Array<[string, string]> = [];
    for (const file of routeFiles()) {
      for (const i of imports(file)) {
        // `@/domain/errors.js` is the one exception: a route must be able to
        // recognise a domain error to decide what to render, and importing the
        // error type is not reaching past the layer.
        if (i === '@/domain/errors.js') continue;
        if (i.startsWith('@/infrastructure') || i.startsWith('@/domain')) offenders.push([file, i]);
      }
    }
    expect(offenders, 'routes call use cases; they do not reach past them').toEqual([]);
  });

  it('no route constructs an adapter of its own', () => {
    const offenders: string[] = [];
    for (const file of routeFiles()) {
      const code = stripComments(readFileSync(file, 'utf8'));
      if (constructsAdapter(code)) offenders.push(file);
    }
    expect(offenders, 'the composition root is the only place adapters are built').toEqual([]);
  });

  it('only resolve-authority reads a stored token', () => {
    // The single decryption point. Scattering it would scatter the refresh with
    // it, and one caller would forget. See design W-B.
    const offenders: string[] = [];
    for (const file of [...filesUnder('src'), ...routeFiles()]) {
      if (file.includes('resolve-authority')) continue;
      if (file.includes('drizzle-connection-repository')) continue;
      if (decrypts(stripComments(readFileSync(file, 'utf8')))) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});

describe('the clock is a port — nothing that renders reads it directly', () => {
  /**
   * `Clock` exists so that what a page *says* can be pinned by a test.
   *
   * The exposure panel now states how stale its figures are — "priced 4 minutes
   * ago", against a `refreshIntervalMs: 10000` the platform sends and a
   * server-rendered page cannot honour. Measured with `Date.now()` inside the
   * component, that sentence would be a different string on every run, and the
   * only way to test it would be to freeze global time — the flaky-fixture
   * shape this repository has already paid for once.
   *
   * So the age is measured in the read, against the injected clock, and the
   * surface only words it. Routes are excluded deliberately: this is a rule
   * about rendering, and `app/api/auth/battlegrid/callback/route.ts` stamps a
   * session at the moment it issues one.
   */
  const renderingFiles = () => [...filesUnder('src/presentation', '.tsx'), ...filesUnder('app', '.tsx')];

  it('measures no time of its own', () => {
    const offenders: Array<[string, string]> = [];
    for (const file of renderingFiles()) {
      const code = stripComments(readFileSync(file, 'utf8'));
      for (const found of readsNow(code)) offenders.push([file, found]);
    }
    expect(offenders, 'take now from Clock in the use case; render what it produced').toEqual([]);
  });

  it('is looking at files, and at a surface that does state an age', () => {
    // Both halves of vacuity: a scan that found nothing, and a rule protecting
    // a property no code has any more.
    expect(renderingFiles().length).toBeGreaterThan(10);
    expect(readFileSync('src/application/use-cases/read-exposure.query.ts', 'utf8')).toContain(
      "@/ports/clock.js",
    );
  });
});

describe('AL-2 — canDelete does not exist in this product', () => {
  /**
   * The live agent payload sets `capabilities.canDelete: true`, and the MCP
   * surface has no delete tool: the flag describes what BattleGrid's own app
   * can do. Mapping it — even to assert on it — puts a delete affordance one
   * careless `Object.entries(permissions)` away from existing.
   *
   * The mapper's own test asserts the field is dropped. This asserts nobody
   * reintroduces it anywhere else.
   */
  it('appears in no code, only in the comments explaining why', () => {
    // Comments recording *why* the flag is ignored are the point — deleting
    // them is how the reasoning gets lost and the field gets mapped back in.
    // Code that reads it is the violation.
    const offenders = [...filesUnder('src'), ...filesUnder('src', '.tsx'), ...filesUnder('app', '.tsx')].filter(
      (f) => stripComments(readFileSync(f, 'utf8')).includes('canDelete'),
    );
    expect(offenders, 'BattleGrid offers no delete over MCP — see findings-agents F-1').toEqual([]);
  });
});

describe('AL-1 — platform vocabulary is read, not written down', () => {
  /**
   * The repo's own surface map listed four position-management presets one week
   * before the live server returned five (findings-agents F-3). A literal list
   * anywhere outside the adapter boundary would offer a stale set and reject a
   * valid value.
   */
  it('names no model id or position-management preset outside the adapter', () => {
    const offenders: Array<[string, string]> = [];
    for (const file of [...filesUnder('src'), ...filesUnder('src', '.tsx')]) {
      if (file.includes('infrastructure/battlegrid')) continue;
      const text = readFileSync(file, 'utf8');
      for (const value of namesPlatformValue(text)) offenders.push([file, value]);
    }
    expect(offenders, 'read the catalog at runtime — the documented list was already stale').toEqual([]);
  });
});

/**
 * The rules, fed the violations they exist to catch.
 *
 * Audited 2026-08-10 by mutation (GitHub #87). Making `imports()` return nothing
 * left this file reporting **13 passed (13)** — five rules blind at once, and the
 * five are the dependency rule itself. Nothing else in the file noticed, because
 * the other eight rules do not go through it and went on passing for their own
 * reasons.
 *
 * A corpus floor would not have caught it. Counting the files a sweep read
 * answers whether files were found; it cannot answer whether anything in them
 * could be. Every guard in this directory had a corpus floor while its rules
 * were blind, so what follows feeds each matcher an input it must report and an
 * input it must not — because a matcher that finds everything silences a rule
 * exactly as thoroughly as one that finds nothing.
 *
 * Reproduce any row with:
 *
 *   node tools/mutate-guard.mjs tests/architecture/boundaries.test.ts '<find>' '<replace>'
 */
describe('the rules catch what they were written for', () => {
  it('reads an import off every shape the codebase actually writes', () => {
    const file = aTempFile(`
      import { readFileSync } from 'node:fs';
      import type { AgentsPort } from "@/ports/agents.js";
      export { thing } from '@/domain/agent/catalog.js';
      import Default from '@modelcontextprotocol/sdk/client/index.js';
    `);
    expect(imports(file)).toEqual([
      'node:fs',
      '@/ports/agents.js',
      '@/domain/agent/catalog.js',
      '@modelcontextprotocol/sdk/client/index.js',
    ]);
  });

  it('reports nothing for a file that imports nothing', () => {
    // Without this, `imports()` returning a fixed list would satisfy every
    // assertion above — the permissive direction, which silences a rule as
    // completely as a blind one and is the half that usually goes unproven.
    expect(imports(aTempFile('export const two = 1 + 1;\n'))).toEqual([]);
  });

  it('resolves the imports real source is known to contain', () => {
    // Stronger than a corpus floor, and the one thing in this directory that
    // survived its own mutation was built this way: assert the matcher works
    // against the tree it will actually scan, not only against a fixture.
    // Two files chosen because the rules above actually read them: the
    // composition root is the one place allowed to import drizzle, and a use
    // case importing a port is the shape `use cases depend on ports` inspects.
    expect(imports('src/composition.ts')).toContain('drizzle-orm');
    expect(imports('src/application/use-cases/read-risk-reading.query.ts')).toContain('@/ports/agents.js');
  });

  it('catches a credential reaching a log, and leaves a method named log alone', () => {
    expect(readsConsole('console.error(token);')).toBe(true);
    expect(readsConsole('  console.log("x")')).toBe(true);
    // The reason the pattern has a leading-character class at all.
    expect(readsConsole('this.logger.log(safe);')).toBe(false);
    expect(readsConsole('audit.console.log(x);')).toBe(false);
  });

  it('catches a route building its own adapter', () => {
    expect(constructsAdapter('const a = new McpAgentsAdapter(client);')).toBe(true);
    expect(constructsAdapter('new DrizzleConnectionRepository(db)')).toBe(true);
    expect(constructsAdapter('const q = new ListAgentsQuery(agents);')).toBe(false);
  });

  it('catches a second decryption point', () => {
    expect(decrypts('const t = await crypto.decrypt(stored);')).toBe(true);
    expect(decrypts('const t = await crypto.encrypt(plain);')).toBe(false);
  });

  it('catches a reading of now, and permits formatting a stamp the platform sent', () => {
    expect(readsNow('const at = Date.now();')).toEqual(['Date.now()']);
    expect(readsNow('const at = new Date();')).toEqual(['new Date()']);
    // The distinction the rule turns on: this is pure, and banning it would
    // make every date on every surface unformattable.
    expect(readsNow('new Date(outcome.closedAt).toISOString()')).toEqual([]);
  });

  it('reads the scopes actually requested, and not the ones merely mentioned', () => {
    expect(requestedScopes("const REQUESTED_SCOPES = ['mcp:read'];")).toContain('mcp:read');
    expect(requestedScopes("export const REQUESTED_SCOPES: string[] = ['mcp:read', 'mcp:wager'];")).toContain(
      'mcp:wager',
    );
    // A file that never declares the constant must yield nothing, or the rule
    // would read a comment about wager scope as a request for it.
    expect(requestedScopes('// we never request mcp:wager\n')).toBe('');
  });

  it('catches platform vocabulary written down outside the adapter', () => {
    expect(namesPlatformValue("preset: 'WALTHER'")).toEqual(['WALTHER']);
    expect(namesPlatformValue("model: 'anthropic/claude-sonnet-4'")).toEqual(['anthropic/claude']);
    expect(namesPlatformValue('preset: catalog.presets[0]')).toEqual([]);
  });

  it('walks a directory rather than reporting an empty one', () => {
    // `filesUnder` feeds every rule above. If it returned [] the whole file
    // would pass having scanned nothing, and only two of the thirteen rules
    // carry a corpus floor that would notice.
    expect(filesUnder('src/domain').length).toBeGreaterThan(10);
    expect(filesUnder('src').every((f) => f.endsWith('.ts'))).toBe(true);
    expect(filesUnder('src', '.tsx').some((f) => f.endsWith('.tsx'))).toBe(true);
  });

  it('drops comments without dropping the code around them', () => {
    // A `stripComments` that returned '' would make every scan above clean.
    expect(stripComments('/* console.log(x) */\nconst a = 1;')).toContain('const a = 1');
    expect(stripComments('/* console.log(x) */\nconst a = 1;')).not.toContain('console.log');
    expect(stripComments('// console.log(x)\nconst b = 2;')).not.toContain('console.log');
  });
});
