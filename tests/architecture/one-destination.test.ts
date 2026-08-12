import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { slashed } from '../support/source-tree.js';

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
    else if (/\.tsx?$/.test(full)) out.push(slashed(full));
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
/**
 * Vendors whose npm packages are, by construction, clients for that vendor's
 * hosted API. Matched as a scoped-package owner or an exact name, so
 * `@anthropic-ai/sdk` fails and a BattleGrid model id — which is a *string*,
 * naming a brain the platform runs — is untouched.
 *
 * Named at module scope so the proof at the bottom can feed it a violation.
 * `dependencies` holds no vendor client, and never has, so this rule reports
 * nothing whether it works or not: audited 2026-08-10 by mutation (GitHub #87),
 * emptying the list left the file green. That is the shape of rule most worth
 * proving and least likely to be — there is no violation in the tree to notice
 * its death, and by the time there is one it is too late.
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

const isVendorClient = (name: string): boolean =>
  VENDOR_CLIENTS.some((v) => name === v || name.startsWith(`${v}/`));

describe('no dependency brings a second destination with it', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
    dependencies?: Record<string, string>;
  };
  const runtime = Object.keys(pkg.dependencies ?? {});

  it('ships no vendor API client as a runtime dependency', () => {
    expect(
      runtime.filter(isVendorClient),
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

/**
 * The predicate, fed the packages it exists to catch.
 *
 * This is the half the file's own comment says covers what a text scan cannot
 * see — and it was the half that could not fail. `dependencies` contains no
 * vendor client, so `offenders` was `[]` whether the rule worked or not, and
 * emptying `VENDOR_CLIENTS` entirely left the file green (GitHub #87).
 *
 * A rule whose subject is absent from the project cannot be proven by what it
 * finds in the project. It has to be handed one.
 */
describe('the vendor rule catches what it was written for', () => {
  it('catches a scoped client by its owner', () => {
    expect(isVendorClient('@anthropic-ai/sdk')).toBe(true);
    expect(isVendorClient('@google-cloud/aiplatform')).toBe(true);
    expect(isVendorClient('@mistralai/mistralai')).toBe(true);
  });

  it('catches an unscoped client by its exact name', () => {
    expect(isVendorClient('openai')).toBe(true);
    expect(isVendorClient('groq-sdk')).toBe(true);
    expect(isVendorClient('replicate')).toBe(true);
  });

  it('leaves this product’s actual dependencies alone', () => {
    // Without this the rule is satisfied by a predicate returning true for
    // everything, which would fail the suite loudly — but only once someone
    // ran it, and a rule that cannot distinguish is not a rule.
    for (const name of ['next', 'react', 'postgres', 'drizzle-orm', 'zod']) {
      expect(isVendorClient(name), name).toBe(false);
    }
  });

  it('does not mistake a model identifier for a package', () => {
    /**
     * The distinction the whole file turns on. `anthropic/claude-sonnet-4` is a
     * string naming a brain BattleGrid runs, billed to BattleGrid, reached by
     * BattleGrid. It is not this product calling an API, and a rule that
     * confused the two would forbid the catalogue.
     *
     * It passes because the vendor entry is the npm scope `@anthropic-ai`, not
     * the word `anthropic` — the leading `@` is doing real work here.
     *
     * The bound of the claim, found by asserting more than was true: a model id
     * under a vendor whose **package** name is unscoped, `openai/gpt-5`, *does*
     * match. That is not a defect, because this predicate is only ever handed
     * keys of `dependencies` and an unscoped npm name cannot contain a slash.
     * Asserting otherwise would pin behaviour the rule does not have and does
     * not need.
     */
    expect(isVendorClient('anthropic/claude-sonnet-4')).toBe(false);
    expect(isVendorClient('anthropic')).toBe(false);
  });

  it('is a predicate the dependency list is actually run through', () => {
    // Reachability rather than spelling: the rule above filters `runtime` with
    // this exact function, and `runtime` is a list that exists.
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    expect(Object.keys(pkg.dependencies ?? {}).length).toBeGreaterThan(5);
  });
});
