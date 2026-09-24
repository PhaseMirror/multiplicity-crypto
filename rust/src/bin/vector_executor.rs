//! Conformance vector executor for the protocol family mirrors (ADR-084).
//!
//! Reads tab-separated request lines on stdin and prints one result line per
//! request, so the Rust gate can run against `vectors/protocol.json` without
//! adding a JSON dependency to this crate.
//!
//! Input line:   `id\toperation\tkey:value\tkey:value...`
//! Output line:  `id\tkey:value\tkey:value...`
//!
//! Value encoding: hex strings are passed as-is, integers as decimal, boolean
//! as `true`/`false`, and lists (basis values, sequences, transcript messages)
//! as comma-joined elements.

use std::collections::BTreeMap;
use std::io::{self, BufRead, Write};

use multiplicity_crypto_rust::protocol::{
    Direction, DirectionalCipher, DirectionalKeys, Frame, ProtocolRole, TranscriptChain,
    build_nonce, derive_directional_keys, derive_nonce_prefixes, encode_frame, hkdf_expand,
    hkdf_extract, hmac_sha256, pack_basis, session_id, sha256, trace_sequence,
};

fn decode_hex(value: &str) -> Vec<u8> {
    hex::decode(value).unwrap_or_else(|error| panic!("invalid hex input `{value}`: {error}"))
}

fn hex_encode(value: &[u8]) -> String {
    hex::encode(value)
}

fn parse_list<T>(values: &str, parse: impl Fn(&str) -> T) -> Vec<T> {
    if values.is_empty() {
        Vec::new()
    } else {
        values.split(',').map(parse).collect()
    }
}

fn parse_u32(value: &str) -> u32 {
    value
        .parse()
        .unwrap_or_else(|_| panic!("invalid u32 input `{value}`"))
}

fn parse_u8(value: &str) -> u8 {
    value
        .parse()
        .unwrap_or_else(|_| panic!("invalid u8 input `{value}`"))
}

fn parse_u64(value: &str) -> u64 {
    value
        .parse()
        .unwrap_or_else(|_| panic!("invalid u64 input `{value}`"))
}

fn parse_bytes32(value: &str) -> [u8; 32] {
    decode_hex(value)
        .try_into()
        .unwrap_or_else(|_| panic!("expected 32 bytes, got `{value}`"))
}

fn parse_bytes4(value: &str) -> [u8; 4] {
    decode_hex(value)
        .try_into()
        .unwrap_or_else(|_| panic!("expected 4 bytes, got `{value}`"))
}

