import unittest

from multiplicity.crypto.protocol import (
    ALICE_LABEL,
    AUTHENTICATION_TAG_LENGTH,
    BOB_LABEL,
    BOOTSTRAP_MESSAGE,
    CLASSICAL_MESSAGE,
    DEFAULT_SALT,
    FRAME_HEADER_LENGTH,
    MAX_PAYLOAD_LENGTH,
    PROTOCOL_VERSION,
    VERSION,
    AeadReplayError,
    AuthenticationError,
    DirectionalAead,
    DirectionalKeys,
    DirectionalNoncePrefixes,
    Frame,
    ProtocolAbortError,
    ProtocolError,
    ProtocolReceiver,
    SenderSequenceRegistry,
    StrictSequenceState,
    TranscriptChain,
    build_nonce,
    compute_authentication_tag,
    compute_hmac,
    compute_transcript,
    constant_time_equal,
    decode_frame,
    derive_directional_key,
    derive_directional_keys,
    derive_nonce_prefix,
    derive_nonce_prefixes,
    encode_bootstrap,
    encode_classical,
    encode_frame,
    encode_header,
    frame_hmac_input,
    hkdf_expand,
    hkdf_extract,
    hkdf_sha256,
    pack_basis,
    session_id,
    sign_frame,
    trace_sequence,
    verify_frame_authentication,
    verify_hmac,
)

ZERO_KEY = bytes(32)
ZERO_SALT = bytes(32)
VECTOR_CONTEXT_HASH = bytes.fromhex(
    "e4b71278b8c643fc0c3ec88ea0efa1b58ae2561aed98959e4f26ea9670298c88"
)


class ProtocolConstantsTests(unittest.TestCase):
    def test_constants_and_labels(self):
        self.assertEqual(BOOTSTRAP_MESSAGE, 1)
        self.assertEqual(CLASSICAL_MESSAGE, 4)
        self.assertEqual(MAX_PAYLOAD_LENGTH, 0xFFFF)
        self.assertEqual(AUTHENTICATION_TAG_LENGTH, 32)
        self.assertEqual(FRAME_HEADER_LENGTH, 7)
        self.assertEqual(PROTOCOL_VERSION, 1)
        self.assertEqual(VERSION, b"\x01")
        self.assertEqual(DEFAULT_SALT, ZERO_SALT)
        self.assertEqual(ALICE_LABEL, b"ALICE" + bytes(3))
        self.assertEqual(BOB_LABEL, b"BOB" + bytes(5))


class FrameCodecTests(unittest.TestCase):
    def test_bootstrap_round_trip(self):
        wire = encode_bootstrap(0x01020304, b"\xaa\xbb")
        self.assertEqual(wire, bytes.fromhex("01010203040002aabb"))
        self.assertEqual(
            decode_frame(wire),
            Frame(BOOTSTRAP_MESSAGE, 0x01020304, b"\xaa\xbb"),
        )

    def test_classical_round_trip(self):
        frame = sign_frame(ZERO_KEY, Frame(CLASSICAL_MESSAGE, 1, b"\x01\x02\x03\x04"))
        wire = encode_frame(frame)
        self.assertEqual(wire[:7], bytes.fromhex("04000000010004"))
        self.assertEqual(len(wire), FRAME_HEADER_LENGTH + 4 + AUTHENTICATION_TAG_LENGTH)
        self.assertEqual(decode_frame(wire), frame)

    def test_payload_boundary(self):
        payload = bytes(0x5A for _ in range(MAX_PAYLOAD_LENGTH))
        wire = encode_bootstrap(0, payload)
        self.assertEqual(int.from_bytes(wire[5:7], "big"), MAX_PAYLOAD_LENGTH)
        self.assertEqual(decode_frame(wire).payload, payload)
        with self.assertRaisesRegex(ValueError, "payload"):
            encode_bootstrap(0, bytes(MAX_PAYLOAD_LENGTH + 1))

    def test_rejects_malformed_frames(self):
        with self.assertRaisesRegex(ValueError, "shorter"):
            decode_frame(bytes(6))
        with self.assertRaisesRegex(ValueError, "unsupported"):
            decode_frame(bytes([2, 0, 0, 0, 0, 0, 0]))

        bootstrap = encode_bootstrap(0, b"payload")
        declared_length = bytearray(bootstrap)
        declared_length[5] += 1
        with self.assertRaisesRegex(ValueError, "length mismatch"):
            decode_frame(declared_length)
        with self.assertRaisesRegex(ValueError, "length mismatch"):
            decode_frame(bootstrap + b"\x00")

        with self.assertRaisesRegex(ValueError, "requires authentication_tag"):
            encode_frame(Frame(CLASSICAL_MESSAGE, 0, b""))
        with self.assertRaisesRegex(ValueError, "authentication_tag"):
            encode_frame(
                Frame(
                    CLASSICAL_MESSAGE,
                    0,
                    b"",
                    bytes(AUTHENTICATION_TAG_LENGTH - 1),
                )
            )
        with self.assertRaisesRegex(ValueError, "cannot contain"):
            encode_frame(Frame(BOOTSTRAP_MESSAGE, 0, b"", bytes(AUTHENTICATION_TAG_LENGTH)))
        with self.assertRaisesRegex(ValueError, "sequence"):
            encode_bootstrap(0x100000000, b"")
        with self.assertRaisesRegex(ValueError, "message type"):
            encode_header(True, 0, 0)


