# ADR-090: Provenance Register — Every Claim Pinned to a Commit

- **Status**: Accepted
- **Deciders**: Crate maintainer, Docs owner, QA owner
- **Date**: 2026-09-24
- **Companion**: Phase Mirror Round 3; ADR-084 (labeled artifact graph); ADR-091 (conformance rule); `PROVENANCE.md` (created on acceptance)
- **Supersedes**: Un-pinned evidence in the round-1 and round-2 audits (all `file:line` references without a commit)
- **Blocks**: None

## Context

A claim without a commit is a hypothesis. Round 1 verified presence; round 2 verified correspondence; round 3 verifies **provenance — for every claim: who decided it, when, under what authority, and does the artifact match the decision.** The audit must hold itself to this first: the round-2 D-items are therefore repinned below against HEAD (`3d49da5`) unless stated.

Provenance facts that change the reading of round 2:

1. **The ADR-069 and ADR-070 documents and the code they contradict entered in the same commit**, `3d49da5` (HEAD): `docs/ADR-069-QKD-Label-Correction.md` (`--diff-filter=A` → 3d49da5) alongside the `HardwareQKDBackend` class in `ts/src/qkd.ts` (added in 3d49da5). The "no quantum hardware anywhere" context sentence and the hardware client were committed together — the ADR documented a world the same commit ended. This is the process defect ADR-091 exists to close.
2. **The BN254 wasm artifact and its loaders entered together** in `2c7d4f7` ("ADR-075"): `rust/pkg/…_bg.wasm`, `ts/src/wasmLoader.ts`, `py/…/wasm_loader.py` all `--diff-filter=A` → 2c7d4f7. The "WASM never built" claims in README/SOURCES/Cargo postdate that commit without re-checking it.
3. `Protocol.lean` created in `75f0641`, refactored `3d49da5`; `lean/test.lean` added `3d49da5`. `protocol.{ts,py,rs}` created `75f0641`, refactored `6b0f014`, `3d49da5`.
4. `setup.py`, `test_ace_crypto_integration.py`, the MKT stubs, and `cas_registry.py` are all `7a9852a` (first commit) — the pirtm/declaration and MBC-stub defects are first-commit defects, not consolidation artifacts.

## Decision

### 1. `PROVENANCE.md` is created at repo root on acceptance.

It is the **single claim register**. Every row of ADR-084's role table, every README/SOURCES label, and every committed build artifact is indexed there with: `path`, `commit`, optional `sha256`, and `probe` (the exact grep/command that verifies the claim). ADR-091's conformance gate reads exclusively from `PROVENANCE.md`.

### 2. Committed artifacts are registered review surface (assumption A7, closed).

`.lake/`, `rust/target/`, `rust/pkg/`, and `ts/dist/` are tracked in git. Until each is either git-ignored or registered with commit + sha256 in `PROVENANCE.md`, **an unregistered committed artifact is a REJ** under the conformance gate. Registration is not permission: artifacts still require an owner decision (e.g. ADR-085 for the wasm).

### 3. The round-2 D-items are repinned (evidence lock).

| ID | Claim (pinned) | Artifact that contradicts it (pinned) | Verification |
|----|----------------|-----------------------------------------|--------------|
| D-11 | `README.md:3,19` "No BN254 WASM on disk" / "not built" @ **3d49da5**; `rust/Cargo.toml:5` @ **3d49da5**; `SOURCES.md:113-115` @ **3d49da5** | `rust/pkg/multiplicity_crypto_rust_bg.wasm` @ **2c7d4f7** (sha256 `8f3ea751…8166`) | `git show 2c7d4f7:rust/pkg/multiplicity_crypto_rust_bg.wasm | sha256sum` |
| D-12 | `ts/src/commitment.ts:1-2` header "QKD Hybrid Encryption"/"Pedersen (WASM-backed, BN254)" @ **3d49da5** | body `:21-33` unconditional SHA-256 | `git show 3d49da5:ts/src/commitment.ts` |
| D-13 | `README.md:14-24` module map omits `protocol.ts` @ **3d49da5** | `ts/src/protocol.ts` @ **75f0641** (787 lines, 15 tests) | `git ls-files ts/src/protocol.ts` |
| D-14 | Lean "formalization" @ **3d49da5** | `sorry` :282, :290-291; `axiom` :284-285; `lean/test.lean` @ **3d49da5** | `git show 3d49da5:lean/MultiplicityCrypto/Protocol.lean` |
| D-15 | `docs/ADR-069` §Context "no quantum hardware exists anywhere" @ **3d49da5** | `ts/src/qkd.ts:13-48` `HardwareQKDBackend` @ **3d49da5** (same commit) | `git log -S HardwareQKDBackend --oneline` |
| D-16 | fail-closed wasm boundary @ **2c7d4f7** | loader cites "ADR-075" (Cargo cleanup); `process.exit(1)`; dead importers | `git show 2c7d4f7 --stat` |
| D-17 | `py/setup.py` (no `pirtm`) @ **7a9852a** | `test_ace_crypto_integration.py:23-24` unguarded `from pirtm…` @ **7a9852a**; MKT stubs @ **7a9852a** (ADR-077 marker wording not applied) | `git show 7a9852a:py/setup.py` |

