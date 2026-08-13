import { describe, expect, it } from 'vitest';
import { AgentForm } from '@/presentation/components/agent-form.js';
import { defaultCatalog } from '../support/agent-fakes.js';
import { aStrategy } from '../support/strategy-fakes.js';
import { rendered } from './support/render.js';

/** Any stable value: these tests assert on structure, not on the key itself. */
const KEY = 'test-idempotency-key';

/**
 * What the create form does with the preset set it is handed.
 *
 * The set is read from `create_intelligence_agent`'s own schema now, so it has
 * a state it never had while it was a constant: **it can be empty because the
 * declaration could not be read**. An empty select would say the platform has no
 * presets, which is a claim about BattleGrid made on the strength of a read that
 * failed — the roster's empty-versus-unreadable distinction, one form in.
 */

const action = async () => {};
// The strategy the agent will read. Required since #177: the form asks for it,
// so every render of it has to supply one.
const strategies = [{ strategy: aStrategy(), governs: 'Governs no agents', editable: true, fork: { kind: 'offered' } }] as never;

describe('the presets the form offers', () => {
  it('offers each one the catalog carries', async () => {
    const catalog = { ...defaultCatalog(), brainPresets: ['ALPHA', 'BRAVO'] };
    const { text } = await rendered(AgentForm({ catalog, strategies, action, idempotencyKey: KEY }));
    expect(text).toContain('ALPHA');
    expect(text).toContain('BRAVO');
    // The other route is still named, so neither branch of the union is hidden.
    expect(text).toContain('Choose a model instead');
  });

  it('offers nothing the catalog does not carry', async () => {
    const catalog = { ...defaultCatalog(), brainPresets: ['ALPHA'] };
    const { text } = await rendered(AgentForm({ catalog, strategies, action, idempotencyKey: KEY }));
    expect(text).not.toContain('BRAVO');
  });

  it('says the platform did not declare them rather than showing an empty choice', async () => {
    const catalog = { ...defaultCatalog(), brainPresets: [] };
    const { text } = await rendered(AgentForm({ catalog, strategies, action, idempotencyKey: KEY }));
    expect(text).toMatch(/did not declare/i);
    // And does not present the empty set as a choice control at all.
    expect(text).not.toContain('Choose a model instead');
  });

  it('keeps the model route open when the presets could not be read', async () => {
    const catalog = { ...defaultCatalog(), brainPresets: [] };
    const { text } = await rendered(AgentForm({ catalog, strategies, action, idempotencyKey: KEY }));
    const model = defaultCatalog().models[0];
    expect(model).toBeDefined();
    expect(text).toContain(model?.displayName);
  });
});
