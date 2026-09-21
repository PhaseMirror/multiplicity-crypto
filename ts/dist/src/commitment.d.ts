import { MultiplicityProfile } from './multiplicity';
export interface CommitmentInput {
    message: Buffer;
    randomness: Buffer;
    profile?: MultiplicityProfile;
}
export interface CommitmentOutput {
    commitment: Buffer;
}
export declare function computeCommitment({ message, randomness, profile }: CommitmentInput): CommitmentOutput;
