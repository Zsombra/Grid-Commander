import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { slashed } from '../support/source-tree.js';

/**
 * One defect, four times, in four layers:
 *
 *   PG-003  `expectedRevision ?? -1`              domain error
 *   PG-101  `slotUsage.limit ?? 0`                agent mapper
 *   PG-201  `Number(formData.get('...'))`         route handler
 *   PG-301  `String(s['id'] ?? '')`, `revision : 0`   strategy mapper
 *
 * A guard for it was added after the third, in `wire-the-app`. It scans form
 * coercions and `<identifier> ?? <value>`. PG-301 matched neither pattern, so
 * **the fourth occurred and the build stayed green** — a human reading scan
 * output caught it, which is the work the guard existed to replace.
 *
 * This file is the rule that would have caught PG-301, written to the shape the
 * defect actually takes rather than the shape the last one took: an identifier
 * extracted from an untyped payload, given a literal fallback instead of a
 * refusal.
 *
 * A guard that misses the next instance is worse than none, because it creates a
 * belief the class is covered.
 */

const IDENTIFIER_KEYS = [
  'id',
  'agentId',
  'strategyId',
  'revision',
  'expectedRevision',
  'sourceRevision',
  'proposedRevision',
  'userId',
  'battlegridSubject',
];

/**
 * Where untyped payloads become domain objects.
 *
 * The Drizzle repositories are excluded on purpose: they read columns whose
 * types the schema guarantees, so `row.id` is a `string` by construction rather
 * than a hope. The BattleGrid boundary has no such guarantee — everything
 * arriving there is `unknown`.
 */
const UNTYPED_BOUNDARY = 'src/infrastructure/battlegrid';

function filesUnder(dir: string, ext = '.ts'): string[] {
  let out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry).replace(/\\/g, '/');
    if (statSync(full).isDirectory()) out = out.concat(filesUnder(full, ext));
    else if (full.endsWith(ext)) out.push(slashed(full));
  }

  return out;
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
}

/**
 * The two shapes PG-301 took, as one pair of functions the scans and the proof
 * both call.
 *
 * They used to be four regexes: two written inline in the tests below, and two
 * re-declared verbatim inside `check()` at the bottom of this file. That made
 * this file the reference implementation for self-testing a guard *and* the
 * clearest example of how self-testing goes wrong — audited 2026-08-10 by
 * mutation (GitHub #87), killing only the two live copies left the file green,
 * because `check()` went on exercising its own transcription. The proof
 * demonstrated that a copy of the rule worked while the rule was dead.
 *
 * Two copies of a rule is the same defect this codebase keeps recording
 * everywhere else. There is now one copy.
 */

/** `id ?? ''` — a fallback that substitutes a value nobody read. */
function nullishFallbacks(code: string): string[] {
  const out: string[] = [];
  for (const key of IDENTIFIER_KEYS) {
    const pattern = new RegExp(`\\b${key}\\b['"\\]]*\\s*\\?\\?\\s*([^,;)\\n]+)`, 'g');
    for (const [, fallback] of code.matchAll(pattern)) {
      const value = fallback?.trim() ?? '';
      // `?? null` is permitted — it is how absence is *represented*, and the
      // caller must then decide.
      if (value !== 'null') out.push(`${key} ?? ${value}`);
    }
  }
  return out;
}

/** `revision: typeof x === 'number' ? x : 0` — the half with no `??` in it. */
function ternaryFallbacks(code: string): string[] {
  const out: string[] = [];
  for (const key of IDENTIFIER_KEYS) {
    // `key: <anything> ? <anything> : <literal>` where the literal is a number
    // or a quoted string — i.e. an invented value, not `null`.
    const pattern = new RegExp(
      `\\b${key}:\\s*[^,;\\n]*\\?[^,;\\n]*:\\s*(-?\\d+(?:\\.\\d+)?|'[^']*'|"[^"]*")\\s*[,;\\n]`,
      'g',
    );
    for (const [, literal] of code.matchAll(pattern)) out.push(`${key} … : ${literal}`);
  }
  return out;
}

