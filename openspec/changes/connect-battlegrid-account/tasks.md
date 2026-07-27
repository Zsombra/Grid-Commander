# Tasks

## 0. Prove the assumption first

- [ ] 0.1 Complete a Dynamic Client Registration against the live BattleGrid
      server and record what it returns — durable credentials or not, and the
      access/refresh token lifetimes. **Nothing below is safe to build until
      this is known**; it is the one assumption reading cannot confirm.
- [ ] 0.2 Confirm whether scope can be stepped up without re-consenting

## 1. Connection

- [ ] 1.1 OAuth client: DCR, authorization with PKCE, callback, token exchange
- [ ] 1.2 Reject a callback that does not match a pending request for that user
- [ ] 1.3 Leave nothing behind when a flow is abandoned or fails mid-way
- [ ] 1.4 Token custody: encrypted at rest, refreshed server-side only
- [ ] 1.5 Disconnect, revoking at BattleGrid rather than only locally
- [ ] 1.6 Handle authority withdrawn at BattleGrid — fail cleanly, offer reconnect

## 2. Identity

- [ ] 2.1 The connection is the identity; no separate password
- [ ] 2.2 A returning user lands in their existing workspace
- [ ] 2.3 History survives disconnection

## 3. Scope and classification

- [ ] 3.1 Request read scope only; never request wager authority
- [ ] 3.2 Discover capabilities per session from the live connection
- [ ] 3.3 Classify each operation from the server's own annotations
- [ ] 3.4 Unknown or unclassifiable operations are treated as destructive
- [ ] 3.5 Degrade to confirmed-read-only when discovery fails, and say so
- [ ] 3.6 Refuse operations needing authority the connection lacks, before
      attempting them
- [ ] 3.7 One layer every caller goes through — no direct tool access elsewhere

## 4. Consent surface

- [ ] 4.1 Describe the granted access as able to create and change agents and
      strategies — never as read-only
- [ ] 4.2 Distinguish it from committing funds, which is not requested

## 5. Audit

- [ ] 5.1 Record before attempting; update with the outcome
- [ ] 5.2 An interrupted operation reads as attempted, outcome unknown
- [ ] 5.3 Per-user audit view, newest first

## 6. Concurrency

- [ ] 6.1 Surface a conflicting change honestly; never retry automatically

## 7. Verification

- [ ] 7.1 Tests cover every scenario in the delta spec, including the failure
      paths — declined consent, mismatched callback, discovery failure,
      unknown-tool classification, interrupted audit write
- [ ] 7.2 Confirm no code path can reach a wager-scoped operation
