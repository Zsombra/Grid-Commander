import { describe, expect, it } from 'vitest';
import { describeDisclosure } from '@/domain/assistant/disclosure.js';
import { DescribeAssistantQuery } from '@/application/use-cases/describe-assistant.query.js';
import { ClaudeAssistant } from '@/infrastructure/assistant/claude.js';
import { NotConfiguredAssistant } from '@/infrastructure/assistant/not-configured.js';

/**
 * Where a question goes, and whether the user was told.
 *
 * Everything else this capability guarantees concerns what the assistant may
 * *read*. This is the only part about what it *emits*, and it is the one
 * outbound path in the product the user did not authorise by name — a
 * BattleGrid connection is granted through a screen that says BattleGrid on it.
 *
 * The property worth being strict about is not "a sentence appears". It is that
 * the sentence and the deployment cannot disagree: the disclosure is read from
 * the port that will actually answer, and no surface holds a copy.
 */

const claude = new ClaudeAssistant({ create: async () => ({}) as never });

describe('a deployment that sends questions to a third party', () => {
  it('names who receives them', () => {
    const { disclosure, sentence } = new DescribeAssistantQuery(claude).execute();

    expect(disclosure.kind).toBe('sends-outside');
    expect(sentence).toContain('Anthropic');
    expect(sentence).toMatch(/sends what I read/i);
  });

  it('says the data leaves this product, not merely that a model is used', () => {
    // "Powered by Anthropic" is a credit. The fact the user needs is that their
    // strategies go there.
    const { sentence } = new DescribeAssistantQuery(claude).execute();
    expect(sentence).toMatch(/outside this product/i);
  });

  it('distinguishes this path from everything else the product does', () => {
    const { sentence } = new DescribeAssistantQuery(claude).execute();
    expect(sentence).toMatch(/BattleGrid/);
  });

  it('does not pin the model version into what the user reads', () => {
    // A version string tells someone checking on their trading agents nothing,
    // and would make a model upgrade a change to a user-facing sentence.
    const { sentence } = new DescribeAssistantQuery(claude).execute();
    expect(sentence).not.toMatch(/claude-|opus|sonnet/i);
  });
});

describe('a deployment that sends nothing', () => {
  const described = () => new DescribeAssistantQuery(new NotConfiguredAssistant()).execute();

  it('does not claim the data goes anywhere', () => {
    // Replacing a missing true statement with a new false one is worse than the
    // gap this change closes.
    const { disclosure, sentence } = described();

    expect(disclosure.kind).toBe('nothing-answers');
    expect(sentence).not.toContain('Anthropic');
    expect(sentence).toMatch(/nothing you type here leaves/i);
  });

  it('still says the assistant cannot answer', () => {
    expect(described().sentence).toMatch(/cannot\s+answer/i);
  });
});

describe('the disclosure has one source', () => {
  it('comes from the port that will answer', () => {
    // Not from configuration read a second time. Two sources for one fact is
    // how a deployment changes and a promise does not.
    const q = new DescribeAssistantQuery(new NotConfiguredAssistant());
    expect(q.execute().disclosure.kind).toBe('nothing-answers');
    expect(new DescribeAssistantQuery(claude).execute().disclosure.kind).toBe('sends-outside');
  });

  it('needs no session, no question, and no BattleGrid', () => {
    // The page must be able to say it before anyone has asked anything — a
    // disclosure that only appears after the first question is not one.
    expect(() => new DescribeAssistantQuery(claude).execute()).not.toThrow();
  });

  it('composes the sentence in the domain, from the value', () => {
    expect(describeDisclosure({ kind: 'sends-outside', recipient: 'Somewhere Else' })).toContain(
      'Somewhere Else',
    );
    expect(describeDisclosure({ kind: 'nothing-answers' })).not.toContain('Somewhere Else');
  });
});
