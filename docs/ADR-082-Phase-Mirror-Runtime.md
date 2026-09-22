# ADR-082: Phase Mirror Runtime Policy — Build-Time Diagnostic Only

- **Status**: Accepted
- **Deciders**: Foundry steward, Crate maintainer, PrismPM owner
- **Date**: 2026-09-22
- **Companion**: Phase Mirror PM-MC-001 §6 F-MC-09, D-09, PM-HE-001
- **Supersedes**: Any implication that Phase Mirror runs on merge queue or runtime

## Context

Phase Mirror papers describe a "callable protocol" wanting the Mirror on the merge-queue hot path as a runtime firewall.

Per PM-MC-001 §6 F-MC-09: "Phase Mirror remains a build-time diagnostic. It does not become a merge-queue firewall, a runtime pulse-cut, or a hardware interrupt. Callable protocol papers may stay warn-only. Blocking belongs to PrismPM C/F controls, UCC Δ, PIRTM refuse, or WardMonitor — each under its own name."

Per PM-MC-001 §10: "Does not treat the Ling 3.0 'Protocol is callable. Ship it.' close of the merge-queue essay as Foundry authorization. That essay is about a different oracle surface. Our coat stays diagnostic."

The Phase Mirror is a **diagnostic coat** — it names dissonance, it does not resolve it. It runs at build/CI time, not in the hot path.

## Decision

1. **Phase Mirror (this audit, ADR-068 through ADR-083) is a BUILD-TIME DIAGNOSTIC ONLY.** It:
   - Runs in CI / pre-commit / pre-release
   - Produces warnings / ADRs / fail-closed rules
   - Does NOT block merges at runtime
   - Does NOT cut pulses / interrupt hardware
   - Does NOT sit in the request/response path

2. **Blocking mechanisms are separate and named:**
   - PrismPM C-controls / F-controls (CI gates)
   - UCC Δ (creation delta)
   - PIRTM refuse (prover refusal)
   - WardMonitor SIG_GOV_KILL (governance kill-switch)
   - Each has its own ADR, owner, and implementation

3. **Callable protocol papers may stay "warn-only"** — they produce diagnostics but do not gate.

4. **This crate's CI may include Phase Mirror checks** (e.g., `npm run phase-mirror` that runs the audit) but the output is advisory unless explicitly adopted as a PrismPM C-control.

## Consequences

- No runtime dependency on Phase Mirror
- Clear separation: diagnostic (Mirror) vs. enforcement (PrismPM/UCC/PIRTM/WardMonitor)
- Merge queue is not blocked by Mirror warnings unless promoted to C-control
- The "Phase Mirror" name stays on the diagnostic coat — not on a firewall

## Testing

- CI pipeline includes Phase Mirror step (if adopted) but `allow_failure: true` or warn-only
- No `phase-mirror` binary in production deployment artifacts
- `grep -r "phase.mirror.*block\|phase.mirror.*fail\|phase.mirror.*gate" .github/` returns 0 (unless explicitly promoted)
- PrismPM C-controls documented separately with their own ADRs

## References

- Phase Mirror PM-MC-001 §6 F-MC-09, §9, §10, §11
- ADR-068 Consequences row 49
- PM-HE-001 (Phase Mirror on Hybrid Encryption)
- PrismPM C-controls / F-controls (separate repo)
- PIRTM refuse (separate ADR)
- WardMonitor SIG_GOV_KILL (separate ADR)