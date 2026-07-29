import type { Scope } from './domain/connection/scope.js';
import { isScope } from './domain/connection/scope.js';
import type { BattleGridConfig } from './infrastructure/battlegrid/mcp-adapter.js';

/**
 * Configuration read once, at the composition root.
 *
 * `BATTLEGRID_CLIENT_ID` is registered out of band and pinned per environment.
 * It is never obtained at runtime: registration is open and unauthenticated, so
 * a client_id acquired on the fly proves nothing about who registered it. See
 * decision DL-4.
 */
export interface AppConfig {
  readonly battlegrid: BattleGridConfig;
  readonly databaseUrl: string;
  readonly tokenEncryptionKey: string;
  /** Signs the session cookie. Distinct from the token key: different job, different blast radius. */
  readonly sessionSecret: string;
  /** False only in local development, where there is no TLS to require. */
  readonly secureCookies: boolean;
  /**
   * Undefined is a supported deployment, not a misconfiguration.
   *
   * Without it the assistant reports that no model is configured and the rest of
   * the product is untouched — which is also what keeps `check-serving.sh`
   * honest, since it boots from `.env.example` alone and cannot be handed a real
   * key.
   */
  readonly anthropicApiKey: string | undefined;
  /**
   * The owner's own BattleGrid credential, for a personal deployment.
   *
   * Undefined leaves the delegated OAuth path exactly as it is. Present means
   * the product acts as the owner with this key and authenticates nobody — see
   * `OwnerOnlyUser`.
   */
  readonly personal: PersonalConfig | undefined;
}

export interface PersonalConfig {
  readonly apiKey: string;
  /**
   * What the operator says the key carries.
   *
   * A *declaration*, not a grant: the product cannot read a `bg_live_` key's
   * authority. Defaults to `mcp:read` — the least the product can act with, and
   * the same thing the delegated path registers for.
   */
  readonly scopes: readonly Scope[];
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/** Set-but-empty reads as absent, so a blank line in a `.env` is not a value. */
function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

/**
 * A personal deployment, or none.
 *
 * The scopes default to `mcp:read` rather than to everything the key might
 * hold. Defaulting the other way would have the product act with authority
 * nobody asked it to use, on the strength of a variable being unset.
 *
 * An unrecognised scope is refused rather than dropped: a typo silently
 * narrowing what the product will attempt is a confusing afternoon, and a typo
 * silently widening it is worse.
 */
function personalConfig(): PersonalConfig | undefined {
  const apiKey = optional('BATTLEGRID_API_KEY');
  if (!apiKey) return undefined;

  const declared = (optional('BATTLEGRID_KEY_SCOPES') ?? 'mcp:read')
    .split(/[\s,]+/)
    .filter((s) => s.length > 0);

  const unknown = declared.filter((s) => !isScope(s));
  if (unknown.length > 0) {
    throw new Error(
      `BATTLEGRID_KEY_SCOPES lists unknown scope(s): ${unknown.join(', ')}. ` +
        'BattleGrid advertises exactly mcp:read and mcp:wager.',
    );
  }

  return { apiKey, scopes: declared.filter(isScope) };
}

const BASE = 'https://mcp.battlegrid.trade';

export function loadConfig(): AppConfig {
  const personal = personalConfig();

  /**
   * The OAuth client is required only when the OAuth path is wired.
   *
   * A personal deployment never builds an authorization URL, and demanding a
   * registered `client_id` for one would force the operator to invent a value —
   * which is the fabrication this product refuses, and the exact ceremony the
   * personal path exists to remove. Registration is the thing being avoided; it
   * cannot be a precondition for avoiding it.
   */
  const oauth = (name: string): string => (personal ? (optional(name) ?? '') : required(name));

  return {
    battlegrid: {
      clientId: oauth('BATTLEGRID_CLIENT_ID'),
      mcpUrl: `${BASE}/mcp`,
      authorizeUrl: `${BASE}/authorize`,
      tokenUrl: `${BASE}/token`,
      revokeUrl: `${BASE}/revoke`,
      redirectUri: oauth('BATTLEGRID_REDIRECT_URI'),
    },
    databaseUrl: required('DATABASE_URL'),
    tokenEncryptionKey: required('TOKEN_ENCRYPTION_KEY'),
    sessionSecret: required('SESSION_SECRET'),
    // Opt *out* of secure cookies explicitly. A missing variable must not
    // silently produce a session that travels in the clear.
    secureCookies: process.env['ALLOW_INSECURE_COOKIES'] !== 'true',
    // Read through `optional`, not `required`. The asymmetry is deliberate:
    // everything above is something the product cannot run without, and this is
    // one capability's answer quality.
    anthropicApiKey: optional('ANTHROPIC_API_KEY'),
    personal,
  };
}