class AuthenticationTests(unittest.TestCase):
    def test_hmac_vector(self):
        frame_input = bytes.fromhex("0400000001000401020304")
        expected = "3d700ffa04462dca05efce29e6ec166e1387f11872d453dffbac5dfbdb456d2d"
        frame = Frame(CLASSICAL_MESSAGE, 1, b"\x01\x02\x03\x04")
        self.assertEqual(frame_hmac_input(frame), frame_input)
        self.assertEqual(compute_hmac(ZERO_KEY, frame_input).hex(), expected)
        self.assertEqual(compute_authentication_tag(ZERO_KEY, frame).hex(), expected)

    def test_authentication_rejects_tampering(self):
        frame = sign_frame(
            ZERO_KEY,
            Frame(CLASSICAL_MESSAGE, 7, b"authenticated payload"),
        )
        wire = bytearray(encode_frame(frame))
        self.assertTrue(verify_frame_authentication(ZERO_KEY, wire))
        self.assertTrue(
            constant_time_equal(
                compute_authentication_tag(ZERO_KEY, frame),
                frame.authentication_tag,
            )
        )

        payload_tampered = bytearray(wire)
        payload_tampered[7] ^= 1
        self.assertFalse(verify_frame_authentication(ZERO_KEY, payload_tampered))

        header_tampered = bytearray(wire)
        header_tampered[4] ^= 1
        self.assertFalse(verify_frame_authentication(ZERO_KEY, header_tampered))

        tag_tampered = bytearray(wire)
        tag_tampered[-1] ^= 1
        self.assertFalse(verify_frame_authentication(ZERO_KEY, tag_tampered))
        self.assertFalse(
            verify_hmac(
                ZERO_KEY,
                frame_hmac_input(frame),
                bytes(AUTHENTICATION_TAG_LENGTH),
            )
        )


