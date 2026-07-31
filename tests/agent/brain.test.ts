import { describe, expect, it } from 'vitest';
import { brainToArgument } from '@/domain/agent/brain.js';
import type { Brain } from '@/domain/agent/brain.js';

/**
 * How a brain is spelled on the wire.
 *
 * `brainToArgument` had no test of any kind. It is four lines, it is the only
 * translation between the domain's discriminator and BattleGrid's, and it got
 * that translation wrong by doing none — emitting the domain's lowercase
 * `'preset'` where the schema pins `const: "PRESET"`.
 *
 * Every `create_intelligence_agent` this product could have made was rejected
 * with `Invalid discriminator value`, for the life of the product, until a live
 * probe called the tool for the first time.
 *
 * The architecture guard in `wire-values.test.ts` checks this against the
 * probed schema, which is stronger. This states the rule without needing a
 * fresh probe, so a stale artifact cannot take the check down with it.
 */

const PRESET: Brain = { kind: 'preset', preset: 'ROMMEL' };
const CUSTOM: Brain = {
  kind: 'custom',
  modelId: 'anthropic/claude-opus-4.6',
  behavior: { risk: 'MODERATE', outlook: 'REALIST', conviction: 'MEASURED' },
};

describe('rendering a brain for BattleGrid', () => {
  it('spells the preset discriminator the way the schema pins it', () => {
    expect(brainToArgument(PRESET)['kind']).toBe('PRESET');
  });

  it('spells the custom discriminator the way the schema pins it', () => {
    expect(brainToArgument(CUSTOM)['kind']).toBe('CUSTOM');
  });

  it('does not send the domain spelling', () => {
    // Stated as its own case: the defect was not a missing field, it was a
    // field carrying the internal name of a thing to an external server.
    for (const brain of [PRESET, CUSTOM]) {
      expect(['preset', 'custom']).not.toContain(brainToArgument(brain)['kind']);
    }
  });

  it('carries the preset name unchanged', () => {
    // The preset itself is already uppercase and comes from the catalog — it is
    // the discriminator around it that was wrong, not the value inside.
    expect(brainToArgument(PRESET)['preset']).toBe('ROMMEL');
  });

  it('emits the fields of one variant and never the other', () => {
    expect(brainToArgument(PRESET)).not.toHaveProperty('modelId');
    expect(brainToArgument(PRESET)).not.toHaveProperty('behavior');
    expect(brainToArgument(CUSTOM)).not.toHaveProperty('preset');
  });

  it('copies the behavior rather than aliasing it', () => {
    const argument = brainToArgument(CUSTOM);
    expect(argument['behavior']).toEqual(CUSTOM.behavior);
    expect(argument['behavior']).not.toBe(CUSTOM.behavior);
  });

  it('throws when called with an unknown brain — it must never reach a write', () => {
    const unknown: Brain = { kind: 'unknown' };
    expect(() => brainToArgument(unknown)).toThrow();
  });
});
