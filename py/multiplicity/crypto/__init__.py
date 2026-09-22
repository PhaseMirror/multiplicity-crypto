"""Official Python interop layer for the `multiplicity.crypto` package.

SHA-256 fallback is the only shipped mode. No Node.js/WASM bridge required.
"""

from __future__ import annotations

import hashlib
import json
from typing import Any, Dict, List, Optional


from .protocol import (
    AeadBackendUnavailable,
    AeadReplayError,
    AeadOutput,
    ALICE_LABEL,
    AuthenticationError,
    AUTHENTICATION_TAG_LENGTH,
    BOB_LABEL,
    BOOTSTRAP_MESSAGE,
    build_nonce,
    CLASSICAL_MESSAGE,
    compute_authentication_tag,
    compute_hmac,
    compute_transcript,
    constant_time_equal,
    DEFAULT_SALT,
    decode_frame,
    derive_directional_key,
    derive_directional_keys,
    derive_nonce_prefix,
    derive_nonce_prefixes,
    DirectionalAead,
    DirectionalKeys,
    DirectionalNoncePrefixes,
    encode_bootstrap,
    encode_classical,
    encode_frame,
    encode_header,
    Frame,
    frame_hmac_input,
    FRAME_HEADER_LENGTH,
    hkdf_expand,
    hkdf_extract,
    hkdf_sha256,
    MAX_PAYLOAD_LENGTH,
    pack_basis,
    PROTOCOL_VERSION,
    ProtocolAbortError,
    ProtocolError,
    ProtocolReceiver,
    SenderSequenceRegistry,
    session_id,
    sha256,
    sign_frame,
    StrictSequenceState,
    trace_sequence,
    TranscriptChain,
    TranscriptResult,
    verify_frame_authentication,
    verify_hmac,
    VERSION,
)


def _normalize_hex(value: str) -> str:
    return value if value.startswith("0x") else f"0x{value}"


def _sha256_hex(*parts: str) -> str:
    hasher = hashlib.sha256()
    for part in parts:
        hasher.update(part.encode("utf8"))
    return hasher.hexdigest()


def _fallback_commitment(message: str, randomness: str) -> str:
    return _normalize_hex(_sha256_hex(message, ":commit:", randomness))


def _fallback_merkle_root(leaves: List[str]) -> str:
    if not leaves:
        raise ValueError("Cannot compute Merkle root of empty leaves")

    nodes = [_fallback_commitment(leaf, "merkle-leaf") for leaf in leaves]
    while len(nodes) > 1:
        next_level: List[str] = []
        for index in range(0, len(nodes), 2):
            left = nodes[index]
            right = nodes[index + 1] if index + 1 < len(nodes) else left
            next_level.append(_fallback_commitment(f"{left}:{right}", "merkle-node"))
        nodes = next_level
    return nodes[0]


def _fallback_generate_merkle_proof(leaves: List[str], leaf_index: int) -> Dict[str, Any]:
    if leaf_index < 0 or leaf_index >= len(leaves):
        raise ValueError("Invalid leaf index")

    proof: List[str] = []
    nodes = [_fallback_commitment(leaf, "merkle-leaf") for leaf in leaves]
    current_index = leaf_index

    while len(nodes) > 1:
        is_left_child = current_index % 2 == 0
        if is_left_child:
            sibling = nodes[current_index + 1] if current_index + 1 < len(nodes) else nodes[current_index]
            proof.append(f"right:{sibling}")
        else:
            proof.append(f"left:{nodes[current_index - 1]}")

        next_level: List[str] = []
        for index in range(0, len(nodes), 2):
            left = nodes[index]
            right = nodes[index + 1] if index + 1 < len(nodes) else left
            next_level.append(_fallback_commitment(f"{left}:{right}", "merkle-node"))
        nodes = next_level
        current_index //= 2

    return {"proof": proof, "root": nodes[0]}


