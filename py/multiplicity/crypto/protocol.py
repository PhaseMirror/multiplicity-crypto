from __future__ import annotations

import hashlib
import hmac
import struct
from dataclasses import dataclass
from typing import Literal, Optional, Sequence, Tuple, Union

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from cryptography.exceptions import InvalidTag
except ImportError:
    AESGCM = None
    InvalidTag = Exception

Bytes = bytes
Direction = Literal["A2B", "B2A"]
ProtocolRole = Literal["A", "B"]

BOOTSTRAP_MESSAGE = 1
CLASSICAL_MESSAGE = 4
MAX_PAYLOAD_LENGTH = 0xFFFF
AUTHENTICATION_TAG_LENGTH = 32
FRAME_HEADER_LENGTH = 7
PROTOCOL_VERSION = 1
VERSION = bytes([PROTOCOL_VERSION])
DEFAULT_SALT = bytes(32)
ALICE_LABEL = b"ALICE" + bytes(3)
BOB_LABEL = b"BOB" + bytes(5)


class ProtocolError(ValueError):
    pass


class ProtocolAbortError(ProtocolError):
    def __init__(self, expected: int, received: int):
        super().__init__(f"message sequence mismatch: expected {expected}, received {received}")
        self.expected = expected
        self.received = received


class AuthenticationError(ProtocolError):
    pass


class AeadBackendUnavailable(ProtocolError):
    pass


class AeadReplayError(ProtocolError):
    def __init__(self, expected: int, received: int):
        super().__init__(f"AEAD nonce mismatch: expected {expected}, received {received}")
        self.expected = expected
        self.received = received


@dataclass(frozen=True)
class Frame:
    message_type: int
    sequence: int
    payload: Bytes
    authentication_tag: Optional[Bytes] = None


@dataclass(frozen=True)
class DirectionalKeys:
    k_enc_a2b: Bytes
    k_enc_b2a: Bytes


@dataclass(frozen=True)
class DirectionalNoncePrefixes:
    a2b: Bytes
    b2a: Bytes


@dataclass(frozen=True)
class TranscriptResult:
    sid: Bytes
    h_a: Bytes
    h_b: Bytes
    context_hash: Bytes


@dataclass(frozen=True)
class AeadOutput:
    nonce: Bytes
    ciphertext: Bytes
    authentication_tag: Bytes


@dataclass(frozen=True)
class SequenceTrace:
    outcomes: Tuple[bool, ...]
    accepted_count: int
    final_next_expected_sequence: int
    aborted: bool


def _check_bytes(value: Bytes, name: str) -> Bytes:
    if not isinstance(value, bytes):
        raise TypeError(f"{name} must be bytes")
    return value


def _check_sequence(sequence: int) -> None:
    if not isinstance(sequence, int) or isinstance(sequence, bool) or not 0 <= sequence <= 0xFFFFFFFF:
        raise ValueError("sequence must be an integer between 0 and 2^32-1")


def _check_key(key: Bytes, name: str = "key") -> Bytes:
    key = _check_bytes(key, name)
    if len(key) != 32:
        raise ValueError(f"{name} must be 32 bytes")
    return key


def _validate_direction(direction: Direction) -> None:
    if direction not in ("A2B", "B2A"):
        raise ValueError(f"unsupported direction: {direction}")


def encode_header(message_type: int, sequence: int, payload_length: int) -> Bytes:
    if message_type not in (BOOTSTRAP_MESSAGE, CLASSICAL_MESSAGE):
        raise ValueError(f"unsupported message type: {message_type}")
    _check_sequence(sequence)
    if not isinstance(payload_length, int) or isinstance(payload_length, bool) or not 0 <= payload_length <= MAX_PAYLOAD_LENGTH:
        raise ValueError(f"payload length must be between 0 and {MAX_PAYLOAD_LENGTH}")
    return struct.pack(">BIBH", message_type, sequence, payload_length)


