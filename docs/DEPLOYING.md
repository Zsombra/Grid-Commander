# Deploying Grid-Commander

The image runs anywhere that takes a container. What it needs from you is a
PostgreSQL database, five environment variables, and one registration at
BattleGrid that cannot be done from here.

```bash
docker build -t grid-commander .
docker run --rm -e DATABASE_URL=... grid-commander migrate   # release step
docker run -p 3000:3000 --env-file .env grid-commander       # serve
```

---

## Before the first deploy

### 1. Register the redirect URI at BattleGrid

**Do this first.** Until it is done, a deployment can serve every page and
complete no connection at all — the OAuth callback is rejected and there is
nothing in the product that can tell you why.

`BATTLEGRID_REDIRECT_URI` must match a `redirect_uri` on the BattleGrid client
registration **exactly**. No wildcards, no trailing-slash tolerance, no
subdomain matching. A new hostname needs a new registered URI.

```
https://<your-host>/api/auth/battlegrid/callback
```

Register with scope **`mcp:read` only**. Grid-Commander never requests
`mcp:wager`, and a registration without it makes wager authority *unrequestable*
rather than merely unrequested. That is the difference between a policy and a
boundary.

> `mcp:read` is still write-capable. 27 of BattleGrid's 110 tools mutate and
> eleven of them need nothing beyond `mcp:read`, six destructively. Scope is not
> the safety boundary here — classification and the confirmation gate are. See
> `docs/BATTLEGRID_MCP_REFERENCE.md`.

### 2. Generate the two secrets

```bash
openssl rand -base64 32   # TOKEN_ENCRYPTION_KEY
openssl rand -base64 32   # SESSION_SECRET
```

Two different values, deliberately. `SESSION_SECRET` proves who a user is;
`TOKEN_ENCRYPTION_KEY` protects the BattleGrid token at rest. They have
different blast radii when either leaks, and reusing one value collapses that
distinction.

**Rotating `TOKEN_ENCRYPTION_KEY` invalidates every stored token.** Every user
reconnects. It is recoverable, and it is not quiet.

### 3. Provision PostgreSQL

Any PostgreSQL 16. The image does not provision one and does not create the
database — only the schema inside it.

---

## Configuration

Everything comes in at run time. The image contains no credential and no
deployment-specific value.

| Variable | Required | Notes |
|---|---|---|
| `BATTLEGRID_CLIENT_ID` | yes | From the registration in step 1 |
| `BATTLEGRID_REDIRECT_URI` | yes | Must match the registration exactly |
| `DATABASE_URL` | yes | `postgres://user:pass@host:5432/db` |
| `TOKEN_ENCRYPTION_KEY` | yes | 32 random bytes, base64 |
| `SESSION_SECRET` | yes | 32 random bytes, base64, different from the above |
| `ANTHROPIC_API_KEY` | no | Absent means the assistant says it is not configured |
| `ALLOW_INSECURE_COOKIES` | no | **Never set this in a deployment** |

A missing required variable stops the application at startup rather than at the
first request that needs it. `.env.example` is the authoritative list —
`scripts/check-serving.sh` boots the application from that file alone, so a
variable the product needs and the example omits fails a check rather than a
deployment.

### On `ANTHROPIC_API_KEY`

Setting it changes what users are told. With a key, `/assistant` states that
answering sends what it reads from their account to Anthropic, outside this
product. Without one, it states the opposite — that nothing they type there
leaves. Both are true of their deployment, and the page reads the difference
from what is actually configured.

Nothing bounds how many questions users ask. One answer is capped at six rounds
and 8k tokens; a thousand questions are not, and every tenant's questions bill
your key. See `assistant-has-no-spend-ceiling`.

---

## Migrations

**The release step is not optional, and the product enforces that.**

```bash
docker run --rm -e DATABASE_URL=... grid-commander migrate
```

Run it once per deploy, before the new version starts — a release command, an
init container, or a manual step, but *before*. It is safe to run against an
up-to-date database and safe to run twice.

Serving runs a schema check first. A database missing any migration this build
carries makes the container **exit non-zero and serve nothing**, naming what is
missing:

```
This database has never been migrated.

  missing: 0000_sleepy_paibok

Refusing to serve. Apply them first:
```

That is deliberate. A deployment whose migration was skipped is otherwise
indistinguishable from one whose migration ran, until a user touches the feature
that needed it — by which point it reads as a defect in the product rather than
a missing step in the deploy. A failed start is something your platform reports;
a broken request an hour later is not.

A database carrying migrations *newer* than the running build serves anyway, with
a warning. Refusing there would turn a rollback into an outage.

### Platform release steps

| Platform | Where the migrate step goes |
|---|---|
| Fly.io | `[deploy] release_command = "node tools/migrate.mjs"` |
| Render | Pre-deploy command |
| Railway | Custom start command, or a one-off service |
| ECS / Kubernetes | A job or init container that must succeed first |

---

## After deploying

1. Request `/` — it redirects to `/connect` without a session.
2. Connect an account. If the callback fails, step 1 above is wrong.
3. Check `/audit`. Everything Grid-Commander did on the account is there, and
   reads the assistant made on someone's behalf are marked as the assistant's.

---

## What is not here

- **A health endpoint.** Point a check at `/connect`: it serves without
  resolving a session, so it answers whether the process is up rather than
  whether a database round-trip succeeded.
- **Zero-downtime deploys.** The schema gate deliberately refuses to serve an
  old version against a schema it does not recognise. For a product holding
  credentials that configure other people's agents, that trade is the right way
  round.
- **Rolling a migration back.** The journal is forward-only. The gate makes a
  bad deploy loud, which is what makes a manual recovery possible.
- **A built and pushed image.** The Dockerfile has never been built — no Docker
  daemon in the environment where it was written. Its instructions are covered by
  `tests/architecture/deployable.test.ts`, and the runtime layout it produces was
  assembled by hand and proven to migrate, refuse, and serve. The layer mechanics
  are unproven. See `image-never-built`.
