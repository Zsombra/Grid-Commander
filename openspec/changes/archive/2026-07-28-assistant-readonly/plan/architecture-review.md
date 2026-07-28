# Architecture Review: assistant-readonly

Against `docs/specs/ARCHITECTURE_REVIEW_CHECKLIST.md`.

## Scope

Adds `src/domain/assistant/` (2 files), `src/ports/assistant.ts`, 1 use case,
1 infrastructure stub, 2 presentation files, 1 route. Modifies six files to
thread an audit actor.

## Component Checklist Matrix

| Rule | Components | Evidence |
|---|---|---|
| Dependency direction inward only | `src/domain/assistant/**` | `boundaries.test.ts` domain scan; `structure.test.ts::no assistant file imports the BattleGrid adapter` |
| External systems behind a port | `ports/assistant.ts` | The model is a port; no provider name appears above infrastructure |
| One responsibility per file | `toolset.ts` / `answer.ts` | What may be reached; what an answer is |
| No dual runtime paths | `ask-assistant.command.ts` | One route to BattleGrid — the injected `callTool` |
| No hard-coded platform vocabulary | `toolset.ts` | Derives from `classifyTool`; `structure.test.ts` forbids a name set |
| Routes reach no deeper than application | `app/(app)/assistant` | `boundaries.test.ts::W-D` |
| No identifier coerced into existence | all | `identifiers.test.ts`, now over the enlarged `src/` |

## Findings

**F-1 — read-only is enforced in three places, deliberately.** The filter builds
the set; the use case re-checks each call against it; a structural test forbids
any other file from assembling a set. That is more redundancy than this codebase
usually accepts, and it is justified once: the second check exists because the
first rests on a model honouring a list it was handed, and "the model complied"
is not a guarantee. The third exists because the first two are only as good as
their being the only route.

**F-2 — the port is deliberately impoverished.** `AssistantPort` receives a
question, a toolset, a history and a `callTool`. It receives no adapter, no access
token and no `fetch` — asserted by name in `structure.test.ts`. An implementation
physically cannot reach past what the use case gives it, which is what makes "the
model can only read" a property of the architecture rather than of the prompt.

**F-3 — the audit actor was threaded through six layers, and the type checker
found every site.** Domain type, port, schema column, repository, call path,
tool-call request. Making `actor` required rather than optional meant nine call
sites failed to compile; an optional field would have compiled everywhere and
recorded `undefined` in whichever one was forgotten.

**F-4 — no model is configured, and the deployment says so.** `NotConfiguredAssistant`
returns a truthful message and reads nothing, so the use case produces a
`general` answer — the correct shape, because the product is not claiming
anything about the user's account. Choosing and wiring a model is a deployment
decision (A-D), filed as `wire-an-assistant-model`.

**F-5 — a real defect found by mutation testing, not by review.** Removing the
`ConnectionRevokedError` re-throw broke nothing, which looked like redundant
defensive code. It was the opposite: the re-throw was not what carried A-F. A
model harness that catches its own tool errors — entirely ordinary — would have
produced a grounded answer about an account the product had just lost access to.
Fixed by recording the revocation and checking it after the port returns; the new
test fails against the pre-fix code.

## Status

EVIDENCE RECORDED