def encode_frame(frame: Frame) -> Bytes:
    if frame.message_type not in (BOOTSTRAP_MESSAGE, CLASSICAL_MESSAGE):
        raise ValueError(f"unsupported message type: {frame.message_type}")
    payload = _check_bytes(frame.payload, "payload")
    if len(payload) > MAX_PAYLOAD_LENGTH:
        raise ValueError(f"payload exceeds {MAX_PAYLOAD_LENGTH} bytes")
    if frame.message_type == CLASSICAL_MESSAGE:
        if frame.authentication_tag is None:
            raise ValueError("CLASSICAL_MESSAGE requires authentication_tag")
        tag = _check_bytes(frame.authentication_tag, "authentication_tag")
        if len(tag) != AUTHENTICATION_TAG_LENGTH:
            raise ValueError(f"authentication_tag must be {AUTHENTICATION_TAG_LENGTH} bytes")
    else:
        if frame.authentication_tag is not None:
            raise ValueError("BOOTSTRAP_MESSAGE cannot contain authentication_tag")
        tag = b""
    return encode_header(frame.message_type, frame.sequence, len(payload)) + payload + tag


def encode_bootstrap(sequence: int, payload: Bytes) -> Bytes:
    return encode_frame(Frame(BOOTSTRAP_MESSAGE, sequence, _check_bytes(payload, "payload")))


def encode_classical(sequence: int, payload: Bytes, authentication_tag: Bytes) -> Bytes:
    return encode_frame(
        Frame(
            CLASSICAL_MESSAGE,
            sequence,
            _check_bytes(payload, "payload"),
            _check_bytes(authentication_tag, "authentication_tag"),
        )
    )


def decode_frame(wire: Bytes) -> Frame:
    wire = _check_bytes(wire, "wire frame")
    if len(wire) < FRAME_HEADER_LENGTH:
        raise ValueError("frame is shorter than its header")
    message_type = wire[0]
    if message_type not in (BOOTSTRAP_MESSAGE, CLASSICAL_MESSAGE):
        raise ValueError(f"unsupported message type: {message_type}")
    sequence = struct.unpack_from(">I", wire, 1)[0]
    declared = struct.unpack_from(">H", wire, 5)[0]
    tag_length = AUTHENTICATION_TAG_LENGTH if message_type == CLASSICAL_MESSAGE else 0
    expected_length = FRAME_HEADER_LENGTH + declared + tag_length
    if len(wire) != expected_length:
        actual = len(wire) - FRAME_HEADER_LENGTH - tag_length
        raise ValueError(f"payload length mismatch: header declares {declared}, actual is {actual}")
    payload_end = FRAME_HEADER_LENGTH + declared
    tag = wire[payload_end:] if tag_length else None
    return Frame(message_type, sequence, wire[FRAME_HEADER_LENGTH:payload_end], tag)


def frame_hmac_input(frame: Frame) -> Bytes:
    return encode_header(frame.message_type, frame.sequence, len(frame.payload)) + frame.payload


def compute_hmac(key: Bytes, data: Bytes) -> Bytes:
    return hmac.new(_check_key(key), _check_bytes(data, "data"), hashlib.sha256).digest()


def constant_time_equal(left: Bytes, right: Bytes) -> bool:
    left = _check_bytes(left, "left")
    right = _check_bytes(right, "right")
    return hmac.compare_digest(left, right)


def verify_hmac(key: Bytes, data: Bytes, tag: Bytes) -> bool:
    tag = _check_bytes(tag, "tag")
    return len(tag) == AUTHENTICATION_TAG_LENGTH and constant_time_equal(compute_hmac(key, data), tag)


def compute_authentication_tag(key: Bytes, frame: Frame) -> Bytes:
    _check_key(key)
    if frame.message_type != CLASSICAL_MESSAGE:
        raise ValueError("only CLASSICAL_MESSAGE frames can be signed")
    return compute_hmac(key, frame_hmac_input(frame))


def sign_frame(key: Bytes, frame: Frame) -> Frame:
    _check_key(key)
    if frame.message_type != CLASSICAL_MESSAGE:
        raise ValueError("only CLASSICAL_MESSAGE frames can be signed")
    return Frame(
        frame.message_type,
        frame.sequence,
        frame.payload,
        compute_authentication_tag(key, frame),
    )


