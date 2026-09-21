import { MultiplicityProfile } from './multiplicity';
export interface FeedbackContractivity {
    contractivity_score: number;
}
export interface FeedbackInput {
    currentProfile: MultiplicityProfile;
    errorRate: number;
    latency: number;
    load: number;
}
export interface FeedbackOutput {
    nextProfile: MultiplicityProfile;
    transitioned: boolean;
}
export declare function primeUpperBound(prime_index: number): number;
export declare function computeFeedback({ currentProfile, errorRate, latency, load }: FeedbackInput, { contractivity_score }: FeedbackContractivity): FeedbackOutput;
