# Tasks

- **R1** — A Remedy Named Must Exist In That Deployment *(modified)*

## 1. The deployment's remedy reaches the surface

- [x] 1.1 **(R1)** The remedy is computed once in `infrastructure()` and carried
      on `App`. The expression at `composition.ts:189` moves rather than being
      copied — two copies of "which deployment is this" is the defect the
      original comment was written to prevent.
- [x] 1.2 **(R1)** It is not added to `ConnectionRevokedError` and not added to
      the URL. Both would put a deployment-scoped fact somewhere per-failure.

## 2. The surface offers what it names

- [x] 2.1 **(R1)** `AuthorityLost` renders a `BUTTON_SECONDARY` anchor to
      `/connect` when the remedy is `reconnect`.
- [x] 2.2 **(R1)** It renders no control when the remedy is `repair-the-key`.
- [x] 2.3 The sentence the failure carried is unchanged in both cases, and the
      link is added beside it rather than replacing it.
- [x] 2.4 The control that performs the failed operation is still not offered.
- [x] 2.5 The four pages rendering `AuthorityLost` pass the deployment's remedy.

## 3. Verification

- [x] 3.1 **(R1)** On a delegated deployment the surface links to `/connect` —
      asserted on `links`, never on `text`, because a label without an href
      reads identically.
- [x] 3.2 **(R1)** On a personal deployment it does not, and `/connect` appears
      in no href on the page.
- [x] 3.3 The carried sentence renders verbatim under both remedies.
- [x] 3.4 **Mutation check.** Link unconditionally and confirm 3.2 fails; drop
      the link entirely and confirm 3.1 fails.
- [x] 3.5 The existing `authority-lost` rendering tests still pass.

## 4. Quality gates

- [x] 4.1 `typecheck`, `lint`, `test`, `build`.
