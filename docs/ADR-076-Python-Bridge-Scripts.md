# ADR-076: Python Bridge Scripts — Create or Remove Dependency

- **Status**: Accepted
- **Deciders**: Python owner, TS owner, Crate maintainer
- **Date**: 2026-09-22
- **Companion**: PHASE_MIRROR_AUDIT.md §1 rows 5, 11, §3 rows 41-42
- **Supersedes**: `py/multiplicity/crypto/__init__.py` lines 71-74, 177-184, 204-207

## Context

`py/multiplicity/crypto/__init__.py` defines paths to bridge scripts that do not exist:
```python
PROJECT_ROOT = Path(__file__).resolve().parents[3]
TS_PACKAGE_DIR = PROJECT_ROOT / "ts"
BRIDGE_SCRIPT_PATH = TS_PACKAGE_DIR / "python" / "crypto_bridge.js"  # NOT ON DISK
DIST_ENTRY_PATH = TS_PACKAGE_DIR / "dist" / "src" / "index.js"       # NOT ON DISK
```

The `MultiplicityCrypto` class:
1. Checks for these files in `_resolve_bridge_status()` (lines 224-235)
2. Falls back to SHA-256 mode when missing (which is always)
3. `_ensure_built()` (lines 177-204) attempts `pnpm run build` but `ts/package.json` has no `build` script that outputs to `dist/src/index.js`
4. All `_call()` commands (lines 251-347) fall through to `_fallback_commitment()` and other SHA-256 stubs

Per TEST_RESULTS.md, the Python package now imports, but **the bridge is permanently unavailable** — every operation uses the fallback.

## Decision

1. **Either create the bridge scripts OR remove the Node.js bridge dependency entirely.**

2. **Option A — Create bridge (if WASM/TypeScript interop is required):**
   - Add `ts/src/python/crypto_bridge.js` that loads the TypeScript compiled output
   - Ensure `ts/package.json` has a `build` script that outputs to `ts/dist/src/index.js`
   - Run `npm run build` in `ts/` to generate the dist files
   - Verify `MultiplicityCrypto(force_fallback=False).getBridgeStatus()["mode"] == "wasm"`

3. **Option B — Remove bridge dependency (if fallback is the shipped product):**
   - Remove `BRIDGE_SCRIPT_PATH` and `DIST_ENTRY_PATH` references
   - Remove `_ensure_built()`, `_run_node_json()`, `_resolve_bridge_status()` logic
   - Make `MultiplicityCrypto` constructor not require Node.js
   - Set `force_fallback=True` as default (or only mode)
   - Update docstring: "Official Python bridge for the TypeScript/WASM crypto backend. **SHA-256 fallback is the only shipped mode.**"

4. **Recommendation: Option B** — The fallback is deterministic, tested, and already the effective implementation. The bridge adds complexity without mechanism.

## Consequences

- Python package no longer requires Node.js/pnpm at runtime
- `MultiplicityCrypto` constructor succeeds without external dependencies
- Bridge status honestly reports `{"available": true, "mode": "fallback", "reason": "bridge-removed"}` or similar
- If WASM is built in future (ADR-070), a new bridge ADR supersedes this

## Testing

- `python3 -c "from multiplicity.crypto import MultiplicityCrypto; c = MultiplicityCrypto(); print(c.getBridgeStatus())"` exits 0
- `python3 -c "from multiplicity.crypto import MultiplicityCrypto; import asyncio; c = MultiplicityCrypto(); print(asyncio.run(c.compute_commitment('test', 'salt')))"` exits 0 with SHA-256 output
- No `FileNotFoundError` for `crypto_bridge.js` or `index.js`
- `grep "crypto_bridge.js" py/multiplicity/crypto/__init__.py` returns 0 matches (if Option B)

## References

- PHASE_MIRROR_AUDIT.md §1 rows 5, 11, §3 rows 41-42
- `py/multiplicity/crypto/__init__.py` lines 71-74, 177-207, 224-246
- `ts/package.json` lines 8-10 (no build script for dist/src/index.js)
- TEST_RESULTS.md §40-50