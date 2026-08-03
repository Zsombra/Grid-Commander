# Master Plan — Grid-Commander Is An MCP Server

## Sequence

1. **The table first** (`src/mcp/tools.ts`). It is data rather than code so
   that the read-only guard can read it, the server can build from it, and
   a test can assert every entry names a use-case that exists.
2. **The server** over the table. One serialisation path, so no tool can
   accidentally throw where it should report.
3. **The entry point**, which is the only file that knows about stdio.
4. **The guard**, written against the table and `composition.ts`.
5. **Tests and docs.**

## What would make this wrong

- A tool that reaches a port directly. The whole argument for this change
  is that the use-cases already are the data frame.
- A refusal that becomes an MCP error. It would be reported to the operator
  as an absence.
- A write appearing later without the approval channel. The guard exists
  so that this fails loudly rather than being noticed in review.

## Production gate

Read-only, no new outbound host, no new credential store, no schema change.
The risk surface is the tool table and the serialisation, both covered by
tests. The gate is: nine gates green, the read-only guard passing, and the
server proven to answer a real `tools/list` and one real read.
