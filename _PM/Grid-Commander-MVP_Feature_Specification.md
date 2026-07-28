# Grid-Commander MVP — Feature Specification

Narrative behind the delta specs. The contract lives in
`openspec/changes/*/specs/`; this document is the reasoning that produced it.

Source: `_IDEA/Grid-Commander_Idea_Brief.md` §4.3.
Domain: `docs/BATTLEGRID_SURFACE_MAP.md`, `docs/BATTLEGRID_MCP_REFERENCE.md`.

---

## Executive Summary

**Problem.** BattleGrid exposes a deep agent and strategy model — a revisioned
strategy aggregate, a compile → review → apply authoring pipeline, a scoped
permission system — and the only ways to reach it are the first-party app or raw
MCP tool calls. Neither serves the work that actually decides whether an agent is
good: seeing what a change will do *before* it does it, and remembering what you
already tried.

**User value.** Author strategies and agents with the consequences visible. See
which agents a change will reach before applying it. Keep a record of every
change made on your behalf.

**Business value.** A trust-shaped wedge. The product holds delegated authority
over other people's trading agents, and the differentiator is that it treats that
authority carefully — read-only by default, explicit step-up, complete audit.
That is difficult to retrofit and hard for a generic client to copy.

---

## Status Tracker

### Resolved
- Product shape: multi-tenant web workbench with an assistant.
- BattleGrid supports OAuth DCR + PKCE + `mcp:read`/`mcp:wager`, so no user ever
  pastes a credential.
- MVP scope: 13 features, per the brief.
- Stack and architecture: TypeScript / Next.js / Postgres / Drizzle, Clean
  Architecture lightly applied.

