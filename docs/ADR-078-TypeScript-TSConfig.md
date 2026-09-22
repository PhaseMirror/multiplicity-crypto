# ADR-078: TypeScript tsconfig.json — Remove Jest Types Without Jest

- **Status**: Accepted
- **Deciders**: TS owner, Crate maintainer
- **Date**: 2026-09-22
- **Companion**: PHASE_MIRROR_AUDIT.md §1 row 7, ADR-072
- **Supersedes**: `ts/tsconfig.json` `"types": ["node", "jest"]`

## Context

`ts/tsconfig.json` includes:
```json
"types": ["node", "jest"]
```

But:
- `jest` is not in `devDependencies` (only `@types/jest` is, which provides types only)
- Tests use vitest, not jest
- vitest provides its own types (`@types/vitest` or `vitest/globals`)
- The `@types/jest` package only provides type definitions, not the test runner

This creates a contradiction: TypeScript compiles against Jest types but the test runner is vitest with globals.

## Decision

1. **Remove `"jest"` from the `types` array in `ts/tsconfig.json`.**

2. **Add `"vitest/globals"` to `types`** (or rely on `vitest` package's built-in types via `import { describe, it, expect } from 'vitest'` in test files).

3. **Remove `@types/jest` from `devDependencies`** since it's unused.

4. Test files should either:
   - Import vitest globals explicitly: `import { describe, it, expect } from 'vitest'`, OR
   - Rely on `vitest.config.ts` `globals: true` with `"vitest/globals"` in tsconfig types

## Consequences

- No phantom Jest types in compilation
- TypeScript types match the actual test runner (vitest)
- Cleaner dependency graph
- No confusion for contributors

## Testing

- `cd ts && npx tsc --noEmit` passes with no type errors
- `grep "jest" ts/tsconfig.json` returns 0 matches in `types` array
- `grep "@types/jest" ts/package.json` returns 0 matches
- `npm test` still passes (17/17)

## References

- PHASE_MIRROR_AUDIT.md §1 row 7
- ADR-072 (TypeScript Test Runner)
- `ts/tsconfig.json`
- `ts/package.json` lines 12-16
- `ts/vitest.config.ts`