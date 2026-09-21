// Mock backend implementation
export class MockQKDBackend {
    getKey(input) {
        return simulateQKD(input);
    }
}
// QKD Simulator module for QKD Hybrid Encryption v1.0.1
// Week 4: simulateQKD is now the sequential composition root:
//   computeTranscript → deriveKey → computeCommitment → encryptAEAD
// IQKDBackend interface and simulatedKey: Buffer return shape are unchanged.
// See governance/ADR-013-qkd-pipeline-wiring.md
import { encodeProfile } from './multiplicity';
import { deriveKey } from './keyderivation';
import { encryptAEAD } from './aead';
import { computeTranscript } from './transcript';
import { computeCommitment } from './commitment';
export function simulateQKD({ role, context, profile, sharedSecret }) {
    // Step 1: Transcript — establishes hash chain context
    const { contextHash, finalPrimeIndex } = computeTranscript({
        messages: [context],
        nonces: [sharedSecret.subarray(0, 12)],
        version: profile.version,
        profile,
        initialPrimeIndex: profile.prime_index
    });
    // Step 2: Key derivation — prime-indexed HKDF over transcript context
    const { key } = deriveKey({
        transcriptHash: contextHash,
        role: role === 'A' ? 'A2B' : 'B2A',
        multiplicityProfile: profile,
        ikm: sharedSecret
    });
    // Step 3: Commitment — bind key to profile for auditability
    const { commitment } = computeCommitment({
        message: key,
        randomness: contextHash,
        profile
    });
    // Step 4: AEAD — encrypt the commitment as the output payload
    const nonce = sharedSecret.subarray(0, 12);
    encryptAEAD({
        key,
        nonce,
        plaintext: commitment,
        aad: encodeProfile(profile),
        profile
    });
    // Pipeline monotonicity invariant (ADR-013)
    if (finalPrimeIndex < profile.prime_index) {
        throw new Error(`Pipeline prime_index regression: finalPrimeIndex ${finalPrimeIndex} < input ${profile.prime_index}`);
    }
    return { simulatedKey: key, label: 'SIMULATED_QKD' };
}