### Decided in this document (open to reversal)
- **D-1** BattleGrid OAuth is the *only* identity. Feature 20 ("Grid-Commander
  accounts") collapses into feature 1. See Decision Log.
- **D-2** The MVP ships as four sequenced changes, not one. Greenfield makes
  every requirement an ADDED, and one change carrying the whole MVP would be
  unreviewable.
- **D-3** `mcp:wager` is never requested during MVP. Nothing in MVP scope needs it.

### Pending Discussion (Product Owner)
- Revenue model — unresolved, deferred with billing. Not blocking.
- Whether one Grid-Commander account may connect several BattleGrid accounts.
  Assumed **one-to-one** for MVP.
- Retention: how long audit entries and cached snapshots are kept.

### Unclear (needs live verification, not opinion)
- Whether DCR issues durable client credentials, and access/refresh token
  lifetimes. Determines re-consent frequency.
- Whether scope can be stepped up incrementally without re-consenting `mcp:read`.
- Whether any push channel exists for agent state. None found; polling assumed.

### Blocked
- Nothing blocks specification. **Commercial confirmation that BattleGrid permits
  third-party clients blocks launch**, not design. Architecturally it is
  evidently intended (DCR, public clients, scoped consent, revocation).

---

## User Journeys

### J-1 — First connection

```
[Landing] → [Connect BattleGrid] → [BattleGrid consent, mcp:read only]
   → [redirect back] → [Roster, populated] → success

   ├─ user declines consent      → return with nothing stored, plain explanation
   ├─ BattleGrid unreachable     → no half-created account
   └─ callback state mismatch    → refused, nothing stored
```

The consent screen is the product's first honest moment. The user is granting
authority that can *create and rebind agents* even at read scope, and the
interface says so in those words rather than calling it "read-only access".

### J-2 — Authoring a strategy

```
[Strategy catalog] → [Fork a SYSTEM strategy] → [Private copy at revision 1]
   → [Edit] → [Compile] → [REVIEW: diff + viability + blast radius] → [Apply]
   → [New revision; every bound agent updated]

   ├─ plan token expires (5 min)   → recompile transparently, re-present
   ├─ revision drifted             → refuse, show what changed, recompile
   └─ user abandons at review      → nothing written; compile is free of effect
```

The review step is the product. Everything before it is data entry; everything
after it is a consequence. A user must not be able to reach "apply" without
having been shown the diff and the blast radius.

### J-3 — Creating an agent

```
[Roster] → [New agent] → [Pick strategy] → [Pick brain] → [Set personality]
   → [Optional trading config, bounds-validated] → [Create] → [Agent live in roster]

   ├─ no agent slots left     → explained before the form, not after submission
   └─ bounds violated         → rejected against the live catalog, not a guess
```

### J-4 — Understanding what happened

```
[Agent] → [Journal: thoughts, activity, decisions] → understanding
[Account] → [Audit log: every write Grid-Commander made] → trust
```

Two different questions. The journal answers "what did my agent think?"; the
audit log answers "what did *this product* do to my account?".

---

## Business Logic

### BL-1 — The money line

Every BattleGrid tool is classified before it is callable:

| Class | Rule |
|---|---|
| Read-only (`readOnlyHint: true`) | Callable freely within the user's grant |
| Mutating, `mcp:read` | Callable, **recorded in the audit log** |
| Mutating, destructive | Requires explicit confirmation naming the consequence |
| Requires `mcp:wager` | **Not reachable in MVP at all** |

Classification comes from the server's own annotations at runtime, never from a
hard-coded list. A tool the product has never seen is treated as mutating and
destructive until its annotations say otherwise — fail closed.

### BL-2 — Scope is not a safety boundary

`mcp:read` grants configuration authority: 11 tools mutate on it alone, 6 of them
destructive. The product must never present read scope as view-only, and must
never rely on scope alone to prevent a destructive action.

### BL-3 — Capability discovery

The tool list is not authoritative after a BattleGrid deployment. Capabilities
are discovered per session. If discovery fails, the product operates on its last
known list **in read-only mode only** — a stale list may misclassify a write.

### BL-4 — Optimistic concurrency

Every mutation carries `expectedRevision`. A conflict is surfaced honestly —
what changed, by whom if known — and never silently retried, because a blind
retry would apply an intent formed against a state that no longer exists.

### BL-5 — Compile is free of effect

Compiling writes nothing. Applying writes everything, atomically, to every bound
agent. The interface must make that asymmetry obvious rather than presenting two
similar-looking buttons.

### BL-6 — Audit completeness

Every mutating call is recorded *before* it is attempted and updated with the
outcome. A crash mid-call must leave evidence that something was attempted. An
audit log that only records successes is not an audit log.

---

## Success Metrics

- **Adoption**: connections completed / connections started (J-1 drop-off)
- **Engagement**: strategies applied per active user; ratio of compiles to
  applies (a healthy ratio is *not* 1:1 — abandoning at review is the feature
  working)
- **Quality**: destructive actions taken without confirmation — target zero,
  measured as a defect not a rate; concurrency conflicts surfaced vs. errored
- **Trust**: audit log views per user; revocations (a rising revocation rate is
  the single most important negative signal this product has)
- **Cost**: LLM spend per active user

---

## Risk Assessment

| Risk | P | I | Mitigation | Owner |
|---|:-:|:-:|---|---|
| Destructive tool called by mistake | M | H | One scope-aware layer; confirmation naming the consequence; audit before attempt | Eng |
| MCP surface changes under us | H | M | Runtime discovery; fail closed; regenerator diffs the surface | Eng |
| Plan token expiry treated as an error | H | L | Expiry is a normal path — recompile and re-present | Eng |
| Token custody breach | L | H | Envelope encryption, server-side refresh only, per-user revoke | Eng |
| User misreads read scope as harmless | H | M | Consent copy states configuration authority explicitly | Product |
| BattleGrid disallows third-party clients | M | H | Confirm commercially before launch | Product |
| LLM cost runaway | M | M | Per-user budgets from day one | Eng |

---

## Decision Log

| Date | Decision | Rationale | Impact |
|---|---|---|---|
| 2026-07-27 | **D-1** BattleGrid OAuth is the sole identity | A separate account system means a second credential to secure and verify, for no MVP value. Identity *is* the BattleGrid connection. | Removes feature 20 as separate scope; one BattleGrid account per user |
| 2026-07-27 | **D-2** MVP ships as four sequenced changes | Greenfield makes everything ADDED; one change carrying 13 features would be unreviewable and unverifiable | Four change folders, sequenced |
| 2026-07-27 | **D-3** `mcp:wager` never requested in MVP | Nothing in MVP scope spends. Requesting authority you do not use is the opposite of the trust position | Deployment policies and grid submission stay out of MVP |
| 2026-07-27 | **D-4** Unknown tools fail closed | A tool absent from the last known list may be a write. Treating it as read would be a silent escalation | Discovery failure degrades to read-only |
| 2026-07-27 | **D-5** Audit written before the attempt | A log of successes cannot answer "what happened when it broke" | Two-phase audit write |

---

## Change Sequence

The MVP decomposes into four changes, each independently verifiable:

| # | Change | Capability | Why this boundary |
|---|---|---|---|
| 1 | `connect-battlegrid-account` | `battlegrid-connection` | Nothing else can exist without it. Contains OAuth, scope policy, capability discovery, and the audit foundation. |
| 2 | `author-agents` | `agent-authoring` | Roster, create, edit, journals. First real user value. |
| 3 | `author-strategies` | `strategy-authoring` | Browse, fork, compile → review → apply, blast radius. The hardest and most valuable. |
| 4 | `assistant-readonly` | `assistant` | Additive; safe to build last because it only reads. |

This document specifies all four. **Change 1 is written as delta specs now**;
2–4 follow as each is proposed, so the spec layer never describes more than the
work actually in flight.

---

## Validation

### Technical feasibility
- [x] Every behavior maps to a mapped MCP tool or to local state
- [x] No requirement depends on a push channel that was not found
- [x] Scope model matches the server's advertised scopes
- [ ] DCR flow proven end to end against the live server — **first build task**

### Business alignment
- [x] MVP scope matches the brief
- [ ] Revenue model — deferred by decision
- [ ] Third-party client permission — confirm before launch

### User experience
- [x] Failure paths specified for every journey
- [x] Consent copy treated as a product surface, not legal boilerplate
- [ ] Accessibility — deferred to design; no behavior depends on it

---

STATUS: DRAFT

**SPECIFICATION COMPLETE ✓**
