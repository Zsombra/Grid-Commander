# Proposal: A Guard Must Also Pass When Nothing Is Wrong

## Why

The requirement `a-guard-nobody-has-seen-fail` merged says only what must make a
guard **fail**. A rule that fails unconditionally satisfies every scenario as
written, and so does one broad enough to report the whole tree. Neither is a
guard, and the contract as merged cannot say so.

The gap was caught by the superseded parallel proposal of that same change
(GitHub #123): its spec carried a scenario the landed one did not — *the product
is clean and the rule is intact, and the guard passes*. It also stated a second
property the landed spec left as prose in the proposal: the mutation check stays
**out** of the ordinary suite, because mutating files on disk mid-suite is
stateful and slow, and a gate people route around protects nothing.

## What Changes

Two MODIFIED requirements on `harness-integrity`, each gaining one scenario and
one sentence:

- **An Architecture Guard Fails When Its Own Matcher Stops Working** — also
  SHALL pass on a clean product with the matcher intact. Every repaired guard
  already does this in practice (`permits an ordinary constant that merely holds
  a number`, `reports nothing for a probe that only reads`, `leaves this
  product's actual dependencies alone`); the contract now requires what the
  practice already is.
- **The Mutation Check Is A Command In The Repository** — and SHALL NOT run as
  part of the ordinary suite. It is run deliberately, by a person auditing a
  guard.

## What is deliberately not here

No new code and no new meta-guard. The clean-pass scenario is exercised by every
ordinary suite run — the sixteen guards pass on the clean tree today — and a
meta-guard grepping for the absence of `mutate-guard` in gate scripts would be a
spelled check, this repository's characteristic defect. The tasks verify both
properties by measurement and record the evidence; the spec carries the
obligation forward.

## Capabilities

**Modified**: `harness-integrity` — two MODIFIED requirements, no behavioural
change to any guard or tool.
