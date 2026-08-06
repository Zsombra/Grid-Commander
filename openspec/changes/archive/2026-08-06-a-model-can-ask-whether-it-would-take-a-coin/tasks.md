# Tasks

- [x] 1.1 Done. `read_qualification` in `src/mcp/tools.ts`, wired to
      `readQualification`, taking `agentId` and an optional `coinTickers`.
      Non-string entries are dropped rather than coerced — one unknown ticker
      makes BattleGrid refuse the whole screening, so `"1"` would cost the good
      coins too
- [x] 1.2 Done. The response opens `{kind, screening, source, result}`: a
      sentence naming the coins and where they came from, then the structured
      `CoinSource`, then the verdicts. The fallback says *why* it happened —
      deployed nowhere, or deployments unreadable, which produce identical coins
      and opposite conclusions
- [x] 1.3 Done. The description tells the model to report the source with the
      verdicts, and states no count of anything the platform owns. The coin cap
      is deliberately absent from the schema too: the use-case caps by dropping
      the surplus and reporting how many, so a `maxItems` would tell a client the
      call fails when it does not
- [x] 1.4 Done. `docs/MCP_SERVER.md` — the tool table, the count ("Twenty
      tools. Nineteen are reads"), and a paragraph on why this one answers about
      now and why its subject travels with its answer
- [x] 1.5 Done. `tests/mcp/qualification.test.ts` — ten cases over a real client
      and the real use-case: every source, both fallback reasons, a coin argument
      that is not a list, the no-coins answer, an unreadable screening whose
      source is still stated, the cap's report, and that `screening` and `source`
      are serialised ahead of `result`
- [x] 1.6 Done. `tests/live/mcp-server-probe.test.ts` screens the first agent
      through the spawned server and holds the sentence to naming every coin in
      `source.coins`; `no-coins` is accepted as an answer with its own reason
      rather than as a failure
- [x] 1.7 Done. `npx tsc --noEmit -p tsconfig.json` and `npx eslint .` clean;
      `npx vitest run tests/mcp/ tests/architecture/` → 209 passed, including
      `mcp-read-only.test.ts`, which admits the tool on the same derivation every
      other read passes on: `ReadQualificationQuery` reaches no mutating port
      method, so no exemption was needed
