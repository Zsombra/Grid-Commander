# Tasks

## 1. The sentence

- [x] 1.1 `wager-authority.tsx`, `accountAllowsMcpWagers` branch: rewrite so
      the missing wager scope is stated with the held write authority beside
      it, and "connects read-only" is gone (standing-connection scenario)
- [x] 1.2 Confirm no other rendered copy in `app/` or `src/presentation/`
      carries the phrase un-negated (the sweep that found this one found no
      other)

## 2. The guard

- [x] 2.1 New `tests/architecture/access-is-described-honestly.test.ts`:
      walk `app/` + `src/presentation/` `.tsx`, strip comments, scan
      rendered text for read-only/view-only claims about the connection;
      negated forms ("not view-only") stay legal
- [x] 2.2 Prove it per the guard-proof requirement: shared matcher, planted
      offender (the shipped sentence), clean-pass inputs including the
      negated consent-summary line, `node tools/mutate-guard.mjs` both
      directions

## 3. Verification

- [x] 3.1 Check whether any surface manifest lists `wager-authority.tsx`;
      re-pin if so — none does; the component renders on `/arena`, a route
      with no manifest, which is the exact gap #230's route-coverage check
      will report once built
- [x] 3.2 Gates: typecheck, lint, test, build; `validate` clean; backlog
      item #234 → in-progress at propose, done at archive
