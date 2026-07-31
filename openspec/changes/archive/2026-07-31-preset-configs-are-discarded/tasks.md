# Tasks

## 1. Carry the values to the domain
- [x] 1.1 `PositionManagementPreset` gains `config` (the platform's values or
      null — never invented), `tagline`, `cardSummary`.
- [x] 1.2 `mapPositionPresets` carries all three through; a non-object config
      maps to null.

## 2. Send them
- [x] 2.1 `positionManagementForPreset(catalog, presetId)` in
      trading-config.ts: the preset's own fourteen values + its label, or null
      when the catalog cannot answer.
- [x] 2.2 `CreateAgentRequest.positionPreset?`: unknown name or config-less
      preset → validation issue (the brain-preset shape); a known preset uses
      its own values; absent or CUSTOM → the assembled path, unchanged.

## 3. Offer them
- [x] 3.1 The create form regains its position-management fieldset: CUSTOM
      (default, described as the assembled set) + each catalog preset carrying
      a config, with label and description.
- [x] 3.2 The create action passes `positionPreset` through.

## 4. Verification
- [x] 4.1 Mapper tests: config/tagline/cardSummary carried; malformed config
      → null.
- [x] 4.2 Command tests: preset path sends exactly the platform's values +
      label; unknown preset refused; CUSTOM/absent unchanged.
- [x] 4.3 Fake catalog carries one preset with a full 14-field config and one
      without, so both offer/withhold branches are exercised.
- [x] 4.4 Wire conformance: a preset-path create payload passes
      payload-conformance and wire-values (closed 15-key object, enum'd
      label).
- [x] 4.5 All gates green; backlog item closed with the OURS note.