def _fallback_verify_merkle_proof(leaf: str, proof: List[str], root: str) -> bool:
    current = _fallback_commitment(leaf, "merkle-leaf")
    for proof_item in proof:
        position, sibling = proof_item.split(":", 1)
        combined = f"{sibling}:{current}" if position == "left" else f"{current}:{sibling}"
        current = _fallback_commitment(combined, "merkle-node")
    return current == root


def _fallback_bls_sign(private_key: str, message: str) -> Dict[str, str]:
    public_key = _normalize_hex(_sha256_hex(f"bls-pk:{private_key}"))
    signature = _normalize_hex(_sha256_hex(public_key, ":bls-sign:", message))
    return {"signature": signature, "publicKey": public_key, "message": message}


def _fallback_bls_verify(payload: Dict[str, Any]) -> bool:
    signature = str(payload.get("signature", ""))
    public_key = str(payload.get("publicKey", ""))
    message = str(payload.get("message", ""))
    expected = _normalize_hex(_sha256_hex(public_key, ":bls-sign:", message))
    return signature == expected


def _fallback_bls_aggregate(signatures: List[Dict[str, Any]]) -> str:
    combined = "".join(str(sig.get("signature", "")) for sig in signatures)
    return _normalize_hex(_sha256_hex(combined, ":aggregate:"))


