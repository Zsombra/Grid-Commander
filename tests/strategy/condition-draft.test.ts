import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ConditionDefinition, StrategyCondition } from '@/domain/strategy/condition.js';
import {
  columnsRead,
  composeForResolution,
  serialiseCondition,
  serialiseDefinition,
} from '@/domain/strategy/condition-draft.js';
import { mapConditions } from '@/infrastructure/battlegrid/condition-mapper.js';
import { berlinFullSendDown, berlinRegimeDown } from '../support/strategy-fakes.js';

/**
 * Writing a condition back — the direction the product had never gone.
 *
 * Two things are being protected here, and they need different kinds of check.
 *
 * **That the bytes survive a round trip.** `condition-mapper.ts` reads the
 * platform's payload into the domain; `condition-draft.ts` writes it back. If
 * the two disagree, a drafted condition is not the condition the operator
 * composed — and the disagreement would be invisible, because a lossy round
 * trip still produces a valid-looking payload. Berlin's real `FULL_SEND_DOWN`
 * is the fixture, shared with `conditions.test.ts` so the two suites cannot
 * drift apart.
 *
 * **That the payload satisfies BattleGrid's own declaration.** Not the probed
 * record's — the *declaration*, read from `docs/battlegrid-mcp-capabilities.json`
 * with its `anyOf` branches and `$ref`s intact.
 *
 * That distinction is the reason this file carries a schema walker at all.
 * `payload-conformance.test.ts` holds every other payload this product builds
 * against `docs/battlegrid-mcp-surface.json`, and it cannot hold this one: the
 * probe flattens `conditions[].definition` to the keys of its outermost object
 * branch, so the record accepts `kind/members/n/op` and reads a clause's
 * `column` and a reference's `conditionKey` as violations of a closed set the
 * live schema does not close. A conformance case there would fail against
 * correct code, which is worse than no case at all. `the-record-flattens-the-condition-union`
 * files the gap; the last describe below proves the gap is still there, so that
 * a re-probe which fixes it makes this file fail rather than pass quietly.
 */

type Schema = Record<string, unknown>;

const capabilities = JSON.parse(
  readFileSync('docs/battlegrid-mcp-capabilities.json', 'utf8'),
) as { tools: Array<{ name: string; inputSchema: Schema }> };

const schemaOf = (tool: string): Schema => {
  const found = capabilities.tools.find((t) => t.name === tool);
  if (!found) throw new Error(`${tool} is not in the capabilities dump`);
  return found.inputSchema;
};

/** Follow a local JSON pointer from the tool's own schema root. */
function jump(root: Schema, pointer: string): Schema {
  let node: unknown = root;
  for (const raw of pointer.slice(2).split('/')) {
    const part = raw.replace(/~1/g, '/').replace(/~0/g, '~');
    if (Array.isArray(node)) node = node[Number(part)];
    else if (typeof node === 'object' && node !== null) node = (node as Schema)[part];
    else throw new Error(`pointer ${pointer} leaves the schema`);
  }
  if (typeof node !== 'object' || node === null) throw new Error(`pointer ${pointer} names nothing`);
  return node as Schema;
}

function deref(node: Schema, root: Schema): Schema {
  let current = node;
  for (let hops = 0; typeof current['$ref'] === 'string'; hops += 1) {
    if (hops > 32) throw new Error('a $ref chain that does not terminate');
    current = jump(root, current['$ref'] as string);
  }
  return current;
}

/**
 * Everything the declaration rejects about this value. Empty means it can succeed.
 *
 * A deliberately small validator covering exactly the constructs this subtree
 * uses — `$ref`, `anyOf`, `const`, `enum`, `type`, `properties`, `required`,
 * `additionalProperties: false`, `items`, and the string/number/array bounds.
 * Anything the schema grows that is not handled here shows up as an unchecked
 * keyword rather than as a silent pass; see the anti-vacuity cases below.
 */
