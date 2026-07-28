# Design: assistant-readonly

---

## A-A · Read-only is a filtered toolset, not an instruction

**Decision**: The assistant is handed a tool list produced by filtering the live
discovered set through `classifyTool`, keeping only `mutating === false` with
`basis === 'annotations'`. It is never given a mutating tool and told not to use
one.

**Why**: a model instructed not to write is a model that will not write until
something in its context suggests otherwise — a user asking firmly, a tool
description that reads like an invitation, an injected instruction in a strategy
description it just read. None of those is exotic; the third is a strategy field
a user can type into.

The classification layer from change 1 already answers "does this mutate", from
the server's own annotations, per session. Reusing it means the assistant's limit
is the same limit the guard sequence enforces, decided the same way, and a tool
whose annotations are missing is excluded rather than guessed at.

**The property worth asserting structurally**: the assistant's tool set is
produced by one function, and that function's output is filtered. If a caller can
hand the assistant a list it assembled itself, the guarantee is gone.

## A-B · The transcript of reads is the citation

**Decision**: Every tool the assistant calls while answering is recorded on the
answer itself. The answer and its reads travel together.

**Why**: an answer nobody can check is worse than no answer, because it will be
trusted. This capability is the only one that generates prose, and prose is
exactly where a plausible fabrication survives review.

Recording *what was consulted* is also the cheapest honest version of citation. A
per-sentence provenance is a research problem; "these four reads produced this
answer" is a list the product already has, because the reads went through the
call path.

**Consequence**: an answer built from nothing is a distinct shape, not an empty
list. "I did not look anything up" and "I looked and found nothing" are different
claims, and only the second is about the user's account.

## A-C · A failed read degrades the answer rather than the request

**Decision**: When a consulted tool fails, the answer is produced from what did
return, and names what is missing.

**Why**: the alternative — fail the whole question — is worse for a read-only
surface. A user asking "how many agents do I have and which strategies do they
use?" is better served by "you have three agents; I could not read your
strategies" than by an error.

**The line this must not cross**: the missing part is *named*, not silently
omitted. An answer that quietly covers two of three questions reads as complete,
and the user has no way to know otherwise. That is why the requirement says the
rest must not be presented as though it were complete.

## A-D · The model is a port

**Decision**: `AssistantPort` takes a question, a read-only toolset and a
conversation, and returns an answer plus the reads it made. No model, provider or
prompt appears in the domain or the application layer.

**Why**: which model answers is a deployment decision that will change, and the
requirements must not move when it does. Every rule in the delta spec — read-only,
attribution, scoping, not-knowing — is testable against a fake that returns
scripted answers, which is the point.

**Cost**: the prompt lives at the infrastructure boundary and is therefore not
covered by the domain tests. Accepted: a prompt is a configuration of a model, and
the guarantees this change makes are the ones that survive a bad prompt.

## A-E · The audit records assistant reads, marked as such

**Decision**: Reads the assistant performs go through the existing call path and
are recorded, with the actor distinguished from the user's own reads.

**Why**: the audit log's claim is "this is what Grid-Commander did to your
account". An assistant reading twelve tools to answer one question is
Grid-Commander doing something on the user's behalf, and leaving it out would make
the log's claim false by omission.

**Why marked rather than merged**: a user reviewing their audit log should be able
to tell "I did this" from "the assistant did this while answering me". Those are
different levels of intent, and merging them makes the log harder to reason about
precisely when someone is reasoning hard about it.

**Note on volume**: an assistant is chattier than a person. If this makes the
audit log unreadable, the fix is filtering in the view, not omission in the
record.

## A-F · Losing access abandons the answer

**Decision**: A `ConnectionRevokedError` raised mid-answer abandons it. The
partial answer is not returned.

**Why**: the reads that succeeded happened before the authority was withdrawn, so
returning them is defensible — and wrong. A user who has just disconnected, or
been disconnected, should not receive a synthesised statement about their account
composed from a grant that no longer exists. "Not connected" is the honest answer
to everything at that point.

## A-G · The assistant's scope is the user's own account, and that is what keeps it small

**Decision**: The assistant answers about the connected user's agents,
strategies, audit history and connection. Not market data, not other accounts, not
BattleGrid in general.

**Why**: it makes "only reads" a boundary rather than a slogan. A general-purpose
BattleGrid assistant would want the public read surface too — leaderboards, market
grids, other players' agents — and each addition makes the read-only guarantee
harder to state and the failure modes harder to enumerate.

It is also the honest scope for what the product is: a workbench for *your*
agents. A user asking about the market has better tools than this one.