class KeyDerivationTests(unittest.TestCase):
    def test_rfc5869_extract_and_expand(self):
        ikm = bytes([0x0B]) * 22
        salt = bytes(range(13))
        info = bytes(range(0xF0, 0xFA))
        expected_prk = bytes.fromhex(
            "077709362c2e32df0ddc3f0dc47bba6390b6c73bb50f9c3122ec844ad7c2b3e5"
        )
        expected_okm = bytes.fromhex(
            "3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865"
        )
        self.assertEqual(hkdf_extract(ikm, salt), expected_prk)
        self.assertEqual(hkdf_sha256(ikm, salt, info, 42), expected_okm)

        prk = hkdf_extract(ZERO_KEY, ZERO_SALT)
        self.assertEqual(
            prk.hex(),
            "33ad0a1c607ec03b09e6cd9893680ce210adf300aa1f2660e1b22e10f170f92a",
        )
        expanded = hkdf_expand(prk, b"protocol test info", 64)
        self.assertEqual(len(expanded), 64)
        self.assertEqual(hkdf_sha256(ZERO_KEY, ZERO_SALT, b"protocol test info", 64), expanded)

    def test_directional_keys_and_nonce_prefixes(self):
        keys = derive_directional_keys(ZERO_KEY, VECTOR_CONTEXT_HASH)
        self.assertEqual(keys.k_enc_a2b.hex(), "dd70c9f5110ea586dac2ba20569481ad03d8df346c9d17cd78cbf70a9cd2c9e5")
        self.assertEqual(keys.k_enc_b2a.hex(), "da2273fed3c28f397e687de459ea37f5bef4fa7af6047c0af48ab3c98f390c6a")
        self.assertEqual(
            derive_directional_key(ZERO_KEY, "A2B", VECTOR_CONTEXT_HASH),
            keys.k_enc_a2b,
        )
        prefixes = derive_nonce_prefixes(keys, VECTOR_CONTEXT_HASH)
        self.assertEqual(prefixes.a2b.hex(), "ff54b8c0")
        self.assertEqual(prefixes.b2a.hex(), "bc58de4c")
        self.assertEqual(
            derive_nonce_prefix("A2B", keys.k_enc_a2b, VECTOR_CONTEXT_HASH),
            prefixes.a2b,
        )
        self.assertEqual(build_nonce(prefixes.a2b, 0).hex(), "ff54b8c00000000000000000")
        self.assertEqual(build_nonce(prefixes.b2a, 1).hex(), "bc58de4c0000000000000001")


class AeadTests(unittest.TestCase):
    def test_directional_aead_round_trip_replay_and_tampering(self):
        keys = derive_directional_keys(ZERO_KEY, VECTOR_CONTEXT_HASH)
        sender = DirectionalAead(keys.k_enc_a2b, VECTOR_CONTEXT_HASH, "A2B")
        receiver = DirectionalAead(keys.k_enc_a2b, VECTOR_CONTEXT_HASH, "A2B")
        aad = b"frame-header"
        plaintext = b"directional payload"

        first = sender.encrypt(plaintext, aad)
        self.assertEqual(first.nonce.hex(), "ff54b8c00000000000000000")
        self.assertEqual(
            first.ciphertext.hex(),
            "f364c6773f7f2c28eec8d1a8d54eab38296f83",
        )
        self.assertEqual(
            first.authentication_tag.hex(),
            "9106254d52869ba1d4d686befb66018f",
        )
        self.assertEqual(receiver.decrypt(first.ciphertext, first.authentication_tag, aad, first.nonce), plaintext)
        with self.assertRaises(AeadReplayError):
            receiver.decrypt(first.ciphertext, first.authentication_tag, aad, first.nonce)

        second = sender.encrypt(b"second", aad)
        self.assertEqual(second.nonce.hex(), "ff54b8c00000000000000001")
        self.assertEqual(receiver.decrypt(second.ciphertext, second.authentication_tag, aad), b"second")

        tampered = bytearray(second.ciphertext)
        tampered[0] ^= 1
        with self.assertRaises(AuthenticationError):
            receiver.decrypt(tampered, second.authentication_tag, aad)
        self.assertEqual(receiver.next_sequence_expected, 2)

    def test_aead_rejects_invalid_nonce_and_does_not_advance_on_failure(self):
        keys = derive_directional_keys(ZERO_KEY, VECTOR_CONTEXT_HASH)
        sender = DirectionalAead(keys.k_enc_a2b, VECTOR_CONTEXT_HASH, "A2B")
        receiver = DirectionalAead(keys.k_enc_a2b, VECTOR_CONTEXT_HASH, "A2B")
        output = sender.encrypt(b"payload", b"aad")

        with self.assertRaisesRegex(ValueError, "nonce"):
            receiver.decrypt(output.ciphertext, output.authentication_tag, b"aad", b"short")
        self.assertEqual(receiver.next_sequence_expected, 0)

        with self.assertRaises(AuthenticationError):
            receiver.decrypt(output.ciphertext, bytes(16), b"aad")
        self.assertEqual(receiver.next_sequence_expected, 0)
        self.assertEqual(
            receiver.decrypt(output.ciphertext, output.authentication_tag, b"aad"),
            b"payload",
        )

    def test_aead_rejects_exhausted_nonce_counter(self):
        keys = derive_directional_keys(ZERO_KEY, VECTOR_CONTEXT_HASH)
        aead = DirectionalAead(keys.k_enc_a2b, VECTOR_CONTEXT_HASH, "A2B")
        aead._next_sequence = 0xFFFFFFFFFFFFFFFF
        with self.assertRaisesRegex(ValueError, "nonce exhausted"):
            aead.encrypt(b"payload")