function violations(value: unknown, schema: Schema, root: Schema, path = ''): string[] {
  const s = deref(schema, root);
  const at = path || 'value';
  const problems: string[] = [];

  if (Array.isArray(s['anyOf'])) {
    const branches = s['anyOf'] as Schema[];
    if (branches.every((b) => violations(value, b, root, path).length > 0)) {
      problems.push(`${at}: matches none of the ${branches.length} declared branches`);
    }
    return problems;
  }

  if ('const' in s && value !== s['const']) {
    problems.push(`${at}: expected ${JSON.stringify(s['const'])}`);
  }
  if (Array.isArray(s['enum']) && !(s['enum'] as unknown[]).includes(value)) {
    problems.push(`${at}: ${JSON.stringify(value)} is outside the declared enum`);
  }

  switch (s['type']) {
    case 'null':
      if (value !== null) problems.push(`${at}: expected null`);
      break;
    case 'string': {
      if (typeof value !== 'string') {
        problems.push(`${at}: expected a string`);
        break;
      }
      const pattern = s['pattern'];
      if (typeof pattern === 'string' && !new RegExp(pattern).test(value)) {
        problems.push(`${at}: "${value}" does not match ${pattern}`);
      }
      if (typeof s['minLength'] === 'number' && value.length < s['minLength']) {
        problems.push(`${at}: shorter than ${s['minLength']}`);
      }
      if (typeof s['maxLength'] === 'number' && value.length > s['maxLength']) {
        problems.push(`${at}: longer than ${s['maxLength']}`);
      }
      break;
    }
    case 'integer':
    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        problems.push(`${at}: expected a number`);
        break;
      }
      if (s['type'] === 'integer' && !Number.isInteger(value)) {
        problems.push(`${at}: expected a whole number`);
      }
      if (typeof s['exclusiveMinimum'] === 'number' && value <= s['exclusiveMinimum']) {
        problems.push(`${at}: must exceed ${s['exclusiveMinimum']}`);
      }
      if (typeof s['maximum'] === 'number' && value > s['maximum']) {
        problems.push(`${at}: above ${s['maximum']}`);
      }
      break;
    }
    case 'array': {
      if (!Array.isArray(value)) {
        problems.push(`${at}: expected an array`);
        break;
      }
      if (typeof s['minItems'] === 'number' && value.length < s['minItems']) {
        problems.push(`${at}: fewer than ${s['minItems']} items`);
      }
      if (typeof s['maxItems'] === 'number' && value.length > s['maxItems']) {
        problems.push(`${at}: more than ${s['maxItems']} items`);
      }
      const items = s['items'];
      if (typeof items === 'object' && items !== null) {
        value.forEach((entry, i) => {
          problems.push(...violations(entry, items as Schema, root, `${at}[${i}]`));
        });
      }
      break;
    }
    case 'object': {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        problems.push(`${at}: expected an object`);
        break;
      }
      const obj = value as Record<string, unknown>;
      const props = (s['properties'] ?? {}) as Record<string, Schema>;
      for (const name of (s['required'] ?? []) as string[]) {
        if (!(name in obj)) problems.push(`${at}.${name} is required and missing`);
      }
      if (s['additionalProperties'] === false) {
        for (const key of Object.keys(obj)) {
          if (!(key in props)) {
            problems.push(
              `${at}.${key} is outside a closed object — the platform rejects the whole payload for it`,
            );
          }
        }
      }
      for (const [key, sub] of Object.entries(props)) {
        if (key in obj) problems.push(...violations(obj[key], sub, root, `${at}.${key}`));
      }
      break;
    }
    default:
      break;
  }
  return problems;
}

/** The declared shape of one condition, on each tool that takes one. */
const conditionItemSchemas = (): Array<{ tool: string; root: Schema; item: Schema }> => {
  const preview = schemaOf('preview_strategy_report');
  const compile = schemaOf('compile_strategy_plan');
  return [
    {
      tool: 'preview_strategy_report',
      root: preview,
      item: jump(preview, '#/properties/conditions/items'),
    },
    {
      tool: 'compile_strategy_plan',
      root: compile,
      // The CREATE branch holds the definition; UPDATE and RESTORE `$ref` it.
      item: jump(compile, '#/properties/request/anyOf/0/properties/conditions/items'),
    },
  ];
};

