#!/usr/bin/env bash
# ADR-084 probe: differential conformance gate — shipped vectors match
# across TS, Python, and Rust (14/14 each).
# Pin: PROVENANCE.md A.gate (9993912).
set -u
cd "$(dirname "${BASH_SOURCE[0]}")/.."
out=$(cd ts && npm run diff-vectors 2>&1)
if ! printf '%s\n' "$out" | grep -qF "ts gate: 14/14 vectors matched"; then
  echo "FAIL ADR-084: TS diff-vectors gate"
  exit 1
fi
if ! printf '%s\n' "$out" | grep -qF "py gate: 14/14 vectors matched"; then
  echo "FAIL ADR-084: Python diff-vectors gate"
  exit 1
fi
if ! printf '%s\n' "$out" | grep -qF "rust gate: 14/14 vectors matched"; then
  echo "FAIL ADR-084: Rust diff-vectors gate"
  exit 1
fi
echo "PASS ADR-084: diff-vectors 14/14 per language (TS/Py/Rust; Lean excluded —"
echo "  Lean emits no concrete digests (Digest := Bytes, abstract Hash structure), so"
echo "  ADR-084's own 'and Lean once it can emit digests (ADR-087)' condition is unmet)"
echo "  vector scope: 6 specified + 8 shipped cover the shipped SHA-256/HKDF-SHA256/AES-256-GCM"
echo "  path; no commitment op exists in vectors/protocol.json — PM-COMMIT is NOT vector-covered)"