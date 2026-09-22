# ADR-072: TypeScript Test Runner — vitest Declared and Configured

- **Status**: Accepted
- **Deciders**: TS owner, Crate maintainer
- **Date**: 2026-09-22
- **Companion**: PHASE_MIRROR_AUDIT.md (D-04), ADR-068 (F-MC-04), TEST_RESULTS.md
- **Supersedes**: `ts/package.json` missing vitest in devDependencies; missing `vitest.config.ts`

## Context

The TypeScript test configuration has multiple contradictions:

1. `ts/package.json:10` declares `"test": "vitest run"` but `vitest` was **not** in `devDependencies` (added after audit per TEST_RESULTS.md)

2. `ts/tsconfig.json` includes `"types": ["node", "jest"]` but:
   - `jest` is not in `devDependencies`
   - Tests use Jest-style globals (`describe`, `it`, `expect`) which vitest supports only with `globals: true` config

3. No `vitest.config.ts` existed — tests required manual `--globals` flag to run

4. TEST_RESULTS.md confirms: after adding `vitest` to devDependencies and creating `vitest.config.ts` with `globals: true`, all 17 tests pass.

## Decision

1. **`vitest` MUST be declared in `ts/package.json` `devDependencies`** (already done per TEST_RESULTS.md — verify it remains).

2. **`ts/vitest.config.ts` MUST exist with `globals: true`** (already done per TEST_RESULTS.md — verify it remains).

3. **`tsconfig.json` MUST remove `"jest"` from `types` array** since jest is not a dependency and vitest provides its own types.

4. **`npm test` from `ts/` MUST pass with no extra flags** — no `--globals`, no manual vitest install.

5. The test command in `package.json` remains `"test": "vitest run"`.

## Consequences

- CI runs `npm test` reliably without manual intervention
- No false positives from missing globals config
- TypeScript types are accurate (no phantom jest types)
- Test runner is explicitly declared and versioned

## Testing

- `cd ts && npm test` exits 0 with 17/17 tests passing
- `cd ts && npx tsc --noEmit` passes (no type errors from missing jest types)
- `grep "jest" ts/tsconfig.json` returns no matches in `types` array
- `cat ts/vitest.config.ts` shows `globals: true`

## References

- PHASE_MIRROR_AUDIT.md §1 row 3, §3 "What Is Broken" rows 39-40
- ADR-068 F-MC-04
- Phase Mirror PM-MC-001 §6 F-MC-04
- TEST_RESULTS.md §21-36
- `ts/package.json` lines 8-17
- `ts/tsconfig.json` (needs verification)