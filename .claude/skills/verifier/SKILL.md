---
name: verifier
description: Advisory check that implementation matches the change artifacts across completeness, correctness, and coherence. Reports CRITICAL/WARNING/SUGGESTION findings without blocking. Use after implementation and before archiving, or before handing a full-track change to the auditor.
---

# Verifier

## Lane

This skill owns the **advisory** check between implementation and archive.

It answers one question: *did we build what we agreed to build?*

It does NOT:
- Block anything. The auditor blocks; the verifier informs.
- Modify code, specs, or artifacts. It reads and reports.
- Grant production approval.

**Verifier vs auditor.** The verifier asks "does the code match the spec?" and
runs on every track. The auditor asks "is this fit for production?" — checklist
parity, technical debt, contract consistency — and runs only on `full`, with a
PASS/BLOCKED verdict. On a `full` change, run the verifier first: it is cheaper
and catches the mismatches that would otherwise burn an audit cycle.

## Required Inputs

A change ID. If not given, infer from conversation context; if ambiguous, run
`python3 .claude/tools/openspec.py list` and ask with **AskUserQuestion**.
Do not guess.

## Read First

```bash
python3 .claude/tools/openspec.py status <change-id> --json
python3 .claude/tools/openspec.py validate <change-id>
```

Then read every artifact that exists: `proposal.md`, all delta specs,
`design.md`, `tasks.md`. Read the current main specs for every capability the
change touches. Read the diff.

---

## Workflow

### Step 1: Completeness — is everything done?

**Task completion**
- Parse `tasks.md` checkboxes. Count `- [x]` vs `- [ ]`.
- Every incomplete task → CRITICAL, with the task text.
- A task marked done whose code you cannot find → CRITICAL. Checkbox theatre is
  worse than an open checkbox.

**Requirement coverage**
- For every ADDED and MODIFIED requirement in the deltas, search the codebase
  for its implementation.
- Requirement with no implementation found → CRITICAL, naming the requirement.
- Requirement whose implementation you found → record `file:line`.

**Delta coverage**
- Every REMOVED requirement: confirm the behavior is actually gone from the
  code, not just from the spec. Spec-only removal → CRITICAL.

### Step 2: Correctness — does it do the right thing?

**Requirement fidelity**
- For each requirement, compare the implementation against the requirement text.
- Divergence → WARNING with `file:line` and what differs.
- Watch for the common case: the code implements a *similar* behavior with
  different boundaries (30 minutes vs 15, inclusive vs exclusive, retries once
  vs thrice).

**Scenario coverage**
- For each `#### Scenario:` in the deltas, look for a test or code path that
  exercises it.
- Uncovered scenario → WARNING, naming it.
- Uncovered *error* or *edge* scenario → CRITICAL. Those are the ones written
  down precisely because they are easy to skip.

### Step 3: Coherence — does it hang together?

**Design adherence**
- If `design.md` exists, extract each `Decision:` and verify the code follows it.
- Contradiction → WARNING. Recommend one of: fix the code, or update
  `design.md` to record what was actually done and why. Silent drift is the
  failure; either resolution is fine.
- No `design.md` → note "no design to verify against" and skip.

**Scope adherence**
- Compare the diff against the proposal's **Out of Scope** section.
- Work outside the declared scope → WARNING, naming the files. Scope creep that
  nobody noticed is how a reviewed plan stops meaning anything.

**Pattern consistency**
- Check new code against project conventions: file naming, directory placement,
  error handling, existing idioms.
- Deviation → SUGGESTION with a pointer to the pattern being broken.

### Step 4: Report

```markdown
## Verification: <change-id>

| Dimension | Result |
|---|---|
| Completeness | <n>/<m> tasks · <n>/<m> requirements implemented |
| Correctness  | <n>/<m> scenarios covered |
| Coherence    | <followed / n issues> |

### CRITICAL — fix before archive
- **<finding>** — `file:line`
  Fix: <specific action>

### WARNING — should fix
- **<finding>** — `file:line`
  Fix: <specific action>

### SUGGESTION
- **<finding>** — `file:line`

### Not checked
- <what was skipped and why>

**Assessment**: <one of>
- "<n> critical issue(s). Fix before archiving."
- "No critical issues. <n> warning(s) to consider. Ready to archive."
- "All checks passed. Ready to archive."
```

---

## Heuristics

- **Completeness** is objective — checkboxes and requirement lists. Be strict.
- **Correctness** uses search and inference. You do not need certainty to raise
  a finding, but you do need a `file:line`.
- **Coherence** is about glaring inconsistency, not style nitpicks.
- **When uncertain, downgrade**: SUGGESTION over WARNING, WARNING over CRITICAL.
  A verifier that cries wolf gets ignored, and then it protects nothing.
- **Every finding needs a specific recommendation.** "Consider reviewing this"
  is not a finding. "`session.ts:41` expires at 30 min; the requirement says
  15 — change the constant" is.

## Graceful Degradation

| Artifacts present | What to verify |
|---|---|
| `tasks.md` only | Task completion. Note that spec and design checks were skipped. |
| `tasks.md` + deltas | Completeness and correctness. Skip design adherence. |
| Full set | All three dimensions. |
| `skip_specs: true` | Tasks, scope adherence, and pattern consistency only. Say so. |

Always report what was skipped and why.

## Hard Rules

1. **Do NOT modify code or artifacts.** Read and report only.
2. **Do NOT block.** The verdict is advisory; the user decides.
3. **Every finding carries `file:line` or an artifact reference.**
4. **Do NOT report a clean bill** on dimensions you could not check — say they
   were skipped.

## File What You Are Not Fixing

Every WARNING and SUGGESTION that will not be acted on this round becomes a
backlog item — `openspec/backlog/<id>.md`, see `.claude/references/tracking.md`.
Set `capability:` and name the change it came from in the body.

A finding raised, waved past, and never recorded is worse than a finding never
raised: it cost attention and bought nothing. List the item IDs you filed.

## Handoff

- Critical issues → back to **executor**.
- Clean or warnings only, track `full` → **auditor**.
- Clean or warnings only, track `lite`/`standard` → **archiver** (`/archive`).

## Completion

End response with:
- `VERIFICATION PASSED` — no critical issues
- `VERIFICATION FOUND <n> CRITICAL ISSUES` — otherwise