const domainOf = (payload: Record<string, unknown>): StrategyCondition => {
  const [mapped] = mapConditions([payload]);
  if (!mapped) throw new Error('the fixture did not map');
  return mapped;
};

const wireOf = (condition: StrategyCondition): Record<string, unknown> => {
  const serialised = serialiseCondition(condition);
  if (serialised.kind !== 'wire') throw new Error(`refused: ${serialised.reasons.join('; ')}`);
  return serialised.condition as Record<string, unknown>;
};

const COLUMN = { sectionKey: 'includeRegimeContext', header: 'regTrend_now' };

describe('a condition survives the round trip byte for byte', () => {
  it('Berlin’s threshold group, out exactly as it came in', () => {
    const payload = berlinFullSendDown();
    // Read into the domain and written back. Anything the mapper drops or the
    // serialiser invents shows up here as a diff — including a lost negation,
    // which is the failure with the worst consequence.
    expect(wireOf(domainOf(payload))).toEqual(payload);
  });

  it('a building block, with its null verdict kept as a key', () => {
    const payload = berlinRegimeDown();
    const wire = wireOf(domainOf(payload));
    expect(wire).toEqual(payload);
    // Present and null, not absent. The schema requires the key on every
    // condition, and `null` is its declared value for a named building block —
    // a missing required field rejects the payload exactly as an unknown one does.
    expect('verdict' in wire).toBe(true);
    expect(wire['verdict']).toBeNull();
  });

  it('every clause form the platform actually uses', () => {
    const forms: Array<Record<string, unknown>> = [
      { kind: 'clause', column: COLUMN, op: 'gt', value: 50 },
      { kind: 'clause', column: COLUMN, op: 'lte', value: 0.5 },
      { kind: 'clause', column: COLUMN, op: 'between', low: 1, high: 9 },
      { kind: 'clause', column: COLUMN, op: 'is', label: 'trending up' },
      { kind: 'clause', column: COLUMN, op: 'in', labels: ['trending up', 'extreme'] },
      { kind: 'conditionRef', conditionKey: 'FLOW_UP' },
      { kind: 'group', op: 'ALL', members: [{ kind: 'conditionRef', conditionKey: 'FLOW_UP' }] },
    ];
    for (const form of forms) {
      const payload = { conditionKey: 'K', name: 'n', verdict: null, definition: form };
      expect(wireOf(domainOf(payload)), JSON.stringify(form)).toEqual(payload);
    }
  });

  it('a column belonging to no section keeps its null, rather than becoming ""', () => {
    const payload = {
      conditionKey: 'K',
      name: 'n',
      verdict: 'UP',
      definition: {
        kind: 'clause',
        column: { sectionKey: null, header: 'rsi14' },
        op: 'gte',
        value: 70,
      },
    };
    expect(wireOf(domainOf(payload))).toEqual(payload);
  });

  it('a threshold that means nothing on its operator is not written back', () => {
    // `n` on an `ALL` group is meaningless — the mapper keeps it for `N_OF`
    // alone. This is the one place the round trip is deliberately not
    // byte-identical, and it is recorded rather than left to be discovered.
    const wire = wireOf(
      domainOf({
        conditionKey: 'K',
        name: 'n',
        verdict: null,
        definition: {
          kind: 'group',
          op: 'ALL',
          n: 3,
          members: [{ kind: 'conditionRef', conditionKey: 'FLOW_UP' }],
        },
      }),
    );
    expect((wire['definition'] as Record<string, unknown>)['n']).toBeUndefined();
  });
});

