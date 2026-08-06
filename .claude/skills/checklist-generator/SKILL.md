---
name: checklist-generator
description: Generates project-specific review checklists for any architecture pattern. Supports Clean Architecture, Provider/Plugin Pattern, and is extensible to MVC and others. Creates ARCHITECTURE_REVIEW_CHECKLIST.md, DATA_PIPELINE_REVIEW_CHECKLIST.md, and UI_COMPONENT_REVIEW_CHECKLIST.md in docs/checklists/. Auto-detects CREATE mode (no checklists) or UPDATE mode (checklists exist). Feeds the proposer → planner → executor → verifier → auditor pipeline. Produces engineering standards in docs/checklists/, distinct from the behavior contract in openspec/specs/.
---

# Checklist Generator

## Purpose

This skill creates the review checklists that the planner, executor, and auditor depend on. Without checklists, the full track cannot start. It adapts to different architecture patterns — not just Clean Architecture.

**Scope note.** Checklists in `docs/checklists/` are *engineering standards* — how code
must be built. They are not the behavior contract; that lives in
`openspec/specs/` and is written by the archiver. Both are binding and the
auditor checks both. See `.claude/references/change-lifecycle.md` §1.

## Lane

This skill owns checklist creation and maintenance only.

It does:
- Detect the project's architecture pattern (or ask)
- Create new project-specific checklists from scratch (CREATE mode)
- Update existing checklists with new rules (UPDATE mode)
- Generate code examples in the project's actual tech stack
- Present checklists for human review before saving

