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
  skip "test:db" "no DATABASE_URL; start PostgreSQL and pass one to run the 62 database tests"
fi

# The surface record's age, which nothing else here can see.
#
# `tests/live/surface-freshness.test.ts` is one of nineteen live files that
# `describe.skip` without a credential, so inside the `vitest` gate above it
# vanishes silently — and a silent skip on the check that guards the input to
# every conformance test is precisely the "green stops meaning anything" case
# this script's header warns about. Named here so the summary says which it
# was: verified, or not checked.
#
# It measures and does not repair. Re-probing from inside the gate would make a
# stale record impossible to fail on, which is the one thing it exists to do.
if [[ -n "${BATTLEGRID_API_KEY:-}" ]]; then
  gate "freshness" npx vitest run --silent tests/live/surface-freshness.test.ts
else
  skip "freshness" "no BATTLEGRID_API_KEY; the surface record's age is unverified"
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
