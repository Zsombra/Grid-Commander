#!/bin/sh
#
# Two operations, and keeping them separate is the point.
#
#   migrate  — apply the committed journal. A platform's release step runs this
#              once, before the new version starts. Every replica migrating
#              itself on boot is N containers racing on one journal, with the
#              winner decided by scheduling.
#
#   serve    — check the schema, then serve. The check is not advisory: a
#              database missing a migration this build carries means the release
#              step did not run, and serving anyway turns a failed deploy into a
#              defect discovered later by a user.
#
set -e

case "${1:-serve}" in
  migrate)
    exec node tools/migrate.mjs
    ;;
  serve)
    # `set -e` would exit here anyway. Stated explicitly because this line is
    # the requirement: no schema, no serving.
    node tools/check-schema.mjs || exit 1
    exec node server.js
    ;;
  *)
    echo "unknown command: $1" >&2
    echo "usage: migrate | serve" >&2
    exit 2
    ;;
esac
