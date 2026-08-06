import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CreateAgentCommand } from '@/application/use-cases/create-agent.command.js';
import type { DiscoveredTool } from '@/domain/capability/tool-class.js';
import { McpAgentAdapter } from '@/infrastructure/battlegrid/agent-adapter.js';
import { declaredValues } from '@/infrastructure/battlegrid/declared-values.js';
import type { BattleGridPort } from '@/ports/battlegrid.js';
import { defaultCatalog, FakeAgentsPort } from '../support/agent-fakes.js';

/**
 * The brain presets come from the declaration, not from this repository.
 *
 * They were a hand-written list of ten for eight days while the schema pinned
 * eleven — and not because the platform moved: the enum in the first
 * capabilities dump this repo took (2026-07-27, server v3.0.0) already carried
 * eleven, two days before the constant was written. The ten came from the
 * field's `description`, which enumerates presets in prose and is not the
 * constraint. Every assertion below therefore takes its vocabulary from the
 * platform's own record rather than from anything typed here.
 */

interface Capabilities {
  tools: Array<{ name: string; inputSchema?: Record<string, unknown> }>;
}

const CREATE = 'create_intelligence_agent';
const recorded = (
  JSON.parse(readFileSync('docs/battlegrid-mcp-capabilities.json', 'utf8')) as Capabilities
).tools.find((t) => t.name === CREATE);

const createTool: DiscoveredTool = { name: CREATE, inputSchema: recorded?.inputSchema };

/** Straight out of the record by path — the independent read the walk is checked against. */
function enumInTheRecord(): readonly string[] {
  const brain = (createTool.inputSchema?.['properties'] as Record<string, unknown>)?.['brain'];
  const branch = ((brain as Record<string, unknown>)['anyOf'] as Record<string, unknown>[])[0];
  const preset = (branch?.['properties'] as Record<string, unknown>)['preset'];
  return (preset as Record<string, unknown>)['enum'] as readonly string[];
}

const DECLARED = enumInTheRecord();
const KINDS = declaredValues(createTool, 'brain.kind');
/** What the product may offer: declared, minus anything that also names a branch. */
const OFFERABLE = DECLARED.filter((p) => !KINDS.includes(p));

const who = { userId: 'owner', accessToken: 'tok' };

function adapterWith(discover: () => Promise<readonly DiscoveredTool[]>): McpAgentAdapter {
  const battlegrid: BattleGridPort = {
    buildAuthorizationUrl: () => '',
    exchangeCode: async () => {
      throw new Error('unused');
    },
    refresh: async () => {
      throw new Error('unused');
    },
    revoke: async () => {},
    discoverTools: discover,
    callTool: async (request) => ({
      content:
        request.tool === 'list_approved_models'
          ? { models: [{ modelId: 'm-1', displayName: 'M', provider: 'P', isDefault: true }] }
          : { positionManagementPresets: [] },
      classification: {
        mutating: false,
        destructive: false,
        requiredScope: 'mcp:read' as const,
        basis: 'annotations' as const,
      },
      auditEntryId: 'a1',
    }),
  };
  return new McpAgentAdapter(battlegrid);
}

async function presetsFrom(tools: readonly DiscoveredTool[]): Promise<readonly string[]> {
  const result = await adapterWith(async () => tools).readCatalog(who);
  if (result.kind !== 'catalog') throw new Error(`catalog unreadable: ${result.reason}`);
  return result.catalog.brainPresets;
}

/** A copy of the recorded schema with the preset enum replaced. */
function withPresetEnum(values: readonly string[]): DiscoveredTool {
  const schema = JSON.parse(JSON.stringify(createTool.inputSchema)) as Record<string, unknown>;
  const brain = (schema['properties'] as Record<string, unknown>)['brain'] as Record<string, unknown>;
  const branch = (brain['anyOf'] as Record<string, unknown>[])[0] as Record<string, unknown>;
  const preset = (branch['properties'] as Record<string, unknown>)['preset'] as Record<string, unknown>;
  preset['enum'] = [...values];
  return { name: CREATE, inputSchema: schema };
}

