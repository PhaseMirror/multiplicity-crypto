import crypto from 'crypto';
/** BOOTSTRAP_MESSAGE is the reserved pre-authentication frame type. */
export const BOOTSTRAP_MESSAGE = 1;
export const CLASSICAL_MESSAGE = 4;
export const MAX_PAYLOAD_LENGTH = 0xffff;
export const AUTHENTICATION_TAG_LENGTH = 32;
export const FRAME_HEADER_LENGTH = 7;
export const PROTOCOL_VERSION = 1;
export const VERSION = Buffer.from([PROTOCOL_VERSION]);
export const DEFAULT_SALT = Buffer.alloc(32, 0);
export const ALICE_LABEL = Buffer.from([0x41, 0x4c, 0x49, 0x43, 0x45, 0, 0, 0]);
export const BOB_LABEL = Buffer.from([0x42, 0x4f, 0x42, 0, 0, 0, 0, 0]);
export class ProtocolAbortError extends Error {
    constructor(expected, received) {
        super(`message sequence mismatch: expected ${expected}, received ${received}`);
        this.name = 'ProtocolAbortError';
        this.expected = expected;
        this.received = received;
    }
}
export class AuthenticationError extends Error {
    constructor(message = 'frame authentication failed') {
        super(message);
        this.name = 'AuthenticationError';
    }
}
function assertBuffer(value, name) {
    if (!Buffer.isBuffer(value) && !(value instanceof Uint8Array)) {
        throw new TypeError(`${name} must be a Buffer`);
    }
    return Buffer.isBuffer(value) ? value : Buffer.from(value);
}
function assertInteger(value, name, maximum) {
    if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
        throw new RangeError(`${name} must be an integer between 0 and ${maximum}`);
    }
}
function assertSequence(value) {
    assertInteger(value, 'sequence', 0xffffffff);
}
function assertKey(key) {
    assertBuffer(key, 'key');
    if (key.length !== 32) {
        throw new RangeError('authentication key must be 32 bytes');
    }
}
function resolveMessageType(input) {
    const type = input.type ?? input.messageType;
    if (type !== BOOTSTRAP_MESSAGE && type !== CLASSICAL_MESSAGE) {
        throw new RangeError(`unsupported message type: ${String(type)}`);
    }
    return type;
}
function resolveSequence(input) {
    const sequence = input.sequence ?? input.messageSequence;
    if (sequence === undefined) {
        throw new TypeError('sequence is required');
    }
    assertSequence(sequence);
    return sequence;
}
function resolveTag(input) {
    if (input.authenticationTag !== undefined && input.tag !== undefined &&
        !input.authenticationTag.equals(input.tag)) {
        throw new TypeError('authenticationTag and tag disagree');
    }
    return input.authenticationTag ?? input.tag;
}
export function encodeHeader(type, sequence, payloadLength = 0) {
    if (type !== BOOTSTRAP_MESSAGE && type !== CLASSICAL_MESSAGE) {
        throw new RangeError(`unsupported message type: ${String(type)}`);
    }
    assertSequence(sequence);
    assertInteger(payloadLength, 'payloadLength', MAX_PAYLOAD_LENGTH);
    const header = Buffer.allocUnsafe(FRAME_HEADER_LENGTH);
    header.writeUInt8(type, 0);
    header.writeUInt32BE(sequence, 1);
    header.writeUInt16BE(payloadLength, 5);
    return header;
}
export function encodeFrame(input) {
    const type = resolveMessageType(input);
    const sequence = resolveSequence(input);
    const payload = assertBuffer(input.payload, 'payload');
    if (payload.length > MAX_PAYLOAD_LENGTH) {
        throw new RangeError(`payload exceeds ${MAX_PAYLOAD_LENGTH} bytes`);
    }
    const tag = resolveTag(input);
    if (type === CLASSICAL_MESSAGE) {
        if (tag === undefined) {
            throw new TypeError('CLASSICAL_MESSAGE requires authenticationTag');
        }
        assertBuffer(tag, 'authenticationTag');
        if (tag.length !== AUTHENTICATION_TAG_LENGTH) {
            throw new RangeError(`authenticationTag must be ${AUTHENTICATION_TAG_LENGTH} bytes`);
        }
    }
    else if (tag !== undefined) {
        throw new TypeError('BOOTSTRAP_MESSAGE cannot contain an authenticationTag');
    }
    const header = encodeHeader(type, sequence, payload.length);
    const tagBuffer = tag === undefined ? undefined : assertBuffer(tag, 'authenticationTag');
    return Buffer.concat([header, payload, tagBuffer ?? Buffer.alloc(0)]);
}
export function decodeFrame(wire) {
    const bytes = assertBuffer(wire, 'wire frame');
    if (bytes.length < FRAME_HEADER_LENGTH) {
        throw new RangeError('frame is shorter than its header');
    }
    const type = bytes.readUInt8(0);
    if (type !== BOOTSTRAP_MESSAGE && type !== CLASSICAL_MESSAGE) {
        throw new RangeError(`unsupported message type: ${type}`);
    }
    const sequence = bytes.readUInt32BE(1);
    const payloadLength = bytes.readUInt16BE(5);
    const tagLength = type === CLASSICAL_MESSAGE ? AUTHENTICATION_TAG_LENGTH : 0;
    const expectedLength = FRAME_HEADER_LENGTH + payloadLength + tagLength;
    if (bytes.length !== expectedLength) {
        throw new RangeError(`payload length mismatch: header declares ${payloadLength}, frame has ${bytes.length - FRAME_HEADER_LENGTH - tagLength} payload bytes`);
    }
    const payloadEnd = FRAME_HEADER_LENGTH + payloadLength;
    const payload = Buffer.from(bytes.subarray(FRAME_HEADER_LENGTH, payloadEnd));
    const authenticationTag = type === CLASSICAL_MESSAGE
        ? Buffer.from(bytes.subarray(payloadEnd))
        : undefined;
    return { type, sequence, payload, authenticationTag };
}
export function encodeBootstrap(sequence, payload) {
    return encodeFrame({ type: BOOTSTRAP_MESSAGE, sequence, payload });
}
export function encodeClassical(sequence, payload, authenticationTag) {
    return encodeFrame({ type: CLASSICAL_MESSAGE, sequence, payload, authenticationTag });
}
export function frameHmacInput(frame) {
    const type = resolveMessageType(frame);
    const sequence = resolveSequence(frame);
    const payload = assertBuffer(frame.payload, 'payload');
    return Buffer.concat([encodeHeader(type, sequence, payload.length), payload]);
}
export function computeHmac(key, data) {
    const keyBuffer = assertBuffer(key, 'key');
    const dataBuffer = assertBuffer(data, 'data');
    return crypto.createHmac('sha256', keyBuffer).update(dataBuffer).digest();
}
export function constantTimeEqual(left, right) {
    const leftBuffer = assertBuffer(left, 'left');
    const rightBuffer = assertBuffer(right, 'right');
    if (leftBuffer.length !== rightBuffer.length) {
        return false;
    }
    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}
