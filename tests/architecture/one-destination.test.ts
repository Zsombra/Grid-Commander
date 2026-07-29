import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * This product reaches BattleGrid, and nothing else.
 *
 * Not a style rule. A second outbound destination is a second place a user's
 * data can go, a second credential to hold, and a second reason a deployment can
 * fail — so it has to be a decision someone makes on purpose rather than
 * something that accumulates.
 *
 * One had accumulated. `@anthropic-ai/sdk` sat in `package.json` powering an
 * assistant that could never be exercised: no `ANTHROPIC_API_KEY` existed in any
 * environment this product was built in, so the page shipped saying it was
 * unavailable and naming the pages that worked instead. Sixteen files and a nav
 * entry whose whole function was to announce their own absence.
 *
 * Both halves below are derived. An allowlist of permitted hosts would pass
 * while a seventeenth was added, which is the failure mode every guard in this
 * directory carries a comment about.
 */

const SOURCE_DIRS = ['src', 'app'];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

const sourceFiles = SOURCE_DIRS.flatMap((d) => walk(d));
const read = (f: string) => readFileSync(f, 'utf8');

/**
 * Every absolute URL the application can build, with its source.
 *
 * Loopback is excluded because it is not a destination — it is this process.
 * `example.invalid` is reserved by RFC 2606 precisely so it can appear in
 * documentation and never resolve.
 */
function outboundHosts(): Array<{ file: string; host: string }> {
  const found: Array<{ file: string; host: string }> = [];
  for (const file of sourceFiles) {
    for (const m of read(file).matchAll(/https?:\/\/([a-zA-Z0-9.-]+)/g)) {
      const host = m[1] as string;
      if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(host)) continue;
      if (host.endsWith('example.invalid')) continue;
      // Namespaces and spec URLs are identifiers, not destinations: nothing is
      // fetched from them. `w3.org` appears in SVG markup.
      if (/(^|\.)w3\.org$/.test(host) || /(^|\.)json-schema\.org$/.test(host)) continue;
      found.push({ file, host });
    }
  }
  return found;
}

describe('the application has one outbound destination', () => {
  it('reaches BattleGrid and nowhere else', () => {
    const hosts = outboundHosts();
    const distinct = [...new Set(hosts.map((h) => h.host))].sort();

    expect(
      distinct.map((h) => `${h}  (${hosts.filter((x) => x.host === h).map((x) => x.file).join(', ')})`),
      'every host the application can reach',
    ).toEqual(['mcp.battlegrid.trade  (src/config.ts)']);
  });

  it('is looking at the source it thinks it is', () => {
    // A scan that silently found nothing would pass vacuously, which is the
    // failure this whole directory exists to prevent.
    expect(sourceFiles.length).toBeGreaterThan(40);
    expect(outboundHosts().length).toBeGreaterThan(0);
  });
});

/**
 * A URL in source is not the only way to reach a host.
 *
 * `@anthropic-ai/sdk` carries its own base URL, so the scan above saw nothing —
 * the application talked to `api.anthropic.com` without the string ever
 * appearing in `src/`. A guard that only reads source text would have called
 * that a single-destination product, which is how the dependency survived being
 * unexercisable for the life of the repository.
 *
 * So the dependency list is checked too, and derived: any package that exists to
 * call somebody's service fails, rather than a named ban on one of them.
 */
describe('no dependency brings a second destination with it', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
    dependencies?: Record<string, string>;
  };
  const runtime = Object.keys(pkg.dependencies ?? {});

  it('ships no vendor API client as a runtime dependency', () => {
    /**
     * Vendors whose npm packages are, by construction, clients for that
     * vendor's hosted API. Matched as a scoped-package owner or an exact name,
     * so `@anthropic-ai/sdk` fails and a BattleGrid model id — which is a
     * *string*, naming a brain the platform runs — is untouched.
     */
    const VENDOR_CLIENTS = [
      '@anthropic-ai',
      'openai',
      '@google-cloud',
      '@google/generative-ai',
      'cohere-ai',
      '@mistralai',
      'replicate',
      'groq-sdk',
    ];

    const offenders = runtime.filter((name) =>
      VENDOR_CLIENTS.some((v) => name === v || name.startsWith(`${v}/`)),
    );

    expect(
      offenders,
      'these call a service that is not BattleGrid — see app-access, one destination',
    ).toEqual([]);
  });

  it('reads a dependency list that exists', () => {
    expect(runtime.length).toBeGreaterThan(5);
    // The database and the framework are expected; this asserts the scan is
    // pointed at real content rather than an empty object.
    expect(runtime).toContain('next');
  });
});

/**
 * The distinction that must survive a future cleanup.
 *
 * BattleGrid's approved-model catalogue is full of `anthropic/claude-…`
 * identifiers, and they are nothing to do with this product calling an API. They
 * name the brain a *BattleGrid agent* thinks with — inference the platform runs,
 * reached by the platform, billed to the platform.
 *
 * Someone removing "the Anthropic dependency" could reasonably grep for
 * `anthropic` and delete these too, which would break agent creation. Stated
 * here so the grep finds an explanation.
 */
describe('a model identifier is not a destination', () => {
  it('keeps BattleGrid’s approved model ids', () => {
    const catalog = readFileSync('tests/support/agent-fakes.ts', 'utf8');
    expect(catalog, 'an agent brain names a model the platform runs').toContain('anthropic/claude');
  });

  it('and reaches none of them from here', () => {
    const hosts = outboundHosts().map((h) => h.host);
    expect(hosts.some((h) => h.includes('anthropic'))).toBe(false);
  });
});
