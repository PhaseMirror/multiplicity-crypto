// Multiplicity module for QKD Hybrid Encryption v1.0.1
// Implements M_t state management and profile encoding/decoding
// Operational upper bound on prime_index. getPrimeAtIndex(1000) = prime 7,919.
// Values above this are not valid ordinals in the pipeline (see ADR-013).
export const MAX_PRIME_INDEX = 1000;
// Prime sieve — matches Python get_prime_tag(index) exactly.
// index 0 → 2, 1 → 3, 2 → 5, 3 → 7, ...
const PRIMES_CACHE = [2];
function _isPrime(n) {
    if (n < 2)
        return false;
    for (let i = 2; i <= Math.sqrt(n); i++) {
        if (n % i === 0)
            return false;
    }
    return true;
}
export function getPrimeAtIndex(index) {
    if (index < 0)
        throw new RangeError('prime index must be non-negative');
    while (PRIMES_CACHE.length <= index) {
        let candidate = PRIMES_CACHE[PRIMES_CACHE.length - 1] + 1;
        while (!_isPrime(candidate))
            candidate++;
        PRIMES_CACHE.push(candidate);
    }
    return PRIMES_CACHE[index];
}
export function encodeProfile(profile) {
    const buf = Buffer.alloc(8);
    buf.writeUInt8(profile.type, 0);
    buf.writeUInt8(profile.version, 1);
    buf.writeUInt16BE(profile.stateIndex, 2);
    buf.writeUInt32BE(profile.prime_index, 4);
    return buf;
}
export function decodeProfile(buf) {
    if (buf.length !== 8) {
        throw new Error('Multiplicity profile must be exactly 8 bytes');
    }
    return {
        type: buf.readUInt8(0),
        version: buf.readUInt8(1),
        stateIndex: buf.readUInt16BE(2),
        prime_index: buf.readUInt32BE(4)
    };
}
// Default profile for callers that are not multiplicity-context-aware.
// prime_index 0 resolves to prime 2 (lowest contractivity requirement).
export function defaultProfile() {
    return { type: 0, version: 1, stateIndex: 0, prime_index: 0 };
}
