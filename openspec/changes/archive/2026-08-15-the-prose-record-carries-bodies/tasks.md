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
- [x] 1.5 Live prose digest gate in `tests/live/surface-freshness.test.ts`,
      normalising the account greeting before digesting; skips without a
      key. **Proven live against v19.1.0: 23/23**, the ten new cases
      covering the instructions, all five prompt bodies and all three
      resource contents. A recorded refusal does not exempt a surface
      forever — the fetch is retried and a body arriving where the record
      says refused is the finding.
- [x] 1.6 Gates: tsc, lint, 200 files / 2498 tests, validate 0 errors.
      An adversarial review of this change found four defects in it,
      fixed in `98b01ec` — the serious one being that a transport-level
      refusal (a 429 arrives as an `OSError`, not an error envelope)
      would have aborted the harvest and lost every entry already
      fetched, contradicting this change's own contract.
