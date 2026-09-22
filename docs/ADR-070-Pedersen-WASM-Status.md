# ADR-070: Pedersen Commitment WASM Status — SHA-256 Fallback as Shipped Product

- **Status**: Accepted
- **Deciders**: Rust owner, TS owner, Crate maintainer
- **Date**: 2026-09-22
- **Companion**: PHASE_MIRROR_AUDIT.md (D-02), ADR-068 (F-MC-02)
- **Supersedes**: README "Pedersen commitment (WASM-backed BN254)" claim; `commitment.ts` comment lines 1-8

## Context

The README describes the commitment module as "Pedersen commitment (WASM-backed BN254)" and the `ts/src/commitment.ts` header comment states:
```
// Commitment API for QKD Hybrid Encryption v1.0.1
// Implements Pedersen commitment (WASM-backed, BN254), fallback warning if unavailable
```

The actual implementation at `commitment.ts:24-55`:
1. Attempts `require('../rust/pkg/commitment_wasm')` at module load
2. The `rust/pkg/` directory **does not exist** — WASM was never built
3. The catch block always executes; `wasmModule` is always `null`
4. Every call to `computeCommitment` falls through to the SHA-256 fallback (lines 52-55)
5. The fallback uses domain tag `PM-COMMIT-p${prime}` for prime-indexed separation

The Rust `Cargo.toml` declares `ark-bn254`, `ark-ec`, `wasm-bindgen` dependencies but:
- No `wasm-pack build` has ever been run
- No `rust/pkg/commitment_wasm` output exists
- The Rust crate only contains `transcript.rs` (Keccak256), not a commitment module

## Decision

1. **The string "Pedersen" or "BN254" is refused as a capability claim** unless `rust/pkg/commitment_wasm` exists and is loaded at runtime, OR the README's primary sentence explicitly states "SHA-256 tagged commitment; BN254 WASM not built."

2. **The SHA-256 fallback with prime-indexed domain tags (`PM-COMMIT-p${prime}`) IS the shipped commitment mechanism.** It is deterministic, tested, and consistently implemented across TypeScript and Python fallbacks.

3. `commitment.ts` header comment MUST be updated to accurately describe the mechanism: "SHA-256 commitment with prime-indexed domain tags; BN254 WASM not built."

4. The Rust crate must either:
   a. Implement `compute_pedersen_commitment` in a new module, build with `wasm-pack --target bundler --out-dir ../ts/src/wasm`, and wire it in `commitment.ts`, OR
   b. Remove BN254/arkworks dependencies from `Cargo.toml` if WASM is not planned

5. If WASM is built in the future, the ADR is superseded by a new ADR documenting the actual WASM mechanism.

## Consequences

- README and `commitment.ts` comments accurately describe the SHA-256 mechanism
- No consumer expects circuit-verifiable BN254 commitments
- Prime-indexed domain separation (`p/(p+1)` contractivity bound) remains valid and tested
- The crate is explicitly research-grade; WASM path is a future enhancement, not current reality

## Testing

- `grep -r "Pedersen.*WASM" README.md docs/ ts/src/commitment.ts` returns zero capability claims
- `grep -r "BN254" README.md docs/ ts/src/commitment.ts` returns zero capability claims
- `computeCommitment` produces deterministic SHA-256 output with `PM-COMMIT-p${prime}` tag
- TypeScript tests pass with SHA-256 commitment path

## References

- PHASE_MIRROR_AUDIT.md §1 row 2, §2 row 2, §3 "What Is Broken" rows 40-41
- ADR-068 F-MC-02
- Phase Mirror PM-MC-001 §6 F-MC-02
- `ts/src/commitment.ts` lines 1-56
- `rust/Cargo.toml` lines 15-18 (ark-bn254 dependencies)