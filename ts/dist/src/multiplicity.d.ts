export declare const MAX_PRIME_INDEX = 1000;
export declare function getPrimeAtIndex(index: number): number;
export interface MultiplicityProfile {
    type: number;
    version: number;
    stateIndex: number;
    prime_index: number;
}
export declare function encodeProfile(profile: MultiplicityProfile): Buffer;
export declare function decodeProfile(buf: Buffer): MultiplicityProfile;
export declare function defaultProfile(): MultiplicityProfile;
