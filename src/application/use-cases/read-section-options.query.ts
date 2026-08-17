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
    // The reason and cause travel with the failure. Collapsing to the kind
    // alone left the page unable to say anything beyond "something went
    // wrong" — the reason existed here and stopped here.
    if (strategyResult.kind === 'unreadable') {
      return {
        kind: 'strategy-unreadable',
        reason: strategyResult.reason,
        cause: strategyResult.cause,
      };
    }
    // Whichever of the two failed explains itself. Checked separately rather
    // than folded into one condition: both are "the vocabulary" to the page,
    // but only the one that actually failed has a reason to give.
    if (vocabResult.kind === 'unreadable') {
      return {
        kind: 'vocabulary-unreadable',
        reason: vocabResult.reason,
        cause: vocabResult.cause,
      };
    }
    if (templateResult.kind === 'unreadable') {
      return {
        kind: 'vocabulary-unreadable',
        reason: templateResult.reason,
        cause: templateResult.cause,
      };
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
