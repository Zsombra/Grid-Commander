import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { App } from '@/composition.js';
import type { Authority, ToolDefinition } from './tools.js';
import { READ_ONLY_NOTICE, TOOLS } from './tools.js';

/**
 * Grid-Commander, offered to whatever model the operator runs.
 *
 * This file is the only place that knows about MCP-the-protocol on the
 * serving side. Everything a tool does is a use-case call — the same
 * objects the web routes use — so a model asking "why didn't it trade"
 * gets the product's answer, with its derivations and its refusals, rather
 * than BattleGrid's raw payload.
 *
 * Note the direction. This product is an MCP *client* of BattleGrid and,
 * here, an MCP *server* to the operator's model. They share no code path,
 * and this one opens no outbound connection at all — which is why it does
 * not disturb `one-destination`, and why it is the shape a chat UI could
 * not have been.
 *
 * The low-level `Server` rather than `McpServer`: the tool table is JSON
 * Schema already, and `McpServer.registerTool` wants Zod shapes. Going
 * through the request handlers keeps the table the single description of
 * this surface, which is what the read-only guard reads.
 */

/**
 * What a tool hands back.
 *
 * Always a JSON body naming its own state, never a thrown error for a read
 * that answered. A use-case reporting `unreadable` is telling the truth
 * about the platform; turning that into an MCP error would put it in front
 * of a model as a tool failure, and a model reporting a failed roster call
 * very often says "you have no agents" — the exact lie `RosterResult` was
 * shaped to prevent, re-introduced one boundary out.
 */
function body(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] };
}

/**
 * The protocol failing is different from a read refusing.
 *
 * Missing arguments and a use-case that throws are reported as errors.
 * Nothing a use-case *returns* reaches here.
 */
function protocolError(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true as const };
}

export const SERVER_INSTRUCTIONS =
  'Grid-Commander understands BattleGrid trading agents: what they decided, what they did ' +
  'with the money, why they did or did not trade, and how they compare to everyone else’s. ' +
  'Prefer these tools over BattleGrid’s own — they carry figures this product derives because ' +
  'the platform publishes them wrongly or not at all, and they keep "nothing exists" apart ' +
  'from "we could not ask". When a result says it is unreadable, say so; do not report it as ' +
  'an absence.\n\n' +
  READ_ONLY_NOTICE;

export function buildServer(params: {
  app: App;
  authority: Authority;
  tools?: readonly ToolDefinition[];
}): Server {
  const tools = params.tools ?? TOOLS;
  const byName = new Map(tools.map((t) => [t.name, t]));

  const server = new Server(
    { name: 'grid-commander', version: '1.0.0' },
    { capabilities: { tools: {} }, instructions: SERVER_INSTRUCTIONS },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: {
        type: 'object' as const,
        properties: t.input,
        ...(t.required ? { required: [...t.required] } : {}),
      },
      annotations: {
        // Every tool on this surface, without exception. The guard in
        // `tests/architecture/mcp-read-only.test.ts` is what makes this
        // true rather than merely declared.
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = byName.get(request.params.name);
    if (!tool) return protocolError(`No such tool: ${request.params.name}`);

    const given = (request.params.arguments ?? {}) as Record<string, unknown>;
    for (const key of tool.required ?? []) {
      if (given[key] === undefined || given[key] === null || given[key] === '') {
        return protocolError(`${tool.name} needs "${key}".`);
      }
    }

    try {
      return body(await tool.call(params.app, params.authority, given));
    } catch (err) {
      // A use-case that throws is this product failing, not the platform
      // refusing — the refusals come back as values. Reported as an error
      // so a model does not narrate it as an answer.
      return protocolError(
        `${tool.name} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  });

  return server;
}
