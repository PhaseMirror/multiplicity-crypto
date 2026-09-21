import { MultiplicityProfile } from './multiplicity';
export interface TranscriptInput {
    messages: Buffer[];
    nonces: Buffer[];
    version: number;
    profile: MultiplicityProfile;
    initialPrimeIndex?: number;
}
export interface TranscriptOutput {
    hashChain: Buffer[];
    contextHash: Buffer;
    finalPrimeIndex: number;
}
export declare function computeTranscript({ messages, nonces, version, profile, initialPrimeIndex }: TranscriptInput): TranscriptOutput;
