#!/usr/bin/env python3
"""Conformance vector executor for the protocol family mirrors (ADR-084).

Reads vectors/protocol.json and computes every vector through the Python
shipped path (multiplicity.crypto.protocol). Prints a single JSON object
mapping vector id -> {output-key: value} for every vector it supports.

Usage:
    python3 py/scripts/vector_executor.py vectors/protocol.json
"""

import json
import sys
from typing import Any, Dict

from multiplicity.crypto.protocol import (
    DirectionalAead,
    DirectionalKeys,
    build_nonce,
    compute_hmac,
    compute_transcript,
    derive_directional_keys,
    derive_nonce_prefixes,
    encode_frame,
    Frame,
    hkdf_expand,
    hkdf_extract,
    pack_basis,
    session_id,
    sha256,
    trace_sequence,
)


def _hex(value: bytes) -> str:
    return value.hex()


def _bytes(value: str) -> bytes:
    return bytes.fromhex(value)


def compute(operation: str, inputs: Dict[str, Any]) -> Dict[str, Any]:
    if operation == "sha256":
        return {"out": _hex(sha256(_bytes(inputs["data"])))}

    if operation == "hkdf_extract":
        return {
            "out": _hex(hkdf_extract(_bytes(inputs["ikm"]), _bytes(inputs["salt"])))
        }

    if operation == "hkdf_expand":
        return {
            "out": _hex(
                hkdf_expand(
                    _bytes(inputs["prk"]), _bytes(inputs["info"]), inputs["length"]
                )
            )
        }

    if operation == "hmac_sha256":
        return {
            "out": _hex(compute_hmac(_bytes(inputs["key"]), _bytes(inputs["data"])))
        }

    if operation == "frame_encode":
        frame = Frame(
            message_type=inputs["message_type"],
            sequence=inputs["sequence"],
            payload=_bytes(inputs["payload"]),
        )
        return {"out": _hex(encode_frame(frame))}

    if operation == "session_id":
        return {
            "out": _hex(session_id(_bytes(inputs["nonceA"]), _bytes(inputs["nonceB"])))
        }

    if operation == "transcript":
        result = compute_transcript(
            _bytes(inputs["nonceA"]),
            _bytes(inputs["nonceB"]),
            [_bytes(message) for message in inputs["messagesA"]],
            [_bytes(message) for message in inputs["messagesB"]],
            inputs["version"],
        )
        return {
            "sid": _hex(result.sid),
            "h_a": _hex(result.h_a),
            "h_b": _hex(result.h_b),
            "context_hash": _hex(result.context_hash),
        }

    if operation == "sequence_trace":
        result = trace_sequence(inputs["sequences"])
        return {
            "outcomes": "".join("A" if outcome else "R" for outcome in result.outcomes),
            "accepted": result.accepted_count,
            "next_expected": result.final_next_expected_sequence,
            "aborted": result.aborted,
        }

    if operation == "pack_basis":
        return {"out": f"{pack_basis(inputs['bases']):02x}"}

    if operation == "directional_keys":
        keys = derive_directional_keys(
            _bytes(inputs["ikm"]), _bytes(inputs["context"]), _bytes(inputs["salt"])
        )
        return {
            "k_a2b": _hex(keys.k_enc_a2b),
            "k_b2a": _hex(keys.k_enc_b2a),
        }

    if operation == "nonce_prefixes":
        keys = DirectionalKeys(
            k_enc_a2b=_bytes(inputs["k_a2b"]),
            k_enc_b2a=_bytes(inputs["k_b2a"]),
        )
        prefixes = derive_nonce_prefixes(keys, _bytes(inputs["context"]))
        return {"a2b": _hex(prefixes.a2b), "b2a": _hex(prefixes.b2a)}

    if operation == "build_nonce":
        return {
            "out": _hex(build_nonce(_bytes(inputs["prefix"]), inputs["sequence"]))
        }

    if operation == "aead_encrypt":
        cipher = DirectionalAead(
            _bytes(inputs["key"]), _bytes(inputs["context"]), inputs["direction"]
        )
        output = cipher.encrypt(_bytes(inputs["plaintext"]), _bytes(inputs["aad"]))
        return {"out": _hex(output.ciphertext + output.authentication_tag)}

    raise ValueError(f"unsupported vector operation: {operation}")


def main() -> None:
    if len(sys.argv) != 2:
        print("usage: vector_executor.py <manifest.json>", file=sys.stderr)
        sys.exit(2)
    with open(sys.argv[1], encoding="utf-8") as handle:
        manifest = json.load(handle)
    results: Dict[str, Dict[str, Any]] = {}
    for vector in manifest["vectors"]:
        results[vector["id"]] = compute(vector["operation"], vector["inputs"])
    print(json.dumps(results, sort_keys=True))


if __name__ == "__main__":
    main()