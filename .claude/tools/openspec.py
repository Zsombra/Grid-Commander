#!/usr/bin/env python3
"""openspec.py — zero-dependency spec-layer tool for the SKILLMOREL harness.

Gives the skills a machine-readable view of the spec layer so that
"is this change ready?" is a computation, not a judgment call.

Commands
    board                     Everything at a glance — start every session here
    list                      Active changes with task progress
    status [<change>]         Artifact graph + task progress for a change
    backlog list|show         Work that is not a change yet
    journal                   Recent session handoff entries
    validate [<change>]       Structural validation of deltas, specs, and backlog
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


def parse_frontmatter(path: Path) -> tuple:
    """Split a `---`-delimited YAML frontmatter block from its body.

    Supports scalars, booleans, and inline lists (`tags: [a, b]`) — the shapes
    backlog items actually use. Returns ({}, full_text) when there is no block.
    """
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}, text
    try:
        end = next(i for i in range(1, len(lines)) if lines[i].strip() == "---")
    except StopIteration:
        return {}, text

    meta: dict = {}
    for raw in lines[1:end]:
        line = raw.rstrip()
        if not line.strip() or line.lstrip().startswith("#") or ":" not in line:
            continue
        key, _, value = line.partition(":")
        key, value = key.strip(), value.strip()
        if value.startswith("[") and value.endswith("]"):
            inner = value[1:-1].strip()
            meta[key] = [v.strip().strip('"').strip("'") for v in inner.split(",") if v.strip()]
        else:
            value = value.strip('"').strip("'")
            if value.lower() in ("true", "false"):
                meta[key] = value.lower() == "true"
            else:
                meta[key] = value
    return meta, "\n".join(lines[end + 1:]).strip()


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


_FENCE_RE = re.compile(r"^ {0,3}(?P<fence>`{3,}|~{3,})(?P<info>.*)$")


def fenced_lines(lines: list) -> set:
    """Line indices sitting inside a fenced code block, delimiters included.

    Markdown headings are this tool's entire structural vocabulary, so a
    document that *shows* the format — which is exactly what a spec about the
    spec format does — has its examples read as live structure unless every
    scanner agrees on which lines are prose. Computing that agreement once,
    here, is what keeps them from drifting apart.

    CommonMark: a fence opens on 3+ backticks or tildes indented at most 3
    spaces, and closes on the same character, at least as long, carrying no
    info string. Length is tracked so a ````-fence can contain ```; an
    unterminated fence runs to end of file, matching how the text renders.
    """
    inside: set = set()
    want = None  # (char, length) of the closer we are looking for
    for i, line in enumerate(lines):
        m = _FENCE_RE.match(line)
        if want is None:
            if not m:
                continue
            fence, info = m.group("fence"), m.group("info")
            # A backtick fence's info string may not contain a backtick, which
            # is what separates ```python from inline ``code`` in a sentence.
            if fence[0] == "`" and "`" in info:
                continue
            want = (fence[0], len(fence))
            inside.add(i)
            continue
        inside.add(i)
        if m:
            fence = m.group("fence")
            if fence[0] == want[0] and len(fence) >= want[1] and not m.group("info").strip():
                want = None
    return inside


def parse_requirements(lines: list, start: int, end: int, skip: set = None) -> list:
    """Collect `### Requirement:` blocks inside lines[start:end].

    `skip` is the fenced-line set from fenced_lines(); it is computed here when
    not supplied so that no caller can opt out of fence awareness by accident.
    """
    if skip is None:
        skip = fenced_lines(lines)
    heads = [
        i for i in range(start, end)
        if lines[i].startswith("### Requirement:") and i not in skip
    ]
    out = []
    for pos, head in enumerate(heads):
        stop = heads[pos + 1] if pos + 1 < len(heads) else end
        # A `## ` heading also terminates the block.
        for i in range(head + 1, stop):
            if lines[i].startswith("## ") and not lines[i].startswith("###") and i not in skip:
                stop = i
                break
        name = lines[head][len("### Requirement:"):].strip()
        req = Requirement(name, head, stop, lines[head:stop])
        for i in range(head + 1, stop):
            line = lines[i]
            if i in skip:
                continue
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
        skip = fenced_lines(lines)
        heads = [i for i, l in enumerate(lines)
                 if l.startswith("## ") and not l.startswith("###") and i not in skip]
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
                reqs = parse_requirements(lines, start, end, skip)
                self.sections.setdefault(op, []).extend(reqs)
                if op == "RENAMED":
                    self.renames.extend(self._parse_renames(lines, start, end, skip))
                continue

            self.requirements.extend(parse_requirements(lines, start, end, skip))

        # Requirements before any `## ` heading (root-level delta form).
        first = bounds[0][0] if bounds else len(lines)
        self.requirements.extend(parse_requirements(lines, 0, first, skip))

    @staticmethod
    def _parse_renames(lines: list, start: int, end: int, skip: set = None) -> list:
        if skip is None:
            skip = fenced_lines(lines)
        pairs, pending = [], None
        for i in range(start, end):
            if i in skip:
                continue
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


# --------------------------------------------------------------------------
# Backlog
# --------------------------------------------------------------------------

ITEM_TYPES = ("bug", "feature", "debt", "chore", "question", "risk")
ITEM_STATUSES = ("open", "in-progress", "blocked", "done", "wontfix")
ITEM_PRIORITIES = ("p0", "p1", "p2", "p3")
OPEN_STATUSES = ("open", "in-progress", "blocked")
PRIORITY_ORDER = {p: i for i, p in enumerate(ITEM_PRIORITIES)}


