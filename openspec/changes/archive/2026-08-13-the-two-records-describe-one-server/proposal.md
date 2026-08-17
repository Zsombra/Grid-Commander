# Proposal: The Two Records Describe One Server

## Why

`docs/battlegrid-mcp-capabilities.json` said **v17.2.0** while
`docs/battlegrid-mcp-surface.json` said **v18.2.0**. Two committed artifacts,
both describing the same server, a major version apart — and nothing noticed
(#198). Refreshing the stale one revealed **188 output-schema leaves added
across 11 tools**, including a whole `protection` block the platform now
publishes per position.

**The reason nothing noticed is the point.** One check does compare the two
files: `refresh_declared` in `tools/probe_mcp_surface.py` refuses when they
"disagree about which tools exist", on the stated grounds that differing tool
sets mean *"snapshots of different deployments"*. v18 added no tools. The count
held at 114, no tool was added or removed, and the two files agreed perfectly
about which tools existed while describing two different generations of the
server.

That is this repository's signature defect, in a guard written against this
repository's signature defect. `CLAUDE.md` says it outright — *"a count that has
not moved proves nothing"* — and the spec carries it as **Tool Count Is Never
Treated As Evidence Of Currency**, whose scenario is written against the *live
server* and therefore does not reach a record-to-record comparison.

It matters because the capabilities dump is the **evidence base**. Eight backlog
items cite it, and `tests/agent/brain-presets.test.ts:29` reads it directly.
Citing a file a major version behind is how a correct-looking argument gets built
on a stale premise — and one already was: the session record concluded v18 "moved
nothing but one description", which was true of *inputs* and blind to outputs.

## What Changes

- **A credential-free, network-free check that every committed record of the
  BattleGrid surface names the same server version.** It would have failed on the
  day the drift opened, on every CI run, with no key. Today's `freshness` gate
  needs a credential and compares only the surface record against live.
- **The tool-identity rule is generalised.** *Tool Count Is Never Treated As
  Evidence Of Currency* is widened from "the number of tools agreeing with the
  live server" to any comparison of tool identity — count or name set, against
  the live server or against another record. **MODIFIED**, because the existing
  wording is what let `refresh_declared` conclude currency from a matching name
  set.
- **A derivation refuses a source from another generation.** `refresh_declared`
  reads the capabilities dump to recompute the surface record's declared fields.
  It must refuse on a version mismatch, not only on a tool-set mismatch — a
  derivation from a stale source silently backdates the artifact it writes.

## Capabilities

**New**: none

**Modified**: `platform-mapping` — what makes a record current, and what a
derivation may be built from.

## Out of Scope

- **Modelling the new `protection` / `breakEvenGeometry` fields.**
  `liveOverlay` is null unless a position is open (read live 2026-08-13), so the
  block is **declared and unobserved**. #198 is explicit: *"Do not model it from
  the declaration"* — three dead paths in `HANDOFF.md` began as a schema read as
  an observation. It needs one read taken while a position is open, and that is
  the item's own next step, not this change's.
- **The radar refusal telemetry** — `evaluationOutcome`, `screenReason`, and the
  new `EVALUATION_FAULTED` value. That is
  `radar-says-why-it-is-blocked` (#135) and stays there.
- **`#85` and the trade-level policy.** `observedExtreme` changes what an
  eventual panel would read from; it does not make the policy any less inert
  upstream.
- **Automatically re-capturing the dump whenever the surface is probed.** The two
  are written by different tools (`probe_mcp_surface.py` and
  `generate_mcp_reference.py`), and welding them together is a bigger change than
  the drift justifies. Catching the drift loudly is the cheaper half, and it is
  the half that was missing.

## Impact

| Area | Effect |
|---|---|
| `tools/probe_mcp_surface.py` | `refresh_declared` also compares server versions before deriving |
| `scripts/ci.sh` | one more named gate, credential-free, in the default set |
| `tests/architecture/` or `tests/platform/` | the record-agreement check itself |
| `docs/battlegrid-mcp-*.json` | unchanged — both already say 18.2.0; this change makes the agreement *checked* rather than *currently true by luck* |
| Consumers | eight backlog items and one test cite the capabilities dump; none changes, they simply stop being able to cite a stale one silently |
| Live/platform | none. No credential, no network, no BattleGrid call |

## Risk

Low, and one thing to get right: the new gate must **fail** on disagreement
rather than skip. Unlike the OAuth recording — whose source can be unreachable,
and where unreachability is correctly reported as *unchecked* — both files are
committed. There is no network to be down, so there is no honest "could not
check" state here, and offering one would recreate the silence being fixed.
