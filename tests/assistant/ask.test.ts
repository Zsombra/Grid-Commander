import { describe, expect, it } from 'vitest';
import { AskAssistantCommand, UnreachableToolError } from '@/application/use-cases/ask-assistant.command.js';
import { CANNOT_ESTABLISH, describeIncompleteness, OUTSIDE_THIS_ACCOUNT } from '@/domain/assistant/answer.js';
import { ConnectionRevokedError } from '@/domain/errors.js';
import type { DiscoveredTool } from '@/domain/capability/tool-class.js';
import type { AssistantPort, AssistantRequest, AssistantResponse } from '@/ports/assistant.js';
import type { BattleGridPort, ToolCallRequest } from '@/ports/battlegrid.js';
import { FakeAuditStore, FakeClock } from '../support/fakes.js';

const DISCOVERED: readonly DiscoveredTool[] = [
  { name: 'list_intelligence_agents', annotations: { readOnlyHint: true } },
  { name: 'list_strategies', annotations: { readOnlyHint: true } },
  { name: 'rebind_intelligence_agent', annotations: { readOnlyHint: false, destructiveHint: true } },
];

/** A scripted assistant: it does exactly what the test tells it to. */
class ScriptedAssistant implements AssistantPort {
  seen: AssistantRequest | null = null;
  constructor(private readonly script: (req: AssistantRequest) => Promise<AssistantResponse>) {}
  async answer(request: AssistantRequest): Promise<AssistantResponse> {
    this.seen = request;
    return this.script(request);
  }
}

function harness(opts: {
  script: (req: AssistantRequest) => Promise<AssistantResponse>;
  discovery?: 'ok' | 'fails';
  toolResult?: (req: ToolCallRequest) => unknown;
}) {
  const clock = new FakeClock();
  const audit = new FakeAuditStore(clock);
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
    discoverTools: async () => {
      if (opts.discovery === 'fails') throw new Error('tools/list failed');
      return DISCOVERED;
    },
    callTool: async (request) => {
      calls.push(request);
      const content = opts.toolResult ? opts.toolResult(request) : { ok: true };
      if (content instanceof Error) throw content;
      return {
        content,
        classification: { mutating: false, destructive: false, requiredScope: 'mcp:read', basis: 'annotations' },
        auditEntryId: 'a1',
      };
    },
  };

  const assistant = new ScriptedAssistant(opts.script);
  return { calls, audit, assistant, ask: new AskAssistantCommand(battlegrid, assistant) };
}

const who = { userId: 'u1', accessToken: 'at', question: 'How many agents do I have?' };

/** The assistant can only read. */
describe('the toolset handed to the assistant', () => {
  it('contains only tools that read', async () => {
    const h = harness({ script: async () => ({ text: 'ok', consulted: [] }) });
    await h.ask.execute(who);
    expect(h.assistant.seen?.toolset.tools.map((t) => t.name)).toEqual([
      'list_intelligence_agents',
      'list_strategies',
    ]);
  });

  /**
   * The check that makes the guarantee not rest on the model honouring the list
   * it was handed. It should be impossible to trip. It is checked anyway.
   */
  it('refuses a call for a tool outside the set, even if the model asks', async () => {
    const h = harness({
      script: async (req) => {
        await req.callTool('rebind_intelligence_agent', {});
        return { text: 'should not get here', consulted: [] };
      },
    });
    await expect(h.ask.execute(who)).rejects.toBeInstanceOf(UnreachableToolError);
    // Nothing reached BattleGrid.
    expect(h.calls).toEqual([]);
  });

  it('marks its reads as the assistant’s, not the user’s', async () => {
    const h = harness({
      script: async (req) => {
        await req.callTool('list_intelligence_agents', {});
        return { text: 'You have three agents.', consulted: [] };
      },
    });
    await h.ask.execute(who);
    expect(h.calls[0]?.actor).toBe('assistant');
  });
});

/** An answer names what it was built from. */
describe('attribution', () => {
  it('records every read the assistant made', async () => {
    const h = harness({
      script: async (req) => {
        await req.callTool('list_intelligence_agents', {});
        await req.callTool('list_strategies', {});
        return { text: 'Three agents across two strategies.', consulted: [] };
      },
    });
    const { answer } = await h.ask.execute(who);
    expect(answer.kind).toBe('grounded');
    if (answer.kind !== 'grounded') return;
    expect(answer.consulted.map((c) => c.tool)).toEqual(['list_intelligence_agents', 'list_strategies']);
  });

  /**
   * A-B. "I did not look anything up" and "I looked and found nothing" are
   * different claims, and only the second is about the user's account.
   */
  it('an answer built from nothing is general, not a statement about the account', async () => {
    const h = harness({ script: async () => ({ text: 'BattleGrid agents trade on signals.', consulted: [] }) });
    const { answer } = await h.ask.execute(who);
    expect(answer.kind).toBe('general');
  });

  /**
   * The citation is what this use case observed, not what the port reported — a
   * port that under-reported its reads would otherwise be writing its own
   * citation.
   */
  it('takes the citation from the reads it saw, not from the assistant’s claim', async () => {
    const h = harness({
      script: async (req) => {
        await req.callTool('list_strategies', {});
        // The port claims it consulted nothing.
        return { text: 'You have two strategies.', consulted: [] };
      },
    });
    const { answer } = await h.ask.execute(who);
    expect(answer.kind === 'grounded' && answer.consulted.map((c) => c.tool)).toEqual(['list_strategies']);
  });
});

