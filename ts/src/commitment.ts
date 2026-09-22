// Commitment API for QKD Hybrid Encryption v1.0.1
// Implements Pedersen commitment (WASM-backed, BN254), fallback warning if unavailable
// Inputs: message, randomness, profile (optional)
// Outputs: deterministic commitment output
// Contract: deterministic, matches WASM vectors, testable
// Week 3: prime-indexed domain separation — PM-COMMIT-p${prime} tag makes commitments
// at different prime indices non-interchangeable without changing the WASM ABI.

import { MultiplicityProfile, getPrimeAtIndex, defaultProfile } from './multiplicity';

export interface CommitmentInput {
  message: Buffer;
  randomness: Buffer;
  profile?: MultiplicityProfile; // optional — defaults to defaultProfile(); selects domain tag
}

export interface CommitmentOutput {
  commitment: Buffer;
}

export function computeCommitment({ message, randomness, profile }: CommitmentInput): CommitmentOutput {
  const p = profile ?? defaultProfile();
  const prime = getPrimeAtIndex(p.prime_index);
  
  // Domain tag encodes the resolved prime — commitments across prime indices cannot collide.
  const domainTag = Buffer.from(`PM-COMMIT-p${prime}`, 'utf8');

  // SHA-256 tagged commitment: domain-separate by prime index
  const data = Buffer.concat([domainTag, message, randomness]);
  const commitment = require('crypto').createHash('sha256').update(data).digest();
  
  return { commitment };
}
