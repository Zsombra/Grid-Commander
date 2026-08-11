import { describe, expect, it } from 'vitest';
import { digestOf } from '@/domain/capability/digest.js';
import { confirmationTarget } from '@/domain/capability/confirmation.js';
import {
  POSITION_MANAGEMENT_FIELDS,
  positionDrift,
  positionManagementForPreset,
} from '@/domain/agent/trading-config.js';
import { describeEdit } from '@/application/use-cases/describe-edit.query.js';
import { FormError, positionFromTransport } from '@/presentation/form.js';
import { defaultCatalog } from '../support/agent-fakes.js';

/**
 * Position management on the edit path: the drift the label hides, the one
 * coercion both requests share, and the consequence a person reads.
 *
 * The digest round-trip is the load-bearing test. The confirmation binds the
 * resolved thirteen values; the confirm form carries them as strings and the
 * apply re-coerces them. If serialize→parse is lossy anywhere, every honest
 * position edit is refused — the exact defect DL-5 caught on the money path
 * before it shipped.
 */

const catalog = defaultCatalog();

describe('drift between the label and the values', () => {
  const colt = positionManagementForPreset(catalog, 'COLT');
  if (!colt) throw new Error('the fake catalog must carry a COLT config');

  it('an agent whose values are its label has no drift', () => {
    expect(positionDrift(colt, catalog)).toEqual({ preset: 'COLT', differing: [] });
  });

  it('names exactly the fields that differ', () => {
    const drifted = { ...colt, trailingGivebackPct: 9.75, breakEvenEnabled: !colt['breakEvenEnabled'] };
    const drift = positionDrift(drifted, catalog);
    expect(drift?.differing).toEqual(
      expect.arrayContaining(['trailingGivebackPct', 'breakEvenEnabled']),
    );
    expect(drift?.differing).toHaveLength(2);
  });

  it('CUSTOM makes no claim to check', () => {
    expect(positionDrift({ ...colt, positionManagementPreset: 'CUSTOM' }, catalog)).toBeNull();
  });

  it('a preset the catalog cannot answer for makes no claim either', () => {
    expect(positionDrift({ ...colt, positionManagementPreset: 'GHOST' }, catalog)).toBeNull();
    expect(positionDrift(null, catalog)).toBeNull();
  });
});

describe('one coercion, both requests', () => {
  const colt = positionManagementForPreset(catalog, 'COLT') as Record<string, unknown>;

  /** What AgentEditConfirm renders: every value as String(v) under pm.*. */
  const asTransport = (obj: Record<string, unknown>) => ({
    get: (name: string) => {
      if (!name.startsWith('pm.')) return null;
      const value = obj[name.slice(3)];
      return value === undefined ? null : String(value);
    },
  });

  it('serialize → parse returns the identical object, digest included', () => {
    const parsed = positionFromTransport(asTransport(colt));
    expect(parsed).toEqual(colt);
    expect(digestOf({ tradingConfig: { positionManagement: parsed } })).toBe(
      digestOf({ tradingConfig: { positionManagement: colt } }),
    );
  });

  it('reads a raw form: checkboxes as on/absent, numbers as typed', () => {
    const query: Record<string, string> = {
      'pm.positionManagementPreset': 'CUSTOM',
      'pm.enabled': 'on',
    };
    for (const f of POSITION_MANAGEMENT_FIELDS) {
      if (!(`pm.${f}` in query) && f !== 'breakEvenEnabled' && f !== 'trailingEnabled' && f !== 'timeDecayEnabled') {
        query[`pm.${f}`] = '5';
      }
    }
    const parsed = positionFromTransport({ get: (n) => query[n] ?? null });
    expect(parsed?.['enabled']).toBe(true);
    expect(parsed?.['breakEvenEnabled']).toBe(false); // unchecked submits nothing
    expect(parsed?.['breakEvenTriggerR']).toBe(5);
    expect(parsed?.['positionManagementPreset']).toBe('CUSTOM');
  });

  it('absent entirely means no position change', () => {
    expect(positionFromTransport({ get: () => null })).toBeNull();
  });

  it('present but missing a field refuses — a partial object is a silent reset', () => {
    expect(() =>
      positionFromTransport({ get: (n) => (n === 'pm.breakEvenTriggerR' ? '1.5' : null) }),
    ).toThrow(FormError);
  });

  it('a non-numeric number refuses rather than digesting NaN', () => {
    const full = asTransport(colt);
    expect(() =>
      positionFromTransport({
        get: (n) => (n === 'pm.trailingGivebackPct' ? 'lots' : full.get(n)),
      }),
    ).toThrow(FormError);
  });
});

describe('what the person reads, and what the token binds', () => {
  const colt = positionManagementForPreset(catalog, 'COLT') as Record<string, unknown>;

  it('a preset is named as the platform´s own configuration', () => {
    const consequence = describeEdit('Volatilis', {
      tradingConfig: { positionManagement: colt },
    });
    expect(consequence).toContain("BattleGrid's own COLT configuration");
  });

  it('custom values are named as custom', () => {
    const consequence = describeEdit('Volatilis', {
      tradingConfig: { positionManagement: { ...colt, positionManagementPreset: 'CUSTOM' } },
    });
    expect(consequence).toContain('twelve custom values');
  });

  it('an agreement about one value set cannot spend against another', () => {
    const a = confirmationTarget.agentEdit('a1', {
      tradingConfig: { positionManagement: colt },
    });
    const b = confirmationTarget.agentEdit('a1', {
      tradingConfig: { positionManagement: { ...colt, trailingGivebackPct: 99 } },
    });
    expect(a).not.toBe(b);
  });
});
