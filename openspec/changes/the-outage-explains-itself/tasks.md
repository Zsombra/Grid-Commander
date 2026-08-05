# Tasks

## 1. The transport failure

- [x] 1.1 Done. `PlatformUnavailableError` carries the status and replaces the
      bare `` `${method} failed with ${res.status}` `` at all three transport
      sites — `callTool`, the token request, and revocation
- [x] 1.2 Done, four cases rather than three: unreachable (502/503/504),
      rate-limited (429, which is not a fault at all), failed-while-handling
      (other 5xx), refused (4xx). 401/403 still go to `ConnectionRevokedError`,
      asserted so nothing quietly takes the remedy away
- [x] 1.3 Done. The status is in the sentence, not instead of it — two people
      describing the same outage to each other need the number

## 2. The discovery refusal

- [x] 2.1 Done. `DiscoveryUnavailableError` no longer opens "Configuration
      changes are unavailable". It says it could not confirm what the operation
      does and therefore did not call it — true of a read, which is what
      `/explorer` was refusing when this was found

## 3. Pinned

- [x] 3.1 Done. Nine tests over the shapes the outage produced, including the
      **actual nginx 502 body** — HTML behind a `text/html` content type, which
      no fake would have invented
- [x] 3.2 Done. The load-bearing assertion is literal: the reason must not be
      `tools/call failed with 502`, the string five surfaces showed
- [x] 3.3 Done. `./scripts/ci.sh` green

## 4. Walked, live, during the outage that found it

- [x] 4.1 Before: `/agents` said "Your roster could not be loaded. tools/call
      failed with 502"; `/arena` said only that and nothing else; `/explorer`
      said "Configuration changes are unavailable" on a read-only page
- [x] 4.2 After: every surface names BattleGrid as the fault, says the account
      and key are fine, and keeps the status. Re-walked against the live 502
      rather than asserted
- [x] 4.3 What was already right and stays untouched: nothing crashed, every
      read returned `unreadable` with `cause: 'unreachable'` rather than
      `empty`, and `/pending` and `/audit` — which need only this product's own
      database — worked normally
