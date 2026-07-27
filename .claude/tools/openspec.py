#!/usr/bin/env python3
"""openspec.py — zero-dependency spec-layer tool for the SKILLMOREL harness.

Gives the skills a machine-readable view of the spec layer so that
"is this change ready?" is a computation, not a judgment call.

Commands
    list                      Active changes with task progress
    status [<change>]         Artifact graph + task progress for a change
    validate [<change>]       Structural validation of deltas and main specs
    archive <change>          Merge delta specs into the source of truth

Every command accepts --json. Exit code 1 means "errors found", 0 means clean.
Requires python3 >= 3.8 and nothing else.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from datetime import date
from pathlib import Path

# --------------------------------------------------------------------------
# Root resolution
# --------------------------------------------------------------------------

CHANGE_ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")
OPERATIONS = ("ADDED", "MODIFIED", "REMOVED", "RENAMED")


def find_root(start: Path) -> Path:
    """Nearest ancestor containing an openspec/ directory."""
    for candidate in [start, *start.parents]:
        if (candidate / "openspec").is_dir():
            return candidate
    die("no openspec/ directory found in this directory or any parent. "
        "Run the bootstrap step in .claude/references/change-lifecycle.md first.")


def die(message: str, as_json: bool = False) -> "NoReturn":  # type: ignore[valid-type]
    if as_json:
        print(json.dumps({"status": [{"severity": "error", "message": message}]}, indent=2))
    else:
        print(f"error: {message}", file=sys.stderr)
    raise SystemExit(1)


# --------------------------------------------------------------------------
# Minimal YAML reader (flat `key: value` only — enough for .openspec.yaml)
# --------------------------------------------------------------------------

def read_meta(path: Path) -> dict:
    meta: dict = {}
    if not path.is_file():
        return meta
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.split("#", 1)[0].rstrip()
        if not line or line.startswith(" ") or ":" not in line:
            continue
        key, _, value = line.partition(":")
        value = value.strip().strip('"').strip("'")
        if value.lower() in ("true", "false"):
            meta[key.strip()] = value.lower() == "true"
        elif value:
            meta[key.strip()] = value
    return meta


# --------------------------------------------------------------------------
# Spec parsing
# --------------------------------------------------------------------------

class Requirement:
    def __init__(self, name: str, start: int, end: int, lines: list):
        self.name = name
        self.start = start          # index of the `### Requirement:` line
        self.end = end              # exclusive
        self.lines = lines          # the full block, including its header
        self.scenarios: list = []
        self.bad_scenarios: list = []  # near-miss headings (### or ##### Scenario)

    @property
    def body(self) -> str:
        return "\n".join(self.lines[1:]).strip()

    @property
    def text(self) -> str:
        return "\n".join(self.lines).rstrip()


def _norm(name: str) -> str:
    """Requirement identity: case- and whitespace-insensitive."""
    return re.sub(r"\s+", " ", name).strip().lower()


def parse_requirements(lines: list, start: int, end: int) -> list:
    """Collect `### Requirement:` blocks inside lines[start:end]."""
    heads = [
        i for i in range(start, end)
        if lines[i].startswith("### Requirement:")
    ]
    out = []
    for pos, head in enumerate(heads):
        stop = heads[pos + 1] if pos + 1 < len(heads) else end
        # A `## ` heading also terminates the block.
        for i in range(head + 1, stop):
            if lines[i].startswith("## ") and not lines[i].startswith("###"):
                stop = i
                break
        name = lines[head][len("### Requirement:"):].strip()
        req = Requirement(name, head, stop, lines[head:stop])
        for i in range(head + 1, stop):
            line = lines[i]
            if line.startswith("#### Scenario:"):
                req.scenarios.append(line[len("#### Scenario:"):].strip())
            elif re.match(r"^(#{1,3}|#{5,6})\s*Scenario:", line):
                req.bad_scenarios.append((i + 1, line.strip()))
        out.append(req)
    return out


class SpecDoc:
    """A parsed spec.md — works for both main specs and deltas."""

    def __init__(self, path: Path):
        self.path = path
        self.lines = path.read_text(encoding="utf-8").splitlines() if path.is_file() else []
        self.purpose = ""
        self.sections: dict = {}     # operation -> [Requirement]  (delta form)
        self.requirements: list = []  # flat list (main-spec form)
        self.renames: list = []       # (from, to)
        self._parse()

    def _parse(self) -> None:
        lines = self.lines
        heads = [i for i, l in enumerate(lines) if l.startswith("## ") and not l.startswith("###")]
        bounds = [(h, heads[n + 1] if n + 1 < len(heads) else len(lines))
                  for n, h in enumerate(heads)]

        for start, end in bounds:
            title = lines[start][3:].strip()
            upper = title.upper()

            if upper.startswith("PURPOSE"):
                self.purpose = "\n".join(lines[start + 1:end]).strip()
                continue

            op = next((o for o in OPERATIONS if upper.startswith(o + " ")), None)
            if op:
                reqs = parse_requirements(lines, start, end)
                self.sections.setdefault(op, []).extend(reqs)
                if op == "RENAMED":
                    self.renames.extend(self._parse_renames(lines, start, end))
                continue

            self.requirements.extend(parse_requirements(lines, start, end))

        # Requirements before any `## ` heading (root-level delta form).
        first = bounds[0][0] if bounds else len(lines)
        self.requirements.extend(parse_requirements(lines, 0, first))

    @staticmethod
    def _parse_renames(lines: list, start: int, end: int) -> list:
        pairs, pending = [], None
        for i in range(start, end):
            m = re.match(r"^\s*-?\s*(FROM|TO):\s*`?#*\s*(?:Requirement:)?\s*(.+?)`?\s*$",
                         lines[i], re.IGNORECASE)
            if not m:
                continue
            kind, value = m.group(1).upper(), m.group(2).strip()
            if kind == "FROM":
                pending = value
            elif pending is not None:
                pairs.append((pending, value))
                pending = None
        return pairs

    @property
    def is_delta(self) -> bool:
        return bool(self.sections)

    def delta_count(self) -> int:
        n = sum(len(v) for k, v in self.sections.items() if k != "RENAMED")
        return n + len(self.renames)

    def find(self, name: str):
        target = _norm(name)
        return next((r for r in self.requirements if _norm(r.name) == target), None)


# --------------------------------------------------------------------------
# Change model
# --------------------------------------------------------------------------

TRACKS = ("lite", "standard", "full")

# artifact id -> (relative path or glob, requires, tracks it is required in)
ARTIFACTS = [
    ("proposal", "proposal.md", [], ("lite", "standard", "full")),
    ("specs", "specs/**/spec.md", ["proposal"], ("lite", "standard", "full")),
    ("design", "design.md", ["proposal"], ("full",)),
    ("tasks", "tasks.md", ["specs"], ("lite", "standard", "full")),
    ("plan", "plan/master-plan.md", ["tasks"], ("full",)),
    ("reviews", "plan/architecture-review.md", ["plan"], ("full",)),
    ("decision-log", "plan/decision-log.md", ["plan"], ("full",)),
]


class Change:
    def __init__(self, root: Path, name: str):
        self.root = root
        self.name = name
        self.dir = root / "openspec" / "changes" / name
        self.meta = read_meta(self.dir / ".openspec.yaml")
        track = str(self.meta.get("track", "standard")).lower()
        self.track = track if track in TRACKS else "standard"
        self.skip_specs = bool(self.meta.get("skip_specs", False))

    # -- artifacts ---------------------------------------------------------

    def delta_paths(self) -> list:
        return sorted((self.dir / "specs").glob("**/spec.md"))

    def artifact_paths(self, pattern: str) -> list:
        if "*" in pattern:
            return sorted(self.dir.glob(pattern))
        p = self.dir / pattern
        return [p] if p.is_file() else []

    def artifact_status(self) -> list:
        done: dict = {}
        out = []
        for aid, pattern, requires, tracks in ARTIFACTS:
            required = self.track in tracks
            paths = self.artifact_paths(pattern)
            if aid == "specs" and self.skip_specs:
                state = "skipped"
            elif not required:
                state = "n/a"
            elif paths:
                state = "done"
            else:
                missing = [d for d in requires if done.get(d) not in ("done", "skipped", "n/a")]
                state = "blocked" if missing else "ready"
            done[aid] = state
            out.append({
                "id": aid,
                "path": pattern,
                "status": state,
                "requires": requires,
                "existing": [str(p.relative_to(self.root)) for p in paths],
            })
        return out

    # -- tasks -------------------------------------------------------------

    def tasks(self) -> list:
        path = self.dir / "tasks.md"
        if not path.is_file():
            return []
        out = []
        for raw in path.read_text(encoding="utf-8").splitlines():
            m = re.match(r"^\s*[-*]\s*\[( |x|X)\]\s*(.+?)\s*$", raw)
            if m:
                out.append({"done": m.group(1).lower() == "x", "description": m.group(2)})
        return out

    def progress(self) -> tuple:
        tasks = self.tasks()
        return sum(1 for t in tasks if t["done"]), len(tasks)


def main_spec_path(root: Path, capability: str) -> Path:
    return root / "openspec" / "specs" / capability / "spec.md"


def capability_of(change: Change, delta: Path) -> str:
    return str(delta.parent.relative_to(change.dir / "specs")).replace("\\", "/")


def list_changes(root: Path) -> list:
    base = root / "openspec" / "changes"
    if not base.is_dir():
        return []
    return sorted(
        d.name for d in base.iterdir()
        if d.is_dir() and d.name != "archive" and not d.name.startswith(".")
    )


def resolve_change(root: Path, name, as_json: bool) -> Change:
    names = list_changes(root)
    if name:
        if name not in names:
            die(f"change '{name}' not found. Active: {', '.join(names) or '(none)'}", as_json)
        return Change(root, name)
    if len(names) == 1:
        return Change(root, names[0])
    if not names:
        die("no active changes in openspec/changes/", as_json)
    die(f"multiple active changes — name one of: {', '.join(names)}", as_json)


# --------------------------------------------------------------------------
# Diagnostics
# --------------------------------------------------------------------------

def diag(severity: str, code: str, message: str, target: str = "", fix: str = "") -> dict:
    d = {"severity": severity, "code": code, "message": message}
    if target:
        d["target"] = target
    if fix:
        d["fix"] = fix
    return d


# --------------------------------------------------------------------------
# validate
# --------------------------------------------------------------------------

def validate_change(root: Path, change: Change, strict: bool) -> list:
    found: list = []
    deltas = change.delta_paths()
    rel = lambda p: str(p.relative_to(root))  # noqa: E731

    if not deltas and not change.skip_specs:
        found.append(diag(
            "error", "no_deltas",
            f"change '{change.name}' has no delta specs",
            f"openspec/changes/{change.name}/specs/",
            "add specs/<capability>/spec.md, or set skip_specs: true in .openspec.yaml "
            "when no observable behavior changes",
        ))
    if deltas and change.skip_specs:
        found.append(diag(
            "error", "skip_specs_with_deltas",
            f"change '{change.name}' sets skip_specs: true but ships {len(deltas)} delta spec(s)",
            f"openspec/changes/{change.name}/.openspec.yaml",
            "remove skip_specs or delete the deltas",
        ))

    for delta in deltas:
        cap = capability_of(change, delta)
        doc = SpecDoc(delta)
        main = SpecDoc(main_spec_path(root, cap))
        main_exists = main_spec_path(root, cap).is_file()

        if not doc.is_delta:
            found.append(diag(
                "error", "not_a_delta",
                f"{cap}: no ADDED/MODIFIED/REMOVED/RENAMED section",
                rel(delta),
                "a change spec is a delta — open it with `## ADDED Requirements`",
            ))
            continue

        if doc.delta_count() == 0:
            found.append(diag("error", "empty_delta", f"{cap}: delta sections contain no requirements", rel(delta)))

        if not main_exists and not doc.purpose:
            found.append(diag(
                "error", "missing_purpose",
                f"{cap}: new capability has no `## Purpose`",
                rel(delta),
                "add a `## Purpose` section — archive seeds the new main spec from it",
            ))
        if strict and not main_exists and 0 < len(doc.purpose) < 50:
            found.append(diag("warning", "purpose_too_brief", f"{cap}: `## Purpose` is under 50 characters", rel(delta)))
        if main_exists and doc.purpose:
            found.append(diag(
                "warning", "purpose_ignored",
                f"{cap}: `## Purpose` in a delta for an existing capability is ignored at archive",
                rel(delta),
                f"edit openspec/specs/{cap}/spec.md directly to change the Purpose",
            ))

        for op, reqs in doc.sections.items():
            for req in reqs:
                where = f"{rel(delta)}:{req.start + 1}"

                for line_no, bad in req.bad_scenarios:
                    found.append(diag(
                        "error", "scenario_wrong_level",
                        f"{cap} / {req.name}: scenario heading must use exactly 4 hashes",
                        f"{rel(delta)}:{line_no}",
                        f"change `{bad}` to `#### Scenario: ...`",
                    ))

                if op in ("ADDED", "MODIFIED") and not req.scenarios:
                    found.append(diag(
                        "error", "requirement_without_scenario",
                        f"{cap} / {req.name}: requirement has no scenario",
                        where,
                        "add `#### Scenario: <name>` with WHEN/THEN lines",
                    ))

                if op in ("ADDED", "MODIFIED") and not re.search(r"\b(SHALL|MUST)\b", req.body):
                    found.append(diag(
                        "warning" if not strict else "error", "requirement_not_normative",
                        f"{cap} / {req.name}: no SHALL/MUST in the requirement statement",
                        where,
                        "state the behavior as `The system SHALL ...`",
                    ))

                if op == "ADDED" and main_exists and main.find(req.name):
                    found.append(diag(
                        "error", "added_already_exists",
                        f"{cap} / {req.name}: ADDED but already present in the main spec",
                        where,
                        "use `## MODIFIED Requirements` instead",
                    ))

                if op in ("MODIFIED", "REMOVED"):
                    if not main_exists:
                        found.append(diag(
                            "error", "no_main_spec",
                            f"{cap} / {req.name}: {op} against a capability that has no main spec",
                            where,
                            "use ADDED for a capability that does not exist yet",
                        ))
                    elif not main.find(req.name):
                        found.append(diag(
                            "error", f"{op.lower()}_not_found",
                            f"{cap} / {req.name}: {op} target not found in the main spec",
                            where,
                            f"copy the exact header from openspec/specs/{cap}/spec.md",
                        ))

                if op == "REMOVED" and not re.search(r"\*\*?Reason", req.body, re.IGNORECASE):
                    found.append(diag(
                        "warning", "removal_without_reason",
                        f"{cap} / {req.name}: removal has no **Reason**",
                        where,
                    ))

        for old, new in doc.renames:
            if main_exists and not main.find(old):
                found.append(diag("error", "renamed_not_found",
                                  f"{cap}: RENAMED source '{old}' not found in the main spec", rel(delta)))
            if main_exists and main.find(new):
                found.append(diag("error", "renamed_target_exists",
                                  f"{cap}: RENAMED target '{new}' already exists in the main spec", rel(delta)))

    done, total = change.progress()
    if total == 0 and (change.dir / "tasks.md").is_file():
        found.append(diag("warning", "no_tasks", f"change '{change.name}': tasks.md has no checkboxes",
                          f"openspec/changes/{change.name}/tasks.md"))

    return found


def validate_main_specs(root: Path, strict: bool) -> list:
    found = []
    base = root / "openspec" / "specs"
    if not base.is_dir():
        return found
    for path in sorted(base.glob("**/spec.md")):
        cap = str(path.parent.relative_to(base)).replace("\\", "/")
        doc = SpecDoc(path)
        rel = str(path.relative_to(root))
        if not doc.purpose:
            found.append(diag("warning", "main_spec_no_purpose", f"{cap}: main spec has no `## Purpose`", rel))
        elif "TBD" in doc.purpose:
            found.append(diag("warning", "main_spec_purpose_tbd", f"{cap}: Purpose is still a TBD placeholder", rel))
        if not doc.requirements:
            found.append(diag("warning", "main_spec_no_requirements", f"{cap}: main spec has no requirements", rel))
        for req in doc.requirements:
            if not req.scenarios:
                found.append(diag("error" if strict else "warning", "requirement_without_scenario",
                                  f"{cap} / {req.name}: requirement has no scenario",
                                  f"{rel}:{req.start + 1}"))
    return found


# --------------------------------------------------------------------------
# archive
# --------------------------------------------------------------------------

def build_merged_spec(root: Path, cap: str, delta: SpecDoc) -> tuple:
    """Return (new_text, [operation summaries]). Raises ValueError on conflict."""
    path = main_spec_path(root, cap)
    ops = []

    if not path.is_file():
        title = cap.replace("-", " ").replace("/", " / ").title()
        purpose = delta.purpose or "TBD — Update Purpose after archive."
        body = [f"# {title} Specification", "", "## Purpose", "", purpose, "", "## Requirements", ""]
        for req in delta.sections.get("ADDED", []):
            body.append(req.text)
            body.append("")
            ops.append(f"create {cap}: + {req.name}")
        for op in ("MODIFIED", "REMOVED", "RENAMED"):
            if delta.sections.get(op):
                raise ValueError(f"{cap}: {op} requires an existing main spec")
        return "\n".join(body).rstrip() + "\n", ops

    main = SpecDoc(path)
    lines = list(main.lines)
    edits = []  # (start, end, replacement_lines)

    for req in delta.sections.get("REMOVED", []):
        target = main.find(req.name)
        if not target:
            raise ValueError(f"{cap}: REMOVED '{req.name}' not found")
        edits.append((target.start, target.end, []))
        ops.append(f"{cap}: - {req.name}")

    for req in delta.sections.get("MODIFIED", []):
        target = main.find(req.name)
        if not target:
            raise ValueError(f"{cap}: MODIFIED '{req.name}' not found")
        edits.append((target.start, target.end, req.text.splitlines() + [""]))
        ops.append(f"{cap}: ~ {req.name}")

    for old, new in delta.renames:
        target = main.find(old)
        if not target:
            raise ValueError(f"{cap}: RENAMED '{old}' not found")
        edits.append((target.start, target.start + 1, [f"### Requirement: {new}"]))
        ops.append(f"{cap}: {old} -> {new}")

    for start, end, replacement in sorted(edits, key=lambda e: e[0], reverse=True):
        lines[start:end] = replacement

    additions = []
    for req in delta.sections.get("ADDED", []):
        if main.find(req.name):
            raise ValueError(f"{cap}: ADDED '{req.name}' already exists")
        additions.extend(req.text.splitlines() + [""])
        ops.append(f"{cap}: + {req.name}")

    if additions:
        while lines and not lines[-1].strip():
            lines.pop()
        lines.extend(["", *additions])

    return "\n".join(lines).rstrip() + "\n", ops


def archive_change(root: Path, change: Change, apply: bool, strict: bool) -> dict:
    problems = [d for d in validate_change(root, change, strict) if d["severity"] == "error"]
    if problems:
        return {"archived": False, "specs_updated": [], "operations": [], "status": problems}

    planned, operations = [], []
    for delta in change.delta_paths():
        cap = capability_of(change, delta)
        try:
            text, ops = build_merged_spec(root, cap, SpecDoc(delta))
        except ValueError as exc:
            return {"archived": False, "specs_updated": [], "operations": [],
                    "status": [diag("error", "merge_conflict", str(exc), str(delta.relative_to(root)))]}
        planned.append((main_spec_path(root, cap), text))
        operations.extend(ops)

    target_name = change.name
    if not re.match(r"^\d{4}-\d{2}-\d{2}-", target_name):
        target_name = f"{date.today().isoformat()}-{target_name}"
    target = root / "openspec" / "changes" / "archive" / target_name

    if target.exists():
        return {"archived": False, "specs_updated": [], "operations": operations,
                "status": [diag("error", "archive_target_exists",
                                f"{target.relative_to(root)} already exists")]}

    result = {
        "change": change.name,
        "archived_as": target_name,
        "operations": operations,
        "specs_updated": [str(p.relative_to(root)) for p, _ in planned],
        "status": [],
    }

    if not apply:
        result["archived"] = False
        result["dry_run"] = True
        return result

    # Write specs first; only move the change folder once every write succeeded.
    for path, text in planned:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")

    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(change.dir), str(target))
    result["archived"] = True
    return result


# --------------------------------------------------------------------------
# Rendering
# --------------------------------------------------------------------------

SYMBOL = {"done": "x", "skipped": "-", "ready": " ", "blocked": "!", "n/a": "-"}


def render_status(change: Change, artifacts: list, done: int, total: int) -> str:
    out = [f"Change: {change.name}   track: {change.track}"
           + ("   skip_specs: true" if change.skip_specs else "")]
    out.append("")
    for a in artifacts:
        note = ""
        if a["status"] == "blocked":
            note = f"  (needs: {', '.join(a['requires'])})"
        out.append(f"  [{SYMBOL[a['status']]}] {a['id']:<13} {a['status']:<8} {a['path']}{note}")
    out.append("")
    out.append(f"  tasks: {done}/{total} complete" if total else "  tasks: none")
    nxt = next((a["id"] for a in artifacts if a["status"] == "ready"), None)
    out.append(f"  next: create `{nxt}`" if nxt else "  next: all required artifacts exist")
    return "\n".join(out)


def render_diagnostics(found: list) -> str:
    if not found:
        return "clean — no issues found."
    lines = []
    for d in found:
        head = f"{d['severity'].upper():<7} {d['code']}: {d['message']}"
        lines.append(head)
        if d.get("target"):
            lines.append(f"        at {d['target']}")
        if d.get("fix"):
            lines.append(f"        fix: {d['fix']}")
    errors = sum(1 for d in found if d["severity"] == "error")
    warnings = len(found) - errors
    lines.append("")
    lines.append(f"{errors} error(s), {warnings} warning(s)")
    return "\n".join(lines)


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------

def main(argv: list) -> int:
    parser = argparse.ArgumentParser(prog="openspec.py", description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--json", action="store_true", help="machine-readable output")
    parser.add_argument("--root", help="repo root (default: nearest ancestor with openspec/)")

    # Accept the global flags after the subcommand too — `status x --json` is how
    # these get typed in practice. SUPPRESS keeps an omitted flag from clobbering
    # a value already set before the subcommand.
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--json", action="store_true", default=argparse.SUPPRESS,
                        help="machine-readable output")
    common.add_argument("--root", default=argparse.SUPPRESS, help=argparse.SUPPRESS)

    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("list", help="list active changes", parents=[common])

    p_status = sub.add_parser("status", help="artifact graph for a change", parents=[common])
    p_status.add_argument("change", nargs="?")

    p_validate = sub.add_parser("validate", help="validate deltas and main specs", parents=[common])
    p_validate.add_argument("change", nargs="?")
    p_validate.add_argument("--all", action="store_true", help="validate every active change")
    p_validate.add_argument("--strict", action="store_true", help="promote advisory findings to errors")

    p_archive = sub.add_parser("archive", help="merge deltas into openspec/specs and archive",
                               parents=[common])
    p_archive.add_argument("change", nargs="?")
    p_archive.add_argument("--apply", action="store_true", help="write changes (default: dry run)")
    p_archive.add_argument("--strict", action="store_true")

    args = parser.parse_args(argv)
    root = Path(args.root).resolve() if args.root else find_root(Path.cwd().resolve())

    if args.command == "list":
        rows = []
        for name in list_changes(root):
            change = Change(root, name)
            done, total = change.progress()
            rows.append({"name": name, "track": change.track, "completedTasks": done,
                         "totalTasks": total,
                         "state": "complete" if total and done == total else
                                  ("no-tasks" if not total else "in-progress")})
        if args.json:
            print(json.dumps({"changes": rows, "root": str(root)}, indent=2))
        elif not rows:
            print("no active changes.")
        else:
            for r in rows:
                bar = f"{r['completedTasks']}/{r['totalTasks']}" if r["totalTasks"] else "—"
                print(f"  {r['name']:<34} {r['track']:<9} tasks {bar:>7}  {r['state']}")
        return 0

    if args.command == "status":
        change = resolve_change(root, args.change, args.json)
        artifacts = change.artifact_status()
        done, total = change.progress()
        if args.json:
            print(json.dumps({
                "change": change.name, "track": change.track, "skipSpecs": change.skip_specs,
                "changeRoot": str(change.dir.relative_to(root)),
                "artifacts": artifacts,
                "progress": {"complete": done, "total": total},
                "isComplete": bool(total) and done == total,
                "root": str(root),
            }, indent=2))
        else:
            print(render_status(change, artifacts, done, total))
        return 0

    if args.command == "validate":
        found = []
        targets = ([Change(root, n) for n in list_changes(root)] if args.all
                   else [resolve_change(root, args.change, args.json)])
        for change in targets:
            found.extend(validate_change(root, change, args.strict))
        found.extend(validate_main_specs(root, args.strict))
        errors = sum(1 for d in found if d["severity"] == "error")
        if args.json:
            print(json.dumps({"status": found,
                              "summary": {"errors": errors, "warnings": len(found) - errors},
                              "root": str(root)}, indent=2))
        else:
            print(render_diagnostics(found))
        return 1 if errors else 0

    if args.command == "archive":
        change = resolve_change(root, args.change, args.json)
        result = archive_change(root, change, args.apply, args.strict)
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            if result["status"]:
                print(render_diagnostics(result["status"]))
                print("\narchive aborted — nothing was moved.")
            else:
                for op in result["operations"]:
                    print(f"  {op}")
                if result.get("archived"):
                    print(f"\narchived to openspec/changes/archive/{result['archived_as']}/")
                else:
                    print(f"\ndry run — re-run with --apply to write "
                          f"{len(result['specs_updated'])} spec file(s) and archive.")
        return 1 if result["status"] else 0

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
