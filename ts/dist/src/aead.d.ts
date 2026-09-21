import { MultiplicityProfile } from './multiplicity';
export interface AEADInput {
    key: Buffer;
    nonce: Buffer;
    plaintext?: Buffer;
    ciphertext?: Buffer;
    authTag?: Buffer;
    aad: Buffer;
    profile?: MultiplicityProfile;
}
export declare function encryptAEAD({ key, nonce, plaintext, aad, profile }: AEADInput): {
    ciphertext: Buffer;
    authTag: Buffer;
};
export declare function decryptAEAD({ key, nonce, ciphertext, authTag, aad, profile }: AEADInput): {
    plaintext: Buffer;
};