def verify_frame_authentication(key: Bytes, frame: Union[Frame, Bytes]) -> bool:
    _check_key(key)
    if isinstance(frame, bytes):
        try:
            frame = decode_frame(frame)
        except ProtocolError:
            return False
    if frame.message_type != CLASSICAL_MESSAGE or frame.authentication_tag is None:
        return False
    return verify_hmac(key, frame_hmac_input(frame), frame.authentication_tag)


def hkdf_extract(ikm: Bytes, salt: Bytes = DEFAULT_SALT) -> Bytes:
    return compute_hmac(_check_bytes(salt, "salt"), _check_bytes(ikm, "ikm"))


def hkdf_expand(prk: Bytes, info: Bytes, length: int = 32) -> Bytes:
    prk = _check_bytes(prk, "prk")
    info = _check_bytes(info, "info")
    if not isinstance(length, int) or isinstance(length, bool) or not 1 <= length <= 32 * 255 or not prk:
        raise ValueError("HKDF output length must be between 1 and 8160 bytes and PRK must be non-empty")
    output = bytearray()
    previous = b""
    counter = 1
    while len(output) < length:
        previous = hmac.new(prk, previous + info + bytes([counter]), hashlib.sha256).digest()
        output.extend(previous[: length - len(output)])
        counter += 1
    return bytes(output)


def hkdf_sha256(ikm: Bytes, salt: Bytes, info: Bytes, length: int = 32) -> Bytes:
    return hkdf_expand(hkdf_extract(ikm, salt), info, length)


def derive_directional_key(
    ikm: Bytes,
    direction: Direction,
    context_hash: Bytes,
    salt: Bytes = DEFAULT_SALT,
) -> Bytes:
    ikm = _check_key(ikm, "ikm")
    context_hash = _check_bytes(context_hash, "context_hash")
    if len(context_hash) != 32:
        raise ValueError("context_hash must be 32 bytes")
    _validate_direction(direction)
    prefix = b"AEAD-ENC-A2B" if direction == "A2B" else b"AEAD-ENC-B2A"
    label = ALICE_LABEL if direction == "A2B" else BOB_LABEL
    return hkdf_sha256(ikm, salt, prefix + label + context_hash, 32)


def derive_directional_keys(
    ikm: Bytes,
    context_hash: Bytes,
    salt: Bytes = DEFAULT_SALT,
) -> DirectionalKeys:
    return DirectionalKeys(
        derive_directional_key(ikm, "A2B", context_hash, salt),
        derive_directional_key(ikm, "B2A", context_hash, salt),
    )


def derive_nonce_prefix(direction: Direction, key: Bytes, context_hash: Bytes) -> Bytes:
    key = _check_key(key)
    context_hash = _check_bytes(context_hash, "context_hash")
    if len(context_hash) != 32:
        raise ValueError("context_hash must be 32 bytes")
    _validate_direction(direction)
    prefix = b"IVPFX-A2B" if direction == "A2B" else b"IVPFX-B2A"
    return hashlib.sha256(prefix + key + context_hash).digest()[:4]


def derive_nonce_prefixes(keys: DirectionalKeys, context_hash: Bytes) -> DirectionalNoncePrefixes:
    return DirectionalNoncePrefixes(
        derive_nonce_prefix("A2B", keys.k_enc_a2b, context_hash),
        derive_nonce_prefix("B2A", keys.k_enc_b2a, context_hash),
    )


def build_nonce(prefix: Bytes, sequence: int) -> Bytes:
    prefix = _check_bytes(prefix, "prefix")
    if len(prefix) != 4:
        raise ValueError("nonce prefix must be 4 bytes")
    if not isinstance(sequence, int) or isinstance(sequence, bool) or not 0 <= sequence <= 0xFFFFFFFFFFFFFFFF:
        raise ValueError("seq64 must be between 0 and 2^64-1")
    return prefix + struct.pack(">Q", sequence)


def sha256(data: Bytes) -> Bytes:
    return hashlib.sha256(_check_bytes(data, "data")).digest()


