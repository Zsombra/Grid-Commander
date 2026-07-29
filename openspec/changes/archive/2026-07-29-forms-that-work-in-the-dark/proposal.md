# Proposal: Forms That Work In The Dark

## Why

Every text input, select and textarea in this product is
`className="w-full rounded border p-2"` — seven controls across four files, all
byte-identical, none of them touching a token. `border` resolves to Tailwind's
default grey and the background is left at the browser's, which is white.

In dark mode the result is a white box on a near-black page, next to panels that
*are* themed. Visible directly beneath the assistant's disclosure in
`docs/merge/proof/assistant-disclosure-dark.png`.

It is not a contrast failure — the text inside stays legible. It is worse in a
quieter way: the surrounding surfaces are themed, so the control reads as an
element that does not belong, or as one in some other state. Next to a themed
panel it looks disabled.

`tailwind-classes-with-no-tailwind` made the 213 utility classes real and DT-0001
generated the tokens. Neither pass touched form controls, so they are the one
family of elements still styled by defaults — including a `focus` token that
exists in `system.json` and is used by nothing.

## What Changes

- **One shared control treatment**, in `src/presentation/components/control.ts`,
  imported by every form. Seven copies of a token-based className would recreate
  the problem this change exists to fix, one layer along: four files that can
  disagree, invisibly, until someone notices one form looks different.
- **A constant rather than a component.** The controls are `<input>`, `<select>`
  and `<textarea>` with different props and different validation attributes;
  wrapping all three would mean a component that mostly forwards props, and the
  thing worth sharing is the treatment, not the element.
- **The focus token is used.** It is defined, generated into `tokens.css`, and
  currently referenced only by a global outline rule — so keyboard focus on a
  control gets the browser default rather than the system's.

## Capabilities

**None.** No behaviour changes: same controls, same names, same values, same
submissions. `skip_specs: true`.

## Out of Scope

- **Designing the form surfaces.** `agent-roster`, the assistant and the agent
  editor have never had a design pass. This applies tokens that already exist to
  controls that ignore them; it does not decide how a form should look. A design
  ticket over those surfaces is separate and still wanted.
- **Buttons and labels.** They use stock utilities too, and unlike the inputs
  they are legible in both schemes — the white-box problem is specific to
  elements with a background the browser owns. Filed as
  `buttons-and-labels-untokenised` rather than swept in here, so the one thing
  this change fixes stays checkable.
