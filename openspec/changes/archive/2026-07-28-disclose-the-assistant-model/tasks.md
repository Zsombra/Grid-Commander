# Tasks: Disclose The Assistant Model

## The port knows who answers

- [x] `AssistantDisclosure` in the domain — either nothing answers, or a named
      recipient outside this product
- [x] `AssistantPort.describe()` returning it
- [x] `NotConfiguredAssistant.describe()` — nothing answers, nothing is sent
- [x] `ClaudeAssistant.describe()` — names Anthropic, not the model version
- [x] Test: the two implementations disclose differently, and neither can
      report "nothing is sent" while being able to send

## The page can reach it

- [x] `DescribeAssistantQuery`, wired in the composition root against the same
      instance `askAssistant` uses
- [x] Test: it reports what the configured port reports, with no second source
- [x] The page renders the disclosure from the query, with the question box
- [x] Test: no route imports infrastructure to get this — the existing
      architecture guard still fires

## Guards

- [x] Test: a deployment with a model configured discloses a named recipient
- [x] Test: a deployment with none discloses no recipient, and does not claim
      data is sent
- [x] Test: the disclosure does not depend on a question having been asked
- [x] Test: the sentence is built from the disclosure value, not hardcoded
- [x] Test: it is rendered, not merely computed. **Added after a missed
      mutation** — see below.
- [x] Re-demonstrate each guard failing against a re-injected defect, into a
      copy rather than the working tree — 12 defects, 12 caught

**One missed on the first sweep, and it was a real gap.** Deleting the sentence
from the page's JSX left the whole suite green: the structural test asserted the
query was *called*, not that its result was *shown*. A disclosure computed and
never rendered is the exact failure this requirement describes, and worse than
having none — the code would look like it discloses. Three tests added (rendered,
not conditional on a question, inside the form); all three re-demonstrated
failing.

## Gates

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm test` — 448 passing, up from 435
- [x] `npm run build`
- [x] `./scripts/check.sh`
- [x] `./scripts/check-serving.sh`
- [x] Render `/assistant` in both deployment states and look at it

## What rendering found

**The disclosure split the label from its input.** Placed after
`<label for="q">Your question</label>`, it left four lines of text between the
label and the box it names — still associated programmatically, visually two
unrelated things. Moved above the label, where it reads as context for the whole
form. Not something any assertion in this change would have caught.

**A stale server nearly became the proof.** The second screenshot came back
identical to the first, because the restarted `npm start` had exited 1 on a held
port and curl reached the *old* process. Same failure the serving gate was
hardened against, hit again from the other direction. The third run checked the
port was free first and confirmed the shot came from the pid it launched.

**Text inputs ignore dark mode.** Visible directly beneath the disclosure in
`docs/merge/proof/assistant-disclosure-dark.png` — white box on a near-black
page. Pre-existing, not caused by this change, and the whole form-control family
is affected. Filed as `form-inputs-ignore-dark-mode` (P2) rather than patched
here, since the fix is one treatment for every form in the product.

Proof: `docs/merge/proof/assistant-disclosure-light.png`,
`docs/merge/proof/assistant-disclosure-dark.png`. Harness route deleted; the
build no longer contains it.
