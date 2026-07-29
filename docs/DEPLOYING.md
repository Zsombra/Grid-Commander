# Running Grid-Commander

There are two ways to run this, and they need different things from you.

**Personal** — your own BattleGrid account, your own key, on your own machine.
No client registration, no callback URL, no login. This is what Grid-Commander
is for, and it is the shorter document.

**Delegated** — other people connect *their* BattleGrid accounts to a deployment
you host. Needs an OAuth client registered out of band, and needs to be
reachable over HTTPS. [Skip to it](#delegated-other-peoples-accounts).

If you are not sure which you want, you want personal.

---

# Personal: your own account

## What you need

1. **A BattleGrid API key** — a `bg_live_…` value from your own account.
2. **PostgreSQL 16.** Any instance. Grid-Commander does not provision one and
   does not create the database — only the schema inside it.
3. **Two random secrets**, below.

That is the whole list. `BATTLEGRID_CLIENT_ID` and `BATTLEGRID_REDIRECT_URI` are
**not read at all** on this path — not blank-tolerated, not defaulted, not
consulted. Registering a client so you can talk to your own account is exactly
the ceremony this path removes.

## Read this before you set the key

**A personal deployment authenticates nobody.** There is no login. Whoever can
reach the page acts as you — reading your account, changing your agents, and
with a key that carries wager authority, moving your money.

On `localhost`, bound to your own machine, that is correct and there is nothing
to add. Anywhere else it is a door with no lock, and nothing about the screen
would tell you which one you are looking at. So every page says so, in the
consequence tone, above the navigation, for as long as the key is set.

Do not put a personal deployment on a public host. If you need one reachable by
other people, that is the delegated path, and it exists precisely because this
one does not scale past one person.

## Set it up

```bash
# 1. Two different random secrets.
openssl rand -base64 32   # TOKEN_ENCRYPTION_KEY
openssl rand -base64 32   # SESSION_SECRET

# 2. A database, and the schema inside it.
createdb grid_commander
DATABASE_URL=postgres://localhost:5432/grid_commander node tools/migrate.mjs

# 3. Build.
npm ci
npm run build
```

## Run it

```bash
DATABASE_URL=postgres://localhost:5432/grid_commander \
TOKEN_ENCRYPTION_KEY=<the first secret> \
SESSION_SECRET=<the second secret> \
BATTLEGRID_API_KEY=bg_live_… \
ALLOW_INSECURE_COOKIES=true \
npm start
```

Then open `http://localhost:3000`. It redirects straight to `/agents` — there is
no connect step, because there is nothing to connect.

`ALLOW_INSECURE_COOKIES=true` is what lets a session cookie travel over plain
HTTP. It is correct on `localhost` and wrong everywhere else; any value other
than exactly `true` leaves cookies secure, so a typo fails safe.

> `npm start` prints a warning that `next start` does not work with
> `output: 'standalone'` and suggests `node .next/standalone/server.js`. It
> serves correctly either way. The standalone entry point is what the container
> uses; `npm start` is fine for a local run.

## What the key is allowed to do

`BATTLEGRID_KEY_SCOPES` defaults to `mcp:read` and accepts `mcp:read`,
`mcp:wager`, or both, space- or comma-separated. An unrecognised value stops
startup rather than being dropped.

**It is a declaration, not a restriction.** Grid-Commander cannot read what a
`bg_live_` key actually carries. If your key can wager, declaring `mcp:read`
does not stop the key — it stops *this product* from asking. That is real
restraint and it is worth having, but it is Grid-Commander's, not BattleGrid's,
and every page says so rather than implying a boundary that is not there.

What actually protects you is unchanged either way: every tool is classified
from BattleGrid's live description, anything destructive needs a confirmation
naming what it will destroy, and anything unrecognised is treated as
destructive.

> `mcp:read` is itself write-capable. 27 of BattleGrid's 110 tools mutate, and
> eleven need nothing beyond `mcp:read` — six of those destructively. Scope was
> never the safety boundary here. See `docs/BATTLEGRID_MCP_REFERENCE.md`.

## When the key stops working

Every page shows:

> Your BattleGrid connection is no longer valid. Check the BATTLEGRID_API_KEY
> this deployment was configured with, then restart it.

The restart is not optional advice — the key is read once at startup, so
replacing it in the environment without restarting changes nothing.

---

# Delegated: other people's accounts

Only for a deployment other people connect their own BattleGrid accounts to.
Everything above still applies except the key: leave `BATTLEGRID_API_KEY`
**unset**, and set the two OAuth variables instead.

## 1. Register the redirect URI at BattleGrid

**Do this first.** Until it is done, a deployment can serve every page and
complete no connection at all — the OAuth callback is rejected and there is
nothing in the product that can tell you why.

`BATTLEGRID_REDIRECT_URI` must match a `redirect_uri` on the registration
**exactly**. No wildcards, no trailing-slash tolerance, no subdomain matching. A
new hostname needs a new registered URI.

```
https://<your-host>/api/auth/battlegrid/callback
```

Register with scope **`mcp:read` only**. Grid-Commander never requests
`mcp:wager`, and a registration without it makes wager authority
*unrequestable* rather than merely unrequested. That is the difference between a
policy and a boundary — and it is the one advantage this path has over a
personal key, which cannot be interrogated at all.

## 2. Everything else

Same database, same two secrets, same migrate step. Never set
`ALLOW_INSECURE_COOKIES`: this path puts a session cookie in a browser you do
not control.

---

# Configuration

Everything comes in at run time. The image contains no credential and no
deployment-specific value.

| Variable | Personal | Delegated | Notes |
|---|---|---|---|
| `DATABASE_URL` | yes | yes | `postgres://user:pass@host:5432/db` |
| `TOKEN_ENCRYPTION_KEY` | yes | yes | 32 random bytes, base64 |
| `SESSION_SECRET` | yes | yes | 32 random bytes, base64, different from the above |
| `BATTLEGRID_API_KEY` | yes | **unset** | Your own `bg_live_` key. Setting it selects this path. |
| `BATTLEGRID_KEY_SCOPES` | no | — | Defaults to `mcp:read`. A declaration, not a limit. |
| `BATTLEGRID_CLIENT_ID` | not read | yes | From the registration |
| `BATTLEGRID_REDIRECT_URI` | not read | yes | Must match the registration exactly |
| `ANTHROPIC_API_KEY` | no | no | Absent means the assistant says it is not configured |
| `ALLOW_INSECURE_COOKIES` | localhost only | **never** | Any value but `true` leaves cookies secure |

The two secrets are deliberately different values. `SESSION_SECRET` proves who
someone is; `TOKEN_ENCRYPTION_KEY` protects a BattleGrid token at rest. They
have different blast radii when either leaks, and reusing one value collapses
that distinction.

**Rotating `TOKEN_ENCRYPTION_KEY` invalidates every stored token.** On the
delegated path every user reconnects. It is recoverable, and it is not quiet.

A missing required variable stops the application at startup rather than at the
first request that needs it. `.env.example` is the authoritative list —
`scripts/check-serving.sh` boots the application from that file alone, so a
variable the product needs and the example omits fails a check rather than a
deployment.

## On `ANTHROPIC_API_KEY`

Setting it changes what users are told. With a key, `/assistant` states that
answering sends what it reads from the account to Anthropic, outside this
product. Without one, it states the opposite — that nothing typed there leaves.
Both are true of their deployment, and the page reads the difference from what
is actually configured.

Nothing bounds how many questions are asked. One answer is capped at six rounds
and 8k tokens; a thousand questions are not, and on a delegated deployment every
tenant's questions bill your key. See `assistant-has-no-spend-ceiling`.

---

# In a container

```bash
docker build -t grid-commander .
docker run --rm -e DATABASE_URL=... grid-commander migrate   # release step
docker run -p 3000:3000 --env-file .env grid-commander       # serve
```

For a personal deployment on your own machine this buys you very little over
`npm start`, and it has not been built — see the last section. It is here
because a delegated deployment needs to run somewhere.

## Migrations

**The release step is not optional, and the product enforces that.**

Run it once per deploy, before the new version starts — a release command, an
init container, or a manual step, but *before*. It is safe to run against an
up-to-date database and safe to run twice. Outside a container it is
`node tools/migrate.mjs`.

Serving runs a schema check first. A database missing any migration this build
carries makes the container **exit non-zero and serve nothing**, naming what is
missing:

```
This database has never been migrated.

  missing: 0000_sleepy_paibok

Refusing to serve. Apply them first:
```

That is deliberate. A deployment whose migration was skipped is otherwise
indistinguishable from one whose migration ran, until someone touches the
feature that needed it — by which point it reads as a defect in the product
rather than a missing step in the deploy. A failed start is something your
platform reports; a broken request an hour later is not.

A database carrying migrations *newer* than the running build serves anyway,
with a warning. Refusing there would turn a rollback into an outage.

### Platform release steps

| Platform | Where the migrate step goes |
|---|---|
| Fly.io | `[deploy] release_command = "node tools/migrate.mjs"` |
| Render | Pre-deploy command |
| Railway | Custom start command, or a one-off service |
| ECS / Kubernetes | A job or init container that must succeed first |

---

# After it starts

**Personal.** Request `/` — it goes straight to `/agents`, and your roster is
there. If instead you see *"Your roster could not be loaded"* with a message
about `BATTLEGRID_API_KEY`, the key was refused: BattleGrid was reached and said
no. If it says Grid-Commander could not *reach* BattleGrid, that is a network
problem and the key may be fine.

**Delegated.** Request `/` — it redirects to `/connect` without a session.
Connect an account; if the callback fails, the redirect URI registration is
wrong.

**Both.** Check `/audit`. Everything Grid-Commander did on the account is there,
and reads the assistant made on someone's behalf are marked as the assistant's.

---

# What is not here

- **A health endpoint.** On the delegated path, point a check at `/connect`: it
  serves without resolving a session, so it answers whether the process is up
  rather than whether a database round-trip succeeded. A personal deployment has
  no such page — `/connect` there says there is nothing to connect, which still
  answers the same question. See `no-health-endpoint`.
- **Zero-downtime deploys.** The schema gate deliberately refuses to serve an
  old version against a schema it does not recognise. For a product holding
  credentials that configure trading agents, that trade is the right way round.
- **Rolling a migration back.** The journal is forward-only. The gate makes a
  bad deploy loud, which is what makes a manual recovery possible.
- **A built and pushed image.** The Dockerfile has never been built — no Docker
  daemon in the environment where it was written. Its instructions are covered
  by `tests/architecture/deployable.test.ts`, and the runtime layout it produces
  was assembled by hand and proven to migrate, refuse, and serve. The layer
  mechanics are unproven. See `image-never-built`. **A local `npm start` does
  not depend on any of this.**
- **A verified round trip to BattleGrid.** Every path here has been exercised
  against a fake and against a deliberately invalid key, which proves the
  failure branches. No valid `bg_live_` key has existed in any environment this
  was built in, so the success branch has never been seen against the real
  platform. Yours will be the first. See `assistant-unverified-against-live-api`
  for the same gap on the Anthropic side.
