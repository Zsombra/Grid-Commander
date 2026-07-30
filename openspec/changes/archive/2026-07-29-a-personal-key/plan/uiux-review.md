# UI/UX Review: a-personal-key

One component added: `PersonalModeNotice`, rendered by the `(app)` layout.

**Tokens only.** `consequence-border`, `consequence-default`,
`consequence-subtle`, `text-text-primary`, `text-text-secondary`. No invented
value.

**`consequence`, not `notice`.** The system's first principle is that
consequence outranks everything on a screen. This is the only element in the
product describing what someone *else* could do with the deployment, and it
outranks the page beneath it.

**Two registers in one paragraph, deliberately.** The first sentence is what
someone must act on — anyone who reaches this acts as you — at
`text-text-primary`. The second is the scope declaration, at
`text-text-secondary`: true, important, and not the thing to read first.

**Rendered, not asserted.** Both colour schemes, `docs/merge/proof/personal-mode-*.png`.
The banner reads correctly above the navigation in both, and the `consequence`
tone is distinguishable from the `notice` tone used elsewhere.

**What rendering found.** Beneath the banner, the roster's `unreadable` branch
says *"Reconnect to continue"* — an action that does not exist in this
deployment. Not this component's defect, and filed as
`personal-mode-says-reconnect` (P1) rather than patched at the edge.

**Accessibility.** `role="note"`, which is correct for advisory content that is
not an alert — it is a standing property of the deployment, not an event.
