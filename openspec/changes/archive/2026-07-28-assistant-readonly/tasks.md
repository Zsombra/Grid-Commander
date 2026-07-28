# Tasks: assistant-readonly

## 1. Domain

- [x] 1.1 `toolset.ts` — read-only as a filtered set, derived from `classifyTool`
- [x] 1.2 `answer.ts` — grounded / general / refused, and the incompleteness note
- [x] 1.3 Tests per rule

## 2. Ports and application

- [x] 2.1 `src/ports/assistant.ts` — the model as a port
- [x] 2.2 `ask-assistant.command.ts` — derive the toolset, re-check every call,
      abandon on revocation
- [x] 2.3 Thread an `actor` through the audit: domain, port, schema, repository,
      call path, adapter

## 3. Infrastructure

- [x] 3.1 `not-configured.ts` — an honest refusal until a model is chosen

## 4. Presentation

- [x] 4.1 `assistant-answer.tsx` — the answer and its citation
- [x] 4.2 `app/(app)/assistant/page.tsx`
- [x] 4.3 The audit log distinguishes assistant reads from the user's own

## 5. Verification

- [x] 5.1 A test per scenario — 6 requirements, 16 scenarios
- [x] 5.2 Structural: the toolset has one source, and it derives from `classifyTool`
- [x] 5.3 Structural: the port is given a `callTool` and nothing else
- [x] 5.4 Mutation-check the read-only filter, the re-check, and the revocation
- [x] 5.5 All quality gates green
