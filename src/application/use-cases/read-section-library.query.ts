import type { FailureCause } from '@/ports/failure.js';
import type { SectionTemplate, StrategiesPort } from '@/ports/strategies.js';

/**
 * One group of section templates, as the platform grouped them.
 *
 * `category` is `null` for the bucket the platform published no category for.
 * Not "other", not "uncategorised" — the product does not name a group the
 * platform declined to name, it just stops drawing a heading. The v11 record's
 * template entries carry `columns`, `kind`, `sectionKey` and `title` and no
 * category at all, so this bucket is the ordinary case rather than the edge.
 */
export interface SectionGroup {
  readonly category: string | null;
  readonly templates: readonly SectionTemplate[];
}

export type SectionLibraryResult =
  | { readonly kind: 'sections'; readonly groups: readonly SectionGroup[] }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

/**
 * Every section template the platform's vocabulary advertises.
 *
 * The same read the edit page's checklist is built from, asked without a
 * strategy — because what a section *contains* is vocabulary, not state. A
 * strategy is where you choose whether to include one; this is where you find
 * out what including it would read.
 *
 * There is no `empty` case, deliberately. An account cannot have "no section
 * templates" — the templates are the platform's, and a vocabulary that comes
 * back with none is a read that did not work. `unreadable` says so; an empty
 * library would tell a user the platform publishes no sections.
 */
export class ReadSectionLibraryQuery {
  constructor(private readonly strategies: StrategiesPort) {}

  async execute(req: { userId: string; accessToken: string }): Promise<SectionLibraryResult> {
    const listed = await this.strategies.listVocabularyTemplates(req);
    if (listed.kind === 'unreadable') {
      return { kind: 'unreadable', reason: listed.reason, cause: listed.cause };
    }
    if (listed.templates.length === 0) {
      return {
        kind: 'unreadable',
        reason: 'BattleGrid returned no section templates.',
        cause: 'unreachable',
      };
    }

    // First-seen order, so the library reads in the order the platform sent it
    // rather than in an order this product decided was better. A Map keeps that
    // order for free.
    const byCategory = new Map<string, SectionTemplate[]>();
    const ungrouped: SectionTemplate[] = [];
    for (const template of listed.templates) {
      const category = template.category;
      if (category === undefined || category.length === 0) {
        ungrouped.push(template);
        continue;
      }
      const found = byCategory.get(category);
      if (found) found.push(template);
      else byCategory.set(category, [template]);
    }

    const groups: SectionGroup[] = [...byCategory].map(([category, templates]) => ({
      category,
      templates,
    }));
    // Last, so a partially categorised vocabulary reads as groups then
    // leftovers rather than interleaved.
    if (ungrouped.length > 0) groups.push({ category: null, templates: ungrouped });

    return { kind: 'sections', groups };
  }
}