class BacklogItem:
    def __init__(self, path: Path, root: Path):
        self.path = path
        self.root = root
        self.slug = path.stem
        meta, body = parse_frontmatter(path)
        self.meta = meta
        self.body = body
        self.id = str(meta.get("id", self.slug))
        self.title = str(meta.get("title", "")).strip() or self._title_from_body(body) or self.slug
        self.type = str(meta.get("type", "")).lower()
        self.status = str(meta.get("status", "")).lower()
        self.priority = str(meta.get("priority", "")).lower()
        self.change = str(meta.get("change", "")).strip()
        self.capability = str(meta.get("capability", "")).strip()
        self.created = str(meta.get("created", "")).strip()
        self.updated = str(meta.get("updated", "")).strip()
        blocked = meta.get("blocked_by", [])
        self.blocked_by = blocked if isinstance(blocked, list) else [blocked]
        tags = meta.get("tags", [])
        self.tags = tags if isinstance(tags, list) else [tags]

    @staticmethod
    def _title_from_body(body: str) -> str:
        lines = body.splitlines()
        skip = fenced_lines(lines)
        for i, line in enumerate(lines):
            if line.startswith("# ") and i not in skip:
                return line[2:].strip()
        return ""

    @property
    def is_open(self) -> bool:
        return self.status in OPEN_STATUSES

    def sort_key(self) -> tuple:
        return (PRIORITY_ORDER.get(self.priority, 9), self.status != "in-progress", self.id)

    def as_dict(self) -> dict:
        return {
            "id": self.id, "title": self.title, "type": self.type, "status": self.status,
            "priority": self.priority, "change": self.change or None,
            "capability": self.capability or None, "blockedBy": self.blocked_by,
            "tags": self.tags, "created": self.created, "updated": self.updated,
            "path": str(self.path.relative_to(self.root)),
        }


def load_backlog(root: Path) -> list:
    base = root / "openspec" / "backlog"
    if not base.is_dir():
        return []
    items = [BacklogItem(p, root) for p in sorted(base.glob("*.md"))
             if p.name.upper() not in ("README.MD", "TEMPLATE.MD")]
    return sorted(items, key=lambda i: i.sort_key())


def archived_names(root: Path) -> list:
    base = root / "openspec" / "changes" / "archive"
    return sorted(d.name for d in base.iterdir() if d.is_dir()) if base.is_dir() else []


def find_archived(root: Path, change: str):
    suffix = re.sub(r"^\d{4}-\d{2}-\d{2}-", "", change)
    return next((n for n in archived_names(root)
                 if n == change or re.sub(r"^\d{4}-\d{2}-\d{2}-", "", n) == suffix), None)


def validate_backlog(root: Path, strict: bool) -> list:
    found = []
    items = load_backlog(root)
    ids = {i.id for i in items}
    active = set(list_changes(root))

    for item in items:
        rel = str(item.path.relative_to(root))
        if not item.meta:
            found.append(diag("error", "backlog_missing_frontmatter",
                              f"{item.slug}: no `---` frontmatter block", rel,
                              "copy openspec/backlog/TEMPLATE.md"))
            continue
        if item.id != item.slug:
            found.append(diag("error", "backlog_id_mismatch",
                              f"{item.slug}: frontmatter id '{item.id}' does not match the filename",
                              rel, f"set `id: {item.slug}` or rename the file"))
        for field, value, allowed in (("type", item.type, ITEM_TYPES),
                                      ("status", item.status, ITEM_STATUSES),
                                      ("priority", item.priority, ITEM_PRIORITIES)):
            if value not in allowed:
                found.append(diag("error", f"backlog_invalid_{field}",
                                  f"{item.id}: {field} '{value or '(missing)'}' is not one of "
                                  f"{', '.join(allowed)}", rel))

        for dep in item.blocked_by:
            if dep and dep not in ids:
                found.append(diag("warning", "backlog_blocked_by_unknown",
                                  f"{item.id}: blocked_by '{dep}' is not a backlog item", rel))
        if item.status == "blocked" and not item.blocked_by:
            found.append(diag("warning", "backlog_blocked_without_cause",
                              f"{item.id}: status is blocked but blocked_by is empty", rel,
                              "name the blocker, or explain it in the body and set status: open"))

        if item.change:
            arch = find_archived(root, item.change)
            if item.change not in active and not arch:
                found.append(diag("error", "backlog_change_not_found",
                                  f"{item.id}: linked change '{item.change}' does not exist",
                                  rel, "fix the link or clear the `change:` field"))
            elif arch and item.is_open:
                found.append(diag("warning", "backlog_change_archived",
                                  f"{item.id}: linked change '{item.change}' is archived but the "
                                  f"item is still {item.status}", rel,
                                  "set status: done, or explain what is left"))
            elif item.change in active and item.status == "open":
                found.append(diag("warning", "backlog_status_behind_change",
                                  f"{item.id}: linked change '{item.change}' is active but the item "
                                  f"is still open", rel, "set status: in-progress"))
        elif item.status == "in-progress":
            found.append(diag("warning", "backlog_in_progress_without_change",
                              f"{item.id}: in-progress with no linked change", rel,
                              "link the change with `change: <id>`, or set status back to open"))

        if item.capability and not main_spec_path(root, item.capability).is_file():
            found.append(diag("warning", "backlog_capability_not_found",
                              f"{item.id}: capability '{item.capability}' has no spec yet", rel))
        if strict and item.is_open and not item.updated:
            found.append(diag("warning", "backlog_never_updated",
                              f"{item.id}: no `updated` date", rel))

    # Only nudge about linkage in projects that actually use the backlog.
    if items:
        for name in active:
            if not any(i.change == name for i in items):
                found.append(diag("info", "change_without_backlog_item",
                                  f"active change '{name}' has no backlog item",
                                  f"openspec/changes/{name}/",
                                  f"optional — link one with `change: {name}` for a single view"))
    return found


