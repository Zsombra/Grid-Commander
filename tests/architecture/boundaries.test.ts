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

describe('P6 — one way in', () => {
  it('imports the MCP SDK in src/infrastructure/battlegrid/ and nowhere else', () => {
    const offenders: string[] = [];
    for (const file of filesUnder('src')) {
      if (file.includes('infrastructure/battlegrid')) continue;
      if (imports(file).some((i) => i.startsWith('@modelcontextprotocol/'))) offenders.push(file);
    }
    expect(offenders, 'every guarantee lives behind BattleGridPort; one bypass makes them advisory').toEqual([]);
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
