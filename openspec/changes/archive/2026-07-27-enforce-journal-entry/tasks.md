# Tasks

- [x] 1 Add `last_commit_timestamp(root, paths, exclude)` reusing the existing
      subprocess-with-fallback pattern from `git_changed_since`
- [x] 2 Add the `journal_stale` warning to validation, naming the offending commit
- [x] 3 Wire it into `validate` and `board` alongside the other whole-project checks
- [x] 4 Add the fixture for `journal_stale` — the coverage meta-test fails until
      it exists — plus the up-to-date and no-git cases
- [x] 5 Confirm it fires on this repository right now, and clears once the
      journal entry lands
- [x] 6 Close `enforce-journal-entry`
