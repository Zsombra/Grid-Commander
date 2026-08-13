#!/usr/bin/env bash
#
# The whole CI, on this machine — every gate the workflow's seven jobs ran,
# in one command.
#
# This is not a stopgap: it is the verification story, by the operator's
# decision (2026-08-01, docs/CI_WITHOUT_BILLING.md option D). The GitHub
# account's Actions are billing-blocked and will stay that way; validate.yml
# keeps the job definitions one `workflow_dispatch` away if that ever
# changes, and this script keeps them honest meanwhile by running the same
# commands.
#
#   ./scripts/ci.sh                # everything that needs no database
#   DATABASE_URL=… ./scripts/ci.sh # everything, including the db suite
#   CI_SERVING=1 DATABASE_URL=… ./scripts/ci.sh   # plus the serving check
#
# A gate that cannot run on this machine is SKIPPED loudly, never silently —
# a skip that looks like a pass is how "green" stops meaning anything.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

declare -a NAMES=()
declare -a RESULTS=()
failed=0

gate() {
  local name="$1"
  shift
  local output status
  echo "── $name"
  output="$("$@" 2>&1)"
  status=$?
  if [[ $status -eq 0 ]]; then
    RESULTS+=("ok")
  else
    RESULTS+=("FAILED")
    failed=1
    printf '%s\n' "$output" | tail -30 | sed 's/^/    /'
  fi
  NAMES+=("$name")
}

skip() {
  NAMES+=("$1")
  RESULTS+=("skipped — $2")
  echo "── $1: SKIPPED ($2)"
}

# The same entry point the workflow's matrix + tests + validate jobs call.
gate "harness+validate" ./scripts/check.sh

gate "typecheck" npm run --silent typecheck
gate "lint" npm run --silent lint
gate "vitest" npx vitest run --silent
gate "drizzle-check" npx drizzle-kit check

if [[ -n "${DATABASE_URL:-}" ]]; then
  gate "migrate" npx drizzle-kit migrate
  gate "test:db" npm run --silent test:db
else
  skip "test:db" "no DATABASE_URL; start PostgreSQL and pass one to run the database suite"
fi

# The surface record's age, which nothing else here can see.
#
# Named here so the summary says which it was: verified, or not checked. A
# silent skip on the check that guards the input to every conformance test is
# precisely the "green stops meaning anything" case this script's header warns
# about.
#
# `--config vitest.live.config.ts` is load-bearing, not tidiness: the default
# config now excludes `tests/live/**`, so naming the file without the live
# config selects nothing and the gate passes having run no tests.
#
# It measures and does not repair. Re-probing from inside the gate would make a
# stale record impossible to fail on, which is the one thing it exists to do.
if [[ -n "${BATTLEGRID_API_KEY:-}" ]]; then
  gate "freshness" npx vitest run --silent --config vitest.live.config.ts \
    tests/live/surface-freshness.test.ts
else
  skip "freshness" "no BATTLEGRID_API_KEY; the surface record's age is unverified"
fi

# The rest of the live probes.
#
# They used to ride inside the `vitest` gate, because `vitest.config.ts`
# included them: without a credential, thirty checks that never ran reported as
# a pass; with one, all thirty ran *in parallel* against a real trading account
# — the sweep `vitest.live.config.ts` pins `fileParallelism: false` to prevent,
# after a concurrent run on 2026-08-07 produced nine phantom failures that a
# serial re-run collapsed to two.
#
# Opt-in rather than automatic for the reason `serving` is: it takes about nine
# minutes against a rate-limited platform, and a gate that makes the fast path
# expensive is a gate people route around. Named either way, so "did not run"
# is stated rather than assumed.
if [[ "${CI_LIVE:-}" == "1" ]]; then
  if [[ -n "${BATTLEGRID_API_KEY:-}" ]]; then
    gate "live" npm run --silent test:live
  else
    skip "live" "CI_LIVE=1 but no BATTLEGRID_API_KEY; the probes cannot run"
  fi
else
  skip "live" "opt in with CI_LIVE=1 and a key — ~9 min, serial, against the real account"
fi

# The OAuth discovery document, re-fetched.
#
# `tests/architecture/oauth-conformance.test.ts` runs entirely offline against
# `docs/battlegrid-oauth-metadata.json`, which makes that recording the thing
# every other OAuth check trusts. A recording nothing re-fetches can quietly
# stop describing the platform, and then the guard built on it passes while a
# user is sent to an endpoint that has moved.
#
# This one needs **no credential**, which is the reason to run it by default
# rather than an excuse to leave it optional. Reachability is probed first so
# that a network that did not answer is reported as *unchecked* — the same
# distinction between unreadable and empty the product makes everywhere else.
# A gate that goes red because a call did not complete teaches its readers to
# disregard red.
#
# WHAT THIS GATE DOES NOT COVER, AND WHY NOTHING HERE CAN.
#
# It verifies the authorization server's published *description*. It does not
# exercise a grant, and **no gate in this list does**: obtaining an
# authorization code requires a person at a consent screen, so a token exchange
# cannot be automated. That is a real limit, not a missing test.
#
# It is written here because the limit was invisible: "oauth-live ok" in a green
# column reads as "the OAuth path is exercised live", and on 2026-08-13 that
# reading was wrong in the most expensive way. The delegated path had never
# completed a single connection — the adapter required an OIDC `sub` BattleGrid
# has never sent — and twelve green gates could not have caught it, because the
# only place `sub` appears is in a token response nothing in this suite ever
# receives. See #203.
#
# The exchange is proven by an operator walking it, and the walk is recorded in
# openspec/JOURNAL.md rather than here.
DISCOVERY_URL="https://mcp.battlegrid.trade/.well-known/oauth-authorization-server"
if curl -sSf --max-time 10 -o /dev/null "$DISCOVERY_URL" 2>/dev/null; then
  gate "oauth-live" env BATTLEGRID_OAUTH_LIVE=1 npx vitest run --silent \
    --config vitest.live.config.ts tests/live/oauth-metadata.test.ts
else
  skip "oauth-live" "the discovery endpoint did not answer; the recorded document is unverified"
fi

gate "build" npm run --silent build

if [[ "${CI_SERVING:-}" == "1" ]]; then
  if [[ -n "${DATABASE_URL:-}" ]]; then
    gate "serving" ./scripts/check-serving.sh
  else
    skip "serving" "needs DATABASE_URL"
  fi
else
  skip "serving" "opt in with CI_SERVING=1 — boots the built app and probes it"
fi

echo
echo "── local CI ($(git rev-parse --short HEAD 2>/dev/null || echo 'no git'))"
for i in "${!NAMES[@]}"; do
  printf '  %-16s %s\n' "${NAMES[$i]}" "${RESULTS[$i]}"
done

if [[ $failed -ne 0 ]]; then
  echo
  echo "local CI FAILED"
  exit 1
fi
echo
echo "local CI green"
