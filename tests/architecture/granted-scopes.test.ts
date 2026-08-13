import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { slashed } from '../support/source-tree.js';

/**
 * Only one call may name its own authority.
 *
 * `ToolCallRequest.grantedScopes` tells the guard what to measure a call
 * against, instead of reading it from the caller's stored connection. Exactly
 * one call needs that, and it is a narrow one: establishing which account an
 * authorization grant acts as, which runs *before* the connection exists and so
 * has no row to read.
 *
 * It exists because the alternative was worse and was shipped. Without it, the
 * account read was measured against a connection that cannot exist yet, the
 * lookup answered "no authority at all", and the call was refused for lacking
 * `mcp:read` while the grant in hand was holding `mcp:read`. The first real
 * delegated authorization hit it (2026-08-13) and the whole offline suite was
 * green, because every test fakes the port and both live probes wired a
 * personal deployment, whose scopes come from configuration.
 *
 * **But a field that lets a caller assert its own authority is exactly the
 * shape of thing that spreads.** Every subsequent use would be a caller
 * declaring what it is allowed to do, which is what the guard exists to stop it
 * doing. So the boundary is derived and held here rather than left to reviewers
 * noticing.
 *
 * Derived from reachability, not from a name: the check is which files *supply*
 * the field to a call, not which files mention it. The type definition and this
 * file mention it and supply nothing.
 */

const SOURCE_DIRS = ['src', 'app'];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(slashed(full));
  }
  return out;
}

const sourceFiles = SOURCE_DIRS.flatMap((d) => walk(d));

/** Where the field is declared, rather than handed to a call. */
const DECLARES = new Set([
  // The contract itself.
  'src/ports/battlegrid.ts',
  // The port method that carries it through, and its one implementation.
  'src/ports/account.ts',
  // Reads it off the request to decide what to measure against.
  'src/infrastructure/battlegrid/mcp-adapter.ts',
]);

/**
 * Files that put `grantedScopes` into an object literal — i.e. supply it to a
 * call — as opposed to declaring or forwarding a parameter of that name.
 */
function suppliers(): string[] {
  const found: string[] = [];
  for (const file of sourceFiles) {
    if (DECLARES.has(file)) continue;
    const text = readFileSync(file, 'utf8');
    // `grantedScopes,` or `grantedScopes:` inside a call/object position.
    if (/\bgrantedScopes\s*[,:]/.test(text)) found.push(file);
  }
  return found;
}

describe('only the account read may declare its own authority', () => {
  it('has exactly one supplier, and it is the account adapter', () => {
    expect(
      suppliers(),
      'a caller asserting its own scopes is what the scope guard exists to prevent',
    ).toEqual(['src/infrastructure/battlegrid/account-adapter.ts']);
  });

  it('the connect path passes the grant’s scopes rather than omitting them', () => {
    // The defect was an omission, so the guard has to check the argument is
    // there — not merely that the field exists somewhere in the tree.
    const connect = readFileSync('src/application/use-cases/connect.commands.ts', 'utf8');
    expect(connect).toMatch(/subjectFor\(\s*grant\.accessToken\s*,\s*grant\.scopes\s*\)/);
  });

  it('is looking at the source it thinks it is', () => {
    // A scan that silently found nothing would pass vacuously, which is the
    // failure this directory exists to prevent.
    expect(sourceFiles.length).toBeGreaterThan(40);
    for (const declared of DECLARES) {
      expect(sourceFiles, `${declared} should be in the scanned set`).toContain(declared);
      expect(readFileSync(declared, 'utf8')).toContain('grantedScopes');
    }
  });
});
