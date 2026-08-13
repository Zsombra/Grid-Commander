# Tasks

Requirement keys:

- **R1** — Every Committed Record Of The Surface Names The Same Server
- **R2** — A Derivation Refuses A Source From Another Generation
- **R3** — Tool Count Is Never Treated As Evidence Of Currency *(modified)*

## 1. The records are compared

- [x] 1.1 **(R1)** Add a check that reads every committed record of the surface —
      today `docs/battlegrid-mcp-surface.json` and
      `docs/battlegrid-mcp-capabilities.json` — and asserts they name the same
      server version. No credential, no network.
- [x] 1.2 **(R1)** Fail on a record with no version in it, with a message saying
      it cannot be compared — matching the existing structural rule for the
      surface record rather than inventing a second vocabulary for the same idea.
- [x] 1.3 **(R1)** The failure names both versions and the repair command.
      **Derive the file list** rather than hard-coding two paths: a third record
      arriving and not being compared is this bug again.

## 2. The gate

- [~] 2.1 **CORRECTED DURING EXECUTION — no separate gate was added, and adding
      one would have been waste.** The task assumed the check would need naming
      in `scripts/ci.sh` the way `freshness` and `oauth-live` are. Those are
      named separately because they live in `tests/live/**`, which
      `vitest.config.ts` **excludes** — so without their own gate they would not
      run at all. This check lives in `tests/architecture/`, which the default
      `include: ['tests/**/*.test.ts']` already covers: it runs inside the
      `vitest` gate, in the default set, with no credential. Verified by
      `npx vitest run tests/architecture/` listing
      `surface-freshness.test.ts (11 tests)`. A second gate would re-run one file
      in a second process for no added signal.
- [x] 2.2 **(R1)** It fails on disagreement. It does **not** offer a skip path;
      there is no source to be unreachable, and a skip would recreate the silence.

## 3. The derivation refuses a stale source

- [x] 3.1 **(R2)** `refresh_declared` in `tools/probe_mcp_surface.py` compares
      server versions before deriving, and refuses with both versions named and
      a live re-probe as the stated repair.
- [x] 3.2 **(R2, R3)** Keep the existing tool-set refusal. It is not wrong — it
      is insufficient, and the comment explaining it should say which case each
      half catches.

## 4. The record stops implying more than it checked

- [x] 4.1 **(R3)** Where the session record or `CLAUDE.md` says v18.2.0 moved
      "nothing a count could see", say what that was scoped to: **input** schemas,
      the tool count and the read/write split — all still true — and that outputs
      grew by 188 leaves unseen because the artifact holding them was a major
      version behind. Correct by adding the scope, not by deleting the claim.

## 5. Verification

- [x] 5.1 **(R1)** Two records naming the same version pass.
- [x] 5.2 **(R1)** Two records naming different versions fail, and the message
      carries both versions. *This is the check that would have caught #198.*
- [x] 5.3 **(R1)** A record with no version fails as uncomparable, distinctly
      from one that disagrees.
- [x] 5.4 **(R3)** **The case the old rule missed**: two records with identical
      tool name sets and different versions must fail. A fixture where only the
      version differs — nothing else — so the test cannot pass for another reason.
- [x] 5.5 **(R2)** `refresh_declared` refuses a version-mismatched source and
      writes nothing. Assert the target file is unchanged, not merely that the
      call returned non-zero.
- [x] 5.6 **(R1)** The check reads the real committed records and finds at least
      two. A scan that silently found nothing would pass vacuously — the failure
      this whole directory exists to prevent.
- [x] 5.7 **Mutation check.** Re-run 5.2 and 5.4 against a deliberately broken
      implementation — compare tool sets only, as the old guard did — and confirm
      both fail. A guard nobody has seen fail is a guard nobody knows works, and
      this change exists because exactly that shipped.
- [x] 5.8 Quality gates: `npm run typecheck`, `npm run lint`, `npm test`,
      `npm run build`, the drizzle schema check, `npm run test:db`.
      **Point `DATABASE_URL` at `grid_commander_test`**, and note a live
      delegated connection is standing in it — see #208.


---

## Execution notes

**What investigating changed.** The proposal said nothing compared the two
records. Something did, twice over, and both were reading the wrong thing:

- `tests/architecture/surface-freshness.test.ts` already carried
  *"was taken from the same server version as the surface record"* — for
  `docs/battlegrid-vocabulary.json`, with the reasoning written out. It was
  applied to two of the three records and hard-coded as a pair, so the third
  was never covered. Replaced in scope by a **derived** sweep over every
  `docs/*.json` that declares a server.
- `refresh_declared` refused only on differing tool *sets*. v18 added no tools,
  so it derived a v18 artifact's fields from a v17.2.0 dump without complaint.

**A third record is not shaped like the other two.**
`battlegrid-mcp-capabilities.json` is a faithful MCP handshake dump: it carries
the protocol's `serverInfo` rather than the curated `server`, and **no
`probed_at` at all** — it cannot state its own age. Both readers now accept
either spelling. Rewriting the dump to match was rejected: its value is being
unedited.

**Mutation checks.** M1 — backdated the capabilities record to 17.2.0 with the
tool set untouched, reproducing #198 exactly: one test failed, the right one.
M2 — removed `serverInfo`: the vacuous-pass guard fired. M3 — disabled the
Python version comparison: `test_a_source_from_another_generation_is_refused`
failed, alone.

**Gates**: `typecheck` PASS · `lint` PASS · `vitest` PASS (**2260**, 172 files) ·
Python harness PASS (**255**) · `build` PASS · drizzle clean · `test:db` PASS
(**85**).

**One self-inflicted repeat**: editing `CLAUDE.md` left 227 CRLF line endings in
the working copy against `.gitattributes`. Same class as the CRLF finding earlier
today; caught by the same scan and normalised.

---

## Verifier finding, and the fix — 2026-08-13

**CRITICAL raised and cleared before archive.** The sweep's `records()` read
`readdirSync('docs')` with the path hard-coded, so every assertion ran against
the real committed records — which agree. Its two *failure* scenarios were
therefore proven only by the M1/M2 mutations, run by hand and reverted.

The asymmetry made it plain: the Python side got three permanent refusal tests
and the TypeScript side got none.

**That is this change's own thesis pointed at itself.** `refresh_declared`
failed exactly this way — a refusal that worked, was never exercised, and stopped
being able to fire without anything noticing. Shipping a replacement guard whose
refusal is only proven by a mutation that no longer exists in the tree would have
reproduced the defect one layer up, in the fix for it.

`records(dir = 'docs')` now takes a directory, and four tests drive the refusal
against synthetic fixtures: two generations, **identical tool sets with different
versions** (the case the old guard could not see), a record with no version, and
both spellings of the server block. 11 → 15 tests in the file.

**Gates after the fix**: `typecheck` PASS · `lint` PASS · `vitest` PASS
(**2264**, 172 files) · Python harness PASS (**255**) · `build` PASS ·
drizzle clean · `test:db` PASS (85) · CRLF scan clean.
