# SOURCES.md

File provenance for `multiplicity-crypto/`.

## TypeScript — `ts/src/`

| Consolidated file | Original |
|-------------------|----------|
| `ts/src/qkd.ts` | `packages/agiOS/src/qkd.ts` |
| `ts/src/aead.ts` | `packages/agiOS/src/aead.ts` |
| `ts/src/keyderivation.ts` | `packages/agiOS/src/keyderivation.ts` |
| `ts/src/commitment.ts` | `packages/agiOS/src/commitment.ts` |
| `ts/src/transcript.ts` | `packages/agiOS/src/transcript.ts` |
| `ts/src/multiplicity.ts` | `packages/agiOS/src/multiplicity.ts` |
| `ts/src/frequency.ts` | `packages/agiOS/src/frequency.ts` |
| `ts/src/feedback.ts` | `packages/agiOS/src/feedback.ts` |
| `ts/src/__tests__/qkd-roundtrip.test.ts` | `packages/agiOS/src/__tests__/qkd-roundtrip.test.ts` |
| `ts/src/__tests__/adr-007-e2e-cryptographic-roundtrip.test.ts` | `packages/agiOS/src/__tests__/adr-007-e2e-cryptographic-roundtrip.test.ts` |
| `ts/src/__tests__/aead.test.ts` | New — P2 test coverage |
| `ts/src/__tests__/feedback.test.ts` | New — P2 test coverage |
| `ts/src/__tests__/frequency.test.ts` | New — P2 test coverage |
| `ts/src/__tests__/protocol.test.ts` | `packages/agiOS/src/__tests__/protocol.test.ts` (expanded) |

## Python — `py/multiplicity/`

| Consolidated file | Original |
|-------------------|----------|
| `py/multiplicity/__init__.py` | `packages/agiOS/src/multiplicity/__init__.py` (adjusted) |
| `py/multiplicity/crypto/__init__.py` | `packages/agiOS/src/multiplicity/crypto/__init__.py` (paths adjusted, bridge removed) |
| `py/multiplicity/math/__init__.py` | `packages/agiOS/src/multiplicity/math/__init__.py` (adjusted) |
| `py/multiplicity/math/core_math.py` | `packages/agiOS/src/multiplicity/math/core_math.py` |
| `py/multiplicity/math/cas_registry.py` | `packages/agiOS/src/multiplicity/math/cas_registry.py` |
| `py/multiplicity/mkt/__init__.py` | `packages/agiOS/src/multiplicity/mkt/__init__.py` |
| `py/multiplicity/mkt/mkt_commitment.py` | `packages/agiOS/src/multiplicity/mkt/mkt_commitment.py` |
| `py/multiplicity/cert/__init__.py` | `packages/agiOS/src/multiplicity/cert/__init__.py` |
| `py/multiplicity/cert/test_ace_crypto_integration.py` | `packages/agiOS/src/multiplicity/cert/test_ace_crypto_integration.py` |
| `py/multiplicity/cert/lambda_m_protocols.py` | Stub — not in original |
| `py/multiplicity/mkt/mkt_colored_braid.py` | Stub — not in original |
| `py/multiplicity/mkt/mkt_constants_estimation.py` | Stub — not in original |
| `py/multiplicity/mkt/mkt_invariant.py` | Stub — not in original |
| `py/multiplicity/agi/__init__.py` | Stub — not in original |
| `py/multiplicity/topos/__init__.py` | Stub — not in original |
| `py/multiplicity/utils/__init__.py` | Stub — not in original |
| `py/multiplicity/moonshine/__init__.py` | Stub — not in original |
| `py/multiplicity/zeno_heartbeat/__init__.py` | Stub — not in original |
| `py/multiplicity/kernel_telemetry/__init__.py` | Stub — not in original |

## Rust — `rust/src/`

| Consolidated file | Original |
|-------------------|----------|
| `rust/src/transcript.rs` | `packages/agiOS/crates/prover/src/transcript.rs` |
| `rust/src/lib.rs` | New barrel module |
| `rust/src/pedersen.rs` | New — BN254 Pedersen (dependencies present, WASM not built) |
| `rust/src/protocol.rs` | New — protocol types ported from TypeScript |
| `rust/src/protocol_kani.rs` | New — Kani verification harness |
| `rust/Cargo.toml` | New minimal crate definition |

