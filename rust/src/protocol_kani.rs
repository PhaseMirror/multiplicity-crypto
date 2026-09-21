use crate::protocol::{
    encode_header, pack_basis, trace_sequence, Direction, StrictSequenceState, TranscriptChain,
    BOOTSTRAP_MESSAGE, MAX_PAYLOAD_LENGTH, VERSION,
};

#[kani::proof]
fn kani_sequence_accept_increments_once() {
    let mut state = StrictSequenceState::new();
    let expected = state.expected_next_sequence;
    assert!(state.try_accept(expected));
    assert_eq!(state.expected_next_sequence, expected.wrapping_add(1));
    assert!(!state.aborted);
}

#[kani::proof]
fn kani_sequence_mismatch_aborts_without_increment() {
    let mut state = StrictSequenceState::new();
    let expected = state.expected_next_sequence;
    let received = kani::any();
    kani::assume(received != expected);
    assert!(!state.try_accept(received));
    assert!(state.aborted);
    assert_eq!(state.expected_next_sequence, expected);
}

#[kani::proof]
fn kani_payload_length_bounds() {
    let length = kani::any();
    kani::assume(length <= MAX_PAYLOAD_LENGTH);
    let header = encode_header(BOOTSTRAP_MESSAGE, 0, length).unwrap();
    assert_eq!(header.len(), 7);
    assert_eq!(u16::from_be_bytes([header[5], header[6]]) as usize, length);
}

#[kani::proof]
fn kani_basis_packing_is_bounded() {
    let values = kani::any::<[u8; 4]>();
    kani::assume(values.iter().all(|value| *value <= 3));
    let packed = pack_basis(&values).unwrap();
    assert!(packed <= 0xff);
}

#[kani::proof]
fn kani_transcript_is_deterministic() {
    let nonce_a = kani::any::<[u8; 16]>();
    let nonce_b = kani::any::<[u8; 16]>();
    let left = TranscriptChain::new(&nonce_a, &nonce_b, VERSION);
    let right = TranscriptChain::new(&nonce_a, &nonce_b, VERSION);
    assert_eq!(left.snapshot(), right.snapshot());
}

#[kani::proof]
fn kani_sequence_trace_final_expected_is_accepted_count() {
    let first = kani::any::<u8>() as u32;
    let second = kani::any::<u8>() as u32;
    let third = kani::any::<u8>() as u32;
    let trace = trace_sequence(&[first, second, third]);
    assert_eq!(
        trace.final_next_expected_sequence,
        trace.accepted_count as u32
    );
}

#[kani::proof]
fn kani_directional_info_is_distinct() {
    let a2b = Direction::A2B;
    let b2a = Direction::B2A;
    assert_ne!(a2b, b2a);
}
