# ADR-073: Contractivity Gate — Test Coverage or Documentation Removal

- **Status**: Accepted
- **Deciders**: TS owner, QA owner, Formal Methods steward
- **Date**: 2026-09-22
- **Companion**: PHASE_MIRROR_AUDIT.md (D-05), ADR-068 (F-MC-06), Phase Mirror PM-MC-001 §6 F-MC-06
- **Supersedes**: `feedback.ts` documentation claiming L0-5 enforcement; `Multiplicity Crypto.tex` §2.4

## Context

`ts/src/feedback.ts:36-57` implements `computeFeedback` with two gates:
1. **L0-5 gate** (Art. VIII §8.1): `contractivity_score > 0 && contractivity_score <= 1.0`
2. **Prime-indexed upper bound** (ADR-012): `contractivity_score <= p/(p+1)` where `p = getPrimeAtIndex(prime_index)`

The mechanism is mathematically sound. However:
- **Zero test coverage** exists for `feedback.ts` (PHASE_MIRROR_AUDIT.md §3 "What Works" / "What Is Broken")
- **No per-channel ledger** logs `(λ_p, L_p, λ_p L_p, ACE_p, projector_status)` as required by LawfulRecursionVersion 1.0 Core fragment (§4, §7)
- **No content hash** is produced or stored — the single source of truth is missing
- The ZetaCell bridge (N=100 zeros, α_k = γ_k^(-1/2)) is not in the codebase
- S_π (prime entropy) is not measured

Per PM-MC-001 §5: "feedback.ts checks a related inequality and stops. There is no per-channel ledger. There is no content hash. The ZetaCell bridge is not in the audit's file list. S_π is not measured. Claiming the Core while shipping a SHA-256 commitment stub is D-05 + D-06, not a passing grade."

## Decision

1. **Either add test coverage for `feedback.ts` OR stop citing `c < 1` / L0-5 enforcement in documentation.**

2. **Minimum test requirements for `feedback.ts`:**
   - Test L0-5 gate passes for valid `contractivity_score` in (0, 1.0]
   - Test L0-5 gate blocks for `contractivity_score <= 0` or `> 1.0`
   - Test prime upper bound `p/(p+1)` for prime_index 0 (p=2, bound=2/3), 1 (p=3, bound=3/4), 2 (p=5, bound=5/6)
   - Test transition occurs (stateIndex increments, prime_index increments) when both gates pass
   - Test transition blocked (profile unchanged) when either gate fails

3. **If tests are not added within 30 days**, all documentation referencing "L0-5 contractivity gate", "c < 1 enforcement", "LawfulRecursionVersion 1.0 compliance" MUST be removed or qualified as "inequality implemented, not wired to Core ledger."

4. **The `primeUpperBound` function is correct and tested** — it is a pure function. The gap is the integration test for `computeFeedback` and the missing Core fragment wiring.

## Consequences

- Documentation accurately reflects what is tested vs. what is implemented
- No false claim of Banach contraction enforcement without the ledger
- The mechanism remains available for future Core fragment integration
- QA owner has clear metric: coverage ≥ 70% for core TS modules including `feedback.ts`

## Testing

- `npm test` includes `feedback.test.ts` with ≥5 test cases covering all gate combinations
- `npx c8 npm test` shows coverage ≥ 70% for `feedback.ts`
- Documentation audit: `grep -r "c < 1\|L0-5\|contractivity.*enforce" docs/ README.md` returns only qualified statements

## References

- PHASE_MIRROR_AUDIT.md §2 row 5, §3 "What Is Broken" row 43, §5 row 5
- ADR-068 F-MC-06
- Phase Mirror PM-MC-001 §5, §6 F-MC-06, §7 QA owner lever
- `ts/src/feedback.ts` lines 1-57
- LawfulRecursionVersion 1.0 Core fragment §4, §7