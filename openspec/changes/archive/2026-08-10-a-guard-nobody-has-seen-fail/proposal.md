# Proposal: A Guard Nobody Has Seen Fail

## Why

`tests/architecture/boundaries.test.ts` reports **13 passed (13)** with this
made to return nothing:

```ts
const imports = (file: string): string[] =>
  [...readFileSync(file, 'utf8').matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]!);
```

In that state the suite is green while asserting:

- P6 — the MCP SDK is imported only where each direction lives
- the domain imports nothing outward
- use cases depend on ports, not on concrete adapters
- W-D / W-E — no file under `app/` imports infrastructure or the domain
- `src/mcp/` reaches no port

That is Clean Architecture as this project defines it, and the whole of it goes
blind on one line. The file does not have twelve independent matchers; it has
eleven rules consuming one three-line helper.

GitHub #87 audited all sixteen guards by mutation on 2026-08-10 and found ten
survived. Two were repaired in the changes that have since archived. **Seven
remain, and each one below is a mutation that was actually run** — the matcher
broken, the file re-run, the result recorded:

| guard | mutation | result |
|---|---|---|
| `boundaries` | `imports()` → matches nothing | **SURVIVED 13/13** |
| `identifiers` | both live scans killed, `check()` untouched | **SURVIVED** |
| `controls` | the control-tag scan → matches nothing | **SURVIVED** |
| `failure-is-explained` | both subject extractors → match nothing | **SURVIVED** |
| `mcp-conformance` | `sends()` → `() => true` | **SURVIVED** |
| `one-destination` | the vendor-client list emptied | **SURVIVED** |
| `proposals-are-inert` | `/^describe/i` → never matches | **SURVIVED 11/11** |
| `proposals-are-inert` | the propose-token matcher → never matches | **SURVIVED** |

As a control, `no-population-constants` with its alternation killed came back
**KILLED, 3 failures**. The method distinguishes the two outcomes; it is not
reporting failure for everything.

## The two ways a guard goes quiet, and only one is obvious

**Blind** — the matcher stops matching, so the offender list is empty and every
`expect(offenders).toEqual([])` passes.

**Permissive** — the matcher starts matching everything. This is the one that
gets missed, because it silences *positive*-shaped rules: `mcp-conformance`
asserts that nothing required is missing, so `sends()` returning `true`
unconditionally makes thirteen conformance checks pass while sending nothing.
`controls` is silenceable in both directions at once — #87 recorded that
widening its exclusions to `/(?:)/` also passes 18/18, because a
`filter(...).length >= 20` floor is satisfied by a predicate matching everything.

So a rule needs both: one input it must reject, one it must accept.

## A corpus floor is necessary and nowhere near sufficient

Every one of these files counts what it scanned. That check was worth adding and
it is not the same check:

- `failure-is-explained` asserts `wrappers.length === 3` using a *different*
  regex from the two extractors doing the work, so both rules can go blind with
  the floor still satisfied.
- `controls` counts with a duplicate literal, separate from the one that scans.
- `proposals-are-inert` has three corpus floors and had eleven blind rules.

Counting what was read proves the sweep found files. It says nothing about
whether anything could be found in them.

## And a proof that re-states the rule guards its own copy

`identifiers.test.ts` is the file this repository holds up as the reference, for
its `describe('the rule catches PG-301 as it was actually written')`. Its
`check()` re-declares both regexes verbatim instead of calling the ones the live
scan uses. Break only the live copies and the file stays green: the proof
demonstrates that a *transcription* of the rule works, while the rule is dead.

That is the two-copies-drift defect this codebase keeps recording, now inside the
mechanism built to catch it.

`confirmation-is-human.test.ts` is the one that holds up, and it is worth copying
rather than admiring: it asserts its two patterns match **real source**, which is
strictly stronger than a corpus floor and survived the mutation that was aimed at
it.

## What Changes

- **Each guard's offender matcher is fed a known violation and a known-clean
  input**, through the same matcher the live scan uses — so breaking the rule
  breaks the file, in either direction.
- **A rule is declared once.** Where a proof re-states a pattern today, the
  pattern moves to one place and both call it. The observable consequence is
  what matters: killing the live matcher must fail the file.
- **A rule whose corpus is empty today is still proven.** `one-destination`'s
  vendor-client predicate finds nothing because no vendor client is installed —
  which is the point of the rule and also why nothing would notice it dying.
  Same for the unclassified-tool arm of `mcp-conformance`.
- **The mutation check becomes a command in the repository.** Both audits ran
  from a script that exists only in a session transcript. The only thing that
  has ever proven these guards work is not in the repo — which is this issue one
  level up. It backs the file up, applies the substitution, runs the file,
  restores unconditionally, and prints KILLED or SURVIVED.

## What is deliberately not here

- **No meta-guard that greps for a `catches what it was written for` block.**
  Matching how something is spelled rather than what it reaches is this
  repository's characteristic defect; it has now appeared six times, twice while
  writing a check against it. A test asserting that guards *look* self-tested
  would be the seventh.
- **No hardcoded list of guard files.** It would go stale exactly when a new
  guard was added without a proof, which is the case it exists for.
- **No mutation run in CI.** Mutating source and re-running is slow and stateful;
  making it a gate would make the fast path expensive, and a gate people route
  around protects nothing. It is a command you run when you write or doubt a
  guard.
- **`confirmation-is-human`'s narrow residual is left alone.** #87 describes a
  narrowing of `MINTS` that keeps one assertion green while the action scan goes
  blind. It is materially harder to reach by accident than anything above, and
  the file already does the right thing twice.
- **No changes to what any guard forbids.** Every rule keeps its current
  meaning. If a repair changes what a guard catches, that is a bug in the repair.

## Capabilities

**Modified**: `harness-integrity` — two ADDED requirements.
