## MODIFIED Requirements

### Requirement: A Composition Can Be Previewed As The Agent Reads It

The product SHALL let a user preview a strategy's current composition
without saving or changing anything: the rendered report text per section
as an agent would receive it over a bounded live coin selection the user
chooses, budget usage as used-against-cap for every gauge the platform
declares — **the estimated token count among them, since v9.0.0 publishes it
that way** — with the counting model named, and — derived from the same
composition — which signals the report can feed, with the platform's default
allocation for each, and which it cannot. The preview reads the strategy fresh;
a platform refusal SHALL be shown in the platform's words, and an unreadable
strategy SHALL never render as an empty preview.

**A cost SHALL be shown against its ceiling.** A bare figure cannot answer the
question an author actually has, which is not "how large is this" but "how much
room is left". Grid-Commander SHALL NOT reconstruct a figure the platform has
stopped publishing, nor report as unavailable a figure it is displaying
elsewhere on the same surface.

#### Scenario: The agent's-eye report
- **GIVEN** a strategy with sections composed
- **WHEN** the user previews it over the top ranked coins
- **THEN** each section renders its title and the platform's actual report
  text
- **AND** each budget gauge shows used against its cap, the token estimate
  included
- **AND** the model that did the counting is named as a note on the measurement

#### Scenario: A figure the platform no longer publishes
- **WHEN** the platform stops returning a figure it once returned separately
- **THEN** no surface claims that figure is unavailable while showing it in
  another form
- **AND** it is not reconstructed from the form that replaced it

#### Scenario: Which signals the composition feeds
- **WHEN** the preview renders
- **THEN** the signals the report can feed are listed with their platform
  default allocations
- **AND** the count of signals the composition cannot feed is stated

#### Scenario: Nothing is written
- **WHEN** a preview runs
- **THEN** no write reaches the platform and the strategy is unchanged

#### Scenario: A refused preview teaches
- **GIVEN** the platform refuses the composed draft
- **WHEN** the preview runs
- **THEN** the refusal is shown in the platform's words on the same page
