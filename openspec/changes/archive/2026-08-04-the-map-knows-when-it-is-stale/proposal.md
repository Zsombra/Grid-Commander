# The map knows when it is stale

## Why

BattleGrid shipped **v3.0.0 → v5.0.0** and nothing in this repository noticed.

The tool count is identical — 110 before, 110 after — so every check that
counts passed. Regenerating the reference against live produces 109 lines of
diff.

Three artifacts record the platform surface, on three dates, none of them v5:

| artifact | generated | server |
|---|---|---|
| `docs/BATTLEGRID_MCP_REFERENCE.md` | 2026-07-29 | v3.0.0 |
| `docs/battlegrid-mcp-capabilities.json` | 2026-07-29 | v3.0.0 |
| `docs/battlegrid-mcp-surface.json` | 2026-07-31 | unrecorded |

They already disagree with each other: the reference lists `crossSectional`
as a live metric category, the snapshot knows it is gone.

**Nothing broke, and that is not luck about the deployment — it is two design
decisions holding.** Platform vocabulary is read at runtime and
`tests/strategy/structure.test.ts` forbids writing it into source, so
`ATR_PCT` arriving and `CHANGE_RANK`, `VOLUME_RANK`, `crossSectional`
leaving cost nothing. And deployment *policy* slots replaced
`earlyEntryEnabled` + `reassessmentEnabled` with a required
`entryStrategy`, which cost nothing because this product calls no policy
tool. Radar slots, which it does send, are unchanged.

**What did not hold is the part that is supposed to catch this.** Nine test
files gate what this product puts on the wire against
`docs/battlegrid-mcp-surface.json`. Not one of them checks its age.
`wire-values.test.ts` carries a comment saying it "must fail loudest when
the surface is stale", and what it actually asserts is that the file *has*
input constants — a snapshot frozen at v3 satisfies that forever.

So the guard written because two invented literals survived four production
gates can only catch drift that happened *before* the snapshot was taken.
Today it is green and correct. It would have been green and wrong just as
quietly.

The root cause is small and specific: **the probe records no server version
at all.** There is nothing in the snapshot that could ever be compared to
live.

## What changes

1. **The probe records what it probed.** `tools/probe_mcp_surface.py` writes
   `server` (name and version from `initialize`) and `probed_at` into
   `docs/battlegrid-mcp-surface.json`.
2. **A guard fails when the snapshot disagrees with the live server.** A live
   probe compares the recorded version against `serverInfo.version` and fails
   on a mismatch, naming the regeneration command. An offline structural guard
   asserts the field is present, so the live check can never pass vacuously.
3. **All three artifacts are regenerated against v5.**
4. **The v5 additions are filed** rather than silently absorbed — `conditions`
   is a new authoring layer, not a field.

## What this does not do

It does not model any of the new v5 surface. `conditions`, the `price` metric
family, and the new column controls are recorded as backlog, because building
them is a capability's worth of work and the point of this change is that we
find out *next* time without an operator noticing first.

It does not re-probe in CI. That needs a live key in the runner, which is a
separate decision; the live guard runs wherever the other live probes run.

## Capabilities

- `platform-mapping` (new) — the recorded model of BattleGrid's surface, and
  keeping it honest.
