// Feedback module for QKD Hybrid Encryption v1.0.1
// Implements (M_{t+1}, T_{t+1}) feedback dynamics
// Week 2: contractivity bound aligned with ConstitutionModel L0-5 (Art. VIII §8.1)
// Scaling function: upper_bound = p/(p+1) where p = getPrimeAtIndex(prime_index)
// See governance/ADR-012-prime-contractivity-scaling.md
import { getPrimeAtIndex } from './multiplicity';
// L0-5 gate (Art. VIII §8.1) + prime-indexed upper bound (ADR-012).
// Returns p/(p+1) for the prime at the given index — the maximum permitted
// contractivity_score for a transition from this state.
export function primeUpperBound(prime_index) {
    const p = getPrimeAtIndex(prime_index);
    return p / (p + 1);
}
export function computeFeedback({ currentProfile, errorRate, latency, load }, { contractivity_score }) {
    const p = getPrimeAtIndex(currentProfile.prime_index);
    const upperBound = p / (p + 1);
    // L0-5: contractivity_score must be in (0, 1.0] (constitution hard ceiling)
    const l0_5Ok = contractivity_score > 0 && contractivity_score <= 1.0;
    // ADR-012: prime-indexed tightening — must not exceed p/(p+1)
    const primeOk = contractivity_score <= upperBound;
    if (l0_5Ok && primeOk) {
        const nextProfile = { ...currentProfile };
        nextProfile.stateIndex = (nextProfile.stateIndex + 1) % 65536;
        nextProfile.prime_index = (nextProfile.prime_index + 1) >>> 0;
        return { nextProfile, transitioned: true };
    }
    // Gate blocked — return current profile unchanged
    return { nextProfile: { ...currentProfile }, transitioned: false };
}
