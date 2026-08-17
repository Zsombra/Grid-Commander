# Strategy Authoring — Delta

## ADDED Requirements

### Requirement: A Custom Table Is Carried Whole

A custom report section read from the platform SHALL keep its own
definition — title, section timeframe, and columns — and the product SHALL
send that definition back whenever the platform requires a self-contained
section. A strategy holding a custom table SHALL preview exactly as one
holding only platform sections does.

#### Scenario: A custom table read and previewed
- **GIVEN** a strategy whose report includes a custom table
- **WHEN** the user previews the composition
- **THEN** the table renders with its title and columns
- **AND** the preview is not refused

#### Scenario: A platform section carries no definition of its own
- **WHEN** a platform section is sent for preview
- **THEN** only its kind and key are sent
