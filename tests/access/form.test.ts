import { describe, expect, it } from 'vitest';
import { behavior, FormError, optionalText, requiredInteger, requiredText } from '@/presentation/form.js';

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}

/**
 * Found by the production gate scan on this change.
 *
 * The routes originally read `Number(formData.get('expectedRevision'))` and
 * `String(formData.get('risk')) as Risk`. The first gives 0 for an absent field
 * and NaN for a malformed one; the second type-checks while asserting nothing.
 *
 * The revision one is the third appearance in this project of the same defect:
 * a fabricated number standing in for one that was never supplied
 * (PG-003's `expectedRevision ?? -1`, PG-101's `limit ?? 0`, and this).
 */
describe('a form is read, not coerced', () => {
  it('returns an integer that was supplied', () => {
    expect(requiredInteger(form({ expectedRevision: '4' }), 'expectedRevision')).toBe(4);
  });

  it('refuses an absent revision rather than sending 0', () => {
    expect(() => requiredInteger(form({}), 'expectedRevision')).toThrow(FormError);
  });

  it('refuses a malformed revision rather than sending NaN', () => {
    expect(() => requiredInteger(form({ expectedRevision: 'four' }), 'expectedRevision')).toThrow(
      FormError,
    );
  });

  it('refuses a fractional revision', () => {
    expect(() => requiredInteger(form({ expectedRevision: '4.5' }), 'expectedRevision')).toThrow(
      FormError,
    );
  });

  it('names the field it refused, so the message can be shown', () => {
    const err = (() => {
      try {
        requiredInteger(form({}), 'expectedRevision');
        return null;
      } catch (e) {
        return e as FormError;
      }
    })();
    expect(err?.field).toBe('expectedRevision');
  });

  it('refuses an absent required text rather than sending an empty string', () => {
    expect(() => requiredText(form({}), 'agentId')).toThrow(FormError);
    expect(() => requiredText(form({ agentId: '' }), 'agentId')).toThrow(FormError);
  });

  it('distinguishes optional-and-absent from required-and-absent', () => {
    expect(optionalText(form({}), 'brainPreset')).toBeNull();
    expect(optionalText(form({ brainPreset: 'ROMMEL' }), 'brainPreset')).toBe('ROMMEL');
  });
});

describe('a behavior profile is validated, not cast', () => {
  it('accepts a profile the domain recognises', () => {
    expect(behavior(form({ risk: 'AGGRESSIVE', outlook: 'REALIST', conviction: 'MEASURED' }))).toEqual({
      risk: 'AGGRESSIVE',
      outlook: 'REALIST',
      conviction: 'MEASURED',
    });
  });

  it('refuses a value the domain does not recognise', () => {
    // `as Risk` would have sent this to BattleGrid.
    expect(() =>
      behavior(form({ risk: 'RECKLESS', outlook: 'REALIST', conviction: 'MEASURED' })),
    ).toThrow(FormError);
  });

  it('refuses an absent field rather than defaulting it', () => {
    expect(() => behavior(form({ risk: 'MODERATE', outlook: 'REALIST' }))).toThrow(FormError);
  });

  it('names which of the three was wrong', () => {
    const err = (() => {
      try {
        behavior(form({ risk: 'MODERATE', outlook: 'REALIST', conviction: 'RECKLESS' }));
        return null;
      } catch (e) {
        return e as FormError;
      }
    })();
    expect(err?.field).toBe('conviction');
  });
});
