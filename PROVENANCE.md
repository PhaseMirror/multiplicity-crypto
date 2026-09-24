# PROVENANCE.md — Claim Register

Authority: ADR-090 (Accepted). ADR-091's conformance gate reads probes exclusively from this file.

Rule: every claim in this repository resolves to `path @ commit`, an optional `sha256`, and a `probe` (the exact command that independently verifies the claim). A pin that no longer resolves is a failed probe (a REJ), not a footnote. Every finding that cites a path MUST include its commit (`path:line @ COMMIT`) or it is discarded (ADR-090 §5).

Registered at the ADR-090 commit; each artifact below is pinned to its own last-touch commit.

## A. ADR-084 role rows (labels resolve to exactly one row)

| Role | Artifact | Commit | sha256 | Probe |
|------|----------|--------|--------|-------|
| `specified` | `ts/src/protocol.ts` | `6b0f014` | `e8e362c7a63c…` | `git log --oneline -1 -- ts/src/protocol.ts`; `sha256sum ts/src/protocol.ts` |
| `canonical-vectors` | `vectors/protocol.json` | `9993912` | `c0b469a6b472…` | `sha256sum vectors/protocol.json` |
| `shipped` (TS) | `ts/src/commitment.ts` | `a3d91d1` | `d5c0e6f9c2f8…` | `sha256sum ts/src/commitment.ts` |
| `shipped` (TS) | `ts/src/aead.ts` | `a3d91d1` | `ab3fabc519bb…` | `sha256sum ts/src/aead.ts` |
| `shipped` (TS) | `ts/src/keyderivation.ts` | `a3d91d1` | `bca027b8ac51…` | `sha256sum ts/src/keyderivation.ts` |
| `shipped` (Python mirror) | `py/multiplicity/crypto/protocol.py` | `9993912` | `a2b96a187fca…` | `git log --oneline -1 -- py/multiplicity/crypto/protocol.py` |
| `shipped` (Rust mirror) | `rust/src/protocol.rs` | `9993912` | `b72330bdcb6f…` | `git log --oneline -1 -- rust/src/protocol.rs` |
| gate | all `shipped` + `specified` vectors, 14/14 × 3 languages | `9993912` | — | `cd ts && npm run diff-vectors` prints `ts gate: 14/14 vectors matched`, `py gate: 14/14 vectors matched`, `rust gate: 14/14 vectors matched` |
| `compiled` | `rust/pkg/multiplicity_crypto_rust_bg.wasm` — **RETIRED** | removed `660fc3d` (ADR-085); historical pin `2c7d4f7` | historical `8f3ea7510a79…8166` | `git ls-files rust/pkg/` → 0; `git show 2c7d4f7:rust/pkg/multiplicity_crypto_rust_bg.wasm \| sha256sum` |
| `claimed` | `lean/MultiplicityCrypto/Protocol.lean` — **verified** | `98990a8` (ADR-087) | `c30b3ad8d8e7…` | `lake build` (0 `sorry` warnings); `scripts/check-sorry-allowlist.sh` exit 0; `grep -rn "sorry\|axiom\|admit" lean/MultiplicityCrypto/` → 0 |

## B. Committed build artifacts (ADR-090 decision 2)

Every path below is either git-ignored or removed; none is an unregistered committed artifact.

| Path | Disposition | Verified by |
|------|-------------|-------------|
| `.lake/` | git-ignored, untracked (ADR-087 @ `98990a8`) | `git ls-files .lake/` → 0; `git check-ignore .lake/` |
| `rust/target/` | untracked + git-ignored (ADR-090). Prior to ADR-090 this directory was committed (3563 paths, machine-specific build output). | `git ls-files rust/target/` → 0; `git check-ignore rust/target/` |
| `rust/pkg/` | removed (ADR-085 @ `660fc3d`, Option B — retire the BN254 artifact and its loaders) | `git ls-files rust/pkg/` → 0 |
| `ts/dist/` | untracked + git-ignored (`ts/.gitignore`); stale dist dropped ADR-086 @ `a3d91d1` | `git ls-files ts/dist/` → 0; `git check-ignore ts/dist/` |

## C. README / SOURCES label probes

| Claim | Location | Probe |
|-------|----------|-------|
| "No quantum channel"; "no compiled artifact is committed (ADR-085)" | `README.md:3` | `git ls-files rust/pkg/` → 0 |
| `qkd.ts` pipeline + opt-in `HardwareQKDBackend` (ETSI GS QKD 014, `HARDWARE_QKD_ETSI_014`) | `README.md:18` | `grep -n "HARDWARE_QKD_ETSI_014" ts/src/qkd.ts` → `:41` |
| `protocol.ts` is `specified` (canonical) | `README.md:19` | resolve to row A.`specified`; probe: `git log --oneline -1 -- ts/src/protocol.ts` → `6b0f014` |
| SHA-256 commitment, `PM-COMMIT-p${prime}` tags; BN254 source build-time-only (ADR-070/085) | `README.md:22`; `ts/src/commitment.ts:1-2` | `grep -n "PM-COMMIT" ts/src/commitment.ts` |
| Python protocol mirror is `shipped` | `README.md:31` | run `npm run diff-vectors` (A. gate row); `git log --oneline -1 -- py/multiplicity/crypto/protocol.py` → `9993912` |
| Protocol Family table = the five ADR-084 role rows | `README.md:45-51` | resolves 1:1 to section A rows |
| Lean verified — no `sorry`/`axiom` | `README.md:13,51,65` | A.`claimed` probes (`lake build`, allowlist checker, grep) |
| SOURCES.md role column mirrors section A | `SOURCES.md` (all `Role` rows) | each `Role` cell resolves to one A row above |
| MKT stub markers `NOT IMPLEMENTED — MBC prototype placeholder` | `SOURCES.md` Missing table; `py/multiplicity/mkt/mkt_{colored_braid,constants_estimation,invariant}.py:2` | `grep -rn "NOT IMPLEMENTED — MBC prototype placeholder" py/multiplicity/mkt/` → 3 |
| `pirtm` optional dep, `extras_require["cas"]` | `SOURCES.md`; `README.md:59` | `grep -n '"cas"' py/setup.py`; integration test skips: `cd py && python3 -m pytest multiplicity/cert/test_ace_crypto_integration.py -q` → `1 skipped` |

