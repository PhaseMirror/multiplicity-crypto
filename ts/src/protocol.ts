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

export class ProtocolAbortError extends Error {
  readonly expected: number;
  readonly received: number;

  constructor(expected: number, received: number) {
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

function assertBuffer(value: Buffer | Uint8Array, name: string): Buffer {
  if (!Buffer.isBuffer(value) && !(value instanceof Uint8Array)) {
    throw new TypeError(`${name} must be a Buffer`);
  }
  return Buffer.isBuffer(value) ? value : Buffer.from(value);
}

function assertInteger(value: number, name: string, maximum: number): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
    throw new RangeError(`${name} must be an integer between 0 and ${maximum}`);
  }
}

function assertSequence(value: number): void {
  assertInteger(value, 'sequence', 0xffffffff);
}

function assertKey(key: Buffer): void {
  assertBuffer(key, 'key');
  if (key.length !== 32) {
    throw new RangeError('authentication key must be 32 bytes');
  }
}

function resolveMessageType(input: FrameInput): MessageType {
  const type = input.type ?? input.messageType;
  if (type !== BOOTSTRAP_MESSAGE && type !== CLASSICAL_MESSAGE) {
    throw new RangeError(`unsupported message type: ${String(type)}`);
  }
  return type;
}

function resolveSequence(input: FrameInput): number {
  const sequence = input.sequence ?? input.messageSequence;
  if (sequence === undefined) {
    throw new TypeError('sequence is required');
  }
  assertSequence(sequence);
  return sequence;
}

function resolveTag(input: FrameInput): Buffer | undefined {
  if (input.authenticationTag !== undefined && input.tag !== undefined &&
      !input.authenticationTag.equals(input.tag)) {
    throw new TypeError('authenticationTag and tag disagree');
  }
  return input.authenticationTag ?? input.tag;
}

export function encodeHeader(
  type: MessageType,
  sequence: number,
  payloadLength = 0
): Buffer {
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

export function encodeFrame(input: FrameInput): Buffer {
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
  } else if (tag !== undefined) {
    throw new TypeError('BOOTSTRAP_MESSAGE cannot contain an authenticationTag');
  }

  const header = encodeHeader(type, sequence, payload.length);
  const tagBuffer = tag === undefined ? undefined : assertBuffer(tag, 'authenticationTag');
  return Buffer.concat([header, payload, tagBuffer ?? Buffer.alloc(0)]);
}

export function decodeFrame(wire: Buffer | Uint8Array): Frame {
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
    throw new RangeError(
      `payload length mismatch: header declares ${payloadLength}, frame has ${bytes.length - FRAME_HEADER_LENGTH - tagLength} payload bytes`
    );
  }

  const payloadEnd = FRAME_HEADER_LENGTH + payloadLength;
  const payload = Buffer.from(bytes.subarray(FRAME_HEADER_LENGTH, payloadEnd));
  const authenticationTag = type === CLASSICAL_MESSAGE
    ? Buffer.from(bytes.subarray(payloadEnd))
    : undefined;
  return { type, sequence, payload, authenticationTag };
}

export function encodeBootstrap(sequence: number, payload: Buffer): Buffer {
  return encodeFrame({ type: BOOTSTRAP_MESSAGE, sequence, payload });
}

export function encodeClassical(
  sequence: number,
  payload: Buffer,
  authenticationTag: Buffer
): Buffer {
  return encodeFrame({ type: CLASSICAL_MESSAGE, sequence, payload, authenticationTag });
}

export function frameHmacInput(frame: Frame | FrameInput): Buffer {
  const type = resolveMessageType(frame);
  const sequence = resolveSequence(frame);
  const payload = assertBuffer(frame.payload, 'payload');
  return Buffer.concat([encodeHeader(type, sequence, payload.length), payload]);
}

export function computeHmac(key: Buffer, data: Buffer): Buffer {
  const keyBuffer = assertBuffer(key, 'key');
  const dataBuffer = assertBuffer(data, 'data');
  return crypto.createHmac('sha256', keyBuffer).update(dataBuffer).digest();
}

