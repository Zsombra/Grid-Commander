# Tasks

## 1. Inventory

- [ ] 1.1 Walk every file in `tests/architecture/` and classify each vacuity
      guard: **(a)** floor computed from the rule's own machinery, **(b)**
      floor counting an independent pattern, **(c)** offender scan with no
      floor. Record the table here (file · rule mechanism · guard mechanism ·
      class · action). Pinned-list guards are noted as out of scope, per the
      proposal. (→ requirement, all scenarios — the table is what scopes them)

## 2. Conversion

- [ ] 2.1 `every-perform-says-it-is-working.test.ts` — the named (b): extract
      the `inAction` walk into a function of its root, add
      `tests/architecture/fixtures/every-perform/` carrying a bare
      `BUTTON_SECONDARY` submit inside a `<form action=`, assert the fixture
      offender is found while the production tree stays clean.
      (→ scenario "A planted offender goes unreported")
- [ ] 2.2 Convert every other (b) and (c) from the 1.1 table — fixture
      preferred, rule-intermediate floor where a fixture is impractical, the
      choice justified in the table. (→ scenario "The scanner breaks while
      the sources stand")
- [ ] 2.3 Leave every (a) untouched, and say so in the table — a working
      guard rewritten for uniformity is churn, not hardening.

## 3. The guards can fail

- [ ] 3.1 For each converted guard, mutate the scanner at its real weak point
      (for the `inAction` walk: a multi-line `<form` opening tag in the
      fixture, or the state-machine regex loosened), confirm the guard goes
      red, revert, confirm green. Record each measurement in Results below.
      (→ scenario "The guard can itself fail")

## 4. Verification

- [ ] 4.1 Quality gates: `npm run typecheck`, `npm run lint`, `npm test`,
      `npm run build`; `npm run db:generate && git diff --quiet drizzle/`
      (must be a no-op — no schema surface); `npm run test:db` only if a
      local `DATABASE_URL` is available.
- [ ] 4.2 Confirm no fixture offender is reported by any scan other than its
      own — run the full architecture suite and check no unrelated test went
      red on the fixture tree. (→ design decision: fixtures outside every
      production scan root)
