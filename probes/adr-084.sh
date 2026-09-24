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
echo "PASS ADR-084: diff-vectors 14/14 per language"