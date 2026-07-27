# Spec Format

The normative format for everything under `openspec/`. Every skill that writes a
spec reads this file first.

Adapted from [OpenSpec](https://github.com/Fission-AI/OpenSpec) (MIT). The on-disk
format is deliberately byte-compatible with the `openspec` CLI, so a project can
adopt that CLI later without a migration.

---

## 1. A spec is a behavior contract

A spec says what the system **does**, in terms anyone could check. It is not an
implementation plan.

| Belongs in a spec | Belongs in `design.md` / `tasks.md` |
|---|---|
| Observable behavior users or callers rely on | Class, function, and module names |
| Inputs, outputs, error conditions | Library and framework choices |
| External constraints (security, privacy, compatibility) | Step-by-step build order |
| Scenarios that can be tested | Data-structure and schema internals |

**The test:** if the implementation can change without changing externally
visible behavior, it does not belong in the spec.

---

## 2. Requirements and scenarios

```markdown
### Requirement: Session Timeout
The system SHALL expire a session after 30 minutes of inactivity.

#### Scenario: Idle timeout
- **GIVEN** an authenticated session
- **WHEN** 30 minutes pass with no activity
- **THEN** the session is invalidated and the user must re-authenticate
```

Rules:

1. `### Requirement: <name>` — exactly 3 hashes. One behavior per requirement.
   If it needs three "and also" clauses, it is three requirements.
2. `#### Scenario: <name>` — **exactly 4 hashes**. Three or five parses as
   something else and the requirement silently reads as scenario-less.
   `openspec.py validate` catches this.
3. **Every requirement has at least one scenario.** Enforced.
4. Use RFC 2119 keywords, and mean them:

   | Keyword | Meaning |
   |---|---|
   | `MUST` / `SHALL` | Hard requirement. Default choice. |
   | `SHOULD` | Strong recommendation with room for a justified exception. |
   | `MAY` | Genuinely optional. |

5. Requirements must be **observable**. "The system SHALL show an error banner
   when an upload exceeds 10 MB" is observable. "The system SHALL handle large
   uploads gracefully" is not.
6. Name the case in the scenario title. "Rejects an expired token" beats "Test 2".
7. Cover the cases that matter, not just the happy path. Empty input, expired
   token, double submit, the thing that goes wrong — that is where bugs live.

**The requirement test:** could a tester who has never seen the code tell
whether it passed?

---

## 3. Main specs — the source of truth

`openspec/specs/<capability>/spec.md` describes how the system behaves **today**.
Organize capabilities by domain: `auth/`, `payments/`, `market-data/`.

```markdown
# Auth Specification

## Purpose

Authentication and session management for the application.

## Requirements

### Requirement: ...
```

Nobody edits main specs by hand during a change. They are written by the
archiver when a change lands. Hand-editing is reserved for correcting a Purpose
or fixing drift found by an audit.

---

## 4. Delta specs — how a change modifies the truth

`openspec/changes/<change-id>/specs/<capability>/spec.md` describes only what is
**changing**. This is the mechanism that makes the harness brownfield-first:
two changes can touch the same capability without conflicting, as long as they
touch different requirements.

```markdown
## ADDED Requirements

### Requirement: Two-Factor Authentication
The system MUST support TOTP-based two-factor authentication.

#### Scenario: 2FA enrollment
- **WHEN** the user enables 2FA in settings
- **THEN** a QR code is displayed for authenticator setup

## MODIFIED Requirements

### Requirement: Session Expiration
The system MUST expire sessions after 15 minutes of inactivity.

#### Scenario: Idle timeout
- **WHEN** 15 minutes pass without activity
- **THEN** the session is invalidated

## REMOVED Requirements

### Requirement: Remember Me
**Reason**: superseded by 2FA.
**Migration**: users re-authenticate each session.

## RENAMED Requirements

- FROM: `### Requirement: User Authentication`
- TO: `### Requirement: Primary Authentication`
```

| Section | Meaning | What archive does |
|---|---|---|
| `## ADDED Requirements` | Behavior that did not exist | Appends to the main spec |
| `## MODIFIED Requirements` | Behavior that already exists and is changing | Replaces the matching requirement |
| `## REMOVED Requirements` | Behavior going away | Deletes it from the main spec |
| `## RENAMED Requirements` | Name change only | Rewrites the header |
| `## Purpose` | What a brand-new capability is for | Seeds the new main spec |

### The rules that bite

- **MODIFIED must carry the full new requirement**, header through every
  scenario. Archive replaces the whole block, so a partial MODIFIED silently
  deletes the scenarios you left out. Copy the existing block from the main
  spec, then edit it.
- **Header text must match the main spec exactly** (whitespace- and
  case-insensitive) for MODIFIED, REMOVED, and RENAMED. Validation checks this.
- **`## Purpose` only for capabilities that do not exist yet.** On an existing
  capability it is ignored at archive; edit the main spec directly instead.
  A new capability without one archives to a `TBD` placeholder.
- **Adding a new concern to existing behavior is ADDED, not MODIFIED.** Use
  MODIFIED only when existing behavior actually changes.
- **A change with zero deltas fails validation** unless `.openspec.yaml` sets
  `skip_specs: true`. Use that only for pure refactors, tooling, and docs —
  work where no observable behavior changes. Never invent a requirement to
  satisfy the validator.

---

## 5. Progressive rigor — right-size the ceremony

Match the process to the stakes. The track is declared in `.openspec.yaml` and
decides which artifacts are required; see `change-lifecycle.md`.

| Track | Use for | Spec depth |
|---|---|---|
| `lite` | Typo fixes, copy changes, dependency bumps, isolated bug fixes | One requirement, one scenario — or `skip_specs: true` |
| `standard` | Most feature work | Behavior-first requirements, scope and non-goals, a few concrete acceptance checks |
| `full` | Contract or API changes, migrations, security and privacy, cross-team work, anything where ambiguity causes expensive rework | Full requirement set, edge and error scenarios, design decisions recorded |

Most changes are `standard`. A one-line typo fix does not need three
requirements and a design doc; a payments migration does.

---

## 6. Right-size the change itself

The most common authoring mistake is not a badly worded requirement — it is a
change trying to be three changes.

**A good change has one intent you can state in a sentence.** "Add a dark-mode
toggle." "Rate-limit the login endpoint."

Split it when:
- the proposal's scope reads like a list of unrelated features
- reviewing it would take an afternoon, so nobody will
- two people could not work on it without colliding
- half the tasks could ship on their own

Parallel changes are free — that is what the change-folder model buys you.

---

## 7. Validation

```bash
python3 .claude/tools/openspec.py validate <change>           # errors + warnings
python3 .claude/tools/openspec.py validate --all --strict     # promote advisories
```

Exit code 1 means errors exist. Checks performed:

| Code | Severity | Meaning |
|---|---|---|
| `no_deltas` | error | Change has no delta specs and no `skip_specs: true` |
| `skip_specs_with_deltas` | error | Contradictory metadata |
| `not_a_delta` | error | Change spec has no ADDED/MODIFIED/REMOVED/RENAMED section |
| `scenario_wrong_level` | error | Scenario heading is not exactly 4 hashes |
| `requirement_without_scenario` | error | Requirement has no scenario |
| `added_already_exists` | error | ADDED requirement is already in the main spec |
| `modified_not_found` / `removed_not_found` | error | Delta target does not exist |
| `renamed_not_found` / `renamed_target_exists` | error | Rename cannot apply |
| `no_main_spec` | error | MODIFIED/REMOVED against a capability with no main spec |
| `missing_purpose` | error | New capability delta has no `## Purpose` |
| `requirement_not_normative` | warning | No SHALL/MUST in the requirement statement |
| `purpose_ignored` | warning | `## Purpose` on an existing capability |
| `removal_without_reason` | warning | REMOVED with no `**Reason**` |
| `purpose_too_brief` | warning (strict) | Purpose under 50 characters |
| `main_spec_purpose_tbd` | warning | Leftover TBD placeholder in a main spec |

If `python3` is unavailable, perform these checks by reading the files. Never
skip them.

---

## 8. Authoring checklist

- [ ] Each requirement is one observable behavior with a `SHALL`/`MUST`.
- [ ] No implementation details baked into requirements.
- [ ] Every requirement has a scenario that actually exercises it.
- [ ] Edge and error cases have scenarios, not just the happy path.
- [ ] Deltas use ADDED / MODIFIED / REMOVED correctly against the current spec.
- [ ] MODIFIED blocks carry the complete new requirement.
- [ ] The change has one intent you can state in a sentence.
- [ ] `openspec.py validate` is clean.
