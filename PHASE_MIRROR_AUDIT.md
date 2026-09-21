# Phase Mirror Audit — multiplicity-crypto

## 1. Mismatches: Stated Intent vs Operating Incentives

| # | Stated Intent (README/SOURCES/docs) | Operating Reality | Mismatch Type |
|---|--------------------------------------|-------------------|---------------|
| 1 | "QKD Hybrid Encryption v1.0.1" — implies quantum key distribution protocol | Entire pipeline runs through `MockQKDBackend.simulateQKD()`; no QKD hardware, no entanglement, no real quantum channel | Vibe claim dressed as protocol |
| 2 | "Pedersen commitment (WASM-backed BN254)" in README commitment module description | `commitment.ts:24-28` tries `require('../rust/pkg/commitment_wasm')`; no `rust/pkg/` directory exists; always falls back to SHA-256 stub | Mechanism unavailable, fallback always active |
| 3 | "zero-dependency mock backend" for TypeScript tests | `package.json` devDependencies lists `@types/jest`, `@types/node`, `typescript` — none are test runners; `vitest` is the test script command but is absent from devDependencies; `jest` is absent too | Test runner dependency missing |
| 4 | `README` documents 8 TypeScript modules, 4 Python modules, 1 Rust module | `py/multiplicity/__init__.py` imports 7 submodules (`agi`, `topos`, `cert`, `utils`, `moonshine`, `zeno_heartbeat`, `kernel_telemetry`) that do not exist on disk; only `cas_registry` import is try/except-wrapped | Dead imports masked by try/except except for `agi` (line 32, not wrapped) |
| 5 | `README` claims Python `multiplicity.crypto` bridge + CAS registry integration | `py/multiplicity/crypto/__init__.py:20-21` references `ts/python/crypto_bridge.js` and `ts/dist/src/index.js`; neither exists; `pirtm` is imported by `cas_registry.py` and `test_ace_crypto_integration.py` but is not on disk | Integration points reference non-existent artifacts |
| 6 | `SOURCES.md` documents consolidation adjustments | `SOURCES.md` mentions 4 adjustments (path updates, try/except wrapping) but does not document: missing `agi` import failure, missing `pirtm`, missing `mkt_colored_braid`/`mkt_constants_estimation`/`mkt_invariant` modules | Provenance record incomplete |
| 7 | `tsconfig.json` `"types": ["node", "jest"]` | Tests use Jest-style globals (`describe`/`it`/`expect`) but no jest dependency, no jest config, no vitest config; vitest requires `--globals` flag to run | Config contradicts runtime requirement |
| 8 | `Cargo.toml` has `[workspace]` section | Empty `[workspace]` is a no-op in a single-crate setup; `[dev-dependencies]` is also empty despite crate having inline tests | Boilerplate without function |

## 2. Vibe Claims Replaced with Mechanisms

| Claim | Mechanism That Should Replace It |
|-------|----------------------------------|
| "QKD Hybrid Encryption" | Actual QKD key exchange protocol (BB84/E91) with photon polarization simulation or real hardware API. Currently: `MockQKDBackend` → `simulateQKD` → SHA-256 + HKDF + AES-GCM with no quantum component |
| "Pedersen commitment (WASM-backed BN254)" | Build `rust/pkg/commitment_wasm` via wasm-pack, expose `compute_pedersen_commitment`, load from actual compiled WASM. Currently: `try { require('../rust/pkg/commitment_wasm') } catch` → SHA-256 hash with `PM-COMMIT-p${prime}` tag |
| "Cryptographic guarantees" (Python bridge) | Working WASM bridge + proper ACE/pirtm integration. Currently: all commands in `MultiplicityCrypto._call()` fall through to `_fallback_commitment()` SHA-256 function when bridge is unavailable (which is always) |
| "Prime-indexed domain separation" | This one IS implemented — `getPrimeAtIndex()` works correctly in TS, Rust, and the prime-indexed tags are used in `commitment.ts` and `aead.ts`. Mechanism verified by `tsc --noEmit` passing and Rust tests passing |
| "L0-5 contractivity gate" | Implemented in `feedback.ts:36-57` — checks `contractivity_score <= p/(p+1)`. Mechanism is sound but has no test coverage |

