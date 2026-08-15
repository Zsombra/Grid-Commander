# Tasks

## 1. Domain — the advisory, and the opportunity read

- [x] 1.1 `src/domain/agent/feasibility.ts`: the advisory type, modelled as the
      **two-arm union** the platform declares. The unavailable arm carries
      `coinTicker` + `status` and nothing else; the numeric arm carries the
      band, the request, `responsibleBound` and `shortfallPct`. No optional
      numbers on the unavailable arm — the union is the point (D-3).
- [x] 1.2 Same file: `opportunity(advisory)` — the aggregate an operator reads.
      Constructible, blocked (with the dial that blocked each), and not
      evaluated, each with the whole it was counted over.
- [x] 1.3 Same file: `constructibleUnder(advisory, ceilingPct)` — how many
      coins still construct at a candidate ceiling, from the returned bands.
      Pure arithmetic, in the domain, for the reason `AgainstDefault` states.
- [x] 1.4 Same file: `candidateCeilings(advisory)` — the ceilings worth showing
      the curve at, derived from the returned bands rather than hard-coded, so
      a fleet whose bands sit nowhere near 2.00% is not shown 2.00%.
- [x] 1.5 Unit tests: the unavailable arm never counts as blocked; an empty
      `coins[]` is distinct from an absent advisory; `constructibleUnder`
      is monotonic in the ceiling; `responsibleBound: null` is a real answer.

## 2. Infrastructure — read it, do not invent it

- [x] 2.1 `src/infrastructure/battlegrid/agent-mapper.ts`: `mapFeasibilityAdvisory`.
      Returns `null` for absent, and `null` for anything that does not match
      the declared shape — never a partial object (D-1).
- [x] 2.2 `src/infrastructure/battlegrid/agent-adapter.ts:300`: stop discarding
      `payload['feasibilityAdvisory']`. Return the pair.
- [x] 2.3 Tests against the **v19.1.0 declared shape** in
      `docs/battlegrid-mcp-capabilities.json`, plus: absent, `null`, an object
      missing `counts`, and a `coins[]` entry matching neither arm.

## 3. Ports and application

- [x] 3.1 `src/ports/agents.ts`: `updateAgent` returns
      `{ agent, feasibility: FeasibilityAdvisory | null }`. Document why the
      pair rather than a widened `Agent` — the advisory is about the strategy's
      dials against today's tape, not about the agent's stored state.
- [x] 3.2 `src/application/use-cases/update-agent.command.ts`: carry it on the
      `updated` arm. No branching on it — the command does not decide whether
      an edit worked based on what can be traded afterwards.
- [x] 3.3 Update every other implementation of `AgentsPort` (test doubles, any
      in-memory adapter) so the widened return type is honoured, not cast.

## 4. The carried reply

- [x] 4.1 `src/domain/agent/feasibility-reply.ts` (or beside the cookie
      adapter): encode/decode the reply as `{ agentId, issuedAt, advisory }`,
      with a staleness window stated as a named constant and a reason.
- [x] 4.2 `src/infrastructure/http/feasibility-reply-cookie.ts`: HMAC-SHA256
      over the payload with the server secret, `timingSafeEqual` verify,
      `httpOnly` + `secure` + `sameSite: 'lax'`, short `maxAge`. Mirrors
      `CookieSession`'s idiom deliberately; do not invent a second signing
      scheme (D-2).
- [x] 4.3 Port + composition wiring, alongside `CookieSession`.
- [x] 4.4 Tests: a good round trip; a tampered payload; a payload signed with a
      different secret; a payload naming another agent; a stale payload. Each
      renders nothing rather than something partial.
- [x] 4.5 Size ceiling: a payload that will not fit a cookie falls back to the
      platform's own `counts` block alone and **says the per-coin detail could
      not be carried**. A silent truncation would misreport a fleet.

## 5. Presentation

- [x] 5.1 `app/(app)/agents/[id]/edit/actions.ts`: on `updated`, issue the
      reply cookie before the existing `redirect(`/agents/${agentId}`)`. The
      redirect target does not change.
- [x] 5.2 `src/presentation/components/feasibility.tsx`: the panel. Opportunity
      language, the blocking dial named per coin, the not-evaluated count
      stated separately, the ceiling curve marked as derived, and the
      dial-direction sentence — **Max Stop Loss limits opportunity when turned
      down, not up; a high ceiling never blocks anything, and its warning is
      risk-side.**
- [x] 5.3 `app/(app)/agents/[id]/page.tsx`: read the reply, verify it, mount
      the panel. Absent / unverified / mismatched / stale → render nothing.
- [x] 5.4 Component tests over every state, including the one that renders
      nothing. Watch the JSX text-node seam: any sentence with interpolations
      is one template literal, or the test asserts across an invisible space.

## 6. Gates and records

- [x] 6.1 `npm run typecheck` — read directly, **not through a pipe**; a pipe
      reports `tail`'s exit status and has hidden a real type error before.
- [x] 6.2 `npm run lint`.
- [x] 6.3 `npm test` (vitest). `test:db` skipped — no schema change.
- [x] 6.4 `python3 .claude/tools/openspec.py validate the-edit-answers-what-can-be-built`.
- [x] 6.5 Re-pin `source_digest` in every design manifest carrying a touched
      file, then `/surface` the affected surfaces.
- [x] 6.6 Close backlog item `the-feasibility-advisory-is-unread` / issue #291.
      The canonical file did not exist on `main` — it is stranded on PR #295 —
      so it is **written here, done**, from the body on `cd4b5a1`. Expect a
      one-file conflict when #295 rebases; taking this branch's copy is right,
      the other three items on #295 are untouched.
