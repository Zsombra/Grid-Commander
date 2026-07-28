#!/usr/bin/env bash
#
# Every gate this repository has, runnable anywhere.
#
# The point is that verification does not depend on GitHub. This repository
# spent a day unable to create workflow runs at all — not failing runs, no runs
# — and with the gates written only inside a workflow file there was no way to
# check anything without it.
#
# CI's `matrix` job calls this script, so it stays exercised. A fallback that
# nothing runs is not a fallback.
#
#   ./scripts/check.sh            # the two gates, on python3
#   ./scripts/check.sh --matrix   # the same, on every python3.x found
#
# No dependencies, deliberately. The suite asserts the tool imports only the
# standard library, and installing nothing is what makes that assertion mean
# something.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MATRIX=0
[[ "${1:-}" == "--matrix" ]] && MATRIX=1

if [[ $MATRIX -eq 1 ]]; then
  PYTHONS=()
  for p in python3.9 python3.10 python3.11 python3.12 python3.13 python3.14; do
    command -v "$p" >/dev/null 2>&1 && PYTHONS+=("$p")
  done
  [[ ${#PYTHONS[@]} -eq 0 ]] && PYTHONS=(python3)
else
  PYTHONS=(python3)
fi

failed=0

run_gate() {
  local py="$1" name="$2"
  shift 2
  local output status
  output="$(env -u PYTHONPATH "$py" "$@" 2>&1)"
  status=$?
  if [[ $status -eq 0 ]]; then
    printf '  %-12s %-10s ok\n' "$py" "$name"
  else
    printf '  %-12s %-10s FAILED (exit %d)\n' "$py" "$name" "$status"
    printf '%s\n' "$output" | sed 's/^/      /'
    failed=1
  fi
}

echo "checks in $ROOT ($(git rev-parse --short HEAD 2>/dev/null || echo 'not a git repo'))"
echo

for py in "${PYTHONS[@]}"; do
  run_gate "$py" tests    -m unittest discover -s tests
  run_gate "$py" validate .claude/tools/openspec.py validate --all
done

echo
if [[ $failed -eq 0 ]]; then
  echo "all checks passed"
else
  echo "checks FAILED"
fi
exit $failed
