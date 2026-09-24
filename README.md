# multiplicity-crypto

Simulated classical hybrid encryption with prime-indexed tags v1.0.1 — the cryptographic component built with native multiplicity methodology. No quantum channel. `wasm-pack` may be run to produce a BN254 artifact; no compiled artifact is committed (ADR-085).

## Contents

| Path | Language | Description |
|------|----------|-------------|
| `ts/src/` | TypeScript | Simulated hybrid encryption pipeline: transcript → key derivation → commitment → AEAD |
| `py/multiplicity/` | Python | Interop bridge (`multiplicity.crypto`) + CAS registry consumer |
| `rust/src/` | Rust | Keccak256 Fiat-Shamir transcript for prover challenges |
| `vectors/` | JSON | Protocol family conformance vectors + diff-vectors manifest (ADR-084) |
| `lean/` | Lean | Verified Lean 4 mirror of the wire protocol — no `sorry`/`axiom`, `sorry` ratchet enforced (ADR-087) |
| `docs/` | Markdown | Simulated hybrid encryption specification articles |

## TypeScript Module Map

- `qkd.ts` — Pipeline composition root (`computeTranscript → deriveKey → computeCommitment → encryptAEAD`); `HardwareQKDBackend` (ETSI GS QKD 014, `HARDWARE_QKD_ETSI_014` label) available on the opt-in path, exercised only against mock endpoints in tests (ADR-088)
- `protocol.ts` — **`specified`** (ADR-084): canonical wire protocol — 7-byte frame codec, per-role transcript chains, directional AES-256-GCM AEAD envelope, strict sequence state; mirrored by Python and Rust
- `transcript.ts` — Per-sender SHA-256 hash-chain + context hash
- `keyderivation.ts` — HKDF-SHA256 with prime-indexed domain separation
- `commitment.ts` — SHA-256 commitment with prime-indexed domain tags (`PM-COMMIT-p${prime}`, ADR-070); the BN254 Pedersen source is build-time-only (ADR-085)
- `aead.ts` — AES-256-GCM with prime-indexed nonce domain tag
- `multiplicity.ts` — `MultiplicityProfile` encode/decode, prime sieve `getPrimeAtIndex`
- `frequency.ts` — Classical/quantum frequency mapping
- `feedback.ts` — L0-5 contractivity gate + prime upper bound `p/(p+1)`

## Python Module Map

- `multiplicity/crypto/__init__.py` — `MultiplicityCrypto` bridge with SHA-256 fallback mode
- `multiplicity/crypto/protocol.py` — **`shipped`** (ADR-084): Python protocol mirror (frames, transcript chains, directional AEAD)
- `multiplicity/math/cas_registry.py` — CAS registry binding ACE witnesses to crypto commitments
- `multiplicity/mkt/mkt_commitment.py` — MBC prototype over braid/invariant payloads
- `multiplicity/cert/test_ace_crypto_integration.py` — Integration tests for bridge + ACE witness registration

## Rust Module Map

- `rust/src/transcript.rs` — `Keccak256Transcript` for verifier challenge generation
- `rust/src/protocol.rs` — **`shipped`** (ADR-084): Rust protocol mirror (frames, transcript chains, directional AEAD)

## Protocol Family

Every protocol claim in this repository resolves to exactly one role row (ADR-084). A label that resolves to no row is a hypothesis, not a claim.

| Role | Artifact | Pins | Meaning |
|------|----------|------|---------|
| `specified` | `ts/src/protocol.ts` @ commit | commit SHA + line range | what the spec intends; the canonical reference bound by `specified` vectors |
| `canonical-vectors` | `vectors/protocol.json` @ content-hash | sha256 | what conformance means; every vector carries a `mechanism` label |
| `shipped` | `commitment.ts` / `aead.ts` / `keyderivation.ts` / `protocol.py` / `protocol.rs` SHA-256 path | commit SHA | what ships today |
| `compiled` | `rust/pkg/multiplicity_crypto_rust_bg.wasm` — **removed** | sha256 `8f3ea751…` (historical) | what was built; wire-or-remove resolved as REMOVE (ADR-085) |
| `claimed` | `lean/MultiplicityCrypto/Protocol.lean` | commit SHA, status: verified — no `sorry`/`axiom` | what is claimed; proof surface ratified by `lake build` + `lean/.sorry-allowlist` ratchet (ADR-087) |

Conformance is enforced by `npm run diff-vectors` (from `ts/`), which runs `shipped` vectors through the TypeScript, Python, and Rust shipped paths and `specified` vectors through `protocol.ts`, failing on any mismatch (ADR-084).

## Testing

TypeScript tests are located in `ts/src/__tests__/` and use a zero-dependency mock backend.

Python integration tests are in `py/multiplicity/cert/test_ace_crypto_integration.py`.

Rust tests are inline in `rust/src/transcript.rs` and `rust/src/protocol.rs`.

Cross-language protocol conformance: `npm run diff-vectors` from `ts/` runs the `vectors/protocol.json` corpus through the TS (`ts/src/__tests__/vectors-conformance.test.ts`), Python (`py/scripts/vector_executor.py`), and Rust (`rust/src/bin/vector_executor.rs`) shipped paths; `--update` regenerates the pinned values from `protocol.ts` (ADR-084).

Lean: `lake build` from the repo root must succeed with zero `sorry` warnings, and `scripts/check-sorry-allowlist.sh` (the `lean/.sorry-allowlist` ratchet) must exit 0 (ADR-087).

## Source References

This folder was consolidated from:
- `packages/agiOS/src/` (TypeScript)
- `packages/agiOS/src/multiplicity/` (Python)
- `packages/agiOS/crates/prover/src/transcript.rs` (Rust)
- `packages/agiOS/src/multiplicity/library/articles/` (Docs)
