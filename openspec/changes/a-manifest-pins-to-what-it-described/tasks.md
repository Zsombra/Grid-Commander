# Tasks

## 1. The digest

- [x] 1.1 A function in `.claude/tools/openspec.py` that digests a manifest's
      `source_files`: read each path, normalise `\r\n` → `\n`, hash
      `path\0content` per file, combine order-independently (sort the per-file
      hashes before the final hash). Traces to: **A Surface's Freshness Is
      Decided By Content, Not By History**.
- [x] 1.2 A path that cannot be read contributes a marker rather than raising —
      the surface is stale, and validation completes. Traces to: scenario
      "A described file no longer exists".
- [x] 1.3 Prefix the stored value with its algorithm (`sha256:…`), so the next
      person to change it can tell what they are changing.

## 2. Validation reads it

- [x] 2.1 `design_surface_stale` compares digests, and names the files that
      differ — not just a count. The current message says "N source file(s)
      changed"; with content in hand it can say which.
- [x] 2.2 Remove the git path: `git_changed_since` and its caller. Keep
      `git_commit_exists` **only** if something still needs it — if nothing
      does, remove that too, along with `design_surface_pin_unresolvable`,
      which this change supersedes.
- [x] 2.3 A manifest with no `source_digest` reports
      `design_surface_never_verified` — neither fresh nor stale. Traces to:
      **A Surface That Cannot Be Verified Says So**.
- [x] 2.4 Do **not** compute a digest for a manifest that lacks one. Recording
      today's content as though it were surveyed is the failure this whole
      change is about.

## 3. Migration

- [x] 3.1 For the thirteen manifests whose `generated_at_commit` resolves,
      compute the digest from `git show <commit>:<path>` — the content they
      actually described — and write it in. Verified reachable: `git show`
      returns the file at `e7c56ce`.
- [x] 3.2 For the eleven whose pin does not resolve, write `source_digest: null`.
      Their surveyed content is not recoverable and must not be guessed.
- [x] 3.3 Report which of the thirteen come out **stale** once digested. That is
      real drift the commit check may have been reporting all along, and it must
      not be quietly absorbed by the migration.

## 4. The contract and the skill

- [x] 4.1 `design-contract.md` §4 — add `source_digest` to the shape, and say
      what decides freshness now.
- [x] 4.2 `design-contract.md` "Staleness" — rewrite. It currently says
      "`generated_at_commit` plus `source_files` lets the tool detect drift",
      which stops being true here.
- [x] 4.3 The `ui-surveyor` skill — record a digest when writing a manifest, and
      say why the commit alone is not enough. Its "Refresh what is committed,
      never the working tree" section still holds and should say what it now
      rests on.

## 5. Tests

- [x] 5.1 Content changes → stale, naming the file.
- [x] 5.2 Line endings alone → not stale.
- [x] 5.3 `source_files` reordered → not stale.
- [x] 5.4 A missing path → stale, validation completes.
- [x] 5.5 No digest → never-verified, and neither fresh nor stale.
- [x] 5.6 **The one that matters**: a manifest whose recorded commit does not
      exist, whose content is unchanged, reports **fresh**. That is the whole
      point, and it is what the commit-based check could not do.

## 6. Gates

- [x] 6.1 `npm run typecheck`
- [x] 6.2 `npm run lint`
- [x] 6.3 `npm test`
- [x] 6.4 `npm run build`
- [x] 6.5 `npm run db:generate && git diff --quiet drizzle/`
- [ ] 6.6 `npm run test:db` — against a **disposable** database. The guard from
      #195 refuses anything else, and it refuses for a reason.
- [x] 6.7 `python3 .claude/tools/openspec.py validate --all` — and read the
      surface warnings, which are the output this change exists to change.

## Notes

**The eleven stay unverified after this lands.** That is the correct outcome,
not a shortfall: each needs a real re-survey, and this change is about making
their state legible rather than silent. Say so in the handoff — an unverified
count that quietly becomes a fresh count is exactly the failure being fixed.

**`board` prints surface counts.** Check it still reads correctly with a third
state, and remember it dies on Windows without the stdout reconfigure added in
`5d414b4`.

## Execution record — 2026-08-13

**The migration, and what it found.** 13 manifests had a resolvable commit, so
their digests were taken from `git show <commit>:<path>` — the content they
actually described, not today's. 11 could not be recovered and hold
`source_digest: null`.

**Three of the thirteen came out stale** (task 3.3, which existed so this would
not be quietly absorbed): `agent-reactivate-confirm`, `strategy-rule-editor` —
both known #192 leftovers — and **`strategy-conditions-save`**, which was
re-pinned earlier the same day and then changed again by #111's work. Real
drift, correctly caught.

**Per-file digests, not one hash over the set.** The first attempt stored a
single combined hash, and its stale message then said "8 source file(s) differ"
when one did — a combined digest cannot be decomposed. Recorded per file
instead, so the message names the file that moved. That is the difference
between a warning someone acts on and one they learn to skim.

**The headline case, proven**: a manifest whose recorded commit never existed,
whose content is unchanged, reports **fresh**. The commit-based check could not
answer it at all — `git diff` fails identically for "commit not here" and
"nothing changed".

## Gates

typecheck · lint · vitest (171 files / 2232) · build · db:generate + drizzle
clean · `validate --all` 0 errors · `board` renders.

`test:db` — **not re-run**. This change touches no TypeScript, no schema and no
runtime code; it is the harness tool, its tests, two docs and the manifests. It
passed at `04170e4` against `grid_commander_test` and nothing here can affect
it. Saying so rather than running it for the look of the thing.

## Not done, and filed rather than absorbed

- [ ] 6.6 Six harness tests fail on Windows on backslash-vs-forward-slash in
      diagnostic messages. **Pre-existing** — verified by stashing this change
      and reproducing them identically. Filed as **#196**. The two this change
      *did* break — `design_surface_stale`'s fixture and the every-code-has-a-
      fixture check — were fixed here.
- The **eleven never-verified surfaces** stay never-verified. Each needs a real
  re-survey; this change made their state legible rather than silent, which is
  all it set out to do.
