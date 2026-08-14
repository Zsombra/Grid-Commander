# Tasks

## 1. Wiring

- [x] 1.1 In `AgentEditForm` (`src/presentation/components/agent-edit.tsx`),
      build the entered-money record: for each of the six `MONEY_FIELDS`
      (imported from `@/presentation/form.js`), prefer `composed[name]` and
      fall back to `composed['tc.' + name]` — the GET review bounce carries
      bare names, the apply's `backTo` carries the confirm form's `tc.*`
      hidden inputs. Omit fields present under neither spelling.
- [x] 1.2 Pass the merge over storage into the `MoneyLimits` call:
      composed values win per field, storage fills the rest — the same
      precedence `PositionManagement` already applies, so a first visit
      (no composition) renders exactly as today.

## 2. Verification

- [x] 2.1 Rendering pin, bare spelling: the review branch refuses (an
      unresolvable preset) with a typed money value in the query that differs
      from storage — the value is in `r.values`; the stored one is not.
      Extends the existing "a refused edit keeps what was entered" describe in
      `tests/rendering/binding.test.ts`, asserting on `values` not `text`.
- [x] 2.2 Rendering pin, `tc.` spelling: the form branch renders with a
      bounced `?problem=` and `tc.`-prefixed money values (the apply's
      `backTo` shape) — same property.
- [x] 2.3 First-visit pin: with nothing composed, the money boxes still
      prefill from the agent's stored `tradingConfig` (the existing
      prefill-from-agent behavior, now guarded against the merge regressing
      it).
- [x] 2.4 Quality gates: `npm run typecheck`, `npm run lint`, `npm test`,
      `npm run build`, `npm run db:generate && git diff --quiet drizzle/`;
      `npm run test:db` skipped if `DATABASE_URL` absent (this session: it
      is). `npm ci` first — fresh worktree has no `node_modules`.

## 3. Surface upkeep

- [x] 3.1 Re-survey the `agent-edit` surface manifest (ui-surveyor): this
      change edits `agent-edit.tsx`, staling the pin #259 set. Re-read the
      prose against the code, not only the digest — a digest can be refreshed
      while the words describe a form the code has outgrown.
      *Done — and the edit staled a second manifest the task did not name:
      `agent-reactivate-confirm` shares `agent-edit.tsx` (ReactivatePrompt
      lives in the same file). Its prose was re-read (all its claims are
      about ReactivatePrompt, untouched here) and its digest refreshed.
      `agent-edit`'s prose rewritten in four places that recorded the defect
      as current; both re-pinned at the change's commit.*

## 4. Bookkeeping

- [x] 4.1 Backlog item `the-edit-bounce-carries-money-nothing-refills`:
      `status: in-progress`, `change: the-bounced-money-refills-the-boxes`,
      `updated: 2026-08-15` (→ `done` at archive, with a landing note that
      names what the pin now asserts).
