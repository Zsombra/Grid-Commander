# Tasks: Two Reachability Matchers Are Still Blind

Every repair is finished when the recorded mutation is re-run and comes back
KILLED, through `tools/mutate-guard.mjs`.

- [x] 1. Hoist the six spellings into named module-scope matchers, declared
      once: form open-tags, whole form blocks, the GET exclusion, the
      bound-to-action predicate, the server-action extractor, the
      `action={name}` reference test, and the in-form href extractor.
- [x] 2. Point all call sites at them — the two rules under `every form the
      interface renders can be submitted`, `controlsInActionForms`, `mutates()`,
      the declined-confirmation rule, and the L976 vacuity check that currently
      retypes the form regex.
- [x] 3. Prove each matcher in both directions: an input it must report and an
      input it must not, including the `href=".."` shape the declined rule
      exists for and a name-prefix case for the `action={name}` boundary.
- [x] 4. Verify by mutation, all KILLED: the two recorded SURVIVED (form
      open-tag scan dead, server-action extractor dead), plus form-block scan
      dead, href extractor dead, bound-to-action permissive, GET exclusion
      permissive, and the reference test dead.
- [x] 5. Full file green, `./scripts/ci.sh` green, no rule's meaning changed.
- [x] 6. File the `confirmation-is-human` residual acceptance as a wontfix
      backlog item; mark this item done; close #87 with the closing
      measurement.
