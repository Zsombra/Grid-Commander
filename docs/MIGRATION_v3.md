# Migrating a project from SKILLMOREL v2.x to v3.0

v3.0 is a breaking change to file layout. Nothing is lost, and the migration is
mechanical. Budget ten minutes for a project with a handful of plan docs.

## What actually changed

1. **Plan artifacts moved into the change folder.**
   `docs/plan/<slug>-master-plan.md` → `openspec/changes/<slug>/plan/master-plan.md`
2. **A new spec layer exists**: `openspec/specs/` (behavior) and
   `openspec/changes/` (proposals). This is new; nothing in v2.x maps to it.
3. **Changes are folders, not filename prefixes.** The `<slug>-` prefix is gone —
   the folder name carries the identity.
4. **Tracks exist.** Every change declares `lite` / `standard` / `full`.
   v2.x behavior is `full`.
5. **`docs/specs/` is unchanged.** Your review checklists keep working exactly
   as before, and `checklist-generator` is untouched.

## Migration

### 1. Update the bundle

```bash
cp -r /path/to/skillmorel/.claude/. ./.claude/
```

This adds `references/`, `tools/`, the three new skills, and the five new
commands, and updates the three existing skills.

### 2. Create the spec layer

```bash
mkdir -p openspec/specs openspec/changes/archive
cp .claude/references/templates/config.yaml openspec/config.yaml
```

Fill in `openspec/config.yaml`. The `context` and `rules` blocks are injected
into every artifact the skills write — this is where project-wide constraints
belong. If your architecture checklist already lists quality gate commands,
copy them into `quality_gates:` so the executor and auditor find them first.

### 3. Move in-flight plan docs

For each `<slug>` with work still in progress:

```bash
mkdir -p openspec/changes/<slug>/plan
git mv docs/plan/<slug>-master-plan.md        openspec/changes/<slug>/plan/master-plan.md
git mv docs/plan/<slug>-architecture-review.md openspec/changes/<slug>/plan/architecture-review.md
git mv docs/plan/<slug>-data-review.md         openspec/changes/<slug>/plan/data-review.md
git mv docs/plan/<slug>-uiux-review.md         openspec/changes/<slug>/plan/uiux-review.md
git mv docs/plan/<slug>-decision-log.md        openspec/changes/<slug>/plan/decision-log.md
git mv docs/plan/<slug>-production-gate.md     openspec/changes/<slug>/plan/production-gate.md
```

Then add `openspec/changes/<slug>/.openspec.yaml`:

```yaml
track: full
created: <the date the plan was written>
skip_specs: true
```

`skip_specs: true` is the honest setting for a migrated change: it was planned
without a behavior contract, and retrofitting one now is busywork. Drop the
flag and write real deltas only if the change has not started yet.

The status markers (`PLAN READY FOR REVIEW`, `EXECUTION READY FOR PRODUCTION
GATE`) still mean what they meant. Work in flight continues from where it was.

### 4. Archive completed plan docs

Finished work does not need converting. Either leave it in `docs/plan/` as
historical record, or move each completed `<slug>` into
`openspec/changes/archive/YYYY-MM-DD-<slug>/` using the same layout as step 3.
Neither choice affects the pipeline.

### 5. Verify

```bash
python3 .claude/tools/openspec.py list
python3 .claude/tools/openspec.py validate --all
```

Then `/status` for a narrative view and the recommended next action.

## Adopting the spec layer

Do **not** try to specify the whole system. Retrofitting specs onto an existing
codebase as a project is the reliable way to kill a spec layer: it produces a
large volume of unverified prose that immediately starts rotting.

Instead: the next time you touch a capability, `/propose` a change and write
the delta for what you are changing. Archive it. `openspec/specs/<capability>/`
now exists and is accurate, because it was written alongside real work and
verified against real code.

`/analyze` reports which capabilities are unspecified, so you can see the gap
shrink without ever running a specification project.

## Rollback

v3.0 touches only `.claude/` and adds `openspec/`. To roll back, restore the
old `.claude/` and move the plan docs back to `docs/plan/<slug>-*.md`. No code
and no checklist is affected either way.