describe('the composed payload satisfies BattleGrid’s own declaration', () => {
  for (const { tool, root, item } of conditionItemSchemas()) {
    it(`${tool} — Berlin, and every form the composer can build`, () => {
      // Keys are ≥ 2 characters throughout: the platform's own pattern is
      // `^[A-Z][A-Z0-9_]{1,39}$`, so a one-letter key is refused. Found by this
      // walker rather than by a deployment, which is the point of it.
      const payloads = [
        berlinFullSendDown(),
        berlinRegimeDown(),
        { conditionKey: 'K_A', name: 'n', verdict: 'UP', definition: { kind: 'clause', column: COLUMN, op: 'gt', value: 50 } },
        { conditionKey: 'K_B', name: 'n', verdict: 'DOWN', definition: { kind: 'clause', column: COLUMN, op: 'between', low: 1, high: 9 } },
        { conditionKey: 'K_C', name: 'n', verdict: 'NEITHER', definition: { kind: 'clause', column: COLUMN, op: 'in', labels: ['a', 'b'] } },
        { conditionKey: 'K_D', name: 'n', verdict: null, definition: { kind: 'conditionRef', conditionKey: 'FLOW_UP' } },
        {
          conditionKey: 'K_E',
          name: 'n',
          verdict: 'UP',
          definition: {
            kind: 'group',
            op: 'N_OF',
            n: 2,
            members: [
              { kind: 'conditionRef', conditionKey: 'FLOW_UP' },
              { kind: 'group', op: 'NOT', members: [{ kind: 'clause', column: COLUMN, op: 'is', label: 'x' }] },
            ],
          },
        },
      ];
      for (const payload of payloads) {
        // Through the product's own serialiser, not asserted on the fixture:
        // a fixture conforms by construction and checks nothing.
        expect(violations(wireOf(domainOf(payload)), item, root), JSON.stringify(payload)).toEqual(
          [],
        );
      }
    });
  }
});

describe('the check that guards the check', () => {
  const { root, item } = conditionItemSchemas()[0] as { root: Schema; item: Schema };

  it('a key the platform’s pattern forbids is caught', () => {
    // Lower case, and the pattern demands `^[A-Z][A-Z0-9_]{1,39}$`. Nothing in
    // the product refuses this — it goes to BattleGrid as composed, on purpose
    // — so if the walker cannot see it, the walker is checking nothing.
    const found = violations(
      { conditionKey: 'flow_up', name: 'n', verdict: null, definition: { kind: 'conditionRef', conditionKey: 'FLOW_UP' } },
      item,
      root,
    );
    expect(found.join('\n')).toContain('does not match');
  });

  it('a missing verdict is caught, even though the value would be null anyway', () => {
    const found = violations(
      { conditionKey: 'FLOW_UP', name: 'n', definition: { kind: 'conditionRef', conditionKey: 'FLOW_UP' } },
      item,
      root,
    );
    expect(found.join('\n')).toContain('verdict is required and missing');
  });

  it('a key outside a closed object is caught', () => {
    const found = violations(
      {
        conditionKey: 'FLOW_UP',
        name: 'n',
        verdict: null,
        definition: { kind: 'conditionRef', conditionKey: 'FLOW_UP' },
        conditionVerdicts: [],
      },
      item,
      root,
    );
    expect(found.join('\n')).toContain('outside a closed object');
  });

  it('a definition matching no branch is caught', () => {
    const found = violations(
      { conditionKey: 'FLOW_UP', name: 'n', verdict: null, definition: { kind: 'xor', members: [] } },
      item,
      root,
    );
    expect(found.join('\n')).toContain('matches none of the');
  });

  it('the probed record still cannot express the union this file walks', () => {
    /**
     * The reason there is no `payload-conformance.test.ts` case for a composed
     * condition. `tools/probe_mcp_surface.py` records accepted sets per object
     * path, and the definition union's object branches sit inside a nested
     * `anyOf` its walk does not reach — so only the outermost branch (the
     * group) is recorded, and `column` reads as a violation.
     *
     * If a future re-probe fixes this, the assertion below fails and the
     * conformance case becomes both possible and required. That is the point:
     * a known gap that quietly closes is a check nobody adds.
     */
    const surface = JSON.parse(readFileSync('docs/battlegrid-mcp-surface.json', 'utf8')) as {
      tools: Array<{ name: string; input_accepts?: Record<string, { accepts?: string[] }> }>;
    };
    const preview = surface.tools.find((t) => t.name === 'preview_strategy_report');
    const accepts = preview?.input_accepts?.['conditions[].definition']?.accepts ?? [];
    expect(accepts, 'the record still describes only the group branch').toEqual([
      'kind',
      'members',
      'n',
      'op',
    ]);
    expect(accepts, 'a clause is still unrepresentable in the record').not.toContain('column');
  });
});

