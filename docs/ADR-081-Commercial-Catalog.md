# ADR-081: Commercial Catalog — Diplomas Not Certifications

- **Status**: Accepted
- **Deciders**: Operator LLC counsel, Foundry steward, Crate maintainer
- **Date**: 2026-09-22
- **Companion**: Phase Mirror PM-MC-001 §6 F-MC-08, D-08
- **Supersedes**: Any implication that commercial catalog diplomas confer Certified status

## Context

Three Phase Mirror papers describe a commercial architecture:
- Legal governance paper
- Callable protocol paper
- Agentic DSR + SaaS catalog paper (four-pillar revenue: open-core seats, compliance packs, certification fees, retainers)

The SaaS catalog paper lists:
- CPMP / CPMA diplomas
- Exam fees ($395–$995)
- Retainers ($10k–$50k)
- Calibration-data network effects

Per PM-MC-001 §6 F-MC-08: "Certification product names (PMA / CPMP / CPMA) and exam fees do not write a Certified bit, a creation event, or a member standing. Exam fee lives on /shop if it lives at all (FWP-TRAIN-001). Equity never mints a diploma."

Per PM-MC-001 §6 F-MC-11: "Calibration / false-positive telemetry from a hosted oracle is not collateral, not a membership surplus, and not a fifth door. If collected, name the legal person and the door (gift, sponsor-class, recoverable grant, operator equity)."

Per PM-MC-001 §6 F-MC-12: "Anyone at or above 10% of the Operator LLC, or holding its board seat, cannot sit as Examiner of this crate's 'Certified Implementation.' Dual seat still needs the firewall paper. This audit is not that paper."

## Decision

1. **Commercial catalog products (CPMP, CPMA, PMA, exam fees, retainers) do not:**
   - Write a `Certified` bit on any artifact
   - Create a creation event (`/creations Certified`)
   - Confer member standing in UNA/Citizen Gardens
   - Override Phase Mirror diagnostic results

2. **Calibration data / telemetry from a hosted oracle is:**
   - Not collateral
   - Not a membership surplus
   - Not a fifth revenue door
   - If collected, the legal person and door (gift, sponsor-class, recoverable grant, operator equity) MUST be named

3. **Equity never mints a diploma.** No ownership stake converts to certification authority.

4. **Dual-seat firewall required:** Anyone ≥10% Operator LLC or board seat cannot be Examiner for this crate's Certified Implementation. The firewall paper (separate) is required.

5. **This crate is not wired to:** POST `/close`, `/creations Certified`, or hosted PMCP SKU until D-01 through D-06 are closed (ADR-068 Consequences).

## Consequences

- Clear boundary between commercial offerings and technical certification
- No diploma/certification confusion for consumers
- Operator LLC counsel must approve any commercial use of this crate's name
- Phase Mirror diagnostic coat stays diagnostic — not a sales enabler

## Testing

- `grep -r "CPMP\|CPMA\|PMA.*diploma\|exam fee.*certif" docs/ README.md` returns 0 matches
- No `Certified` field in any manifest produced by this crate
- If commercial hosting occurs: door and legal person named in hosting agreement
- Dual-seat check: Operator LLC cap table reviewed before Examiner appointment

## References

- Phase Mirror PM-MC-001 §6 F-MC-08, F-MC-11, F-MC-12, §7 Operator LLC counsel lever, §11
- ADR-068 Consequences row 49
- FWP-TRAIN-001, FWP-ATTEST-001
- Commercial catalog paper (attached to PM-MC-001)