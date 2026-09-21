/** BOOTSTRAP_MESSAGE is the reserved pre-authentication frame type. */
export declare const BOOTSTRAP_MESSAGE = 1;
export declare const CLASSICAL_MESSAGE = 4;
export declare const MAX_PAYLOAD_LENGTH = 65535;
export declare const AUTHENTICATION_TAG_LENGTH = 32;
export declare const FRAME_HEADER_LENGTH = 7;
export declare const PROTOCOL_VERSION = 1;
export declare const VERSION: Buffer<ArrayBuffer>;
export declare const DEFAULT_SALT: Buffer<ArrayBuffer>;
export declare const ALICE_LABEL: Buffer<ArrayBuffer>;
export declare const BOB_LABEL: Buffer<ArrayBuffer>;
export type MessageType = typeof BOOTSTRAP_MESSAGE | typeof CLASSICAL_MESSAGE;
export type ProtocolRole = 'A' | 'B';
export type Direction = 'A2B' | 'B2A';
export type SequenceOutcome = 'A' | 'R';
export interface Frame {
    type: MessageType;
    sequence: number;
    payload: Buffer;
    authenticationTag?: Buffer;
}
export interface FrameInput {
    type?: MessageType;
    messageType?: MessageType;
    sequence?: number;
    messageSequence?: number;
    payload: Buffer;
    authenticationTag?: Buffer;
    tag?: Buffer;
}
export interface DirectionalKeys {
    K_enc_A2B: Buffer;
    K_enc_B2A: Buffer;
}
export interface DirectionalKeyDerivationInput {
    ikm: Buffer;
    contextHash: Buffer;
    salt?: Buffer;
}
export interface DirectionalNoncePrefixes {
    A2B: Buffer;
    B2A: Buffer;
}
export interface SequenceTraceResult {
    outcomes: SequenceOutcome[];
    acceptedCount: number;
    finalAcceptedCount: number;
    nextExpectedSequence: number;
    finalNextExpectedSequence: number;
    aborted: boolean;
}
export interface TranscriptInput {
    nonceA: Buffer;
    nonceB: Buffer;
    version?: number | Buffer;
    messagesA?: readonly Buffer[];
    messagesB?: readonly Buffer[];
}
export interface TranscriptResult {
    sid: Buffer;
    hA: Buffer;
    hB: Buffer;
    contextHash: Buffer;
}
export declare class ProtocolAbortError extends Error {
    readonly expected: number;
    readonly received: number;
    constructor(expected: number, received: number);
}
export declare class AuthenticationError extends Error {
    constructor(message?: string);
}
export declare function encodeHeader(type: MessageType, sequence: number, payloadLength?: number): Buffer;
export declare function encodeFrame(input: FrameInput): Buffer;
export declare function decodeFrame(wire: Buffer | Uint8Array): Frame;
export declare function encodeBootstrap(sequence: number, payload: Buffer): Buffer;
export declare function encodeClassical(sequence: number, payload: Buffer, authenticationTag: Buffer): Buffer;
export declare function frameHmacInput(frame: Frame | FrameInput): Buffer;
export declare function computeHmac(key: Buffer, data: Buffer): Buffer;
export declare function constantTimeEqual(left: Buffer, right: Buffer): boolean;
export declare function verifyHmac(key: Buffer, data: Buffer, tag: Buffer): boolean;
export declare function computeAuthenticationTag(key: Buffer, frame: Frame | FrameInput): Buffer;
export declare function signFrame(key: Buffer, frame: FrameInput): Frame;
export declare function verifyFrameAuthentication(key: Buffer, frame: Frame | FrameInput | Buffer | Uint8Array): boolean;
export declare function hkdfExtract(ikm: Buffer, salt?: Buffer): Buffer;
export declare function hkdfExpand(prk: Buffer, info: Buffer, length?: number): Buffer;
export declare function hkdfSha256(ikm: Buffer, salt?: Buffer, info?: Buffer, length?: number): Buffer;
export declare const hkdf: typeof hkdfSha256;
export declare function deriveDirectionalKey(ikm: Buffer, direction: Direction, contextHash: Buffer, salt?: Buffer): Buffer;
export declare function deriveDirectionalKeys(ikmOrInput: Buffer | DirectionalKeyDerivationInput, contextHashOrSalt?: Buffer, salt?: Buffer): DirectionalKeys;
export declare function deriveDirectionalKeysFrom(input: DirectionalKeyDerivationInput): DirectionalKeys;
export declare function deriveDirectionalKeysWithSalt(ikm: Buffer, salt: Buffer, contextHash: Buffer): DirectionalKeys;
export declare function deriveNoncePrefix(direction: Direction, key: Buffer, contextHash: Buffer): Buffer;
export declare function deriveNoncePrefixes(keys: DirectionalKeys, contextHash: Buffer): DirectionalNoncePrefixes;
export interface AeadOutput {
    nonce: Buffer;
    ciphertext: Buffer;
    authenticationTag: Buffer;
}
export declare class AeadReplayError extends Error {
    readonly expected: bigint;
    readonly received: bigint;
    constructor(expected: bigint, received: bigint);
}
export declare class DirectionalAead {
    private readonly key;
    private readonly prefix;
    private nextSequence;
    constructor(key: Buffer, contextHash: Buffer, direction: Direction);
    get nextSequenceExpected(): bigint;
    nonceForNextSequence(): Buffer;
    encrypt(plaintext: Buffer, aad?: Buffer): AeadOutput;
    decrypt(ciphertext: Buffer, authenticationTag: Buffer, aad?: Buffer, nonce?: Buffer): Buffer;
}
export declare function buildNonce(prefix: Buffer, sequence64: number | bigint): Buffer;
export declare class StrictSequenceState {
    private expected;
    private abortedState;
    get expectedNextSequence(): number;
    get aborted(): boolean;
    tryAccept(sequence: number): boolean;
    accept(sequence: number): boolean;
    verify(sequence: number): void;
}
export declare class SenderSequenceRegistry {
    private readonly states;
    state(sender: string): StrictSequenceState;
    tryAccept(sender: string, sequence: number): boolean;
    verify(sender: string, sequence: number): void;
    expectedNextSequence(sender: string): number;
}
export declare function traceSequence(sequences: readonly number[], initialExpectedSequence?: number): SequenceTraceResult;
export declare class TranscriptChain {
    readonly sid: Buffer;
    private hA;
    private hB;
    private context;
    constructor(nonceA: Buffer, nonceB: Buffer, version?: number | Buffer);
    private combineContext;
    append(role: ProtocolRole, message: Buffer): Buffer;
    appendA(message: Buffer): Buffer;
    appendB(message: Buffer): Buffer;
    get ha(): Buffer;
    get hb(): Buffer;
    get hAValue(): Buffer;
    get hBValue(): Buffer;
    get contextHash(): Buffer;
    snapshot(): TranscriptResult;
}
export declare function initializeTranscript(nonceA: Buffer, nonceB: Buffer, version?: number | Buffer): TranscriptChain;
export declare function computeTranscript(input: TranscriptInput): TranscriptResult;
export declare function packBasis(bases: readonly number[]): number;
export declare const packBasisValues: typeof packBasis;
export declare class ProtocolReceiver {
    private readonly authenticationKey?;
    private readonly sequences;
    constructor(authenticationKey?: Buffer | undefined);
    receive(sender: string, wire: Buffer | Uint8Array): Frame;
}
