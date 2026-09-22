// IQKDBackend interface for QKD integration (ADR-006)
export interface IQKDBackend {
  getKey(input: QKDSimulatorInput): QKDSimulatorOutput | Promise<QKDSimulatorOutput>;
}

// Mock backend implementation
export class MockQKDBackend implements IQKDBackend {
  getKey(input: QKDSimulatorInput): QKDSimulatorOutput {
    return simulateQKD(input);
  }
}

// Hardware-backed QKD backend implementation (ETSI GS QKD 014 REST API standard)
export class HardwareQKDBackend implements IQKDBackend {
  constructor(private endpoint: string, private saeId: string) {}

  async getKey(input: QKDSimulatorInput): Promise<QKDSimulatorOutput> {
    const targetUrl = `${this.endpoint}/api/v1/keys/${this.saeId}/${input.role === 'A' ? 'enc' : 'dec'}`;
    
    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          number: 1,
          size: 32,
          additional_auth_data: input.context.toString('base64')
        })
      });

      if (!response.ok) throw new Error(`QKD API error: ${response.statusText}`);
      
      const data = await response.json() as { keys: Array<{ key: string, key_ID: string }> };
      if (!data.keys || data.keys.length === 0) throw new Error('QKD API returned no keys');

      // Use the raw quantum key as the base entropy for the pipeline
      const quantumSecret = Buffer.from(data.keys[0].key, 'base64');
      const pipelineOut = simulateQKD({ ...input, sharedSecret: quantumSecret });

      return {
        simulatedKey: pipelineOut.simulatedKey,
        label: `HARDWARE_QKD_ETSI_014:${data.keys[0].key_ID}`
      };
    } catch (error) {
      throw new Error(`Hardware QKD fetch failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
// QKD Simulator module for QKD Hybrid Encryption v1.0.1
// Week 4: simulateQKD is now the sequential composition root:
//   computeTranscript → deriveKey → computeCommitment → encryptAEAD
// IQKDBackend interface and simulatedKey: Buffer return shape are unchanged.
// See governance/ADR-013-qkd-pipeline-wiring.md

import { MultiplicityProfile, encodeProfile } from './multiplicity';
import { deriveKey } from './keyderivation';
import { encryptAEAD } from './aead';
import { computeTranscript } from './transcript';
import { computeCommitment } from './commitment';

export interface QKDSimulatorInput {
  role: 'A' | 'B';
  context: Buffer;
  profile: MultiplicityProfile;
  sharedSecret: Buffer; // The simulated entanglement base
}

export interface QKDSimulatorOutput {
  simulatedKey: Buffer;
  label: string;
}

export function simulateQKD({ role, context, profile, sharedSecret }: QKDSimulatorInput): QKDSimulatorOutput {
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
    throw new Error(
      `Pipeline prime_index regression: finalPrimeIndex ${finalPrimeIndex} < input ${profile.prime_index}`
    );
  }

  return { simulatedKey: key, label: 'SIMULATED_QKD' };
}