export function constantTimeEqual(left: Buffer, right: Buffer): boolean {
  const leftBuffer = assertBuffer(left, 'left');
  const rightBuffer = assertBuffer(right, 'right');
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyHmac(key: Buffer, data: Buffer, tag: Buffer): boolean {
  return constantTimeEqual(computeHmac(key, data), tag);
}

export function computeAuthenticationTag(key: Buffer, frame: Frame | FrameInput): Buffer {
  assertKey(key);
  return computeHmac(key, frameHmacInput(frame));
}

export function signFrame(key: Buffer, frame: FrameInput): Frame {
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

export function verifyFrameAuthentication(
  key: Buffer,
  frame: Frame | FrameInput | Buffer | Uint8Array
): boolean {
  assertKey(key);
  let parsed: Frame;
  try {
    parsed = Buffer.isBuffer(frame) || frame instanceof Uint8Array
      ? decodeFrame(frame)
      : frame as Frame;
  } catch {
    return false;
  }
  if (parsed.type !== CLASSICAL_MESSAGE || parsed.authenticationTag === undefined) {
    return false;
  }
  return constantTimeEqual(computeAuthenticationTag(key, parsed), parsed.authenticationTag);
}

export function hkdfExtract(ikm: Buffer, salt: Buffer = DEFAULT_SALT): Buffer {
  const ikmBuffer = assertBuffer(ikm, 'ikm');
  const saltBuffer = assertBuffer(salt, 'salt');
  return crypto.createHmac('sha256', saltBuffer).update(ikmBuffer).digest();
}

export function hkdfExpand(prk: Buffer, info: Buffer, length = 32): Buffer {
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

export function hkdfSha256(
  ikm: Buffer,
  salt: Buffer = DEFAULT_SALT,
  info: Buffer = Buffer.alloc(0),
  length = 32
): Buffer {
  return hkdfExpand(hkdfExtract(ikm, salt), info, length);
}

export const hkdf = hkdfSha256;

export function deriveDirectionalKey(
  ikm: Buffer,
  direction: Direction,
  contextHash: Buffer,
  salt: Buffer = DEFAULT_SALT
): Buffer {
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

export function deriveDirectionalKeys(
  ikmOrInput: Buffer | DirectionalKeyDerivationInput,
  contextHashOrSalt?: Buffer,
  salt?: Buffer
): DirectionalKeys {
  let ikm: Buffer;
  let contextHash: Buffer;
  let resolvedSalt: Buffer | undefined;
  if (Buffer.isBuffer(ikmOrInput)) {
    ikm = ikmOrInput;
    contextHash = contextHashOrSalt as Buffer;
    resolvedSalt = salt;
  } else {
    ikm = ikmOrInput.ikm;
    contextHash = ikmOrInput.contextHash;
    resolvedSalt = ikmOrInput.salt;
  }
  return {
    K_enc_A2B: deriveDirectionalKey(ikm, 'A2B', contextHash, resolvedSalt),
    K_enc_B2A: deriveDirectionalKey(ikm, 'B2A', contextHash, resolvedSalt)
  };
}

export function deriveDirectionalKeysFrom(input: DirectionalKeyDerivationInput): DirectionalKeys {
  return deriveDirectionalKeys(input);
}

export function deriveDirectionalKeysWithSalt(
  ikm: Buffer,
  salt: Buffer,
  contextHash: Buffer
): DirectionalKeys {
  return deriveDirectionalKeys(ikm, contextHash, salt);
}

export function deriveNoncePrefix(
  direction: Direction,
  key: Buffer,
  contextHash: Buffer
): Buffer {
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

export function deriveNoncePrefixes(
  keys: DirectionalKeys,
  contextHash: Buffer
): DirectionalNoncePrefixes {
  return {
    A2B: deriveNoncePrefix('A2B', keys.K_enc_A2B, contextHash),
    B2A: deriveNoncePrefix('B2A', keys.K_enc_B2A, contextHash)
  };
}

export interface AeadOutput {
  nonce: Buffer;
  ciphertext: Buffer;
  authenticationTag: Buffer;
}

export class AeadReplayError extends Error {
  readonly expected: bigint;
  readonly received: bigint;

  constructor(expected: bigint, received: bigint) {
    super(`AEAD nonce mismatch: expected ${expected}, received ${received}`);
    this.name = 'AeadReplayError';
    this.expected = expected;
    this.received = received;
  }
}

export class DirectionalAead {
  private readonly key: Buffer;
  private readonly prefix: Buffer;
  private nextSequence = 0n;

  constructor(key: Buffer, contextHash: Buffer, direction: Direction) {
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

  get nextSequenceExpected(): bigint {
    return this.nextSequence;
  }

  nonceForNextSequence(): Buffer {
    return buildNonce(this.prefix, this.nextSequence);
  }

  encrypt(plaintext: Buffer, aad: Buffer = Buffer.alloc(0)): AeadOutput {
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

  decrypt(
    ciphertext: Buffer,
    authenticationTag: Buffer,
    aad: Buffer = Buffer.alloc(0),
    nonce?: Buffer
  ): Buffer {
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

export function buildNonce(prefix: Buffer, sequence64: number | bigint): Buffer {
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
  private expected = 0;
  private abortedState = false;

  get expectedNextSequence(): number {
    return this.expected;
  }

  get aborted(): boolean {
    return this.abortedState;
  }

  tryAccept(sequence: number): boolean {
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

  accept(sequence: number): boolean {
    return this.tryAccept(sequence);
  }

  verify(sequence: number): void {
    if (!this.tryAccept(sequence)) {
      throw new ProtocolAbortError(this.expected, sequence);
    }
  }
}

export class SenderSequenceRegistry {
  private readonly states = new Map<string, StrictSequenceState>();

  state(sender: string): StrictSequenceState {
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

  tryAccept(sender: string, sequence: number): boolean {
    return this.state(sender).tryAccept(sequence);
  }

  verify(sender: string, sequence: number): void {
    this.state(sender).verify(sequence);
  }

  expectedNextSequence(sender: string): number {
    return this.state(sender).expectedNextSequence;
  }
}

export function traceSequence(
  sequences: readonly number[],
  initialExpectedSequence = 0
): SequenceTraceResult {
  assertInteger(initialExpectedSequence, 'initialExpectedSequence', 0xffffffff);
  let expected = initialExpectedSequence;
  let acceptedCount = 0;
  let aborted = false;
  const outcomes: SequenceOutcome[] = [];

  for (const sequence of sequences) {
    const valid = Number.isSafeInteger(sequence) && sequence >= 0 && sequence <= 0xffffffff;
    if (valid && sequence === expected) {
      outcomes.push('A');
      acceptedCount += 1;
      expected += 1;
    } else {
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

function encodeVersion(version: number | Buffer): Buffer {
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
  readonly sid: Buffer;
  private hA: Buffer;
  private hB: Buffer;
  private context: Buffer;

  constructor(nonceA: Buffer, nonceB: Buffer, version: number | Buffer = PROTOCOL_VERSION) {
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

  private combineContext(): Buffer {
    return crypto.createHash('sha256')
      .update(this.hA)
      .update(this.hB)
      .digest();
  }

  append(role: ProtocolRole, message: Buffer): Buffer {
    const messageBuffer = assertBuffer(message, 'message');
    if (role === 'A') {
      this.hA = crypto.createHash('sha256')
        .update(this.hA)
        .update(messageBuffer)
        .digest();
    } else if (role === 'B') {
      this.hB = crypto.createHash('sha256')
        .update(this.hB)
        .update(messageBuffer)
        .digest();
    } else {
      throw new RangeError(`unsupported role: ${String(role)}`);
    }
    this.context = this.combineContext();
    return role === 'A' ? Buffer.from(this.hA) : Buffer.from(this.hB);
  }

  appendA(message: Buffer): Buffer {
    return this.append('A', message);
  }

  appendB(message: Buffer): Buffer {
    return this.append('B', message);
  }

  get ha(): Buffer {
    return Buffer.from(this.hA);
  }

  get hb(): Buffer {
    return Buffer.from(this.hB);
  }

  get hAValue(): Buffer {
    return Buffer.from(this.hA);
  }

  get hBValue(): Buffer {
    return Buffer.from(this.hB);
  }

  get contextHash(): Buffer {
    return Buffer.from(this.context);
  }

  snapshot(): TranscriptResult {
    return {
      sid: Buffer.from(this.sid),
      hA: Buffer.from(this.hA),
      hB: Buffer.from(this.hB),
      contextHash: Buffer.from(this.context)
    };
  }
}

export function initializeTranscript(
  nonceA: Buffer,
  nonceB: Buffer,
  version: number | Buffer = PROTOCOL_VERSION
): TranscriptChain {
  return new TranscriptChain(nonceA, nonceB, version);
}

export function computeTranscript(input: TranscriptInput): TranscriptResult {
  const chain = new TranscriptChain(input.nonceA, input.nonceB, input.version ?? PROTOCOL_VERSION);
  for (const message of input.messagesA ?? []) {
    chain.appendA(message);
  }
  for (const message of input.messagesB ?? []) {
    chain.appendB(message);
  }
  return chain.snapshot();
}

export function packBasis(bases: readonly number[]): number {
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
  private readonly sequences = new SenderSequenceRegistry();

  constructor(private readonly authenticationKey?: Buffer) {
    if (authenticationKey !== undefined) {
      assertKey(authenticationKey);
    }
  }

  receive(sender: string, wire: Buffer | Uint8Array): Frame {
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
