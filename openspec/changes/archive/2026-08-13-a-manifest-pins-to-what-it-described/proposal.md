# A manifest pins to what it described, not to when

## Problem

A surface manifest records `generated_at_commit`, and staleness is decided by
asking git what changed in `source_files` since that hash.

**Half the manifests pin to commits that do not exist.** Twelve of twenty-four,
measured 2026-08-13:

```
agent-archive-confirm  agent-roster  audit-log  connect  explorer-competitor
explorer-evaluation  explorer-field  pending-proposal  pending-queue
pipeline-evaluation  pipeline-stages  strategy-catalog
```

Squash-merge is why. A branch's commits are discarded when the PR lands on
`main`, so the hash a manifest was pinned at stops existing. Until `5d414b4`
the check then reported nothing — `git diff` fails the same way for "that
commit is not here" as it succeeds for "nothing changed", and both reached the
caller as an empty list. Those surfaces could not go stale. Silently. For as
long as their pin had been dangling.

`5d414b4` made that visible (`design_surface_pin_unresolvable`). It did not make
it checkable: eleven surfaces still cannot be verified at all, and the next
squash-merge will add more.

**The pin is a proxy, and the proxy is the problem.** A commit hash answers
"when was this written". Freshness is a question about *content* — have the
files this manifest describes changed since it described them — and the hash
only answers it as long as the history it names survives. Under this repo's own
merge strategy, it does not.

This project already holds the principle one layer over. `harness-integrity`:
*"Every delta operation's effect on the resulting main spec SHALL be asserted on
the **content** of the written file. An exit code alone MUST NOT be accepted as
evidence."* A commit hash is the same kind of proxy as an exit code.

## Intent

**Pin a manifest to a digest of the files it described.**

A hash over the contents of `source_files` answers the freshness question
directly, and nothing about git can invalidate it — squash, rebase, amend,
cherry-pick, or a fresh clone with no history at all. The check becomes: hash
the files now, compare. No `git` invocation, no history dependency.

`generated_at_commit` stays, demoted to what it is honestly good for: telling a
human roughly when the survey happened. It stops deciding anything.

## Capabilities touched

- **spec-validation** — ADDED (a surface's freshness is decided by content;
  a surface that cannot be verified says so rather than passing)

## Scope

### In scope

- `source_digest` on the manifest: a digest over `source_files`' contents,
  order-independent, line-ending normalised
- The staleness check recomputes and compares it; the git path is removed
- Migration for the **thirteen resolvable** manifests: compute the digest from
  the content **at the commit they name**, which is exactly what they described
- The **eleven dangling** ones get `source_digest: null` and are reported as
  never-verified, needing a re-survey. Their content at survey time is not
  recoverable and MUST NOT be guessed at
- `design-contract.md` §4 and the ui-surveyor skill updated to record a digest
- A missing file in `source_files` is a stale surface, not a crash

### Out of scope

- **Re-surveying the eleven.** Each needs a real read of its code, which is the
  ui-surveyor's job and eleven separate pieces of work. This change makes their
  state *legible* — `never verified` rather than silence — and no more.
- **Removing `generated_at_commit`.** It is useful provenance and harmless once
  it decides nothing. Deleting a field twenty-four files carry, in the same
  change that changes what the check reads, would make one migration into two
  risks.
- **The re-pin-as-its-own-commit convention** (design-contract §8). It stays
  correct and stays a convention. It exists so the manifest describes committed
  code; the digest makes it *verifiable* rather than *assumed*, which is a
  different problem from when the re-pin happens.
- **Any other pinned artefact.** Only design surfaces carry
  `generated_at_commit`.

## Why standard, not lite

It changes a format twenty-four files carry, migrates them, and changes what a
check means. Not `full`: no production code, no data migration, no money, and
every step reversible.
