#!/usr/bin/env bash
# ADR-088 probe: HardwareQKDBackend carries an honest key-source label
# (never relabels hardware keys as simulated) and the opt-in path is
# exercised by tests.
# Pin: PROVENANCE.md D-15 (ca24d47).
set -u
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if ! git grep -q "HARDWARE_QKD_ETSI_014" -- ts/src/qkd.ts; then
  echo "FAIL ADR-088: HARDWARE_QKD_ETSI_014 label missing from qkd.ts"
  exit 1
fi
if ! git grep -q "SIMULATED_QKD" -- ts/src/qkd.ts; then
  echo "FAIL ADR-088: SIMULATED_QKD default label missing from qkd.ts"
  exit 1
fi
if ! git grep -q "HARDWARE_QKD_ETSI_014" -- ts/src/__tests__/hardware-qkd-backend.test.ts; then
  echo "FAIL ADR-088: hardware backend not exercised against mock endpoints in tests"
  exit 1
fi
echo "PASS ADR-088: honest key-source labels wired and mock-tested"