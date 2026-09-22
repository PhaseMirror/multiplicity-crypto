# ADR-079: SOURCES.md — Complete Provenance Documentation

- **Status**: Accepted
- **Deciders**: Documentation owner, Crate maintainer
- **Date**: 2026-09-22
- **Companion**: PHASE_MIRROR_AUDIT.md §1 row 6, §3 row 12
- **Supersedes**: Current `SOURCES.md` (incomplete)

## Context

`SOURCES.md` documents the consolidation from `packages/agiOS/` but is incomplete:

**Documented adjustments (4):**
1. Path updates
2. Try/except wrapping for `cas_registry` import
3. (Two others mentioned but not detailed in PHASE_MIRROR_AUDIT.md)

**NOT documented (per PHASE_MIRROR_AUDIT.md):**
- Missing `agi` import failure at `__init__.py:32` (not wrapped)
- Missing `pirtm` dependency (referenced in `cas_registry.py` and test file)
- Missing `mkt_colored_braid`, `mkt_constants_estimation`, `mkt_invariant` modules
- Bridge script references (`ts/python/crypto_bridge.js`, `ts/dist/src/index.js`)
- Rust `ark-bn254` dependencies without WASM build
- TypeScript test runner (vitest) not declared

## Decision

1. **`SOURCES.md` MUST document 100% of `py/multiplicity/` imports** — every `from . import X` or `from .module import Y` must have a corresponding entry explaining:
   - Source location in `packages/agiOS/`
   - Current status (implemented, stubbed, missing, removed)
   - Any adjustments made during consolidation

2. **Add a "Missing/Stubbed Modules" section** listing:
   - `agi`, `topos`, `cert`, `utils`, `moonshine`, `zeno_heartbeat`, `kernel_telemetry` — all stubbed via try/except in `__init__.py`
   - `pirtm` — external dependency, not in source tree
   - `mkt_colored_braid`, `mkt_constants_estimation`, `mkt_invariant` — missing, MBC prototype non-functional
   - `ts/python/crypto_bridge.js`, `ts/dist/src/index.js` — referenced but never created

3. **Add a "Rust/TypeScript Adjustments" section** documenting:
   - `ark-bn254` dependencies added but WASM not built
   - `vitest` added to devDependencies post-consolidation
   - `vitest.config.ts` created post-consolidation
   - `MockQKDBackend` renamed from any QKD implementation

4. **`SOURCES.md` becomes the authoritative provenance record** — if a module isn't documented here, it's untraceable.

## Consequences

- Complete audit trail from `agiOS` to `multiplicity-crypto`
- No hidden adjustments or missing modules
- Future audits can verify consolidation completeness
- Documentation owner has clear ownership of provenance accuracy

## Testing

- `grep -r "from . import" py/multiplicity/` — every unique import appears in SOURCES.md
- `grep -r "import " py/multiplicity/` — every non-stdlib import documented
- SOURCES.md has sections for: Python modules, Rust modules, TypeScript modules, Missing/Stubbed, Bridge scripts, Dependencies
- PHASE_MIRROR_AUDIT.md §1 row 6 resolved (no "Provenance record incomplete")

## References

- PHASE_MIRROR_AUDIT.md §1 row 6, §3 row 12
- `SOURCES.md` (current)
- `py/multiplicity/__init__.py`
- `py/multiplicity/math/cas_registry.py`
- `py/multiplicity/mkt/mkt_commitment.py`
- `py/multiplicity/crypto/__init__.py`
- `rust/Cargo.toml`
- `ts/package.json`