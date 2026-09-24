#!/usr/bin/env bash
# ADR-085 probe: no committed BN254 wasm artifact (removed @ 660fc3d);
# if a wasm were committed again it must be loaded-with-test — a tracked
# artifact without a loading test is a REJ.
set -u
cd "$(dirname "${BASH_SOURCE[0]}")/.."
tracked=$(git ls-files | grep -E '\.wasm$' || true)
if [ -n "$tracked" ]; then
  echo "FAIL ADR-085: committed wasm artifact present without retiring decision:"
  printf '%s\n' "$tracked" | sed 's/^/  /'
  exit 1
fi
echo "PASS ADR-085: no committed wasm artifact"