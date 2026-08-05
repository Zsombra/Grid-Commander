# Master Plan — The Model Can Propose, And Only A Human Agrees

Seven proposable operations (DL-1), a 72-hour horizon (DL-2), and a guard that
derives from reachability rather than spelling (DL-3).

## Sequence

Ordered so that **the negative is provable before the positive exists**. Every
stage after 1 can only weaken the safety argument, so the checks that would
catch a weakening are written first.

1. **The guard rewrite** (`mcp-read-only.test.ts`), against today's tool table.
   It must pass unchanged before any `propose_*` exists, and it must fail on a
   tool wired to `updateAgent` under an innocent name. Doing this first means
   every later stage is added against a guard that is already correct, rather
   than one adjusted to admit what was just built.
2. **The store** — schema, migration, and the tests that assert what it does
   *not* have. No token column, no access-token column, ownership in
   PostgreSQL.
3. **The operation vocabulary** — the seven names, mapped to the describes they
   resolve to. Data, not code, so both the MCP layer and the web route read the
   same table and a name cannot mean two things.
4. **Recording** — `propose_*` tools over that table. Nothing reads BattleGrid
   here; a test asserts the adapter is never touched.
5. **Agreeing** — `/pending` and `/pending/[id]`, entering the existing
   ceremony rather than reimplementing it.
6. **Live** — the whole loop against a real account, and the negative proved
   live: proposal recorded, nothing changed.
7. **Docs** — `MCP_SERVER.md` currently states no writes are coming without a
   design change. This is that change, and the file must stop saying it.

## What would make this wrong

Each of these is a way the change could ship and still be a failure. They are
the production gate's checklist, stated as failures rather than as boxes.

- **A `perform` reachable from any tool.** The entire argument reduces to this
  one property. If it is ever true, everything else here is decoration.
- **A consequence computed at proposal time.** It would be a sentence about a
  world that has moved, presented as though a human had read the current one —
  the exact defect value-binding exists to prevent.
- **A confirmation token in the store, or in an MCP response.** A token is a
  bearer capability; either placement turns a note into an authorization.
- **A silent reconciliation.** If the fresh describe differs from what was
  proposed and the page merges the two, the product has agreed on the
  operator's behalf.
- **Anything that performs a proposal without a human action.** No worker, no
  scheduler, no retry, no setting. The design has no such hook, and a test must
  assert there is no code path.
- **A stale proposal that still looks actionable**, or one that vanishes
  instead of becoming history.
- **Apply sneaking in.** DL-1 excluded it for a reason that will look like an
  inconvenience during implementation. It is not.

## Where this is most likely to go wrong

Not in the MCP layer — that part is a table and a row insert. **In
`/pending/[id]`**, because it is the only place where "what was proposed" and
"what will happen" are both present and it is tempting to show one of them.
The spec requires both and the difference between them; that requirement should
be built first on that page and tested before the happy path is styled.

## Production gate

Green means all of:

- The nine `ci.sh` gates, with a credential and without.
- The rewritten read-only guard passing, plus its own counterweight: a tool
  wired to a mutating use-case under an innocent name fails it.
- A test proving no code path performs a proposal absent a human action.
- A test proving no MCP response carries a confirmation token.
- Schema tests proving the store has no token column and no access-token
  column — against a real PostgreSQL, not a fake.
- The live loop walked end to end on a real account, and the live negative:
  a recorded, unopened proposal leaves the agent unchanged.
- `docs/MCP_SERVER.md` no longer claims the surface has no writes coming.

Blocked means any of them is amber. This is the capability where "mostly" is
not a state — either a model cannot reach a write, or the read-only claim in
the docs is false.