# --------------------------------------------------------------------------
# Design layer (see .claude/references/design-contract.md)
# --------------------------------------------------------------------------

SURFACE_STATUSES = ("functional", "in-design", "designed", "needs-redesign")
COMPONENT_ROLES = ("container", "input", "display", "action", "navigation",
                   "feedback", "media", "layout")
TICKET_TYPES = ("restyle", "relayout", "new-component", "interaction", "motion",
                "tokens", "responsive", "a11y", "content")
TICKET_STATUSES = ("open", "in-progress", "implemented", "blocked", "rejected")
TICKET_OPEN = ("open", "in-progress", "blocked")
BEHAVIOR_IMPACTS = ("none", "requires-spec-change")
RAW_COLOR_RE = re.compile(r"#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\s*\(")


def design_dir(root: Path) -> Path:
    return root / "openspec" / "design"


def load_json(path: Path):
    """Return (data, error_message)."""
    try:
        return json.loads(path.read_text(encoding="utf-8")), None
    except json.JSONDecodeError as exc:
        return None, f"line {exc.lineno}: {exc.msg}"


def load_design(root: Path, kind: str) -> list:
    """kind: 'surfaces' | 'tickets'. Returns [(path, data_or_None, error)]."""
    base = design_dir(root) / kind
    if not base.is_dir():
        return []
    out = []
    for path in sorted(base.glob("*.json")):
        data, err = load_json(path)
        out.append((path, data, err))
    return out


def surface_components(surface: dict) -> dict:
    return {c.get("id"): c for c in surface.get("components", []) if isinstance(c, dict)}


def git_changed_since(root: Path, commit: str, files: list) -> list:
    """Which of `files` changed since `commit`. Empty list when git can't answer."""
    if not commit or not files:
        return []
    import subprocess
    try:
        result = subprocess.run(
            ["git", "-C", str(root), "diff", "--name-only", f"{commit}..HEAD", "--", *files],
            capture_output=True, text=True, timeout=15,
        )
    except (OSError, subprocess.SubprocessError):
        return []
    if result.returncode != 0:
        return []
    return [line for line in result.stdout.splitlines() if line.strip()]


# A surface's `source_files` is hand-assembled by an agent reading code, so an
# incomplete list is the one drift the commit check cannot see: the manifest
# looks fresh while describing only part of the surface. These close that gap.

COMPONENT_EXTS = (".tsx", ".jsx", ".vue", ".svelte", ".astro")
LOGIC_EXTS = (".ts", ".js", ".mjs")
UI_EXTS = COMPONENT_EXTS + LOGIC_EXTS
RESOLVE_EXTS = UI_EXTS + (".css", ".scss")
NON_UI_MARKERS = (".test.", ".spec.", ".stories.", ".d.ts", "__tests__", "__mocks__")

# A .ts/.js file is part of a surface when it drives what renders — a hook, a
# view model, a store. A pure formatter or api client is not, and flagging
# those is the noise that teaches people to ignore the warning.
VIEW_LOGIC_RE = re.compile(
    r"^use[A-Z]|view|model|store|context|state|hook|provider|reducer|controller",
    re.IGNORECASE,
)
IMPORT_RE = re.compile(
    r"""(?:^|\s)(?:import|export)\s[^;\n]*?from\s*['"](\.{1,2}/[^'"]+)['"]"""
    r"""|(?:^|\s)import\s*['"](\.{1,2}/[^'"]+)['"]"""
    r"""|require\(\s*['"](\.{1,2}/[^'"]+)['"]\s*\)""",
    re.MULTILINE,
)
TYPE_IMPORT_RE = re.compile(r"^\s*(?:import|export)\s+type\s")


def _is_ui_file(path: Path) -> bool:
    """Does this file plausibly belong to a UI surface?

    Components always. Logic files only when the name suggests view logic —
    `useCheckout.ts` shapes what renders, `money.ts` does not.
    """
    if any(m in str(path) for m in NON_UI_MARKERS):
        return False
    if path.suffix in COMPONENT_EXTS:
        return True
    return path.suffix in LOGIC_EXTS and bool(VIEW_LOGIC_RE.search(path.stem))


def _resolve_import(importer: Path, spec: str):
    """Resolve a relative import to a file on disk, or None."""
    base = (importer.parent / spec).resolve()
    if base.is_file():
        return base
    for ext in RESOLVE_EXTS:
        candidate = base.with_name(base.name + ext)
        if candidate.is_file():
            return candidate
    for ext in UI_EXTS:
        candidate = base / ("index" + ext)
        if candidate.is_file():
            return candidate
    return None


def local_ui_imports(root: Path, source_files: list) -> set:
    """Local UI files directly imported by `source_files` — one layer, not the
    transitive closure. Adding a missing file makes it a root on the next run,
    so the tree is walked a layer at a time instead of dragging in every util.

    Silently returns nothing for stacks without JS-style relative imports.
    """
    found = set()
    for rel in source_files:
        path = (root / rel)
        if not path.is_file() or path.suffix not in UI_EXTS:
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        for line in text.splitlines():
            if TYPE_IMPORT_RE.match(line):
                continue          # type-only imports are not part of the surface
            for match in IMPORT_RE.finditer(line):
                spec = next((g for g in match.groups() if g), None)
                if not spec:
                    continue
                target = _resolve_import(path, spec)
                if target and _is_ui_file(target):
                    try:
                        found.add(str(target.relative_to(root)))
                    except ValueError:
                        pass       # import escaped the repo
    return found