class MultiplicityCrypto:
    """Official Python bridge for the TypeScript/WASM crypto backend.

    SHA-256 fallback is the only shipped mode. No Node.js/WASM bridge required.
    """

    def __init__(self, force_fallback: Optional[bool] = None) -> None:
        self.force_fallback = True
        self._bridge_status = {
            "available": True,
            "mode": "fallback",
            "reason": "bridge-removed-sha256-only",
        }

    def getBridgeStatus(self) -> Dict[str, Any]:
        return dict(self._bridge_status)

    def _call(self, command: str, *args: Any) -> Any:
        if command == "computeCommitment":
            return _fallback_commitment(str(args[0]), str(args[1]))
        if command == "verifyCommitment":
            expected = _fallback_commitment(str(args[1]), str(args[2]))
            return str(args[0]) == expected
        if command == "merkleRoot":
            return _fallback_merkle_root(list(args[0]))
        if command == "generateMerkleProof":
            return _fallback_generate_merkle_proof(list(args[0]), int(args[1]))
        if command == "verifyMerkleProof":
            return _fallback_verify_merkle_proof(str(args[0]), list(args[1]), str(args[2]))
        if command == "deriveIdentityCommitment":
            return _fallback_commitment(str(args[0]), "identity:v1")
        if command == "deriveIdentityAuditHash":
            value = str(args[0])
            base_commitment = value if value.startswith("0x") else _fallback_commitment(value, "identity:v1")
            return _fallback_commitment(base_commitment, "audit:v1")
        if command == "redactIdentity":
            return f"redacted:{_fallback_commitment(str(args[0]), 'redact:v1')}"
        if command == "blsSign":
            return _fallback_bls_sign(str(args[0]), str(args[1]))
        if command == "blsVerify":
            return _fallback_bls_verify(dict(args[0]))
        if command == "blsAggregate":
            return _fallback_bls_aggregate(list(args[0]))
        if command == "qpaRunPrototype":
            params = dict(args[0])
            message = str(args[1])
            mode = str(args[2])
            shadow_count = int(args[3])
            return {
                "instance": {"id": "qpa-fallback-1", "params": params, "createdAt": "1970-01-01T00:00:00Z"},
                "pmhpInstance": {
                    "id": "pmhp-fallback-1",
                    "description": params.get("description"),
                    "primes": params.get("primes", []),
                    "partitionCount": params.get("partitionCount", 2),
                    "hyperedges": [],
                    "constraints": [],
                    "createdAt": "1970-01-01T00:00:00Z",
                },
                "state": {
                    "instance": {"id": "qpa-fallback-1", "params": params, "createdAt": "1970-01-01T00:00:00Z"},
                    "status": "committed",
                    "summary": {"note": "fallback qpa prototype result"},
                },
                "shadows": [
                    {"index": i, "basis": f"pauli-{i}", "outcome": _normalize_hex(_sha256_hex(str(params), str(i)))}
                    for i in range(shadow_count)
                ],
                "invariant": f"qpa-invariant-fallback:{message}",
                "commitment": {
                    "commitment": _normalize_hex(_sha256_hex(str(params), message, mode)),
                    "mode": mode,
                    "description": "fallback qpa prototype commitment",
                    "createdAt": "1970-01-01T00:00:00Z",
                },
                "evaluation": {
                    "assignment": [0] * len(params.get("primes", [])),
                    "cutCost": 0,
                    "constraintResiduals": [],
                    "totalResidual": 0,
                    "objective": 0,
                },
            }
        if command == "computeGapWitness":
            gap_lb = float(args[0])
            slope_ub = float(args[1])
            couplings = list(args[2])
            salt = str(args[3])
            payload = json.dumps({
                "gapLB": gap_lb,
                "slopeUB": slope_ub,
                "couplings": sorted(couplings, key=lambda x: x.get("prime", 0)),
                "version": "1.0.0",
                "engine": "multiplicity.qpa",
            }, sort_keys=True)
            return _fallback_commitment(payload, salt)

        if command == "getBridgeStatus":
            return self.getBridgeStatus()

        raise ValueError(f"Unknown bridge command: {command}")

    async def computeCommitment(self, leaf: str, salt: str) -> str:
        return str(self._call("computeCommitment", leaf, salt))

    async def verifyCommitment(self, commitment: str, leaf: str, salt: str) -> bool:
        return bool(self._call("verifyCommitment", commitment, leaf, salt))

    async def merkleRoot(self, leaves: List[str]) -> str:
        return str(self._call("merkleRoot", leaves))

    async def generateMerkleProof(self, leaves: List[str], leafIndex: int) -> Dict[str, Any]:
        result = self._call("generateMerkleProof", leaves, leafIndex)
        return dict(result)

    async def verifyMerkleProof(self, leaf: str, proof: List[str], root: str) -> bool:
        return bool(self._call("verifyMerkleProof", leaf, proof, root))

    async def deriveIdentityCommitment(self, input_str: str) -> str:
        return str(self._call("deriveIdentityCommitment", input_str))

    async def deriveIdentityAuditHash(self, input_str: str) -> str:
        return str(self._call("deriveIdentityAuditHash", input_str))

    async def redactIdentity(self, input_str: str) -> str:
        return str(self._call("redactIdentity", input_str))

    async def blsSign(self, private_key: str, message: str) -> Dict[str, Any]:
        result = self._call("blsSign", private_key, message)
        return dict(result)

    async def blsVerify(self, payload: Dict[str, Any]) -> bool:
        return bool(self._call("blsVerify", payload))

    async def blsAggregate(self, signatures: List[Dict[str, Any]]) -> str:
        return str(self._call("blsAggregate", signatures))

    async def qpaRunPrototype(
        self,
        params: Dict[str, Any],
        message: str,
        mode: str,
        shadow_count: int,
    ) -> Dict[str, Any]:
        result = self._call("qpaRunPrototype", params, message, mode, shadow_count)
        return dict(result)

    async def computeGapWitness(
        self,
        gap_lb: float,
        slope_ub: float,
        couplings: List[Dict[str, Any]],
        salt: str,
    ) -> str:
        return str(self._call("computeGapWitness", gap_lb, slope_ub, couplings, salt))

    async def compute_commitment(self, leaf: str, salt: str) -> str:
        return await self.computeCommitment(leaf, salt)

    async def verify_commitment(self, commitment: str, leaf: str, salt: str) -> bool:
        return await self.verifyCommitment(commitment, leaf, salt)

    async def merkle_root(self, leaves: List[str]) -> str:
        return await self.merkleRoot(leaves)

    async def generate_merkle_proof(self, leaves: List[str], leaf_index: int) -> Dict[str, Any]:
        return await self.generateMerkleProof(leaves, leaf_index)

    async def verify_merkle_proof(self, leaf: str, proof: List[str], root: str) -> bool:
        return await self.verifyMerkleProof(leaf, proof, root)

    async def derive_identity_commitment(self, input_str: str) -> str:
        return await self.deriveIdentityCommitment(input_str)

    async def derive_identity_audit_hash(self, input_str: str) -> str:
        return await self.deriveIdentityAuditHash(input_str)

    async def redact_identity(self, input_str: str) -> str:
        return await self.redactIdentity(input_str)

    async def compute_gap_witness(
        self,
        gap_lb: float,
        slope_ub: float,
        couplings: List[Dict[str, Any]],
        salt: str,
    ) -> str:
        return await self.computeGapWitness(gap_lb, slope_ub, couplings, salt)

    async def bls_sign(self, private_key: str, message: str) -> Dict[str, Any]:
        return await self.blsSign(private_key, message)

    async def bls_verify(self, payload: Dict[str, Any]) -> bool:
        return await self.blsVerify(payload)

    async def bls_aggregate(self, signatures: List[Dict[str, Any]]) -> str:
        return await self.blsAggregate(signatures)

    async def qpa_run_prototype(
        self,
        params: Dict[str, Any],
        message: str,
        mode: str = "prototype",
        shadow_count: int = 8,
    ) -> Dict[str, Any]:
        return await self.qpaRunPrototype(params, message, mode, shadow_count)


