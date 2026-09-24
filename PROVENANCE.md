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
| gate | all `shipped` + `specified` vectors, 14/14 × **TS/Py/Rust only** | `9993912` | — | `cd ts && npm run diff-vectors` prints `ts gate: 14/14 vectors matched`, `py gate: 14/14 vectors matched`, `rust gate: 14/14 vectors matched` |
| gate scope | **Lean is excluded from the differential.** `lean/MultiplicityCrypto/Protocol.lean` models frames and secrets but `Digest := Bytes` with an abstract `Hash` structure — it emits no concrete digests, so ADR-084's own condition (`… and Lean once it can emit digests (ADR-087)`) is unmet. This row exists so the gap is visible and flaggable, not silent. | `98990a8` | — | `grep -nE "abbrev Digest|structure Hash" lean/MultiplicityCrypto/Protocol.lean` → abstract digest, no SHA-256 implementation |
| vector scope | The 8 `shipped` vectors cover exactly the shipped path: sha256 (×2), hkdf_extract, hkdf_expand, directional_keys, nonce_prefixes, build_nonce, aead_encrypt (SHA-256 / HKDF-SHA256 / AES-256-GCM). The SHA-256 commitment function (`computeCommitment`, `PM-COMMIT` tags) is **NOT vector-covered** — no `commitment` operation exists in `vectors/protocol.json`; that surface is untested cross-language. | `9993912` | — | `python3 -c "import json;v=json.load(open('vectors/protocol.json'));print(sorted({x['operation'] for x in v['vectors']}))"` → no `commitment` op |
| `compiled` | `rust/pkg/multiplicity_crypto_rust_bg.wasm` — **RETIRED** | removed `660fc3d` (ADR-085); historical pin `2c7d4f7` | historical `8f3ea7510a79…8166` | `git ls-files rust/pkg/` → 0; `git show 2c7d4f7:rust/pkg/multiplicity_crypto_rust_bg.wasm \| sha256sum` |
| `claimed` | `lean/MultiplicityCrypto/Protocol.lean` — **verified: 0 `sorry`, 0 `axiom`** in every tracked `*.lean`; allowlist ratchet **N=0, occurrences=0** (not "clean" — numeric) | `98990a8` (ADR-087) + round-3 hardening commit `65fd862` (below) | `c30b3ad8d8e7…` | `lake build`; `bash scripts/check-sorry-allowlist.sh` prints `PASS: sorry ratchet N=0, occurrences=0`; `git grep -nE "sorry\|axiom\|admit" -- 'lean/*.lean' 'lean/**/*.lean'` → 0 (this commit also deletes `lean/test.lean`, which ADR-087's addendum claimed deleted but which was still tracked with `sorry`+`axiom` — see D-14) |

## B. Committed build artifacts (ADR-090 decision 2)

Every path below is either git-ignored or removed; none is an unregistered committed artifact.

| Path | Disposition | Verified by |
|------|-------------|-------------|
| `.lake/` | git-ignored, untracked (ADR-087 @ `98990a8`) | `git ls-files .lake/` → 0; `git check-ignore .lake/` |
| `rust/target/` | untracked + git-ignored (ADR-090). Prior to ADR-090 this directory was committed (3563 paths, machine-specific build output). | `git ls-files rust/target/` → 0; `git check-ignore rust/target/` |
| `rust/pkg/` | removed (ADR-085 @ `660fc3d`, Option B — retire the BN254 artifact and its loaders) | `git ls-files rust/pkg/` → 0 |
| `ts/dist/` | untracked + git-ignored (`ts/.gitignore`); stale dist dropped ADR-086 @ `a3d91d1` | `git ls-files ts/dist/` → 0; `git check-ignore ts/dist/` |
| `*/node_modules/` | **untracked (`65fd862`). Prior to this commit 1354 `ts/node_modules/` paths were tracked** despite `ts/.gitignore` — tracked files are invisible to `git check-ignore`, so the ignore never protected the index. | `git ls-files '*/node_modules/**'` → 0 |
| `**/__pycache__/*.pyc` | **untracked + git-ignored (`65fd862`). Prior to this commit 21 `.pyc` files were tracked** (machine-specific bytecode) despite SOURCES.md's "no compiled artifacts" inventory table — same defect class as `rust/target/`. | `git ls-files '*.pyc'` → 0; `git check-ignore py/multiplicity/__init__.py` build product |
| `*.egg-info/` | **untracked + git-ignored (`65fd862`). Prior to this commit `py/multiplicity_crypto_py.egg-info/` (5 files, generated metadata) was tracked.** | `git ls-files '*.egg-info/**'` → 0; `git check-ignore py/multiplicity_crypto_py.egg-info/` |

The denylist above is a **gate, not a label**: `probes/adr-090.sh` fails if ANY of these patterns is present in the index (`rust/target .lake node_modules __pycache__ *.egg-info ts/dist rust/pkg *.wasm *.py[cod] *.egg-link`). Three artifact classes (`__pycache__`, `*.egg-info`, `node_modules`) were discovered still tracked by the round-3 audit — each "git-ignored" yet immune to `check-ignore` once tracked — and each is now denied by the gate, so the class cannot return silently.

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
| D-14 | Lean "formalization" @ `3d49da5` | `sorry` `:282,:290-291`; `axiom` `:284-285`; `lean/test.lean` @ `3d49da5` | `git show 3d49da5:lean/MultiplicityCrypto/Protocol.lean` | ADR-087 @ `98990a8` proved the sorries, deleted the axioms, emptied the ratchet (N=0) — **but its addendum claim "test.lean deleted" was FALSE: the scratch file stayed tracked with `sorry`+`axiom` until the round-3 hardening commit `65fd862`, which deletes it and widens the probe to every tracked `lean/**/*.lean`.** Verified: `git log --diff-filter=D -- lean/test.lean` shows the round-3 commit; `git grep -nE "sorry\|axiom\|admit" -- 'lean/*.lean' 'lean/**/*.lean'` at HEAD → 0 |
| D-15 | `docs/ADR-069` §Context "no quantum hardware exists anywhere" @ `3d49da5` | `ts/src/qkd.ts:13-48` `HardwareQKDBackend` @ `3d49da5` (same commit) | `git log -S HardwareQKDBackend --oneline` | ADR-088 @ `ca24d47` (ADR-069 amended; opt-in client wired, mock-only in tests) |
| D-16 | fail-closed wasm boundary @ `2c7d4f7` | loader cited "ADR-075" (Cargo cleanup); `process.exit(1)`; dead importers | `git show 2c7d4f7 --stat` | ADR-085 @ `660fc3d` (loaders `ts/src/wasmLoader.ts`, `py/…/wasm_loader.py` removed) |
| D-17 | `py/setup.py` (no `pirtm`) @ `7a9852a` | `test_ace_crypto_integration.py:23-24` unguarded `from pirtm…` @ `7a9852a`; MKT stubs @ `7a9852a` (ADR-077 marker wording not applied) | `git show 7a9852a:py/setup.py` | ADR-089 @ `7832f42` (`extras_require["cas"]`; `importorskip("pirtm")`; stub markers retagged; degenerate MBC path raises) |

## D-3. Evidence lock — round-3 findings, resolved by the round-3 hardening commit `65fd862`

The round-3 audit (§A gate scope, §E numeric stance, §B denylist, adr-091 probe-of-probes) re-checked the register's own claims and found four live contradictions — the same D-11/D-12 pattern in a new location, which is exactly why the register must be audited by the same standard.

| ID | Claim pinned | Contradiction at HEAD (`7b00783`) | Verify | Resolution @ `65fd862` |
| D-18 | ADR-090 §B: no registered committed artifact | 21 tracked `**/__pycache__/*.pyc` | `git ls-files '*.pyc'` at `7b00783` → 21 | untracked; `__pycache__/`/`*.py[cod]` ignored; adr-090 denylist forbids the class |
| D-19 | ADR-090 §B: no registered committed artifact | 5 tracked `py/multiplicity_crypto_py.egg-info/` files | `git ls-files '*.egg-info/**'` at `7b00783` → 5 | untracked; `*.egg-info/` ignored; adr-090 denylist forbids the class |
| D-20 | ADR-090 §B: no registered committed artifact | 1354 tracked `ts/node_modules/` paths (tracked files are invisible to `git check-ignore`) | `git ls-files '*/node_modules/**'` at `7b00783` → 1354 | untracked; denylist forbids the class |
| D-21 | ADR-087 addendum "test.lean deleted" | `lean/test.lean` tracked with `sorry` + `axiom` through `7b00783` | `git show 7b00783:lean/test.lean` | deleted here; probe widened to every tracked `lean/**/*.lean`; ratchet numeric N=0 (D-14 row amended) |

## E. Suite counts (ADR-090 decision 4 — "tests that run pass")

At the ADR-090 commit: TypeScript 55/55 across 8 files (`cd ts && npm test` → `Tests 55 passed`); Python `cd py && python3 -m pytest tests/ -q` → 20 passed, integration file → 1 skipped without `pirtm`; Rust `cd rust && cargo test` → 9/9; diff-vectors 14/14 across ts/py/rust (`npm run diff-vectors`). Known-untested surface listed wherever coverage is cited: `commitment.ts`, `keyderivation.ts`, `transcript.ts`, `multiplicity.ts` (no committed unit tests outside the cross-language gate); `py/multiplicity/crypto/__init__.py`, `py/multiplicity/crypto/protocol.py` (no dedicated unit tests; covered by the diff-vectors gate); Rust `pedersen.rs` (none). Any line that says "tests pass" MUST instead carry the runnable/unrunnable split.

Every occurrence of the substring "tests pass" in `docs/`, `README.md`, and ADR files reads "tests that run pass" or carries the split (ADR-090 Testing). `git diff --exit-code PROVENANCE.md` is enforced — the register MUST be committed with the tree it describes (ADR-090 Testing).

**Historical superseded figures (round-3 accuracy floor).** The figure "95/95 across 18 files" appears in earlier commit messages and ADR text and is **false**. The true history: `3d49da5` ran **32/32 across 6 files**; HEAD runs **55/55 across 8 files**. ADR-089 decision 6 and ADR-090 §4 carry the correction; old artifacts still showing "95/95" are superseded by this register, and any re-flagging of "95/95" from old text is a stale-pin finding, not a new one. Likewise, Lean is reported with a numeric ratchet (`N=0, occurrences=0`) and the differential's TS/Py/Rust scope is explicit (§A gate rows) — no "×4", no "clean".

## F. Conformance probes (ADR-091)

Each accepted ADR registers one probe — the smallest command whose failure proves the tree violates that ADR. `probes/run-all.sh` executes every `probes/adr-*.sh`; a failing probe blocks merge (ADR-091 #3). Probes use `git grep` so they read the committed tree only.

| Probe | Guards | Probe command |
|-------|--------|---------------|
| `probes/adr-069.sh` | ADR-069 label honesty | no "QKD Hybrid Encryption" in `README.md`, `ts/package.json`, `py/multiplicity/crypto/__init__.py` |
| `probes/adr-070.sh` | ADR-070 mechanism claim | `commitment.ts` header SHA-256/`PM-COMMIT`, no `Pedersen`/`WASM-backed` |
| `probes/adr-072.sh` | ADR-072 runner | `"vitest"` in `ts/package.json`; `globals: true` in `vitest.config.ts` |
| `probes/adr-074.sh` | ADR-074 placeholder | no "computed on commit" in tracked sources |
| `probes/adr-076.sh` | ADR-076 bridge removal | no `crypto_bridge.js`/`DIST_ENTRY_PATH`/`BRIDGE_SCRIPT_PATH` in `py/multiplicity` |
| `probes/adr-078.sh` | ADR-078 runner types | no `jest` in `ts/tsconfig.json` |
| `probes/adr-083.sh` | ADR-083 PQ honesty | no post-quantum/quantum-resistant capability claim co-occurring with `BN254`/`commitment`/`Pedersen` in README.md/SOURCES.md/source headers (scoped per ADR-091 addendum) |
| `probes/adr-084.sh` | ADR-084 diff-vectors gate | `npm run diff-vectors` → 14/14 × ts/py/rust (Lean excluded — cannot emit digests; vector 8 cover the shipped SHA-256/HKDF/AES path, no `commitment` op) |
| `probes/adr-085.sh` | ADR-085 wasm retirement | no tracked `.wasm` artifact |
| `probes/adr-086.sh` | ADR-086 header correctness | no "QKD Hybrid Encryption" in `ts/src`; `PM-COMMIT` present in `commitment.ts` |
| `probes/adr-087.sh` | ADR-087 Lean proof surface | no `sorry`/`axiom`/`admit` in **any tracked `lean/**/*.lean`** (not just `lean/MultiplicityCrypto/`); `check-sorry-allowlist.sh` prints `N=0, occurrences=0` |
| `probes/adr-088.sh` | ADR-088 honest labels | `HARDWARE_QKD_ETSI_014` in `qkd.ts` + hardware test; `SIMULATED_QKD` default in `qkd.ts` |
| `probes/adr-089.sh` | ADR-089 optional-dep honesty | `pirtm` in `py/setup.py`; `importorskip("pirtm")`; ≥3 MKT placeholder markers; `NotImplementedError` guard |
| `probes/adr-090.sh` | ADR-090 register + artifact denylist gate | `PROVENANCE.md` committed & `git diff --exit-code` clean; **artifact denylist empty in the index** (`rust/target .lake node_modules __pycache__ *.egg-info ts/dist rust/pkg *.wasm *.py[cod]`) |
| `probes/adr-091.sh` | ADR-091 self + **source-inventory meta-probe** | `probes/run-all.sh` present/executable; ≥15 probe scripts tracked; **bidirectional check: every tracked file under `ts/src/ py/ rust/src/ lean/` has a row in `probes/inventory.txt`, and every row is tracked** — a new module unregistered in the inventory fails the gate (ADR-091 §G) |

Simulated-contradiction check at acceptance: mutating `dev/null`-free temporary copy of `ts/src/commitment.ts` header to reintroduce `WASM-backed` makes `probes/adr-070.sh` fail — the gate itself is verified to detect the D-12 class of regression (ADR-091 Testing).

## G. Source inventory — the probe-of-probes (this commit)

ADR-091's per-ADR probes fire only on the *specific* claim each ADR made. They cannot see a **new** module that contradicts an accepted ADR's scope under a different name. Section G closes that gap mechanically: `probes/inventory.txt` registers every tracked source/test file under the enumerated roots (`ts/src/`, `py/`, `rust/src/`, `lean/`) against a governing ADR/probe, and `probes/adr-091.sh` enforces the bidirectional containment bidirectionally:

- every tracked file under a root MUST have an inventory row — so **adding a module without a register row (hence without an ADR decision) fails the gate**, the process rule behind ADR-091 #1 cached as a command;
- every inventory row MUST still be tracked — so a superseded entry cannot linger.

Built from `git ls-files` at `65fd862`: 49 rows (lean 2, py 23, rust/src 6, ts/src 18). The inventory file and the meta-probe itself live under `probes/` and are guarded by `probes/adr-091.sh`'s executable/count checks plus the ADR-091 rows in §F — the gate guards its own substrate. A rejection citing "unregistered module under `ts/src/`" resolves to `probes/adr-091.sh` → `probes/inventory.txt:path`.