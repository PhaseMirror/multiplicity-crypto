# ADR-085: WASM / BN254 Artifact — Binary Wire-or-Remove (no resting `compiled` state)

- **Status**: Accepted (resolved as Option B — REMOVE)
- **Deciders**: Rust owner, TS owner, Crate maintainer, Docs owner
- **Date**: 2026-09-24
- **Companion**: Phase Mirror Round 2 (D-11, D-16); ADR-070; ADR-084 (role `compiled`); ADR-090 (provenance); SOURCES.md "Rust Dependencies (WASM Not Built)"; README.md lines 3, 19
- **Supersedes**: README "No BN254 WASM on disk"; README "BN254 WASM not built"; `rust/Cargo.toml` description "WASM not built"; SOURCES.md line 115; the (previous, withdrawn) recommendation to keep the artifact in a permanent "compiled but not wired" state
- **Blocks**: None

## Context

A wasm-pack build of the Rust crate **exists on disk**, pinned by identity, while the crate's own documentation asserts it does not exist.

Provenance (pinned): `rust/pkg/multiplicity_crypto_rust_bg.wasm` **and** both fail-closed loaders (`ts/src/wasmLoader.ts`, `py/multiplicity/crypto/wasm_loader.py`) entered in the **same commit — `2c7d4f7` "ADR-075"**. This is how the fiction arose: the artifact that the ADR period claimed "was never built" was committed inside the ADR that (partially) formalized the claim. The "ADR-075 Strict Cryptographic Boundary Violation" string in the loader is a *provenance error*, not a semantic one: the loader's author cited the commit's ADR name for a boundary ADR-075 never defined.

- `rust/pkg/multiplicity_crypto_rust_bg.wasm` (136,205 bytes) exports `PedersenCommitment.commit / commit_with_blind` (`C = v*G + r*H`, ark-bn254, `rust/src/pedersen.rs`).
- `sha256` = `8f3ea751…8166` — exactly `EXPECTED_HASH` in both loaders.
- Contradictory claims: `README.md:3` "No BN254 WASM on disk"; `README.md:19` "BN254 WASM not built"; `rust/Cargo.toml:5` "WASM not built"; `SOURCES.md:115` "no `wasm-pack build` has been executed. The `rust/pkg/` directory does not exist."
- Loaders are **dead code**: imported by nothing; the TS loader calls `require()` in a `"type": "module"` package and `process.exit(1)` from a library module on any error.
- `rust/pkg/package.json` description: "Production-grade BN254 Pedersen commitments" — F-MC-08-adjacent capability language.

**Hidden assumptions named**:
1. "WASM never built" was asserted during the same era the artifact was committed; nobody cross-checked `git log` against the prose.
2. An on-disk signed artifact was assumed inert. Principle (this ADR): **a compiled artifact nobody loads is a supply-chain liability — every committed artifact is review surface (A7), and unreviewed artifacts survive audits only while labeled "not wired."**
3. "Compiled, not wired" was assumed to be a stable state. It is not: it repeats exactly the pattern it labels (claim vs path). It must terminate in wire or delete.

## Decision

The `compiled` role (ADR-084) is **terminal-timed**: it resolves to a committed binary state within 21 days of acceptance.

1. **Every claim of WASM non-existence is retracted** — README:3, README:19, `rust/Cargo.toml:5`, `SOURCES.md:113-115` SHALL be corrected at minimum to "BN254 WASM artifact exists at `rust/pkg/`; not on the shipped path" — but this is the **interim** label, not the resolution.

2. **Exactly one of the following shall be committed within 21 days:**
   - **Option A — WIRE**: a PR that (i) imports `loadWasmFailClosed` behind an explicit opt-in (`MULTIPLICITY_WASM=1`) only, (ii) adds a real integration test with the compiled artifact hash-checked, (iii) documents the option in README. The `compiled` row becomes `shipped-optional`, the wasm is no longer dead, and every claim about it now describes a test-executed path.
   - **Option B — REMOVE (recommended)**: delete committed `rust/pkg/`; delete `ts/src/wasmLoader.ts` and `py/multiplicity/crypto/wasm_loader.py`; remove both `EXPECTED_HASH` pins; keep `rust/src/pedersen.rs` and the ark/wasm-bindgen deps as **build-time-only sources** with a README/SOURCES one-liner "`wasm-pack` may be run to produce a loadable artifact; no compiled artifact is committed." The `compiled` row resolves to nothing; ADR-070's SHA-256 mechanism is the only shipped mechanism.
   - No third option. No "keep + relabel" rest.

3. **`wasmLoader.ts` / `wasm_loader.py` retirement is unconditional in the interim**: until Option A lands, remove `process.exit(1)` (replace with a typed `WasmLoadError` for any caller), and delete the mislabeled "ADR-075 Strict Cryptographic Boundary Violation" string. The loader may not be invoked by any CI step.

4. If Option B, the `production-grade` description dies with `rust/pkg/package.json`. If Option A, it is downgraded to "Research-grade BN254 Pedersen (arkworks), optional path" — F-MC-08 posture.

5. Either outcome is registered in ADR-090's provenance register (role, resolution date, commit).

## Consequences

- The crate ships a state that is *true and closed*: either tested wiring or no artifact.
- The precise failure this ADR names — an unclaimed artifact skating through on a "not wired" label — is architected out: the state has a terminus and an owner.
- README/SOURCES/Cargo stop stating a falsity disproven by `git log` + `ls`.

## Testing

- Option A: `grep -n "MULTIPLICITY_WASM" ts/src` shows the opt-in; `npm test` includes the wasm integration test; README documents the flag.
- Option B: `git ls-files rust/pkg/ ts/src/wasmLoader.ts py/multiplicity/crypto/wasm_loader.py` returns 0; `grep -rn "8f3ea751" ts/ py/` returns 0; `grep -rn "No BN254 WASM on disk\|WASM not built\|no wasm-pack build has been executed" README.md SOURCES.md rust/` returns 0.
- Either: `sha256sum rust/pkg/multiplicity_crypto_rust_bg.wasm` matches `8f3ea751…` if reachable, else product absent.
- `grep -n "process.exit\|ADR-075 Strict" ts/src/wasmLoader.ts` returns 0 until the file is deleted.

## References

- `git log --diff-filter=A -- rust/pkg/multiplicity_crypto_rust_bg.wasm` → `2c7d4f7 ADR-075` (artifact + loaders landed together)
- `rust/src/pedersen.rs`, `ts/src/wasmLoader.ts`, `py/multiplicity/crypto/wasm_loader.py`
- README.md:3,19; `rust/Cargo.toml:5`; SOURCES.md:113-115
- ADR-070 (SHA-256 shipped), ADR-075 (Cargo cleanup; provenance of the loader citation), ADR-068 F-MC-02, F-MC-08, ADR-084 (role table), ADR-090 (register), ADR-091 (conformance)