describe('an identifier is never defaulted at the untyped boundary', () => {
  const boundaryFiles = filesUnder('src').filter((f) => f.includes(UNTYPED_BOUNDARY));

  it('covers the files it claims to', () => {
    // A rule scanning nothing passes trivially. This is the assertion that
    // notices when the boundary moves.
    expect(boundaryFiles.length).toBeGreaterThan(0);
    expect(boundaryFiles.some((f) => f.includes('mapper'))).toBe(true);
  });

  /**
   * `?? <literal>` on an identifier. PG-003's shape and half of PG-301's.
   *
   * `?? null` is permitted — it is how absence is *represented*, and the caller
   * must then decide. Anything else substitutes a value nobody read.
   */
  it('gives no identifier a literal ?? fallback', () => {
    const offenders: string[] = [];
    for (const file of boundaryFiles) {
      const code = stripComments(readFileSync(file, 'utf8'));
      for (const found of nullishFallbacks(code)) offenders.push(`${file}: ${found}`);
    }
    expect(offenders, 'an absent identifier is a refusal, not a default').toEqual([]);
  });

  /**
   * `typeof x === 'number' ? x : 0`. The other half of PG-301, and the one the
   * previous guard could never have seen — there is no `??` in it at all.
   */
  it('gives no identifier a ternary literal fallback', () => {
    const offenders: string[] = [];
    for (const file of boundaryFiles) {
      const code = stripComments(readFileSync(file, 'utf8'));
      for (const found of ternaryFallbacks(code)) offenders.push(`${file}: ${found}`);
    }
    expect(
      offenders,
      'PG-301 was `revision: typeof s.revision === "number" ? s.revision : 0` — no `??` in sight',
    ).toEqual([]);
  });

  /**
   * The positive half. A scan for known bad shapes only ever catches the shapes
   * already seen; requiring the *right* shape catches the ones that have not
   * been invented yet.
   *
   * **There are two ways to refuse, and both are honest.** Throwing is right
   * where the row *is* the entity: an agent whose id could not be read must
   * not become an agent, and the whole read fails. Returning null and
   * filtering the row out is right where the row is one of many and the rest
   * still answer — dropping one unattributable competitor from a ranking of
   * 37 loses less than refusing the ranking, and the reader could not have
   * looked that row up anyway.
   *
   * What is banned is neither: producing an entity whose identifier was
   * invented. So a mapper must show one of the two refusals, and the
   * drop-and-filter shape must actually filter — `return null` alone would
   * let a nulled row reach a caller that never checked.
   */
  it('every mapper that produces an entity refuses a payload without one', () => {
    const mappers = boundaryFiles.filter((f) => /mapper|adapter/.test(f));
    const producing = mappers.filter((f) => {
      const code = stripComments(readFileSync(f, 'utf8'));
      // Files that read `id` or `revision` off an untyped payload.
      const readsAnIdentifier = /\b(id|revision)\b['"\]]*\s*(===|!==|\?\?|:)/.test(code);
      const refusesByThrowing = /\bthrow\b|Error\(/.test(code);
      const refusesByDropping = /return null/.test(code) && /\.filter\(/.test(code);
      return readsAnIdentifier && !refusesByThrowing && !refusesByDropping;
    });
    expect(
      producing,
      'a mapper reading an identifier off an untyped payload must be able to refuse it',
    ).toEqual([]);
  });

  /**
   * The drop-and-filter refusal, pinned by name.
   *
   * Widening the rule above to admit a second refusal shape is only safe if
   * the file that prompted it is held to actually using it — otherwise the
   * widening is a loophole rather than a distinction.
   */
  it('the explorer adapter drops unattributable rows rather than naming them', () => {
    const code = stripComments(
      readFileSync('src/infrastructure/battlegrid/explorer-adapter.ts', 'utf8'),
    );
    // Every id read is followed by a refusal, and every mapped list is filtered.
    expect(code).toMatch(/if \(agentId === null\) return null/);
    expect(code).toMatch(/if \(provider === null\) return null/);
    expect(code).toMatch(/if \(id === null\) return null/);
    expect(code).toMatch(/\.filter\(/);
    // And no identifier is ever defaulted into existence.
    expect(code).not.toMatch(/agentId:\s*str\([^)]*\)\s*\?\?\s*['"]/);
  });

  it('the two mappers that exist both throw by name', () => {
    // Named explicitly so deleting a guard fails here rather than silently
    // widening the rule above.
    const agent = readFileSync('src/infrastructure/battlegrid/agent-mapper.ts', 'utf8');
    const strategy = readFileSync('src/infrastructure/battlegrid/strategy-adapter.ts', 'utf8');
    expect(agent).toMatch(/throw new AgentPayloadError\('id'\)/);
    expect(agent).toMatch(/throw new AgentPayloadError\('revision'\)/);
    expect(strategy).toMatch(/throw new StrategyPayloadError\('id'\)/);
    expect(strategy).toMatch(/throw new StrategyPayloadError\('revision'\)/);
  });
});

/**
 * The rule is only worth having if it fails on the real defect. These reproduce
 * PG-301 exactly and assert the patterns above would have rejected it — because
 * a guard nobody has seen fail is a guard nobody knows works.
 */
describe('the rule catches PG-301 as it was actually written', () => {
  /**
   * The **live** matchers, not a transcription of them.
   *
   * This used to re-declare both regexes here. Breaking only the copies the
   * scans use left every case below green, so the block proved a duplicate
   * worked while the rule was dead — found by mutation on 2026-08-10, in the
   * file this repository points at as the example to follow.
   */
  const check = (code: string): string[] => [...nullishFallbacks(code), ...ternaryFallbacks(code)];

  it('rejects the empty-string id', () => {
    expect(check(`  id: String(s['id'] ?? ''),\n`)).not.toEqual([]);
  });

  it('rejects the zero revision', () => {
    expect(check(`  revision: typeof s['revision'] === 'number' ? s['revision'] : 0,\n`)).not.toEqual([]);
  });

  it('rejects PG-003’s shape too', () => {
    expect(check(`  expectedRevision ?? -1,\n`)).not.toEqual([]);
  });

  it('permits the guarded form both mappers now use', () => {
    expect(
      check(`  const id = typeof s['id'] === 'string' && s['id'].length > 0 ? s['id'] : null;\n  id,\n`),
    ).toEqual([]);
  });

  it('permits `?? null`, which represents absence rather than hiding it', () => {
    expect(check(`  expectedRevision: expectedRevision ?? null,\n`)).toEqual([]);
  });
});
