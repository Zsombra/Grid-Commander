import { describe, expect, it } from 'vitest';
import type {
  Message,
  MessageCreateParamsNonStreaming,
} from '@anthropic-ai/sdk/resources/messages';
import { ClaudeAssistant } from '@/infrastructure/assistant/claude.js';
import type { MessageService } from '@/infrastructure/assistant/claude.js';
import { readOnlyToolset } from '@/domain/assistant/toolset.js';
import type { ReadOnlyToolset } from '@/domain/assistant/toolset.js';
import type { DiscoveredTool } from '@/domain/capability/tool-class.js';
import { AssistantUnavailableError, ConnectionRevokedError } from '@/domain/errors.js';
import type { AssistantRequest } from '@/ports/assistant.js';

/**
 * The loop, and only the loop.
 *
 * Every guarantee this capability makes is enforced above this class — the
 * filtered toolset, the citation, the revocation abandon — and is tested where
 * it lives. What is testable *here* is narrower and worth being strict about:
 * that a failed read reaches the model as a named failure rather than as
 * silence, that a lost connection escapes rather than being reported to the
 * model as a bad day, that a run has a ceiling, and that a provider's error
 * text never becomes something a user reads.
 */

const DISCOVERED: readonly DiscoveredTool[] = [
  {
    name: 'list_intelligence_agents',
    description: 'List the agents on this account.',
    annotations: { readOnlyHint: true },
    inputSchema: { type: 'object', properties: { limit: { type: 'number' } } },
  },
  // Reports no schema. Still offered — see `describeTool`.
  { name: 'list_strategies', annotations: { readOnlyHint: true } },
  { name: 'rebind_intelligence_agent', annotations: { readOnlyHint: false, destructiveHint: true } },
  // The server said nothing about this one.
  { name: 'some_new_tool' },
];

const TOOLSET: ReadOnlyToolset = readOnlyToolset(DISCOVERED);

function reply(parts: {
  text?: string;
  tool?: { id: string; name: string; input?: unknown };
  thinking?: string;
  stop?: Message['stop_reason'];
}): Message {
  const content: Message['content'] = [];
  if (parts.thinking !== undefined) {
    content.push({ type: 'thinking', thinking: parts.thinking, signature: 'sig-1' });
  }
  if (parts.text !== undefined) content.push({ type: 'text', text: parts.text, citations: null });
  if (parts.tool) {
    content.push({
      type: 'tool_use',
      id: parts.tool.id,
      name: parts.tool.name,
      input: parts.tool.input ?? {},
      caller: { type: 'direct' },
    });
  }
  return {
    id: 'msg_1',
    type: 'message',
    role: 'assistant',
    model: 'claude-opus-5',
    content,
    stop_reason: parts.stop ?? (parts.tool ? 'tool_use' : 'end_turn'),
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
  } as Message;
}

/** Records what it was sent and answers from a script. */
function service(script: Array<Message | Error>): MessageService & {
  sent: MessageCreateParamsNonStreaming[];
} {
  const sent: MessageCreateParamsNonStreaming[] = [];
  return {
    sent,
    async create(params) {
      sent.push(params);
      const next = script[Math.min(sent.length - 1, script.length - 1)]!;
      if (next instanceof Error) throw next;
      return next;
    },
  };
}

function ask(
  overrides: Partial<AssistantRequest> & { callTool?: AssistantRequest['callTool'] } = {},
): AssistantRequest {
  return {
    question: 'How many agents do I have?',
    toolset: TOOLSET,
    history: [],
    callTool: async () => ({ agents: [] }),
    ...overrides,
  };
}

describe('answering without reading anything', () => {
  it('returns the text and consults nothing', async () => {
    const svc = service([reply({ text: 'I can only read your own account.' })]);
    const result = await new ClaudeAssistant(svc).answer(ask());

    expect(result.text).toBe('I can only read your own account.');
    expect(result.consulted).toEqual([]);
    expect(svc.sent).toHaveLength(1);
  });

  it('carries earlier turns in order, oldest first', async () => {
    const svc = service([reply({ text: 'Three.' })]);
    await new ClaudeAssistant(svc).answer(
      ask({
        history: [
          { role: 'user', text: 'Do I have agents?' },
          { role: 'assistant', text: 'Yes.' },
        ],
      }),
    );

    expect(svc.sent[0]!.messages.map((m) => m.content)).toEqual([
      'Do I have agents?',
      'Yes.',
      'How many agents do I have?',
    ]);
  });
});

