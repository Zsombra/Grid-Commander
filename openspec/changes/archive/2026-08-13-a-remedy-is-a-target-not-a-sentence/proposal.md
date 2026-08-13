# Proposal: A Remedy Is A Target, Not A Sentence

## Why

`AuthorityLost` renders the failure's own sentence — which contains the remedy,
*"Reconnect to continue."* — and then offers **nothing to click**. The only way
onward is the global nav.

`NotConnected`, answering the same question one step earlier, does the opposite.
DT-0006 ruled that its one remedy is a target rather than a sentence, and it
renders a `BUTTON_SECONDARY` anchor to `/connect`.

So the product states the same remedy two ways, and the **newer** surface is the
weaker one — reached at the worse moment, after a write has already failed.

## Why it was built that way, and why that argument no longer holds

`authority-lost.tsx` does not merely omit a link; it argues against one:

> For the same reason this does not redirect anywhere. Sending the operator to
> `/connect` is right on a delegated deployment and lands a personal one on
> "there is nothing to connect", which is a true fact about the deployment and
> no answer at all to "the write I just submitted failed".

That reasoning is correct, and the spec agrees with it — *A Remedy Named Must
Exist In That Deployment* forbids naming a remedy the deployment does not have.
The component had no way to tell the two deployments apart, so refusing to link
at all was the only honest option available to it.

**It is no longer the only option.** The deployment's remedy is already decided,
exactly once, at `src/composition.ts:189`:

    remedy: config.personal ? 'repair-the-key' : 'reconnect',

with the comment *"Fixed here so that no failure path has to work it out."* It is
handed to the MCP adapter and never exposed to the presentation layer. Expose it,
and the surface can offer a target where one exists and stay silent where none
does — which is what the requirement asked for in the first place.

## What changes

`App` carries the deployment's remedy. `AuthorityLost` takes it and renders a
`BUTTON_SECONDARY` anchor to `/connect` **only** when it is `reconnect`.

On `repair-the-key` nothing is added. There is no target — the operator must
edit an environment variable and restart the process, and a button cannot do
that. The sentence already names the variable.

## What deliberately does not change

**The sentence.** It is still the one the failure carried, verbatim. The link is
added beside it, not substituted for it, so a deployment whose remedy is the key
still reads the same words it reads today.

**The value is not carried on the error, and not on the URL.** Both were
considered. `ConnectionRevokedError` discards the `Remedy` it is constructed
with, and threading it through would put a deployment-scoped fact on a
per-failure object — against the ruling that it is *chosen once, where the
deployment is assembled, and never per request*. The reason already travels as a
search param, and adding `&remedy=` would put the same fact in a second place a
caller could get wrong.

**No control that performs the operation is added.** *Authority Lost
Mid-Operation Is Told Apart From A Refusal* requires the surface not to offer the
control that performs the operation. A reconnect link is the remedy, not the
operation, and the write that failed is not offered again.

## Not in scope

`AuthorityLost` has never been designed — its danger border and background are
byte-identical to `CarriedProblem`'s, which says something different
([[two-confirmation-row-shapes-and-an-undesigned-page]], #183). This change
reuses `BUTTON_SECONDARY`, the primitive `NotConnected` already uses for this
exact purpose, and adds no new treatment. The design round remains owed.
