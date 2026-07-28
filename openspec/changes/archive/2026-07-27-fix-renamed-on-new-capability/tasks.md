# Tasks

- [x] 1 Add the `renamed_no_main_spec` validation error to `validate_change`,
      and skip the source/target checks when there is no main spec to check
      against
- [x] 2 Make the `build_merged_spec` new-capability guard check `delta.renames`
      as well as `delta.sections`
- [x] 3 Add the fixture for `renamed_no_main_spec` — the coverage meta-test
      fails until it exists
- [x] 4 Replace the `@unittest.expectedFailure` test with one asserting the
      rename is now refused, and assert nothing was written or moved
- [x] 5 Confirm the existing rename tests still pass — a rename against a real
      main spec must be unaffected
- [x] 6 Close `renamed-dropped-on-new-capability`
