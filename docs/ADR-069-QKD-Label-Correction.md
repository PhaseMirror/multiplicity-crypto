# ADR-069: QKD Label Correction — Simulated Classical Hybrid Encryption

- **Status**: Accepted
- **Deciders**: Crate maintainer, TS owner, Docs owner
- **Date**: 2026-09-22
- **Companion**: PHASE_MIRROR_AUDIT.md (D-01), ADR-068 (F-MC-01)
- **Supersedes**: README "QKD Hybrid Encryption v1.0.1" claim

## Context

The README and documentation (Multiplicity Crypto.tex, Hybrid Encryption System.tex) claim "QKD Hybrid Encryption v1.0.1" and describe quantum key distribution integration with BB84/E91 protocols, photon polarization, and information-theoretic security.

The executed code path is `MockQKDBackend.simulateQKD()` in `ts/src/qkd.ts:36-78`, which:
1. Calls `computeTranscript` (SHA-256 hash chain)
2. Calls `deriveKey` (HKDF-SHA256)
3. Calls `computeCommitment` (SHA-256 fallback, not Pedersen)
4. Calls `encryptAEAD` (AES-256-GCM)

No quantum hardware, no entanglement, no BB84/E91 simulation, no QBER monitoring, no photon channel exists anywhere in the codebase.

## Decision

1. **All user-facing titles, headings, and README descriptions MUST use "Simulated Classical Hybrid Encryption with Prime-Indexed Tags v1.0.1"** (or equivalent wording that does not contain "QKD" as a capability claim).

2. **The string "QKD" is refused in user-facing titles** unless a quantum channel (hardware API or named BB84/E91 simulation with explicit "simulated" qualifier in the same heading) exists on the executed path.

3. `MockQKDBackend` and `simulateQKD` are correctly named — they are a test double. The label "QKD" may appear in *internal* class/method names (e.g., `MockQKDBackend`, `IQKDBackend`) but not in package descriptions, README, or documentation titles.

4. The README, package.json descriptions, and all .tex documentation files must be updated to reflect the simulated classical reality.

## Consequences

- README title changes from "QKD Hybrid Encryption v1.0.1" to "Simulated Classical Hybrid Encryption with Prime-Indexed Tags v1.0.1"
- `package.json` description updated
- Documentation .tex files updated or marked as "specification target" not "current implementation"
- No external consumer can be misled about quantum capabilities
- The crate is explicitly research-grade, not production QKD

## Testing

- `grep -r "QKD Hybrid Encryption" docs/ README.md package.json` returns zero matches for capability claims
- `grep -r "Quantum Key Distribution" docs/ README.md` returns zero matches for capability claims
- Internal `MockQKDBackend` / `IQKDBackend` names preserved

## References

- PHASE_MIRROR_AUDIT.md §1 row 1, §2 row 1, §3 "What Is Broken" row 41
- ADR-068 F-MC-01
- Phase Mirror PM-MC-001 §6 F-MC-01
- `ts/src/qkd.ts` lines 1-79