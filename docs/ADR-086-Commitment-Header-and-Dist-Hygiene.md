# ADR-086: Commitment Header Correction and dist/ Hygiene

- **Status**: Accepted
- **Deciders**: TS owner, Crate maintainer
- **Date**: 2026-09-24
- **Companion**: Phase Mirror Round 2 (D-12); ADR-069; ADR-070 decision #3 (accepted but unexecuted)
- **Supersedes**: `ts/src/commitment.ts` header comment (lines 1–5); committed `ts/dist/` claims
- **Blocks**: None

## Context

`ts/src/commitment.ts` was refactored to an unconditional SHA-256 implementation — the WASM-load attempt and fallback warning were deleted — but its **header comment still asserts the removed capability**:

```
// Commitment API for QKD Hybrid Encryption v1.0.1
// Implements Pedersen commitment (WASM-backed, BN254), fallback warning if unavailable
// Contract: deterministic, matches WASM vectors, testable
```

- ADR-070 decision #3 required exactly this header to be replaced: "SHA-256 commitment with prime-indexed domain tags; BN254 WASM not built." It is unchanged.
- The committed compiled artifact `ts/dist/commitment.js:12,36` **still contains the deleted `wasmModule = require('../rust/pkg/commitment_wasm')` and the "WASM BN254 module not found" fallback** — compiled output contradicting current source. `ts/dist/` also contains a stale nested `dist/src/` tree and compiled `__tests__/` artifacts, and `tsconfig.json` `exclude: ["node_modules","dist"]` means `npm run build` (declared in package.json) does not regenerate or clean `dist`.
- `ts/package.json` declares `"main": "src/index.ts"` — a dangling entry (no `ts/src/index.ts` exists).
- Eight `ts/src/*.ts` files still open with "X module for QKD Hybrid Encryption v1.0.1" — ADR-069 allows the internal `QKD` label, but these headers are the *same sentence* the audit retired from the README, and several files they annotate no longer relate to any QKD path (`protocol.ts` never did).

**Hidden assumptions named**:
1. Header comments and `dist/` outputs were assumed to track `src/`; both are independently stale.
2. `dist/` was assumed to be git-ignored; 64 compiled files are tracked and serve as a mirrored, contradicting source of truth.
3. The "QKD Hybrid Encryption" header sentence was assumed neutral because ADR-069 allowed internal names; it has become an advertisement for a mechanism the file does not contain.

## Decision

1. **`ts/src/commitment.ts` header SHALL be replaced** with:
   `// SHA-256 commitment with prime-indexed domain tags (PM-COMMIT-p${prime}). BN254 WASM is not the default execution path (ADR-070; ADR-085).`
   No line in the file may mention Pedersen or QKD.
2. **Stale `dist/` contradicting source SHALL be removed**: `dist/commitment.js` (and any compiled `*.js`/`*.d.ts` whose source no longer exists or that contradicts `src/`) deleted; `dist/src/` nested tree deleted. The `npm run build` script SHALL clean `dist` (e.g. `rm -rf dist && tsc`).
3. **Build outputs SHALL not be committed**: `ts/dist/` added to `.gitignore`; tracked `dist/` files removed from the index.
4. **`package.json` `main` SHALL be removed or pointed at a real entry** (`src/index.ts` does not exist). Either add the entry file or drop the field.
5. **The eight "QKD Hybrid Encryption v1.0.1" header lines SHALL be contextualized**: rename to "[module] module — simulated classical hybrid encryption with prime-indexed tags" (matching the crate's real title), or drop the version sentence. Internal type names (`MockQKDBackend`) stay.
6. This correction is the execution of already-accepted ADR-070 #3; it does not reopen the Pedersen decision.

## Consequences

- A reader of `commitment.ts` sees what it does.
- The compiled mirror stops advertising a fallback that no longer exists.
- No build artifact doubles as a contradicting specification.
- Eight stale title sentences no longer sneer at the crate's own README.

## Testing

- `sed -n '1,6p' ts/src/commitment.ts` shows no "Pedersen"/"QKD".
- `git ls-files ts/dist/` returns 0; `grep -n "dist" ts/.gitignore` returns the entry.
- `rm -rf ts/dist && cd ts && npm run build && tsc --noEmit` exits 0.
- `grep -rln "QKD Hybrid Encryption" ts/src` returns 0.
- `grep '"main"' ts/package.json` returns 0 (or points to a real file in `git ls-files`).

## References

- `ts/src/commitment.ts:1-5`, `ts/dist/commitment.js:12,36`, `ts/dist/src/` (stale tree)
- `ts/package.json:7-11`, `ts/tsconfig.json:18-19`
- ADR-069 (titles/labels), ADR-070 decision #3 (header correction), ADR-085 (WASM claims), ADR-090 (provenance: `commitment.ts` header claims pinned to `3d49da5`)