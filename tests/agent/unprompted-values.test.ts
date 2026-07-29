import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  positionManagementFrom,
  positionSizePresetsFrom,
  unpromptedValues,
} from '@/domain/agent/trading-config.js';
import { defaultCatalog } from '../support/agent-fakes.js';

/**
 * The values that reach BattleGrid without passing an operator.
 *
 * `create_intelligence_agent` requires twenty fields. The operator answers six.
 * The platform defaults most of the rest. The remainder — six values — are
 * chosen by this product, and until a live probe called the tool for the first
 * time, nothing had ever checked a single one of them.
 *
 * Two were wrong. One made every create impossible:
 *
 *     sizingStrategy — Expected 'MANUAL' | 'VOLATILITY_AUTO', received 'FIXED'
 *
 * It survived because it was written `d['sizingStrategy'] ?? 'FIXED'`, which
 * reads as a default being honoured and was a guess whose lookup always missed.
 * The catalog has no `sizingStrategy` key at all, so the fallback fired every
 * time.
 *
 * `wire-values.test.ts` checks these against the platform's own declared
 * constants, which is stronger. This states the expected values directly, so a
 * stale probe artifact cannot take the check down with it.
 */

const catalog = defaultCatalog();

describe('the values this product chooses because the platform will not', () => {
  it('sends a sizing strategy the enum permits', () => {
    // The defect, stated as the thing it was: 'FIXED' is not one of the two.
    expect(positionSizePresetsFrom(catalog)['sizingStrategy']).toBe('MANUAL');
  });

  it('picks the sizing mode that uses the percentages it sends', () => {
    // MANUAL uses the preset percentages; VOLATILITY_AUTO derives sizes from
    // ATR and would make all three inert. Sending three numbers under a mode
    // that ignores them is the same class of mistake as offering a control
    // nothing reads.
    const sizing = positionSizePresetsFrom(catalog);
    expect(sizing['sizingStrategy']).toBe('MANUAL');
    for (const field of ['smallPct', 'mediumPct', 'largePct']) {
      expect(sizing[field], `${field} is sent, so the mode must be one that reads it`).toBeTypeOf(
        'number',
      );
    }
  });

  it('sends a trailing type the enum permits', () => {
    expect(positionManagementFrom(catalog, 'CUSTOM')['trailingType']).toBe('ATR');
  });

  it('leaves the position-management switches off, as the platform leaves the master', () => {
    // `positionMgmtEnabled` is the one the catalog *does* default, and it
    // defaults false. Off is the only completion coherent with the single value
    // the platform was willing to state.
    const pm = positionManagementFrom(catalog, 'CUSTOM');
    expect(pm['enabled']).toBe(false);
    for (const field of ['breakEvenEnabled', 'trailingEnabled', 'timeDecayEnabled']) {
      expect(pm[field], field).toBe(false);
    }
  });

  it('declares every value it chooses, and sends each one it declares', () => {
    const ours = unpromptedValues();
    expect(Object.keys(ours).length, 'an empty set would pass vacuously').toBeGreaterThan(0);

    const sent: Record<string, unknown> = {
      ...positionManagementFrom(catalog, 'CUSTOM'),
      ...positionSizePresetsFrom(catalog),
    };
    for (const [field, value] of Object.entries(ours)) {
      expect(sent[field], `${field} is declared as ours and never sent`).toEqual(value);
    }
  });

  it('never disguises a choice as a lookup', () => {
    // The pattern that hid the defect. Comments are stripped first: without
    // that, this check failed on the paragraphs that quote the very pattern
    // they ban, and would have gone on failing after the code was clean.
    const code = readFileSync('src/domain/agent/trading-config.ts', 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    const guesses = [...code.matchAll(/d\['(\w+)'\]\s*\?\?\s*'([^']+)'/g)].map(
      (m) => `${m[1] as string} ?? '${m[2] as string}'`,
    );
    expect(guesses, 'a string fallback behind a catalog lookup — name it in OURS instead').toEqual(
      [],
    );
  });

  it('is not a copy anyone can mutate', () => {
    const first = unpromptedValues() as Record<string, unknown>;
    first['sizingStrategy'] = 'FIXED';
    expect(unpromptedValues()['sizingStrategy']).toBe('MANUAL');
  });
});
