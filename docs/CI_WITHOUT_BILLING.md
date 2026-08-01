# CI Without Paying The Bill

**The situation (2026-07-31).** The GitHub account that owns this repository
has an unpaid bill, and the operator has said it will not be paid. GitHub
enforces that account-wide: workflow runs are *created* but **no job is ever
handed to a runner** (`runner_id: 0`, jobs die in ~2 seconds with empty
output). No repository content can change this — it was proven with a job
whose only step was `echo`, which failed identically. Full forensic history:
`openspec/backlog/ci-creates-no-runs.md`.

This document is the decision sheet for getting green CI anyway, at zero
cost. Everything below assumes one fact worth stating plainly: **the
repository is already public, and GitHub Actions on public repositories is
free and unlimited — on an account in good standing.** The block is the
account, not the product, not the plan.

---

## What already works, with GitHub out of the loop

Verification never depended on Actions executing. The workflow's jobs call
the same entry points anyone can run:

| Gate | Command | What it proves |
|---|---|---|
| Python harness + spec validation | `./scripts/check.sh` (add `--matrix` for every installed 3.x) | 217 tests over the pipeline tooling; `validate --all` clean |
| Types / lint / unit + architecture tests / build | `npm run typecheck` · `npm run lint` · `npx vitest run` · `npm run build` | the whole TypeScript surface (~888 tests) |
| Real-database suite | `DATABASE_URL=… npx drizzle-kit migrate && npm run test:db` | 60 tests against migrated PostgreSQL |
| Served application | `DATABASE_URL=… ./scripts/check-serving.sh` | boots from `.env.example`, schema current, routes answer, one authenticated route provably queries the database |
| Live platform (optional, needs the key) | `BATTLEGRID_API_KEY=… npx vitest run tests/live/` | the key-gated probes against the real BattleGrid |

The known limit of this mode: green means "green on one machine", with
nobody enforcing that the machine ran it. That is the gap the options below
close.

---

## Option A — move the repository to a clean GitHub account (recommended)

The workflow already targets GitHub-hosted runners (`ubuntu-latest` whenever
the `CI_RUNNER` / `CI_APP_RUNNER` variables are unset — they are unset). On
any account without the billing block, **CI is green-able with zero
commits.** A brand-new free GitHub account is enough, because the repo is
public.

**Preferred: a transfer** (keeps issues, PRs, stars, watchers; GitHub
redirects old URLs):

1. On the new (or clean existing) account: nothing to prepare.
2. Old account → repository → Settings → General → Danger Zone →
   **Transfer ownership** → type the new owner's username.
3. Accept the transfer from the new account (email link).
4. On the transferred repo: Settings → Actions → General → allow actions;
   then Actions tab → `validate` → **Run workflow** (`workflow_dispatch`
   exists for exactly this moment).
5. Watch the 7 jobs. They were last known green-by-content; anything red now
   is real and fixable by commit.

**Fallback: a mirror push** (if the transfer flow is unavailable):

```bash
git clone --mirror https://github.com/<old-owner>/Grid-Commander.git
cd Grid-Commander.git
git push --mirror https://github.com/<new-owner>/Grid-Commander.git
```

Carries every branch and tag; loses issues/PRs (this project's record lives
in `openspec/`, so the loss is small). Then step 4 above.

**After either path:**
- Reconnect any Claude sessions/integrations to the new repository path
  (session access is granted per repository).
- Archive the old repository so nothing stale collects pushes.
- Private instead of public on the new account also works: free accounts get
  2,000 Actions minutes/month, and the full 7-job run costs a few minutes.

Only the account owner can do this — it needs admin on the old repository.

## Option B — third-party CI pointed at this repository

Keeps the repo where it is; adds a service. Free tiers that fit a public
repository:

- **Cirrus CI** — free for public repos; install the GitHub App, add a
  `.cirrus.yml` whose tasks shell out to the same entry points the table
  above lists (`scripts/check.sh`, the npm gates, a PostgreSQL container for
  `test:db`).
- **CircleCI** — free plan with monthly credits; same shape
  (`.circleci/config.yml`).

Because every job is a thin wrapper over committed scripts, the port is
small. The costs are a second service login, a second config to keep
truthful, and status checks that live outside GitHub's Checks UI (they
appear as commit statuses).

## Option C — self-hosted runner

Free regardless of billing (GitHub does not bill self-hosted execution), and
the repo side is already wired (`CI_RUNNER` / `CI_APP_RUNNER` variables,
`docs/SELF_HOSTED_RUNNER.md` is the handout — including the Docker-less
split that greens 6 of 7 jobs). **Declined by the operator 2026-07-31** (no
machine to dedicate); kept here because it is the only option that works
without moving anything and without a new service — if a machine ever
exists. Caveat: self-hosted runners on public repos need the fork-PR
protections the handout describes.

## Option D — stay local-only, deliberately  ← **CHOSEN (operator, 2026-08-01)**

What is true today, made policy: `scripts/check.sh` + the npm gates + 
`check-serving.sh` are the verification story, run before every merge (the
session logs in `openspec/JOURNAL.md` record each run). Zero setup, zero
services — and the one-machine-green risk stays. If this is the choice, the
`ci-creates-no-runs` backlog item should close as "accepted risk" rather
than stay open implying somebody will fix it.

---

## The decision (2026-08-01)

The operator chose **D**: everything stays local. What that made concrete:

- **`./scripts/ci.sh`** is the whole CI in one command — the same gates the
  workflow's seven jobs ran (harness+validate, typecheck, lint, vitest,
  drizzle check, migrate+db suite when `DATABASE_URL` is set, build, and the
  serving check with `CI_SERVING=1`). A gate that cannot run is SKIPPED
  loudly, never silently.
- **`validate.yml` fires on `workflow_dispatch` only** — no more automatic
  runs dying in 2 seconds and painting every PR with seven meaningless red
  crosses. The job definitions stay one click away if the account is ever
  unblocked.
- `ci-creates-no-runs` is closed as a decision, not a fix: the accepted
  residual is that green means "green where `ci.sh` was run", enforced by
  habit and the session journal rather than by a machine nobody trusts less.

## Recommendation (pre-decision, kept for the record)

**A**, then D as the standing floor. A transfer is one afternoon, costs
nothing, changes no code, and restores the thing CI is actually for —
verification nobody has to trust one machine about. B adds a service to
avoid a transfer; C needs hardware nobody has; D is what we already do
while deciding.
