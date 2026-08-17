# Production Gate — Grid-Commander Is An MCP Server

## Verdict: PASS

## What was checked

**Spec parity.** Four requirements, all delivered and covered:
- *Reachable as an MCP server* — 18 tools over stdio, each calling the same
  use-case the web calls. Proven by a subprocess probe, not only in memory.
- *No tool mutates* — enforced by `mcp-read-only.test.ts`, which derives the
  mutating use-cases from `composition.ts` rather than listing them.
- *A refusal crosses as a refusal* — asserted over a real client: an
  unreadable roster returns `kind: "unreadable"` with `isError` unset.
- *Refuses to start without authority* — the entry point exits 1 with the
  missing variable named. Observed during development, twice.

**Risk surface.** No write path, no new outbound host (the server is
inbound and `one-destination` still passes), no schema change, no new
credential store. The added dependency is the MCP SDK, already present as
the BattleGrid client.

**Two guards were widened, both deliberately.**
- `P6 / no-restricted-imports` named one directory because the SDK had one
  use: being a *client* of BattleGrid. It now names two, one per direction,
  and a counterweight test asserts `src/mcp/` builds no URL and imports no
  port — so the permission cannot become the bypass the rule exists to
  prevent.
- Nothing else was relaxed.

## What would revoke this

A write appearing on the tool table. The guard fails first, by design.

## Residual risk, accepted

A model can still *misreport* a truthful answer — nothing prevents it
paraphrasing "unreadable" as "none". Mitigated where it can be: the tool
descriptions name the states that exist, and the server instructions say
explicitly not to report an unreadable result as an absence. Beyond that it
is the client's behaviour, not ours.