### 4. "Tests pass" is restated precisely, everywhere it appears.

The suite result is **"32/32 of the TS tests that run pass" at `3d49da5` — not "95/95"** (the "95/95 across 18 files" figure in the round-3 audit text is corrected here as dishonest: `3d49da5` ran 32 tests across 6 files, and ADR-089 decision 6 ratifies the honest split). Registered known-untested surface at `3d49da5`: `commitment.ts`, `keyderivation.ts`, `transcript.ts`, `multiplicity.ts`, `wasmLoader.ts` (no committed tests); the Python cryptographic integration test (`test_ace_crypto_integration.py`) is **unrunnable without `pirtm`** at `3d49da5` (ADR-089 @ `7832f42` makes it skip cleanly via `importorskip`); `protocol.py` and Rust `pedersen.rs` have no tests. Every future audit/ADR line that says "all tests pass" must carry the runnable/unrunnable split.

### 5. Proof obligation.

Any finding citing a path must include the commit (`path:line @ COMMIT`) or it is discarded. This rule applies to ADR-091's probes first: a probe with no commit resolution is not a probe.

## Consequences

- Round 3 makes round 1 and round 2 checkable: every D-item now has a verify command (section D of `PROVENANCE.md`, with a `Resolution @ HEAD` column).
- The "same commit" pattern (ADR doc `3d49da5` + violating code `3d49da5`) is named and gives ADR-091 its sharpest test case.
- Committed artifacts stop being invisible review surface: `rust/target/` (3563 paths of machine-specific build output) was untracked and git-ignored at acceptance; `.lake/`, `rust/pkg/`, and `ts/dist/` were already untracked/ignored or removed.
- The audit can no longer go stale the way the claims it criticized did — a stale pin is a failed probe, not a footnote.

## Testing

- `git show <pin> --stat` resolves for every row in §3 (verified at acceptance for `3d49da5`, `2c7d4f7`, `75f0641`, `6b0f014`, `7a9852a`).
- `PROVENANCE.md` exists at repo root and is committed with the tree it describes (`git diff --exit-code PROVENANCE.md` is clean at acceptance).
- `git ls-files | grep -E '^(\.lake|rust/target|rust/pkg|ts/dist)/'` returns nothing — every path is untracked/ignored or removed.
- Every occurrence of the substring "tests pass" in `docs/`, `README.md`, ADR files reads "tests that run pass" or carries the runnable/unrunnable split (ADR-068, ADR-070, ADR-072 corrected at acceptance; §4 above corrected to the honest `3d49da5` figure).

## Addendum (2026-09-24) — implemented

- `PROVENANCE.md` created at repo root: sections A (ADR-084 role rows with `path @ commit`, `sha256`, `probe`), B (committed-artifact dispositions), C (README/SOURCES label probes), D (round-2 D-items repinned with verify commands and resolution commits), E (suite counts with the runnable/unrunnable split).
- `rust/target/` untracked (`git rm -r --cached rust/target`, 3563 paths) and `.gitignore` extended with `rust/target/` alongside `.lake/`.
- "tests pass" wording corrected in ADR-068, ADR-070, ADR-072 to "tests that run pass"; ADR-090 §4's "95/95" corrected to 32/32 @ `3d49da5` (ratified by ADR-089 decision 6).
- README links `PROVENANCE.md` (Contents + Testing probe line).
- Verified: `git ls-files rust/target/` → 0; every D-item pin resolves; all suites green (see section E of the register).

## References

- `git log --diff-filter=A` outputs for: `rust/pkg/*.wasm`, `ts/src/wasmLoader.ts`, `py/…/wasm_loader.py` (→ 2c7d4f7); `docs/ADR-069`, `docs/ADR-070`, `ts/src/qkd.ts`, `lean/test.lean` (→ 3d49da5); `ts/src/protocol.ts`, `py/…/protocol.py`, `rust/src/protocol.rs`, `lean/…/Protocol.lean` (→ 75f0641); `py/setup.py`, `cas_registry.py`, MKT stubs, `vitest.config.ts` (→ 7a9852a)
- ADR-084 (role table), ADR-085 (wasm terminus), ADR-091 (probes read PROVENANCE.md), ADR-082 (diagnostic/advisory posture)