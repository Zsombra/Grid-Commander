# UI/UX Review: ship-a-deployable-image

**N/A — no UI scope.**

The change adds no route, no component, and no rendered surface. `next.config.ts`
gains a build flag that changes what `next build` emits, not what it renders;
`next build` was re-run and all 20 routes are unchanged.

The one thing a person reads is the gate's refusal, and it is reviewed here on
the same principle every other refusal in this product is: it names what is
missing (`missing: 0000_sleepy_paibok`), says what the state is in plain terms
("This database has never been migrated"), and says what to run. A refusal that
does not say what to do is a puzzle handed to whoever is watching a deploy fail.
Asserted by `tests/db/schema-gate.test.ts` "says how to fix it".
