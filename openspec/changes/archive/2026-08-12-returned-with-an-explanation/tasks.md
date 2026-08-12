# Tasks

## 1. The explanation reaches the person

- [x] 1.1 `/connect` reads `declined` and `error` from searchParams on the
      delegated branch; decline renders in the notice role with
      role="status", callback failures in the danger role with role="alert",
      unknown error values verbatim; every message says nothing was stored.

## 2. Verification

- [x] 2.1 Rendering tests: consent branch, personal branch, declined
      (explanation + platform's answer + consent retry still present),
      error=incomplete, error=untrusted, unknown error value verbatim.
- [x] 2.2 Quality gates: typecheck, lint, vitest, build.