def session_id(nonce_a: Bytes, nonce_b: Bytes) -> Bytes:
    return sha256(_check_bytes(nonce_a, "nonce_a") + _check_bytes(nonce_b, "nonce_b"))


class StrictSequenceState:
    def __init__(self) -> None:
        self.expected_next_sequence = 0
        self.aborted = False

    def try_accept(self, sequence: int) -> bool:
        if not isinstance(sequence, int) or isinstance(sequence, bool) or not 0 <= sequence <= 0xFFFFFFFF:
            self.aborted = True
            return False
        if self.aborted or sequence != self.expected_next_sequence:
            self.aborted = True
            return False
        self.expected_next_sequence += 1
        return True

    def accept(self, sequence: int) -> None:
        if not self.try_accept(sequence):
            raise ProtocolAbortError(self.expected_next_sequence, sequence)


class SenderSequenceRegistry:
    def __init__(self) -> None:
        self._states = {}

    def state(self, sender: str) -> StrictSequenceState:
        if not sender:
            raise ValueError("sender must not be empty")
        state = self._states.get(sender)
        if state is None:
            state = StrictSequenceState()
            self._states[sender] = state
        return state

    def try_accept(self, sender: str, sequence: int) -> bool:
        return self.state(sender).try_accept(sequence)

    def accept(self, sender: str, sequence: int) -> None:
        self.state(sender).accept(sequence)


def trace_sequence(sequences: Sequence[int]) -> SequenceTrace:
    expected = 0
    accepted_count = 0
    aborted = False
    outcomes = []
    for sequence in sequences:
        valid = isinstance(sequence, int) and not isinstance(sequence, bool) and 0 <= sequence <= 0xFFFFFFFF
        if valid and sequence == expected:
            outcomes.append(True)
            accepted_count += 1
            expected += 1
        else:
            outcomes.append(False)
            aborted = True
    return SequenceTrace(tuple(outcomes), accepted_count, expected, aborted)


class TranscriptChain:
    def __init__(self, nonce_a: Bytes, nonce_b: Bytes, version: Bytes = VERSION):
        self.sid = session_id(nonce_a, nonce_b)
        version = _check_bytes(version, "version")
        self._h_a = sha256(version + self.sid + ALICE_LABEL)
        self._h_b = sha256(version + self.sid + BOB_LABEL)

    @property
    def h_a(self) -> Bytes:
        return self._h_a

    @property
    def h_b(self) -> Bytes:
        return self._h_b

    def append(self, role: ProtocolRole, message: Bytes) -> Bytes:
        message = _check_bytes(message, "message")
        if role == "A":
            self._h_a = sha256(self._h_a + message)
            return self._h_a
        if role == "B":
            self._h_b = sha256(self._h_b + message)
            return self._h_b
        raise ValueError(f"unsupported role: {role}")

    def context_hash(self) -> Bytes:
        return sha256(self._h_a + self._h_b)

    def snapshot(self) -> TranscriptResult:
        return TranscriptResult(self.sid, self._h_a, self._h_b, self.context_hash())


def pack_basis(values: Sequence[int]) -> int:
    if len(values) != 4:
        raise ValueError("basis vector must contain exactly four values")
    packed = 0
    for index, value in enumerate(values):
        if not isinstance(value, int) or isinstance(value, bool) or not 0 <= value <= 3:
            raise ValueError("basis values must be between 0 and 3")
        packed |= value << (index * 2)
    return packed


