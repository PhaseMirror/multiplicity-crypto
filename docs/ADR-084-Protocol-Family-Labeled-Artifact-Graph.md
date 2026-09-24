# ADR-084: Protocol Family — Labeled Artifact Graph and Conformance Vectors

- **Status**: Accepted
- **Deciders**: Crate maintainer, Formal Methods steward, QA owner
- **Date**: 2026-09-24
- **Companion**: Phase Mirror Round 2 (D-13, precision question); ADR-068 (F-MC-04, F-MC-05); SOURCES.md; ADR-090 (provenance register)
- **Supersedes**: `README.md` TypeScript Module Map (invisible `protocol` family); "the protocol" as an unlabeled artifact
- **Blocks**: None

## Context

The same classical wire protocol is implemented in four artifacts. The first audit named them competitors; they are not. They answer four different questions, and the crate's failure mode is that it **collapses their labels**: README describes one node, code implements another, loaders are tuned to a third, and the Lean module asserts a fourth.

Provenance (pinned per ADR-090):

| Artifact | Entered repo | Size | Tests |
|----------|--------------|------|-------|
| `ts/src/protocol.ts` | `75f0641`, refactored `6b0f014` | 787 lines, 59 exports | 15 (TS) |
| `py/multiplicity/crypto/protocol.py` | `75f0641`, refactored `6b0f014` | stdlib mirror | none |
| `rust/src/protocol.rs` | `75f0641`, refactored `6b0f014` | mirror | 7 (in 9 Rust tests) |
| `lean/MultiplicityCrypto/Protocol.lean` | `75f0641`, refactored `3d49da5` | 299 lines | `sorry` warnings |

Additional facts:

- `README.md` "TypeScript Module Map" lists eight modules; **`protocol.ts` is absent** despite being the largest, most-tested artifact and the one every other language mirrors.
- Test comments assert "vectors match" across languages, but **no shared vector file exists** and no harness executes the same vector through TS → Python → Rust → Lean. The TS suite (32 tests in 6 files, honest count per ADR-086 — the earlier "95 tests" figure counted compiled `dist` copies) and Rust suite (9 tests) pass independently.
- `docs/ADR_049b`/`049c` (unaccepted, Proposed docx) propose a Poseidon2 seal-width fork that matches **no** implementation on disk (seven-field preimage, t=8 live seal, bind order); the four implementations sit on a 7-byte header / SHA-256 / HKDF / AES-256-GCM wire.

## Decision

### 1. The crate's truth is a labeled graph, not a node. Name every artifact by role.

| Role | Artifact | Pins | Meaning |
|------|----------|------|---------|
| `specified` | `ts/src/protocol.ts` @ commit | commit SHA + line range | what the spec intends |
| `canonical-vectors` | `vectors/protocol.json` @ content-hash | sha256 | what conformance means |
| `shipped` | `commitment.ts` / `aead.ts` / `keyderivation.ts` SHA-256 path | commit SHA | what ships today |
| `compiled` | `rust/pkg/multiplicity_crypto_rust_bg.wasm` | sha256 `8f3ea751…` | what was built; wire-or-remove per ADR-085 |
| `claimed` | `lean/MultiplicityCrypto/Protocol.lean` | commit SHA, status: incomplete | what is asserted, not proven (ADR-087) |

Every claim in README, SOURCES, and every header comment **SHALL resolve to exactly one row** of this table (e.g. "SHA-256 commitment" → `shipped`; "BN254 WASM" → `compiled`, never `shipped`). A label that resolves to no row is a hypothesis, not a claim.

### 2. The vector manifest is labeled by mechanism — source of *what* is explicit.

`vectors/protocol.json` SHALL group vectors by the artifact-role they test, i.e. each vector carries a `mechanism` field:

- `mechanism: "shipped"` vectors are generated from the **shipped** SHA-256 / HKDF / AES-256-GCM paths (resolve to `shipped` row).
- `mechanism: "specified"` vectors are generated from the **canonical reference** `protocol.ts` (resolve to `specified` row).

No vector may mix mechanisms. This removes the two bad outcomes:
- Cross-mechanism failure is impossible by construction (shipped vectors never assert `specified`-only behavior).
- The canonical reference is never decorative: `specified` vectors bind it as the reading of the protocol, and `shipped` vectors bind the implementations to the shipped path.

### 3. Differential conformance gate (mechanism-scoped).

