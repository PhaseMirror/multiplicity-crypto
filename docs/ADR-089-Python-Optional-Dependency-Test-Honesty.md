# ADR-089: Python Optional-Dependency and Test-Surface Honesty

- **Status**: Accepted
- **Deciders**: Python owner, Crate maintainer, QA owner
- **Date**: 2026-09-24
- **Companion**: Phase Mirror Round 2 (D-17); ADR-071; ADR-076; ADR-077
- **Supersedes**: `py/setup.py` install_requires (pirtm omission); `py/multiplicity/mkt/mkt_*_*.py` stub markers (wording drift from ADR-077)
- **Blocks**: None

## Context

The Python package now imports cleanly (`python3 -c "import multiplicity"` from `py/` exits 0, `CAS_AVAILABLE=False`) — ADR-071/076/077 decisions are structurally implemented. Residual honesty gaps:

1. **`pirtm` is still undeclared** in `py/setup.py` `install_requires` or any `extras_require`, while `py/multiplicity/cert/test_ace_crypto_integration.py:23-24` does `from pirtm.ace.protocol import ...` and `from pirtm.step_types import ...` **unguarded**, and `py/multiplicity/math/cas_registry.py:27-28` imports `pirtm.ace.types`/`pirtm.ace.witness`. Only the *package-level* `try/except` in `__init__.py` masks this; running the integration test directly still raises `ModuleNotFoundError`. ADR-071 decision #4 said "MUST declare `pirtm` (if `cas_registry.py` is kept)" — not done.
2. **MKT stubs use the wrong honesty marker**: ADR-077 #2 required `"NOT IMPLEMENTED — MBC prototype placeholder"`. Actual files use `"Stub — module not implemented in this consolidation. See SOURCES.md."`. The substitution matters: "not in this consolidation" implies a future merge; the prototype's `mkt_commitment.py` (marked "ADR-104 Phase 0") silently uses the constant-returning stubs (`c0_of_x` → `0.0`, `p_of_braid_x` → `0.0`) so the MBC math **degenerates to a constant** without raising.
3. **`py/multiplicity/crypto/wasm_loader.py` was cited as mirroring `ts/src/wasmLoader.ts`** (same `EXPECTED_HASH`, same `sys.exit(1)`; see ADR-085 #4). **Premise correction (2026-09-24): no `wasm_loader.py` exists under `py/` at implementation time** — `grep -rn "wasm_loader" py/` returns nothing. Decision 3 below is therefore satisfied vacuously in Python; the TS `wasmLoader.ts` retirement remains covered by ADR-085.
4. **`cas_registry.py` docstrings** still carry Pedersen/WASM capability language (stale per ADR-070).
5. **`py/tests/test_protocol.py` is runnable but `py/multiplicity/cert/test_ace_crypto_integration.py` is not** — the README "Python integration tests" section points at the unrunnable one.

**Hidden assumptions named**:
- "Package imports successfully" was assumed to mean "test surface is honest"; the import guard masks the very failure mode ADR-071 was written to fix.
- A stub returning `0.0` was assumed to fail loudly; it fails silently into wrong math.
- The integration test was assumed runnable because it exists; no CI step runs it.

## Decision

1. **`pirtm` SHALL be declared in `py/setup.py`**: `extras_require={"cas": ["pirtm"]}` (or `install_requires` if `cas_registry` is non-optional). The integration test SHALL guard: `pytest.importorskip("pirtm")` or a module-level `@pytest.mark.skipif(not _pirtm_available)`. Either way `pytest py/multiplicity/cert/test_ace_crypto_integration.py` must **skip cleanly, not error**.
2. **MKT stub markers SHALL match ADR-077 #2 exactly**: every stub file's docstring becomes `"""NOT IMPLEMENTED — MBC prototype placeholder. See SOURCES.md."""`, and `mkt_commitment.py` SHALL raise `NotImplementedError` (or log a loud warning) when the degenerate `0.0` path would be used — a constant-returning MBC may not be used silently.
3. **No Python `wasm_loader.py` SHALL ship with `sys.exit`/`EXPECTED_HASH` dead code** (ADR-085 #4). Verified absent at implementation time (`grep -rn "wasm_loader" py/` → 0).
4. **`cas_registry.py` Pedersen/WASM docstrings SHALL be corrected** to ADR-070 language (SHA-256 fallback; BN254 artifact present but not wired — ADR-085).
5. **README Testing section SHALL name the runnable test command**: `cd py && python3 -m pytest tests/` (and/or `python3 -m pytest multiplicity/cert/ --ignore` with the skip), not a file that hard-fails on a missing import.

6. **Test-coverage statements carry the runnable/unrunnable split (per ADR-090 §4).** The crate's suite is stated as "the tests that run pass": TS 55/55 across 8 files at the ADR-089 commit (`3d49da5` was actually 32/32 across 6 files — the earlier "95/95 across 18 files" figure is corrected here as dishonest); Rust 9/9; pytest `tests/test_protocol.py` runnable. The known-uncovered surface SHALL be listed wherever coverage is cited: `commitment.ts`, `keyderivation.ts`, `transcript.ts`, `multiplicity.ts`, `wasmLoader.ts` (no committed tests); `crypto/protocol.py` and Rust `pedersen.rs` (none); `cert/test_ace_crypto_integration.py` (skips without `pirtm`; runs when `extras_require["cas"]` is installed, per decision §1). A claim of "covered" SHALL include the caveat "excluding the un-exported/untested surface named in ADR-089."

## Consequences

- `pytest` never errors on a missing optional dependency; it skips with a stated reason.
- The MBC prototype cannot silently compute a constant.
- Provenance (ADR-079) covers `pirtm` and the corrected stub markers.
- Test commands in README are commands that actually run (F-MC-04 parity for Python).

## Testing

- `cd py && python3 -m pytest tests/ -q` exits 0.
- `cd py && python3 -m pytest multiplicity/cert/test_ace_crypto_integration.py -q` exits 0 with skip (or pass if pirtm installed).
- `grep -rn "NOT IMPLEMENTED — MBC prototype placeholder" py/multiplicity/mkt/` returns ≥3.
- `grep -rn "Pedersen.*WASM" py/multiplicity/math/cas_registry.py` returns 0.
- `grep -n "extras_require\|pirtm" py/setup.py` returns the declaration.

## References

- `py/setup.py:9-16`, `py/multiplicity/cert/test_ace_crypto_integration.py:23-24`, `py/multiplicity/math/cas_registry.py:27-28`
- `py/multiplicity/mkt/mkt_colored_braid.py`, `mkt_constants_estimation.py`, `mkt_invariant.py` (stub markers)
- `py/multiplicity/crypto/wasm_loader.py`
- ADR-071 (importability + pirtm decision #4), ADR-076 (bridge removal), ADR-077 (stub markers), ADR-085 (WASM loader + claims), ADR-079 (provenance), ADR-090 (§4 runnable/unrunnable semantics)

## Addendum (2026-09-24) — implemented

- **Decision 1**: `py/setup.py` `extras_require` gains `"cas": ["pirtm"]`; `test_ace_crypto_integration.py` now runs `pytest.importorskip("pirtm")` before any `pirtm`/`cas_registry` import and drops the `sys.path` shim. `python3 -m pytest multiplicity/cert/test_ace_crypto_integration.py -q` exits 0 with a clean skip when `pirtm` is absent (this host has no `python` → all commands normalized to `python3` for literal falsifiability).
- **Decision 2**: the three stub files carry `NOT IMPLEMENTED — MBC prototype placeholder. See SOURCES.md.`; `mkt_commitment.commit()` raises `NotImplementedError` the moment the stub invariants would produce an all-`0.0` invariant vector, so a constant-returning MBC commitment can no longer be produced silently.
- **Decision 3**: premise corrected — no `wasm_loader.py` exists under `py/`; nothing to retire in Python (TS `wasmLoader.ts` remains ADR-085's concern).
- **Decision 4**: `cas_registry.py` module/class/field docstrings reworded to ADR-070 language (SHA-256-tagged commitment; BN254 Pedersen artifact not wired); `grep -rn "Pedersen\*WASM"` returns 0.
- **Decision 5**: README Testing names `cd py && python3 -m pytest tests/ -q` as the runnable command and states the integration test skips without `pirtm`.
- **Decision 6**: TS count corrected from the dishonest "95/95 across 18 files" to the honest split — `3d49da5` was 32/32 across 6 files; the ADR-089 commit is 55/55 across 8 files (ADR-084 conformance +6, ADR-088 hardware +1 file). Rust 9/9 unchanged.
- **Verification**: `cd py && python3 -m pytest tests/ -q` (both `tests/` files pass, 20 tests), integration test skips cleanly, marker grep ≥3, `cas_registry.py` clean of Pedersen/WASM capability docstrings.