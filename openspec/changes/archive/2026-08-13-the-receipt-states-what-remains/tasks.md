# Tasks

## 1. The receipt reads the record

- [x] 1.1 The receipt branch no longer renders `{trimmed}`.
      `app/(app)/recorder/trim/page.tsx:26-60` — the parameter survives only as a
      marker that a trim completed; every figure comes from the read.
- [x] 1.2 Sourced from the existing `readRecordCoverage`
      (`page.tsx:45`), and rendered through the existing `RecordCoverage`
      component (`src/presentation/components/signal-record.tsx:150`) — the same
      one `/recorder` uses, so the two cannot drift. No stored summary added.
- [x] 1.3 The `never-recorded` arm renders honestly: a trim that removed
      everything says "Recording has not started." Pinned by
      `tests/rendering/trim-record.test.ts` → *"re-derives against whatever the
      record holds when it is opened"*.

## 2. The failed-read branch

- [x] 2.1 The `unreadable` arm states the reason and that the store not
      answering says nothing about what it holds. Pinned by *"says the record
      could not be read, without claiming it is empty"*, which also asserts the
      never-recorded sentence is **absent** — the two failures may not borrow
      each other's words.
- [x] 2.2 No hand-rolled banner. `RecordCoverage` owns all three arms; the page
      adds none of its own. Note `WhyNotLoaded` was considered and rejected — it
      names BattleGrid as the unreachable party, and this is the local record
      store, so it would have been the wrong sentence.

## 3. The perform stops carrying figures

- [x] 3.1 `performTrim` redirects to `/recorder/trim?trimmed=1`
      (`page.tsx:171`). The receipt-sentence construction is gone.
      `TrimOutcome` is still the command's return
      (`trim-record.command.ts:98,124`) — the spec clause is preserved, only its
      rendering changed.
- [x] 3.2 Re-checked: `grep -rn "trimmed=" app/ src/ tests/` returns only the
      new marker and this change's own comments. Nothing else consumed the
      sentence.

## 4. Tests

- [x] 4.1 *"states what the record now holds, read from the record"* — asserts
      the coin comes from the store, which the address never named.
- [x] 4.2 *"renders no figure the address carried"* — forges the old sentence's
      exact shape (`Removed 9999 runs: 4242 captures…`) and asserts none of
      `9999`, `4242`, `31337` or `Removed` reaches the page.
- [x] 4.3 *"re-derives against whatever the record holds when it is opened"* —
      the same address against an empty record states the present, not a past
      removal.
- [x] 4.4 *"says the record could not be read, without claiming it is empty"*.
- [x] 4.5 **Not planned, found by the gate:** `tests/rendering/trim-record.test.ts`
      already existed and pinned the old behaviour
      (`toContain('Removed 1 run')`). Its receipt block was rewritten rather
      than worked around, and the four tests above live there — not in
      `recorder.test.ts`, where they were first written and would have
      duplicated a surface two files then described. See DL-1.

## 5. Surface record

- [x] 5.1 **Done at 43c08d5, as its own commit.** Re-survey `recorder-trim`
      into `openspec/design/surfaces/recorder-trim.json`. Not done now:
      re-pinning against an uncommitted working tree produces a manifest that
      looks fresh and is not — the failure #192 was filed for. This is the last
      commit of the round, per design-contract §8.

## 6. Gates

- [x] 6.1 `npm run typecheck` — PASS (exit 0)
- [x] 6.2 `npm run lint` — PASS (exit 0)
- [x] 6.3 `npm test` — PASS, **169 files / 2210 tests**. (2207 before: one
      receipt test replaced by four.)
- [x] 6.4 `npm run build` — PASS, full route table emitted
- [x] 6.5 `npm run db:generate && git diff --quiet drizzle/` — PASS, *"No schema
      changes, nothing to migrate"*, `drizzle/` unchanged
- [ ] 6.6 `npm run test:db` — **BLOCKED, not passed and not failed by this
      change.** 76/76 fail identically at
      `tests/db/support.ts:20` → `pg-pool`: `SASL: SCRAM-SERVER-FIRST-MESSAGE:
      client password must be a string`. The local `DATABASE_URL` carries no
      credentials, and the server demands SCRAM. All 7 db files fail the same
      way, including `connections.test.ts` and `oauth-transactions.test.ts`,
      which this change does not touch. Needs a `DATABASE_URL` with credentials
      from the operator; not something to guess at.

## Decisions

**DL-1 — the tests belong in the file that already owned the surface.**
The four receipt tests were first written into `tests/rendering/recorder.test.ts`
and the full-suite gate then failed on an assertion in
`tests/rendering/trim-record.test.ts`, a dedicated file the initial survey had
missed. Both files would then have described the same surface. They were
consolidated into `trim-record.test.ts` and removed from `recorder.test.ts` —
two renderings of one thing is the drift trap #167 is filed about, and creating
a second instance of it while fixing a first would have been poor.

**DL-2 — `WhyNotLoaded` rejected for the unreadable arm.**
It is the product's shared unreadable sentence, but it names BattleGrid as the
party that could not be reached. The trim receipt reads the **local** record
store. `RecordCoverage`'s own arm already says the right thing — "the store did
not answer, which says nothing about what it holds" — so the correct reuse was
the component that owns this read, not the one that owns the other.

**DL-3 — the heading still asserts the act, and that is deliberate.**
`Record trimmed` is true on the redirect path and merely stale on a hand-crafted
address. It carries no figure, so the forgery this change closes — authoritative
numbers nobody can check — is closed. Making the heading present-tense as well
was considered and judged worse: the operator who just clicked needs their act
confirmed, and the spec's requirement is about figures, not the fact.

## 2026-08-13 (later) — the blocked gate ran, and passes

`npm run test:db` was reported BLOCKED throughout this change: the local
`DATABASE_URL` carried no credentials and all 76 db tests failed at
`tests/db/support.ts:20` on connection.

The operator supplied the credentials afterwards. **The gate passes: 7 files /
85 tests.** Recorded here rather than left as "blocked", because an archived
change that says a gate never ran, when it has since run and passed, is a
record that misleads in the safe-looking direction.

The scenario this change modified — **Only the described span goes** — is pinned
by `tests/db/signal-record.test.ts`, and it was among the 76 that could not run.
It now passes explicitly:

```
✓ previews the doomed span without touching it
✓ previews an empty span as zeros with no dates
✓ trims runs before the boundary — captures, failures and readings with them
✓ leaves another account's older rows exactly where they were
```

So the one requirement whose coverage this change could not demonstrate is
demonstrated.
