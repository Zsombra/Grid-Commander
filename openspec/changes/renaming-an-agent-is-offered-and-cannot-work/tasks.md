# Tasks

## Let a confirmation through

- [x] 1. `AgentsPort.updateAgent` takes `confirmationToken`; the adapter
      forwards `{ target, confirmationToken }` as `setLifecycle` does.
- [x] 2. `UpdateAgentCommand` accepts and forwards it.
- [x] 3. A propose step that names the consequence and issues a token bound to
      the agent — modelled on `ProposeRebindCommand`. Never self-issued.

## Let the answer out

- [x] 4. The rename action reads its result and renders the reason, like
      `edit/page.tsx` already does.
- [~] 5. Guarded for **this** action (`tests/agent/rename.test.ts` asserts the
      rename reads its result). A general "no server action discards a write
      result" scan is not written — filed as
      `no-action-may-discard-a-write-result`.

## Say why it cannot be changed

- [x] 6. The rename control is not offered for an archived or immutable agent.
- [x] 7. An archived agent says it is retired, and that reactivating makes
      changes possible again.

## Prove it

- [x] 8. Re-inject each defect and watch the guards fail.
- [ ] 9. Live probe: create → rename → read back → archive.  ← next
- [x] 10. `npm test`, `typecheck`, `lint` green.

## Close the loop

- [x] 11. Close `update-cannot-carry-a-confirmation` (P1).

## A correction made while doing this

The proposal said `AgentRenameForm` "renders unconditionally", so an archived
agent showed an editable name box. **It does not.** The component has always
self-gated on `isEditable` and returned `null`; it is the *call site* that is
unconditional.

The defect is real and different in character: the control does not appear, and
nothing says why or that reactivating restores it. A blank space where a form
was reads as the page forgetting rather than refusing. Fixed in the component,
which is where the decision already lived — `app/` may not import the domain,
and `src/presentation/` may.
