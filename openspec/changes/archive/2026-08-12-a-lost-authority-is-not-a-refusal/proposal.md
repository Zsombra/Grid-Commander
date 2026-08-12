# Proposal: A Lost Authority Is Not A Refusal

## Why

#175. Four command catches flatten every thrown error into
`{ kind: 'refused', reason: err.message }` — `deploy-agent.command.ts:158`
and `:269`, `retune-rule.command.ts:198`, `rebind-agent.command.ts:214`.
`ConnectionRevokedError` lands there too, even though the adapter takes
explicit care to preserve it: *"A revoked connection is already a domain error
and must not be reshaped into something that looks retryable"*
(`mcp-adapter.ts:285`). The catches reshape it into exactly that.

The operator is told the right things — the message is *"Your BattleGrid
connection is no longer valid. &lt;remedy&gt;"*, so diagnosis and remedy both
survive — and then shown a confirmation form, live, inviting a retry that
cannot work. It is labelled **"Refused:"**, which says this operation was
rejected, when what happened is that the account's authority is gone and every
operation will be.

## What Changes

- The four commands stop folding `ConnectionRevokedError` into `refused`. They
  return a distinct **`authority-lost`** outcome carrying the error's own
  sentence — which is deployment-correct by construction, because the error is
  built with that deployment's remedy.
- The four ceremony pages, on that outcome, **render the loss instead of the
  ceremony**: the sentence verbatim, in the danger role, and no form. Nothing
  is offered to click that cannot work.
- The reason travels as `?authority=`, distinct from `?problem=`, so a page
  cannot render one as the other.

## Capabilities

**New**: none
**Modified**: `battlegrid-connection` — "A Remedy Named Must Exist In That
Deployment" gains the mid-write case, and a new requirement states that a
surface must not offer a retry that cannot succeed.

## Out of Scope

- **Redirecting to `/connect`** — considered and rejected on evidence. On a
  delegated deployment it would work; on a personal one `/connect` renders
  *"There is nothing to connect — this deployment acts with a BattleGrid key
  it was configured with"*, which is a true fact about the deployment and a
  misleading answer to "my write just failed". It reads as though the operator
  navigated there by mistake rather than as an account whose key stopped
  working. Keeping them where they are, with the error's own remedy, tells
  both halves and loses nobody's place.
- **Re-throwing so the error propagates** — the obvious fix, and wrong. There
  is no error boundary in this product (no `app/error.tsx`, no
  `global-error.tsx`, nothing in `app/` or `src/presentation/` catches it), so
  a re-throw escapes the server action into Next's default error page: the
  crash class `the-outcome-reaches-the-person` closed. That would be strictly
  worse than today, which at least shows the sentence.
- **The other errors these catches absorb** — `PlatformUnavailableError`,
  scope and discovery refusals. Those are refusals of an operation and
  `refused` is the right arm for them.
- **`/agents/[id]/edit` and the strategy lifecycle actions**, which do not
  carry these catches.

## Impact

- `src/application/use-cases/{deploy-agent,retune-rule,rebind-agent}.command.ts`
  — one new result arm each, and a narrowed catch
- `app/(app)/agents/[id]/{deploy,undeploy/[coin],rebind}/page.tsx`,
  `app/(app)/strategies/[id]/rules/[signalId]/page.tsx` — the branch that
  renders the loss instead of the ceremony
- `src/presentation/components/authority-lost.tsx` — new
- `openspec/specs/battlegrid-connection/spec.md` — on archive
- Tests: the arm is returned rather than folded; the page renders no form when
  authority is gone
