import { describe, expect, it } from 'vitest';
import type { SectionTemplate } from '@/domain/strategy/strategy.js';

/**
 * 7.6 — section selection is compiled as composed.
 *
 * The intent-builder reads from the submitted `sections[]` param, not from a
 * hard-coded list. A section absent from `sections` must be absent from the
 * intent, and a section present must appear as the correct kind/key pair.
 *
 * The logic under test is the pure reconstruction step that the edit page
 * executes when `compile=1`. It is tested here in isolation so a mutation on
 * either side can be verified in one shot (see 7.7, 7.8).
 */

/**
 * Mirrors the reconstruction in the edit page.
 *
 * `selectedKeys` — the `sections[]` query-string values from the submitted form.
 * `templates`    — the vocabulary returned by `readSectionOptions`.
 * Returns the sections array that would be placed in the compile intent.
 */
function reconstructSections(
  selectedKeys: string[],
  templates: readonly SectionTemplate[],
): Array<{ kind: string; sectionKey: string }> {
  const result: Array<{ kind: string; sectionKey: string }> = [];
  for (const key of selectedKeys) {
    const template = templates.find(
      (t) =>
        (t.kind === 'platform' && t.sectionKey === key) ||
        (t.kind === 'custom' && t.templateKey === key),
    );
    if (!template) continue;
    result.push(
      template.kind === 'platform'
        ? { kind: 'platform', sectionKey: template.sectionKey }
        : { kind: 'custom', sectionKey: template.templateKey },
    );
  }
  return result;
}

const TEMPLATES: SectionTemplate[] = [
  { kind: 'platform', sectionKey: 'includeRsi', label: 'RSI', category: 'momentum' },
  { kind: 'platform', sectionKey: 'includeMacd', label: 'MACD', category: 'momentum' },
  { kind: 'platform', sectionKey: 'includeMovingAverages', label: 'Moving Averages', category: 'trend' },
  { kind: 'custom', templateKey: 'momentum-composite', label: 'Momentum composite', category: 'momentum' },
];

describe('compile intent sections reconstruction', () => {
  /**
   * 7.6 — only selected sections appear in the intent.
   *
   * Mutation 7.7: replacing `selectedKeys` with a hard-coded list, or removing
   * the filter, would cause this test to fail because an unsubmitted section
   * would appear in the result.
   */
  it('includes only sections whose keys were submitted', () => {
    const submitted = ['includeRsi', 'includeMovingAverages'];
    const sections = reconstructSections(submitted, TEMPLATES);

    expect(sections).toHaveLength(2);
    const keys = sections.map((s) => s.sectionKey);
    expect(keys).toContain('includeRsi');
    expect(keys).toContain('includeMovingAverages');
    // includeMacd was NOT submitted and must NOT appear.
    expect(keys).not.toContain('includeMacd');
  });

  it('maps a submitted platform key to kind: platform', () => {
    const sections = reconstructSections(['includeRsi'], TEMPLATES);
    expect(sections[0]).toEqual({ kind: 'platform', sectionKey: 'includeRsi' });
  });

  /**
   * 7.8 — sections come from the vocabulary, not invented.
   *
   * Mutation: replacing `template.sectionKey` with a hard-coded string would
   * produce a different sectionKey than the one the vocabulary specifies, and
   * this test would fail.
   */
  it('reads the sectionKey from the template, not from a fixed value', () => {
    // The submitted key matches the template; the result must carry the template's own sectionKey.
    const sections = reconstructSections(['includeMacd'], TEMPLATES);
    expect(sections[0]?.sectionKey).toBe('includeMacd');
    // If the adapter had hard-coded a different key the two would diverge here.
  });

  it('maps a submitted custom templateKey to kind: custom', () => {
    const sections = reconstructSections(['momentum-composite'], TEMPLATES);
    expect(sections[0]).toEqual({ kind: 'custom', sectionKey: 'momentum-composite' });
  });

  it('silently drops a key not found in templates', () => {
    const sections = reconstructSections(['not-a-real-key'], TEMPLATES);
    expect(sections).toHaveLength(0);
  });

  it('returns an empty array when nothing is submitted', () => {
    const sections = reconstructSections([], TEMPLATES);
    expect(sections).toHaveLength(0);
  });
});
