## ADDED Requirements

### Requirement: A Tool That Writes A Committed Artifact Pins Its Line Endings
Every text write performed by this repository's own tooling SHALL pin the line
ending it emits, and SHALL NOT inherit the platform default.

Python translates `\n` to `\r\n` on Windows unless `newline` is given.
`encoding` being pinned does not imply it: the archiver passed
`encoding="utf-8"` and still wrote 799 carriage returns into a merged spec,
which is the shape that makes this worth a rule rather than a habit — the write
looked careful.

`.gitattributes` normalises on commit, so the committed blob is never wrong.
The cost is in the working tree, where the guards run: CRLF once made two
matchers compare `\n` against `\r\n` and read nothing, and made a bundler refuse
a source file outright, so a guard suite collected zero tests and the run
reported failures about the platform rather than about the product.

**The rule SHALL be enforced by deriving from the source rather than by
inspecting output.** Output is normalised by the time it is committed, so a
check that reads committed files passes everywhere and proves nothing; and a
newly added writer must be covered on the day it is written, not on the day it
is noticed.

#### Scenario: A tool writes a file
- **WHEN** any tool in the repository writes text
- **THEN** the line ending it emits is the one it names, on every platform

#### Scenario: A new writer omits it
- **GIVEN** a tool gaining a text write that does not pin its line ending
- **WHEN** the guard runs
- **THEN** it fails, naming the file and the line

#### Scenario: The guard is looking at something
- **WHEN** the guard runs
- **THEN** it confirms it found the writers it is checking
- **AND** a scan that matched nothing fails rather than passing