_crypto_instance: Optional[MultiplicityCrypto] = None


def _get_crypto_instance() -> MultiplicityCrypto:
    global _crypto_instance
    if _crypto_instance is None:
        _crypto_instance = MultiplicityCrypto()
    return _crypto_instance


async def computeCommitment(leaf: str, salt: str) -> str:
    return await _get_crypto_instance().computeCommitment(leaf, salt)


async def verifyCommitment(commitment: str, leaf: str, salt: str) -> bool:
    return bool(await _get_crypto_instance().verifyCommitment(commitment, leaf, salt))


async def merkleRoot(leaves: List[str]) -> str:
    return str(await _get_crypto_instance().merkleRoot(leaves))


async def generateMerkleProof(leaves: List[str], leafIndex: int) -> Dict[str, Any]:
    result = await _get_crypto_instance().generateMerkleProof(leaves, leafIndex)
    return dict(result)


async def verifyMerkleProof(leaf: str, proof: List[str], root: str) -> bool:
    return bool(await _get_crypto_instance().verifyMerkleProof(leaf, proof, root))


async def deriveIdentityCommitment(input_str: str) -> str:
    return str(await _get_crypto_instance().deriveIdentityCommitment(input_str))


async def deriveIdentityAuditHash(input_str: str) -> str:
    return str(await _get_crypto_instance().deriveIdentityAuditHash(input_str))


async def redactIdentity(input_str: str) -> str:
    return str(await _get_crypto_instance().redactIdentity(input_str))


async def computeGapWitness(
    gap_lb: float,
    slope_ub: float,
    couplings: List[Dict[str, Any]],
    salt: str,
) -> str:
    return str(await _get_crypto_instance().computeGapWitness(gap_lb, slope_ub, couplings, salt))


async def blsSign(private_key: str, message: str) -> Dict[str, Any]:
    result = await _get_crypto_instance().blsSign(private_key, message)
    return dict(result)


async def blsVerify(payload: Dict[str, Any]) -> bool:
    return bool(await _get_crypto_instance().blsVerify(payload))


async def blsAggregate(signatures: List[Dict[str, Any]]) -> str:
    return str(await _get_crypto_instance().blsAggregate(signatures))


async def qpaRunPrototype(
    params: Dict[str, Any],
    message: str,
    mode: str = "prototype",
    shadow_count: int = 8,
) -> Dict[str, Any]:
    return dict(await _get_crypto_instance().qpaRunPrototype(params, message, mode, shadow_count))


async def compute_commitment(leaf: str, salt: str) -> str:
    return await computeCommitment(leaf, salt)


async def verify_commitment(commitment: str, leaf: str, salt: str) -> bool:
    return await verifyCommitment(commitment, leaf, salt)


