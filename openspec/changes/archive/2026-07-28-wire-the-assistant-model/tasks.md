# Tasks: Wire The Assistant Model

## Carry the argument schema

- [x] Add `inputSchema` to `DiscoveredTool` — optional, because a BattleGrid
      deployment may stop reporting it and a missing schema must not be read as
      a reason to drop the tool
- [x] Keep it in `rawDiscoverTools` rather than discarding it
- [x] Carry it onto `ReadOnlyTool` through `readOnlyToolset`
- [x] Test: a discovered tool's schema survives the read-only filter

## The adapter

- [x] `AssistantUnavailableError` in the domain, with the message the user sees
- [x] `ClaudeAssistant` implementing `AssistantPort` against `@anthropic-ai/sdk`
- [x] Bounded tool-use loop: cap iterations, cap `max_tokens`, stop on
      `end_turn`
- [x] A tool result that failed goes back to the model as an error result, so
      the gap is named rather than silent
- [x] `ConnectionRevokedError` propagates out of the loop rather than being fed
      back as a failed read — losing access ends the answer
- [x] A tool the model asks for that is not in the toolset is refused **by the
      use case**, and reaches the model as a failed read.
      *Changed from the plan.* The task said "refused inside the loop, without
      calling anything" — a second check in the adapter. Dropped, because it
      would be a second answer to a question the use case already answers, and
      the one that throws is the one carrying the guarantee. The adapter's job
      is to turn that throw into something the model can name. Noted in
      `claude.ts` so the absence reads as a decision.
- [x] Hitting the iteration cap produces the answer so far, marked incomplete,
      rather than nothing
- [x] An API failure raises `AssistantUnavailableError`, carrying nothing from
      the provider's error text

## The use case

- [x] `AssistantUnavailableError` becomes a `refused` answer, the same shape a
      discovery failure already takes
- [x] Test: the model failing does not propagate out of `execute`
- [x] Test: anything that is *not* an assistant failure still propagates — a
      swallowed `TypeError` would turn every bug into a polite non-answer

## Wiring

- [x] `anthropicApiKey` on `AppConfig`, optional — absent is a supported
      deployment, not a misconfiguration
- [x] Composition picks `ClaudeAssistant` when the key is present and
      `NotConfiguredAssistant` when it is not
- [x] `ANTHROPIC_API_KEY` documented commented-out in `.env.example`, so
      `scripts/check-serving.sh` keeps booting without one
- [x] Test: `loadConfig()` still succeeds with no key set, and reads
      set-but-empty as absent

## Guards

- [x] Test: the adapter offers exactly the tools it was handed — the toolset it
      receives is the filtered one
- [x] Test: the system prompt names the excluded tools, so the assistant can say
      what it cannot do rather than attempting it
- [x] Test: `.env.example` never sets the key uncommented — the one edit that
      would silently break the serving gate
- [x] Test the deployment with no model configured. Raised by verification as
      the change's one CRITICAL: `NotConfiguredAssistant` had shipped since the
      capability was written with nothing asserting what it returns — only a
      composition-root reference and a grep. It is also the state this product
      ships in by default.
- [x] Re-demonstrate each new guard failing against a re-injected defect before
      trusting it — 23 defects injected across three sweeps, 22 caught

**One missed, and worth recording.** Fabricating a `consulted` list inside
`NotConfiguredAssistant` left the suite green, and the comment first written
above that test claimed it would not. It does not, because
`AskAssistantCommand` builds the citation from what *it* observed and discards
what the port reports — so a lying port cannot reach the answer. The property is
carried one layer up, not by that file. Mutation replaced with one that can
actually break it (the implementation calling a tool), which fails four tests.
The comment was wrong about the codebase and has been corrected.

## Gates

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm test` — 431 passing, up from 394
- [x] `npm run build`
- [x] `./scripts/check.sh`
- [x] `./scripts/check-serving.sh` — with no `ANTHROPIC_API_KEY` set, and again
      with one set, since both are deployments this ships

## Not done

**The request body has never been sent to the real API.** No
`ANTHROPIC_API_KEY` was available in this environment. The shape is type-checked
against the SDK and the loop is tested against a fake; whether the server
*accepts* it is unproven, and the first real request will be made by a
deployment.

Not a task here, deliberately — it is owned by
`assistant-unverified-against-live-api` (P1), which states exactly what a fake
cannot tell us and what one manual check would settle. Restating it as an open
checkbox would put two systems in charge of the same work, which is how both go
stale.
