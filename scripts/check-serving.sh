#!/usr/bin/env bash
#
# Start the built application with *only* what .env.example provides, and
# request a page.
#
# This exists because the same defect has shipped twice. A malformed encryption
# key during `prove-it-runs`, and a `SESSION_SECRET` missing from `.env.example`
# during `close-the-reachability-gap` — the second returned 500 on every route
# but `/connect` while typecheck, lint, 394 unit tests, 51 database tests and
# `next build` were all green. Nothing else exercises `loadConfig()` the way a
# deployment does, so nothing noticed either time.
#
# The load-bearing detail: **the variable list comes from `.env.example`, never
# from this script.** A variable the application requires and the example omits
# is therefore never set, the boot fails, and this check fails with it. Hardcode
# the list here and the check passes while the documentation is wrong, which is
# the exact failure it exists to prevent.
#
# Requires: a built app (`npm run build`) and a reachable PostgreSQL.
#
#   ./scripts/check-serving.sh
#
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PORT="${SERVING_CHECK_PORT:-3210}"
EXAMPLE=".env.example"
LOG="$(mktemp)"

# Routes that resolve a session. /connect deliberately does not, which is why it
# kept working through both incidents and is useless as a canary.
#
# `/` is here because it reads the session to decide where to send you — and
# because it is the only address a user is ever given. It returned 404 for the
# product's whole life with every gate green, which is how it earned a place in
# the one check that asks what a deployment actually serves.
ROUTES=(/ /agents /strategies /audit)

[[ -f "$EXAMPLE" ]] || { echo "no $EXAMPLE"; exit 1; }

