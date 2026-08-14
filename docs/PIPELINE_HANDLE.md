# The Pipeline Handle

One page to grab. What every session **must** do, in order, with the doctrine
it comes from. Full tour: `docs/PIPELINE.md`. Binding formats:
`.claude/references/spec-format.md`, `change-lifecycle.md`, `tracking.md`.

## Every session, no exceptions

1. **Open with `/board`** — then read the last 2–3 `openspec/JOURNAL.md`
   entries *in full*; the **Watch out** field is the highest-value text in the
   repo. If the journal's Next disagrees with the board, say so — that gap is
   where things get dropped.
2. **Close with `/handoff`** — a session that changed anything writes a
   journal entry (Did / State / Next / Watch out). Never from memory: run
   `board` first.
3. **Nothing is deferred silently.** Decided not to do something? File a
   backlog item before moving on — and **every item gets a GitHub issue**,
   linked by `github: <n>` in its frontmatter (`github: none` must say why in
   the body). One finding, two records, item canonical. `validate` enforces it.
4. **`validate --all` before you stop.** 0 errors always; new warnings either
   fixed or named in the journal with a reason.

## A change, birth to death

```
/propose → [planner: full only] → executor → /verify → [auditor: full only] → /archive
```

- **Track first** (`.openspec.yaml`): `lite` = typos/copy/isolated bugs;
  `standard` = most work; `full` = contracts, migrations, security, hard to
  reverse. Mixed signals → heavier track.
- **Deltas are the contract.** Read the current main spec before writing any
  MODIFIED/REMOVED. MODIFIED carries the *whole* requirement — archive
  replaces the block, so omitted scenarios are silently deleted. Scenarios are
  `####` (4 hashes) exactly. Every requirement has ≥ 1 scenario.
- **Never edit `openspec/specs/` by hand** — the archiver writes it on merge.
  Never archive on failing validation. Archive order is fixed: validate →
  write specs → move folder; then re-read the main spec to confirm the merge
  *landed* (writing is not landing).
- **Archive closes the loop**: linked item → `done`, issue closed, leftovers
  filed as new items. Nothing rides into `archive/` unfinished and unrecorded.

## Quality gates (openspec/config.yaml, executor + auditor)

`npm run typecheck` · `npm run lint` · `npm test` · `npm run build` ·
`npm run db:generate && git diff --quiet drizzle/` · `npm run test:db`
(needs `DATABASE_URL`; **CI's Actions are billing-blocked — "CI provides X"
is a claim about configuration, not runs**; the local gate is a disposable
Docker postgres).

## House lessons that gate work (learned, then enforced)

- **A guard is proven by its failure.** Mutate the idiom, not only the
  behavior — the scratch-arm typecheck run, the synonym spelling, the
  multi-line form tag. If you never saw the check red, you have a claim, not
  a check.
- **A falsified sentence has siblings.** Grep for the *claim*, not the
  wording, before amending any one record.
- **Reading a result once is not reading the union.** Exhaustive tails
  (`satisfies never`) plus pinned arm spellings.
- **`mcp:read` is write-capable; scope is never a safety boundary.** Probe the
  version, never the shape; the tool list restales after every deployment.
- **Live-account writes get a named operator question first** — always, and
  clean up after every probe (verify state before/after, byte-level).

## Lanes (who may touch what)

| Artifact | Owner |
|---|---|
| `openspec/specs/` | archiver only |
| `docs/checklists/` | checklist-generator only |
| Backlog + journal | tracker |
| Production code during planning | nobody |
| Design tickets changing behavior | forbidden — `requires-spec-change`, then /propose |
| Production gate verdicts | auditor only |

## UI round

executor → `/surface` → `/design` → executor → `/verify` → **`/surface`
again** — the round staled the manifests it designed against; re-pinning is
the round's last task (design-contract §8). Tokens only in tickets, never raw
values.
