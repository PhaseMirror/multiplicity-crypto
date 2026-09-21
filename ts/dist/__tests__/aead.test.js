import { encryptAEAD, decryptAEAD } from '../aead';
import { defaultProfile } from '../multiplicity';
describe('AEAD encrypt/decrypt round-trip', () => {
    it('encryptAEAD produces ciphertext and authTag', () => {
        const key = Buffer.alloc(32, 1);
        const nonce = Buffer.alloc(12, 2);
        const aad = Buffer.from('test-aad');
        const plaintext = Buffer.from('hello');
        const result = encryptAEAD({ key, nonce, plaintext, aad, profile: defaultProfile() });
        expect(result.ciphertext).not.toEqual(plaintext);
        expect(result.authTag).toHaveLength(16);
    });
    it('decryptAEAD recovers plaintext', () => {
        const key = Buffer.alloc(32, 1);
        const nonce = Buffer.alloc(12, 2);
        const aad = Buffer.from('test-aad');
        const plaintext = Buffer.from('secret message');
        const { ciphertext, authTag } = encryptAEAD({ key, nonce, plaintext, aad, profile: defaultProfile() });
        const result = decryptAEAD({ key, nonce, ciphertext, authTag, aad, profile: defaultProfile() });
        expect(result.plaintext.equals(plaintext)).toBe(true);
    });
    it('decryptAEAD fails with wrong key', () => {
        const key = Buffer.alloc(32, 1);
        const wrongKey = Buffer.alloc(32, 99);
        const nonce = Buffer.alloc(12, 2);
        const aad = Buffer.from('test-aad');
        const plaintext = Buffer.from('secret');
        const { ciphertext, authTag } = encryptAEAD({ key, nonce, plaintext, aad, profile: defaultProfile() });
        expect(() => decryptAEAD({ key: wrongKey, nonce, ciphertext, authTag, aad, profile: defaultProfile() })).toThrow();
    });
    it('decryptAEAD fails with missing ciphertext', () => {
        const key = Buffer.alloc(32);
        const nonce = Buffer.alloc(12);
        const aad = Buffer.from('aad');
        expect(() => decryptAEAD({ key, nonce, aad, profile: defaultProfile() })).toThrow();
    });
});
