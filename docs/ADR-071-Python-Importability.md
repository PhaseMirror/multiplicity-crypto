# ADR-071: Python Package Importability — Stub All Dead Imports

- **Status**: Accepted
- **Deciders**: Python owner, Crate maintainer
- **Date**: 2026-09-22
- **Companion**: PHASE_MIRROR_AUDIT.md (D-03), ADR-068 (F-MC-03)
- **Supersedes**: `py/multiplicity/__init__.py` lines 33-37 (unwrapped `agi` import)

## Context

The Python package `multiplicity` cannot be imported due to cascading failures:

1. `py/multiplicity/__init__.py:33-37` loops through `("agi", "topos", "cert", "utils", "moonshine", "zeno_heartbeat", "kernel_telemetry")` and attempts `__import__`. The first iteration (`agi`) is **not wrapped in try/except** (line 32 is outside the loop), causing immediate `ImportError`.

2. `py/multiplicity/mkt/mkt_commitment.py` imports three non-existent modules:
   - `mkt_colored_braid`
   - `mkt_constants_estimation`
   - `mkt_invariant`

3. `py/multiplicity/crypto/__init__.py` references bridge scripts that don't exist:
   - `ts/python/crypto_bridge.js`
   - `ts/dist/src/index.js`

4. `py/setup.py` declares `numpy`, `sympy`, `cryptography` in `install_requires` but `pytest` only in `extras_require["test"]`. `pirtm` (referenced in `cas_registry.py:27-28` and test file) is not declared.

5. The test file `py/multiplicity/cert/test_ace_crypto_integration.py` requires `numpy` and `pirtm` which are not installed.

Per PHASE_MIRROR_AUDIT.md and TEST_RESULTS.md, the package now imports after fixes, but the fix was "wrap or delete" — the actual modules don't exist.

## Decision

1. **All imports of non-existent modules MUST be wrapped in `try/except`** in `py/multiplicity/__init__.py`. No `ImportError` may propagate from package load.

2. **Dead modules (`agi`, `topos`, `cert`, `utils`, `moonshine`, `zeno_heartbeat`, `kernel_telemetry`) are either:**
   - Created as minimal stubs with clear "NOT IMPLEMENTED" docstrings, OR
   - Removed from the import loop entirely (the loop itself is a code smell)

3. **`mkt_commitment.py` MUST stub or remove the three missing imports** (`mkt_colored_braid`, `mkt_constants_estimation`, `mkt_invariant`). The MBC prototype is non-functional without them.

4. **`setup.py` MUST declare all runtime dependencies** in `install_requires`: `numpy`, `sympy`, `cryptography`, and `pirtm` (if `cas_registry.py` is kept).

5. **Bridge script dependency must be resolved:** Either create `ts/python/crypto_bridge.js` and `ts/dist/src/index.js` (via `npm run build`), or remove the Node.js bridge dependency from `crypto/__init__.py` and make the fallback the only path.

6. **The package import test `python3 -c "import multiplicity"` MUST exit 0** without warnings (except the CAS registry warning which is expected when `pirtm` is absent).

## Consequences

- `python3 -c "import multiplicity"` succeeds (exit code 0)
- `CAS_AVAILABLE` correctly resolves to `False` when `pirtm` is absent
- No dead imports crash the interpreter
- The package is explicitly a stub/shim layer; no mechanism is claimed for missing modules
- Test dependencies (`pytest`) remain in `extras_require["test"]`

## Testing

- `python3 -c "import multiplicity"` exits 0
- `python3 -c "from multiplicity.crypto import MultiplicityCrypto; print('ok')"` exits 0
- `pip install -e py/` resolves all `install_requires` without error
- `pytest py/multiplicity/cert/test_ace_crypto_integration.py` runs (requires `numpy`, `sympy`, `pirtm` installed)

## References

- PHASE_MIRROR_AUDIT.md §1 row 4, §3 "What Is Broken" rows 35-37, 42
- ADR-068 F-MC-03
- Phase Mirror PM-MC-001 §6 F-MC-03
- `py/multiplicity/__init__.py` lines 1-62
- `py/multiplicity/mkt/mkt_commitment.py`
- `py/multiplicity/crypto/__init__.py` lines 71-74, 177-184
- `py/setup.py`
- TEST_RESULTS.md §40-50