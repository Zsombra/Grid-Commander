# Tasks

## 1. Domain

- [x] 1.1 `src/domain/agent/deployment.ts`: `RadarPause` —
      `{ radarPaused: boolean | null; platformPaused: number | null;
      coinsDeployed: number | null; scanning: number | null }`. Every field
      nullable, and the header says why: absent is a read that did not answer,
      not a running radar (D-1).
- [x] 1.2 Same file: `pauseIsUnknown(pause)` and `radarIsPaused(pause)` —
      the second is `=== true`, deliberately, so `null` is never truthy.

## 2. Infrastructure

- [x] 2.1 `radar-adapter.ts`: `mapPause(payload['summary'])`. Each field read
      by declared type; anything else is `null`, never coerced.
- [x] 2.2 `radar-adapter.ts:36`: return the pause beside the deployments.
- [x] 2.3 Tests against the declared v19.1.0 shape: full summary, absent
      summary, summary with a string where a number belongs, `radarPaused`
      absent while counts are present.

## 3. Port and application

- [x] 3.1 `src/ports/radar.ts`: the `deployments` arm of `RadarReadResult`
      carries `pause: RadarPause`.
- [x] 3.2 `read-deployments.query.ts`: carry it on the `deployed` arm and on
      the `summary` (byAgent) arm. Standing itself is **not** recomputed from
      it (D-3).
- [x] 3.3 Update the radar fakes so the widened type is honoured, not cast.
      Default to a running radar with counts, so existing tests keep their
      meaning, and give the fake a setter for the paused case.

## 4. Presentation

- [x] 4.1 `app/(app)/agents/[id]/page.tsx`, deployment section: state the
      pause above the list; no row claims to be scanning under it.
- [x] 4.2 `src/presentation/components/agent-roster.tsx`: the same fact,
      wherever it renders standing.
- [x] 4.3 The two pauses stated apart, the count against `coinsDeployed` (D-2).
- [x] 4.4 Nothing rendered where the pause is `null`.

## 5. The MCP surface

- [x] 5.1 `src/mcp/tools.ts`: the pause is part of what `readDeployments`
      serves. A model reading standing acts on it the way a person does.

## 6. Gates and records

- [x] 6.1 `npm run typecheck`, read directly — never through a pipe.
- [x] 6.2 `npm run lint`, `npm test`. `test:db` skipped — no schema change.
- [x] 6.3 `validate a-paused-radar-says-so`.
- [x] 6.4 Re-pin `source_digest` on every design manifest carrying a touched
      file; `agent-detail` and `agent-roster` are the likely two.
- [x] 6.5 Close `a-paused-radar-is-rendered-as-on-duty` / #311.
