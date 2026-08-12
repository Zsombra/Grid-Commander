# Tasks

## 1. The answers render

- [x] 1.1 `/pending/[id]` reads `problem` from searchParams and renders it
      in the danger role, role=alert, "Refused:" prefix, on every branch.
- [x] 1.2 `/pending` reads `problem` (danger, role=alert) and `note`
      (notice, role=status; known value in words, unknown verbatim).

## 2. Verification

- [x] 2.1 Rendering tests: problem on the proposal page; problem on the
      list page; note=already-resolved on the list page.
- [x] 2.2 Local CI (`./scripts/ci.sh` with DATABASE_URL) green.
