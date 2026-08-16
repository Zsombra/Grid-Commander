# Data Pipeline Review: The Port Knows What Costs Money

**Status**: PENDING EXECUTION EVIDENCE

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
| 1 | **Iron Rule** — the badge traces to a stored column, never re-derived client-side | | ☐ |
| 2 | The judgement is computed server-side **once**, at write time | | ☐ |
| 3 | No propagation gap: the fact set in the adapter reaches the row | | ☐ |
| 4 | Field names, types and nullability agree across all layers | | ☐ |
| 5 | Existing rows are **not** rewritten — no backfill, no migration that touches data | | ☐ |
| 6 | A row written before this change is not rendered as though it carried the new fact | | ☐ |
| 7 | `npm run db:generate && git diff --quiet drizzle/` clean | | ☐ |
| 8 | `npm run test:db` green against a **disposable** database | | ☐ |

## The two eras

Rows before this change carry the platform's answer in the old field; rows after
carry both. Record here how the read path distinguishes them, and confirm no
query assumes the new column is populated for historical rows.

## Iron Rule violations

*(none yet)*
