# Tasks

- [x] 1.1 The "Not editable here" copy renders through the shared components
- [x] 1.2 The reactivate confirmation stops asserting the binding is intact
- [x] 1.3 Rendering tests over both surfaces, for a bound and an orphaned agent

## A note on the test that had to be loosened

The first assertion was `not.toContain('bound to')`, and it failed on the fix.
`BindingSummary` legitimately says *"the strategy it **was bound to**, Volatilis
— imported, can no longer be read"* — past tense, and exactly the sentence that
repairs the defect.

So the assertion now names the claim rather than the phrase:
`not.toContain('returns to your roster bound to')`. A guard broad enough to
catch the honest wording is a guard that will be relaxed carelessly the next
time it fires.

`readCatalog` also had to be wired into `actingWith` — the edit form refuses to
render without it, which is its own correct behaviour (a form whose submission
is certain to fail is worse than none) and simply had no test reaching it before.