It does not:
- Create implementation plans (that's the planner)
- Write production code (that's the executor)
- Audit code quality (that's the auditor)
- Write or edit anything under `openspec/` (that's the proposer and archiver)

---

## Supported Architecture Patterns

### Pattern 1: Clean Architecture

**Use when**: Project has clear layer separation (Presentation → Application → Domain → Infrastructure), uses use cases, repositories, and dependency inversion. Common in enterprise apps, SaaS, and apps with complex business logic.

**Template set**: `references/clean-architecture/`

**Key components**: Use Cases, Repositories (Reader/Writer), Domain Entities, Infrastructure Adapters, DI Wiring

### Pattern 2: Provider / Plugin Pattern

**Use when**: Project is built around pluggable data sources, extensible modules, or adapter-based architecture. Data comes from external APIs rather than (or in addition to) a local database. Common in data platforms, integration hubs, developer tools, and extensible frameworks.

**Template set**: `references/provider-pattern/`

**Key components**: Providers, Fetchers, Routers/Commands, Registry/Entry Points, Response Objects, Transform Pipelines

### Adding New Patterns

To add a new architecture pattern (e.g., MVC, Hexagonal, Serverless):
1. Create a new folder under `references/` with three template files
2. Add the pattern to the discovery phase detection logic
3. Follow the same template structure: checkbox tables, code examples, anti-patterns

---

## Mode Detection (Automatic)

On invocation, check if checklist files exist:

```
Check: ls docs/checklists/*_CHECKLIST.md 2>/dev/null

Files found → Mode 2: UPDATE
No files   → Mode 1: CREATE
```

---

## Mode 1: CREATE (New Project)

### Phase 1: Discovery

Ask the user targeted questions to understand their project. Do NOT assume any answers. Ask in this order.

If an existing codebase is available, ANALYZE IT FIRST before asking questions. Use code analysis to pre-fill answers and only ask to confirm or clarify what can't be determined from code.

#### Round 0: Architecture Pattern Detection

If code exists, scan for signals:

| Signal | Pattern |
|--------|---------|
| `use-cases/` or `usecases/` folders | Clean Architecture |
| `providers/` + `fetchers/` or `models/` with fetcher classes | Provider/Plugin Pattern |
| `controllers/` + `models/` + `views/` or `templates/` | MVC |
| Repository interfaces in domain layer, implementations in infrastructure | Clean Architecture |
| Entry points or plugin registry for data sources | Provider/Plugin Pattern |
| `routers/` with command-style methods | Provider/Plugin Pattern |

If signals are unclear, ask:

"Which architecture pattern best describes your project?"

1. **Clean Architecture** — Layered: Presentation → Application (Use Cases) → Domain → Infrastructure. Dependency inversion via interfaces. Common in enterprise apps, SaaS.
2. **Provider / Plugin Pattern** — Extensible data sources, adapter-based. Data from external APIs or pluggable modules. Common in data platforms, developer tools.
3. **Other** — Describe your architecture and I'll adapt.

#### Round 1: Core Stack

Ask these questions together (or confirm from code analysis):

1. **Language**: "What programming language is the backend? (TypeScript, Python, Go, Java, other)"
2. **Server framework**: "What server framework? (Express, Fastify, NestJS, Hono, FastAPI, Django, Flask, Spring Boot, other)"
3. **Frontend framework**: "What frontend framework? (React, Vue, Svelte, Next.js, Nuxt, Angular, none)"
4. **Frontend platform**: "Is the frontend a web app, desktop app (Electron/Tauri), mobile app, or none?"
5. **Database**: "What database? (PostgreSQL, MongoDB, MySQL, SQLite, none/external APIs only, other)"
6. **ORM / Query layer**: "What ORM or query builder? (Drizzle, Prisma, TypeORM, SQLAlchemy, Mongoose, none, other)"

#### Round 2: Architecture-Specific Questions

##### If Clean Architecture:

1. **CQRS**: "Will you separate read operations (queries) and write operations (commands) into different classes? (yes/no)"
2. **DI approach**: "How will dependencies be injected? (constructor injection, framework DI container, manual wiring, other)"
3. **API style**: "What API style? (REST, GraphQL, tRPC, gRPC, other)"

##### If Provider / Plugin Pattern:

1. **Provider registration**: "How are providers/plugins registered? (entry points/setuptools, manual registry, config file, decorator-based, other)"
2. **Data source type**: "Where does data primarily come from? (external APIs, databases, file system, mixed)"
3. **Extension model**: "How are extensions added? (separate packages, plugin folder, config-driven, other)"
4. **API style**: "What API style for consumers? (REST, GraphQL, Python SDK, CLI, other)"
5. **Standard models**: "Do you have standard/shared data models that all providers must conform to? (yes/no)"

##### For Both (if frontend exists):

1. **State management**: "What state management? (Zustand, Redux, Pinia, Context API, Signals, react-hook-form only, none)"
2. **UI component library**: "What UI library? (shadcn/ui, Material UI, Ant Design, Chakra, custom, none)"
3. **CSS approach**: "What CSS approach? (Tailwind, CSS Modules, styled-components, Sass, plain CSS)"

#### Round 3: Optional Modules

"Which of these does your project use or plan to use? (select all that apply)"

- [ ] Redis or cache layer
- [ ] Authentication / Authorization
- [ ] WebSocket or real-time features
- [ ] Message queues (Kafka, RabbitMQ, Bull, etc.)
- [ ] Background jobs / scheduled tasks
- [ ] Monorepo with shared types across packages

"Which of these do you want checklist rules for?"

- [ ] Testing standards (test patterns per layer)
- [ ] Security rules (OWASP, input sanitization, secret detection)
- [ ] Monitoring / Observability (health checks, metrics)
- [ ] API documentation (OpenAPI, schema docs)

#### Round 4: Project-Specific Policies

Ask open-ended:

1. "Do you have any specific coding policies or banned patterns?"
2. "What file naming conventions do you prefer?"
3. "What folder structure will you use? (provide paths, or say 'suggest one')"
4. "Are there any existing linting/formatting tools configured? (Ruff, ESLint, Black, Prettier, etc.)"

If the user says "suggest one", propose a standard folder structure for their chosen architecture pattern and framework, then ask for approval before proceeding.

### Phase 2: Select Template Set

Based on the detected architecture pattern, select the template set:

```
Clean Architecture → references/clean-architecture/
  ├── architecture-checklist-template.md
  ├── data-pipeline-checklist-template.md
  └── ui-checklist-template.md

Provider / Plugin Pattern → references/provider-pattern/
  ├── architecture-checklist-template.md
  ├── data-pipeline-checklist-template.md
  └── ui-checklist-template.md
```

### Phase 2.5: Code Scan (Existing Codebases Only)

**Skip this phase if no code exists yet (greenfield project).**

When code exists, scan the codebase for violations of the rules in the selected template set BEFORE generating the checklists. This makes the first checklist immediately evidence-based rather than generic.

#### What to Scan For

Scan for anti-patterns already defined in the selected template's anti-patterns sections. Do NOT invent new rules from the scan — only check if existing template rules are violated.

##### Architecture Scan

| Scan | Command | What Violation Looks Like |
|------|---------|--------------------------|
| Infrastructure leak | Search for direct DB/ORM/HTTP imports in application layer | `from infrastructure import db` in a use case or command |
| Console logging | Search for print/console.log in production code | `print(...)` or `console.log(...)` instead of structured logger |
| Hardcoded credentials | Search for API keys, tokens, secrets in source | `API_KEY = "sk-..."` in code |
| Cross-boundary imports | Search for imports violating layer dependency rules | Provider importing from another provider |
| Untyped responses | Search for raw dict/JSON returns without model validation | `return response.json()` without Pydantic/DTO parsing |
| Swallowed errors | Search for empty except/catch blocks | `except Exception: pass` or `catch (e) {}` |

##### Data Pipeline Scan

| Scan | What Violation Looks Like |
|------|--------------------------|
| Client-side computation | Math operations on DTO/response fields in UI components |
| Silent defaults | `?? 0`, `or 0`, `getattr(x, 'field', 0)` masking missing data |
| Transform in fetch | Business logic mixed into data fetching methods |

##### UI Scan (if frontend exists)

| Scan | What Violation Looks Like |
|------|--------------------------|
| Components fetching data | `fetch()` or `useEffect` with API calls directly in components |
| Missing accessibility | Clickable divs, missing aria-labels, missing form labels |
| Console debugging | `console.log` left in component files |

#### Scan Output Format

For each violation found, record:

```
VIOLATION: [Rule name from template]
FILE: [path:line]
EVIDENCE: [code snippet]
SEVERITY: EXISTING (already in codebase)
```

#### How Scan Results Feed Into Generation

Scan results are added to the generated checklists in two ways:

1. **Known Violations section** — added at the end of each checklist with file:line evidence, so the team knows what to fix first
2. **Anti-pattern examples** — when a scan finds a real violation, use the ACTUAL code from the codebase as the ❌ WRONG example (instead of a generic example) to make the checklist immediately recognizable to the team

### Phase 3: Generate Checklists

Using the discovery answers, scan results (if any), AND the selected template set, generate three checklists:

1. Read the architecture template from the selected set
   - Fill in ALL placeholders with the user's tech stack
   - Include ONLY the modules the user selected
   - Generate code examples in the user's language and framework
   - Include anti-patterns specific to the user's tools and patterns
   - If scan found violations: add Known Violations section with evidence

2. Read the data pipeline template from the selected set
   - Adapt the pipeline layers to the user's actual stack
   - Skip layers that don't apply
   - Generate correct/incorrect code examples in the user's stack
   - Include the Iron Rule (source-of-truth principle — this is universal)
   - If scan found violations: add Known Violations section with evidence

3. Read the UI template from the selected set
   - Skip entirely if user has no frontend
   - Adapt to the user's frontend framework, state management, and UI library
   - Adjust for platform (web vs desktop vs mobile)
   - Include accessibility and responsive rules
   - If scan found violations: add Known Violations section with evidence

### Phase 4: Human Review

Present a summary of what was generated:

```
Generated Checklists Summary:
─────────────────────────────
Architecture pattern: [Clean Architecture / Provider Pattern / other]
Architecture: [X] sections, [Y] rules, modules: [list]
Data Pipeline: [X] layers, [Y] rules
UI Component: [X] sections, [Y] rules (or "SKIPPED — no frontend")

Tech stack: [language] + [framework] + [ORM/none] + [DB/external APIs]
Optional modules included: [list]
Custom policies applied: [list]
```

Ask: "Should I save these checklists to docs/checklists/? You can also ask to see any specific section first."

### Phase 5: Save

After human approval:

1. Create `docs/checklists/` directory if it doesn't exist
2. Write `docs/checklists/ARCHITECTURE_REVIEW_CHECKLIST.md`
3. Write `docs/checklists/DATA_PIPELINE_REVIEW_CHECKLIST.md`
4. Write `docs/checklists/UI_COMPONENT_REVIEW_CHECKLIST.md` (skip if no frontend)

Each file includes:
- Version: `1.0.0`
- Last Updated: current date
- Based On: `[Architecture Pattern] + [user's specific patterns]`

End with: `CHECKLISTS READY FOR PLANNER`

---

## Mode 2: UPDATE (Existing Project)

### Phase 1: Read Current State

1. Read all existing `docs/checklists/*_CHECKLIST.md` files
2. Parse current version numbers and architecture pattern
3. Identify existing modules and rules

### Phase 2: Determine Update Trigger

Ask: "What triggered this update?"

Options:
- **Bug report**: "A bug happened that the checklists should have caught"
  → Ask for bug description → Propose rule that would prevent it
- **New pattern**: "We adopted a new pattern or technology"
  → Ask what changed → Propose new section or rules
- **New module**: "We want to add rules for [module]"
  → Run the optional module discovery for that module → Generate section
- **Code analysis**: "Analyze our codebase and suggest missing rules"
  → Scan code for patterns not yet in checklists → Propose additions
- **Remove rules**: "Some rules are outdated or no longer apply"
  → Ask which rules → Propose removals

### Phase 3: Propose Changes

Present changes in this format:

```
Proposed Checklist Updates:
───────────────────────────

ARCHITECTURE_REVIEW_CHECKLIST.md (v1.0.0 → v1.1.0):
  ADD: [new rule description] in [section]
  MODIFY: [rule #X] changed to [new text]
  REMOVE: [rule description] — reason: [why]

DATA_PIPELINE_REVIEW_CHECKLIST.md (no changes)

UI_COMPONENT_REVIEW_CHECKLIST.md (v1.0.0 → v1.1.0):
  ADD: [new rule description] in [section]
```

### Phase 4: Apply

After human approval:
1. Apply approved changes
2. Bump version number (MAJOR for breaking, MINOR for additions, PATCH for fixes)
3. Update "Last Updated" date
4. End with: `CHECKLISTS UPDATED — VERSION X.Y.Z`

---

## Hard Rules

1. **Every rule MUST have a checkbox table row** — no prose-only rules
2. **Every rule MUST have correct/incorrect code examples** — in the PROJECT'S actual language and framework, not generic pseudocode
3. **Every section MUST have an anti-patterns subsection** — named, with code showing the mistake and the fix
4. **Code examples MUST use the project's real tech stack** — if they use SQLAlchemy, show SQLAlchemy code, not Drizzle
5. **Do NOT include modules the user didn't select** — no assumptions
6. **Do NOT assume patterns the user didn't confirm** — ask first
7. **Checklists MUST include version, date, and "Based On" header** — for traceability
8. **The Iron Rule (source-of-truth) MUST be in the data pipeline checklist** — this is universal regardless of architecture
9. **Accessibility rules MUST be in the UI checklist** — this is universal
10. **SOLID principles MUST be in the architecture checklist** — this is universal
11. **Use the correct template set for the detected architecture pattern** — do not mix Clean Architecture templates with Provider Pattern projects
12. **Layer models MUST match the actual architecture** — do not force 4-layer Clean Architecture onto a project with a different layer structure

## Checklist Quality Standards

Every generated checklist must pass these quality checks:

- [ ] All placeholder markers (e.g., `{LANGUAGE}`, `{FRAMEWORK}`) are replaced with actual values
- [ ] Code examples are valid in the stated language (no syntax errors)
- [ ] Anti-patterns show REAL mistakes developers make with this specific tech stack
- [ ] File paths match the user's stated folder structure
- [ ] Naming conventions match the user's stated preferences
- [ ] No sections are empty or contain only headers without rules
- [ ] Layer diagram matches the project's actual architecture (not a generic template)
- [ ] Component types match project terminology (Use Case vs Router Command vs Controller)
- [ ] Data access patterns match project reality (Repository vs Provider vs DAO)
- [ ] Review summary template is included at the end
- [ ] Quick reference card is included at the end

## References

### Clean Architecture Templates
- `references/clean-architecture/architecture-checklist-template.md`
- `references/clean-architecture/data-pipeline-checklist-template.md`
- `references/clean-architecture/ui-checklist-template.md`

### Provider / Plugin Pattern Templates
- `references/provider-pattern/architecture-checklist-template.md`
- `references/provider-pattern/data-pipeline-checklist-template.md`
- `references/provider-pattern/ui-checklist-template.md`