class DirectionalAead:
    def __init__(self, key: Bytes, context_hash: Bytes, direction: Direction):
        if AESGCM is None:
            raise AeadBackendUnavailable("cryptography AESGCM backend is unavailable")
        self._key = _check_key(key)
        context_hash = _check_bytes(context_hash, "context_hash")
        if len(context_hash) != 32:
            raise ValueError("context_hash must be 32 bytes")
        _validate_direction(direction)
        self._prefix = derive_nonce_prefix(direction, self._key, context_hash)
        self._backend = AESGCM(self._key)
        self._next_sequence = 0

    @property
    def next_sequence_expected(self) -> int:
        return self._next_sequence

    def nonce_for_next_sequence(self) -> Bytes:
        return build_nonce(self._prefix, self._next_sequence)

    def encrypt(self, plaintext: Bytes, aad: Bytes = b"") -> AeadOutput:
        plaintext = _check_bytes(plaintext, "plaintext")
        aad = _check_bytes(aad, "aad")
        if self._next_sequence > 0xFFFFFFFFFFFFFFFF:
            raise ValueError("directional AEAD nonce exhausted")
        nonce = self.nonce_for_next_sequence()
        ciphertext_and_tag = self._backend.encrypt(nonce, plaintext, aad)
        ciphertext, tag = ciphertext_and_tag[:-16], ciphertext_and_tag[-16:]
        self._next_sequence += 1
        return AeadOutput(nonce, ciphertext, tag)

    def decrypt(
        self,
        ciphertext: Bytes,
        authentication_tag: Bytes,
        aad: Bytes = b"",
        nonce: Optional[Bytes] = None,
    ) -> Bytes:
        ciphertext = _check_bytes(ciphertext, "ciphertext")
        authentication_tag = _check_bytes(authentication_tag, "authentication_tag")
        aad = _check_bytes(aad, "aad")
        if len(authentication_tag) != 16:
            raise ValueError("AES-256-GCM authentication_tag must be 16 bytes")
        expected_nonce = self.nonce_for_next_sequence()
        received_nonce = expected_nonce if nonce is None else _check_bytes(nonce, "nonce")
        if nonce is not None and received_nonce != expected_nonce:
            expected = struct.unpack(">Q", expected_nonce[4:])[0]
            received = struct.unpack(">Q", received_nonce[4:])[0]
            raise AeadReplayError(expected, received)
        try:
            plaintext = self._backend.decrypt(expected_nonce, ciphertext + authentication_tag, aad)
        except InvalidTag as exc:
            raise AuthenticationError("AEAD authentication failed") from exc
        self._next_sequence += 1
        return plaintext


class ProtocolReceiver:
    def __init__(self, authentication_key: Optional[Bytes] = None):
        self._authentication_key = None if authentication_key is None else _check_key(authentication_key)
        self._sequences = SenderSequenceRegistry()

    def receive(self, sender: str, wire: Bytes) -> Frame:
        frame = decode_frame(wire)
        if frame.message_type == CLASSICAL_MESSAGE:
            if self._authentication_key is None:
                raise AuthenticationError("authentication key is not configured")
            if not verify_frame_authentication(self._authentication_key, frame):
                raise AuthenticationError("frame authentication failed")
        self._sequences.accept(sender, frame.sequence)
        return frame


__all__ = [
    "BOOTSTRAP_MESSAGE",
    "CLASSICAL_MESSAGE",
    "MAX_PAYLOAD_LENGTH",
    "AUTHENTICATION_TAG_LENGTH",
    "FRAME_HEADER_LENGTH",
    "PROTOCOL_VERSION",
    "VERSION",
    "DEFAULT_SALT",
    "ALICE_LABEL",
    "BOB_LABEL",
    "ProtocolError",
    "ProtocolAbortError",
    "AuthenticationError",
    "AeadBackendUnavailable",
    "AeadReplayError",
    "Frame",
    "DirectionalKeys",
    "DirectionalNoncePrefixes",
    "TranscriptResult",
    "AeadOutput",
    "SequenceTrace",
    "encode_header",
    "encode_frame",
    "encode_bootstrap",
    "encode_classical",
    "decode_frame",
    "frame_hmac_input",
    "compute_hmac",
    "constant_time_equal",
    "verify_hmac",
    "compute_authentication_tag",
    "sign_frame",
    "verify_frame_authentication",
    "hkdf_extract",
    "hkdf_expand",
    "hkdf_sha256",
    "derive_directional_key",
    "derive_directional_keys",
    "derive_nonce_prefix",
    "derive_nonce_prefixes",
    "build_nonce",
    "sha256",
    "session_id",
    "StrictSequenceState",
    "SenderSequenceRegistry",
    "trace_sequence",
    "TranscriptChain",
    "pack_basis",
    "DirectionalAead",
    "ProtocolReceiver",
]