fn compute(
    operation: &str,
    inputs: &BTreeMap<String, String>,
) -> Vec<(&'static str, String)> {
    let get = |key: &str| inputs.get(key).unwrap_or_else(|| panic!("missing input `{key}`")).clone();
    match operation {
        "sha256" => vec![("out", hex_encode(&sha256(&decode_hex(&get("data")))))],

        "hkdf_extract" => vec![(
            "out",
            hex_encode(&hkdf_extract(&decode_hex(&get("ikm")), &decode_hex(&get("salt")))),
        )],

        "hkdf_expand" => vec![(
            "out",
            hex_encode(&hkdf_expand(
                &decode_hex(&get("prk")),
                &decode_hex(&get("info")),
                parse_u32(&get("length")) as usize,
            ).unwrap()),
        )],

        "hmac_sha256" => vec![(
            "out",
            hex_encode(&hmac_sha256(&decode_hex(&get("key")), &decode_hex(&get("data")))),
        )],

        "frame_encode" => {
            let frame = Frame {
                message_type: parse_u8(&get("message_type")),
                sequence: parse_u32(&get("sequence")),
                payload: decode_hex(&get("payload")),
                authentication_tag: None,
            };
            vec![("out", hex_encode(&encode_frame(&frame).unwrap()))]
        }

        "session_id" => vec![(
            "out",
            hex_encode(&session_id(&decode_hex(&get("nonceA")), &decode_hex(&get("nonceB")))),
        )],

        "transcript" => {
            let mut chain = TranscriptChain::new(
                &decode_hex(&get("nonceA")),
                &decode_hex(&get("nonceB")),
                &[parse_u8(&get("version"))],
            );
            for message in parse_list(&get("messagesA"), |value| decode_hex(value)) {
                chain.append(&ProtocolRole::A, &message);
            }
            for message in parse_list(&get("messagesB"), |value| decode_hex(value)) {
                chain.append(&ProtocolRole::B, &message);
            }
            let snapshot = chain.snapshot();
            vec![
                ("sid", hex_encode(&snapshot.sid)),
                ("h_a", hex_encode(&snapshot.h_a)),
                ("h_b", hex_encode(&snapshot.h_b)),
                ("context_hash", hex_encode(&snapshot.context_hash)),
            ]
        }

        "sequence_trace" => {
            let result = trace_sequence(&parse_list(&get("sequences"), parse_u32));
            vec![
                (
                    "outcomes",
                    result
                        .outcomes
                        .iter()
                        .map(|accepted| if *accepted { 'A' } else { 'R' })
                        .collect(),
                ),
                ("accepted", result.accepted_count.to_string()),
                ("next_expected", result.final_next_expected_sequence.to_string()),
                ("aborted", result.aborted.to_string()),
            ]
        }

        "pack_basis" => {
            let bases: Vec<u8> = parse_list(&get("bases"), parse_u8);
            let bases: [u8; 4] = bases
                .try_into()
                .unwrap_or_else(|_| panic!("expected 4 basis values"));
            vec![("out", format!("{:02x}", pack_basis(&bases).unwrap()))]
        }

        "directional_keys" => {
            let keys = derive_directional_keys(
                &decode_hex(&get("ikm")),
                &parse_bytes32(&get("context")),
                &decode_hex(&get("salt")),
            )
            .unwrap();
            vec![
                ("k_a2b", hex_encode(&keys.k_enc_a2b)),
                ("k_b2a", hex_encode(&keys.k_enc_b2a)),
            ]
        }

        "nonce_prefixes" => {
            let keys = DirectionalKeys {
                k_enc_a2b: parse_bytes32(&get("k_a2b")),
                k_enc_b2a: parse_bytes32(&get("k_b2a")),
            };
            let prefixes = derive_nonce_prefixes(&keys, &parse_bytes32(&get("context")));
            vec![
                ("a2b", hex_encode(&prefixes.a2b)),
                ("b2a", hex_encode(&prefixes.b2a)),
            ]
        }

        "build_nonce" => vec![(
            "out",
            hex_encode(&build_nonce(parse_bytes4(&get("prefix")), parse_u64(&get("sequence")))),
        )],

        "aead_encrypt" => {
            let key = parse_bytes32(&get("key"));
            let context = parse_bytes32(&get("context"));
            let direction = if get("direction") == "A2B" {
                Direction::A2B
            } else {
                Direction::B2A
            };
            let mut cipher = DirectionalCipher::new(key, context, &direction);
            let ciphertext = cipher
                .encrypt(&decode_hex(&get("plaintext")), &decode_hex(&get("aad")))
                .unwrap();
            vec![("out", hex_encode(&ciphertext))]
        }

        other => panic!("unsupported vector operation: {other}"),
    }
}

fn main() {
    let stdin = io::stdin();
    let stdout = io::stdout();
    let mut writer = io::BufWriter::new(stdout.lock());
    for line in stdin.lock().lines() {
        let line = line.unwrap_or_else(|error| panic!("failed to read stdin: {error}"));
        let mut parts = line.split('\t');
        let id = parts.next().expect("missing vector id").to_string();
        let operation = parts.next().expect("missing operation").to_string();
        let mut inputs = BTreeMap::new();
        for part in parts {
            let (key, value) = part.split_once(':').expect("malformed key:value input");
            inputs.insert(key.to_string(), value.to_string());
        }
        let mut output = String::new();
        for (key, value) in compute(&operation, &inputs) {
            output.push_str(key);
            output.push(':');
            output.push_str(&value);
            output.push('\t');
        }
        writeln!(writer, "{id}\t{output}").expect("failed to write stdout");
    }
    writer.flush().expect("failed to flush stdout");
}