- `npm run diff-vectors` SHALL run `shipped` vectors through the TS, Python, and Rust shipped paths (and Lean once it can emit digests, ADR-087) and fail on any mismatch.
- `specified` vectors SHALL run through `protocol.ts` as a self-conformance check (a regressing canonical reference fails its own vectors).
- Until the gate exists, no comment may claim cross-language "vectors match".

### 4. README / SOURCES registration.

- README Module Map gains `protocol.ts` → `specified` and a "Protocol Family" table referencing the five rows above.
- SOURCES.md gains rows for `lean/`, `protocol.py`, `protocol.rs`, `protocol.ts`, `vectors/protocol.json`, and the same role column (ADR-090 keeps the register authoritative).

### 5. ADR_049b/049c remain unbound.

No seal-width or bind-order change may reach code from an unaccepted paper. The four mirrors stay on the current wire until 049b+c are Accepted by two identities (their own status text) or an ADR supersedes them.

## Consequences

- Cross-language divergence becomes measurable through one mechanism-labeled manifest, not rhetorical.
- The precision question answers itself: truth is the graph; the mirror keeps the labels honest.
- README stops hiding the crate's actual main deliverable.

## Addendum (Accepted, 2026-09-24)

Implementation notes recorded at acceptance; they refine, do not change, the decision.

- `vectors/protocol.json` ships 14 vectors (6 `specified` + 8 `shipped`) across 10 operations: `frame_encode`, `hmac_sha256`, `transcript`, `session_id`, `sequence_trace`, `pack_basis`, `sha256`, `hkdf_extract`, `hkdf_expand`, `directional_keys`, `nonce_prefixes`, `build_nonce`, `aead_encrypt`.
- Mechanism semantics as implemented: **`specified`** vectors bind the canonical wire *structure* (frame codec, per-role transcript chain, session id, sequence trace, basis packing) to `protocol.ts`; **`shipped`** vectors bind the *crypto primitives* the shipped pipeline composes (SHA-256, HMAC-SHA256, HKDF-SHA256, directional nonce prefixes, nonce build, AES-256-GCM) to every shipped implementation. The `aead_encrypt` vector runs the protocol-level `DirectionalAead`/`DirectionalCipher` (TS/Python/Rust byte-identical), which is the shipped construction used by protocol receivers.
- Role resolution for the new rows: `protocol.py` and `protocol.rs` resolve to the **`shipped`** row (the Python and Rust shipped protocol mirrors); `protocol.ts` resolves to **`specified`** only. Every `specified` vector runs through `protocol.ts` (self-conformance) and every `shipped` vector through all three shipped paths.
- Gate layout: TS gate = `ts/src/__tests__/vectors-conformance.test.ts` (vitest; also performs `--update` regeneration from `protocol.ts`); Python gate = `py/scripts/vector_executor.py` (imports `multiplicity.crypto.protocol`); Rust gate = `rust/src/bin/vector_executor.rs` (stdin feed, no JSON dependency added to the crate). Orchestrator: `ts/scripts/diff-vectors.mjs`, wired as `npm run diff-vectors` (from `ts/`). Executors are intentionally protocol-only; RNG and the WASM chain are outside scope.
- Executors must bind to the manifest's verbatim inputs and outputs; the Rust executor parses and re-emits the same `expected` keys as manifest strings (numbers/booleans normalized), so a drift in output shape is a gate failure, not a silent pass.

## Testing

- `README.md` lists `protocol.ts` under role `specified`; `SOURCES.md` shows the five-row role map.
- `git status` shows `vectors/protocol.json`; every entry has a non-empty `mechanism ∈ {shipped, specified}`.
- `npm run diff-vectors` exits 0 (shipped vectors on ≥3 languages) and 0 (specified vectors on `protocol.ts`).
- `grep -rn "vectors match" ts/src rust/src py` returns 0 comments not backed by the gate.
- `grep -c '"mechanism"' vectors/protocol.json` ≥ 1 × vector count.

## References

- `ts/src/protocol.ts`, `py/multiplicity/crypto/protocol.py`, `rust/src/protocol.rs`, `lean/MultiplicityCrypto/Protocol.lean`
- README.md Module Map; SOURCES.md
- ADR-090 (provenance register), ADR-085 (wasm role), ADR-087 (lean role), ADR-091 (conformance rule)
- docs/ADR_049b, docs/ADR_049c (unaccepted, Proposed)