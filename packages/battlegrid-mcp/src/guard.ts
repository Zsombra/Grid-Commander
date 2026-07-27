/**
 * The capability guard, as a pure precondition. It runs before any network
 * call and throws when a tool is above the client's grant or unknown. Keeping
 * it pure is what lets the boundary be proven exhaustively without a connection.
 */
import { classify, isKnownTool, TIER_RANK, type Tier } from "./scopes.js";
import { CapabilityDeniedError } from "./errors.js";

/** Throws CapabilityDeniedError unless `grant` may call `name`. Pure. */
export function assertAllowed(name: string, grant: Tier): void {
  const known = isKnownTool(name);
  const tier = classify(name); // unknown -> "wager"
  if (!known || TIER_RANK[tier] > TIER_RANK[grant]) {
    throw new CapabilityDeniedError(name, tier, grant, !known);
  }
}