## 3. Structural Integrity Assessment

### What Works
- Rust Keccak256 transcript: 2/2 tests pass; deterministic and correct
- TypeScript prime sieve, profile encoding, HKDF, AES-256-GCM, hash-chain: compile cleanly (`tsc --noEmit` passes)
- TypeScript QKD pipeline (MockQKDBackend): 2/2 tests pass with `--globals` flag
- Prime-indexed domain separation mechanism is consistently implemented across TS and Rust

### What Is Broken
- Python package cannot be imported (`agi` not wrapped in try/except at `__init__.py:32`)
- Python test dependencies missing (numpy, sympy, pytest, pirtm — none installed, none in setup.py)
- `multiplicity/mkt/mkt_commitment.py` imports 3 non-existent modules (`mkt_colored_braid`, `mkt_constants_estimation`, `mkt_invariant`)
- Rust Cargo.toml: empty `[workspace]` and `[dev-dependencies]` sections
- TypeScript test runner (vitest) not declared in package.json devDependencies
- TypeScript tests fail without `--globals` flag (no config file)
- WASM commitment module never built (`rust/pkg/` does not exist)
- Python bridge scripts never created (`ts/python/crypto_bridge.js`, `ts/dist/src/index.js`)

## 4. Next Actions — Owners and Metrics

| Priority | Action | Owner | Metric |
|----------|--------|-------|--------|
| **P0** | Wrap `from . import agi` in try/except in `py/multiplicity/__init__.py:32` | Package maintainer | `python3 -c "import multiplicity"` exits 0 |
| **P0** | Add vitest to `ts/package.json` devDependencies and create `ts/vitest.config.ts` with `globals: true` | TS owner | `npm test` from ts/ passes without manual vitest install |
| **P0** | Install `numpy`, `sympy` in `py/setup.py` `install_requires` | Python owner | `pip install -e py/` resolves all deps |
| **P1** | Create stub modules or remove `agi`, `topos`, `utils`, `moonshine`, `zeno_heartbeat`, `kernel_telemetry` imports from `py/multiplicity/__init__.py` | Python owner | Zero ImportError warnings on package load |
| **P1** | Add `rust/pkg/commitment_wasm` build step (wasm-pack) or document SHA-256 fallback as intended | Rust/TS owner | `computeCommitment` produces WASM or documented fallback |
| **P1** | Create `ts/python/crypto_bridge.js` or remove Python bridge dependency from `cas_registry.py` | Python owner | `MultiplicityCrypto` constructor succeeds without Node.js |
| **P2** | Remove empty `[workspace]` and `[dev-dependencies]` from `rust/Cargo.toml` or add real dev deps | Rust owner | `cargo clippy` clean |
| **P2** | Update `SOURCES.md` to document all missing modules and adjustments | Documentation owner | SOURCES.md covers 100% of `py/multiplicity/` imports |
| **P2** | Rename README "QKD" claims to "Simulated QKD" or implement actual QKD | Architecture owner | README claims match test execution path |
| **P3** | Add test coverage for `feedback.ts` (contractivity gate), `frequency.ts`, `aead.ts` decrypt path | QA owner | Coverage ≥ 70% for core TS modules |

## 5. Risk Assessment

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| Python tests are permanently unrunnable due to cascading import failures | High | Certain | Fix __init__.py imports + install deps |
| TypeScript tests silently pass with vitest --globals but fail in CI without it | High | High | Add vitest.config.ts |
| WASM commitment path is dead code — everyone uses SHA-256 fallback | Medium | Certain | Either build WASM or document fallback as permanent |
| README misleads consumers about QKD authenticity | Medium | Certain | Update docs or implement QKD |
| `mkt_commitment.py` fails at import due to missing braid modules | High | Certain | Create stubs or remove MBC prototype |