class SequenceTests(unittest.TestCase):
    def test_trace_matches_normative_vector(self):
        trace = trace_sequence([0, 1, 2, 3, 5, 4, 6, 5, 6])
        self.assertEqual(
            trace.outcomes,
            (True, True, True, True, False, True, False, True, True),
        )
        self.assertEqual(trace.accepted_count, 7)
        self.assertEqual(trace.final_next_expected_sequence, 7)
        self.assertTrue(trace.aborted)

    def test_strict_state_aborts_and_registry_is_per_sender(self):
        state = StrictSequenceState()
        self.assertEqual([state.try_accept(value) for value in range(4)], [True] * 4)
        self.assertEqual(state.expected_next_sequence, 4)
        self.assertFalse(state.try_accept(5))
        self.assertTrue(state.aborted)
        self.assertFalse(state.try_accept(4))
        with self.assertRaises(ProtocolAbortError):
            state.accept(4)

        registry = SenderSequenceRegistry()
        self.assertTrue(registry.try_accept("alice", 0))
        self.assertTrue(registry.try_accept("bob", 0))
        self.assertFalse(registry.try_accept("alice", 2))
        self.assertTrue(registry.try_accept("bob", 1))


class TranscriptTests(unittest.TestCase):
    def test_role_chains_and_context_hash(self):
        nonce_a = bytes.fromhex("00112233445566778899aabbccddeeff")
        nonce_b = bytes.fromhex("ffeeddccbbaa99887766554433221100")
        chain = TranscriptChain(nonce_a, nonce_b)
        self.assertEqual(
            chain.sid.hex(),
            "ef49150b2c15cdf7c6db8f653111a7d9651c58dab66ade314aee2a3d7a3c85d3",
        )
        self.assertEqual(chain.append("A", b"A0").hex(), "23c8753b173377f9058d78a4c8e6d87877494aa82be6194e3fdfc121967155db")
        self.assertEqual(chain.append("A", b"A1").hex(), "e6a1c5273771196edb90d478a0083d8633557edd8618c3390578b01965b7a39a")
        self.assertEqual(chain.append("B", b"B0").hex(), "e89136c1a457f68fb90f6d27401439496b147a9c39750c9e9a097fe74e0522dc")
        self.assertEqual(
            chain.context_hash().hex(),
            "27786ad49923e66e94b891c6fb6b28065df1dcfb759f62ae7ab0989b6a374729",
        )

    def test_compute_transcript_convenience_api(self):
        nonce_a = bytes.fromhex("00112233445566778899aabbccddeeff")
        nonce_b = bytes.fromhex("ffeeddccbbaa99887766554433221100")
        result = compute_transcript(
            nonce_a,
            nonce_b,
            messages_a=(b"A0", b"A1"),
            messages_b=(b"B0",),
        )
        self.assertEqual(result.sid.hex(), "ef49150b2c15cdf7c6db8f653111a7d9651c58dab66ade314aee2a3d7a3c85d3")
        self.assertEqual(result.h_a.hex(), "e6a1c5273771196edb90d478a0083d8633557edd8618c3390578b01965b7a39a")
        self.assertEqual(result.h_b.hex(), "e89136c1a457f68fb90f6d27401439496b147a9c39750c9e9a097fe74e0522dc")
        self.assertEqual(result.context_hash.hex(), "27786ad49923e66e94b891c6fb6b28065df1dcfb759f62ae7ab0989b6a374729")

    def test_published_session_id_vector(self):
        self.assertEqual(
            session_id(bytes(16), bytes([1]) * 16).hex(),
            "0e35a53871304db5962bedd5562462cf086ab5dd2fa0fdc00cf15902211feaa1",
        )


