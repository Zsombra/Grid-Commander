# Proposal: A Doc For The Path We Ship

## Why

`docs/DEPLOYING.md` documented one deployment, and it was not the one this
product is for.

It opened with **"Register the redirect URI at BattleGrid — do this first"**,
listed `BATTLEGRID_CLIENT_ID` and `BATTLEGRID_REDIRECT_URI` as **required**, and
mentioned `BATTLEGRID_API_KEY` zero times. Two changes ago the product gained a
personal path whose entire purpose is that you do not register a client to talk
to your own account — and the only document telling anyone how to run it still
sent them to go register one.

A reader following it would have done the exact ceremony the code was changed to
remove, concluded the personal path did not exist, and been right to, because
nothing said otherwise.

This is the last thing between the code and someone being able to follow a
document to a running application.

## What Changes

- **Personal leads.** The document opens by naming the two deployments and
  saying which one you probably want. Personal is first and shorter; delegated
  is a section further down for the case where other people connect their own
  accounts.

- **The local run is documented at all.** It was not. `npm ci && npm run build
  && npm start` with four variables is the whole personal setup, needs no
  container, and is what actually gets someone to a working page today — the
  image has never been built. The `npm start` / `output: standalone` warning is
  documented rather than left to alarm someone.

- **The variable table gains a column per path.** `BATTLEGRID_CLIENT_ID` and
  `BATTLEGRID_REDIRECT_URI` are marked *not read* on personal rather than
  *required*, which is what the code does.

- **The disclosure is in the deploy doc, not only on the screen.** A personal
  deployment authenticates nobody. Saying that at the moment someone decides
  where to run it is more useful than saying it after they already have.

- **What is not here gains the honest gap.** No valid `bg_live_` key has existed
  in any environment this was built in, so every failure branch is proven and
  the success branch has never been seen against the real platform.

- **A guard**, so the document cannot quietly go back to describing one path.

## Verified by following it

The document was walked end to end rather than reviewed: a dropped and recreated
database, `node tools/migrate.mjs`, `npm ci && npm run build`, and the exact
environment block as written with the two OAuth variables unset. It boots, `/`
returns 307 to `/agents`, and the refused-key page names the key. The claims
about scope parsing and cookie behaviour were read out of `src/config.ts` rather
than recalled.

## Out of Scope

- **Building the image.** No Docker daemon here; `image-never-built` (P1) is
  unchanged, and the doc now says a local run does not depend on it.
- **`.env.example`.** Already covers both paths correctly, and
  `scripts/check-serving.sh` boots from it, so it is guarded in a way prose
  cannot be.
- **A health endpoint.** Still filed as `no-health-endpoint` (P3). The doc
  describes what to point a check at in the meantime.
