import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { McpStrategyAdapter } from '@/infrastructure/battlegrid/strategy-adapter.js';
import { ComposeColumnQuery, readTemplateColumn } from '@/application/use-cases/compose-column.query.js';
import { ReadSectionLibraryQuery } from '@/application/use-cases/read-section-library.query.js';
import { columnFromQuery, columnQuery } from '@/presentation/column-form.js';
import type { DiscoveredTool } from '@/domain/capability/tool-class.js';
import type { BattleGridPort, ToolCallRequest } from '@/ports/battlegrid.js';
import {
  aColumnContract,
  aMetric,
  aMetricHints,
  FakeStrategiesPort,
} from '../support/strategy-fakes.js';

/**
 * The inside of a section: what the platform publishes about it, what this
 * product is allowed to say about it, and what it must never write down.
 *
 * The vocabulary in every assertion below comes from the platform's own
 * recorded declaration rather than from anything typed here — the same
 * discipline `brain-presets.test.ts` adopted after ten hand-written values sat
 * beside an eleven-value enum for eight days.
 */

const CONTRACT_TOOL = 'get_strategy_column_contract';

interface Capabilities {
  tools: Array<{ name: string; inputSchema?: Record<string, unknown> }>;
}

const recorded = (
  JSON.parse(readFileSync('docs/battlegrid-mcp-capabilities.json', 'utf8')) as Capabilities
).tools.find((t) => t.name === CONTRACT_TOOL);

const contractTool: DiscoveredTool = { name: CONTRACT_TOOL, inputSchema: recorded?.inputSchema };

/** Straight out of the record by hand — the independent read the walk is checked against. */
function properties(node: unknown): Record<string, unknown> {
  return ((node as Record<string, unknown>)['properties'] ?? {}) as Record<string, unknown>;
}
const columnProps = properties(properties(contractTool.inputSchema)['column']);
const timeframeBranches = (columnProps['timeframe'] as Record<string, unknown>)[
  'anyOf'
] as Record<string, unknown>[];
const enumOf = (node: unknown): readonly string[] =>
  ((node as Record<string, unknown>)?.['enum'] ?? []) as readonly string[];

const DECLARED = {
  relativeTimeframes: enumOf(properties(timeframeBranches[0])['rel']),
  absoluteTimeframes: enumOf(properties(timeframeBranches[1])['abs']),
  bars: enumOf(columnProps['bars']),
  ordering: enumOf(columnProps['ordering']),
  sides: enumOf(columnProps['side']),
};

const who = { userId: 'u1', accessToken: 'at' };

