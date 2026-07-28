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

const BASE = 'https://mcp.battlegrid.trade';

export function loadConfig(): AppConfig {
  return {
    battlegrid: {
      clientId: required('BATTLEGRID_CLIENT_ID'),
      mcpUrl: `${BASE}/mcp`,
      authorizeUrl: `${BASE}/authorize`,
      tokenUrl: `${BASE}/token`,
      revokeUrl: `${BASE}/revoke`,
      redirectUri: required('BATTLEGRID_REDIRECT_URI'),
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
  };
}
