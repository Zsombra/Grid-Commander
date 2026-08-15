# Tasks

- [x] 1.1 `capture_mcp_dump.py`: fetch `prompts/get` per listed prompt and
      `resources/read` per listed resource into `promptbodies.json` /
      `resourcebodies.json` — raw envelopes, named failure per refused
      entry, no abort on one failure. **The named-failure path proved
      itself on its first run**: all five prompts refused `-32602` for a
      missing `arguments` key, which is how we learned the container is
      mandatory even though every argument in it is optional.
- [x] 1.2 `generate_mcp_reference.py`: fold `promptBodies` /
      `resourceContents` into the capabilities record; render Server
      instructions, prompt bodies, and resource contents in the reference.
      A dump predating prose capture fails loudly rather than emitting a
      record that describes the prose as absent.
- [x] 1.3 Re-run the capture against the live server; regenerate both
      artifacts; review the diff. Reference +552 lines; all five bodies
      and three resource contents recorded (`author-strategy` 5,863
      chars).
- [x] 1.4 Offline half in `tests/architecture/surface-freshness.test.ts`:
      record carries the prose surfaces (body xor named failure per
      entry); reference renders what the record carries. Both refusal
      paths driven by fixture.
- [ ] 1.5 Live prose digest gate in `tests/live/surface-freshness.test.ts`,
      normalising the account greeting before digesting; skips without a
      key; proven in this session's keyed run.
- [ ] 1.6 Gates: tsc, lint, vitest, validate.