# Every uncommented KEY=... line. Commented lines are optional by definition —
# ALLOW_INSECURE_COOKIES is documented that way on purpose.
mapfile -t KEYS < <(grep -oE '^[A-Z][A-Z0-9_]*=' "$EXAMPLE" | tr -d '=')
[[ ${#KEYS[@]} -gt 0 ]] || { echo "no variables found in $EXAMPLE"; exit 1; }

echo "checking $EXAMPLE covers a real boot — ${#KEYS[@]} variables"

# Precedence: the caller's value, then the example's, then a random one.
#
# The caller must win, and this used to have it the other way round. The
# example's `DATABASE_URL` is a *placeholder* — `postgres://localhost:5432/grid_commander`,
# documenting the shape — so a caller supplying a real one (CI's service
# container, or a developer's local database) had it silently overridden by the
# placeholder. Nothing noticed for as long as this check existed, because no
# route it probed ever queried the database; the wrong URL was never used.
#
# The schema check below is what surfaced it, on its first run.
#
# This does not weaken what the script is for. The loop still only iterates the
# variables the *example* declares, so one the application requires and the
# example omits is still never set here and the boot still fails.
for key in "${KEYS[@]}"; do
  current="$(grep -E "^${key}=" "$EXAMPLE" | head -1 | cut -d= -f2-)"
  if [[ -n "${!key:-}" ]]; then
    :                                            # caller supplied one — it wins
  elif [[ -n "$current" ]]; then
    export "$key=$current"                       # the example ships a value
  else
    export "$key=$(openssl rand -base64 32)"     # blank in the example: any value will do
  fi
done

# Local development over plain HTTP. Commented out in the example, so the loop
# above will not have set it; without it the session cookie is Secure and never
# comes back over the http:// this check uses.
export ALLOW_INSECURE_COOKIES=true

# Refuse to run against a port someone else owns. Found the hard way: an earlier
# run left a server behind, this check bound nothing, curl reached the *stale*
# correctly-configured process, and it reported success against an application
# that could not boot. A guard that can pass by talking to the wrong server is
# worse than no guard.
if curl -sf -o /dev/null --max-time 2 --noproxy '*' "http://127.0.0.1:$PORT/connect" 2>/dev/null; then
  echo "something is already serving on port $PORT — refusing to run"
  echo "this check must own the process it measures. Stop it, or set SERVING_CHECK_PORT."
  exit 1
fi

# Started in its own process group so the whole tree can be killed as one.
#
# `npm start` spawns `next start`, which spawns `next-server`, and by the time
# this script finishes the server has been reparented to init — so killing npm
# reaps nothing and `pkill -P` finds no children to reap. The orphan keeps the
# port, and the *next* run of this check refuses to start against it. The gate
# could be run exactly once per machine: invisible in CI, where every job is a
# fresh container, and immediate for anyone running it twice.
if command -v setsid >/dev/null 2>&1; then
  PORT="$PORT" setsid npm start >"$LOG" 2>&1 &
  server=$!
  stop() { kill -- -"$server" 2>/dev/null; }
else
  PORT="$PORT" npm start >"$LOG" 2>&1 &
  server=$!
  stop() { pkill -P "$server" 2>/dev/null; kill "$server" 2>/dev/null; }
fi

cleanup() {
  stop
  wait "$server" 2>/dev/null
  rm -f "$LOG"
}
trap cleanup EXIT

up=0
for _ in $(seq 1 60); do
  # If the server died, stop waiting — otherwise a boot failure looks like slow
  # startup and this loop burns a minute before reporting the wrong thing.
  kill -0 "$server" 2>/dev/null || break
  curl -sf -o /dev/null --noproxy '*' "http://127.0.0.1:$PORT/connect" && { up=1; break; }
  sleep 1
done

if [[ $up -ne 1 ]]; then
  echo "the server never answered on port $PORT. Output:"
  echo
  grep -iE 'error|not set|EADDRINUSE' "$LOG" | sort -u | head -10 | sed 's/^/  /'
  exit 1
fi

# Every route above answers without touching the database.
#
# Found by running this against a stopped PostgreSQL: all five returned 200 and
# this check said "serving ok". They resolve a session first, find none, and
# render "Not connected" — which needs no query. So the probe below proves the
# application *boots* and says nothing about whether it can reach its database,
# and the first person to discover otherwise would be a user who connected an
# account.
#
# `check-schema.mjs` is the shortest honest fix: it connects, reads the
# migrations the database has applied, and compares them to what this build
# carries. Reachable *and* migrated, using the tool a deployment already runs.
#
# What this still does not prove: that a route can query. No route does without
# a session, and manufacturing one here would mean signing a cookie to reach a
# page — worth doing, and a different check. See `no-route-exercises-the-database`.
if ! node tools/check-schema.mjs; then
  echo
  echo "The application boots, and its database is not usable. The pages this"
  echo "check probes would still answer 200 — they render 'Not connected'"
  echo "without querying, which is why this runs before them rather than after."
  exit 1
fi

failed=0
for route in "${ROUTES[@]}"; do
  code="$(curl -s -o /dev/null -w '%{http_code}' --noproxy '*' "http://127.0.0.1:$PORT$route")"
  if [[ "$code" =~ ^5 ]] || [[ "$code" == "000" ]]; then
    printf '  %-14s %s  FAIL\n' "$route" "$code"
    failed=1
  else
    printf '  %-14s %s\n' "$route" "$code"
  fi
done

if [[ $failed -ne 0 ]]; then
  echo
  echo "A route that resolves a session returned 5xx. The application cannot boot"
  echo "from what $EXAMPLE documents. Server output:"
  echo
  grep -iE 'error|not set' "$LOG" | sort -u | head -10 | sed 's/^/  /'
  exit 1
fi

# The routes above answered without touching the database — an anonymous
# request resolves no session and renders "Not connected" queryless. This one
# request carries a signed session cookie, so the route looks the user up
# through the application's own pool, and the helper asserts the database saw
# that transaction. Two different failures become loud here: a query path
# that is broken (route 500s), and a cookie signature that drifted from
# `cookie-session.ts` (no transaction — see the helper's header).
if ! PORT="$PORT" node tools/check-route-queries.mjs; then
  echo
  echo "The application boots and its schema is current, but a request that"
  echo "resolves a session could not query the database through the pool."
  exit 1
fi

# The health route, after the transaction accounting above — it drives the
# application's pool (`select 1`), and probing it first hands the helper a
# counter it did not expect to move. 200 here proves the whole promise:
# process up AND database answering, with nothing but the status word back.
health_code="$(curl -s -o /dev/null -w '%{http_code}' --noproxy '*' "http://127.0.0.1:$PORT/api/health")"
if [[ "$health_code" != "200" ]]; then
  echo "the health check answered $health_code with the database up — /api/health is broken."
  exit 1
fi
printf '  %-14s %s\n' "/api/health" "$health_code"

echo "serving ok — every session-resolving route answered, one queried, and the health check checks"
