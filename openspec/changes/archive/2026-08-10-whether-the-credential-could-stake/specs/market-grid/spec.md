## ADDED Requirements

### Requirement: The Watch-Only Stance Names Both Gates Between This Product And A Stake
Beside its statement that entering a session is not offered, the arena SHALL
state whether BattleGrid permits MCP-signed wagers on this account, and that
Grid-Commander holds no wager scope regardless of that setting.

Two independent gates stand between this product and a stake, and they fail
differently: the account's own `mcpWagerEnabled` setting is the platform's
answer and can change without this product knowing, while the absence of
`mcp:wager` from the requested scopes is this product's standing decision. A
page that names only the product's refusal invites the reading that flipping a
setting here would enable play; a page that names only the account's setting
implies this credential could act on it.

The account setting is read live, never assumed, and the read fails
independently: an unreadable account state costs this sentence and nothing
else on the page.

#### Scenario: Wagering is permitted on the account
- **WHEN** the arena renders and the account state reports `mcpWagerEnabled`
  true
- **THEN** the page states that BattleGrid would allow MCP wagers on this
  account
- **AND** states that Grid-Commander holds no scope to place one

#### Scenario: Wagering is not permitted on the account
- **WHEN** the account state reports `mcpWagerEnabled` false
- **THEN** the page states that BattleGrid does not allow MCP wagers on this
  account
- **AND** does not describe the product's missing scope as the only gate

#### Scenario: The platform reports no funded account
- **WHEN** the account state reports `hasAccount` false
- **THEN** the page states that the platform reports no funded account
- **AND** does not describe wagering as merely disabled

#### Scenario: The account state cannot be read
- **WHEN** the account state read fails
- **THEN** the page says why, using the shared explanation
- **AND** the sessions, rules and entry facts still render
