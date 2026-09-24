#!/usr/bin/env bash
# ADR-078 probe: tsconfig types must not include jest (vitest is the runner).
set -u
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if git grep -n "jest" -- ts/tsconfig.json; then
  echo "FAIL ADR-078: 'jest' present in ts/tsconfig.json types"
  exit 1
fi
echo "PASS ADR-078: no 'jest' in ts/tsconfig.json"