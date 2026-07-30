# Tasks: A Control That Does Nothing

## The guard first

Written before the fix, so it was watched failing against the product as it
stood rather than against a defect invented afterwards.

- [x] Every named control inside a form bound to a Server Action must appear in
      a file that defines one
- [x] A GET form is excluded — it navigates, its values go to the query string
      and are read from `searchParams`
- [x] Demonstrated failing now: it named `positionManagementPreset` and nothing
      else

## Establish the real scope

- [x] Probe the whole presentation layer rather than assuming it was one control
- [x] Four candidates, three of them false positives, each checked:
      `plan` is read via `compiledPlan(formData, 'plan')`; `q` and `tagline` are
      GET forms read from `searchParams`
- [x] One real defect: `positionManagementPreset`

## The fix

- [x] Remove the position-management fieldset from the create form
- [x] Record in the file why it is absent and what would be needed to offer it,
      so the next reader does not restore it
- [x] Confirm `catalog` is still used by the rest of the form — it is, three times

## Housekeeping

- [x] Close the DL-106 blind-spot note at the top of `reachability.test.ts`; it
      described exactly this gap and is now the check below it

## Guards

- [x] Re-inject each defect and watch the guard fail — 3 injected, 3 caught:
      the discarded control re-added, any new unread control, and a GET form
      losing its `method` (which must make `q` an orphan, proving the exclusion
      is load-bearing rather than a blanket skip)

## Gates

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm test` — 486 passing, up from 483
- [x] `npm run build`
- [x] `./scripts/check.sh`
- [x] `./scripts/check-serving.sh`

## Not done

**Position management is still not settable.** It needs fourteen independently
settable fields plus the preset label, and `PositionManagementPreset` carries
only `preset`, `label` and `description` — this product does not hold the values
a complete `tradingConfig` requires. Owned by `agent-edit-form` (the feature) and
`a-preset-does-not-constrain-its-config` (the finding that establishes why a
dropdown cannot express it). Not restated as an open task here.

## What this cost to leave

The blind spot was written down in `reachability.test.ts` when
`close-the-reachability-gap` shipped, naming this exact control and this exact
line. It survived two further changes and a production gate in that state. **A
documented gap is still a gap** — writing it down bought traceability, not
safety, and the user whose position-management choice was discarded would not
have been consoled by the comment.
