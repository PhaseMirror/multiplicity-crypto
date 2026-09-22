# ADR-083: Post-Quantum Honesty — BN254 Not PQ

- **Status**: Accepted
- **Deciders**: Cryptography steward, Crate maintainer, Foundry steward
- **Date**: 2026-09-22
- **Companion**: Phase Mirror PM-MC-001 §6 F-MC-10, D-10, PM-PWEH-001
- **Supersedes**: Any claim that BN254 Pedersen provides post-quantum security

## Context

The README and documentation previously claimed "Pedersen commitment (WASM-backed BN254)" as a capability.

Per PM-MC-001 §6 F-MC-10: "BN254 + Ed25519 is not post-quantum. Year-one UCC receipts stay hash + version + build + time (UCC-YK-001). This crate is not the receipt spine."

Per PM-PWEH-001 (Phase Mirror on Post-Quantum Wearable Encryption Hardware): BN254 (alt_bn128) is a pairing-friendly curve vulnerable to quantum attacks via Shor's algorithm on the discrete logarithm problem in the pairing groups. It provides **zero** post-quantum security.

Year-one UCC (Unified Crypto-Commerce) receipts per UCC-YK-001 use: hash + version + build + time — not elliptic curve commitments.

## Decision

1. **BN254 (alt_bn128) is NOT post-quantum secure.** Any documentation, README, or claim implying PQ security via BN254 is false.

2. **The SHA-256 fallback commitment (`PM-COMMIT-p${prime}`) is also NOT post-quantum secure** — it's a hash-based commitment with 128-bit quantum resistance (Grover's algorithm), which is "adequate" per QMHES security layer table but not "strong."

3. **This crate is not the UCC receipt spine.** Year-one receipts use hash + version + build + time (UCC-YK-001).

4. **If post-quantum commitments are required**, they must use:
   - Hash-based commitments (SHA-256, SHA-3, BLAKE2b) with sufficient output length
   - Lattice-based commitments (Module-LWE, Module-SIS)
   - Isogeny-based commitments (not yet standardized)
   - NOT BN254 or any pairing-friendly curve

5. **Documentation MUST NOT claim** "quantum-resistant", "post-quantum", or "PQ" for BN254 Pedersen or SHA-256 commitments in this crate.

## Consequences

- Honest cryptographic labeling
- No consumer confusion about PQ security
- Clear upgrade path: if PQ commitments needed, new ADR for lattice/hash-based replacement
- Year-one UCC receipts unaffected (they don't use this crate's commitments)

## Testing

- `grep -r "post.quantum\|quantum.resistant\|PQ.*BN254\|BN254.*PQ" docs/ README.md` returns 0 matches
- `grep -r "quantum" docs/ README.md` returns only "Quantum-State-Based Security" (QSBS) as a framework name, not a security claim for BN254
- QMHES security layer table (Hybrid Encryption System.tex Table 1) correctly lists BN254 as "Not PQ" if referenced

## References

- Phase Mirror PM-MC-001 §6 F-MC-10, D-10
- PM-PWEH-001 (Post-Quantum Wearable Encryption Hardware)
- UCC-YK-001 (Year-one UCC receipts)
- Hybrid Encryption System.tex §494-493 (Security Layer Summary table)
- ADR-070 (Pedersen WASM Status)
- LawfulRecursionVersion 1.0 (computational L0, not PQ claim)