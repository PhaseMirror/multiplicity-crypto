use aes_gcm::aead::{Aead, KeyInit, Payload};
use aes_gcm::{Aes256Gcm, Nonce};
use hmac::{Hmac, Mac};
use sha2::{Digest, Sha256};
use std::fmt;

pub const BOOTSTRAP_MESSAGE: u8 = 1;
pub const CLASSICAL_MESSAGE: u8 = 4;
pub const MAX_PAYLOAD_LENGTH: usize = 0xffff;
pub const AUTHENTICATION_TAG_LENGTH: usize = 32;
pub const FRAME_HEADER_LENGTH: usize = 7;
pub const PROTOCOL_VERSION: u8 = 1;
pub const VERSION: &[u8] = &[PROTOCOL_VERSION];
pub const DEFAULT_SALT: [u8; 32] = [0; 32];
pub const ALICE_LABEL: &[u8; 8] = b"ALICE\0\0\0";
pub const BOB_LABEL: &[u8; 8] = b"BOB\0\0\0\0\0";

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Direction {
    A2B,
    B2A,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ProtocolRole {
    A,
    B,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Frame {
    pub message_type: u8,
    pub sequence: u32,
    pub payload: Vec<u8>,
    pub authentication_tag: Option<[u8; AUTHENTICATION_TAG_LENGTH]>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DirectionalKeys {
    pub k_enc_a2b: [u8; 32],
    pub k_enc_b2a: [u8; 32],
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DirectionalNoncePrefixes {
    pub a2b: [u8; 4],
    pub b2a: [u8; 4],
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TranscriptResult {
    pub sid: [u8; 32],
    pub h_a: [u8; 32],
    pub h_b: [u8; 32],
    pub context_hash: [u8; 32],
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ProtocolError {
    InvalidInput(&'static str),
    FrameTooShort,
    UnsupportedMessageType(u8),
    PayloadTooLarge,
    LengthMismatch { declared: usize, actual: usize },
    AuthenticationRequired,
    AuthenticationFailed,
    SequenceMismatch { expected: u32, received: u32 },
    SessionAborted,
    AeadFailed,
}

impl fmt::Display for ProtocolError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidInput(message) => write!(formatter, "invalid input: {message}"),
            Self::FrameTooShort => write!(formatter, "frame is shorter than its header"),
            Self::UnsupportedMessageType(message_type) => {
                write!(formatter, "unsupported message type: {message_type}")
            }
            Self::PayloadTooLarge => {
                write!(formatter, "payload exceeds {MAX_PAYLOAD_LENGTH} bytes")
            }
            Self::LengthMismatch { declared, actual } => write!(
                formatter,
                "payload length mismatch: header declares {declared}, actual is {actual}"
            ),
            Self::AuthenticationRequired => write!(formatter, "authentication key is required"),
            Self::AuthenticationFailed => write!(formatter, "frame authentication failed"),
            Self::SequenceMismatch { expected, received } => write!(
                formatter,
                "message sequence mismatch: expected {expected}, received {received}"
            ),
            Self::SessionAborted => write!(formatter, "session is aborted"),
            Self::AeadFailed => write!(formatter, "AEAD operation failed"),
        }
    }
}

impl std::error::Error for ProtocolError {}

#[derive(Clone, Debug)]
pub struct StrictSequenceState {
    pub expected_next_sequence: u32,
    pub aborted: bool,
}

impl Default for StrictSequenceState {
    fn default() -> Self {
        Self {
            expected_next_sequence: 0,
            aborted: false,
        }
    }
}

impl StrictSequenceState {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn try_accept(&mut self, sequence: u32) -> bool {
        if self.aborted || sequence != self.expected_next_sequence {
            self.aborted = true;
            return false;
        }
        self.expected_next_sequence = self.expected_next_sequence.saturating_add(1);
        true
    }

    pub fn accept(&mut self, sequence: u32) -> Result<(), ProtocolError> {
        if !self.try_accept(sequence) {
            return Err(ProtocolError::SequenceMismatch {
                expected: self.expected_next_sequence,
                received: sequence,
            });
        }
        Ok(())
    }
}

#[derive(Clone, Debug, Default)]
pub struct SenderSequenceRegistry {
    states: std::collections::HashMap<String, StrictSequenceState>,
}

impl SenderSequenceRegistry {
    pub fn state(&mut self, sender: &str) -> &mut StrictSequenceState {
        self.states
            .entry(sender.to_owned())
            .or_insert_with(StrictSequenceState::new)
    }

    pub fn try_accept(&mut self, sender: &str, sequence: u32) -> bool {
        self.state(sender).try_accept(sequence)
    }

    pub fn accept(&mut self, sender: &str, sequence: u32) -> Result<(), ProtocolError> {
        self.state(sender).accept(sequence)
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SequenceTrace {
    pub outcomes: Vec<bool>,
    pub accepted_count: usize,
    pub final_next_expected_sequence: u32,
    pub aborted: bool,
}

pub fn trace_sequence(sequences: &[u32]) -> SequenceTrace {
    let mut expected = 0u32;
    let mut accepted_count = 0usize;
    let mut aborted = false;
    let mut outcomes = Vec::with_capacity(sequences.len());

    for sequence in sequences {
        if *sequence == expected {
            outcomes.push(true);
            accepted_count += 1;
            expected = expected.saturating_add(1);
        } else {
            outcomes.push(false);
            aborted = true;
        }
    }

    SequenceTrace {
        outcomes,
        accepted_count,
        final_next_expected_sequence: expected,
        aborted,
    }
}

pub fn encode_header(
    message_type: u8,
    sequence: u32,
    payload_length: usize,
) -> Result<[u8; FRAME_HEADER_LENGTH], ProtocolError> {
    if message_type != BOOTSTRAP_MESSAGE && message_type != CLASSICAL_MESSAGE {
        return Err(ProtocolError::UnsupportedMessageType(message_type));
    }
    if payload_length > MAX_PAYLOAD_LENGTH {
        return Err(ProtocolError::PayloadTooLarge);
    }
    let length = payload_length as u16;
    Ok([
        message_type,
        (sequence >> 24) as u8,
        (sequence >> 16) as u8,
        (sequence >> 8) as u8,
        sequence as u8,
        (length >> 8) as u8,
        length as u8,
    ])
}

pub fn encode_frame(frame: &Frame) -> Result<Vec<u8>, ProtocolError> {
    if frame.message_type != BOOTSTRAP_MESSAGE && frame.message_type != CLASSICAL_MESSAGE {
        return Err(ProtocolError::UnsupportedMessageType(frame.message_type));
    }
    if frame.payload.len() > MAX_PAYLOAD_LENGTH {
        return Err(ProtocolError::PayloadTooLarge);
    }
    let tag = match (frame.message_type, frame.authentication_tag) {
        (CLASSICAL_MESSAGE, Some(tag)) => tag,
        (CLASSICAL_MESSAGE, None) => {
            return Err(ProtocolError::InvalidInput(
                "CLASSICAL_MESSAGE requires authentication_tag",
            ))
        }
        (BOOTSTRAP_MESSAGE, Some(_)) => {
            return Err(ProtocolError::InvalidInput(
                "BOOTSTRAP_MESSAGE cannot contain authentication_tag",
            ))
        }
        (BOOTSTRAP_MESSAGE, None) => {
            let mut wire = Vec::with_capacity(FRAME_HEADER_LENGTH + frame.payload.len());
            wire.extend_from_slice(&encode_header(
                frame.message_type,
                frame.sequence,
                frame.payload.len(),
            )?);
            wire.extend_from_slice(&frame.payload);
            return Ok(wire);
        }
        _ => return Err(ProtocolError::UnsupportedMessageType(frame.message_type)),
    };

    let mut wire =
        Vec::with_capacity(FRAME_HEADER_LENGTH + frame.payload.len() + AUTHENTICATION_TAG_LENGTH);
    wire.extend_from_slice(&encode_header(
        frame.message_type,
        frame.sequence,
        frame.payload.len(),
    )?);
    wire.extend_from_slice(&frame.payload);
    wire.extend_from_slice(&tag);
    Ok(wire)
}

pub fn decode_frame(wire: &[u8]) -> Result<Frame, ProtocolError> {
    if wire.len() < FRAME_HEADER_LENGTH {
        return Err(ProtocolError::FrameTooShort);
    }
    let message_type = wire[0];
    if message_type != BOOTSTRAP_MESSAGE && message_type != CLASSICAL_MESSAGE {
        return Err(ProtocolError::UnsupportedMessageType(message_type));
    }
    let sequence = u32::from_be_bytes([wire[1], wire[2], wire[3], wire[4]]);
    let declared = u16::from_be_bytes([wire[5], wire[6]]) as usize;
    let tag_length = if message_type == CLASSICAL_MESSAGE {
        AUTHENTICATION_TAG_LENGTH
    } else {
        0
    };
    let expected_length = FRAME_HEADER_LENGTH + declared + tag_length;
    if wire.len() != expected_length {
        let actual = wire.len().saturating_sub(FRAME_HEADER_LENGTH + tag_length);
        return Err(ProtocolError::LengthMismatch { declared, actual });
    }
    let payload_end = FRAME_HEADER_LENGTH + declared;
    let authentication_tag = if message_type == CLASSICAL_MESSAGE {
        Some(
            wire[payload_end..]
                .try_into()
                .map_err(|_| ProtocolError::InvalidInput("invalid authentication tag"))?,
        )
    } else {
        None
    };
    Ok(Frame {
        message_type,
        sequence,
        payload: wire[FRAME_HEADER_LENGTH..payload_end].to_vec(),
        authentication_tag,
    })
}

pub fn frame_hmac_input(frame: &Frame) -> Result<Vec<u8>, ProtocolError> {
    let mut input =
        encode_header(frame.message_type, frame.sequence, frame.payload.len())?.to_vec();
    input.extend_from_slice(&frame.payload);
    Ok(input)
}

pub fn hmac_sha256(key: &[u8], data: &[u8]) -> [u8; 32] {
    let mut mac =
        <Hmac<Sha256> as Mac>::new_from_slice(key).expect("HMAC accepts keys of any length");
    mac.update(data);
    mac.finalize().into_bytes().into()
}

pub fn verify_hmac(key: &[u8], data: &[u8], tag: &[u8]) -> bool {
    if tag.len() != AUTHENTICATION_TAG_LENGTH {
        return false;
    }
    let expected = hmac_sha256(key, data);
    let mut difference = 0u8;
    for (left, right) in expected.iter().zip(tag) {
        difference |= left ^ right;
    }
    difference == 0
}

pub fn sign_frame(key: &[u8], frame: &Frame) -> Result<Frame, ProtocolError> {
    if key.len() != 32 {
        return Err(ProtocolError::InvalidInput(
            "authentication key must be 32 bytes",
        ));
    }
    if frame.message_type != CLASSICAL_MESSAGE {
        return Err(ProtocolError::InvalidInput(
            "only CLASSICAL_MESSAGE frames can be signed",
        ));
    }
    let tag = hmac_sha256(key, &frame_hmac_input(frame)?);
    Ok(Frame {
        message_type: frame.message_type,
        sequence: frame.sequence,
        payload: frame.payload.clone(),
        authentication_tag: Some(tag),
    })
}

pub fn verify_frame_authentication(key: &[u8], frame: &Frame) -> Result<bool, ProtocolError> {
    if key.len() != 32 {
        return Err(ProtocolError::InvalidInput(
            "authentication key must be 32 bytes",
        ));
    }
    let Some(tag) = frame.authentication_tag else {
        return Ok(false);
    };
    if frame.message_type != CLASSICAL_MESSAGE {
        return Ok(false);
    }
    Ok(verify_hmac(key, &frame_hmac_input(frame)?, &tag))
}

pub fn hkdf_extract(ikm: &[u8], salt: &[u8]) -> [u8; 32] {
    hmac_sha256(salt, ikm)
}

pub fn hkdf_expand(prk: &[u8], info: &[u8], length: usize) -> Result<Vec<u8>, ProtocolError> {
    if length == 0 || length > 32 * 255 || prk.is_empty() {
        return Err(ProtocolError::InvalidInput(
            "invalid HKDF output length or PRK",
        ));
    }
    let mut output = Vec::with_capacity(length);
    let mut previous = Vec::new();
    let mut counter = 1u8;
    while output.len() < length {
        let mut mac = <Hmac<Sha256> as Mac>::new_from_slice(prk)
            .map_err(|_| ProtocolError::InvalidInput("invalid PRK"))?;
        mac.update(&previous);
        mac.update(info);
        mac.update(&[counter]);
        previous = mac.finalize().into_bytes().to_vec();
        let remaining = length - output.len();
        output.extend_from_slice(&previous[..remaining.min(previous.len())]);
        counter = counter
            .checked_add(1)
            .ok_or(ProtocolError::InvalidInput("HKDF counter overflow"))?;
    }
    Ok(output)
}

pub fn hkdf_sha256(
    ikm: &[u8],
    salt: &[u8],
    info: &[u8],
    length: usize,
) -> Result<Vec<u8>, ProtocolError> {
    hkdf_expand(&hkdf_extract(ikm, salt), info, length)
}

pub fn derive_directional_key(
    ikm: &[u8],
    direction: &Direction,
    context_hash: &[u8; 32],
    salt: &[u8],
) -> Result<[u8; 32], ProtocolError> {
    if ikm.len() != 32 {
        return Err(ProtocolError::InvalidInput("IKM must be 32 bytes"));
    }
    let (prefix, label) = match direction {
        Direction::A2B => (b"AEAD-ENC-A2B".as_slice(), ALICE_LABEL.as_slice()),
        Direction::B2A => (b"AEAD-ENC-B2A".as_slice(), BOB_LABEL.as_slice()),
    };
    let mut info = Vec::with_capacity(prefix.len() + label.len() + context_hash.len());
    info.extend_from_slice(prefix);
    info.extend_from_slice(label);
    info.extend_from_slice(context_hash);
    let output = hkdf_sha256(ikm, salt, &info, 32)?;
    Ok(output.try_into().expect("HKDF output is 32 bytes"))
}

pub fn derive_directional_keys(
    ikm: &[u8],
    context_hash: &[u8; 32],
    salt: &[u8],
) -> Result<DirectionalKeys, ProtocolError> {
    Ok(DirectionalKeys {
        k_enc_a2b: derive_directional_key(ikm, &Direction::A2B, context_hash, salt)?,
        k_enc_b2a: derive_directional_key(ikm, &Direction::B2A, context_hash, salt)?,
    })
}

pub fn derive_nonce_prefix(
    direction: &Direction,
    key: &[u8; 32],
    context_hash: &[u8; 32],
) -> [u8; 4] {
    let prefix = match direction {
        Direction::A2B => b"IVPFX-A2B".as_slice(),
        Direction::B2A => b"IVPFX-B2A".as_slice(),
    };
    let mut hasher = Sha256::new();
    hasher.update(prefix);
    hasher.update(key);
    hasher.update(context_hash);
    let digest = hasher.finalize();
    digest[..4]
        .try_into()
        .expect("digest has at least four bytes")
}

pub fn derive_nonce_prefixes(
    keys: &DirectionalKeys,
    context_hash: &[u8; 32],
) -> DirectionalNoncePrefixes {
    DirectionalNoncePrefixes {
        a2b: derive_nonce_prefix(&Direction::A2B, &keys.k_enc_a2b, context_hash),
        b2a: derive_nonce_prefix(&Direction::B2A, &keys.k_enc_b2a, context_hash),
    }
}

pub fn build_nonce(prefix: [u8; 4], sequence: u64) -> [u8; 12] {
    let mut nonce = [0u8; 12];
    nonce[..4].copy_from_slice(&prefix);
    nonce[4..].copy_from_slice(&sequence.to_be_bytes());
    nonce
}

pub fn sha256(data: &[u8]) -> [u8; 32] {
    Sha256::digest(data).into()
}

pub fn session_id(nonce_a: &[u8], nonce_b: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(nonce_a);
    hasher.update(nonce_b);
    hasher.finalize().into()
}

#[derive(Clone, Debug)]
pub struct TranscriptChain {
    sid: [u8; 32],
    h_a: [u8; 32],
    h_b: [u8; 32],
}

impl TranscriptChain {
    pub fn new(nonce_a: &[u8], nonce_b: &[u8], version: &[u8]) -> Self {
        let sid = session_id(nonce_a, nonce_b);
        let mut a_hasher = Sha256::new();
        a_hasher.update(version);
        a_hasher.update(sid);
        a_hasher.update(ALICE_LABEL);
        let mut b_hasher = Sha256::new();
        b_hasher.update(version);
        b_hasher.update(sid);
        b_hasher.update(BOB_LABEL);
        Self {
            sid,
            h_a: a_hasher.finalize().into(),
            h_b: b_hasher.finalize().into(),
        }
    }

    pub fn append(&mut self, role: &ProtocolRole, message: &[u8]) -> [u8; 32] {
        match role {
            ProtocolRole::A => {
                let mut hasher = Sha256::new();
                hasher.update(self.h_a);
                hasher.update(message);
                self.h_a = hasher.finalize().into();
                self.h_a
            }
            ProtocolRole::B => {
                let mut hasher = Sha256::new();
                hasher.update(self.h_b);
                hasher.update(message);
                self.h_b = hasher.finalize().into();
                self.h_b
            }
        }
    }

    pub fn context_hash(&self) -> [u8; 32] {
        let mut hasher = Sha256::new();
        hasher.update(self.h_a);
        hasher.update(self.h_b);
        hasher.finalize().into()
    }

    pub fn snapshot(&self) -> TranscriptResult {
        TranscriptResult {
            sid: self.sid,
            h_a: self.h_a,
            h_b: self.h_b,
            context_hash: self.context_hash(),
        }
    }
}

pub fn pack_basis(bases: &[u8; 4]) -> Result<u8, ProtocolError> {
    if bases.iter().any(|basis| *basis > 3) {
        return Err(ProtocolError::InvalidInput(
            "basis values must be between 0 and 3",
        ));
    }
    Ok(bases
        .iter()
        .enumerate()
        .fold(0u8, |packed, (index, basis)| {
            packed | (basis << (index * 2))
        }))
}

pub struct DirectionalCipher {
    key: [u8; 32],
    prefix: [u8; 4],
    next_sequence: u64,
}

impl DirectionalCipher {
    pub fn new(key: [u8; 32], context_hash: [u8; 32], direction: &Direction) -> Self {
        Self {
            prefix: derive_nonce_prefix(direction, &key, &context_hash),
            key,
            next_sequence: 0,
        }
    }

    pub fn next_sequence(&self) -> u64 {
        self.next_sequence
    }

    pub fn encrypt(&mut self, plaintext: &[u8], aad: &[u8]) -> Result<Vec<u8>, ProtocolError> {
        if self.next_sequence == u64::MAX {
            return Err(ProtocolError::InvalidInput("directional nonce exhausted"));
        }
        let sequence = self.next_sequence;
        let nonce = build_nonce(self.prefix, sequence);
        let cipher = Aes256Gcm::new_from_slice(&self.key).map_err(|_| ProtocolError::AeadFailed)?;
        let ciphertext = cipher
            .encrypt(
                &Nonce::from(nonce),
                Payload {
                    msg: plaintext,
                    aad,
                },
            )
            .map_err(|_| ProtocolError::AeadFailed)?;
        self.next_sequence += 1;
        Ok(ciphertext)
    }

    pub fn decrypt(&mut self, ciphertext: &[u8], aad: &[u8]) -> Result<Vec<u8>, ProtocolError> {
        if self.next_sequence == u64::MAX {
            return Err(ProtocolError::InvalidInput("directional nonce exhausted"));
        }
        let sequence = self.next_sequence;
        let nonce = build_nonce(self.prefix, sequence);
        let cipher = Aes256Gcm::new_from_slice(&self.key).map_err(|_| ProtocolError::AeadFailed)?;
        let plaintext = cipher
            .decrypt(
                &Nonce::from(nonce),
                Payload {
                    msg: ciphertext,
                    aad,
                },
            )
            .map_err(|_| ProtocolError::AuthenticationFailed)?;
        self.next_sequence += 1;
        Ok(plaintext)
    }
}

pub struct ProtocolReceiver {
    sequences: SenderSequenceRegistry,
    authentication_key: Option<[u8; 32]>,
}

impl ProtocolReceiver {
    pub fn new(authentication_key: Option<[u8; 32]>) -> Self {
        Self {
            sequences: SenderSequenceRegistry::default(),
            authentication_key,
        }
    }

    pub fn receive(&mut self, sender: &str, wire: &[u8]) -> Result<Frame, ProtocolError> {
        let frame = decode_frame(wire)?;
        if frame.message_type == CLASSICAL_MESSAGE {
            let key = self
                .authentication_key
                .as_ref()
                .ok_or(ProtocolError::AuthenticationRequired)?;
            if verify_frame_authentication(key, &frame)? == false {
                return Err(ProtocolError::AuthenticationFailed);
            }
        }
        self.sequences.accept(sender, frame.sequence)?;
        Ok(frame)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn basis_packing_matches_vectors() {
        assert_eq!(pack_basis(&[0, 1, 2, 3]).unwrap(), 0xe4);
        assert_eq!(pack_basis(&[0, 0, 0, 0]).unwrap(), 0x00);
        assert_eq!(pack_basis(&[3, 3, 3, 3]).unwrap(), 0xff);
        assert_eq!(pack_basis(&[1, 2, 3, 0]).unwrap(), 0x39);
    }

    #[test]
    fn frame_codec_and_hmac_vectors_match() {
        let bootstrap = encode_frame(&Frame {
            message_type: BOOTSTRAP_MESSAGE,
            sequence: 0x01020304,
            payload: vec![0xaa, 0xbb],
            authentication_tag: None,
        })
        .unwrap();
        assert_eq!(bootstrap, hex::decode("01010203040002aabb").unwrap());
        assert_eq!(decode_frame(&bootstrap).unwrap().sequence, 0x01020304);

        let input = hex::decode("0400000001000401020304").unwrap();
        let expected =
            hex::decode("3d700ffa04462dca05efce29e6ec166e1387f11872d453dffbac5dfbdb456d2d")
                .unwrap();
        assert_eq!(hmac_sha256(&[0; 32], &input).to_vec(), expected);
    }

    #[test]
    fn hkdf_and_nonce_vectors_match() {
        let context =
            hex::decode("e4b71278b8c643fc0c3ec88ea0efa1b58ae2561aed98959e4f26ea9670298c88")
                .unwrap();
        let context: [u8; 32] = context.try_into().unwrap();
        let keys = derive_directional_keys(&[0; 32], &context, &[0; 32]).unwrap();
        assert_eq!(
            keys.k_enc_a2b.to_vec(),
            hex::decode("dd70c9f5110ea586dac2ba20569481ad03d8df346c9d17cd78cbf70a9cd2c9e5")
                .unwrap()
        );
        assert_eq!(
            keys.k_enc_b2a.to_vec(),
            hex::decode("da2273fed3c28f397e687de459ea37f5bef4fa7af6047c0af48ab3c98f390c6a")
                .unwrap()
        );
        let prefixes = derive_nonce_prefixes(&keys, &context);
        assert_eq!(prefixes.a2b.to_vec(), hex::decode("ff54b8c0").unwrap());
        assert_eq!(prefixes.b2a.to_vec(), hex::decode("bc58de4c").unwrap());
    }

    #[test]
    fn transcript_session_id_vector_matches() {
        let transcript = TranscriptChain::new(&[0; 16], &[1; 16], VERSION);
        assert_eq!(
            transcript.sid.to_vec(),
            hex::decode("0e35a53871304db5962bedd5562462cf086ab5dd2fa0fdc00cf15902211feaa1")
                .unwrap()
        );
    }

    #[test]
    fn sequence_trace_matches_vector() {
        let trace = trace_sequence(&[0, 1, 2, 3, 5, 4, 6, 5, 6]);
        assert_eq!(
            trace.outcomes,
            vec![true, true, true, true, false, true, false, true, true]
        );
        assert_eq!(trace.accepted_count, 7);
        assert_eq!(trace.final_next_expected_sequence, 7);
        assert!(trace.aborted);
    }

    #[test]
    fn directional_aead_vector_round_trip_and_replay_protection() {
        let context =
            hex::decode("e4b71278b8c643fc0c3ec88ea0efa1b58ae2561aed98959e4f26ea9670298c88")
                .unwrap();
        let context: [u8; 32] = context.try_into().unwrap();
        let keys = derive_directional_keys(&[0; 32], &context, &[0; 32]).unwrap();
        let mut sender = DirectionalCipher::new(keys.k_enc_a2b, context, &Direction::A2B);
        let mut receiver = DirectionalCipher::new(keys.k_enc_a2b, context, &Direction::A2B);
        let ciphertext = sender
            .encrypt(b"directional payload", b"frame-header")
            .unwrap();
        let expected =
            hex::decode("f364c6773f7f2c28eec8d1a8d54eab38296f839106254d52869ba1d4d686befb66018f")
                .unwrap();
        assert_eq!(ciphertext, expected);
        assert_eq!(sender.next_sequence(), 1);
        assert_eq!(
            receiver.decrypt(&ciphertext, b"frame-header").unwrap(),
            b"directional payload"
        );
        assert!(receiver.decrypt(&ciphertext, b"frame-header").is_err());
    }

    #[test]
    fn directional_aead_round_trip_and_replay_protection() {
        let context = [7; 32];
        let keys = derive_directional_keys(&[0; 32], &context, &[0; 32]).unwrap();
        let mut sender = DirectionalCipher::new(keys.k_enc_a2b, context, &Direction::A2B);
        let mut receiver = DirectionalCipher::new(keys.k_enc_a2b, context, &Direction::A2B);
        let ciphertext = sender.encrypt(b"payload", b"aad").unwrap();
        assert_eq!(receiver.decrypt(&ciphertext, b"aad").unwrap(), b"payload");
        assert!(receiver.decrypt(&ciphertext, b"aad").is_err());
    }
}
