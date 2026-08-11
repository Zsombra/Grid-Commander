import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CreateAgentCommand } from '@/application/use-cases/create-agent.command.js';
import { positionManagementForPreset } from '@/domain/agent/trading-config.js';
import { mapCatalog } from '@/infrastructure/battlegrid/agent-mapper.js';
import { defaultCatalog, FakeAgentsPort } from '../support/agent-fakes.js';

/**
 * A position preset is offered with the platform's own values.
 *
 * The catalog states each preset's complete behavioural configuration
 * (twelve fields at v17.2.0), and
 * for the life of the product `mapPositionPresets` discarded it at the
 * boundary — so every agent was created CUSTOM under values nobody picked
 * deliberately, and the create form had its preset select removed because the
 * action dropped whatever it collected. These tests pin the whole path:
 * carried through the mapper, sent exactly as stated, refused when the
 * catalog cannot answer, and CUSTOM unchanged.
 */

const who = { userId: 'owner', accessToken: 'tok' };
const validCreate = {
  ...who,
  displayName: 'New Agent',
  brain: { kind: 'preset', preset: 'ROMMEL' } as const,
  strategyId: 's1',
  money: {
    tradingMode: 'OFF',
    minAllocationUsd: 10,
    balanceThresholdUsd: 10,
    maxConcurrentExposureUsd: 100,
    maxCumulativeDrawdownUsd: 100,
    maxDailyLossUsd: 50,
  },
};

describe('the mapper carries the values instead of dropping them', () => {
  const raw = {
    positionManagementPresets: [
      {
        preset: 'COLT',
        label: 'Colt',
        description: 'Patient / wide',
        tagline: 'Let winners breathe',
        cardSummary: 'Wide trailing',
        config: { enabled: true, trailingGivebackPct: 55, breakEvenTriggerR: 1.51 },
      },
      // A config that is not an object must map to null, not to an invention.
      { preset: 'WEBLEY', label: 'Webley', description: 'Defensive', config: 'oops' },
      { preset: 'LUGER', label: 'Luger', description: 'Tight' },
    ],
  };
  const presets = mapCatalog({}, raw, []).positionManagementPresets;

  it('carries config, tagline and cardSummary through', () => {
    const colt = presets.find((p) => p.preset === 'COLT');
    expect(colt?.config).toEqual({ enabled: true, trailingGivebackPct: 55, breakEvenTriggerR: 1.51 });
    expect(colt?.tagline).toBe('Let winners breathe');
    expect(colt?.cardSummary).toBe('Wide trailing');
  });

  it('maps a malformed or absent config to null, never an invented one', () => {
    expect(presets.find((p) => p.preset === 'WEBLEY')?.config).toBeNull();
    expect(presets.find((p) => p.preset === 'LUGER')?.config).toBeNull();
  });
});

describe("a named preset is the platform's values or nothing", () => {
  const catalog = defaultCatalog();

  it('answers with the label beside the complete configuration', () => {
    const pm = positionManagementForPreset(catalog, 'COLT');
    expect(pm?.['positionManagementPreset']).toBe('COLT');
    // The platform's own values — including the three booleans the CUSTOM
    // path answers itself. COLT says true where OURS says false.
    expect(pm?.['breakEvenEnabled']).toBe(true);
    expect(pm?.['trailingEnabled']).toBe(true);
    expect(pm?.['timeDecayEnabled']).toBe(true);
    // Label + twelve values = the closed thirteen-key object the schema takes.
    expect(Object.keys(pm ?? {})).toHaveLength(13);
  });

  it('returns null for a preset the catalog listed without describing', () => {
    expect(positionManagementForPreset(catalog, 'WEBLEY')).toBeNull();
  });

  it('returns null for a preset the catalog does not carry', () => {
    expect(positionManagementForPreset(catalog, 'REMINGTON')).toBeNull();
  });
});

describe('the create command sends them, or refuses', () => {
  it('a chosen preset reaches the wire exactly as the platform stated it', async () => {
    const port = new FakeAgentsPort([]);
    const res = await new CreateAgentCommand(port).execute({
      ...validCreate,
      positionPreset: 'COLT',
    });
    expect(res.kind).toBe('created');
    const sent = port.created[0]?.tradingConfig?.fields['positionManagement'] as Record<
      string,
      unknown
    >;
    expect(sent['positionManagementPreset']).toBe('COLT');
    expect(sent['breakEvenEnabled']).toBe(true);
    expect(sent['trailingGivebackPct']).toBe(55);
    expect(sent['timeDecayGracePeriodMinutes']).toBe(120);
  });

  it('refuses a preset name the catalog does not carry, before attempting', async () => {
    const port = new FakeAgentsPort([]);
    const res = await new CreateAgentCommand(port).execute({
      ...validCreate,
      positionPreset: 'REMINGTON',
    });
    expect(res.kind).toBe('invalid');
    if (res.kind !== 'invalid') return;
    expect(res.issues.map((i) => i.field)).toContain('positionPreset');
    expect(port.created).toHaveLength(0);
  });

  it('refuses a preset the catalog listed without its configuration', async () => {
    // Falling back to the assembled values here would create an agent labeled
    // WEBLEY carrying values that are not WEBLEY's — the lie the requirement
    // forbids. A refusal is the only honest answer.
    const port = new FakeAgentsPort([]);
    const res = await new CreateAgentCommand(port).execute({
      ...validCreate,
      positionPreset: 'WEBLEY',
    });
    expect(res.kind).toBe('invalid');
    expect(port.created).toHaveLength(0);
  });

  for (const [label, positionPreset] of [
    ['absent', undefined],
    ['CUSTOM', 'CUSTOM'],
  ] as const) {
    it(`${label} keeps the assembled path, product choices stated as its own`, async () => {
      const port = new FakeAgentsPort([]);
      const res = await new CreateAgentCommand(port).execute({
        ...validCreate,
        ...(positionPreset === undefined ? {} : { positionPreset }),
      });
      expect(res.kind).toBe('created');
      const sent = port.created[0]?.tradingConfig?.fields['positionManagement'] as Record<
        string,
        unknown
      >;
      expect(sent['positionManagementPreset']).toBe('CUSTOM');
      // OURS: the booleans the platform declines to default, answered by the
      // product for the CUSTOM path only. A chosen preset answers them itself.
      expect(sent['breakEvenEnabled']).toBe(false);
    });
  }
});

describe('the platform accepts what the preset path sends', () => {
  const surface = JSON.parse(readFileSync('docs/battlegrid-mcp-surface.json', 'utf8')) as {
    tools: Array<{ name: string; input_constants?: Record<string, unknown[]> }>;
  };
  const create = surface.tools.find((t) => t.name === 'create_intelligence_agent');

  it('every offerable preset label is one the schema permits', () => {
    const permitted =
      create?.input_constants?.['tradingConfig.positionManagement.positionManagementPreset'] ?? [];
    for (const p of defaultCatalog().positionManagementPresets) {
      if (p.config !== null) expect(permitted).toContain(p.preset);
    }
    expect(permitted).toContain('CUSTOM');
  });
});