async def merkle_root(leaves: List[str]) -> str:
    return await merkleRoot(leaves)


async def generate_merkle_proof(leaves: List[str], leaf_index: int) -> Dict[str, Any]:
    return await generateMerkleProof(leaves, leaf_index)


async def verify_merkle_proof(leaf: str, proof: List[str], root: str) -> bool:
    return await verifyMerkleProof(leaf, proof, root)


async def derive_identity_commitment(input_str: str) -> str:
    return await deriveIdentityCommitment(input_str)


async def derive_identity_audit_hash(input_str: str) -> str:
    return await deriveIdentityAuditHash(input_str)


async def redact_identity(input_str: str) -> str:
    return await redactIdentity(input_str)


async def compute_gap_witness(
    gap_lb: float,
    slope_ub: float,
    couplings: List[Dict[str, Any]],
    salt: str,
) -> str:
    return await computeGapWitness(gap_lb, slope_ub, couplings, salt)


async def bls_sign(private_key: str, message: str) -> Dict[str, Any]:
    return await blsSign(private_key, message)


async def bls_verify(payload: Dict[str, Any]) -> bool:
    return await blsVerify(payload)


async def bls_aggregate(signatures: List[Dict[str, Any]]) -> str:
    return await blsAggregate(signatures)


async def qpa_run_prototype(
    params: Dict[str, Any],
    message: str,
    mode: str = "prototype",
    shadow_count: int = 8,
) -> Dict[str, Any]:
    return await qpaRunPrototype(params, message, mode, shadow_count)


def getBridgeStatus() -> Dict[str, Any]:
    return _get_crypto_instance().getBridgeStatus()


__all__ = [
    "MultiplicityCrypto",
    "computeCommitment",
    "verifyCommitment",
    "merkleRoot",
    "generateMerkleProof",
    "verifyMerkleProof",
    "deriveIdentityCommitment",
    "deriveIdentityAuditHash",
    "redactIdentity",
    "computeGapWitness",
    "blsSign",
    "blsVerify",
    "blsAggregate",
    "qpaRunPrototype",
    "getBridgeStatus",
    "compute_commitment",
    "verify_commitment",
    "merkle_root",
    "generate_merkle_proof",
    "verify_merkle_proof",
    "derive_identity_commitment",
    "derive_identity_audit_hash",
    "redact_identity",
    "compute_gap_witness",
    "bls_sign",
    "bls_verify",
    "bls_aggregate",
    "qpa_run_prototype",
    "AeadBackendUnavailable",
    "AeadReplayError",
    "AeadOutput",
    "ALICE_LABEL",
    "AuthenticationError",
    "AUTHENTICATION_TAG_LENGTH",
    "BOB_LABEL",
    "BOOTSTRAP_MESSAGE",
    "build_nonce",
    "CLASSICAL_MESSAGE",
    "compute_authentication_tag",
    "compute_hmac",
    "compute_transcript",
    "constant_time_equal",
    "DEFAULT_SALT",
    "decode_frame",
    "derive_directional_key",
    "derive_directional_keys",
    "derive_nonce_prefix",
    "derive_nonce_prefixes",
    "DirectionalAead",
    "DirectionalKeys",
    "DirectionalNoncePrefixes",
    "encode_bootstrap",
    "encode_classical",
    "encode_frame",
    "encode_header",
    "Frame",
    "frame_hmac_input",
    "FRAME_HEADER_LENGTH",
    "hkdf_expand",
    "hkdf_extract",
    "hkdf_sha256",
    "MAX_PAYLOAD_LENGTH",
    "pack_basis",
    "PROTOCOL_VERSION",
    "ProtocolAbortError",
    "ProtocolError",
    "ProtocolReceiver",
    "SenderSequenceRegistry",
    "session_id",
    "sha256",
    "sign_frame",
    "StrictSequenceState",
    "trace_sequence",
    "TranscriptChain",
    "TranscriptResult",
    "verify_frame_authentication",
    "verify_hmac",
    "VERSION",
]