describe('a form this product cannot express is never written back', () => {
  const unrecognised: ConditionDefinition = { kind: 'unrecognised', reason: 'unknown group operator "XOR"' };

  it('refuses the draft and names the part', () => {
    const result = serialiseCondition({
      conditionKey: 'K',
      name: 'n',
      definition: unrecognised,
      verdict: null,
    });
    expect(result.kind).toBe('inexpressible');
    if (result.kind !== 'inexpressible') throw new Error('unreachable');
    expect(result.reasons).toEqual(['unknown group operator "XOR"']);
  });

  it('finds every unexpressible part, at any depth, not only the first', () => {
    const result = serialiseCondition({
      conditionKey: 'K',
      name: 'n',
      verdict: 'UP',
      definition: {
        kind: 'group',
        op: 'ALL',
        n: null,
        members: [
          { kind: 'ref', conditionKey: 'FLOW_UP' },
          { kind: 'group', op: 'NOT', n: null, members: [unrecognised] },
          { kind: 'unrecognised', reason: 'a clause with no column header' },
        ],
      },
    });
    if (result.kind !== 'inexpressible') throw new Error('unreachable');
    // Both, so an operator fixes both rather than discovering the second after
    // fixing the first.
    expect(result.reasons).toHaveLength(2);
  });

  it('never substitutes a shape for one it did not understand', () => {
    // The serialiser's unreachable branch throws rather than emitting a
    // placeholder. A placeholder is exactly the invented shape the refusal
    // above exists to prevent, and it would reach BattleGrid looking composed.
    expect(() => serialiseDefinition(unrecognised)).toThrow(/cannot be written back/);
  });

  it('a strategy that reads correctly is still fully expressible', () => {
    // The refusal must be about the unmodelled form and nothing else. Berlin
    // uses the whole grammar and refuses nothing.
    expect(serialiseCondition(domainOf(berlinFullSendDown())).kind).toBe('wire');
  });
});

