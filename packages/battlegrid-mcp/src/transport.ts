/** Connection concerns: read the key from env, build an authenticated session. */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { MissingCredentialError, AuthenticationError } from "./errors.js";

const DEFAULT_ENDPOINT = "https://mcp.battlegrid.trade/mcp";

export interface ConnectOptions {
  /** Overrides for testing. In normal use these come from the environment. */
  apiKey?: string;
  endpoint?: string;
}

export interface Connection {
  client: Client;
  endpoint: string;
  close(): Promise<void>;
}

/** Reads BG_API_KEY / BG_MCP_ENDPOINT unless explicitly overridden. */
export function resolveConfig(opts: ConnectOptions = {}): {
  apiKey: string;
  endpoint: string;
} {
  const apiKey = opts.apiKey ?? process.env["BG_API_KEY"];
  if (!apiKey) {
    // Thrown before any network call — see mcp-connection "Missing key".
    throw new MissingCredentialError("BG_API_KEY");
  }
  const endpoint =
    opts.endpoint ?? process.env["BG_MCP_ENDPOINT"] ?? DEFAULT_ENDPOINT;
  return { apiKey, endpoint };
}

/**
 * Establish an authenticated MCP session. Rejection of the key surfaces as an
 * AuthenticationError rather than a generic failure or a "connected" state.
 */
export async function connect(opts: ConnectOptions = {}): Promise<Connection> {
  const { apiKey, endpoint } = resolveConfig(opts);

  const transport = new StreamableHTTPClientTransport(new URL(endpoint), {
    requestInit: { headers: { Authorization: `Bearer ${apiKey}` } },
  });

  const client = new Client(
    { name: "grid-commander", version: "0.0.0" },
    { capabilities: {} },
  );

  try {
    await client.connect(transport);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/401|unauthor|invalid|missing or invalid|forbidden|403/i.test(message)) {
      throw new AuthenticationError(message);
    }
    throw err;
  }

  return {
    client,
    endpoint,
    async close() {
      await client.close();
    },
  };
}
