# Decision Log: assistant-readonly

---

## Phase 1 — Planning

### 2026-07-28 · AL-1 · Design · Read-only is a filtered toolset, not an instruction

**Decision**: The assistant is handed a set produced by filtering the live
discovered tools through `classifyTool`. It is never given a mutating tool and
told not to use one.

**Reason**: a model instructed not to write is a model that will not write until
something in its context suggests otherwise — a user asking firmly, a tool
description that reads like an invitation, or text it just read out of a strategy
field a user typed into. The third is not exotic; it is a supported feature of
this product.

Reusing `classifyTool` means the assistant's limit is the same limit the guard
sequence enforces, decided from the server's own annotations, per session — and a
tool the server says nothing about is excluded rather than guessed at.

**Approved by**: owner (full autonomy granted 2026-07-27).

---

### 2026-07-28 · AL-2 · Design · The transcript of reads is the citation

**Decision**: Every tool the assistant reaches while answering is recorded on the
answer, and the citation is built from what the *use case* observed rather than
what the port reported.

**Reason**: an answer nobody can check is worse than no answer, because it will
be trusted — and this is the only capability that generates prose, which is
exactly where a plausible fabrication survives review. Taking the port's word for
what it consulted would let an implementation write its own citation.

**Consequence**: an answer built from nothing is a distinct shape. "I did not look
anything up" and "I looked and found nothing" are different claims, and only the
second is about the user's account.

**Approved by**: owner.

---

### 2026-07-28 · AL-3 · Design · The model is a port

**Decision**: `AssistantPort` receives a question, a toolset, a history and a
`callTool`. No adapter, no access token, no `fetch`.

**Reason**: which model answers is a deployment decision that will change, and
none of this capability's requirements should move when it does. The
impoverishment is also the enforcement — an implementation physically cannot reach
past what it is handed, which makes "the model can only read" a property of the
architecture rather than of the prompt.

**Accepted cost**: the prompt lives at the infrastructure boundary and is not
covered by the domain tests. A prompt is a configuration of a model, and the
guarantees this change makes are the ones that survive a bad one.

**Approved by**: owner.

---

### 2026-07-28 · AL-4 · Design · Assistant reads are audited, and marked

**Decision**: Reads go through the existing call path and are recorded with an
`actor` distinguishing them from the user's own.

**Reason**: the audit log's claim is "this is what Grid-Commander did to your
account", and an assistant reading twelve tools to answer one question is
Grid-Commander doing something on the user's behalf. Omitting it would make the
log's central claim false by omission.

**Why marked rather than merged**: reviewing a log, "I did this" and "the
assistant did this while answering me" are different levels of intent, and merging
them makes the log hardest to reason about exactly when someone is reasoning hard
about it.

**Approved by**: owner.

---

## Phase 2 — Execution

### 2026-07-28 · AL-5 · Finding · Mutation testing found a real defect, not redundant code

**Decision**: Record the revocation and check it after the port returns, rather
than relying on a re-throw.

**What happened**: removing the `ConnectionRevokedError` re-throw from `callTool`
broke no test. The obvious reading was that the guard was unnecessary defensive
code — the kind the production gate exists to remove.

It was the opposite. The re-throw was not what carried A-F. **A model harness that
catches its own tool errors and carries on is entirely ordinary**, and in that
case the throw never reaches the use case: the answer completes, grounded, about
an account the product had just lost access to, with the revocation recorded as
nothing worse than a failed read.

The test written to prove the mutation mattered **failed against the unmutated
code**. So the defect was live, and only visible because a surviving mutation
prompted the question.

**Impacted**: `ask-assistant.command.ts`, `tests/assistant/ask.test.ts`.

**Worth carrying forward**: a surviving mutation is more often a missing test than
a redundant guard, and this is the second time in this project that following it
found a real defect rather than dead code.

---

### 2026-07-28 · AL-6 · Deviation · The `actor` was made required, not optional

**Decision**: `NewAuditEntry.actor` is required.

**Reason**: an optional field would have compiled at every call site and recorded
`undefined` at whichever one was forgotten. Required meant nine sites failed to
compile and each was considered. The type checker did the search.

---

### 2026-07-28 · AL-7 · Deviation · No model is configured, and the product says so

**Decision**: Ship `NotConfiguredAssistant`, which returns a truthful message and
reads nothing.

**Reason**: A-D makes the model a deployment decision, and none has been made.
The alternatives were a half-built adapter to a model nobody chose, or a surface
that pretends. An honest refusal that then points at where the information
actually is costs nothing and claims nothing.

**Filed as**: `wire-an-assistant-model`.

---

### 2026-07-28 · AL-8 · Executor handoff

**Decision**: Execution complete. 390 tests, up from 361.

**Mutation-checked**:
- read-only filter removed → 6 failures
- per-call re-check removed → 1 failure
- revocation flag unchecked → 1 failure
- revocation re-throw removed → **0 failures, and that was the finding** (AL-5)

**Next action**: production gate.

---

## Phase 3 — Production Gate

### 2026-07-28 · AL-9 · AUDIT · A surviving mutation was a live defect

**Decision**: PASS. One MAJOR fixed, two MINOR deferred with owners.

**PG-401** — a `ConnectionRevokedError` re-thrown from `callTool` only reaches the
use case if the assistant lets it propagate. A model harness that catches its own
tool errors and carries on is entirely ordinary, and in that case the answer
completed — grounded, about an account the product had just lost access to, with
the revocation recorded as nothing worse than a failed read.

**The method is the finding.** Mutation testing removed the re-throw and nothing
failed. That reads as redundant defensive code, which is exactly what a
production gate exists to strip, and deleting it would have been the confident
move. Writing the test to *prove* the mutation mattered produced a test that
failed against the unmutated code — the guard was not redundant, it simply was
not what carried the requirement.

Second time in this project that a surviving mutation was a missing test rather
than dead code, and the second time following it found something real.

**Deferred with owners**: PG-402 → `wire-an-assistant-model` (no model is
configured; every guarantee is independent of which one). PG-403 →
`assistant-conversation-history`.

**Next action**: archiver. This completes the MVP.