class BasisAndReceiverTests(unittest.TestCase):
    def test_basis_packing(self):
        self.assertEqual(pack_basis([0, 1, 2, 3]), 0xE4)
        self.assertEqual(pack_basis([0, 0, 0, 0]), 0x00)
        self.assertEqual(pack_basis([3, 3, 3, 3]), 0xFF)
        self.assertEqual(pack_basis([1, 2, 3, 0]), 0x39)
        with self.assertRaisesRegex(ValueError, "exactly four"):
            pack_basis([0, 1, 2])
        with self.assertRaisesRegex(ValueError, "basis"):
            pack_basis([0, 1, 2, 4])

    def test_receiver_enforces_authentication_then_sequence(self):
        receiver = ProtocolReceiver(ZERO_KEY)
        bootstrap = encode_bootstrap(0, b"bootstrap")
        classical_frame = sign_frame(
            ZERO_KEY,
            Frame(CLASSICAL_MESSAGE, 1, b"classical"),
        )
        classical = encode_frame(classical_frame)
        self.assertEqual(receiver.receive("alice", bootstrap).message_type, BOOTSTRAP_MESSAGE)
        self.assertEqual(receiver.receive("alice", classical).payload, b"classical")
        with self.assertRaises(ProtocolAbortError):
            receiver.receive("alice", classical)

        tamper_receiver = ProtocolReceiver(ZERO_KEY)
        self.assertEqual(tamper_receiver.receive("alice", bootstrap).message_type, BOOTSTRAP_MESSAGE)
        self.assertEqual(tamper_receiver.receive("alice", classical).payload, b"classical")
        next_frame = sign_frame(
            ZERO_KEY,
            Frame(CLASSICAL_MESSAGE, 2, b"next"),
        )
        tampered = bytearray(encode_frame(next_frame))
        tampered[7] ^= 1
        with self.assertRaises(AuthenticationError):
            tamper_receiver.receive("alice", tampered)
        self.assertEqual(tamper_receiver.receive("alice", encode_frame(next_frame)).payload, b"next")


class ValidationTests(unittest.TestCase):
    def test_rejects_invalid_lengths_directions_and_roles(self):
        with self.assertRaisesRegex(ValueError, "key"):
            compute_authentication_tag(b"short", Frame(CLASSICAL_MESSAGE, 0, b"data"))
        with self.assertRaisesRegex(ValueError, "HKDF"):
            hkdf_expand(b"prk", b"info", 0)
        with self.assertRaisesRegex(ValueError, "context_hash"):
            derive_directional_key(ZERO_KEY, "A2B", b"short")
        with self.assertRaisesRegex(ValueError, "direction"):
            derive_nonce_prefix("bad", ZERO_KEY, VECTOR_CONTEXT_HASH)
        with self.assertRaisesRegex(ValueError, "nonce prefix"):
            build_nonce(b"bad", 0)
        with self.assertRaisesRegex(ValueError, "seq64"):
            build_nonce(bytes(4), -1)
        with self.assertRaisesRegex(ValueError, "role"):
            TranscriptChain(bytes(16), bytes(16)).append("C", b"")


if __name__ == "__main__":
    unittest.main()