export function verifyHmac(key, data, tag) {
    return constantTimeEqual(computeHmac(key, data), tag);
}
export function computeAuthenticationTag(key, frame) {
    assertKey(key);
    return computeHmac(key, frameHmacInput(frame));
}
export function signFrame(key, frame) {
    assertKey(key);
    const type = resolveMessageType(frame);
    if (type !== CLASSICAL_MESSAGE) {
        throw new TypeError('only CLASSICAL_MESSAGE frames can be signed');
    }
    return {
        type,
        sequence: resolveSequence(frame),
        payload: Buffer.from(assertBuffer(frame.payload, 'payload')),
        authenticationTag: computeAuthenticationTag(key, frame)
    };
}
export function verifyFrameAuthentication(key, frame) {
    assertKey(key);
    let parsed;
    try {
        parsed = Buffer.isBuffer(frame) || frame instanceof Uint8Array
            ? decodeFrame(frame)
            : frame;
    }
    catch {
        return false;
    }
    if (parsed.type !== CLASSICAL_MESSAGE || parsed.authenticationTag === undefined) {
        return false;
    }
    return constantTimeEqual(computeAuthenticationTag(key, parsed), parsed.authenticationTag);
}
export function hkdfExtract(ikm, salt = DEFAULT_SALT) {
    const ikmBuffer = assertBuffer(ikm, 'ikm');
    const saltBuffer = assertBuffer(salt, 'salt');
    return crypto.createHmac('sha256', saltBuffer).update(ikmBuffer).digest();
}
export function hkdfExpand(prk, info, length = 32) {
    const prkBuffer = assertBuffer(prk, 'prk');
    const infoBuffer = assertBuffer(info, 'info');
    if (!Number.isSafeInteger(length) || length <= 0 || length > 32 * 255) {
        throw new RangeError('HKDF output length must be between 1 and 8160 bytes');
    }
    if (prkBuffer.length === 0) {
        throw new RangeError('PRK must not be empty');
    }
    const output = Buffer.allocUnsafe(length);
    let previous = Buffer.alloc(0);
    let offset = 0;
    for (let counter = 1; offset < length; counter += 1) {
        const block = crypto.createHmac('sha256', prkBuffer)
            .update(previous)
            .update(infoBuffer)
            .update(Buffer.from([counter]))
            .digest();
        const copyLength = Math.min(block.length, length - offset);
        block.copy(output, offset, 0, copyLength);
        offset += copyLength;
        previous = block;
    }
    return output;
}
export function hkdfSha256(ikm, salt = DEFAULT_SALT, info = Buffer.alloc(0), length = 32) {
    return hkdfExpand(hkdfExtract(ikm, salt), info, length);
}
export const hkdf = hkdfSha256;
export function deriveDirectionalKey(ikm, direction, contextHash, salt = DEFAULT_SALT) {
    const ikmBuffer = assertBuffer(ikm, 'ikm');
    const contextBuffer = assertBuffer(contextHash, 'contextHash');
    if (ikmBuffer.length !== 32) {
        throw new RangeError('IKM must be 32 bytes');
    }
    if (contextBuffer.length !== 32) {
        throw new RangeError('contextHash must be 32 bytes');
    }
    if (direction !== 'A2B' && direction !== 'B2A') {
        throw new RangeError(`unsupported direction: ${String(direction)}`);
    }
    const roleLabel = direction === 'A2B' ? ALICE_LABEL : BOB_LABEL;
    const info = Buffer.concat([Buffer.from(`AEAD-ENC-${direction}`, 'ascii'), roleLabel, contextBuffer]);
    return hkdfSha256(ikmBuffer, salt, info, 32);
}
export function deriveDirectionalKeys(ikmOrInput, contextHashOrSalt, salt) {
    let ikm;
    let contextHash;
    let resolvedSalt;
    if (Buffer.isBuffer(ikmOrInput)) {
        ikm = ikmOrInput;
        contextHash = contextHashOrSalt;
        resolvedSalt = salt;
    }
    else {
        ikm = ikmOrInput.ikm;
        contextHash = ikmOrInput.contextHash;
        resolvedSalt = ikmOrInput.salt;
    }
    return {
        K_enc_A2B: deriveDirectionalKey(ikm, 'A2B', contextHash, resolvedSalt),
        K_enc_B2A: deriveDirectionalKey(ikm, 'B2A', contextHash, resolvedSalt)
    };
}
export function deriveDirectionalKeysFrom(input) {
    return deriveDirectionalKeys(input);
}
export function deriveDirectionalKeysWithSalt(ikm, salt, contextHash) {
    return deriveDirectionalKeys(ikm, contextHash, salt);
}
export function deriveNoncePrefix(direction, key, contextHash) {
    const keyBuffer = assertBuffer(key, 'key');
    const contextBuffer = assertBuffer(contextHash, 'contextHash');
    if (keyBuffer.length !== 32 || contextBuffer.length !== 32) {
        throw new RangeError('key and contextHash must be 32 bytes');
    }
    if (direction !== 'A2B' && direction !== 'B2A') {
        throw new RangeError(`unsupported direction: ${String(direction)}`);
    }
    return crypto.createHash('sha256')
        .update(Buffer.from(`IVPFX-${direction}`, 'ascii'))
        .update(keyBuffer)
        .update(contextBuffer)
        .digest()
        .subarray(0, 4);
}
export function deriveNoncePrefixes(keys, contextHash) {
    return {
        A2B: deriveNoncePrefix('A2B', keys.K_enc_A2B, contextHash),
        B2A: deriveNoncePrefix('B2A', keys.K_enc_B2A, contextHash)
    };
}
export class AeadReplayError extends Error {
    constructor(expected, received) {
        super(`AEAD nonce mismatch: expected ${expected}, received ${received}`);
        this.name = 'AeadReplayError';
        this.expected = expected;
        this.received = received;
    }
}
export class DirectionalAead {
    constructor(key, contextHash, direction) {
        this.nextSequence = 0n;
        const keyBuffer = assertBuffer(key, 'key');
        const contextBuffer = assertBuffer(contextHash, 'contextHash');
        if (keyBuffer.length !== 32) {
            throw new RangeError('AEAD key must be 32 bytes');
        }
        if (contextBuffer.length !== 32) {
            throw new RangeError('contextHash must be 32 bytes');
        }
        if (direction !== 'A2B' && direction !== 'B2A') {
            throw new RangeError(`unsupported direction: ${String(direction)}`);
        }
        this.key = Buffer.from(keyBuffer);
        this.prefix = deriveNoncePrefix(direction, this.key, contextBuffer);
    }
    get nextSequenceExpected() {
        return this.nextSequence;
    }
    nonceForNextSequence() {
        return buildNonce(this.prefix, this.nextSequence);
    }
    encrypt(plaintext, aad = Buffer.alloc(0)) {
        const plaintextBuffer = assertBuffer(plaintext, 'plaintext');
        const aadBuffer = assertBuffer(aad, 'aad');
        if (this.nextSequence > 0xffffffffffffffffn) {
            throw new RangeError('directional AEAD nonce exhausted');
        }
        const nonce = this.nonceForNextSequence();
        const cipher = crypto.createCipheriv('aes-256-gcm', this.key, nonce);
        cipher.setAAD(aadBuffer);
        const ciphertext = Buffer.concat([cipher.update(plaintextBuffer), cipher.final()]);
        const authenticationTag = cipher.getAuthTag();
        this.nextSequence += 1n;
        return { nonce, ciphertext, authenticationTag };
    }
    decrypt(ciphertext, authenticationTag, aad = Buffer.alloc(0), nonce) {
        const ciphertextBuffer = assertBuffer(ciphertext, 'ciphertext');
        const tagBuffer = assertBuffer(authenticationTag, 'authenticationTag');
        const aadBuffer = assertBuffer(aad, 'aad');
        if (tagBuffer.length !== 16) {
            throw new RangeError('AES-256-GCM authenticationTag must be 16 bytes');
        }
        const expectedNonce = this.nonceForNextSequence();
        const receivedNonce = nonce === undefined ? expectedNonce : assertBuffer(nonce, 'nonce');
        if (!receivedNonce.equals(expectedNonce)) {
            const expected = expectedNonce.readBigUInt64BE(4);
            const received = receivedNonce.readBigUInt64BE(4);
            throw new AeadReplayError(expected, received);
        }
        const activeNonce = receivedNonce;
        const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, activeNonce);
        decipher.setAAD(aadBuffer);
        decipher.setAuthTag(tagBuffer);
        const plaintext = Buffer.concat([decipher.update(ciphertextBuffer), decipher.final()]);
        this.nextSequence += 1n;
        return plaintext;
    }
}
export function buildNonce(prefix, sequence64) {
    const prefixBuffer = assertBuffer(prefix, 'prefix');
    if (prefixBuffer.length !== 4) {
        throw new RangeError('nonce prefix must be 4 bytes');
    }
    const sequence = typeof sequence64 === 'bigint' ? sequence64 : BigInt(sequence64);
    if (sequence < 0n || sequence > 0xffffffffffffffffn) {
        throw new RangeError('seq64 must be between 0 and 2^64-1');
    }
    const nonce = Buffer.allocUnsafe(12);
    prefixBuffer.copy(nonce, 0);
    nonce.writeBigUInt64BE(sequence, 4);
    return nonce;
}
export class StrictSequenceState {
    constructor() {
        this.expected = 0;
        this.abortedState = false;
    }
    get expectedNextSequence() {
        return this.expected;
    }
    get aborted() {
        return this.abortedState;
    }
    tryAccept(sequence) {
        if (!Number.isSafeInteger(sequence) || sequence < 0 || sequence > 0xffffffff) {
            this.abortedState = true;
            return false;
        }
        if (this.abortedState || sequence !== this.expected) {
            this.abortedState = true;
            return false;
        }
        this.expected += 1;
        return true;
    }
    accept(sequence) {
        return this.tryAccept(sequence);
    }
    verify(sequence) {
        if (!this.tryAccept(sequence)) {
            throw new ProtocolAbortError(this.expected, sequence);
        }
    }
}
export class SenderSequenceRegistry {
    constructor() {
        this.states = new Map();
    }
    state(sender) {
        if (sender.length === 0) {
            throw new TypeError('sender must not be empty');
        }
        let state = this.states.get(sender);
        if (state === undefined) {
            state = new StrictSequenceState();
            this.states.set(sender, state);
        }
        return state;
    }
    tryAccept(sender, sequence) {
        return this.state(sender).tryAccept(sequence);
    }
    verify(sender, sequence) {
        this.state(sender).verify(sequence);
    }
    expectedNextSequence(sender) {
        return this.state(sender).expectedNextSequence;
    }
}
export function traceSequence(sequences, initialExpectedSequence = 0) {
    assertInteger(initialExpectedSequence, 'initialExpectedSequence', 0xffffffff);
    let expected = initialExpectedSequence;
    let acceptedCount = 0;
    let aborted = false;
    const outcomes = [];
    for (const sequence of sequences) {
        const valid = Number.isSafeInteger(sequence) && sequence >= 0 && sequence <= 0xffffffff;
        if (valid && sequence === expected) {
            outcomes.push('A');
            acceptedCount += 1;
            expected += 1;
        }
        else {
            outcomes.push('R');
            aborted = true;
        }
    }
    return {
        outcomes,
        acceptedCount,
        finalAcceptedCount: acceptedCount,
        nextExpectedSequence: expected,
        finalNextExpectedSequence: expected,
        aborted
    };
}
function encodeVersion(version) {
    if (Buffer.isBuffer(version)) {
        if (version.length === 0) {
            throw new RangeError('version must not be empty');
        }
        return Buffer.from(version);
    }
    assertInteger(version, 'version', 0xff);
    return Buffer.from([version]);
}
export class TranscriptChain {
    constructor(nonceA, nonceB, version = PROTOCOL_VERSION) {
        const nonceABuffer = assertBuffer(nonceA, 'nonceA');
        const nonceBBuffer = assertBuffer(nonceB, 'nonceB');
        const versionBuffer = encodeVersion(version);
        this.sid = crypto.createHash('sha256')
            .update(nonceABuffer)
            .update(nonceBBuffer)
            .digest();
        this.hA = crypto.createHash('sha256')
            .update(versionBuffer)
            .update(this.sid)
            .update(ALICE_LABEL)
            .digest();
        this.hB = crypto.createHash('sha256')
            .update(versionBuffer)
            .update(this.sid)
            .update(BOB_LABEL)
            .digest();
        this.context = this.combineContext();
    }
    combineContext() {
        return crypto.createHash('sha256')
            .update(this.hA)
            .update(this.hB)
            .digest();
    }
    append(role, message) {
        const messageBuffer = assertBuffer(message, 'message');
        if (role === 'A') {
            this.hA = crypto.createHash('sha256')
                .update(this.hA)
                .update(messageBuffer)
                .digest();
        }
        else if (role === 'B') {
            this.hB = crypto.createHash('sha256')
                .update(this.hB)
                .update(messageBuffer)
                .digest();
        }
        else {
            throw new RangeError(`unsupported role: ${String(role)}`);
        }
        this.context = this.combineContext();
        return role === 'A' ? Buffer.from(this.hA) : Buffer.from(this.hB);
    }
    appendA(message) {
        return this.append('A', message);
    }
    appendB(message) {
        return this.append('B', message);
    }
    get ha() {
        return Buffer.from(this.hA);
    }
    get hb() {
        return Buffer.from(this.hB);
    }
    get hAValue() {
        return Buffer.from(this.hA);
    }
    get hBValue() {
        return Buffer.from(this.hB);
    }
    get contextHash() {
        return Buffer.from(this.context);
    }
    snapshot() {
        return {
            sid: Buffer.from(this.sid),
            hA: Buffer.from(this.hA),
            hB: Buffer.from(this.hB),
            contextHash: Buffer.from(this.context)
        };
    }
}
export function initializeTranscript(nonceA, nonceB, version = PROTOCOL_VERSION) {
    return new TranscriptChain(nonceA, nonceB, version);
}
export function computeTranscript(input) {
    const chain = new TranscriptChain(input.nonceA, input.nonceB, input.version ?? PROTOCOL_VERSION);
    for (const message of input.messagesA ?? []) {
        chain.appendA(message);
    }
    for (const message of input.messagesB ?? []) {
        chain.appendB(message);
    }
    return chain.snapshot();
}
export function packBasis(bases) {
    if (bases.length !== 4) {
        throw new RangeError('basis vector must contain exactly four values');
    }
    let packed = 0;
    for (let index = 0; index < bases.length; index += 1) {
        const basis = bases[index];
        assertInteger(basis, `basis[${index}]`, 3);
        packed |= basis << (index * 2);
    }
    return packed;
}
export const packBasisValues = packBasis;
export class ProtocolReceiver {
    constructor(authenticationKey) {
        this.authenticationKey = authenticationKey;
        this.sequences = new SenderSequenceRegistry();
        if (authenticationKey !== undefined) {
            assertKey(authenticationKey);
        }
    }
    receive(sender, wire) {
        const frame = decodeFrame(wire);
        if (frame.type === CLASSICAL_MESSAGE) {
            if (this.authenticationKey === undefined) {
                throw new AuthenticationError('authentication key is not configured');
            }
            if (!verifyFrameAuthentication(this.authenticationKey, frame)) {
                throw new AuthenticationError();
            }
        }
        if (!this.sequences.tryAccept(sender, frame.sequence)) {
            throw new ProtocolAbortError(this.sequences.expectedNextSequence(sender), frame.sequence);
        }
        return frame;
    }
}
