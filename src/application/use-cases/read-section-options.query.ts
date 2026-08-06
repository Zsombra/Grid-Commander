import type { StrategiesPort, SectionOptionsResult } from '@/ports/strategies.js';

export interface ReadSectionOptionsRequest {
  readonly userId: string;
  readonly accessToken: string;
  readonly strategyId: string;
}

/**
 * Strategy detail and section vocabulary, in one call.
 *
 * The three reads run concurrently: the strategy (needed to pre-select the
 * checklist), the categories (needed for group headers and guidance copy), and
 * the vocabulary templates (the checklist items). They are independent — none
 * of the three needs the other's result to start.
 *
 * The platform returns the full template list regardless of which category key
 * is passed to `list_strategy_vocabulary`. The adapter handles that detail;
 * from here, `listVocabularyTemplates` is one call.
 */
export class ReadSectionOptionsQuery {
  constructor(private readonly strategies: StrategiesPort) {}

  async execute(req: ReadSectionOptionsRequest): Promise<SectionOptionsResult> {
    const [strategyResult, vocabResult, templateResult] = await Promise.all([
      this.strategies.readStrategy(req),
      this.strategies.readVocabulary(req),
      this.strategies.listVocabularyTemplates(req),
    ]);

    if (strategyResult.kind === 'missing') return { kind: 'strategy-missing' };
    if (strategyResult.kind === 'unreadable') return { kind: 'strategy-unreadable' };
    if (vocabResult.kind === 'unreadable' || templateResult.kind === 'unreadable') {
      return { kind: 'vocabulary-unreadable' };
    }

    return {
      kind: 'ready',
      detail: strategyResult.detail,
      templates: templateResult.templates,
      categories: vocabResult.categories,
      // Carried through rather than read again: the templates call is the
      // discovery call, and v9 moved the preview's ceilings onto it.
      limits: templateResult.limits,
    };
  }
}
