# Strategy Authoring — Delta

## ADDED Requirements

### Requirement: A Composition Can Be Previewed As The Agent Reads It

The product SHALL let a user preview a strategy's current composition
without saving or changing anything: the rendered report text per section
as an agent would receive it over a bounded live coin selection the user
chooses, the platform's estimated token count with the counting model
named, budget usage as used-against-cap for every gauge the platform
declares, and — derived from the same composition — which signals the
report can feed, with the platform's default allocation for each, and
which it cannot. The preview reads the strategy fresh; a platform refusal
SHALL be shown in the platform's words, and an unreadable strategy SHALL
never render as an empty preview.

#### Scenario: The agent's-eye report
- **GIVEN** a strategy with sections composed
- **WHEN** the user previews it over the top ranked coins
- **THEN** each section renders its title and the platform's actual report
  text
- **AND** the token estimate and its counting model are shown
- **AND** each budget gauge shows used against its cap

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

#### Scenario: An unreadable strategy is not an empty preview
- **GIVEN** the strategy cannot be read
- **WHEN** the user opens the preview
- **THEN** the page says the strategy could not be read and why
