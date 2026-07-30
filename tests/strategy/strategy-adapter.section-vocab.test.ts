import { describe, expect, it } from 'vitest';
import { McpStrategyAdapter } from '@/infrastructure/battlegrid/strategy-adapter.js';
import type { BattleGridPort, ToolCallRequest } from '@/ports/battlegrid.js';
import { ToolRefusedError } from '@/infrastructure/battlegrid/mcp-adapter.js';

function adapterOver(respond: (req: ToolCallRequest) => unknown) {
  const calls: ToolCallRequest[] = [];
  const battlegrid: BattleGridPort = {
    buildAuthorizationUrl: () => '',
    exchangeCode: async () => {
      throw new Error('unused');
    },
    refresh: async () => {
      throw new Error('unused');
    },
    revoke: async () => {},
    discoverTools: async () => [],
    callTool: async (request) => {
      calls.push(request);
      return {
        content: respond(request),
        classification: {
          mutating: false,
          destructive: false,
          requiredScope: 'mcp:read',
          basis: 'annotations',
        },
        auditEntryId: 'a1',
      };
    },
  };
  return { adapter: new McpStrategyAdapter(battlegrid), calls };
}

const who = { userId: 'u1', accessToken: 'at' };

/** Templates shaped from the live API: 22 platform, 2 custom. */
const LIVE_TEMPLATES = [
  { sectionKey: 'includeRsi', label: 'RSI', category: 'momentum' },
  { sectionKey: 'includeMacd', label: 'MACD', category: 'momentum' },
  { templateKey: 'momentum-composite', label: 'Momentum composite', category: 'momentum' },
];

const LIVE_CATEGORIES = [{ category: 'momentum', label: 'Momentum' }];

/**
 * The adapter calls list_strategy_categories first to get a valid key,
 * then list_strategy_vocabulary with that key.
 */
function vocabularyResponder(templates = LIVE_TEMPLATES, categories = LIVE_CATEGORIES) {
  return (req: ToolCallRequest) => {
    if (req.tool === 'list_strategy_categories') return { categories };
    if (req.tool === 'list_strategy_vocabulary') return { templates };
    throw new Error(`unexpected tool: ${req.tool}`);
  };
}

/**
 * 7.4 — platform entries map to kind: 'platform', custom entries to kind: 'custom'.
 * ToolRefusedError → 'unreadable'.
 */
describe('listVocabularyTemplates', () => {
  it('maps platform templates (sectionKey present) to kind: platform', async () => {
    const { adapter } = adapterOver(vocabularyResponder());
    const result = await adapter.listVocabularyTemplates(who);

    expect(result.kind).toBe('templates');
    if (result.kind !== 'templates') return;

    const platform = result.templates.filter((t) => t.kind === 'platform');
    expect(platform).toHaveLength(2);
    expect(platform[0]).toMatchObject({ kind: 'platform', sectionKey: 'includeRsi', label: 'RSI' });
    expect(platform[1]).toMatchObject({ kind: 'platform', sectionKey: 'includeMacd', label: 'MACD' });
  });

  it('maps custom templates (templateKey present) to kind: custom', async () => {
    const { adapter } = adapterOver(vocabularyResponder());
    const result = await adapter.listVocabularyTemplates(who);

    expect(result.kind).toBe('templates');
    if (result.kind !== 'templates') return;

    const custom = result.templates.filter((t) => t.kind === 'custom');
    expect(custom).toHaveLength(1);
    expect(custom[0]).toMatchObject({
      kind: 'custom',
      templateKey: 'momentum-composite',
      label: 'Momentum composite',
    });
  });

  /**
   * 7.5 — entries missing both sectionKey and templateKey are silently skipped,
   * not thrown.
   */
  it('skips entries missing both sectionKey and templateKey', async () => {
    const templatesWithGarbage: unknown[] = [
      ...LIVE_TEMPLATES,
      { label: 'Orphan — no key at all' },
      { label: 'Also bad', someOtherKey: 'x' },
    ];
    const { adapter } = adapterOver(vocabularyResponder(templatesWithGarbage as typeof LIVE_TEMPLATES));
    const result = await adapter.listVocabularyTemplates(who);

    expect(result.kind).toBe('templates');
    if (result.kind !== 'templates') return;

    // The three valid entries make it through; the two invalid ones are dropped.
    expect(result.templates).toHaveLength(3);
  });

  it('returns unreadable when the tool is refused', async () => {
    const battlegrid: BattleGridPort = {
      buildAuthorizationUrl: () => '',
      exchangeCode: async () => {
        throw new Error('unused');
      },
      refresh: async () => {
        throw new Error('unused');
      },
      revoke: async () => {},
      discoverTools: async () => [],
      callTool: async () => {
        throw new ToolRefusedError('list_strategy_categories', 'permission denied');
      },
    };
    const adapter = new McpStrategyAdapter(battlegrid);
    const result = await adapter.listVocabularyTemplates(who);
    expect(result.kind).toBe('unreadable');
  });

  it('carries the category field when the platform supplies it', async () => {
    const { adapter } = adapterOver(vocabularyResponder());
    const result = await adapter.listVocabularyTemplates(who);

    expect(result.kind).toBe('templates');
    if (result.kind !== 'templates') return;

    const rsi = result.templates.find((t) => t.kind === 'platform' && t.sectionKey === 'includeRsi');
    expect(rsi?.category).toBe('momentum');
  });
});
