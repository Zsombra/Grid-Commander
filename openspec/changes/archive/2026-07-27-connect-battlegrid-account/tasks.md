# Tasks

## 0. Prove the assumption first

- [x] 0.1 Complete a Dynamic Client Registration against the live BattleGrid
      server and record what it returns — durable credentials or not, and the
      access/refresh token lifetimes. **Nothing below is safe to build until
      this is known**; it is the one assumption reading cannot confirm.
- [ ] 0.2 Confirm whether scope can be stepped up without re-consenting
      **Not proven** — needs a human consenting in a browser. Carried as DL-8.

## 1. Connection

- [x] 1.1 OAuth client: DCR, authorization with PKCE, callback, token exchange
- [x] 1.2 Reject a callback that does not match a pending request for that user
- [x] 1.3 Leave nothing behind when a flow is abandoned or fails mid-way
- [x] 1.4 Token custody: encrypted at rest, refreshed server-side only
- [x] 1.5 Disconnect, revoking at BattleGrid rather than only locally
- [x] 1.6 Handle authority withdrawn at BattleGrid — fail cleanly, offer reconnect

## 2. Identity

- [x] 2.1 The connection is the identity; no separate password
- [x] 2.2 A returning user lands in their existing workspace
- [x] 2.3 History survives disconnection

## 3. Scope and classification

- [x] 3.1 Request read scope only; never request wager authority
- [x] 3.2 Discover capabilities per session from the live connection
- [x] 3.3 Classify each operation from the server's own annotations
- [x] 3.4 Unknown or unclassifiable operations are treated as destructive
- [x] 3.5 Degrade to confirmed-read-only when discovery fails, and say so
- [x] 3.6 Refuse operations needing authority the connection lacks, before
      attempting them
- [x] 3.7 One layer every caller goes through — no direct tool access elsewhere

## 4. Consent surface

- [x] 4.1 Describe the granted access as able to create and change agents and
      strategies — never as read-only
- [x] 4.2 Distinguish it from committing funds, which is not requested

## 5. Audit

- [x] 5.1 Record before attempting; update with the outcome
- [x] 5.2 An interrupted operation reads as attempted, outcome unknown
- [x] 5.3 Per-user audit view, newest first

## 6. Concurrency

- [x] 6.1 Surface a conflicting change honestly; never retry automatically

## 7. Verification

- [x] 7.1 Tests cover every scenario in the delta spec, including the failure
      paths — declined consent, mismatched callback, discovery failure,
      unknown-tool classification, interrupted audit write
- [x] 7.2 Confirm no code path can reach a wager-scoped operation