def _pascal(kebab: str) -> str:
    return "".join(part[:1].upper() + part[1:] for part in kebab.split("-") if part)


def component_is_traceable(root: Path, component_id: str, source_files: list) -> bool:
    """Does this component id appear in any listed source file, in any casing?

    Heuristic on purpose — it catches invented or renamed components without
    needing a parser per framework.
    """
    needles = {component_id, _pascal(component_id), component_id.replace("-", "_"),
               component_id.replace("-", "")}
    for rel in source_files:
        path = root / rel
        if not path.is_file():
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        lowered = text.lower()
        if any(n.lower() in lowered for n in needles):
            return True
    return False


def _walk_strings(node, path="") -> list:
    """Yield (dotted_path, string) for every string in a nested structure."""
    out = []
    if isinstance(node, dict):
        for key, value in node.items():
            out.extend(_walk_strings(value, f"{path}.{key}" if path else str(key)))
    elif isinstance(node, list):
        for i, value in enumerate(node):
            out.extend(_walk_strings(value, f"{path}[{i}]"))
    elif isinstance(node, str):
        out.append((path, node))
    return out


def validate_design(root: Path, strict: bool) -> list:
    found = []
    base = design_dir(root)
    if not base.is_dir():
        return found
    rel = lambda p: str(p.relative_to(root))  # noqa: E731

    # -- design system -----------------------------------------------------
    system_path = base / "system.json"
    if system_path.is_file():
        system, err = load_json(system_path)
        if err:
            found.append(diag("error", "design_invalid_json",
                              f"system.json will not parse — {err}", rel(system_path)))
        elif system.get("status") != "designed":
            groups = ", ".join(system.get("placeholder_groups", [])) or "unspecified"
            found.append(diag("warning", "design_system_placeholder",
                              f"design system is '{system.get('status', 'unset')}' — "
                              f"placeholder groups: {groups}", rel(system_path),
                              "have the design agent replace them, then set status: designed"))

    # -- surfaces ----------------------------------------------------------
    surfaces = {}
    for path, data, err in load_design(root, "surfaces"):
        if err:
            found.append(diag("error", "design_invalid_json",
                              f"{path.stem} will not parse — {err}", rel(path)))
            continue
        surfaces[data.get("id", path.stem)] = data

        for field in ("id", "title", "capability", "status", "source_files", "components"):
            if not data.get(field):
                found.append(diag("error", "design_missing_field",
                                  f"{path.stem}: surface is missing `{field}`", rel(path)))
        if data.get("id") and data["id"] != path.stem:
            found.append(diag("error", "design_id_mismatch",
                              f"{path.stem}: id '{data['id']}' does not match the filename",
                              rel(path)))
        if data.get("status") and data["status"] not in SURFACE_STATUSES:
            found.append(diag("error", "design_invalid_enum",
                              f"{path.stem}: status '{data['status']}' is not one of "
                              f"{', '.join(SURFACE_STATUSES)}", rel(path)))
        cap = data.get("capability")
        if cap and not main_spec_path(root, cap).is_file():
            found.append(diag("warning", "design_surface_unknown_capability",
                              f"{path.stem}: capability '{cap}' has no spec yet", rel(path)))

        for comp in data.get("components", []):
            if not isinstance(comp, dict):
                found.append(diag("error", "design_missing_field",
                                  f"{path.stem}: a component entry is not an object", rel(path)))
                continue
            cid = comp.get("id", "(unnamed)")
            for field in ("id", "role", "purpose", "states"):
                if not comp.get(field):
                    found.append(diag("error", "design_missing_field",
                                      f"{path.stem} / {cid}: component is missing `{field}`",
                                      rel(path)))
            if comp.get("role") and comp["role"] not in COMPONENT_ROLES:
                found.append(diag("error", "design_invalid_enum",
                                  f"{path.stem} / {cid}: role '{comp['role']}' is not one of "
                                  f"{', '.join(COMPONENT_ROLES)}", rel(path)))

        sources = data.get("source_files", []) or []

        gone = [s for s in sources if not (root / s).is_file()]
        if gone:
            found.append(diag("error", "design_source_file_missing",
                              f"{path.stem}: source file(s) do not exist — "
                              f"{', '.join(gone[:3])}", rel(path),
                              "re-run the ui-surveyor skill; the surface has moved or been deleted"))

        missing_imports = sorted(local_ui_imports(root, sources) - set(sources))
        if missing_imports:
            found.append(diag(
                "warning", "design_surface_incomplete_sources",
                f"{path.stem}: {len(missing_imports)} UI file(s) imported by this surface are "
                f"not in source_files — {', '.join(missing_imports[:3])}", rel(path),
                "add them and re-survey — an incomplete list makes staleness detection "
                "silently miss changes. Leave one out only if it has no bearing on what "
                "renders."))

        for comp in data.get("components", []):
            cid = isinstance(comp, dict) and comp.get("id")
            if cid and sources and not component_is_traceable(root, cid, sources):
                found.append(diag(
                    "warning", "design_component_not_found",
                    f"{path.stem} / {cid}: component id appears in none of the source files",
                    rel(path),
                    "the component was renamed or never existed — the design agent will "
                    "write tickets against nothing"))

        changed = git_changed_since(root, data.get("generated_at_commit", ""), sources)
        if changed:
            found.append(diag("warning", "design_surface_stale",
                              f"{path.stem}: {len(changed)} source file(s) changed since "
                              f"{data.get('generated_at_commit', '')[:7]} — "
                              f"{', '.join(changed[:3])}", rel(path),
                              "re-run the ui-surveyor skill before designing against it"))

    # -- tickets -----------------------------------------------------------
    ticketed_surfaces = set()
    active = set(list_changes(root))
    for path, data, err in load_design(root, "tickets"):
        if err:
            found.append(diag("error", "design_invalid_json",
                              f"{path.stem} will not parse — {err}", rel(path)))
            continue

        for field in ("id", "surface", "targets", "type", "priority", "status",
                      "behavior_impact", "intent", "design", "acceptance"):
            if not data.get(field):
                found.append(diag("error", "design_missing_field",
                                  f"{path.stem}: ticket is missing `{field}`", rel(path)))
        if data.get("id") and data["id"] != path.stem:
            found.append(diag("error", "design_id_mismatch",
                              f"{path.stem}: id '{data['id']}' does not match the filename",
                              rel(path)))
        for field, allowed in (("type", TICKET_TYPES), ("status", TICKET_STATUSES),
                               ("priority", ITEM_PRIORITIES),
                               ("behavior_impact", BEHAVIOR_IMPACTS)):
            value = data.get(field)
            if value and value not in allowed:
                found.append(diag("error", "design_invalid_enum",
                                  f"{path.stem}: {field} '{value}' is not one of "
                                  f"{', '.join(allowed)}", rel(path)))
        if not data.get("acceptance"):
            found.append(diag("error", "design_no_acceptance",
                              f"{path.stem}: no acceptance criteria — nothing to verify against",
                              rel(path),
                              "add checkable statements a reader who did not write this could test"))

        sid = data.get("surface")
        ticketed_surfaces.add(sid)
        surface = surfaces.get(sid)
        if sid and surface is None:
            found.append(diag("error", "design_ticket_unknown_surface",
                              f"{path.stem}: surface '{sid}' has no manifest", rel(path),
                              "run /surface for it first"))
        elif surface:
            known = surface_components(surface)
            for target in data.get("targets", []):
                if target not in known:
                    found.append(diag("error", "design_ticket_unknown_target",
                                      f"{path.stem}: target '{target}' is not a component of "
                                      f"'{sid}'", rel(path)))
            styled = set((data.get("design") or {}).get("states", {}))
            for target in data.get("targets", []):
                for state in known.get(target, {}).get("states", []):
                    if state not in styled:
                        found.append(diag(
                            "warning", "design_state_not_covered",
                            f"{path.stem}: '{target}' declares state '{state}' but the ticket "
                            f"does not style it", rel(path),
                            "a design that skips loading/empty/error looks broken exactly when "
                            "users notice"))

        impact = data.get("behavior_impact")
        change = str(data.get("spec_change") or "").strip()
        if impact == "requires-spec-change":
            if not change:
                found.append(diag("error", "design_blocked_without_spec_change",
                                  f"{path.stem}: behavior_impact is 'requires-spec-change' but "
                                  f"spec_change is empty", rel(path),
                                  "run /propose for the behavior change and link its change-id"))
            elif change not in active and not find_archived(root, change):
                found.append(diag("error", "design_spec_change_not_found",
                                  f"{path.stem}: spec_change '{change}' is not a real change",
                                  rel(path)))

        for dotted, value in _walk_strings(data.get("design") or {}, "design"):
            if RAW_COLOR_RE.search(value):
                found.append(diag("warning", "design_raw_color_value",
                                  f"{path.stem}: raw color literal at {dotted} — "
                                  f"'{value[:48]}'", rel(path),
                                  "reference a token from system.json, or file a type:tokens "
                                  "ticket to add one"))

    for sid, surface in surfaces.items():
        if sid not in ticketed_surfaces and surface.get("status") == "functional":
            found.append(diag("info", "design_orphan_surface",
                              f"surface '{sid}' is functional with no design tickets",
                              f"openspec/design/surfaces/{sid}.json",
                              "run /design when it is ready for visual work"))
    return found


