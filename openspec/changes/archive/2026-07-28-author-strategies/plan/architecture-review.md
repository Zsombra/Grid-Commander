# Architecture Review: author-strategies

Against `docs/specs/ARCHITECTURE_REVIEW_CHECKLIST.md`.

## Scope

Adds `src/domain/strategy/` (3 files), `src/ports/strategies.ts`, 5 use cases,
1 adapter, 2 components, 2 routes. Modifies `src/composition.ts`.

## Component Checklist Matrix

| Rule | Components | Evidence |
|---|---|---|
| Dependency direction inward only | `src/domain/strategy/**` | `boundaries.test.ts` domain scan covers it; the three files import only each other |
| BattleGrid only through a port | `strategy-adapter.ts` | Every method routes through `this.battlegrid.callTool`; no `fetch` in the file |
| One responsibility per file | use cases | Compile, apply, list, lifecycle, vocabulary — five verbs, five files |
| **No dual runtime paths** | compile vs apply | Two port methods, two use cases. `structure.test.ts::no caller both compiles and applies` |
| No platform vocabulary outside the adapter | `strategy-adapter.ts` | `structure.test.ts::platform vocabulary is read, not written down` — nine literals scanned |
| Errors are domain errors at the boundary | `strategy-adapter.ts` | Inherits `toDomainError` via `callTool` |
| Routes reach no deeper than the application layer | `app/(app)/strategies/**` | `boundaries.test.ts::W-D` |
| No identifier coerced into existence | routes | `concurrency.test.ts::no identifier is coerced into existence`, now over the enlarged `app/` |

## Findings

**F-1 — `toApplyPlan` is the single most defect-prone function in the codebase,
and it is guarded twice.** Two renames, one unwrap, eight omissions, and the
obvious implementation is wrong. Its test asserts both directions — every
required field present, every rejected field absent — and
`structure.test.ts::the plan projection has one home` forbids any other file from
touching `postState`, so a second projection cannot appear quietly.

**F-2 — the token parser is a declared exception to "trust the server".** It
reads claims the server signed and this product cannot verify. Permitted on
exactly the terms DL-7 established: it can only ever *refuse*. Two structural
assertions hold that line — the return type is `LocalRefusal | null`, and an
unreadable token yields no refusal. Auditor: check both still hold.

**F-3 — the composition root is exempted from the compile/apply scan, and the
exemption is itself tested.** The root constructs both and calls neither;
`structure.test.ts::the composition root wires them without invoking either`
fails the moment that stops being true. An untested exemption is a hole.

**F-4 — one deliberate omission.** `update_strategy_signal_rule` exists, is
mapped, and is not wired (S-H). It is a second write path to the same state with
weaker review; offered beside the pipeline it would become the default because it
is fewer steps.

**F-5 — the editor is a single field.** `app/(app)/strategies/[id]/edit` composes
a tagline change and nothing else. The pipeline underneath is complete — compile,
review, refuse, confirm, project, apply — and what is missing is the section
editor, which is a design problem of its own and declared out of scope in the
proposal. Filed as `strategy-section-editor`.

## Status

EVIDENCE RECORDED
