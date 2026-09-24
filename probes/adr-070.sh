#!/usr/bin/env bash
# ADR-070 probe: commitment.ts header describes the SHA-256 PM-tagged
# mechanism; no "Pedersen"/"WASM-backed" capability claim (ADR-070 #3, ADR-085).
# Pin: PROVENANCE.md A.shipped (a3d91d1).
set -u
cd "$(dirname "${BASH_SOURCE[0]}")/.."
head6=$(git show HEAD:ts/src/commitment.ts | sed -n '1,6p')
if printf '%s\n' "$head6" | grep -qE "Pedersen|WASM-backed"; then
  echo "FAIL ADR-070: header claims Pedersen / WASM-backed"
  exit 1
fi
if ! printf '%s\n' "$head6" | grep -q "PM-COMMIT"; then
  echo "FAIL ADR-070: header lacks SHA-256 / PM-COMMIT description"
  exit 1
fi
echo "PASS ADR-070: header is SHA-256 / PM-COMMIT, no Pedersen/WASM-backed claim"