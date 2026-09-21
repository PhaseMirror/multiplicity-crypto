import crypto from 'crypto';
import { ALICE_LABEL, AUTHENTICATION_TAG_LENGTH, BOOTSTRAP_MESSAGE, BOB_LABEL, CLASSICAL_MESSAGE, DEFAULT_SALT, MAX_PAYLOAD_LENGTH, ProtocolAbortError, ProtocolReceiver, SenderSequenceRegistry, StrictSequenceState, AuthenticationError, AeadReplayError, DirectionalAead, buildNonce, computeAuthenticationTag, computeHmac, computeTranscript, constantTimeEqual, decodeFrame, deriveDirectionalKeys, deriveDirectionalKeysFrom, deriveDirectionalKeysWithSalt, deriveNoncePrefix, deriveNoncePrefixes, encodeBootstrap, encodeFrame, frameHmacInput, hkdfExpand, hkdfExtract, hkdfSha256, initializeTranscript, packBasis, signFrame, traceSequence, verifyFrameAuthentication, verifyHmac } from '../protocol';
const zeroKey = Buffer.alloc(32, 0);
const zeroSalt = Buffer.alloc(32, 0);
const vectorContextHash = Buffer.from('e4b71278b8c643fc0c3ec88ea0efa1b58ae2561aed98959e4f26ea9670298c88', 'hex');
describe('protocol constants and labels', () => {
    it('exposes the normative message numbers and byte labels', () => {
        expect(BOOTSTRAP_MESSAGE).toBe(1);
        expect(CLASSICAL_MESSAGE).toBe(4);
        expect(ALICE_LABEL.equals(Buffer.from('ALICE\0\0\0', 'binary'))).toBe(true);
        expect(BOB_LABEL.equals(Buffer.from('BOB\0\0\0\0\0', 'binary'))).toBe(true);
        expect(DEFAULT_SALT.equals(Buffer.alloc(32, 0))).toBe(true);
    });
});
describe('frame codec', () => {
    it('round-trips bootstrap and authenticated classical frames', () => {
        const bootstrapPayload = Buffer.from([0xaa, 0xbb]);
        const bootstrapWire = encodeBootstrap(0x01020304, bootstrapPayload);
        expect(bootstrapWire.equals(Buffer.from('01010203040002aabb', 'hex'))).toBe(true);
        expect(decodeFrame(bootstrapWire)).toEqual({
            type: BOOTSTRAP_MESSAGE,
            sequence: 0x01020304,
            payload: bootstrapPayload,
            authenticationTag: undefined
        });
        const payload = Buffer.from([1, 2, 3, 4]);
        const frame = signFrame(zeroKey, {
            type: CLASSICAL_MESSAGE,
            sequence: 1,
            payload
        });
        const classicalWire = encodeFrame(frame);
        expect(decodeFrame(classicalWire)).toEqual(frame);
        expect(classicalWire.subarray(0, 7).equals(Buffer.from('04000000010004', 'hex'))).toBe(true);
        expect(classicalWire).toHaveLength(7 + payload.length + AUTHENTICATION_TAG_LENGTH);
    });
    it('supports the uint16 payload boundary', () => {
        const payload = Buffer.alloc(MAX_PAYLOAD_LENGTH, 0x5a);
        const wire = encodeBootstrap(0, payload);
        expect(wire.readUInt16BE(5)).toBe(MAX_PAYLOAD_LENGTH);
        expect(decodeFrame(wire).payload.equals(payload)).toBe(true);
        expect(() => encodeBootstrap(0, Buffer.alloc(MAX_PAYLOAD_LENGTH + 1))).toThrow(/payload/);
    });
    it('rejects malformed headers, lengths, types, and tags', () => {
        expect(() => decodeFrame(Buffer.alloc(6))).toThrow(/shorter/);
        expect(() => decodeFrame(Buffer.from([2, 0, 0, 0, 0, 0, 0]))).toThrow(/unsupported/);
        const bootstrap = encodeBootstrap(0, Buffer.from('payload'));
        const declaredLength = Buffer.from(bootstrap);
        declaredLength[5] += 1;
        expect(() => decodeFrame(declaredLength)).toThrow(/length mismatch/);
        expect(() => decodeFrame(Buffer.concat([bootstrap, Buffer.from([0])]))).toThrow(/length mismatch/);
        expect(() => encodeFrame({ type: CLASSICAL_MESSAGE, sequence: 0, payload: Buffer.alloc(0) })).toThrow(/requires authenticationTag/);
        expect(() => encodeFrame({
            type: CLASSICAL_MESSAGE,
            sequence: 0,
            payload: Buffer.alloc(0),
            authenticationTag: Buffer.alloc(AUTHENTICATION_TAG_LENGTH - 1)
        })).toThrow(/authenticationTag/);
        expect(() => encodeFrame({
            type: BOOTSTRAP_MESSAGE,
            sequence: 0,
            payload: Buffer.alloc(0),
            authenticationTag: Buffer.alloc(AUTHENTICATION_TAG_LENGTH)
        })).toThrow(/cannot contain/);
        expect(() => encodeBootstrap(0x100000000, Buffer.alloc(0))).toThrow(/sequence/);
    });
});
describe('HMAC authentication', () => {
    it('matches the normative HMAC input and tag vector', () => {
        const input = Buffer.from('0400000001000401020304', 'hex');
        const expected = '3d700ffa04462dca05efce29e6ec166e1387f11872d453dffbac5dfbdb456d2d';
        const frame = { type: CLASSICAL_MESSAGE, sequence: 1, payload: Buffer.from([1, 2, 3, 4]) };
        expect(frameHmacInput(frame).equals(input)).toBe(true);
        expect(computeHmac(zeroKey, input).toString('hex')).toBe(expected);
        expect(computeAuthenticationTag(zeroKey, frame).toString('hex')).toBe(expected);
    });
    it('rejects header, payload, and tag tampering with constant-time comparison', () => {
        const frame = signFrame(zeroKey, {
            type: CLASSICAL_MESSAGE,
            sequence: 7,
            payload: Buffer.from('authenticated payload')
        });
        const wire = encodeFrame(frame);
        expect(verifyFrameAuthentication(zeroKey, wire)).toBe(true);
        expect(constantTimeEqual(computeAuthenticationTag(zeroKey, frame), frame.authenticationTag)).toBe(true);
        const payloadTampered = Buffer.from(wire);
        payloadTampered[7] ^= 1;
        expect(verifyFrameAuthentication(zeroKey, payloadTampered)).toBe(false);
        const headerTampered = Buffer.from(wire);
        headerTampered[4] ^= 1;
        expect(verifyFrameAuthentication(zeroKey, headerTampered)).toBe(false);
        const tagTampered = Buffer.from(wire);
        tagTampered[tagTampered.length - 1] ^= 1;
        expect(verifyFrameAuthentication(zeroKey, tagTampered)).toBe(false);
        expect(verifyHmac(zeroKey, frameHmacInput(frame), Buffer.alloc(32, 1))).toBe(false);
    });
});
describe('RFC 5869 and directional derivation', () => {
    it('matches the PRK, directional key, and nonce-prefix vectors', () => {
        expect(hkdfExtract(Buffer.alloc(32, 0), zeroSalt).toString('hex')).toBe('33ad0a1c607ec03b09e6cd9893680ce210adf300aa1f2660e1b22e10f170f92a');
        const keys = deriveDirectionalKeys(Buffer.alloc(32, 0), vectorContextHash);
        expect(keys.K_enc_A2B.toString('hex')).toBe('dd70c9f5110ea586dac2ba20569481ad03d8df346c9d17cd78cbf70a9cd2c9e5');
        expect(keys.K_enc_B2A.toString('hex')).toBe('da2273fed3c28f397e687de459ea37f5bef4fa7af6047c0af48ab3c98f390c6a');
        expect(deriveDirectionalKeysFrom({ ikm: Buffer.alloc(32, 0), contextHash: vectorContextHash }).K_enc_A2B.equals(keys.K_enc_A2B)).toBe(true);
        expect(deriveDirectionalKeysWithSalt(Buffer.alloc(32, 0), zeroSalt, vectorContextHash).K_enc_B2A.equals(keys.K_enc_B2A)).toBe(true);
        const prefixes = deriveNoncePrefixes(keys, vectorContextHash);
        expect(prefixes.A2B.toString('hex')).toBe('ff54b8c0');
        expect(prefixes.B2A.toString('hex')).toBe('bc58de4c');
        expect(deriveNoncePrefix('A2B', keys.K_enc_A2B, vectorContextHash).equals(prefixes.A2B)).toBe(true);
        expect(buildNonce(prefixes.A2B, 0).equals(Buffer.from('ff54b8c00000000000000000', 'hex'))).toBe(true);
    });
    it('encrypts and decrypts with deterministic directional nonces and replay state', () => {
        const keys = deriveDirectionalKeys(Buffer.alloc(32, 0), vectorContextHash);
        const sender = new DirectionalAead(keys.K_enc_A2B, vectorContextHash, 'A2B');
        const receiver = new DirectionalAead(keys.K_enc_A2B, vectorContextHash, 'A2B');
        const aad = Buffer.from('frame-header');
        const plaintext = Buffer.from('directional payload');
        const first = sender.encrypt(plaintext, aad);
        expect(first.nonce.equals(Buffer.from('ff54b8c00000000000000000', 'hex'))).toBe(true);
        expect(receiver.decrypt(first.ciphertext, first.authenticationTag, aad, first.nonce).equals(plaintext)).toBe(true);
        expect(() => receiver.decrypt(first.ciphertext, first.authenticationTag, aad, first.nonce)).toThrow(AeadReplayError);
        const second = sender.encrypt(Buffer.from('second'), aad);
        expect(second.nonce.equals(Buffer.from('ff54b8c00000000000000001', 'hex'))).toBe(true);
        expect(receiver.decrypt(second.ciphertext, second.authenticationTag, aad).toString()).toBe('second');
        const tampered = Buffer.from(second.ciphertext);
        tampered[0] ^= 1;
        expect(() => receiver.decrypt(tampered, second.authenticationTag, aad)).toThrow();
        expect(receiver.nextSequenceExpected).toBe(2n);
    });
    it('rejects an exhausted directional AEAD nonce counter', () => {
        const keys = deriveDirectionalKeys(Buffer.alloc(32, 0), vectorContextHash);
        const aead = new DirectionalAead(keys.K_enc_A2B, vectorContextHash, 'A2B');
        aead.nextSequence = 0xffffffffffffffffn;
        expect(() => aead.encrypt(Buffer.from('payload'))).toThrow(/nonce exhausted/);
    });
    it('implements HKDF expand independently of the convenience wrapper', () => {
        const prk = hkdfExtract(Buffer.alloc(32, 1), Buffer.alloc(32, 2));
        const info = Buffer.from('protocol test info');
        const expanded = hkdfExpand(prk, info, 64);
        const expected = crypto.hkdfSync('sha256', Buffer.alloc(32, 1), Buffer.alloc(32, 2), info, 64);
        expect(expanded.equals(Buffer.from(expected))).toBe(true);
        expect(hkdfSha256(Buffer.alloc(32, 1), Buffer.alloc(32, 2), info, 64).equals(expanded)).toBe(true);
    });
});
describe('sequence and replay state', () => {
    it('matches the normative pure trace vector', () => {
        const trace = traceSequence([0, 1, 2, 3, 5, 4, 6, 5, 6]);
        expect(trace.outcomes).toEqual(['A', 'A', 'A', 'A', 'R', 'A', 'R', 'A', 'A']);
        expect(trace.acceptedCount).toBe(7);
        expect(trace.finalAcceptedCount).toBe(7);
        expect(trace.nextExpectedSequence).toBe(7);
        expect(trace.aborted).toBe(true);
    });
    it('aborts a sender state on mismatch without accepting replay', () => {
        const state = new StrictSequenceState();
        expect([0, 1, 2, 3].map((sequence) => state.tryAccept(sequence))).toEqual([true, true, true, true]);
        expect(state.expectedNextSequence).toBe(4);
        expect(state.tryAccept(5)).toBe(false);
        expect(state.aborted).toBe(true);
        expect(state.tryAccept(4)).toBe(false);
        expect(() => state.verify(4)).toThrow(ProtocolAbortError);
        const senders = new SenderSequenceRegistry();
        expect(senders.tryAccept('A', 0)).toBe(true);
        expect(senders.tryAccept('B', 0)).toBe(true);
        expect(senders.tryAccept('A', 2)).toBe(false);
        expect(senders.tryAccept('B', 1)).toBe(true);
    });
});
describe('per-role transcript chains', () => {
    it('computes SID, HA, HB, and context hash in role order', () => {
        const nonceA = Buffer.from('00112233445566778899aabbccddeeff', 'hex');
        const nonceB = Buffer.from('ffeeddccbbaa99887766554433221100', 'hex');
        const result = computeTranscript({
            nonceA,
            nonceB,
            messagesA: [Buffer.from('A0'), Buffer.from('A1')],
            messagesB: [Buffer.from('B0')]
        });
        expect(result.sid.toString('hex')).toBe('ef49150b2c15cdf7c6db8f653111a7d9651c58dab66ade314aee2a3d7a3c85d3');
        expect(result.hA.toString('hex')).toBe('e6a1c5273771196edb90d478a0083d8633557edd8618c3390578b01965b7a39a');
        expect(result.hB.toString('hex')).toBe('e89136c1a457f68fb90f6d27401439496b147a9c39750c9e9a097fe74e0522dc');
        expect(result.contextHash.toString('hex')).toBe('27786ad49923e66e94b891c6fb6b28065df1dcfb759f62ae7ab0989b6a374729');
        const chain = initializeTranscript(nonceA, nonceB);
        chain.appendA(Buffer.from('A0'));
        expect(chain.appendA(Buffer.from('A1')).equals(result.hA)).toBe(true);
        expect(chain.appendB(Buffer.from('B0')).equals(result.hB)).toBe(true);
        expect(chain.snapshot().contextHash.equals(result.contextHash)).toBe(true);
    });
});
describe('basis packing', () => {
    it('packs four two-bit basis values into one byte', () => {
        expect(packBasis([0, 1, 2, 3])).toBe(0xe4);
        expect(packBasis([0, 0, 0, 0])).toBe(0x00);
        expect(packBasis([3, 3, 3, 3])).toBe(0xff);
        expect(packBasis([1, 2, 3, 0])).toBe(0x39);
        expect(() => packBasis([0, 1, 2])).toThrow(/exactly four/);
        expect(() => packBasis([0, 1, 2, 4])).toThrow(/basis/);
    });
});
describe('protocol receiver', () => {
    it('enforces bootstrap/classical sequencing, authentication, and replay abort', () => {
        const replayReceiver = new ProtocolReceiver(zeroKey);
        const bootstrap = encodeBootstrap(0, Buffer.from('bootstrap'));
        expect(replayReceiver.receive('alice', bootstrap).type).toBe(BOOTSTRAP_MESSAGE);
        const classical = encodeFrame(signFrame(zeroKey, {
            type: CLASSICAL_MESSAGE,
            sequence: 1,
            payload: Buffer.from('classical')
        }));
        expect(replayReceiver.receive('alice', classical).payload.toString()).toBe('classical');
        expect(() => replayReceiver.receive('alice', classical)).toThrow(ProtocolAbortError);
        const tamperReceiver = new ProtocolReceiver(zeroKey);
        expect(tamperReceiver.receive('alice', bootstrap).type).toBe(BOOTSTRAP_MESSAGE);
        expect(tamperReceiver.receive('alice', classical).payload.toString()).toBe('classical');
        const next = signFrame(zeroKey, {
            type: CLASSICAL_MESSAGE,
            sequence: 2,
            payload: Buffer.from('next')
        });
        const tampered = encodeFrame(next);
        tampered[7] ^= 1;
        expect(() => tamperReceiver.receive('alice', tampered)).toThrow(AuthenticationError);
        expect(() => tamperReceiver.receive('alice', encodeFrame(next))).not.toThrow();
    });
});