## Documentation — `docs/`

| Consolidated file | Original(s) |
|-------------------|-------------|
| `docs/qkd-hybrid-encryption-v1.0-systems.md` | `packages/agiOS/src/multiplicity/library/articles/05-systems/cryptography/Qkd Hybrid Encryption V1.0.md` |
| `docs/qkd-hybrid-encryption-v1.0-case-studies.md` | `packages/agiOS/src/multiplicity/library/articles/03-case-studies/Qkd Hybrid Encryption V1.0.md` |
| `docs/Multiplicity Crypto.tex` | `packages/agiOS/src/multiplicity/library/articles/Multiplicity Crypto.tex` |
| `docs/Hybrid Encryption System.tex` | `packages/agiOS/src/multiplicity/library/articles/Hybrid Encryption System.tex` |
| `docs/Certification and Transport.tex` | `packages/agiOS/src/multiplicity/library/articles/Certification and Transport.tex` |
| `docs/Encryption.tex` | `packages/agiOS/src/multiplicity/library/articles/Encryption.tex` |
| `docs/Quantum State Security.tex` | `packages/agiOS/src/multiplicity/library/articles/Quantum State Security.tex` |
| `docs/Cognitive Economy Cryptography.tex` | `packages/agiOS/src/multiplicity/library/articles/Cognitive Economy Cryptography.tex` |
| `docs/Multiplicity Crypto Wearables.tex` | `packages/agiOS/src/multiplicity/library/articles/Multiplicity Crypto Wearables.tex` |

## Adjustments made during consolidation

- `py/multiplicity/crypto/__init__.py`: `TS_PACKAGE_DIR` path updated from `parents[3] / "crypto"` to `parents[3] / "ts"` so the bridge resolves the TypeScript sources in the new layout. **Bridge logic removed entirely (ADR-076)** — SHA-256 fallback is now the only shipped mode; Node.js/WASM bridge dependency eliminated.
- `py/multiplicity/__init__.py`: top-level imports wrapped in `try/except` so the package loads gracefully when optional sub-modules are absent. Dead imports (`agi`, `topos`, `cert`, `utils`, `moonshine`, `zeno_heartbeat`, `kernel_telemetry`) wrapped in loop with safe fallback.
- `py/multiplicity/math/__init__.py`: `omega_operator` import removed (not part of this consolidation) and wrapped in safe fallback.
- `py/multiplicity/cert/lambda_m_protocols.py`, `py/multiplicity/mkt/mkt_colored_braid.py`, `py/multiplicity/mkt/mkt_constants_estimation.py`, `py/multiplicity/mkt/mkt_invariant.py`: stub modules created — not in original source.
- `py/multiplicity/agi`, `py/multiplicity/topos`, `py/multiplicity/utils`, `py/multiplicity/moonshine`, `py/multiplicity/zeno_heartbeat`, `py/multiplicity/kernel_telemetry`: stub `__init__.py` packages created — not in original source.
- `rust/src/lib.rs`: new barrel module added so the crate has an entry point.
- `rust/Cargo.toml`: empty `[dev-dependencies]` section removed; `[workspace]` table retained as opt-out of parent workspace.
- `ts/package.json`: `vitest` added to `devDependencies`; `vitest.config.ts` created with `globals: true` (post-consolidation).
- `ts/tsconfig.json`: `"jest"` removed from `types` array; `"vitest/globals"` added.
- `README.md`: title updated from "QKD Hybrid Encryption v1.0.1" to "Simulated classical hybrid encryption with prime-indexed tags v1.0.1"; commitment module description updated to "SHA-256 commitment with prime-indexed domain tags; BN254 WASM not built".

## Missing / Stubbed Modules (Python)

The following modules are referenced in `py/multiplicity/__init__.py` but do not exist in the original `agiOS` source tree. They are provided as minimal stubs to allow `import multiplicity` to succeed:

