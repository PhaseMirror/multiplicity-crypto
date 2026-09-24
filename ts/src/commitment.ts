// SHA-256 commitment with prime-indexed domain tags (PM-COMMIT-p${prime}).
// BN254 WASM is not the default execution path (ADR-070; ADR-085).
// Inputs: message, randomness, profile (optional)
// Outputs: deterministic commitment output
// Contract: deterministic, matches SHA-256 vectors, testable

import { createHash } from 'crypto';
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
  const commitment = createHash('sha256').update(data).digest();
  
  return { commitment };
}
