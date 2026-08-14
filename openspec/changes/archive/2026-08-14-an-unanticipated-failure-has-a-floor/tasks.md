# Tasks

## 1. The floor

- [x] 1.1 `app/error.tsx` — client component; copy per the requirement: the
      product did not anticipate this, nothing here can say whether the last
      action landed, the activity log can — link `/audit`. Danger-toned
      treatment from the existing token classes; no `reset()` control
      rendered; `error.digest` shown when present, `error.message` never.
- [x] 1.2 `app/global-error.tsx` — same posture, own `<html>`/`<body>`,
      styles inlined (the failed root layout cannot be assumed to have
      delivered any).

## 2. Verification

- [x] 2.1 [rendering] The boundary renders the honest copy: names the
      unanticipated failure, states the unknown-outcome sentence, links
      `/audit`.
- [x] 2.2 [rendering] No control invokes `reset` — walk the rendered tree for
      any element whose handler is the `reset` prop, not for a spelling of
      the word (the synonym-mutation lens: a "Reload" button calling `reset`
      must fail this).
- [x] 2.3 [rendering] With `{ digest: 'abc123' }` the digest renders; the
      message string does not appear in the output. With no digest, no
      empty-reference clutter.
- [x] 2.4 [rendering] `global-error.tsx` renders its own `html`/`body` and
      the same posture.
- [x] 2.5 [architecture] The two files exist at exactly `app/error.tsx` and
      `app/global-error.tsx` and carry `'use client'` — existence is the one
      thing a rendering test cannot see (it imports what it is pointed at,
      wherever that lives; the failure mode is the file at the wrong level,
      covering less than every route).
- [x] 2.6 Quality gates: typecheck, lint, test, build; db gates untouched by
      this change but run with the rest.

> **Executed 2026-08-14**: all six gates green — typecheck, lint, 2371 vitest
> across 185 files (7 new), build (both boundaries in the route tree),
> db gates untouched. Verifier note: the two scenarios only the framework can
> exercise — Next invoking the boundary on a real segment throw, and
> `redirect()` passing through before boundaries are consulted — are covered
> by the build plus Next's documented contract, not by an offline test; the
> component's own behaviour (copy, no-reset idiom, digest-not-message,
> own-document root floor) is directly tested.
