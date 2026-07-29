# Proposal: A Remedy That Exists

## Why

Personal mode shipped one change ago. Its **primary failure path** — a wrong
key, a rotated key, a revoked key — lands on a page that tells the operator to
do something this deployment cannot do.

> Your BattleGrid connection is no longer valid. **Reconnect to continue.**

There is nothing to reconnect. `/connect` is not in the navigation, the OAuth
client is deliberately unset, and the remedy that would actually work — fix
`BATTLEGRID_API_KEY` and restart — is named nowhere on the screen.

It is not a wrong *diagnosis*. The account genuinely cannot be read and nothing
false is shown. It is a wrong *remedy*, which sends someone looking for a
connect button that was removed on purpose. Filed as
`personal-mode-says-reconnect` (P1) by the change that found it.

Looking for where the remedy is produced turned up a second face of the same
defect: **`/connect` still renders in personal mode**, offering "Continue to
BattleGrid" over a `client_id` that is empty by design. A button that cannot
work, on a page reached by the one instruction that does not apply.

## What Changes

- **The remedy becomes a value, not a sentence baked into an error.** A new
  domain type `Remedy` with two cases and one function that renders each — the
  same shape as `AssistantDisclosure`, for the same reason: the sentence is
  composed in the domain so no surface holds a copy of it.

- **`ConnectionRevokedError` takes the remedy it should name.** Required, not
  defaulted: a default would let a call site silently inherit the wrong
  deployment's advice, which is exactly the bug.

- **The composition root chooses, once.** `remedy: config.personal ?
  'repair-the-key' : 'reconnect'`, on the line next to the one that already
  chooses `heldScopes` the same way.

- **`/connect` refuses in personal mode.** It states that this deployment acts
  with a configured key, and offers no button. The consent summary, which
  describes a grant nobody is being asked for, does not render either.

- **A guard bug, uncovered by the first link this product ever drew to `/`.**
  `servableRoutes()` in the reachability test required a path separator before
  `page.tsx`, and the root route's relative path has none — so `/` was absent
  from the servable list and the new page's "Back to your agents" link was
  reported dead the moment it was written. The same bug had already been fixed
  once in `routeOf`, in the same file, and lived on in the helper written first.
  Not planned work; it had to be repaired for this change to land, and it is
  recorded here rather than left as an unexplained line in the diff.

## Why only one throw site takes the choice

`ConnectionRevokedError` is thrown from six places. Five are structurally
delegated and can never run in personal mode:

| site | why it is delegated-only |
|---|---|
| `resolve-authority.query.ts` ×4 | `OwnerOnlyUser` never calls it |
| `connect.commands.ts` ×1 | the OAuth callback flow |

The sixth — `mcp-adapter.ts`, on a 401 or 403 from BattleGrid — is the only one
a personal deployment can reach, and it is reached by *every* call. So exactly
one construction site varies, and the other five pass `'reconnect'` explicitly.
That is not ceremony: written out, each site says which deployment it belongs
to, and a reader does not have to know the table above to see it.

## Capabilities

- `battlegrid-connection` — MODIFIED: the revoked-authority message; ADDED: what
  `/connect` does when there is nothing to connect.

## Out of Scope

- **Verifying the key at request time.** A personal deployment could probe
  BattleGrid before rendering and turn a dead key into the same "not connected"
  page the delegated path uses. That would make the two modes structurally
  identical, and it would cost a round trip on every request to say something
  the request's own call is about to say anyway. Worth considering separately;
  filed if not taken.
- **`NOT_CONNECTED` and the `NotConnected` page.** Unreachable in personal mode
  — `OwnerOnlyUser` returns `acting` unconditionally. The change proves that
  rather than assuming it, and changes neither.
- **Removing the OAuth path.** Tracked as `oauth-path-may-be-dead-weight` (P2)
  and blocked on a decision that is not this change's to make.
