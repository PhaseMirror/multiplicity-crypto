# ADR-091: Conformance Rule — Contradiction Requires Amendment or Revert Before Merge

- **Status**: Accepted
- **Deciders**: Foundry steward, Crate maintainer, CI owner, PrismPM owner (promotion)
- **Date**: 2026-09-24
- **Companion**: Phase Mirror Round 2 (D-15, process half of A5); ADR-090 (provenance register); ADR-082 (Phase Mirror stays diagnostic; enforcement is a separate, named control)
- **Supersedes**: None (this is the missing process rule; nothing before it enforced itself)
- **Blocks**: None

## Context

ADRs describe decisions; they do not enforce them. The round-2 audit found the sharpest instance of code outrunning its ADRs:

- `docs/ADR-069` asserts in §Context "No quantum hardware, no entanglement … exists anywhere in the codebase."
- The **same commit** — `3d49da5` — adds `HardwareQKDBackend`, an ETSI GS QKD 014 REST client (`ts/src/qkd.ts:13-48`).

The ADR's factual premise was true at the shell of the commit and false inside it. No merge gate, review checklist, or follow-up ADR stopped it, because nothing **reads accepted ADRs and compares them to the tree at merge time**. ADR-088 patches the artifact (honest labels, park-or-wire). This ADR patches the process: **code that contradicts an accepted ADR requires an amendment or a revert in the same PR.**

Design boundary (ADR-082): Phase Mirror is a build-time diagnostic, warn-only. This control is a **distinct, named C-control** with an owner and blocking semantics — not a Phase Mirror feature and not a runtime firewall.

**Hidden assumption named**: "an accepted ADR protects its decisions" was assumed because the decision was written. Decisions protect nothing; probes do.

## Decision

### 1. The rule.

A PR that merges code or committed artifact contradicting an accepted ADR is **REJ**. The PR must instead contain, in the same change set, exactly one of:
   a. **Revert** of the contradicting change; or
   b. **Amendment** — an ADR that supersedes or amends the contradicted decision, authored in the same PR, reviewed by the original deciders or their named successors. Amendment documents why the old decision fails; "the code already did it" is not a reason.

### 2. The mechanism — probes over PROVENANCE.md.

On acceptance of ADR-090, `PROVENANCE.md` becomes the claim register. Each accepted ADR registers one or more **probes** under a `probes/` convention — the smallest command whose failure proves the tree violates that ADR. Starter probe set for the already-Accepted decisions (each must be authored/verified at 3d49da5 for round 3, then enforced):

