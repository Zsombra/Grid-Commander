import { describe, expect, it } from 'vitest';
import { CreateAgentCommand } from '@/application/use-cases/create-agent.command.js';
import { DuplicateIdempotencyKeyError } from '@/domain/errors.js';
import { McpAgentAdapter } from '@/infrastructure/battlegrid/agent-adapter.js';
import type { BattleGridPort, ToolCallRequest } from '@/ports/battlegrid.js';
import { FakeAgentsPort } from '../support/agent-fakes.js';

const who = { userId: 'u1', accessToken: 'at' };

const validCreate = {
  ...who,
  displayName: 'New Agent',
  brain: { kind: 'preset', preset: 'ROMMEL' } as const,
  strategyId: 's1',
  money: {
    tradingMode: 'OFF',
    minAllocationUsd: 10,
    balanceThresholdUsd: 10,
    maxConcurrentExposureUsd: 100,
    maxCumulativeDrawdownUsd: 100,
    maxDailyLossUsd: 50,
  },
  idempotencyKey: 'form-key-1',
};

/**
 * A create submitted twice is one create.
 *
 * The duplicate is raised by the audit layer as a typed error; the command
 * turns exactly that into a result the surface can say a sentence about. The
 * outcome travels as a field the whole way — nothing here parses a message.
 */
describe('the command turns the duplicate into a refusal with a next step', () => {
  it('maps a duplicate of a succeeded attempt', async () => {
    const port = new FakeAgentsPort();
    port.duplicateOf = 'succeeded';
    const res = await new CreateAgentCommand(port).execute(validCreate);
    expect(res).toEqual({ kind: 'duplicate', originalOutcome: 'succeeded' });
  });

  it('maps a duplicate of an undecided attempt', async () => {
    const port = new FakeAgentsPort();
    port.duplicateOf = 'attempted';
    const res = await new CreateAgentCommand(port).execute(validCreate);
    expect(res).toEqual({ kind: 'duplicate', originalOutcome: 'attempted' });
  });

  it('catches nothing else — an unrelated failure still propagates', async () => {
    // The catch must not become the place unrelated failures go quiet. The
    // three silent arms this action already has are filed (#245); this change
    // must not add a fourth by over-catching.
    const port = new FakeAgentsPort();
    port.createAgent = async () => {
      throw new Error('BattleGrid returned 503');
    };
    await expect(new CreateAgentCommand(port).execute(validCreate)).rejects.toThrow(
      'BattleGrid returned 503',
    );
  });

  it('the typed error is the contract: fields, not message text', () => {
    const err = new DuplicateIdempotencyKeyError('create_intelligence_agent', 'succeeded');
    expect(err.originalOutcome).toBe('succeeded');
    expect(err.tool).toBe('create_intelligence_agent');
  });
});

/**
 * Where the key lands, not only that it is plumbed.
 *
 * The #229 annotation records the exact gap this guards: a test that checks
 * the key is *passed* stays green while the key never reaches the platform,
 * because request-level plumbing and the tool's own `arguments` are different
 * places. This asserts on `arguments` — deleting the spread in `createAgent`
 * fails here even though `request.idempotencyKey` still flows.
 */
describe('the key lands in the tool arguments', () => {
  function adapterCapturing(sink: ToolCallRequest[]) {
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
        sink.push(request);
        return {
          content: { agent: { id: 'a1', revision: 1, displayName: 'New Agent' } },
          classification: {
            mutating: true,
            destructive: false,
            requiredScope: 'mcp:read',
            basis: 'annotations',
          },
          auditEntryId: 'audit-1',
        };
      },
    };
    return new McpAgentAdapter(battlegrid);
  }

  const createParams = {
    ...who,
    displayName: 'New Agent',
    brain: { kind: 'preset', preset: 'ROMMEL' } as const,
    strategyId: 's1',
    tradingConfig: null,
  };

  it('sends the key inside arguments, where the create tool declares it', async () => {
    const requests: ToolCallRequest[] = [];
    await adapterCapturing(requests).createAgent({ ...createParams, idempotencyKey: 'k-wire' });

    const [req] = requests;
    expect(req?.args['idempotencyKey']).toBe('k-wire');
    // Both places, on purpose: the wire carries it to the platform, the
    // request-level field carries it to the audit record.
    expect(req?.idempotencyKey).toBe('k-wire');
  });

  it('sends no idempotencyKey argument at all when there is no key', async () => {
    // An absent key must be absent, not `undefined` — a tool declaring
    // additionalProperties: false rejects the whole payload for a key it
    // does not expect, and an explicit undefined still serialises as a key.
    const requests: ToolCallRequest[] = [];
    await adapterCapturing(requests).createAgent(createParams);
    expect(Object.keys(requests[0]?.args ?? {})).not.toContain('idempotencyKey');
  });
});
