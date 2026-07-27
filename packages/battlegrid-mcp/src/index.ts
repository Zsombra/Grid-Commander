/**
 * @grid-commander/battlegrid-mcp — the typed, capability-gated BattleGrid client.
 *
 * The default way in is observe or manage. A wager-capable client exists but is
 * deliberately not the default — it requires explicit authorization (see
 * createWagerClient). The 16 money tools are unreachable from observe/manage,
 * enforced both in the types and at runtime.
 */
export {
  createObserveClient,
  createManageClient,
  createWagerClient,
  type ObserveClient,
  type ManageClient,
  type WagerClient,
  type WagerAuthorization,
  type ToolResult,
  type AccountIdentity,
  type Health,
} from "./client.js";
export { checkHealth } from "./health.js";
export {
  classify,
  isKnownTool,
  KNOWN_TOOLS,
  WAGER_TOOLS,
  MANAGE_TOOLS,
  OBSERVE_TOOLS,
  type Tier,
} from "./scopes.js";
export {
  MissingCredentialError,
  AuthenticationError,
  CapabilityDeniedError,
} from "./errors.js";
export type { ConnectOptions } from "./transport.js";
