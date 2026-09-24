// multiplicity-crypto-ts entry point — simulated classical hybrid encryption
// with prime-indexed tags (ADR-084: `ts/src/protocol.ts` is the canonical
// in-repo (specified) mechanism; the shipped mechanism is the SHA-256 path).

export {
  MultiplicityProfile,
  MAX_PRIME_INDEX,
  getPrimeAtIndex,
  defaultProfile,
  encodeProfile,
  decodeProfile
} from './multiplicity';

export {
  computeTranscript,
  TranscriptInput,
  TranscriptOutput
} from './transcript';

export {
  deriveKey,
  KeyDerivationInput,
  KeyDerivationOutput
} from './keyderivation';

export {
  computeCommitment,
  CommitmentInput,
  CommitmentOutput
} from './commitment';

export {
  encryptAEAD,
  decryptAEAD,
  AEADInput
} from './aead';

export {
  primeUpperBound,
  computeFeedback,
  FeedbackContractivity,
  FeedbackInput,
  FeedbackOutput
} from './feedback';

export {
  computeFrequency,
  FrequencyInput,
  FrequencyOutput
} from './frequency';

export {
  IQKDBackend,
  MockQKDBackend,
  HardwareQKDBackend,
  QKDSimulatorInput,
  QKDSimulatorOutput,
  simulateQKD
} from './qkd';