describe('the list the platform is asked to resolve', () => {
  const existing = [berlinFullSendDown(), berlinRegimeDown()];

  it('adds a draft whose key none of them uses', () => {
    const draft = { conditionKey: 'NEW_ONE', name: 'n', verdict: null, definition: {} };
    const composed = composeForResolution(existing, draft);
    expect(composed.standing).toBe('added');
    expect(composed.alongside).toBe(2);
    expect(composed.conditions).toHaveLength(3);
    // The platform's own objects, untouched — never re-serialised out of the
    // domain, which would drop any form the mapper read as unrecognised.
    expect(composed.conditions[0]).toBe(existing[0]);
  });

  it('stands a matching draft in the existing condition’s place', () => {
    const draft = { conditionKey: 'REGIME_DOWN', name: 'redrafted', verdict: 'UP', definition: {} };
    const composed = composeForResolution(existing, draft);
    expect(composed.standing).toBe('replaced');
    // One fewer travelling: the replaced condition is the thing being asked about.
    expect(composed.alongside).toBe(1);
    expect(composed.conditions).toHaveLength(2);
    expect(composed.conditions[1]).toBe(draft);
    // Position kept, so a reader comparing against the strategy page sees the
    // draft where the condition it replaces used to be.
    expect(composed.conditions[0]).toBe(existing[0]);
  });

  it('never sends one key twice', () => {
    const draft = { conditionKey: 'REGIME_DOWN', name: 'redrafted', verdict: null, definition: {} };
    const keys = composeForResolution(existing, draft).conditions.map(
      (c) => c['conditionKey'] as string,
    );
    // Two conditions under one key is a list with no answer to which of them a
    // reference names, and the outcome would be attributed to the wrong one.
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('sends a draft alone when the strategy defines nothing', () => {
    const draft = { conditionKey: 'NEW_ONE', name: 'n', verdict: null, definition: {} };
    const composed = composeForResolution([], draft);
    expect(composed).toEqual({ conditions: [draft], standing: 'added', alongside: 0 });
  });
});

describe('the columns a strategy already reads', () => {
  it('harvests them from every depth, deduplicated', () => {
    const conditions = mapConditions([berlinFullSendDown(), berlinRegimeDown()]);
    const headers = columnsRead(conditions).map((c) => c.header);
    // Three from inside Berlin's threshold group, one from the building block.
    // References contribute none — they name a condition, not a column.
    expect(headers).toEqual(['CVD_trend', 'MAalign_htf', 'oiRegime', 'regTrend_now']);
  });

  it('answers with nothing rather than a guess when there is nothing to draw on', () => {
    // A strategy with no conditions offers no column suggestions. There is no
    // tool that lists a strategy's rendered column headers, so an invented list
    // would be read as the platform's.
    expect(columnsRead([])).toEqual([]);
  });
});

describe('nothing in the drafting path writes, or decides an outcome', () => {
  const FILES = [
    'src/domain/strategy/condition-draft.ts',
    'src/application/use-cases/try-condition.query.ts',
    'src/presentation/condition-form.ts',
    'src/presentation/components/condition-composer.tsx',
    'app/(app)/strategies/[id]/conditions/page.tsx',
  ];

  const stripComments = (source: string): string =>
    source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');

  const code = (file: string): string => stripComments(readFileSync(file, 'utf8'));

  it('reaches no write, on any of the five files the surface is made of', () => {
    for (const file of FILES) {
      const source = code(file);
      // The only platform call this surface makes is the preview, which is
      // annotated readOnlyHint. Compiling is effect-free and applying is not,
      // and a surface that could do either would be one edit from doing the
      // second (`tests/strategy/structure.test.ts`, S-G).
      expect(source, `${file} compiles a plan`).not.toContain('compilePlan');
      expect(source, `${file} applies a plan`).not.toContain('applyPlan');
      expect(source, `${file} carries a server action`).not.toContain("'use server'");
      expect(source, `${file} updates a rule`).not.toContain('updateSignalRule');
    }
  });

  it('derives no outcome of its own', () => {
    for (const file of FILES) {
      const source = code(file);
      // `Grid-Commander Never Decides Whether A Condition Holds`. Composing a
      // condition is the one moment this product holds both a rule and the
      // vocabulary it reads, so it is the one moment it could be tempted to
      // answer the question itself.
      for (const forbidden of ['TRUE', 'FALSE', 'UNRESOLVED', 'operand', 'literal']) {
        expect(source, `${file} names ${forbidden}`).not.toContain(forbidden);
      }
    }
  });

  it('is checking files that exist and are not empty', () => {
    // Passing vacuously is the failure mode every structural check guards
    // against, and a renamed file would make both cases above pass on nothing.
    for (const file of FILES) {
      expect(statSync(file).size, file).toBeGreaterThan(500);
    }
    expect(FILES).toHaveLength(5);
  });

  it('leaves the reading surfaces the only place an outcome word appears', () => {
    // The counterpart to the scan above: the outcome vocabulary lives in the
    // outcome mapper and the outcome component, which is where the platform's
    // own words are rendered. If it ever appears in a third place, one of them
    // is deciding rather than showing.
    const owners = ['condition-outcome', 'condition-outcomes'];
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.tsx?$/.test(full)) continue;
        if (owners.some((o) => full.includes(o))) continue;
        if (/UNRESOLVED/.test(stripComments(readFileSync(full, 'utf8')))) offenders.push(full);
      }
    };
    walk('src');
    expect(offenders, 'the platform’s outcome vocabulary belongs where it is rendered').toEqual([]);
  });
});
