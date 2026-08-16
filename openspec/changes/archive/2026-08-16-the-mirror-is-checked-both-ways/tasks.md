# Tasks

- [x] 1.1 **DONE** — `mirror_check(root)` beside `validate_backlog`, with the
      reason it is not part of `validate` written in the docstring.
- [x] 1.2 **DONE** — three directions; A and B fail, C reports and fails only
      under `--strict`.
- [x] 1.3 **DONE** — `gh` absent exits **2** with a named reason, so a missing
      credential can never read as a clean mirror.
- [x] 1.4 **DONE** — `--json` emits the full result; text mode prints one line
      per divergence and `clean` when there is none.
- [x] 1.5 **DONE** — documented in `.claude/references/tracking.md` §7.
- [x] 2.1 **DONE** — run on this tree: **271 items, 147 issues, all three
      directions zero.** Taken *after* closing four issues (#107, #146, #147,
      #299) and filing two (#336, #337), so it exercises the drift it exists to
      catch rather than re-measuring a quiet tree.
- [x] 2.2 **DONE** — `validate --all` unchanged (0 errors) and `board` unchanged,
      so the offline path took no dependency.
