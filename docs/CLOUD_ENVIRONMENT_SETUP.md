# Cloud Environment Setup — dev-skills Pipeline

Copy these values into your Claude Code cloud environment settings.

---

## Name

```
Sophia
```

## Network access

```
Trusted
```

## Environment variables

```
GIT_AUTHOR_NAME=Zsombra
```

## Setup script

```bash
#!/bin/bash
set -e

REPO_URL="https://github.com/Zsombra/dev-skills.git"
CLONE_DIR="/tmp/dev-skills"
COMMANDS_DIR="$HOME/.claude/commands"
SKILLS_DIR="$HOME/.claude/skills"

# Clone fresh every time (to /tmp, always clean)
rm -rf "$CLONE_DIR"
git clone --depth 1 "$REPO_URL" "$CLONE_DIR"

# Install commands
rm -rf "$COMMANDS_DIR"
mkdir -p "$COMMANDS_DIR"
cp "$CLONE_DIR/commands/"*.md "$COMMANDS_DIR/"

# Install checklist-generator
rm -rf "$SKILLS_DIR/checklist-generator"
mkdir -p "$SKILLS_DIR/checklist-generator/references/clean-architecture"
mkdir -p "$SKILLS_DIR/checklist-generator/references/provider-pattern"
cp "$CLONE_DIR/SKILL.md" "$SKILLS_DIR/checklist-generator/"
cp "$CLONE_DIR/references/clean-architecture/"*.md "$SKILLS_DIR/checklist-generator/references/clean-architecture/"
cp "$CLONE_DIR/references/provider-pattern/"*.md "$SKILLS_DIR/checklist-generator/references/provider-pattern/"

# Install planner
rm -rf "$SKILLS_DIR/planner"
mkdir -p "$SKILLS_DIR/planner/references"
cp "$CLONE_DIR/skills/planner/SKILL.md" "$SKILLS_DIR/planner/"
cp "$CLONE_DIR/skills/planner/references/"*.md "$SKILLS_DIR/planner/references/"

# Install executor
rm -rf "$SKILLS_DIR/executor"
mkdir -p "$SKILLS_DIR/executor"
cp "$CLONE_DIR/skills/executor/SKILL.md" "$SKILLS_DIR/executor/"

# Install auditor
rm -rf "$SKILLS_DIR/auditor"
mkdir -p "$SKILLS_DIR/auditor/references"
cp "$CLONE_DIR/skills/auditor/SKILL.md" "$SKILLS_DIR/auditor/"
cp "$CLONE_DIR/skills/auditor/references/"*.md "$SKILLS_DIR/auditor/references/"

# Verify
echo "=== Commands installed ==="
ls "$COMMANDS_DIR/"
echo "=== Skills installed ==="
find "$SKILLS_DIR" -name "SKILL.md" -o -name "*.md" -path "*/commands/*" | sort
echo "=== dev-skills pipeline ready ==="
```

---

## What This Does

Every time a new Claude Code session starts:

1. Clones `github.com/Zsombra/dev-skills` to `/tmp/` (fresh every time)
2. Copies all 7 commands to `~/.claude/commands/`
3. Copies all 4 skills (with references) to `~/.claude/skills/`
4. Prints verification showing what was installed

## Key Differences From Previous Version

- Uses `/tmp/` for clone (works on cloud environments)
- Uses `set -e` to stop on any error
- Removes old files before copying (prevents stale leftovers)
- Clones fresh every time (always gets latest from repo)
- Prints verification at the end

## After Setup

Your `/` menu will show:

```
Commands:
  /idea      — Greenfield concept exploration
  /spec      — Feature specification
  /logic     — Logic validation
  /solutions — Architecture options
  /analyze   — Architecture mapping
  /debug     — Systematic debugging
  /document  — Architecture documentation

Skills:
  checklist-generator — Creates review checklists
  planner             — Creates implementation plans
  executor            — Implements plans
  auditor             — Production gate verification
```

## Troubleshooting

If skills don't appear after setup:

1. Start a **new session** (setup only runs at session start)
2. Check if the script ran: look for "dev-skills pipeline ready" in the session startup logs
3. Verify manually in the session:
   ```
   ls ~/.claude/commands/
   ls ~/.claude/skills/
   ```
4. If commands/ is empty: the git clone failed. Check network access is set to "Trusted"
