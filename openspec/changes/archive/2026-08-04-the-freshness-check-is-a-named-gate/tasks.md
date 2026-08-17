# Tasks

## 1. The freshness gate

- [x] 1.1 `scripts/ci.sh` gains a `freshness` gate using the existing `skip`
      helper, so the summary line matches every other gate
- [x] 1.2 With a credential: runs the live comparison; a stale record fails
- [x] 1.3 Without one: `skipped — no BATTLEGRID_API_KEY`, visible in the summary
- [x] 1.4 The gate measures and does not repair — no automatic re-probe
- [x] 1.5 Prove the skip path: `ci.sh` with no key shows the named skip

## 2. A credential is not consent to mutate

- [x] 2.1 The four mutating probes require `BATTLEGRID_LIVE_WRITES=1`
- [x] 2.2 `radar-probe` too — it attempts writes it expects refused, and that
      expectation is a claim about the platform
- [x] 2.3 A guard derives the mutating set from the surface record's own
      classification and fails on any ungated probe that can reach one
- [x] 2.4 The guard guards itself: an empty mutating set fails rather than
      passing vacuously
- [x] 2.5 Adding the constant but leaving the gate keyed on the credential
      alone is caught

## 3. The suite stops testing its own environment

- [x] 3.1 `config.test.ts` scrubs `BATTLEGRID_API_KEY` — a personal key made
      two "refuses to start without" cases pass

## 4. Absorb v5.1.0

- [x] 4.1 Re-probe: `docs/battlegrid-mcp-surface.json` at v5.1.0
- [x] 4.2 Regenerate `BATTLEGRID_MCP_REFERENCE.md` and
      `battlegrid-mcp-capabilities.json`
- [x] 4.3 Record what v5.1.0 changed: four crowd metrics added, nothing removed
- [x] 4.4 Update `BATTLEGRID_SURFACE_MAP.md`'s version line and deployment table

## 5. Gates

- [x] 5.1 `./scripts/ci.sh` green without a key
- [x] 5.2 `./scripts/ci.sh` green **with** a key — the case that was never run
- [x] 5.3 Prove the freshness gate fails: inject a stale version, confirm red,
      restore
- [x] 5.4 `openspec.py validate the-freshness-check-is-a-named-gate`
- [x] 5.5 No credential in the diff
