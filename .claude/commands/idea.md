---
description: Explore a greenfield project idea — define the concept, target users, business model, MVP scope, and recommend tech stack + architecture
argument-hint: <project-idea-description>
---

## Role

You are a product architect who bridges business thinking and technical design. You take raw ideas and transform them into structured foundations that engineers can plan and build from.

## Context

Project directory: !`ls -la 2>/dev/null || echo "No project directory yet"`
Existing code: !`git log --oneline -1 2>/dev/null || echo "No git repo — greenfield project"`

## Task

Explore and structure the following project idea into a foundation document that feeds directly into `/spec`, `/solutions`, and the checklist-generator:

**Idea:** $ARGUMENTS

Do NOT write user stories (that's `/spec`). Do NOT compare architecture options in detail (that's `/solutions`). Do NOT create checklists (that's `checklist-generator`). Stay at the concept level — high enough to see the whole picture, low enough to be actionable.

## Phases

### Phase 0: Clarification

Before anything else, ask the user targeted questions to fill gaps in the idea. Do NOT assume answers. Ask only what's necessary — keep it focused.

**Required questions (ask together):**

1. **Who is this for?** "Who is the primary user? (e.g., developers, traders, small businesses, consumers)"
2. **What problem does it solve?** "What specific pain point or need does this address?"
3. **How will it make money?** "What's the intended revenue model? (subscription, usage-based, freemium, marketplace, ads, or unsure)"
4. **What's the timeline?** "What's the target timeline? (MVP in weeks, months, or exploring?)"
5. **Any tech preferences?** "Do you have preferences for language, framework, or platform? (or say 'recommend')"

Only proceed after receiving answers. If the user says "recommend" for tech, handle that in Phase 3.

### Phase 1: Concept Definition

Using the user's answers, define the concept clearly.

#### 1.1 Product Definition

```
PRODUCT: [name or working title]
ONE-LINER: [what it does in one sentence]
TARGET USER: [who uses it and why]
PROBLEM: [specific pain point being solved]
VALUE PROPOSITION: [why someone would pay for or use this]
```

#### 1.2 Market Context

Identify the competitive landscape. Do NOT do deep market research (that's a separate concern) — just establish awareness.

```
COMPETITORS / ALTERNATIVES:
- [Competitor 1]: [what they do, how this idea differs]
- [Competitor 2]: [what they do, how this idea differs]
- [DIY alternative]: [what users do today without this product]

DIFFERENTIATION: [why this idea is worth building despite alternatives]
```

#### 1.3 Business Model

Based on the user's revenue model answer, define the basics.

```
REVENUE MODEL: [subscription / usage-based / freemium / etc.]
WHO PAYS: [which user type pays, and for what]
PRICING SIGNAL: [rough tier thinking — not exact pricing, just structure]
  Example: "Free trial → $X/mo starter → $Y/mo pro"
KEY COST DRIVERS: [what costs scale with usage — AI API calls, storage, compute, etc.]
```

### Phase 2: Feature Scoping

#### 2.1 Feature Brainstorm

List ALL features the user mentioned or implied, plus obvious ones they didn't mention but would need (auth, settings, billing, etc.).

```
FEATURE LIST:
1. [Feature name] — [one-line description]
2. [Feature name] — [one-line description]
...
```

#### 2.2 MVP Prioritization

Prioritize using a simplified RICE framework:

| Feature | Reach | Impact | Confidence | Effort | Score | Priority |
|---------|-------|--------|------------|--------|-------|----------|
| [name] | H/M/L | H/M/L | H/M/L | H/M/L | [calculated] | MVP / V2 / Future |

**Scoring guide:**
- **Reach**: How many users need this? (H=all, M=most, L=some)
- **Impact**: How much value does it deliver? (H=core value, M=significant, L=nice-to-have)
- **Confidence**: How well do we understand what to build? (H=clear, M=some unknowns, L=lots of unknowns)
- **Effort**: How hard is it to build? (H=complex, M=moderate, L=simple)
- **Score**: (Reach × Impact × Confidence) / Effort
- **Priority**: MVP = must have for launch. V2 = next release. Future = someday.

#### 2.3 MVP Definition

```
MVP SCOPE (launch with these):
- [Feature 1]
- [Feature 2]
- ...

MVP EXIT CRITERIA: [what must be true for MVP to be "done"]
  Example: "A user can sign up, configure a chatbot, and embed it on their site"

EXPLICITLY DEFERRED (not in MVP):
- [Feature X] — deferred because [reason]
- [Feature Y] — deferred because [reason]
```

### Phase 3: Technical Foundation

#### 3.1 Technical Requirements

Based on the features, identify what the product needs technically.

```
TECHNICAL REQUIREMENTS:
- [ ] Authentication (sign up, login, sessions)
- [ ] Authorization (roles, permissions)
- [ ] Payments / Billing (subscriptions, invoicing)
- [ ] Database (relational / document / key-value)
- [ ] File Storage (uploads, media)
- [ ] Real-time (WebSocket, SSE, streaming)
- [ ] AI Integration (LLM API, embeddings, agents)
- [ ] Background Jobs (queues, scheduled tasks)
- [ ] Email (transactional, notifications)
- [ ] API (REST, GraphQL, SDK)
- [ ] Embeddable Widget (script tag, iframe)
- [ ] Admin Dashboard
- [ ] Analytics / Metrics
- [ ] Rate Limiting / Abuse Prevention
- [Check only what applies. Add others if needed.]
```

#### 3.2 Tech Stack Recommendation

Based on the requirements, recommend a tech stack with reasoning. If the user specified preferences, incorporate them.

```
RECOMMENDED TECH STACK:
- Language: [X] — because [reason]
- Framework: [X] — because [reason]
- Database: [X] — because [reason]
- ORM: [X] — because [reason]
- Auth: [X] — because [reason]
- Payments: [X] — because [reason]
- Hosting: [X] — because [reason]
- AI: [X] — because [reason]
- [Add others as needed]

ARCHITECTURE PATTERN: [Clean Architecture / MVC / Provider Pattern / etc.]
  — because [reason based on project complexity and requirements]
```

**Do NOT compare multiple stacks** — that's `/solutions`' job. Recommend ONE stack that fits the requirements. If the user wants alternatives, tell them to run `/solutions` next.

#### 3.3 Proposed Folder Structure

Based on the recommended stack and architecture pattern, propose an initial folder structure.

```
project-root/
├── [framework-specific structure]
└── [key directories with comments]
```

### Phase 4: Risks & Unknowns

#### 4.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| [Risk] | H/M/L | H/M/L | [Strategy] |

#### 4.2 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| [Risk] | H/M/L | H/M/L | [Strategy] |

#### 4.3 Open Questions

Questions that need answers before or during development:

```
1. [Question] — affects [what part of the system]
2. [Question] — affects [what part of the system]
```

## Deliverable

Save the output as: `_IDEA/[project-name]_Idea_Brief.md`

The document must contain:
1. Product definition (concept, users, problem, value prop)
2. Market context (competitors, differentiation)
3. Business model (revenue, pricing signal, cost drivers)
4. Prioritized feature list with MVP scope
5. Technical requirements checklist
6. Recommended tech stack with architecture pattern
7. Proposed folder structure
8. Risk assessment and open questions

## Handoff

This document feeds into:
- `/spec` — takes the MVP features and writes detailed user stories and business logic
- `/solutions` — takes the tech stack and architecture and explores detailed options (if user wants alternatives)
- `checklist-generator` — takes the tech stack and architecture pattern to generate review checklists

End with: **IDEA BRIEF COMPLETE ✓**

## Critical Rules

- **ASK FIRST** — Do not skip Phase 0 clarification questions
- **ONE STACK** — Recommend one tech stack, not three. `/solutions` handles alternatives.
- **MVP DISCIPLINE** — Be ruthless about what's MVP vs deferred. Less is more for launch.
- **NO USER STORIES** — That's `/spec`'s job. Stay at feature level.
- **NO CODE** — No implementation details. Stay at concept and structure level.
- **NO CHECKLISTS** — That's the checklist-generator's job.
- **BUSINESS MATTERS** — Revenue model and cost drivers shape technical decisions. Don't skip them.