| ADR | Probe (fails when ADR is violated) |
|-----|-------------------------------------|
| 069 | `grep -rn "QKD Hybrid Encryption" README.md ts/package.json py/multiplicity/crypto/__init__.py` → exit 1 (0 hits) |
| 070 | `sed -n '1,6p' ts/src/commitment.ts` contains no `Pedersen` / `WASM-backed` |
| 072 | `grep -q '"vitest"' ts/package.json && grep -q 'globals: true' ts/vitest.config.ts` |
| 074 | `grep -rn "computed on commit" .` (non-node_modules) → exit 1 |
| 076 | `grep -rn "crypto_bridge.js\|DIST_ENTRY_PATH\|BRIDGE_SCRIPT_PATH" py/multiplicity` → exit 1 |
| 078 | `grep '"types"' ts/tsconfig.json` → no `jest` in array |
| 083 | `grep -rn "post.?quantum\|quantum.?resistant" README.md docs/` → exit 1 (absence, per ADR-083's own scope) |
| 085 | one executable branch check chosen at acceptance: wasm either loaded-with-test or outside `git ls-files` |

Probes for 084, 086, 087, 088, 089, 090 are registered at their acceptance.

### 3. Enforcement point.

Merge CI runs every probe; **a failing probe blocks merge** and the failure surfaces the ADR citation and the `PROVENANCE.md` pin. Phase Mirror reports stay advisory (ADR-082); these probes are the promotion of specific ADR claims to blocking C-controls, under this ADR's name and owner.

### 4. The round-2 pattern is closed explicitly.

The class "a hardware/backend capability lands that changes a factual premise of an ADR's context" SHALL, before merge, update that ADR's context or supersede it. ADR-069's premise is updated by ADR-088 as its amendment (per rule 1b); from acceptance of this ADR, only one commit may not contain both sides of a factual contradiction.

### 5. ADR-hygiene corollary.

Writing the ADR document **and** the code it governs in the same commit is allowed **only** if the probe for that ADR passes on that commit. ADR-069 + HardwareQKDBackend in `3d49da5` would have failed its own probe; a future equivalent must not merge.

## Consequences

- ADRs gain an execution boundary; "accepted" now means "guarded."
- The D-15 class of defect is caught at the diff, not by the next audit.
- Probe regressions (an accepted ADR whose probe starts failing) become first-class failures, not cleanup items.
- Phase Mirror's diagnostic coat stays diagnostic; C-controls stay named and owned.

## Testing

- `git ls-files` includes `probes/` (see §2 table and PROVENANCE.md §F for the registered probes); `probes/run-all.sh` exits 0 at the acceptance commit.
- Row probes pass at the **acceptance commit (HEAD)**. At `3d49da5` the ADR-070 row correctly FAILS (`ts/src/commitment.ts:1-2` header carried "Pedersen (WASM-backed, BN254)" — the D-12 defect this gate exists to catch pre-merge), while rows 069/072/076/078 pass there; this asymmetry is the point of the probe.
- `probes/run-all.sh` exercises every `probes/adr-*.sh`; a failure prints the ADR citation + gate-failed line and exits non-zero (blocking semantics of a C-control).
- ADR-083's literal row command from the proposal (`grep -rn "post.?quantum\|quantum.?resistant" README.md docs/` → exit 1) is **not** the shipped probe: it fails against `docs/` by design, because ADR-083 itself and the `.tex` papers legitimately discuss post-quantum contexts. The shipped probe (`probes/adr-083.sh`) is scoped to capability claims — no PQ term co-occurring with `BN254`/`commitment`/`Pedersen` in README.md, SOURCES.md, or source headers (see addendum).
- Simulated contradiction: temporarily violating ADR-070's probe → `probes/run-all.sh` fails citing `adr-070` (verified at acceptance).
- `grep -rn "ADR-088" docs/ADR-069-QKD-Label-Correction.md` returns the amendment reference confirming the premise-update (rule 4).
- No `.github/`/CI step named `phase-mirror` exists or is blocking (ADR-082 boundary; no `.github/` is present at acceptance — the runner `probes/run-all.sh` is the gate artifact, ready for CI wiring).

## References

- `git log -S HardwareQKDBackend --oneline` → 3d49da5; `git log --diff-filter=A -- docs/ADR-069*` → 3d49da5
- ADR-090 (register the probes read), ADR-088 (the D-15 amendment), ADR-082 (diagnostic vs enforcement boundary), ADR-068 (F-MC-* rules), ADR-085 (terminus probes)

## Addendum (2026-09-24) — implemented

- `probes/` ships one script per accepted ADR (069, 070, 072, 074, 076, 078, 083–091), each sourcing its pin from PROVENANCE.md, plus `probes/run-all.sh` as the gate runner (blocking C-control; `bash probes/run-all.sh` must exit 0 to merge, per decision 3). No `.github/` exists at acceptance; the runner is the wired artifact.
- ADR-083 probe scoping corrected (see Testing): the proposal's literal command fails against `docs/` at HEAD because ADR-083 itself and the `.tex` papers discuss post-quantum honestly. The shipped `probes/adr-083.sh` enforces ADR-083's actual decision 5 — no PQ/quantum-resistant capability claim for `BN254` or a commitment mechanism across README.md, SOURCES.md, and source headers.
- Verified at acceptance: `probes/run-all.sh` → 14/15 (only `adr-091` self-probe transitional, untracked pre-commit), all row probes PASS at HEAD. At `3d49da5`, `adr-070.sh` fails by design (D-12 header) while 069/072/076/078 pass — demonstrating the missing gate (ADR-091 Testing). `git grep` is used throughout so probes read the committed tree only and ignore untracked build dirt.
- `probes/adr-087.sh` runs the checker via `bash` (the checker uses `set -o pipefail`, which `sh`/dash rejects).
- PROVENANCE.md §F registers the probe list; README Contents/Testing and SOURCES.md register `probes/`.