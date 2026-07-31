# Self-Hosted Runner — Setup Handout

## Why this page exists

GitHub Actions has executed nothing for this account since **2026-07-28**.
Jobs are created and no runner is ever assigned (`runner_id: 0`, empty logs,
2–9 second lifetimes) — an account-level execution block, consistent with an
unpaid bill, documented in `openspec/backlog/ci-creates-no-runs.md`. No commit
to this repository can fix it.

Self-hosted runners are not billed, so they are unaffected by the block.
`.github/workflows/validate.yml` is already wired for one: six jobs read the
repository variable **`CI_RUNNER`**, and the Docker-dependent `app` job reads
**`CI_APP_RUNNER`** — each falling back to `ubuntu-latest` when unset.
Nothing changes until you flip a variable.

> **Not the same thing**: `scripts/check.sh` runs every gate locally and is the
> current verification story. It proves the code; it cannot green the GitHub
> board. This page is about the board.

## What only you can do (needs repo admin)

### 1. Register the runner

On a Linux x64 machine (always-on not required — see below):

1. GitHub → repository → **Settings → Actions → Runners → New self-hosted
   runner** → pick Linux/x64.
2. Run the download + `./config.sh` commands GitHub shows (they embed a
   short-lived registration token — mint it there, don't reuse an old one).
3. Accept the default labels (`self-hosted`, `Linux`, `X64`).
4. Install it as a service so it survives reboots:
   `sudo ./svc.sh install && sudo ./svc.sh start`.
5. The runner should show **Idle** on the Runners page.

### 2. Flip the variable

**Settings → Secrets and variables → Actions → Variables → New repository
variable**: name `CI_RUNNER`, value `self-hosted`.

Every subsequent run routes **six of the seven jobs** to your runner — the
four Python check jobs, `tests`, and `validate`. No commit needed.

The seventh, `app`, has its own variable (`CI_APP_RUNNER`) because it is the
one job that needs **Docker** (a `postgres:16` service container). See the
next section.

### 2b. No Docker on the machine? That's fine

Set only `CI_RUNNER`. Six jobs go green on your runner; `app` stays on
GitHub-hosted — red while the account block lasts, which is exactly today's
state, so nothing gets worse. Its full gate sequence still runs locally via
`scripts/check.sh` plus `npm run typecheck / lint / test / build`.

To bring `app` over later, either install Docker on the runner machine or
register a second runner somewhere Docker-capable (give it an extra label,
e.g. `docker`), then set `CI_APP_RUNNER` to route to it. Or simply leave it
hosted and let it recover when the account is settled.

### 3. Verify

The workflow has `workflow_dispatch`: **Actions → Spec Layer → Run workflow**
on `main`. Watch a job — the runner name should be yours, not `ubuntu-latest`.

## What the machine needs

| Requirement | Why |
|---|---|
| Linux x64 | The workflow's toolchain downloads assume it |
| ~5 GB free disk | `setup-node`/`setup-python` tool caches, npm cache, checkouts |
| Outbound HTTPS | github.com, registry.npmjs.org, python toolchain downloads |
| Docker — **only if routing the `app` job** (`CI_APP_RUNNER`) | Its `postgres:16` **service container**. The six `CI_RUNNER` jobs need no Docker. |

The machine does not need to be always-on: jobs queue while the runner is
offline and run when it reconnects. A laptop that is usually awake works;
runs just wait for it.

`setup-python` downloads 3.10–3.13 on first run per version; the matrix job
will be slow once, then cached.

## ⚠️ Security — this repository is public

Self-hosted runners on public repositories execute whatever the triggering
commit says. A fork PR could run arbitrary code on your machine. Before
flipping the variable, confirm both:

1. **Settings → Actions → General → Fork pull request workflows**: approval
   required for **all outside collaborators** (strictest setting).
2. Run the runner on an isolated machine or VM you can reimage — not your
   daily driver, and nothing on it that a stranger's code must not read.
   The runner user needs no credentials beyond what `config.sh` created.

Same-repo branches (how this project works today) are unaffected by the
fork-approval setting.

## Reverting

Delete the `CI_RUNNER` variable — jobs fall back to `ubuntu-latest` on the
next run (red again until the account is settled, but that is the status quo).
To retire the runner: Settings → Actions → Runners → remove; or
`./config.sh remove --token <removal-token>` on the machine.

## Current state (2026-07-31)

- Repo side: **done** — six jobs route through `CI_RUNNER`; `app` (the one
  Docker-dependent job) through `CI_APP_RUNNER`. Each falls back to
  GitHub-hosted when its variable is unset.
- Runner registration: **not detectable from the repo**; no notes or email
  found recording one. If you believe one was registered, the Runners settings
  page is the single source of truth — if it shows a runner Idle, only step 2
  above remains.