describe('the record says more than the list did', () => {
  it('declares eleven where the product offered ten', () => {
    // The premise. If this ever stops holding, the tests below stop meaning
    // what they say rather than failing for a reason anyone could read.
    expect(DECLARED.length).toBe(11);
    expect(OFFERABLE.length).toBe(10);
  });

  it('names one of the union branches among the preset values', () => {
    const shared = DECLARED.filter((p) => KINDS.includes(p));
    expect(KINDS.length).toBe(2);
    expect(shared.length).toBe(1);
  });

  it('reads the same enum the record carries, out of the union branch', () => {
    expect(declaredValues(createTool, 'brain.preset')).toEqual(DECLARED);
  });
});

describe('the presets offered are the ones declared', () => {
  it('offers every declared preset the declaration is unambiguous about', async () => {
    expect(await presetsFrom([createTool])).toEqual(OFFERABLE);
  });

  it('offers no value that also names a branch of the same union', async () => {
    const offered = await presetsFrom([createTool]);
    expect(offered.filter((p) => KINDS.includes(p))).toEqual([]);
  });

  it('offers a preset BattleGrid has added, with no release of this product', async () => {
    const added = 'A_PRESET_THIS_REPO_HAS_NEVER_HEARD_OF';
    const offered = await presetsFrom([withPresetEnum([...DECLARED, added])]);
    expect(offered).toContain(added);
  });

  it('stops offering one BattleGrid stops declaring', async () => {
    const dropped = OFFERABLE[0] as string;
    const offered = await presetsFrom([
      withPresetEnum(DECLARED.filter((p) => p !== dropped)),
    ]);
    expect(offered).not.toContain(dropped);
    // And the rest are still there — a narrowing, not a collapse.
    expect(offered.length).toBe(OFFERABLE.length - 1);
  });
});

/**
 * Empty is *the declaration did not answer*, never *there are none*. The same
 * distinction `deploymentTimeframes` keeps one module over, and the same one the
 * roster has kept between empty and unreadable since the beginning.
 */
describe('a declaration that cannot answer', () => {
  it('yields no presets when discovery fails, and still a readable catalog', async () => {
    const adapter = adapterWith(async () => {
      throw new Error('tools/list did not answer');
    });
    const result = await adapter.readCatalog(who);
    expect(result.kind).toBe('catalog');
    if (result.kind !== 'catalog') return;
    expect(result.catalog.brainPresets).toEqual([]);
    // The half that did answer is untouched: the model route stays open.
    expect(result.catalog.models.length).toBeGreaterThan(0);
  });

  it('yields no presets when the create tool is absent from the discovery', async () => {
    expect(await presetsFrom([{ name: 'list_intelligence_agents' }])).toEqual([]);
  });

  it('yields no presets when the tool is discovered without its schema', async () => {
    expect(await presetsFrom([{ name: CREATE }])).toEqual([]);
  });
});

/**
 * The walk is the probe's walk. BattleGrid re-emits these schemas on every
 * deployment and the 2026-08-06 dump carries 370 `$ref`s of zod's dedup output;
 * a dedup that moved the brain branches behind one would otherwise empty this
 * list without anything failing.
 */
describe('the walk survives the shapes zod emits', () => {
  const behind = (): DiscoveredTool => ({
    name: CREATE,
    inputSchema: {
      $defs: { branch: { properties: { preset: { enum: ['ONE', 'TWO'] } } } },
      properties: { brain: { anyOf: [{ $ref: '#/$defs/branch' }] } },
    },
  });

  it('follows a local $ref to the enum behind it', () => {
    expect(declaredValues(behind(), 'brain.preset')).toEqual(['ONE', 'TWO']);
  });

  it('ends rather than looping on a schema that recurses through itself', () => {
    const cyclic: DiscoveredTool = {
      name: CREATE,
      inputSchema: {
        $defs: { self: { properties: { brain: { $ref: '#/$defs/self' } } } },
        properties: { brain: { $ref: '#/$defs/self' } },
      },
    };
    expect(declaredValues(cyclic, 'brain.preset')).toEqual([]);
  });

  it('merges what every branch of a union pins at the same path', () => {
    const split: DiscoveredTool = {
      name: CREATE,
      inputSchema: {
        properties: {
          brain: {
            anyOf: [
              { properties: { kind: { const: 'PRESET' } } },
              { properties: { kind: { const: 'OTHER' } } },
            ],
          },
        },
      },
    };
    expect(declaredValues(split, 'brain.kind')).toEqual(['PRESET', 'OTHER']);
  });
});

