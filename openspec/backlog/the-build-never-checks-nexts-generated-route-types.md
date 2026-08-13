---
id: the-build-never-checks-nexts-generated-route-types
title: The build's type check silently skips every route type Next generates
type: risk
status: open
priority: p2
created: 2026-08-13
updated: 2026-08-13
change: ""
capability: harness-integrity
github: none
blocked_by: []
tags: [build, typescript, nextjs, quality-gate, silent-skip]
---

# The build's type check silently skips every route type Next generates

## What

`next build` writes a type-validation file per route under `<distDir>/types/` and
type-checks it. `tsconfig.json` adds those files to `include`:

```json
"include": ["**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
"exclude": ["node_modules", ".next"]
```

`exclude` filters `include`, and `.next` excludes `.next/types`. So the files are
generated on every build and checked on none of them.

**Six pages fail that check.** Discovered by accident on 2026-08-13, building
into a distDir outside `.next` to avoid disturbing a running `next start`:

```
.next-gate/types/app/(app)/agents/[id]/archive/page.ts:12:13
Type error: ... Property 'performArchive' is incompatible with index signature.
  Type '(formData: FormData) => Promise<void>' is not assignable to type 'never'.
```

Next's page contract allows `default` plus a fixed set of named exports, and a
server action is not among them. The pages that export one beside their default:

```
app/(app)/agents/[id]/archive/page.tsx          performArchive
app/(app)/agents/[id]/deploy/page.tsx
app/(app)/agents/[id]/rebind/page.tsx
app/(app)/agents/[id]/undeploy/[coin]/page.tsx
app/(app)/recorder/trim/page.tsx
app/(app)/strategies/[id]/rules/[signalId]/page.tsx
```

The generated file for the archive page under `.next/types/` and the one under
`.next-gate/types/` are **byte-identical** — `diff` reports no difference. The
only thing that differed was whether `exclude` swallowed it.

## Why it matters

p2, and the priority is about the gate rather than the six pages.

`npm run build` is a declared quality gate and it passes. It passes because a
check it runs is thrown away, not because the code satisfies it. That is the
failure this repository keeps finding in itself — most recently three false
findings from reading `logs` where the payload said `entries`, and a stoppages
probe that summarised the wrong roster — arriving this time in the build gate.

**It is not known whether the six are real defects.** They may work fine at
runtime: Next has shipped server actions colocated with pages for several
versions, and nothing observed on the live walks suggests these routes misbehave.
The point is that nobody decided that. The check that would have raised it has
never run, so "the build passes" carries no information about it either way.

`tsc --noEmit` does not cover the gap. It reads the same `tsconfig` and applies
the same `exclude`, so it skips the generated files for the same reason.

## Evidence

- `tsconfig.json:37-46` — `include` lists `.next/types/**/*.ts`; `exclude` lists
  `.next`.
- `diff .next/types/app/(app)/agents/[id]/archive/page.ts` against the same path
  under a non-excluded distDir: identical.
- `NEXT_DIST_DIR=.next/gate-build npx next build` — passes, because the distDir
  sits inside the excluded `.next`.
- `NEXT_DIST_DIR=.next-gate npx next build` — fails on the archive page.
- `git log -S performArchive` — the export landed in `df1363a`, 2026-07-27. Every
  build since has skipped the check.
- **`next build` rewrites `tsconfig.json` mid-build.** Adding `.next-gate` to
  `exclude` did not survive: the file Next left behind had
  `exclude: ["node_modules", ".next"]` and an `include` it had extended itself.
  Any fix that works by editing `exclude` has to survive that rewrite.

## First step when taken

Decide the question the gate never asked: are the six exports a defect or not?

One command answers it without changing any configuration —
`npx tsc --noEmit -p tsconfig.json --explainFiles` will not, because the files
are excluded. Instead build once into a distDir outside `.next` and read the
errors, which is how this was found.

Then either move the actions into their own modules, or record that Next's page
contract is advisory here and make the exclusion deliberate and commented rather
than incidental. Either is fine. Leaving a gate that reports on a check it
discards is not.

## Notes

`github: none` — filed at the end of the session that found it, alongside the
stoppages change. The issue is not open yet and should be, since the item is
about a quality gate rather than a single defect. Whoever opens it: this is not
urgent in the sense of breaking anything today, and is exactly the kind of thing
that stays invisible for another three weeks if it is only in a checkout.

Found while running the `build` gate for
`the-stoppage-summary-reads-around-a-refusal`, with a `next start` server
running that a normal build would have disturbed. The workaround that avoided
the server is what exposed the exclusion.
