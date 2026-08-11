# Tasks: Retire Dead Agent Fields

## Implementation

- [ ] Remove `arenaChallengeEnabled` and `overlayText` from `Agent` type in `src/domain/agent/agent.ts`
- [ ] Remove both from `AGENT_OWNED_FIELDS` in `src/domain/agent/field-ownership.ts`
- [ ] Remove both from the raw response shape and mapper in `src/infrastructure/battlegrid/agent-mapper.ts`
- [ ] Remove `arenaChallengeEnabled` from the create port param in `src/ports/agents.ts`
- [ ] Remove `arenaChallengeEnabled` from adapter create signature and payload in `src/infrastructure/battlegrid/agent-adapter.ts`
- [ ] Remove `arenaChallengeEnabled` from create command DTO and forwarding in `src/application/use-cases/create-agent.command.ts`
- [ ] Remove `overlayText` branch from describe-edit consequence in `src/application/use-cases/describe-edit.query.ts`
- [ ] Remove both from `propose_agent_change` description in `src/mcp/tools.ts`

## Tests

- [ ] Fix any test that references `arenaChallengeEnabled` or `overlayText` on `Agent` or in field-ownership
- [ ] Verify: `npm run typecheck && npm run lint && npm test && npm run build`

## Validation

- [ ] `python3 .claude/tools/openspec.py validate dead-agent-fields-retired`