def design_summary(root: Path) -> dict:
    surfaces, tickets = [], []
    for path, data, err in load_design(root, "surfaces"):
        surfaces.append({"id": path.stem, "status": (data or {}).get("status", "?"),
                         "components": len((data or {}).get("components", [])),
                         "broken": bool(err)})
    for path, data, err in load_design(root, "tickets"):
        d = data or {}
        tickets.append({"id": path.stem, "surface": d.get("surface", "?"),
                        "type": d.get("type", "?"), "priority": d.get("priority", "?"),
                        "status": d.get("status", "?"),
                        "targets": d.get("targets", []),
                        "intent": d.get("intent", ""),
                        "behavior_impact": d.get("behavior_impact", "?"),
                        "spec_change": d.get("spec_change", ""),
                        "broken": bool(err)})
    tickets.sort(key=lambda t: (PRIORITY_ORDER.get(t["priority"], 9), t["id"]))
    system_path = design_dir(root) / "system.json"
    system, _ = load_json(system_path) if system_path.is_file() else (None, None)
    return {"surfaces": surfaces, "tickets": tickets,
            "system": {"status": (system or {}).get("status", "missing"),
                       "placeholderGroups": (system or {}).get("placeholder_groups", [])}}


# --------------------------------------------------------------------------
# Journal
# --------------------------------------------------------------------------

def journal_path(root: Path) -> Path:
    return root / "openspec" / "JOURNAL.md"