## D. Evidence lock — round-2 D-items (repinned at `3d49da5`, ADR-090 §3)

| ID | Claim (pinned) | Contradicting artifact (pinned) | Verify | Resolution @ HEAD |
|----|----------------|--------------------------------|--------|-------------------|
| D-11 | `README.md:3,19` "No BN254 WASM on disk"/"not built" @ `3d49da5`; `rust/Cargo.toml:5` @ `3d49da5`; `SOURCES.md:113-115` @ `3d49da5` | `rust/pkg/multiplicity_crypto_rust_bg.wasm` @ `2c7d4f7` (sha256 `8f3ea751…8166`) | `git show 2c7d4f7:rust/pkg/multiplicity_crypto_rust_bg.wasm \| sha256sum` | ADR-085 @ `660fc3d` (artifact removed, `git ls-files rust/pkg/` → 0) |
| D-12 | `ts/src/commitment.ts:1-2` header "QKD Hybrid Encryption"/"Pedersen (WASM-backed, BN254)" @ `3d49da5` | body `:21-33` unconditional SHA-256 | `git show 3d49da5:ts/src/commitment.ts` | ADR-086 @ `a3d91d1` (header corrected; `grep -rn "QKD Hybrid Encryption" ts/src` → 0) |
| D-13 | `README.md:14-24` module map omits `protocol.ts` @ `3d49da5` | `ts/src/protocol.ts` @ `75f0641` (787 lines) | `git ls-files ts/src/protocol.ts` | ADR-084 @ `9993912` (`README.md:19` + role row A) |
| D-14 | Lean "formalization" @ `3d49da5` | `sorry` `:282,:290-291`; `axiom` `:284-285`; `lean/test.lean` @ `3d49da5` | `git show 3d49da5:lean/MultiplicityCrypto/Protocol.lean` | ADR-087 @ `98990a8` (sorries proved, axioms deleted, `test.lean` deleted, ratchet empty) |
| D-15 | `docs/ADR-069` §Context "no quantum hardware exists anywhere" @ `3d49da5` | `ts/src/qkd.ts:13-48` `HardwareQKDBackend` @ `3d49da5` (same commit) | `git log -S HardwareQKDBackend --oneline` | ADR-088 @ `ca24d47` (ADR-069 amended; opt-in client wired, mock-only in tests) |
| D-16 | fail-closed wasm boundary @ `2c7d4f7` | loader cited "ADR-075" (Cargo cleanup); `process.exit(1)`; dead importers | `git show 2c7d4f7 --stat` | ADR-085 @ `660fc3d` (loaders `ts/src/wasmLoader.ts`, `py/…/wasm_loader.py` removed) |
| D-17 | `py/setup.py` (no `pirtm`) @ `7a9852a` | `test_ace_crypto_integration.py:23-24` unguarded `from pirtm…` @ `7a9852a`; MKT stubs @ `7a9852a` (ADR-077 marker wording not applied) | `git show 7a9852a:py/setup.py` | ADR-089 @ `7832f42` (`extras_require["cas"]`; `importorskip("pirtm")`; stub markers retagged; degenerate MBC path raises) |

## E. Suite counts (ADR-090 decision 4 — "tests that run pass")

At the ADR-090 commit: TypeScript 55/55 across 8 files (`cd ts && npm test` → `Tests 55 passed`); Python `cd py && python3 -m pytest tests/ -q` → 20 passed, integration file → 1 skipped without `pirtm`; Rust `cd rust && cargo test` → 9/9; diff-vectors 14/14 across ts/py/rust (`npm run diff-vectors`). Known-untested surface listed wherever coverage is cited: `commitment.ts`, `keyderivation.ts`, `transcript.ts`, `multiplicity.ts` (no committed unit tests outside the cross-language gate); `py/multiplicity/crypto/__init__.py`, `py/multiplicity/crypto/protocol.py` (no dedicated unit tests; covered by the diff-vectors gate); Rust `pedersen.rs` (none). Any line that says "tests pass" MUST instead carry the runnable/unrunnable split.

Every occurrence of the substring "tests pass" in `docs/`, `README.md`, and ADR files reads "tests that run pass" or carries the split (ADR-090 Testing). `git diff --exit-code PROVENANCE.md` is enforced — the register MUST be committed with the tree it describes (ADR-090 Testing).