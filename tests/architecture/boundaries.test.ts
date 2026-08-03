import { readFileSync, readdirSync, statSync } from 'node:fs';
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
    const offenders = filesUnder('src').filter((f) =>
      /(^|[^.\w])console\.(log|info|warn|error|debug)\s*\(/.test(readFileSync(f, 'utf8')),
    );
    expect(offenders, 'use the structured logger, whose redaction list covers tokens').toEqual([]);
  });
});

describe('D-3 — no path can reach a wager-scoped operation', () => {
  it('requests only mcp:read', () => {
    const scope = readFileSync('src/domain/connection/scope.ts', 'utf8');
    const requested = /REQUESTED_SCOPES[^=]*=\s*\[([^\]]*)\]/.exec(scope)?.[1] ?? '';
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
      if (/new\s+Mcp\w*Adapter|new\s+Drizzle\w+/.test(code)) offenders.push(file);
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
      if (/\.decrypt\s*\(/.test(stripComments(readFileSync(file, 'utf8')))) offenders.push(file);
    }
    expect(offenders).toEqual([]);
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
   *
   * `agent-adapter.ts` is the single declared exception: the brain presets are a
   * closed enum in the create tool's schema with no endpoint that lists them, so
   * they live at the boundary where a schema surprise lands.
   */
  const PLATFORM_VALUES = ['WEBLEY', 'BERETTA', 'WALTHER', 'anthropic/claude'];

  it('names no model id or position-management preset outside the adapter', () => {
    const offenders: Array<[string, string]> = [];
    for (const file of [...filesUnder('src'), ...filesUnder('src', '.tsx')]) {
      if (file.includes('infrastructure/battlegrid')) continue;
      const text = readFileSync(file, 'utf8');
      for (const value of PLATFORM_VALUES) {
        if (text.includes(value)) offenders.push([file, value]);
      }
    }
    expect(offenders, 'read the catalog at runtime — the documented list was already stale').toEqual([]);
  });
});
