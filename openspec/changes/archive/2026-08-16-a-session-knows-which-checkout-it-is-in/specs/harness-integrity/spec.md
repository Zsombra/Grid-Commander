## ADDED Requirements

### Requirement: A Session Asserts The Checkout It Is Standing In
Before a session treats `git` output as evidence about its own work,
Grid-Commander SHALL assert that the working directory is part of the repository
that git answers for, and MUST refuse to report a clean state when it is not.

A worktree that loses its `.git` file does not fail — it becomes invisible. Git
walks up to the parent repository and answers every command for that checkout,
so `git status` reports clean truthfully about a branch the operator is not on,
while every edit lands in a path the parent is configured to ignore. Nothing
errors, and the check people actually use is the one that lies.

**The signature is that the working directory is ignored by the repository
answering for it.** A healthy worktree's own repository does not ignore its own
root; a dead one is answered for by a repository that does. The assertion is
therefore `git check-ignore` against the working directory, read together with
`git rev-parse --show-toplevel`, and not a comparison of paths alone — a path
comparison cannot tell a worktree from a subdirectory.

A clean `git status` is not evidence that edits landed.

#### Scenario: A healthy checkout
- **WHEN** the preflight runs in a valid checkout or worktree
- **THEN** it passes
- **AND** it says nothing that would train the reader to ignore it

#### Scenario: A working directory the answering repository ignores
- **WHEN** the preflight runs where `git` answers from a repository that ignores
  the working directory
- **THEN** it fails loudly
- **AND** names the directory, the repository answering for it, and the ignore
  rule that matched
- **AND** states that a clean status describes the other checkout

#### Scenario: Not a checkout at all
- **WHEN** the preflight runs where `git` finds no repository
- **THEN** it says so plainly rather than reporting the ignored-directory failure

#### Scenario: The guard is runnable without the harness
- **WHEN** an operator suspects the state of a directory
- **THEN** the same assertion is available as a command in the repository
- **AND** its exit status distinguishes pass from failure
