import { MultiplicityProfile } from './multiplicity';
export interface KeyDerivationInput {
    transcriptHash: Buffer;
    role: 'A2B' | 'B2A';
    multiplicityProfile: MultiplicityProfile;
    salt?: Buffer;
    ikm: Buffer;
}
export interface KeyDerivationOutput {
    key: Buffer;
    contextHash: Buffer;
    resolvedPrime: number;
}
export declare function deriveKey({ transcriptHash, role, multiplicityProfile, salt, ikm }: KeyDerivationInput): KeyDerivationOutput;