| Module | Status | Notes |
|--------|--------|-------|
| `multiplicity.agi` | Stub | `py/multiplicity/agi/__init__.py` — empty stub |
| `multiplicity.topos` | Stub | `py/multiplicity/topos/__init__.py` — empty stub |
| `multiplicity.cert` | Stub | `py/multiplicity/cert/__init__.py` — only `lambda_m_protocols` stub |
| `multiplicity.utils` | Stub | `py/multiplicity/utils/__init__.py` — empty stub |
| `multiplicity.moonshine` | Stub | `py/multiplicity/moonshine/__init__.py` — empty stub |
| `multiplicity.zeno_heartbeat` | Stub | `py/multiplicity/zeno_heartbeat/__init__.py` — exports `HeartbeatConfig`, `assess_rt_feasibility`, `enforce_heartbeat` as no-ops |
| `multiplicity.kernel_telemetry` | Stub | `py/multiplicity/kernel_telemetry/__init__.py` — exports `KernelTelemetry`, `emit_telemetry`, etc. as no-ops |
| `pirtm` (external) | Missing | Referenced in `cas_registry.py:27-28` and `test_ace_crypto_integration.py`; not vendored; `CAS_AVAILABLE=False` when absent |
| `mkt_colored_braid` | Stub | `py/multiplicity/mkt/mkt_colored_braid.py` — `BraidWord` class |
| `mkt_constants_estimation` | Stub | `py/multiplicity/mkt/mkt_constants_estimation.py` — `c0_of_x`, `z_of_x` returning 0.0 |
| `mkt_invariant` | Stub | `py/multiplicity/mkt/mkt_invariant.py` — `p_of_braid_x` returning 0.0 |

## Bridge Scripts (Removed)

The following bridge artifacts were referenced in the original `py/multiplicity/crypto/__init__.py` but **never existed on disk**:

- `ts/python/crypto_bridge.js` — Node.js bridge script to call TypeScript/WASM
- `ts/dist/src/index.js` — Compiled TypeScript entry point

Per ADR-076, the Node.js bridge dependency has been removed. `MultiplicityCrypto` now operates in SHA-256 fallback mode exclusively.

## Rust Dependencies (WASM Not Built)

`rust/Cargo.toml` declares `ark-bn254`, `ark-ec`, `ark-ff`, `wasm-bindgen` for BN254 Pedersen commitments, but **no `wasm-pack build` has been executed**. The `rust/pkg/` directory does not exist. The SHA-256 fallback in TypeScript (`PM-COMMIT-p${prime}`) is the shipped commitment mechanism (ADR-070).

## Test Infrastructure (Post-Consolidation)

| Artifact | Origin |
|----------|--------|
| `ts/vitest.config.ts` | Created post-consolidation (not in agiOS) |
| `ts/package.json` vitest entry | Added post-consolidation |
| `ts/src/__tests__/aead.test.ts` | Created post-consolidation |
| `ts/src/__tests__/feedback.test.ts` | Created post-consolidation |
| `ts/src/__tests__/frequency.test.ts` | Created post-consolidation |
| `py/setup.py` dependencies | `numpy`, `sympy`, `cryptography` in `install_requires`; `pytest` in `extras_require["test"]` |

## Python Module Import Inventory (100% Coverage)

Every `import` in `py/multiplicity/` is accounted for:

- **Standard library**: `hashlib`, `json`, `os`, `shutil`, `subprocess`, `asyncio`, `logging`, `dataclasses`, `typing`, `datetime`, `pathlib`, `sys`
- **Internal (implemented)**: `.math.core_math`, `.math.cas_registry`, `.cert.lambda_m_protocols`, `.mkt.mkt_commitment`, `.mkt.mkt_colored_braid`, `.mkt.mkt_constants_estimation`, `.mkt.mkt_invariant`, `.crypto` (protocol, bridge)
- **Internal (stubbed)**: `.agi`, `.topos`, `.cert`, `.utils`, `.moonshine`, `.zeno_heartbeat`, `.kernel_telemetry` — all wrapped in `try/except` loop
- **External (declared in setup.py)**: `numpy`, `sympy`, `cryptography`
- **External (test-only)**: `pytest` (in `extras_require["test"]`)
- **External (missing, causes CAS_AVAILABLE=False)**: `pirtm` — not in `install_requires`, optional dependency