/**
 * F-8's rule, applied to the one vocabulary that was exempt from it. The
 * strategy suite's version of this scan exempts the adapter boundary; this one
 * does not, because the boundary is exactly where these ten sat while being
 * wrong.
 */
describe('the preset names are written down nowhere in the product', () => {
  function filesUnder(dir: string): string[] {
    let out: string[] = [];
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) out = out.concat(filesUnder(full));
      else if (full.endsWith('.ts') || full.endsWith('.tsx')) out.push(full);
    }
    return out;
  }

  const stripComments = (source: string): string =>
    source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');

  it('has a set of names to look for', () => {
    // A guard that searches for nothing passes for free. The names come from
    // the platform's record, so this cannot be quietly emptied either.
    expect(OFFERABLE.length).toBeGreaterThan(5);
  });

  it('names no declared preset in src/ or app/', () => {
    const offenders: string[] = [];
    for (const file of [...filesUnder('src'), ...filesUnder('app')]) {
      const code = stripComments(readFileSync(file, 'utf8'));
      for (const preset of OFFERABLE) {
        if (code.includes(preset)) offenders.push(`${file}: ${preset}`);
      }
    }
    expect(
      offenders,
      'the presets are read from create_intelligence_agent at runtime — a list here was a value short for eight days',
    ).toEqual([]);
  });
});

describe('what the create command does with the set it is given', () => {
  const money = {
    tradingMode: 'OFF',
    minAllocationUsd: 10,
    balanceThresholdUsd: 10,
    maxConcurrentExposureUsd: 100,
    maxCumulativeDrawdownUsd: 100,
    maxDailyLossUsd: 50,
  };
  const create = (preset: string) => ({
    ...who,
    displayName: 'New Agent',
    brain: { kind: 'preset' as const, preset },
    strategyId: 's1',
    money,
  });

  function portOffering(brainPresets: readonly string[]): FakeAgentsPort {
    const port = new FakeAgentsPort();
    port.catalog = { ...defaultCatalog(), brainPresets };
    return port;
  }

  it('accepts a preset the declaration carries', async () => {
    const port = portOffering(OFFERABLE);
    const result = await new CreateAgentCommand(port).execute(create(OFFERABLE[0] as string));
    expect(result.kind).toBe('created');
  });

  it('refuses one the declaration does not', async () => {
    const excluded = DECLARED.find((p) => KINDS.includes(p)) as string;
    const port = portOffering(OFFERABLE);
    const result = await new CreateAgentCommand(port).execute(create(excluded));
    expect(result.kind).toBe('invalid');
    if (result.kind !== 'invalid') return;
    expect(result.issues.some((i) => i.field === 'brain.preset')).toBe(true);
    // Nothing was sent. A refusal is not an attempt.
    expect(port.calls).toEqual([]);
  });

  it('blames the read, not the operator, when nothing was declared', async () => {
    const port = portOffering([]);
    const result = await new CreateAgentCommand(port).execute(create(OFFERABLE[0] as string));
    expect(result.kind).toBe('invalid');
    if (result.kind !== 'invalid') return;
    const reason = result.issues.find((i) => i.field === 'brain.preset')?.reason ?? '';
    expect(reason).toMatch(/did not declare/i);
    expect(reason).not.toMatch(/is not a brain preset/i);
  });
});
