# ADR-080: Ξ-Constitution Policy Binding — Literary Only

- **Status**: Accepted
- **Deciders**: Foundry steward, Legal counsel, Crate maintainer
- **Date**: 2026-09-22
- **Companion**: Phase Mirror PM-MC-001 §6 F-MC-07, D-07
- **Supersedes**: Any implication that Ξ-Constitution binds this crate's governance

## Context

The Ξ-Constitution.md (v1.0) is a **literary frame** containing:
- PEET tribunal (literary court)
- Langlands registrar (literary registrar)
- Ten critiques (literary)
- Multiplicity Foundation pull-request amendments (repository quorum, 2/3, with 1/3 veto and 3/5 council kill-switch)

Per PM-MC-001 §1: "Ξ-Constitution.md v1.0 — a literary frame... This is not W.S. 17-22 / 17-32. It does not bind the UNA register."

Per PM-MC-001 §1: "Named collision, not wished away: Ξ-Constitution Article IX lets 'active repository contributors from the preceding 90 days' amend the literary constitution at 2/3 quorum, with a 1/3 veto and a 3/5 council kill-switch. Citizen Gardens members ratify material acts after 14-day notice (BR-CA-001 / BR-CA-002). Contributors ≠ members. A GitHub kill-switch ≠ WardMonitor SIG_GOV_KILL ≠ a UNA pause. Three names. Three owners. Keep them."

This crate (multiplicity-crypto) does not get a private constitution. It owes the Core fragment's engineering notes (LawfulRecursionVersion 1.0), not a new Article IX.

## Decision

1. **Ξ-Constitution Articles III–IX (PEET, Langlands, Foundation council, repo-quorum amendments) are LITERARY ONLY.** They:
   - Do not bind UNA members
   - Do not replace 14-day notice (BR-CA-001/002)
   - Do not sit as Examiner
   - Do not govern this crate's merge queue, release process, or certification

2. **This crate's governance follows:**
   - Foundry workshop rules (ADR process, Phase Mirror diagnostics)
   - Operator LLC commercial doors (if hosted)
   - UNA civic invariants (if Citizen Gardens member acts)
   - PrismPM C/F controls, UCC Δ, PIRTM refuse, WardMonitor SIG_GOV_KILL — each under its own name

3. **No documentation, README, or ADR in this crate may cite Ξ-Constitution as a binding authority** for technical decisions, merge policies, or certification.

4. The Ξ-Constitution may be cited as **prior art** or **literary context** (defensive publication), but never as operational law for this crate.

## Consequences

- Clear separation between literary constitution and operational governance
- No confusion between GitHub PR quorum and member ratification
- This crate remains subject to Foundry/Operator/UNA actual governance, not literary analog
- Contributors to this crate are not "members" of any constitutional body by virtue of commits

## Testing

- `grep -r "Xi.Constitution\|Ξ.Constitution" docs/ README.md` returns only literary/prior-art references, not binding claims
- No ADR in this crate cites Ξ-Constitution as a decider or authority
- Governance references point to: Foundry, Operator LLC, UNA, PrismPM, WardMonitor — by their proper names

## References

- Phase Mirror PM-MC-001 §1, §3, §6 F-MC-07, §10
- ADR-068 §25 (Authority note)
- Ξ-Constitution.md (literary frame)
- BR-CA-001, BR-CA-002 (Citizen Gardens ratification)
- UNA civic invariants (9 invariants)