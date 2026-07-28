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
ROUTES=(/agents /strategies /audit /assistant)

[[ -f "$EXAMPLE" ]] || { echo "no $EXAMPLE"; exit 1; }

# Every uncommented KEY=... line. Commented lines are optional by definition —
# ALLOW_INSECURE_COOKIES is documented that way on purpose.
mapfile -t KEYS < <(grep -oE '^[A-Z][A-Z0-9_]*=' "$EXAMPLE" | tr -d '=')
[[ ${#KEYS[@]} -gt 0 ]] || { echo "no variables found in $EXAMPLE"; exit 1; }

echo "checking $EXAMPLE covers a real boot — ${#KEYS[@]} variables"

for key in "${KEYS[@]}"; do
  current="$(grep -E "^${key}=" "$EXAMPLE" | head -1 | cut -d= -f2-)"
  if [[ -n "$current" ]]; then
    export "$key=$current"                       # the example ships a value
  elif [[ -n "${!key:-}" ]]; then
    :                                            # caller supplied one (CI: DATABASE_URL)
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

PORT="$PORT" npm start >"$LOG" 2>&1 &
server=$!
cleanup() { kill "$server" 2>/dev/null; wait "$server" 2>/dev/null; rm -f "$LOG"; }
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

echo "serving ok — every session-resolving route answered"
