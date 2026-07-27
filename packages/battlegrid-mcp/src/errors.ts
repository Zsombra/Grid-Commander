/** Errors the client raises. Distinct types so callers can react precisely. */
import type { Tier } from "./scopes.js";

/** A required environment variable was missing — thrown before any network call. */
export class MissingCredentialError extends Error {
  constructor(public readonly variable: string) {
    super(
      `${variable} is not set. Grid Commander needs a BattleGrid API key in the ` +
        `environment to connect. Set ${variable} (see .env.example) and retry.`,
    );
    this.name = "MissingCredentialError";
  }
}

/** Authentication with the server failed — a bad or rejected key. */
export class AuthenticationError extends Error {
  constructor(reason: string) {
    super(`BattleGrid rejected the API key: ${reason}`);
    this.name = "AuthenticationError";
  }
}

/**
 * A tool call was refused by the capability boundary before any network call.
 * This is the money-safety guarantee firing, not a bug.
 */
export class CapabilityDeniedError extends Error {
  constructor(
    public readonly tool: string,
    public readonly requiredTier: Tier,
    public readonly grantedTier: Tier,
    public readonly unknownTool: boolean,
  ) {
    super(
      unknownTool
        ? `Refused "${tool}": unknown tool. The BattleGrid tool surface may have ` +
            `changed — run \`pnpm gen:tools\` to refresh. Unknown tools are treated ` +
            `as wager-tier and never called by default.`
        : `Refused "${tool}": it is a ${requiredTier}-tier tool, but this client ` +
            `only holds ${grantedTier}-tier access. Construct the appropriate ` +
            `client explicitly if this action is intended.`,
    );
    this.name = "CapabilityDeniedError";
  }
}