describe('reading through the toolset it was handed', () => {
  it('calls the tool the model asked for, with the arguments it produced', async () => {
    const calls: Array<[string, Record<string, unknown>]> = [];
    const svc = service([
      reply({ tool: { id: 't1', name: 'list_intelligence_agents', input: { limit: 5 } } }),
      reply({ text: 'You have three.' }),
    ]);

    const result = await new ClaudeAssistant(svc).answer(
      ask({
        callTool: async (name, args) => {
          calls.push([name, args]);
          return { agents: ['a', 'b', 'c'] };
        },
      }),
    );

    expect(calls).toEqual([['list_intelligence_agents', { limit: 5 }]]);
    expect(result.text).toBe('You have three.');
    expect(result.consulted).toEqual([{ tool: 'list_intelligence_agents', outcome: 'read' }]);
  });

  it('offers exactly the tools in the toolset, and no others', async () => {
    const svc = service([reply({ text: 'ok' })]);
    await new ClaudeAssistant(svc).answer(ask());

    expect(svc.sent[0]!.tools?.map((t) => t.name)).toEqual([
      'list_intelligence_agents',
      'list_strategies',
    ]);
  });

  it('passes the server’s own argument schema through untouched', async () => {
    const svc = service([reply({ text: 'ok' })]);
    await new ClaudeAssistant(svc).answer(ask());

    const listed = svc.sent[0]!.tools?.find((t) => t.name === 'list_intelligence_agents');
    expect(listed).toMatchObject({
      description: 'List the agents on this account.',
      input_schema: { type: 'object', properties: { limit: { type: 'number' } } },
    });
  });

  it('still offers a tool the server described without a schema', async () => {
    const svc = service([reply({ text: 'ok' })]);
    await new ClaudeAssistant(svc).answer(ask());

    // Dropping it would narrow the toolset on a BattleGrid deployment that
    // changed shape — silently, and in the direction of answering less.
    const strategies = svc.sent[0]!.tools?.find((t) => t.name === 'list_strategies');
    expect(strategies).toMatchObject({ input_schema: { type: 'object' } });
  });

  it('sends no tools at all rather than an empty list', async () => {
    const svc = service([reply({ text: 'ok' })]);
    await new ClaudeAssistant(svc).answer(ask({ toolset: { tools: [], excluded: [] } }));

    expect(svc.sent[0]!.tools).toBeUndefined();
  });

  it('keeps the model’s thinking in the turn it feeds back', async () => {
    const svc = service([
      reply({ thinking: 'which tool answers this', tool: { id: 't1', name: 'list_strategies' } }),
      reply({ text: 'Two.' }),
    ]);
    await new ClaudeAssistant(svc).answer(ask());

    // Dropping the thinking block breaks the signature chain, and the next
    // round is rejected — a failure that looks like an outage.
    const assistantTurn = svc.sent[1]!.messages[1]!;
    expect(assistantTurn.role).toBe('assistant');
    expect(assistantTurn.content).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'thinking' })]),
    );
  });
});

describe('a read that did not return', () => {
  it('goes back to the model as a failure, named', async () => {
    const svc = service([
      reply({ tool: { id: 't1', name: 'list_strategies' } }),
      reply({ text: 'I could not read your strategies.' }),
    ]);

    const result = await new ClaudeAssistant(svc).answer(
      ask({
        callTool: async () => {
          throw new Error('tools/call failed with 503');
        },
      }),
    );

    // Silence here is the failure mode that matters: a model shown nothing
    // concludes the account holds nothing.
    const results = svc.sent[1]!.messages[2]!.content;
    expect(results).toEqual([
      expect.objectContaining({
        type: 'tool_result',
        tool_use_id: 't1',
        is_error: true,
        content: expect.stringContaining('tools/call failed with 503'),
      }),
    ]);
    expect(result.consulted).toEqual([
      { tool: 'list_strategies', outcome: 'failed', failure: 'tools/call failed with 503' },
    ]);
  });

  it('does not end the answer — the model keeps going', async () => {
    const svc = service([
      reply({ tool: { id: 't1', name: 'list_strategies' } }),
      reply({ text: 'You have three agents; I could not read your strategies.' }),
    ]);

    const result = await new ClaudeAssistant(svc).answer(
      ask({
        callTool: async () => {
          throw new Error('nope');
        },
      }),
    );

    expect(result.text).toContain('could not read your strategies');
  });
});