function adapterOver(
  respond: (req: ToolCallRequest) => unknown,
  discover: () => Promise<readonly DiscoveredTool[]> = async () => [contractTool],
) {
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
    discoverTools: discover,
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

describe('the column controls are read from the declaration', () => {
  it('is checking against a record that actually pins them', () => {
    // Vacuity: every assertion below compares the walk against this read, and
    // two empty lists agree perfectly.
    expect(recorded, `${CONTRACT_TOOL} is in the capabilities record`).toBeTruthy();
    expect(DECLARED.relativeTimeframes.length).toBeGreaterThan(2);
    expect(DECLARED.absoluteTimeframes.length).toBeGreaterThan(5);
    expect(DECLARED.bars.length).toBe(2);
    expect(DECLARED.ordering.length).toBe(4);
    expect(DECLARED.sides.length).toBe(2);
  });

  it('offers exactly what the recorded schema declares, at every control', async () => {
    const { adapter } = adapterOver(() => ({}));
    expect(await adapter.columnControls(who)).toEqual(DECLARED);
  });

  it('reads both branches of the timeframe union, not the first', async () => {
    // `column.timeframe` is an `anyOf` whose two branches pin `rel` and `abs`
    // at the same path. A walk taking one branch reports half the declaration —
    // the failure the brain-preset walk was written for.
    const { adapter } = adapterOver(() => ({}));
    const controls = await adapter.columnControls(who);
    expect(controls.relativeTimeframes.length).toBeGreaterThan(0);
    expect(controls.absoluteTimeframes.length).toBeGreaterThan(0);
  });

  it('follows the platform when it moves, rather than remembering', async () => {
    // The property that makes this a read rather than a copy: a deployment that
    // narrows `ordering` narrows the product with it, with no edit here.
    const moved = JSON.parse(JSON.stringify(contractTool.inputSchema)) as Record<string, unknown>;
    const props = properties(properties(moved)['column']);
    (props['ordering'] as Record<string, unknown>)['enum'] = ['only-this'];
    const { adapter } = adapterOver(
      () => ({}),
      async () => [{ name: CONTRACT_TOOL, inputSchema: moved }],
    );
    expect((await adapter.columnControls(who)).ordering).toEqual(['only-this']);
  });

  it('finds a control the schema dedups behind a local $ref', async () => {
    // The 2026-08-06 dump carries 370 refs — zod's dedup output — and
    // `sectionTimeframe` already stands behind one pointing into the column.
    // A walk that stopped at a ref would report nothing where one stands, and
    // BattleGrid re-emits these schemas on every deployment.
    const behind = JSON.parse(JSON.stringify(contractTool.inputSchema)) as Record<string, unknown>;
    const props = properties(properties(behind)['column']);
    behind['$defs'] = { bars: props['bars'] };
    props['bars'] = { $ref: '#/$defs/bars' };
    const { adapter } = adapterOver(
      () => ({}),
      async () => [{ name: CONTRACT_TOOL, inputSchema: behind }],
    );
    expect((await adapter.columnControls(who)).bars).toEqual(DECLARED.bars);
  });

  it('answers empty when discovery fails — never a remembered list', async () => {
    const { adapter } = adapterOver(
      () => ({}),
      async () => {
        throw new Error('discovery is down');
      },
    );
    expect(await adapter.columnControls(who)).toEqual({
      relativeTimeframes: [],
      absoluteTimeframes: [],
      bars: [],
      ordering: [],
      sides: [],
    });
  });

  it('answers empty when the platform no longer serves the tool', async () => {
    const { adapter } = adapterOver(
      () => ({}),
      async () => [],
    );
    expect((await adapter.columnControls(who)).bars).toEqual([]);
  });

  it('makes no tool call to find them out', async () => {
    const { adapter, calls } = adapterOver(() => ({}));
    await adapter.columnControls(who);
    expect(calls, 'the declaration is already in hand — asking again would be a round trip').toEqual(
      [],
    );
  });
});

describe('the two controls v5 added reach the wire', () => {
  it('sends bars and ordering as the schema names them', async () => {
    // The port and the adapter have carried both since the column grammar
    // shipped, and nothing asserted the wire shape because no surface could set
    // them. Now one can, so the last hop is held: a column that says `closed`
    // and `near` must arrive saying so.
    const { adapter, calls } = adapterOver(() => ({ contract: {} }));
    await adapter.columnContract({
      ...who,
      column: {
        metric: 'RSI14',
        transformId: 'value',
        timeframe: { rel: 'anchor' },
        bars: 'closed',
        ordering: 'near',
      },
    });
    expect((calls[0]?.args as Record<string, unknown>)['column']).toMatchObject({
      bars: 'closed',
      ordering: 'near',
    });
  });

  it('omits them entirely when the column does not set them', async () => {
    // Both are optional and the column object is closed. Sending `undefined`
    // where the platform expects a value absent is how an optional argument
    // becomes a validation error.
    const { adapter, calls } = adapterOver(() => ({ contract: {} }));
    await adapter.columnContract({
      ...who,
      column: { metric: 'RSI14', transformId: 'value', timeframe: { rel: 'anchor' } },
    });
    const column = (calls[0]?.args as Record<string, unknown>)['column'] as Record<string, unknown>;
    expect(Object.keys(column)).toEqual(['metric', 'transformId', 'timeframe']);
  });

  it('offers a value at each of them that the declaration really pins', async () => {
    // Vacuity, and the point of the change: what the editor offers must be what
    // the platform accepts, both read from the same record.
    const { adapter } = adapterOver(() => ({}));
    const controls = await adapter.columnControls(who);
    expect(DECLARED.bars).toContain(controls.bars[0]);
    expect(DECLARED.ordering).toContain(controls.ordering[0]);
  });
});

describe('a section template carries what the platform sent', () => {
  /** Shaped from the v11 record: `{columns, kind, sectionKey, title}` — no `label`. */
  const V11_TEMPLATE = {
    kind: 'platform',
    sectionKey: 'includeRsi',
    title: 'RSI',
    columns: [{ metric: 'RSI14', transformId: 'value', timeframe: { rel: 'anchor' } }],
  };

  function vocabularyOver(templates: unknown[]) {
    return (req: ToolCallRequest) => {
      if (req.tool === 'list_strategy_categories') return { categories: [{ category: 'momentum' }] };
      if (req.tool === 'list_strategy_vocabulary') return { templates };
      throw new Error(`unexpected tool: ${req.tool}`);
    };
  }

  it('takes the name from `title` when the entry carries no `label`', async () => {
    // The v11 record's first template has `title` and no `label`, so a mapper
    // reading only `label` renders the section checklist as blank checkboxes.
    const { adapter } = adapterOver(vocabularyOver([V11_TEMPLATE]));
    const result = await adapter.listVocabularyTemplates(who);
    expect(result.kind).toBe('templates');
    if (result.kind !== 'templates') return;
    expect(result.templates[0]?.label).toBe('RSI');
  });

  it('carries the columns through instead of dropping them', async () => {
    const { adapter } = adapterOver(vocabularyOver([V11_TEMPLATE]));
    const result = await adapter.listVocabularyTemplates(who);
    if (result.kind !== 'templates') throw new Error('templates expected');
    expect(result.templates[0]?.columns).toEqual(V11_TEMPLATE.columns);
  });

  it('leaves the columns absent when the entry published none', async () => {
    // Absent and empty are different claims and the surfaces say them
    // differently, so the mapper must not invent `[]`.
    const { adapter } = adapterOver(
      vocabularyOver([{ kind: 'platform', sectionKey: 'includeMacd', title: 'MACD' }]),
    );
    const result = await adapter.listVocabularyTemplates(who);
    if (result.kind !== 'templates') throw new Error('templates expected');
    expect(result.templates[0]?.columns).toBeUndefined();
  });
});

describe('the section library', () => {
  it('groups by the platform’s own category and leaves the rest ungrouped, last', async () => {
    const port = new FakeStrategiesPort();
    port.templates = [
      { kind: 'platform', sectionKey: 'a', label: 'A', category: 'momentum' },
      { kind: 'platform', sectionKey: 'b', label: 'B' },
      { kind: 'platform', sectionKey: 'c', label: 'C', category: 'momentum' },
    ];
    const result = await new ReadSectionLibraryQuery(port).execute(who);
    if (result.kind !== 'sections') throw new Error('sections expected');
    expect(result.groups.map((g) => g.category)).toEqual(['momentum', null]);
    expect(result.groups[0]?.templates).toHaveLength(2);
  });

  it('says unreadable rather than showing an empty library', async () => {
    const port = new FakeStrategiesPort();
    port.vocabularyTemplatesReadable = false;
    const result = await new ReadSectionLibraryQuery(port).execute(who);
    expect(result.kind).toBe('unreadable');
  });

  it('treats a vocabulary answering no templates as a read that did not work', async () => {
    // The platform's sections are the platform's. "You have no sections" is not
    // a state an account can be in, so it is never rendered as one.
    const port = new FakeStrategiesPort();
    port.templates = [];
    const result = await new ReadSectionLibraryQuery(port).execute(who);
    expect(result.kind).toBe('unreadable');
  });
});

describe('reading one template’s columns', () => {
  it('reads the parts the platform sent, operands unwrapped', () => {
    const column = readTemplateColumn({
      metric: 'RSI14',
      transformId: 'spread',
      timeframe: { abs: '1h' },
      window: 4,
      offset: 0,
      bars: 'closed',
      ordering: 'hi',
      inputs: [{ metric: 'RSI7' }, { metric: 'STOCH_K' }],
    });
    expect(column.proposal).toMatchObject({
      metric: 'RSI14',
      transformId: 'spread',
      timeframe: { abs: '1h' },
      window: 4,
      bars: 'closed',
      ordering: 'hi',
      inputs: ['RSI7', 'STOCH_K'],
    });
    expect(column.missing).toEqual([]);
    expect(column.unrecognised).toEqual([]);
  });

  it('names a key it does not carry, and still reads the column', () => {
    // The grammar gained two controls in one deployment. A reader that kept the
    // parts it recognised would describe a narrower column than the platform's.
    const column = readTemplateColumn({
      metric: 'CLOSE',
      transformId: 'value',
      timeframe: { rel: 'anchor' },
      smoothing: 'ema',
    });
    expect(column.unrecognised).toEqual(['smoothing']);
    expect(column.proposal?.metric).toBe('CLOSE');
  });

  it('names what is missing rather than composing a column around the hole', () => {
    const column = readTemplateColumn({ transformId: 'value' });
    expect(column.proposal).toBeNull();
    expect(column.missing).toEqual(['metric', 'timeframe']);
  });
});

describe('composing a column against a section', () => {
  function world() {
    const port = new FakeStrategiesPort();
    port.stageMetric(aMetricHints());
    port.stageMetric(
      aMetricHints({ summary: aMetric({ id: 'CLOSE', label: 'Close', family: 'price' }) }),
    );
    return port;
  }

  const compose = (port: FakeStrategiesPort, over: Record<string, unknown> = {}) =>
    new ComposeColumnQuery(port).execute({
      ...who,
      sectionKey: 'includeRsi',
      metric: null,
      column: null,
      ...over,
    });

  it('answers no-such-section for a key the vocabulary does not advertise', async () => {
    expect((await compose(world(), { sectionKey: 'includeGhost' })).kind).toBe('no-such-section');
  });

  it('answers unreadable when the vocabulary cannot be read', async () => {
    const port = world();
    port.vocabularyTemplatesReadable = false;
    expect((await compose(port)).kind).toBe('unreadable');
  });

  it('reads the section’s own columns, with nothing composed yet', async () => {
    const result = await compose(world());
    if (result.kind !== 'section') throw new Error('section expected');
    expect(result.columns).toHaveLength(2);
    expect(result.columns[0]?.proposal?.metric).toBe('RSI14');
    expect(result.hints).toBeNull();
    expect(result.check).toBeNull();
  });

  it('sends no unlisted metric to either tool', async () => {
    const port = world();
    const result = await compose(port, {
      metric: 'GHOST',
      column: { metric: 'GHOST', transformId: 'value', timeframe: { rel: 'anchor' } },
    });
    if (result.kind !== 'section') throw new Error('section expected');
    expect(result.hints).toEqual({ kind: 'no-such-metric' });
    expect(result.check).toBeNull();
    expect(port.calls.some((c) => c.op === 'column-contract')).toBe(false);
  });

  it('carries the composed column to the contract check, bars and ordering included', async () => {
    // The two controls v5 added and no surface offered. A column composed here
    // that cannot say either is the defect this change exists to close.
    const port = world();
    port.columnOutcome = { kind: 'contract', contract: aColumnContract() };
    await compose(port, {
      column: {
        metric: 'RSI14',
        transformId: 'value',
        timeframe: { rel: 'anchor' },
        bars: 'closed',
        ordering: 'near',
      },
    });
    expect(port.calls.find((c) => c.op === 'column-contract')?.payload).toMatchObject({
      metric: 'RSI14',
      bars: 'closed',
      ordering: 'near',
    });
  });

  it('takes the metric from the composed column when the two disagree', async () => {
    // The form carries both. Showing hints for one while checking the other
    // would explain the wrong transform beside the right verdict.
    const port = world();
    port.columnOutcome = { kind: 'contract', contract: aColumnContract() };
    const result = await compose(port, {
      metric: 'RSI14',
      column: { metric: 'CLOSE', transformId: 'value', timeframe: { rel: 'anchor' } },
    });
    if (result.kind !== 'section') throw new Error('section expected');
    expect(result.hints?.kind === 'metric' && result.hints.hints.summary.id).toBe('CLOSE');
  });

  it('establishes membership once, not once per tool', async () => {
    // `listMetrics` is ten category reads merged. Composing `ReadMetricQuery`
    // and `CheckColumnQuery` on one page would pay for twenty.
    const port = world();
    let indexReads = 0;
    const listMetrics = port.listMetrics.bind(port);
    port.listMetrics = async () => {
      indexReads += 1;
      return listMetrics();
    };
    port.columnOutcome = { kind: 'contract', contract: aColumnContract() };
    await compose(port, {
      column: { metric: 'RSI14', transformId: 'value', timeframe: { rel: 'anchor' } },
    });
    expect(indexReads).toBe(1);
  });

  it('carries a refusal as a result, in the platform’s words', async () => {
    const port = world();
    const result = await compose(port, {
      column: { metric: 'RSI14', transformId: 'spread', timeframe: { rel: 'anchor' } },
    });
    if (result.kind !== 'section') throw new Error('section expected');
    expect(result.check?.kind).toBe('refused');
  });
});

describe('a column read off a query string', () => {
  it('is nothing at all when no metric was named', () => {
    expect(columnFromQuery({})).toEqual({ metric: null, column: null, problems: [] });
  });

  it('is a metric being read, not a column being composed, without a transform', () => {
    const draft = columnFromQuery({ metric: 'RSI14' });
    expect(draft.metric).toBe('RSI14');
    expect(draft.column).toBeNull();
    expect(draft.problems).toEqual([]);
  });

  it('tells the two halves of the timeframe union apart by their tag', () => {
    expect(
      columnFromQuery({ metric: 'RSI14', transformId: 'value', tf: 'rel:anchor' }).column?.timeframe,
    ).toEqual({ rel: 'anchor' });
    expect(
      columnFromQuery({ metric: 'RSI14', transformId: 'value', tf: 'abs:1h' }).column?.timeframe,
    ).toEqual({ abs: '1h' });
  });

  it('refuses a window that is not a whole number, and sends nothing', () => {
    // `Number.parseInt('4 bars')` is 4, which would send a column nobody composed.
    const draft = columnFromQuery({
      metric: 'RSI14',
      transformId: 'value',
      tf: 'rel:anchor',
      window: '4 bars',
    });
    expect(draft.column).toBeNull();
    expect(draft.problems).toHaveLength(1);
    expect(draft.problems[0]).toContain('whole number');
  });

  it('says a column with no timeframe is unfinished rather than guessing one', () => {
    const draft = columnFromQuery({ metric: 'RSI14', transformId: 'value' });
    expect(draft.column).toBeNull();
    expect(draft.problems[0]).toContain('timeframe');
  });

  it('round-trips a column through the link that reopens it', () => {
    // A "start from this column" link that dropped a control would seed the
    // editor with a different column than the one it was opened from.
    const column = {
      metric: 'RSI14',
      transformId: 'spread',
      timeframe: { abs: '4h' } as const,
      window: 4,
      offset: 1,
      side: 'support',
      inputs: ['RSI7', 'STOCH_K'],
      bars: 'closed',
      ordering: 'far',
      chainedTransformId: 'trajectory',
    };
    const back = columnFromQuery(Object.fromEntries(new URLSearchParams(columnQuery(column))));
    expect(back.column).toEqual(column);
  });
});
