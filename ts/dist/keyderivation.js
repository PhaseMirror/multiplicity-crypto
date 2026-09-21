// Key Derivation module for QKD Hybrid Encryption v1.0.1
// Implements HKDF with role labels, context hash, and multiplicity profile slot
// Inputs: transcript hash, role, multiplicity profile
// Outputs: deterministic key material, context hashes
// Contract: deterministic, byte-exact, test vectors from spec
import crypto from 'crypto';
import { encodeProfile, getPrimeAtIndex } from './multiplicity';
function getInfo(role, transcriptHash, profile) {
    const profileBuf = encodeProfile(profile);
    const prime = getPrimeAtIndex(profile.prime_index);
    // Domain separation: role + transcript + encoded profile + resolved prime (4 bytes BE)
    const primeBuf = Buffer.alloc(4);
    primeBuf.writeUInt32BE(prime, 0);
    return Buffer.concat([
        Buffer.from(role, 'utf-8'),
        transcriptHash,
        profileBuf,
        primeBuf
    ]);
}
export function deriveKey({ transcriptHash, role, multiplicityProfile, salt, ikm }) {
    const info = getInfo(role, transcriptHash, multiplicityProfile);
    const keyBuf = crypto.hkdfSync('sha256', ikm, salt || Buffer.alloc(0), info, 32);
    const key = Buffer.from(keyBuf);
    const resolvedPrime = getPrimeAtIndex(multiplicityProfile.prime_index);
    return { key, contextHash: transcriptHash, resolvedPrime };
}
