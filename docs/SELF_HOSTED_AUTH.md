# Self-Hosted / Personal Authentication

Grid-Commander supports a **Personal Mode** (self-hosted authentication) that allows you to operate the tool against your own BattleGrid account without needing to register a third-party OAuth client. 

When Personal Mode is active, the delegated OAuth flow, PKCE, and session-based login are bypassed. The application acts entirely on behalf of the configured owner.

## How to Operate

To enable self-hosted authentication, set the following environment variables (e.g., in your `.env` file):

1. **`BATTLEGRID_API_KEY`** (Required for Personal Mode)
   Provide your personal BattleGrid API key (usually starts with `bg_live_`).
   *Setting this variable alone enables Personal Mode.*

2. **`BATTLEGRID_KEY_SCOPES`** (Optional)
   A space or comma-separated list declaring the scopes your key possesses.
   - **Default**: `mcp:read`
   - **Available scopes**: `mcp:read`, `mcp:wager`
   *Example*: `BATTLEGRID_KEY_SCOPES="mcp:read mcp:wager"`

   *Note: Scope is a declaration in this mode, not a verifiable grant. The product cannot dynamically read a `bg_live_` key's authority. Any unrecognized scope provided here will result in an application startup failure to prevent silent authorization widening.*

## Behavior Changes

- **No Login Required**: The product skips the `/connect` flow and acts immediately using the configured API key.
- **Bypasses OAuth Requirements**: `BATTLEGRID_CLIENT_ID` and other OAuth-specific environment variables are no longer required to start the application.
- **Reversibility**: Unsetting `BATTLEGRID_API_KEY` instantly reverts the application to the standard multi-tenant OAuth flow.
