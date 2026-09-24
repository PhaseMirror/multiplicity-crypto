#!/usr/bin/env bash
# ADR-091: conformance gate runner. Executes every probes/adr-*.sh probe;
# a failing probe blocks merge (ADR-091 #3). The register that pins each
# probe is PROVENANCE.md (ADR-090). Run from anywhere; resolves repo root.
set -u
cd "$(dirname "${BASH_SOURCE[0]}")/.."
total=0 passed=0 failed=0
for p in probes/adr-*.sh; do
  name=$(basename "$p" .sh)
  total=$((total + 1))
  out=$(bash "$p" 2>&1)
  rc=$?
  printf '[%s] %s\n' "$name" "$out"
  if [ "$rc" -eq 0 ]; then
    passed=$((passed + 1))
  else
    echo "[$name] GATE FAILED"
    failed=$((failed + 1))
  fi
done
echo "---"
echo "conformance: $passed/$total probes passed"
[ "$failed" -eq 0 ]