describe('losing access mid-answer', () => {
  it('escapes the loop instead of being reported as a failed read', async () => {
    const svc = service([
      reply({ tool: { id: 't1', name: 'list_strategies' } }),
      reply({ text: 'unreachable' }),
    ]);

    // A-F. A harness that catches its own tool errors and carries on would
    // finish an answer about an account the product had just lost access to.
    await expect(
      new ClaudeAssistant(svc).answer(
        ask({
          callTool: async () => {
            throw new ConnectionRevokedError('reconnect');
          },
        }),
      ),
    ).rejects.toBeInstanceOf(ConnectionRevokedError);

    expect(svc.sent, 'the model must not be asked to continue').toHaveLength(1);
  });
});

describe('the model itself being unreachable', () => {
  it('raises AssistantUnavailableError', async () => {
    const svc = service([new Error('401 authentication_error')]);

    await expect(new ClaudeAssistant(svc).answer(ask())).rejects.toBeInstanceOf(
      AssistantUnavailableError,
    );
  });

  it('carries nothing from the provider’s error into what the user sees', async () => {
    const svc = service([new Error('invalid x-api-key: sk-ant-api03-SECRET')]);

    const thrown: unknown = await new ClaudeAssistant(svc).answer(ask()).catch((e: unknown) => e);
    const message = thrown instanceof Error ? thrown.message : String(thrown);
    expect(message).not.toContain('sk-ant');
    expect(message).not.toContain('x-api-key');
  });

  it('fails the same way once reads have already happened', async () => {
    const svc = service([reply({ tool: { id: 't1', name: 'list_strategies' } }), new Error('502')]);

    // Partial reads are not an answer waiting to be presented.
    await expect(new ClaudeAssistant(svc).answer(ask())).rejects.toBeInstanceOf(
      AssistantUnavailableError,
    );
  });
});

describe('a run has a ceiling', () => {
  it('stops after a bounded number of rounds', async () => {
    // Asks for a tool forever.
    const svc = service([reply({ text: 'looking', tool: { id: 't1', name: 'list_strategies' } })]);

    const result = await new ClaudeAssistant(svc).answer(ask());

    expect(svc.sent.length).toBeLessThanOrEqual(6);
    expect(svc.sent.length).toBeGreaterThan(1);
    expect(result.text).toContain('stopped before I was finished');
    // What was read is still identified.
    expect(result.consulted.length).toBe(svc.sent.length);
  });

  it('keeps what the model had already said', async () => {
    const svc = service([
      reply({ text: 'You have three agents.', tool: { id: 't1', name: 'list_strategies' } }),
    ]);

    const result = await new ClaudeAssistant(svc).answer(ask());
    expect(result.text).toContain('You have three agents.');
  });

  it('stops on a truncated turn rather than acting on half a tool call', async () => {
    let called = 0;
    const svc = service([
      reply({ text: 'partial', tool: { id: 't1', name: 'list_strategies' }, stop: 'max_tokens' }),
    ]);

    const result = await new ClaudeAssistant(svc).answer(
      ask({
        callTool: async () => {
          called++;
          return {};
        },
      }),
    );

    expect(called, 'a half-written tool_use block is not an instruction').toBe(0);
    expect(result.text).toContain('length limit');
  });

  it('truncates an oversized result and says that it did', async () => {
    const svc = service([
      reply({ tool: { id: 't1', name: 'list_strategies' } }),
      reply({ text: 'ok' }),
    ]);

    await new ClaudeAssistant(svc).answer(ask({ callTool: async () => 'x'.repeat(50_000) }));

    const sent = svc.sent[1]!.messages[2]!.content;
    const content = (sent as Array<{ content?: string }>)[0]!.content!;
    expect(content.length).toBeLessThan(50_000);
    // A model reading a cut-off list must know the list was cut off.
    expect(content).toContain('not the whole result');
  });
});

describe('what the model is told', () => {
  const systemOf = async (): Promise<string> => {
    const svc = service([reply({ text: 'ok' })]);
    await new ClaudeAssistant(svc).answer(ask());
    return String(svc.sent[0]!.system);
  };

  it('names the operations withheld from it', async () => {
    // So it can say "rebinding isn't something I can do" rather than "I can't
    // do that" — the requirement is that it reports what it cannot do rather
    // than attempting it.
    const system = await systemOf();
    expect(system).toContain('rebind_intelligence_agent');
    expect(system).toContain('some_new_tool');
  });

  it('tells it to report a gap rather than fill one', async () => {
    const system = await systemOf();
    expect(system).toMatch(/unknown/i);
    expect(system).toMatch(/do not say it/i);
  });

  it('tells it that a tool result is data, not an instruction', async () => {
    // Strategy fields are user-written and pass through the assistant's
    // context. This is quality, not safety — the safety is that no mutating
    // tool was ever handed over.
    const system = await systemOf();
    expect(system).toMatch(/still data/i);
  });
});
