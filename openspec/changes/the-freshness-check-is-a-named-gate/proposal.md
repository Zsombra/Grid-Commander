# Running CI with a credential is safe, and says what it checked

## Why

`the-map-knows-when-it-is-stale` shipped a guard that can detect a BattleGrid
deployment. Nothing ran it.

- GitHub Actions is `workflow_dispatch` only — the account is billing-blocked by
  decision (2026-08-01), and verification is `./scripts/ci.sh` as policy.
- `ci.sh` runs `vitest`, and `tests/live/surface-freshness.test.ts` is one of
  nineteen live files that `describe.skip` without a credential.

So the check vanished into a silent skip on every run. `ci.sh`'s own header
already names that as the thing not to do:

> A gate that cannot run on this machine is SKIPPED loudly, never silently —
> a skip that looks like a pass is how "green" stops meaning anything.

## What running it actually revealed

Adding the gate meant running `ci.sh` with a key exported for the first time.
Two things came back, and the second is why this change is no longer `lite`.

**BattleGrid had deployed again — v5.0.0 → v5.1.0 — during the session.** The
gate caught it on its first real run. Tool count 110 for the third consecutive
deployment. The change is purely additive (four crowd metrics:
`CROWD_PICK_LIVE`, `CROWD_UPBIAS_LIVE`, `CROWD_ACC_LIVE`, `CROWD_CAPT_LIVE`),
so runtime vocabulary discovery absorbs it and nothing broke.

**And `npm test` wrote to the live account.** Every live probe gated itself on
`BATTLEGRID_API_KEY` alone, so with a key exported the ordinary suite ran four
mutating probes **concurrently** against the real BattleGrid account — forking
strategies, archiving them, creating and archiving an agent — tripping each
other's optimistic concurrency as they went:

```
Error: no archive proposal: "Dunkirk (fork)" is already archived.
ConfirmationRequiredError: what was submitted is not what was agreed to —
    the values changed since the consequence was read
```

Nothing was lost; the confirmation ceremony refused what it should. But that
exposure was never a decision anyone made, and this change is what makes
running with a key normal. It cannot ship the reason without the fix.

## What changes

**1. `ci.sh` gains a `freshness` gate**, using the `skip` helper it already has.
With a credential it runs the live comparison and a stale record fails the run;
without one it prints `skipped — no BATTLEGRID_API_KEY`, in the summary beside
every other gate. The value is the line, not the run: a named skip reads as
*"you have not checked"*, a silent one reads as a pass.

**2. A credential stops being consent to mutate.** Probes that can reach a
mutating tool now require `BATTLEGRID_LIVE_WRITES=1` as well as the key. Five
files: the four that write, plus `radar-probe`, which only ever *attempts*
writes it expects refused — and "the platform will refuse this" is a claim
about a platform that moved three times this week.

**3. A guard keeps it true**, deriving the mutating set from the surface
record's own classification rather than from a list here. A new probe reaching
a mutating tool without the opt-in fails the guard by name.

**4. `tests/support/config.test.ts` stops testing its own environment.** Its
scrub list omitted `BATTLEGRID_API_KEY`, and a personal key puts the config in
a mode where the OAuth pair is not required — so two cases meant to fail passed
for anyone with a key exported.

## What this does not do

- **It stores no credential.** The gate reads what the operator already exports
  and skips loudly when absent. `.env.example` gains nothing.
- **It schedules nothing.** A cron noticing a deployment without anyone running
  `ci.sh` needs the key reachable unattended, which is the operator's call.
- **It does not re-probe automatically.** A gate that repairs what it measures
  cannot fail, and this one has to be able to.

## Capabilities

- `platform-mapping` — the freshness gate is named in the verification run.
- `battlegrid-connection` — a credential in the environment is not consent to
  mutate. This belongs to the capability that "owns the trust boundary, and the
  safety rules that cannot be delegated to a caller's good intentions".

## Track

`standard`, escalated from `lite` once the second finding landed. It touches the
trust boundary and changes what an existing command does to a real account —
which is more than a reviewer should get in one paragraph — but it migrates
nothing, changes no contract, and is reversible by reverting two gates.
