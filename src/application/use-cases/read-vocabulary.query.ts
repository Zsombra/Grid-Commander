import type { StrategiesPort, VocabularyResult } from '@/ports/strategies.js';

export interface ReadVocabularyResponse {
  readonly vocabulary: VocabularyResult;
  /** Whether composing may be offered at all. */
  readonly composable: boolean;
}

/**
 * The vocabulary a strategy is composed from — categories, and through them
 * metrics, transforms and signals.
 *
 * Read at the start of a composing session and reused for it. Not written down
 * anywhere: my first compile against the live server guessed
 * `coinSelection.mode` and was wrong (the values are `ranked | explicit`, and
 * the reference lists the field without its values), and the second failed on a
 * rule that appears in no schema field at all. See findings-strategies F-8.
 *
 * Without it, composing is not offered. A form built on a vocabulary we could
 * not read would reject whatever the user typed.
 */
export class ReadVocabularyQuery {
  constructor(private readonly strategies: StrategiesPort) {}

  async execute(req: { userId: string; accessToken: string }): Promise<ReadVocabularyResponse> {
    const vocabulary = await this.strategies.readVocabulary(req);
    return { vocabulary, composable: vocabulary.kind === 'vocabulary' };
  }
}
