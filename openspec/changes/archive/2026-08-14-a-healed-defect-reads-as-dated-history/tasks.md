# Tasks

## 1. Re-word the comments into dated history

- [x] 1.1 `agent-adapter.ts` — `readAroundRefusal` doc comment: replace the
      present-tense defect description ("refuses on **specific rows**,
      deterministically… the refusals cluster at the head") with dated
      history: refused 2026-08-12→13 (#100), healed by 2026-08-14 (re-probed,
      zero refusals), fallback kept as dormant defense because the platform
      has regressed before. Keep the bounded-windows rationale — it still
      explains the shape of the code.
- [x] 1.2 `agent-adapter.ts` — `readGateBlocks` header: re-word "retires
      itself the day #100 is fixed" — #100 is fixed and the fallback stays;
      the sentence must now say the fallback is kept as defense and costs
      nothing while the platform answers.
- [x] 1.3 `src/ports/agents.ts` — `GateBlocksResult` doc comment: date the
      "was 500ing on specific rows (#100)" narration (refused 2026-08-12→13,
      healed by 2026-08-14) so the rationale for the one-stage `refused`
      field reads as history.

## 2. Verification

- [x] 2.1 `npm run typecheck` and `npm run lint` pass — comment-only edits
      cannot regress them, and running them proves no code token was touched
      by accident.
- [x] 2.2 `git diff` shows changes only inside comment blocks in the two
      files — no executable line differs (infrastructure check; this is the
      change's entire safety argument).
