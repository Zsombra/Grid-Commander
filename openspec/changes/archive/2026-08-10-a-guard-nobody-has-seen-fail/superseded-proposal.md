> **Superseded proposal, kept for the record.**
>
> Two sessions proposed this change independently on 2026-08-10, about half an
> hour apart. This is the one that did not land: it was proposal-only, and the
> branch already carried an implemented, verified and archived version of the
> same change under the same id.
>
> It is here rather than deleted because being second is not the same as being
> wrong. Two of its scenarios were sharper than the ones that landed — that a
> guard must still *pass* when the product is clean, and that the mutation check
> stays out of the ordinary suite — and both are filed as #123.
>
> One claim of its own differs from what shipped: it repeats GitHub #87's count
> of **eleven** matchers in `boundaries.test.ts`. Measured, it is five *tests*
> that consume `imports()`; the file reports 13/13 because the other eight rules
> are independent and go on passing. The finding is the same, the number is not.
>
> Nothing below is a live artifact. The delta that became the source of truth is
> `specs/harness-integrity/spec.md` in this folder.

---

# A guard nobody has seen fail is a guard nobody knows works

## Why

An architecture guard asserts an absence:

```ts
expect(offenders, 'the domain must be testable without a database').toEqual([]);
```

That assertion is satisfied by a clean product **and equally by a dead matcher**.
The two are indistinguishable from the outside, and only one of them is a guard.

This was audited by mutation — every offender matcher in `tests/architecture/`
broken in turn and the file re-run. The results are recorded in GitHub #87 and
re-measured on 2026-08-10; every line below is a mutation that was actually run,
not a reading.

### `boundaries.test.ts` is the worst of them, and worse than #87 filed

The issue counted twelve matchers. They are not twelve independent matchers.
**Eleven rules consume the output of one three-line helper:**

```ts
const imports = (file: string): string[] =>
  [...readFileSync(file, 'utf8').matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]!);
```

Make it return `[]` and the file reports **13 passed (13)**. In that state a green
suite is asserting all of this, and checking none of it:

- P6 — the MCP SDK is imported only where each direction lives
- the domain imports nothing outward — the dependency rule itself
- use cases depend on ports, not on concrete adapters
- W-D / W-E — no file under `app/` imports infrastructure or the domain
- `src/mcp/` reaches no port

Clean Architecture is the thing this repository says it is. One line decides
whether that claim is checked or merely typed.

### The reference implementation has the defect it was held up for

`identifiers.test.ts` carries `describe('the rule catches PG-301 as it was
actually written')` and was cited as the pattern everything else should copy. Its
`check()` helper **re-declares both regexes verbatim** instead of sharing the ones
the live scan uses. Kill only the live copies and the file stays green: the
self-test proves a *transcription* of the rule works while the rule itself is
dead.

That is the two-copies-drift defect this codebase has recorded six times, now
sitting inside the mechanism built to catch it.

### The rest, each measured

| guard | mutation applied | result |
|---|---|---|
| `mcp-conformance.test.ts` | `sends()` → `() => true` | 13 per-tool tests green at once |
| `controls.test.ts` | the control scan regex → never matches | green; **and** widening exclusions to match everything is also green |
| `failure-is-explained.test.ts` | both subject extractors → never match | green; the corpus floors use *different* regexes and stay satisfied |
| `one-destination.test.ts` | `VENDOR_CLIENTS` emptied | green — no vendor client is present today, so the list is unexercised |
| `proposals-are-inert.test.ts` | `/^describe/i` on `useCase` → never matches | green 11/11 |
| `proposals-are-inert.test.ts` | `/confirmationToken\|confirmation:/` → never matches | green |

Control, to show the method distinguishes: `no-population-constants.test.ts` with
its alternation killed → **3 failures**. It has a self-test that feeds the live
matcher, and it works.

### A corpus floor is not proof, and that is the trap

Several of these guards already count what they scanned — "I read 100 files". That
proves the sweep found files. It says nothing about whether anything in them could
ever match. `proposals-are-inert.test.ts` carries three corpus floors and, before
this session's partial repair, all eleven of its rules were blind: the corpus
filter is a *different regex* from the matchers doing the scanning.

### The method has no home in the repository

Both audits ran from a harness that exists only in a session transcript. That is
the same defect one level up — **the only thing that has ever proven these guards
work is not in the repository**, so the next audit either re-derives it or does
not happen. "Break the matcher and re-run" must be a command someone types, not a
paragraph they have to believe.

## What changes

Every guard measured blind gets a block that feeds **the matcher the live scan
uses** a known violation, and ordinary code it must not fire on. The matcher is
shared at module scope; nothing is retyped.

Both directions, always. A rule pinned only by violations it catches is satisfied
by a matcher that returns everything — that is how `controls.test.ts` is silenced
in the second direction, and a repair that ignores it would leave the guard half
blind while looking finished.

And the mutation runner is committed, so the audit is repeatable.

## Capabilities touched

- **harness-integrity** — three ADDED requirements. It has no requirement covering
  architecture guards at all today; its existing ones cover the Python harness,
  the archive merge, and live probes.

No product code changes. No behavior an operator sees changes.

## Out of scope

- **`reachability.test.ts`** — best-defended of the sixteen, 14 of 17 kills caught.
  Three residuals remain (the form regex, the server-action extractor, and its
  neighbouring vacuity check, which retypes the form regex). Real, and small
  enough to leave.
- **`confirmation-is-human.test.ts`** — holds up. Killing `MINTS` or `PERFORMS`
  outright is caught, because it asserts both patterns match real source rather
  than merely counting a corpus. Only a narrow narrowing-residual remains.
- **`wire-values.test.ts`** — structural; it resolves values rather than matching
  text, so there is nothing to break.
- **`live-writes.test.ts`**, and `proposals-are-inert.test.ts`'s scheduling and
  perform-call matchers — already repaired earlier this session.
- **A meta-guard that greps for a `catches what it was written for` block.**
  Deliberately not built. Matching how something is *spelled* rather than what it
  *reaches* is this repository's characteristic defect, recorded six times; a
  meta-guard in that shape would be the seventh, and would be satisfied by a
  correctly-named block that feeds a matcher nobody uses.
- Running mutation testing in CI. The runner is a tool for a person auditing, not
  a gate — it rewrites files on disk, and a gate that does that is a bad trade.
