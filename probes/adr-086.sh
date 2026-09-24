#!/usr/bin/env bash
# ADR-086 probe: commitment.ts header corrected; no stale "QKD Hybrid
# Encryption" retitle in ts/src; PM-COMMIT SHA-256 mechanism described.
# Pin: PROVENANCE.md D-12 (a3d91d1).
set -u
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if git grep -n "QKD Hybrid Encryption" -- ts/src; then
  echo "FAIL ADR-086: stale 'QKD Hybrid Encryption' in ts/src"
  exit 1
fi
if ! git grep -q "PM-COMMIT" -- ts/src/commitment.ts; then
  echo "FAIL ADR-086: PM-COMMIT mechanism missing from commitment.ts"
  exit 1
fi
echo "PASS ADR-086: commitment.ts is SHA-256 / PM-COMMIT, no stale retitle"