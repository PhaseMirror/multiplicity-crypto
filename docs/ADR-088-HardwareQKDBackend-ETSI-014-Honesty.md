# ADR-088: HardwareQKDBackend (ETSI GS QKD 014) — Honest Labels and Wiring Decision

- **Status**: Accepted
- **Deciders**: Cryptography steward, TS owner, Docs owner, Crate maintainer
- **Date**: 2026-09-24
- **Companion**: Phase Mirror Round 2 (D-15); ADR-069 (QKD label correction)
- **Supersedes**: `ts/src/qkd.ts` `HardwareQKDBackend` output label semantics (partial); ADR-069's "no quantum hardware exists anywhere in the codebase" context sentence (now false)
- **Blocks**: None

## Context

`ts/src/qkd.ts:13-48` adds a `HardwareQKDBackend` class — an ETSI GS QKD 014 REST client (`fetch` → `POST /api/v1/keys/{saeId}/{enc|dec}`) that accepts a real quantum key (`quantumSecret = base64decode(data.keys[0].key)`) and feeds it through `simulateQKD` as `sharedSecret`, returning label `` `HARDWARE_QKD_ETSI_014:${key_ID}` ``.

Current facts:

- The class is **dead**: no caller, no test, no wiring into `MockQKDBackend` or any composition root (verified by grep across `ts/src`).
- When it *is* invoked with a real quantum key, `simulateQKD` still returns `{ label: 'SIMULATED_QKD' }` (line 115) — **a hardware-derived key is relabeled as simulated** in its own returned output path (the `HardwareQKDBackend`'s own label is honest, but the underlying pipeline output and any test that reads `simulateQKD(...)`'s label would see `SIMULATED_QKD`).
- ADR-069's context stated: "No quantum hardware, no entanglement, no BB84/E91 simulation ... exists anywhere in the codebase." A REST client to a QKD network API is a **quantum hardware API** — that sentence is now false even though the default path (tests, `MockQKDBackend`) is unchanged.
- README line 3 says "No quantum channel" — a hardware client whose purpose *is* to fetch keys from a quantum channel makes that sentence a statement about the default path, not about the codebase.

**Hidden assumptions named**:
1. "MockQKDBackend is the only backend" (ADR-069's world) was assumed still true after a second backend was added.
2. The label `SIMULATED_QKD` was assumed to mean "the pipeline is simulated" rather than "this key is simulated" — collapsing two distinct honesty axes into one string.
3. A dormant hardware client was assumed to stay dormant by code, not by review discipline.

## Decision

1. **The `label` field SHALL describe the key source, not the pipeline.** `simulateQKD` SHALL accept an optional `keySourceLabel` (default `'SIMULATED_QKD'`); `HardwareQKDBackend` SHALL pass `'HARDWARE_QKD_ETSI_014'` through so no test or caller can mistake a hardware key for a mock. (Alternative equally acceptable: stop returning a label from `simulateQKD` and require the caller to label.)

2. **ADR-069's context sentence SHALL be amended** (via this ADR's References or an ADR-069 amendment) to: "No quantum channel exists on the *default* executed path; a dormant `HardwareQKDBackend` ETSI GS QKD 014 client exists but is not wired."

3. **Wiring decision is explicit and recorded** (exactly one):
   - **(a) Park it** — mark `HardwareQKDBackend` `@experimental` / "not wired; research API surface"; no test may instantiate it; README does not list it as available.
   - **(b) Wire it** — add a test against a mock ETSI endpoint (e.g. `undici` `MockAgent` or a local stub), add a `README` line "ETSI GS QKD 014 hardware backend available on opt-in path", and remove the word `Mock` from the class docs describing only the mock.
   Recommended now: **(a)** — no hardware endpoint is on disk or in CI, so (b) would be an untested claim.

4. **F-MC-01 semantics unchanged**: the *string* "QKD" in user-facing titles still requires a quantum channel on the *executed* path. `HardwareQKDBackend`'s existence does **not** license retitling the crate "QKD Hybrid Encryption"; it licenses an internal comment that the hardware client exists.

5. **The internal header "QKD Simulator module for QKD Hybrid Encryption v1.0.1" (line 49)** SHALL be corrected per ADR-086 #5.

## Consequences

- No artifact silently mislabels a quantum key as simulated.
- ADR-069's factual premise is refreshed rather than left stale.
- The hardware surface is either honestly dormant or honestly tested — not a stranded claim.

## Testing

- `grep -n "HARDWARE_QKD_ETSI_014" ts/src/qkd.ts` shows the label reaches the pipeline output (not only `HardwareQKDBackend`).
- If (a): `grep -rn "new HardwareQKDBackend" ts/src/__tests__` returns 0; README does not list the class in "available backends".
- If (b): `npm test` includes a mock-endpoint test for `HardwareQKDBackend`; README line updated.
- `grep -rn "QKD Hybrid Encryption" ts/src` returns 0 (per ADR-086).

## References

- `ts/src/qkd.ts:1-116` (esp. 13-48, 73, 115)
- ADR-069 (QKD label correction + its now-stale context sentence, both committed in `3d49da5`), ADR-068 F-MC-01
- ADR-090 (provenance: the `3d49da5` same-commit artifact/ADR collision), ADR-091 (rule 4: premise updates SHALL be premised before merge)
- ETSI GS QKD 014 REST API standard
- ADR-086 (module header correction)

## Addendum (2026-09-24) — implemented, Decision 3 Option (b) WIRE

Ruled **Option (b) — Wire it**: the fork decision chooses an honest, tested surface over a dormant class.

- **Decision 1**: `simulateQKD` accepts an optional `keySourceLabel` on `QKDSimulatorInput` (default `'SIMULATED_QKD'` in the destructure) and returns it verbatim; `HardwareQKDBackend` passes `'HARDWARE_QKD_ETSI_014'` through and now returns `simulateQKD`'s output directly, so the label reaches the pipeline output on every path — no quantum key can be mistaken for a mock.
- **Decision 2**: ADR-069 line 19 amended to "No quantum channel exists on the *default* executed path; an opt-in `HardwareQKDBackend` ETSI GS QKD 014 REST client exists and is exercised only against mock endpoints in tests".
- **Decision 3 (b)**: `ts/src/__tests__/hardware-qkd-backend.test.ts` added — exercises `new HardwareQKDBackend` against local `node:http` mock endpoints (enci/dec path asserted per role, key derivation equality with the label override, mock-vs-hardware label distinction on identical bytes, unreachable endpoint, empty key list, and 503 responses). README records the opt-in path.
- **Decision 5**: verified `grep -rn "QKD Hybrid Encryption" ts/src` returns 0 (already satisfied post-ADR-086).
- **Verification performed before commit**: `npm test` 55/55 (8 files), `npm run build` clean, `npm run diff-vectors` 14/14 per language unchanged.