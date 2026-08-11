# Tasks — an evaluation explains its conditions

- [x] 1. Domain: `ConditionClause`, `ConditionOutcome`, `ConditionReport`
      in `src/domain/agent/scorecard.ts`; `EvaluationScorecard.conditions:
      ConditionReport | null`.
- [x] 2. Mapper: `mapConditions` in `scorecard-mapper.ts` — absent/null →
      null; nameless outcome dropped; strings verbatim; wired into
      `mapEvaluationScorecard`.
- [x] 3. Page: condition section on
      `app/(app)/agents/[id]/pipeline/[logId]/page.tsx` — per-condition
      verdict + clause evidence, counts line, strategy revision,
      `provisional` where the platform says it, known ops as symbols and
      unknown verbatim; absent block renders nothing.
- [x] 4. Tests: mapper (populated mirror of the 2026-08-11 observation,
      absent, null, nameless dropped, verbatim strings); rendering
      (populated section, absence, unknown op verbatim).
- [x] 5. Suite green; update #133 item + issue (build landed, gap stays);
      validate + archive.