/** A failed read degrades the answer rather than the request. */
describe('a read that did not return', () => {
  it('names the missing part rather than omitting it', async () => {
    const h = harness({
      toolResult: (req) =>
        req.tool === 'list_strategies' ? new Error('timeout') : { agents: [] },
      script: async (req) => {
        await req.callTool('list_intelligence_agents', {});
        await req.callTool('list_strategies', {}).catch(() => undefined);
        return { text: 'You have three agents.', consulted: [] };
      },
    });
    const { answer } = await h.ask.execute(who);
    expect(answer.kind).toBe('grounded');
    if (answer.kind !== 'grounded') return;
    expect(answer.incomplete).toEqual(['list_strategies']);

    const note = describeIncompleteness(answer);
    expect(note).toContain('list_strategies');
    // The distinction that matters: unknown, not absent.
    expect(note).toMatch(/unknown rather than absent/i);
  });

  it('says nothing about incompleteness when everything returned', async () => {
    const h = harness({
      script: async (req) => {
        await req.callTool('list_intelligence_agents', {});
        return { text: 'Three.', consulted: [] };
      },
    });
    const { answer } = await h.ask.execute(who);
    expect(describeIncompleteness(answer)).toBeNull();
  });
});

/** Asking requires an account that can act. */
describe('losing access', () => {
  /**
   * A-F. The reads that succeeded happened before the authority was withdrawn,
   * so returning them is defensible — and wrong. A user who has just been
   * disconnected should not receive a synthesised statement about their account
   * composed from a grant that no longer exists.
   */
  it('abandons the answer rather than completing it from what was already read', async () => {
    const h = harness({
      toolResult: (req) =>
        req.tool === 'list_strategies' ? new ConnectionRevokedError() : { agents: [1, 2, 3] },
      script: async (req) => {
        await req.callTool('list_intelligence_agents', {});
        await req.callTool('list_strategies', {});
        return { text: 'You have three agents.', consulted: [] };
      },
    });
    const { answer } = await h.ask.execute(who);
    expect(answer.kind).toBe('refused');
    expect(answer.kind === 'refused' && answer.reason).toMatch(/not connected/i);
  });

  /**
   * The case the mutation test exposed. A model harness that catches its own
   * tool errors and carries on is entirely ordinary — and without the
   * revocation re-throw, it would produce a grounded answer about an account it
   * had just lost access to, with the revocation recorded as nothing worse than
   * a failed read.
   *
   * A-F says the answer is abandoned. That has to hold whether or not the model
   * chooses to notice.
   */
  it('abandons the answer even when the assistant swallows the error', async () => {
    const h = harness({
      toolResult: (req) =>
        req.tool === 'list_strategies' ? new ConnectionRevokedError() : { agents: [1, 2, 3] },
      script: async (req) => {
        await req.callTool('list_intelligence_agents', {});
        // The model catches, shrugs, and answers from what it got.
        await req.callTool('list_strategies', {}).catch(() => undefined);
        return { text: 'You have three agents.', consulted: [] };
      },
    });
    const { answer } = await h.ask.execute(who);
    expect(answer.kind, 'a swallowed revocation must not become a grounded answer').toBe('refused');
  });

  it('refuses when it cannot find out what it may read', async () => {
    const h = harness({ discovery: 'fails', script: async () => ({ text: 'x', consulted: [] }) });
    const { answer } = await h.ask.execute(who);
    expect(answer.kind).toBe('refused');
    // Not "something went wrong" — it says why it would be guessing.
    expect(answer.kind === 'refused' && answer.reason).toMatch(/guessing/i);
  });

  it('consults nothing when discovery failed', async () => {
    const h = harness({ discovery: 'fails', script: async () => ({ text: 'x', consulted: [] }) });
    await h.ask.execute(who);
    expect(h.calls).toEqual([]);
  });
});

/** Not knowing is an answer. */
describe('the phrases for what it cannot do', () => {
  it('says what it would need rather than apologising', () => {
    expect(CANNOT_ESTABLISH).toMatch(/only read your own/i);
    expect(CANNOT_ESTABLISH).toMatch(/agents, your strategies/i);
  });

  it('refuses questions outside the account without answering them from elsewhere', () => {
    expect(OUTSIDE_THIS_ACCOUNT).toMatch(/outside your account/i);
    expect(OUTSIDE_THIS_ACCOUNT).toMatch(/guess that sounds like a reading is worse/i);
  });
});
