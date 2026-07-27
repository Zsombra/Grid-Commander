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
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
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
  };
}