def read_journal(root: Path, limit: int) -> list:
    """Entries are `## YYYY-MM-DD — <summary>` blocks, newest first."""
    path = journal_path(root)
    if not path.is_file():
        return []
    lines = path.read_text(encoding="utf-8").splitlines()
    # The journal documents its own format in a fenced block at the top, and
    # entries quote spec headings routinely — same pre-pass, same reason.
    skip = fenced_lines(lines)
    heads = [i for i, l in enumerate(lines)
             if re.match(r"^##\s+\d{4}-\d{2}-\d{2}", l) and i not in skip]
    out = []
    for n, start in enumerate(heads[:limit] if limit else heads):
        end = heads[n + 1] if n + 1 < len(heads) else len(lines)
        head = lines[start][2:].strip()
        date, _, summary = head.partition("—")
        out.append({
            "date": date.strip(),
            "summary": summary.strip() or "(no summary)",
            "body": "\n".join(lines[start + 1:end]).strip(),
        })
    return out


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

def tally(found: list) -> tuple:
    """(errors, warnings, infos) — info is advisory and never affects exit code."""
    errors = sum(1 for d in found if d["severity"] == "error")
    infos = sum(1 for d in found if d["severity"] == "info")
    return errors, len(found) - errors - infos, infos


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

        # One requirement, one operation. The archive merge turns each operation
        # into a line range against the pre-merge spec; two operations on one
        # requirement produce two ranges with the same start, and applying the
        # first invalidates the second, which then overwrites an untouched
        # neighbour. Refusing the ambiguity is the fix — there is no ordering
        # that makes "remove it and also change it" mean something.
        targets: dict = {}
        for op in ("ADDED", "MODIFIED", "REMOVED"):
            for req in doc.sections.get(op, []):
                targets.setdefault(_norm(req.name), []).append((op, req.name, req.start + 1))
        for old, _new in doc.renames:
            targets.setdefault(_norm(old), []).append(("RENAMED", old, None))

        for hits in targets.values():
            if len(hits) < 2:
                continue
            op_names = sorted({op for op, _, _ in hits})
            name = hits[0][1]
            lineno = next((n for _, _, n in hits if n), None)
            where = f"{rel(delta)}:{lineno}" if lineno else rel(delta)
            if len(op_names) == 1:
                found.append(diag(
                    "error", "duplicate_requirement_in_delta",
                    f"{cap} / {name}: appears {len(hits)} times under "
                    f"`## {op_names[0]} Requirements`",
                    where,
                    "merge them into one requirement — duplicate names make every "
                    "later MODIFIED and REMOVED ambiguous",
                ))
            else:
                found.append(diag(
                    "error", "requirement_multiple_operations",
                    f"{cap} / {name}: targeted by {len(hits)} operations "
                    f"({', '.join(op_names)}) in one delta",
                    where,
                    "pick one — MODIFIED already replaces the whole requirement, "
                    "so REMOVED plus MODIFIED is never what you want",
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

        # Requirements are addressed by name — `find()` returns the first match,
        # so a duplicate makes every future MODIFIED, REMOVED, and RENAMED
        # silently pick one of them. Report it here because a spec that already
        # holds duplicates is otherwise inert: nothing complains until a later
        # delta quietly edits the wrong one.
        by_name: dict = {}
        for req in doc.requirements:
            by_name.setdefault(_norm(req.name), []).append(req)
        for dupes in by_name.values():
            if len(dupes) > 1:
                found.append(diag(
                    "error", "duplicate_requirement_in_spec",
                    f"{cap} / {dupes[0].name}: {len(dupes)} requirements share this name "
                    f"(lines {', '.join(str(d.start + 1) for d in dupes)})",
                    f"{rel}:{dupes[0].start + 1}",
                    "rename or merge them — until then every delta targeting this "
                    "name edits whichever comes first",
                ))

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
        seeded: set = set()
        for req in delta.sections.get("ADDED", []):
            if _norm(req.name) in seeded:
                raise ValueError(f"{cap}: ADDED '{req.name}' appears twice in the delta")
            seeded.add(_norm(req.name))
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

    # Every range above was computed against the pre-merge spec, so the splice
    # loop below is only correct while the ranges are disjoint. Two operations
    # on one requirement produce two ranges with the same start: the first
    # splice lands, and the second then writes into a window that now holds
    # whatever moved up behind it — destroying a requirement the delta never
    # mentioned. Bottom-up ordering handles disjoint ranges and cannot help
    # here. validate_change refuses this first; this is the guard that holds
    # when a delta is edited after being validated.
    ordered = sorted(edits, key=lambda e: (e[0], e[1]))
    for (start, end, _), (next_start, _, _) in zip(ordered, ordered[1:]):
        if end > next_start:
            raise ValueError(
                f"{cap}: two operations target overlapping requirement blocks "
                f"(lines {start + 1}-{end} and {next_start + 1}-) — a requirement "
                f"may be targeted only once per delta"
            )

    for start, end, replacement in sorted(edits, key=lambda e: e[0], reverse=True):
        lines[start:end] = replacement

    additions: list = []
    added: set = set()
    for req in delta.sections.get("ADDED", []):
        if main.find(req.name):
            raise ValueError(f"{cap}: ADDED '{req.name}' already exists")
        if _norm(req.name) in added:
            raise ValueError(f"{cap}: ADDED '{req.name}' appears twice in the delta")
        added.add(_norm(req.name))
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


def next_action(change: Change) -> str:
    """The single most useful next step for a change."""
    artifacts = change.artifact_status()
    blocked = [a["id"] for a in artifacts if a["status"] == "ready"]
    if blocked:
        return f"write `{blocked[0]}`"
    done, total = change.progress()
    if total and done < total:
        return "executor — implement remaining tasks"
    if not total:
        return "write tasks"
    if change.track == "full":
        gate = change.dir / "plan" / "production-gate.md"
        if not gate.is_file():
            return "/verify, then auditor"
        text = gate.read_text(encoding="utf-8")
        if "BLOCKED" in text and "Decision: `PASS`" not in text:
            return "executor — remediate gate violations"
        return "/archive"
    return "/verify, then /archive"


def render_board(root: Path, changes: list, items: list, entries: list,
                 diagnostics: list, design: dict) -> str:
    caps = [d.name for d in sorted((root / "openspec" / "specs").glob("*"))
            if d.is_dir()] if (root / "openspec" / "specs").is_dir() else []
    open_items = [i for i in items if i.is_open]
    blocked = [i for i in open_items if i.status == "blocked"]
    errors, warnings, _ = tally(diagnostics)

    out = ["BOARD   {} capabilit{} · {} active change{} · {} open backlog item{}".format(
        len(caps), "y" if len(caps) == 1 else "ies",
        len(changes), "" if len(changes) == 1 else "s",
        len(open_items), "" if len(open_items) == 1 else "s")]

    out.append("")
    out.append("ACTIVE CHANGES")
    if not changes:
        out.append("  (none — /propose to start one)")
    for change in changes:
        done, total = change.progress()
        tasks = f"{done}/{total}" if total else "—"
        out.append(f"  {change.name:<32} {change.track:<9} tasks {tasks:>7}   {next_action(change)}")

    out.append("")
    out.append(f"BACKLOG   {len(open_items)} open" + (f" · {len(blocked)} blocked" if blocked else ""))
    if not open_items:
        out.append("  (empty)")
    for item in open_items:
        link = f"→ {item.change}" if item.change else ""
        if item.status == "blocked" and item.blocked_by:
            link = f"⊘ blocked by {', '.join(item.blocked_by)}"
        out.append(f"  {item.priority.upper():<3} {item.type:<8} {item.id:<34} "
                   f"{item.status:<12} {link}")
    closed = [i for i in items if not i.is_open]
    if closed:
        out.append(f"  ({len(closed)} closed — `backlog list --status done`)")

    open_tickets = [t for t in design["tickets"] if t["status"] in TICKET_OPEN]
    if design["surfaces"] or open_tickets:
        blocked_t = [t for t in open_tickets if t["behavior_impact"] != "none"]
        out.append("")
        out.append(f"DESIGN   {len(design['surfaces'])} surface(s) · "
                   f"{len(open_tickets)} open ticket(s) · "
                   f"system: {design['system']['status']}"
                   + (f" · {len(blocked_t)} need a spec change" if blocked_t else ""))
        for t in open_tickets[:6]:
            flag = " ⊘" if t["behavior_impact"] != "none" else ""
            out.append(f"  {t['priority'].upper():<3} {t['id']:<9} {t['type']:<13} "
                       f"{t['surface']}{flag}")
        if len(open_tickets) > 6:
            out.append(f"  (+{len(open_tickets) - 6} more — `design tickets`)")

    out.append("")
    out.append("RECENT")
    if not entries:
        out.append("  (no journal entries — write one with /handoff)")
    for e in entries:
        out.append(f"  {e['date']}  {e['summary']}")

    out.append("")
    out.append(f"HEALTH   {errors} error(s), {warnings} warning(s)"
               + ("   — run `validate --all`" if errors or warnings else ""))

    out.append("")
    if errors:
        out.append("NEXT: fix validation errors — `validate --all`")
    elif changes:
        first = min(changes, key=lambda c: (c.track != "full", c.name))
        out.append(f"NEXT: {first.name} — {next_action(first)}")
    elif open_items:
        top = open_items[0]
        out.append(f"NEXT: {top.priority.upper()} {top.id} — /propose it")
    else:
        out.append("NEXT: nothing queued. /explore or /propose.")
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
    errors, warnings, infos = tally(found)
    lines.append("")
    summary = f"{errors} error(s), {warnings} warning(s)"
    if infos:
        summary += f", {infos} info"
    lines.append(summary)
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

    p_board = sub.add_parser("board", help="everything at a glance — the session-start view",
                             parents=[common])
    p_board.add_argument("--journal-limit", type=int, default=5,
                         help="recent journal entries to show (default 5)")

    p_backlog = sub.add_parser("backlog", help="backlog items", parents=[common])
    bsub = p_backlog.add_subparsers(dest="backlog_command")
    p_bl = bsub.add_parser("list", help="list items", parents=[common])
    p_bl.add_argument("--status", help="filter: " + " | ".join(ITEM_STATUSES) + " | all")
    p_bl.add_argument("--type", help="filter: " + " | ".join(ITEM_TYPES))
    p_bl.add_argument("--priority", help="filter: " + " | ".join(ITEM_PRIORITIES))
    p_bl.add_argument("--tag", help="filter by tag")
    p_bl.add_argument("--change", help="filter by linked change")
    p_bs = bsub.add_parser("show", help="show one item", parents=[common])
    p_bs.add_argument("item")

    p_journal = sub.add_parser("journal", help="recent session entries", parents=[common])
    p_journal.add_argument("--limit", type=int, default=10)

    p_design = sub.add_parser("design", help="UI surfaces and design tickets", parents=[common])
    dsub = p_design.add_subparsers(dest="design_command")
    dsub.add_parser("surfaces", help="list UI surfaces", parents=[common])
    p_dt = dsub.add_parser("tickets", help="list design tickets", parents=[common])
    p_dt.add_argument("--status", help="filter: " + " | ".join(TICKET_STATUSES) + " | open | all")
    p_dt.add_argument("--surface")
    p_dt.add_argument("--type")
    p_ds = dsub.add_parser("show", help="show one ticket or surface", parents=[common])
    p_ds.add_argument("item")

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

    if args.command == "board":
        changes = [Change(root, n) for n in list_changes(root)]
        items = load_backlog(root)
        entries = read_journal(root, args.journal_limit)
        found = []
        for change in changes:
            found.extend(validate_change(root, change, False))
        found.extend(validate_main_specs(root, False))
        found.extend(validate_backlog(root, False))
        found.extend(validate_design(root, False))
        design = design_summary(root)
        if args.json:
            print(json.dumps({
                "capabilities": [d.name for d in sorted((root / "openspec" / "specs").glob("*"))
                                 if d.is_dir()],
                "changes": [{"name": c.name, "track": c.track,
                             "progress": dict(zip(("complete", "total"), c.progress())),
                             "nextAction": next_action(c)} for c in changes],
                "backlog": [i.as_dict() for i in items],
                "design": design,
                "journal": entries,
                "status": found,
                "root": str(root),
            }, indent=2))
        else:
            print(render_board(root, changes, items, entries, found, design))
        return 0

    if args.command == "backlog":
        items = load_backlog(root)
        command = getattr(args, "backlog_command", None) or "list"

        if command == "show":
            match = next((i for i in items if i.id == args.item or i.slug == args.item), None)
            if not match:
                die(f"backlog item '{args.item}' not found", args.json)
            if args.json:
                print(json.dumps({**match.as_dict(), "body": match.body}, indent=2))
            else:
                print(f"{match.id}  [{match.priority.upper()} {match.type} {match.status}]")
                if match.change:
                    print(f"change: {match.change}")
                if match.capability:
                    print(f"capability: {match.capability}")
                if match.blocked_by:
                    print(f"blocked by: {', '.join(match.blocked_by)}")
                print(f"\n{match.body}")
            return 0

        wanted = (getattr(args, "status", None) or "open").lower()
        if wanted == "open":
            items = [i for i in items if i.is_open]
        elif wanted != "all":
            items = [i for i in items if i.status == wanted]
        for attr in ("type", "priority", "change"):
            value = getattr(args, attr, None)
            if value:
                items = [i for i in items if getattr(i, attr) == value.lower()]
        if getattr(args, "tag", None):
            items = [i for i in items if args.tag in i.tags]

        if args.json:
            print(json.dumps({"items": [i.as_dict() for i in items], "root": str(root)}, indent=2))
        elif not items:
            print("no matching backlog items.")
        else:
            for i in items:
                link = f"→ {i.change}" if i.change else ""
                print(f"  {i.priority.upper():<3} {i.type:<8} {i.id:<34} {i.status:<12} {link}")
        return 0

    if args.command == "design":
        summary = design_summary(root)
        command = getattr(args, "design_command", None)

        if command == "show":
            for kind in ("tickets", "surfaces"):
                path = design_dir(root) / kind / f"{args.item}.json"
                if path.is_file():
                    data, err = load_json(path)
                    if err:
                        die(f"{args.item} will not parse — {err}", args.json)
                    print(json.dumps(data, indent=2))
                    return 0
            die(f"no surface or ticket named '{args.item}'", args.json)

        if command == "surfaces":
            rows = summary["surfaces"]
            if args.json:
                print(json.dumps({"surfaces": rows, "root": str(root)}, indent=2))
            elif not rows:
                print("no surfaces yet — run /surface after building a UI.")
            else:
                for s in rows:
                    flag = "  !! will not parse" if s["broken"] else ""
                    print(f"  {s['id']:<32} {s['status']:<15} "
                          f"{s['components']:>2} component(s){flag}")
            return 0

        tickets = summary["tickets"]
        if command == "tickets":
            wanted = (getattr(args, "status", None) or "open").lower()
            if wanted == "open":
                tickets = [t for t in tickets if t["status"] in TICKET_OPEN]
            elif wanted != "all":
                tickets = [t for t in tickets if t["status"] == wanted]
            for attr in ("surface", "type"):
                value = getattr(args, attr, None)
                if value:
                    tickets = [t for t in tickets if t[attr] == value]

        if args.json:
            print(json.dumps({**summary, "tickets": tickets, "root": str(root)}, indent=2))
            return 0

        if command != "tickets":
            sysinfo = summary["system"]
            note = ("  ← still placeholder" if sysinfo["status"] != "designed" else "")
            print(f"DESIGN SYSTEM   {sysinfo['status']}{note}")
            print("")
            print(f"SURFACES   {len(summary['surfaces'])}")
            for s in summary["surfaces"]:
                print(f"  {s['id']:<32} {s['status']:<15} {s['components']:>2} component(s)")
            if not summary["surfaces"]:
                print("  (none — run /surface after building a UI)")
            print("")
        print(f"TICKETS   {len(tickets)}")
        if not tickets:
            print("  (none)")
        for t in tickets:
            blocked = " ⊘ needs spec change" if t["behavior_impact"] != "none" else ""
            targets = ", ".join(t["targets"][:2]) or "—"
            print(f"  {t['priority'].upper():<3} {t['id']:<9} {t['type']:<13} "
                  f"{t['status']:<12} {t['surface']}/{targets}{blocked}")
        return 0

    if args.command == "journal":
        entries = read_journal(root, args.limit)
        if args.json:
            print(json.dumps({"entries": entries, "root": str(root)}, indent=2))
        elif not entries:
            print(f"no journal entries. Create {journal_path(root).relative_to(root)} "
                  f"and add one — see .claude/references/tracking.md")
        else:
            for e in entries:
                print(f"## {e['date']} — {e['summary']}")
                if e["body"]:
                    print(e["body"])
                print()
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
        if args.all or not args.change:
            found.extend(validate_backlog(root, args.strict))
            found.extend(validate_design(root, args.strict))
        errors, warnings, infos = tally(found)
        if args.json:
            print(json.dumps({"status": found,
                              "summary": {"errors": errors, "warnings": warnings, "info": infos},
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
