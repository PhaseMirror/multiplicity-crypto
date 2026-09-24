#!/usr/bin/env bash
# ADR-076 probe: the Python crypto_bridge is removed (no shim imports).
set -u
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if git grep -nE "crypto_bridge\.js|DIST_ENTRY_PATH|BRIDGE_SCRIPT_PATH" -- py/multiplicity; then
  echo "FAIL ADR-076: crypto bridge shim references present"
  exit 1
fi
echo "PASS ADR-076: no crypto_bridge.js / DIST_ENTRY_PATH / BRIDGE_SCRIPT_PATH"