# Tasks

## 1. The sweep

- [x] 1.1 Replace every `rounded border` with
      `rounded-gc-2 border border-border-default` across app/ and src/
      (.tsx), verified beforehand: no border-color companions, no
      comment-text matches, no `border-*` variants clipped.

## 2. Verification

- [x] 2.1 grep gate: bare `rounded border` appears nowhere under app/ or src/.
- [x] 2.2 Full local CI (`./scripts/ci.sh` with DATABASE_URL + CI_SERVING) green.
