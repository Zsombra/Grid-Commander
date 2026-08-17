## MODIFIED Requirements

### Requirement: The Product Is Reachable As An MCP Server

The product SHALL expose its read use-cases as MCP tools over a transport
that requires no hosted service, so that any MCP client can drive it.

Each tool SHALL be named and described for the question an operator asks,
and SHALL call the same use-case the web surface calls rather than
reaching the platform directly.

**A description SHALL NOT state a count of things the platform owns.** A tool
description is a static string served to a language model, which will repeat it
to an operator with the tool's own authority — while the tool returns the live
list. Nothing checks a sentence, so a tally written into one is true on the day
it is written and silently wrong afterwards. The list is the count.

#### Scenario: A model lists the tools
- **GIVEN** an MCP client connected to the server
- **WHEN** it lists tools
- **THEN** the read surfaces of the product are offered
- **AND** each carries a description of what it answers

#### Scenario: A description that would go stale
- **WHEN** a tool answers with a set the platform defines — signals, metrics,
  tools, modules
- **THEN** its description names what the set contains
- **AND** does not state how many there are

#### Scenario: A model reads the roster
- **GIVEN** a connected account
- **WHEN** the model calls the roster tool
- **THEN** it receives the same agents the web roster shows
