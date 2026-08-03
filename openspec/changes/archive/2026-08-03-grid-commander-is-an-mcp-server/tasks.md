# Tasks

- [x] 1.1 `src/mcp/tools.ts` — the tool table: name, description, input
      schema, and the use-case each calls. Data, so a guard can read it.
- [x] 1.2 `src/mcp/server.ts` — build an McpServer from the table; every
      result serialised with its own state name, refusals included.
- [x] 1.3 `bin/grid-commander-mcp.ts` — stdio entry point; resolves
      authority at boot and refuses to start without it.
- [x] 1.4 Read-only guard: derive mutating use-cases from `composition.ts`
      and fail if any is reachable from the tool table.
- [x] 1.5 Tests: the table's shape, each tool over the fakes, refusal
      pass-through, the boot refusal; docs; all nine gates green.
