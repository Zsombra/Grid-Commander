/**
 * The capability-gated client. Three faces — observe / manage / wager — each
 * exposing only the tools at or below its tier. The runtime guard in `dispatch`
 * is the real guarantee: it refuses an over-tier or unknown tool before any
 * network call, even if a caller reaches it through an untyped path.
 */
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { connect, type ConnectOptions } from "./transport.js";
import { assertAllowed } from "./guard.js";
import {
  classify,
  KNOWN_TOOLS,
  TIER_RANK,
  type Tier,
  type ObserveTool,
  type ManageTool,
  type WagerTool,
} from "./scopes.js";

export type ToolResult = Awaited<ReturnType<Client["callTool"]>>;

export interface AccountIdentity {
  username: string;
  balanceUsdc: string;
  wagerEnabled: boolean;
}

export interface Health {
  reachable: boolean;
  account: AccountIdentity;
}

/** Shared surface on every client face. */
interface BaseClient {
  readonly grant: Tier;
  /** Reachable status + which account we are authenticated as. */
  health(): Promise<Health>;
  /** Tool names this client is permitted to call (its tier and below). */
  availableTools(): string[];
  /** The account identity captured at connect time. */
  readonly identity: AccountIdentity;
  close(): Promise<void>;
}

/** observe: pure reads only. */
export interface ObserveClient extends BaseClient {
  readonly grant: "observe";
  call(name: ObserveTool, args?: Record<string, unknown>): Promise<ToolResult>;
}

/** manage: reads + account writes that move no money. */
export interface ManageClient extends BaseClient {
  readonly grant: "manage";
  call(
    name: ObserveTool | ManageTool,
    args?: Record<string, unknown>,
  ): Promise<ToolResult>;
}

/** wager: everything, including the 16 money tools. Constructed explicitly only. */
export interface WagerClient extends BaseClient {
  readonly grant: "wager";
  call(
    name: ObserveTool | ManageTool | WagerTool,
    args?: Record<string, unknown>,
  ): Promise<ToolResult>;
}

class CoreClient implements BaseClient {
  identity!: AccountIdentity;

  constructor(
    readonly grant: Tier,
    private readonly conn: Awaited<ReturnType<typeof connect>>,
  ) {}

  /** The guard. Runs on every call, before any request reaches the network. */
  async call(
    name: string,
    args: Record<string, unknown> = {},
  ): Promise<ToolResult> {
    assertAllowed(name, this.grant); // throws before any network call
    return this.conn.client.callTool({ name, arguments: args });
  }

  availableTools(): string[] {
    return [...KNOWN_TOOLS]
      .filter((n) => TIER_RANK[classify(n)] <= TIER_RANK[this.grant])
      .sort();
  }

  async health(): Promise<Health> {
    const account = await this.fetchIdentity();
    this.identity = account;
    return { reachable: true, account };
  }

  async fetchIdentity(): Promise<AccountIdentity> {
    const result = await this.conn.client.callTool({
      name: "get_account_state",
      arguments: {},
    });
    return parseIdentity(result);
  }

  async close(): Promise<void> {
    await this.conn.close();
  }
}

function parseIdentity(result: ToolResult): AccountIdentity {
  const content = result.content as Array<{ type: string; text?: string }>;
  const text = content.find((c) => c.type === "text")?.text ?? "{}";
  const data = JSON.parse(text) as {
    username?: string;
    balance?: { totalBalance?: string };
    mcpWagerEnabled?: boolean;
  };
  return {
    username: data.username ?? "unknown",
    balanceUsdc: data.balance?.totalBalance ?? "0",
    wagerEnabled: data.mcpWagerEnabled ?? false,
  };
}

async function build(
  grant: Tier,
  opts: ConnectOptions,
): Promise<CoreClient> {
  const conn = await connect(opts);
  const core = new CoreClient(grant, conn);
  // Fetch identity on connect so the client can report "connected as X".
  // A rejected key surfaces here as an auth failure, never as "connected".
  core.identity = await core.fetchIdentity();
  return core;
}

export async function createObserveClient(
  opts: ConnectOptions = {},
): Promise<ObserveClient> {
  const core = await build("observe", opts);
  return core as unknown as ObserveClient;
}

export async function createManageClient(
  opts: ConnectOptions = {},
): Promise<ManageClient> {
  const core = await build("manage", opts);
  return core as unknown as ManageClient;
}

/**
 * Explicit, logged authorization required to obtain a money-capable client.
 * There is no default path to this — a caller must deliberately acknowledge.
 */
export interface WagerAuthorization {
  acknowledged: true;
  reason: string;
}

export async function createWagerClient(
  authorization: WagerAuthorization,
  opts: ConnectOptions = {},
): Promise<WagerClient> {
  if (authorization?.acknowledged !== true || !authorization.reason) {
    throw new Error(
      "createWagerClient requires an explicit WagerAuthorization " +
        "{ acknowledged: true, reason }. Real money moves through this client.",
    );
  }
  // Logged: a wager-capable client is a consequential, auditable event.
  process.stderr.write(
    `[battlegrid-mcp] WAGER client constructed — reason: ${authorization.reason}\n`,
  );
  const core = await build("wager", opts);
  return core as unknown as WagerClient;
}
