# ADR-074: LawfulRecursionHash — Compute or Refuse Field

- **Status**: Accepted
- **Deciders**: Kernel owner, Formal Methods steward, Crate maintainer
- **Date**: 2026-09-22
- **Companion**: PHASE_MIRROR_AUDIT.md (D-06), ADR-068 (F-MC-05), Phase Mirror PM-MC-001 §6 F-MC-05
- **Supersedes**: Any documentation field showing "[computed on commit]" for LawfulRecursionHash

## Context

LawfulRecursionVersion 1.0 (Ξ-Constitutional-Core.md, April 2026) requires:
- Every Cell, kernel, ledger entry, and simulation manifest stores `LawfulRecursionHash` and `LawfulRecursionVersion`
- `LawfulRecursionHash` is a content hash (Poseidon or SHA-256) of the per-channel log: `(λ_p, L_p, λ_p L_p, ACE_p, projector_status)`
- The contraction constant `c = sup_p λ_p (L_A,p + L_B,p + L_E,p) < 1` must be verified and logged

This crate (multiplicity-crypto) does not:
- Produce a per-channel ledger
- Compute a content hash of any ledger
- Measure λ_p, L_p, or S_π
- Implement the ZetaCell bridge

Yet documentation or manifests may reference `LawfulRecursionHash: "[computed on commit]"` as a placeholder.

Per PM-MC-001 §5: "LawfulRecursionHash field in the Core is still '[computed on commit]'. Placeholder is not a hash."

Per F-MC-05: "LawfulRecursionHash may not ship as '[computed on commit]'. Empty brackets are not a hash. Refuse the field or write the digest."

## Decision

1. **The `LawfulRecursionHash` field MUST NOT appear as "[computed on commit]" or any placeholder value** in any manifest, README, or documentation produced by this crate.

2. **Two valid options only:**
   a. **Compute the hash**: Implement the per-channel ledger, log `(λ_p, L_p, λ_p L_p, ACE_p, projector_status)`, hash it (SHA-256 or Poseidon), and emit the actual digest.
   b. **Refuse the field**: Omit `LawfulRecursionHash` entirely from this crate's outputs. Document explicitly: "LawfulRecursionHash not computed by this crate; requires Core fragment integration."

3. **This crate does not get a private constitution.** If it claims lawful prime recursion, it owes the Core fragment's engineering notes (λ_p = κ · p^(-σ) / ||A_p|| with 0 < κ < 1, tuned so max(λ_p L_p) < 1 - ε), not a new Article IX.

4. The `LawfulRecursionVersion` field MAY be present as `"1.0"` to declare the version of the contraction law this crate targets, but only if accompanied by either (a) or (b) above.

## Consequences

- No placeholder hashes in any artifact
- Honest declaration of what this crate does/doesn't provide
- Clear integration contract for Core fragment (ledger → hash)
- The crate is explicitly research-grade; Core wiring is a separate milestone

## Testing

- `grep -r "computed on commit" .` returns zero matches
- `grep -r "LawfulRecursionHash" docs/ README.md` returns either actual digest or explicit "not computed" statement
- If hash is computed: verify it matches SHA-256/Poseidon of the ledger content
- If field refused: verify absence from all manifests

## References

- PHASE_MIRROR_AUDIT.md §1 row 6 (implied), §5 row 6
- ADR-068 F-MC-05
- Phase Mirror PM-MC-001 §5, §6 F-MC-05
- Ξ-Constitutional-Core.md (LawfulRecursionVersion 1.0)
- LawfulRecursionVersion 1.0 Core fragment §4, §7