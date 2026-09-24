#!/usr/bin/env bash
# ADR-069 probe: the crate must not be labeled "QKD Hybrid Encryption".
# Pin: PROVENANCE.md D-12 (header @ 3d49da5, corrected ADR-086 @ a3d91d1).
set -u
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if git grep -n "QKD Hybrid Encryption" -- README.md ts/package.json py/multiplicity/crypto/__init__.py; then
  echo "FAIL ADR-069: 'QKD Hybrid Encryption' label present"
  exit 1
fi
echo "PASS ADR-069: no 'QKD Hybrid Encryption' label"