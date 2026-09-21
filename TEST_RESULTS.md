# Test Results Record

Date: 2026-09-20 (updated 2026-09-20 after production-grade fixes)

## Rust (`cargo test` — run from `rust/`)

**Result: 2/2 passed** ✓

```
running 2 tests
test transcript::tests::test_different_messages_different_challenges ... ok
test transcript::tests::test_transcript_deterministic ... ok

test result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

`Cargo.toml` retains `[workspace]` empty table (required for standalone operation under repo root workspace). No `[dev-dependencies]` or `[workspace]` boilerplate beyond the marker.

---

## TypeScript (`npm test` from `ts/`)

**Result: 17/17 passed** ✓ (2 original + 15 new P2 tests)

```
 RUN  v4.1.11
  src/__tests__/adr-007-e2e-cryptographic-roundtrip.test.ts (1 test)
  src/__tests__/qkd-roundtrip.test.ts (1 test)
  src/__tests__/feedback.test.ts (6 tests)
  src/__tests__/aead.test.ts (4 tests)
  src/__tests__/frequency.test.ts (5 tests)
  Test Files  5 passed (5)
  Tests  17 passed (17)
```

Requires `vitest` in devDependencies (added) and `vitest.config.ts` with `globals: true` (created). `tsc --noEmit` passes with zero errors.

---

## Python (`python3 -c "import multiplicity"`)

**Result: Package imports successfully** ✓ (was: 0/0 runnable)

```
CAS registry not available, some features disabled
import OK
CAS_AVAILABLE: False
```

Package now imports cleanly. `CAS_AVAILABLE` correctly resolves to `False` (pirtm/numpy/sympy not installed in test environment). All previously-unwrapped dead-module imports (`agi`, `topos`, `cert`, `utils`, `moonshine`, `zeno_heartbeat`, `kernel_telemetry`) now gracefully handled via `try/except` loop.

`python3 -m pytest` requires numpy/sympy/pytest installation (declared in `py/setup.py`).

---

## Summary Table

| Language | Tests | Passed | Failed | Blocked |
|----------|-------|--------|--------|---------|
| Rust | 2 | 2 | 0 | 0 |
| TypeScript | 17 | 17 | 0 | 0 |
| Python | 0 (import only) | 1 import | 0 | 0 (deps required for full suite) |

---

## Changes from initial audit

| Item | Before | After |
|------|--------|-------|
| TS tests | 0/2 (no runner) | 17/17 |
| Python import | ImportError on `agi` | Imports cleanly |
| README claims | "QKD", "WASM-backed BN254" | "Simulated classical hybrid encryption" |
| `package.json` | vitest not declared | vitest declared |
| `vitest.config.ts` | absent | present with `globals: true` |
| `Cargo.toml` | empty `[workspace]` + `[dev-dependencies]` | `[workspace]` marker only |
| `setup.py` | no dependencies declared | numpy, sympy in install_requires; pytest in test extra |
| Stub modules | 11 missing modules | All stubbed |

---

## Phase Mirror Close-Out (2026-09-20 14:26 UTC)

The close-out rejects this session's implementation as production-grade for the following reasons:

1. **ADR number collision**: ADR-066 is occupied by PIRTM Ξ-Constitution (proposed). ADR-067 is occupied by governance artifact. Renamed to **ADR-068** (Proposed status, workspace verification only).

2. **Uncommitted workspace**: All green results were produced on an uncommitted workspace state. No git repository is accessible at the working directory. Chat `17/17` and `import OK` are not CI on a named origin SHA.

3. **Stub-wrapped imports are not mechanism presence**: Wrapping `from . import agi` in `try/except` prevents the crash but does not provide the module's functionality. The import surface now matches the directory surface (all stubbed), but no mechanism is implemented.

4. **Origin bind required**: `ts/package.json` and `README.md` must match on origin SHA before `npm test` and `python3 -c "import multiplicity"` can be trusted as authoritative. Current state is workspace-local only.

5. **ADR-010 and ADR-012**: This package still does not populate ADR-010 fields 1–5 and does not lift ADR-012.

| Lever | Status |
|-------|--------|
| ID freeze | Not applied — no governance instruction to halt ADR numbering |
| Origin bind | Pending — package maintainer to land four files on a named SHA |
| Dual tree | Not addressed |
| Scope cut | Not applied |
