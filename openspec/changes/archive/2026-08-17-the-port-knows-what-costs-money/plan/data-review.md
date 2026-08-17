# Data Pipeline Review: The Port Knows What Costs Money

**Status**: EXECUTION EVIDENCE FILLED

Checklist: `docs/checklists/DATA_PIPELINE_REVIEW_CHECKLIST.md`.

## Scope summary

One new fact travels the pipeline: whether an operation commits funds. It
originates as this product's own judgement in the adapter, is carried on
`ToolClass`, and is persisted on the audit row alongside the platform's contrary
claim. One value reaches a surface — the audit badge.

## Contract map

| Stage | Field | Shape | Evidence |
|---|---|---|---|
| Adapter | `declaredScope` | `Scope \| undefined` → now set | |
| Adapter | the product's consequence judgement | boolean | |
| Domain | `ToolClass` — platform claim vs product judgement | two fields | |
| Port | `AuditEntry` | both facts | |
| DB | audit column | migration | |
| Read | `drizzle-audit-repository` | both facts back out | |
| Surface | `audit-list.tsx` badge | renders **ours** | |

## Checklist matrix

| # | Rule | Evidence | ☐ |
|---|---|---|:--:|
| 1 | **Iron Rule** — the badge traces to a stored column, never re-derived client-side | `audit-list.tsx:64` reads `e.destructive` from the row; `drizzle-audit-repository.ts:149` maps the stored column out. No client-side derivation | ☑ |
| 2 | The judgement is computed server-side **once**, at write time | `classify.ts:55` at classification; `call-path.ts` writes it once into the audit row | ☑ |
| 3 | No propagation gap: the fact set in the adapter reaches the row | `mcp-adapter.ts:397` sets it -> `tool-class.ts:31/:39` carries both -> `audit-entry.ts:55` -> `drizzle-audit-repository.ts:40` -> `schema/index.ts:71` | ☑ |
| 4 | Field names, types and nullability agree across all layers | `boolean \| null` at `audit-entry.ts:55` and `audit-repository.ts:20`; `boolean('platform_destructive_hint')` nullable at `schema/index.ts:71`; **required** on `NewAuditEntry` so no writer can omit it (DE-6) | ☑ |
| 5 | Existing rows are **not** rewritten — no backfill, no migration that touches data | `0005_volatile_zombie.sql:1` is a single `ADD COLUMN`, nullable, **no DEFAULT**, no UPDATE (DE-5) | ☑ |
| 6 | A row written before this change is not rendered as though it carried the new fact | `audit-list.tsx:72` requires `platformDestructiveHint === false` explicitly, so a NULL renders nothing and makes no claim | ☑ |
| 7 | `npm run db:generate && git diff --quiet drizzle/` clean | Run 2026-08-17: *"No schema changes, nothing to migrate"*, `git diff --quiet drizzle/` clean | ☑ |
| 8 | `npm run test:db` green against a **disposable** database | **96/96 passed** against `grid_commander_test` on 2026-08-17; `DB_TESTS_MAY_TRUNCATE` unset; working DB verified intact at 167,496 readings afterwards | ☑ |

## The two eras

Confirmed on live rows, 2026-08-17. Three `accept_entry_decision` rows now exist
in one table:

```
19:28:33  destructive = false  platform_destructive_hint = NULL   <- before
11:46:59  destructive = true   platform_destructive_hint = false  <- after
11:49:06  destructive = true   platform_destructive_hint = false  <- after
```

The read path passes the column through unchanged (`drizzle-audit-repository.ts:149`)
rather than coercing NULL to `false`, and the surface tests `=== false` explicitly
(`audit-list.tsx:72`). 3,690 rows total, 2 disagreements, **0 rows altered**.

## Iron Rule violations

*(none yet)*
