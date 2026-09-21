# ADR-068: Phase Mirror Diagnostic — multiplicity-crypto Label-to-Path Dissonance

- **Status**: Proposed (workspace verification only; not on origin SHA)
- **Deciders**: Crate maintainer, TS owner, Docs owner, Formal Methods Steward
- **Date**: 2026-09-20
- **Companion**: PM-MC-001 (Phase Mirror on multiplicity-crypto and Lawful Recursion v1.0)
- **Supersedes**: None
- **Blocks**: None

## Context

The `packages/multiplicity-crypto` package ships under the label "QKD Hybrid Encryption v1.0.1" but its executed paths are:

- TypeScript: `MockQKDBackend.simulateQKD()` → SHA-256 + HKDF + AES-256-GCM (2/2 tests pass with `--globals` flag)
- Commitment: SHA-256 stub tagged `PM-COMMIT-p${prime}` (WASM BN254 path unreachable — `rust/pkg/commitment_wasm` does not exist)
- Python: Package unimportable (`from . import agi` at `__init__.py:32` is unwrapped); numpy/sympy/pytest/pirtm absent; bridge files `ts/python/crypto_bridge.js` and `ts/dist/src/index.js` absent
- Rust: Keccak256 transcript 2/2 (correct)

The Phase Mirror diagnostic (PM-MC-001) identifies ten dissonances (D-01 through D-10) between what the README claims and what the code executes. D-01 through D-05 and D-06 are P0.

**Authority note**: ADR-066 is occupied by PIRTM Ξ-Constitution (`packages/PIRTM/docs/adr/proposed/ADR-066-Xi-Constitution-and-Xi-License-Integration.md`). ADR-067 is occupied by `artifacts/ADR-067-Refuse-Conversation-Green-Multiplicity-Crypto.md`. This ADR uses 068.

LawfulRecursionVersion 1.0 is the stack's computational L0 (contraction c < 1). This crate does not get a private constitution. If it claims lawful prime recursion, it owes the Core fragment's engineering notes, not a new Article IX.

## Decision

1. **Labels must match executed paths** (F-MC-01, F-MC-02):
   - README "QKD Hybrid Encryption v1.0.1" → "Simulated Classical Hybrid Encryption with Prime-Indexed Tags v1.0.1"
   - README "Pedersen commitment (WASM-backed BN254)" → "SHA-256 commitment with prime-indexed domain tags; BN254 WASM not built"
   - The string "QKD" is refused in user-facing titles unless a quantum channel exists on the executed path
   - The string "Pedersen"/"BN254" is refused as a capability claim unless `rust/pkg/commitment_wasm` exists and is loaded

2. **Python package import must succeed** (F-MC-03): Wrap `from . import agi` (and all other non-existent submodule imports) in `try/except` in `py/multiplicity/__init__.py`. No ImportError may propagate from package load.

3. **Test runner must be declared and configured** (F-MC-04): Add `vitest` to `ts/package.json` devDependencies. Create `ts/vitest.config.ts` with `globals: true`. `npm test` must pass from `ts/` with no extra flags.

4. **LawfulRecursionHash** (F-MC-05): Field may not ship as "[computed on commit]". Since this crate does not produce a LawfulRecursionHash, the field must be absent or explicitly documented as "not computed" in this ADR.

5. **Contractivity gate** (F-MC-06): `feedback.ts:36-57` implements a valid inequality but has no test. Add a test or stop citing c < 1 in documentation.

6. **D-07 through D-10** are policy bindings from companion papers (Ξ-Constitution, commercial catalog, Phase Mirror diagnostic coat, PQ honesty). This crate does not get to reopen them.

## Consequences

- README changes remove photon/Pedersen/BN254 capability claims from the package surface
- `import multiplicity` will exit 0 after `__init__.py` fix (subject to numpy/sympy/pytest/pirtm being installed)
- `npm test` will work without manual vitest install
- Package is explicitly research-grade, not production-certified
- The crate may not be wired to `/creations Certified`, POST `/close`, or hosted PMCP SKU until D-01 through D-06 are closed

## Testing

- TypeScript: `cd ts && npm test` — must pass (currently 2/2 with `--globals`, must pass without)
- Python: `python3 -c "import multiplicity"` — must exit 0
- Rust: `cargo test` — already 2/2
- TypeScript type check: `npx tsc --noEmit` — must pass (currently clean)

## References

- PM-MC-001: Phase Mirror on multiplicity-crypto and Lawful Recursion v1.0
- PHASE_MIRROR_AUDIT.md: Engineering mismatch audit (this package)
- TEST_RESULTS.md: Test execution results
- F-MC-01 through F-MC-12: Fail-closed workshop rules from PM-MC-001 §6
- LawfulRecursionVersion 1.0: Computational L0 (contraction c < 1)
