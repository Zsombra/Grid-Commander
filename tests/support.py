"""Shared fixtures for the openspec.py regression suite.

The tool is loaded by path rather than imported, because it lives under
`.claude/tools/` and is a script, not a package. Everything runs in-process
against a throwaway project tree so a test can assert on the bytes the tool
wrote, not just on what it printed.
"""

from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
import textwrap
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TOOL_PATH = REPO_ROOT / ".claude" / "tools" / "openspec.py"


def load_tool():
    """Import openspec.py by path, once per process."""
    if "openspec_under_test" in sys.modules:
        return sys.modules["openspec_under_test"]
    spec = importlib.util.spec_from_file_location("openspec_under_test", TOOL_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules["openspec_under_test"] = module
    spec.loader.exec_module(module)
    return module


openspec = load_tool()


class Result:
    def __init__(self, code: int, out: str, err: str):
        self.code = code
        self.out = out
        self.err = err

    def json(self) -> dict:
        return json.loads(self.out)

    def diagnostics(self) -> list:
        return self.json().get("status", [])

    def codes(self) -> set:
        return {d["code"] for d in self.diagnostics()}

    def severity_of(self, code: str):
        return next((d["severity"] for d in self.diagnostics() if d["code"] == code), None)

    def __repr__(self) -> str:  # shows up in assertion failures
        return f"Result(code={self.code}, out={self.out!r}, err={self.err!r})"


def dedent(text: str) -> str:
    return textwrap.dedent(text).lstrip("\n")


# --------------------------------------------------------------------------
# Canned spec bodies
# --------------------------------------------------------------------------

MAIN_SPEC = dedent("""
    # Widgets Specification

    ## Purpose

    Widgets exist so the rest of the system has something to hold on to, and so
    these fixtures have a capability with more than one requirement in it.

    ## Requirements

    ### Requirement: Alpha
    The system SHALL alpha.

    #### Scenario: Alpha happens
    - **WHEN** alpha is requested
    - **THEN** alpha occurs

    #### Scenario: Alpha is refused
    - **WHEN** alpha is not permitted
    - **THEN** the request is rejected

    ### Requirement: Beta
    The system SHALL beta.

    #### Scenario: Beta happens
    - **WHEN** beta is requested
    - **THEN** beta occurs

    ### Requirement: Gamma
    The system SHALL gamma.

    #### Scenario: Gamma happens
    - **WHEN** gamma is requested
    - **THEN** gamma occurs
""")


def added_delta(name: str = "Delta", purpose: str = "") -> str:
    # Interpolating a multi-line value *inside* dedent() would flatten the
    # common indent to nothing and leave the whole block indented — so the
    # Purpose is prepended after dedenting, not before.
    head = f"## Purpose\n\n{purpose}\n\n" if purpose else ""
    body = dedent(f"""
        ## ADDED Requirements

        ### Requirement: {name}
        The system SHALL {name.lower()}.

        #### Scenario: {name} happens
        - **WHEN** {name.lower()} is requested
        - **THEN** {name.lower()} occurs
    """)
    return head + body


# --------------------------------------------------------------------------
# Project tree
# --------------------------------------------------------------------------

class Project:
    """A throwaway repo with an openspec/ tree, driven through the real CLI."""

    def __init__(self, base: Path):
        self.root = base
        for sub in ("changes/archive", "specs", "backlog", "design/surfaces", "design/tickets"):
            (self.root / "openspec" / sub).mkdir(parents=True, exist_ok=True)

    # -- writing -----------------------------------------------------------

    def write(self, rel: str, text: str) -> Path:
        path = self.root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        return path

    def read(self, rel: str) -> str:
        return (self.root / rel).read_text(encoding="utf-8")

    def exists(self, rel: str) -> bool:
        return (self.root / rel).exists()

    def main_spec(self, capability: str = "widgets", text: str = MAIN_SPEC) -> Path:
        return self.write(f"openspec/specs/{capability}/spec.md", text)

    def change(self, name: str = "a-change", track: str = "standard",
               skip_specs: bool = False, tasks: str = "- [x] 1.1 do the thing") -> Path:
        self.write(f"openspec/changes/{name}/.openspec.yaml",
                   f"track: {track}\ncreated: 2026-07-27\n"
                   f"skip_specs: {'true' if skip_specs else 'false'}\n")
        self.write(f"openspec/changes/{name}/proposal.md", "# Proposal\n")
        if tasks is not None:
            self.write(f"openspec/changes/{name}/tasks.md", f"# Tasks\n\n{tasks}\n")
        return self.root / "openspec" / "changes" / name

    def delta(self, change: str, capability: str, text: str) -> Path:
        return self.write(f"openspec/changes/{change}/specs/{capability}/spec.md", text)

    def archived(self, name: str) -> Path:
        """An archived change folder, as `archive` would have left it."""
        path = self.root / "openspec" / "changes" / "archive" / name
        path.mkdir(parents=True, exist_ok=True)
        (path / "proposal.md").write_text("# Proposal\n", encoding="utf-8")
        return path

    def backlog(self, slug: str = "an-item", body: str = "# An item\n\n## What\n\nA thing.\n",
                **fields) -> Path:
        meta = {"id": slug, "title": "An item", "type": "debt", "status": "open",
                "priority": "p2", "created": "2026-07-27", "updated": "2026-07-27",
                "change": "", "capability": "", "blocked_by": [], "tags": []}
        meta.update(fields)
        lines = ["---"]
        for key, value in meta.items():
            if isinstance(value, list):
                lines.append(f"{key}: [{', '.join(value)}]")
            elif value == "":
                lines.append(f'{key}: ""')
            else:
                lines.append(f"{key}: {value}")
        lines.append("---")
        lines.append("")
        return self.write(f"openspec/backlog/{slug}.md", "\n".join(lines) + body)

    def raw_backlog(self, slug: str, text: str) -> Path:
        return self.write(f"openspec/backlog/{slug}.md", text)

    # -- design ------------------------------------------------------------

    def system(self, **fields) -> Path:
        data = {"status": "designed", "placeholder_groups": []}
        data.update(fields)
        return self.write("openspec/design/system.json", json.dumps(data, indent=2))

    def surface(self, sid: str = "a-surface", **fields) -> Path:
        data = {
            "id": sid,
            "title": "A surface",
            "capability": "widgets",
            "status": "functional",
            "source_files": [],
            "components": [
                {"id": "thing-list", "role": "display", "purpose": "Lists things",
                 "states": ["default"]},
            ],
        }
        data.update(fields)
        return self.write(f"openspec/design/surfaces/{sid}.json", json.dumps(data, indent=2))

    def ticket(self, tid: str = "a-ticket", **fields) -> Path:
        data = {
            "id": tid,
            "surface": "a-surface",
            "targets": ["thing-list"],
            "type": "restyle",
            "priority": "p2",
            "status": "open",
            "behavior_impact": "none",
            "intent": "Make it legible",
            "design": {"states": {"default": {"background": "surface.raised"}}},
            "acceptance": ["The list reads as a single group"],
        }
        data.update(fields)
        return self.write(f"openspec/design/tickets/{tid}.json", json.dumps(data, indent=2))

    # -- running -----------------------------------------------------------

    def run(self, *argv: str, root_first: bool = True) -> Result:
        args = (["--root", str(self.root), *argv] if root_first
                else [*argv, "--root", str(self.root)])
        return run_cli(args)

    def validate(self, *extra: str) -> Result:
        return self.run("validate", "--all", "--json", *extra)

    # -- git ---------------------------------------------------------------

    def git(self, *args: str) -> subprocess.CompletedProcess:
        return subprocess.run(
            ["git", "-C", str(self.root), "-c", "user.email=t@example.com",
             "-c", "user.name=Test", *args],
            capture_output=True, text=True, check=True,
        )

    def git_init_and_commit(self, message: str = "init") -> str:
        """Initialise a repo (idempotent), commit everything, return the SHA."""
        if not (self.root / ".git").is_dir():
            self.git("init", "-q", "-b", "main")
        self.git("add", "-A")
        self.git("commit", "-q", "-m", message, "--allow-empty")
        return self.git("rev-parse", "HEAD").stdout.strip()


def run_cli(argv: list) -> Result:
    """Invoke the CLI in-process, capturing output and the exit code."""
    out, err = io.StringIO(), io.StringIO()
    try:
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = openspec.main(list(argv))
    except SystemExit as exc:            # die() raises this
        code = exc.code if isinstance(exc.code, int) else 1
    return Result(code, out.getvalue(), err.getvalue())


@contextlib.contextmanager
def cwd(path: Path):
    previous = Path.cwd()
    os.chdir(path)
    try:
        yield
    finally:
        os.chdir(previous)


class ProjectTestCase(unittest.TestCase):
    """Gives each test its own project tree, removed afterwards."""

    def setUp(self) -> None:
        self._tmp = tempfile.mkdtemp(prefix="openspec-test-")
        self.addCleanup(shutil.rmtree, self._tmp, True)
        self.project = Project(Path(self._tmp).resolve())

    def assertCode(self, result: Result, code: str, severity: str = None) -> dict:
        found = [d for d in result.diagnostics() if d["code"] == code]
        self.assertTrue(
            found, f"expected diagnostic {code!r}; got {sorted(result.codes())}")
        if severity:
            self.assertEqual(
                found[0]["severity"], severity,
                f"{code} should be a {severity}, not a {found[0]['severity']}")
        return found[0]

    def assertNoCode(self, result: Result, code: str) -> None:
        self.assertNotIn(code, result.codes(),
                         f"did not expect {code!r}; got {sorted(result.codes())}")


def git_available() -> bool:
    return shutil.which("git") is not None
