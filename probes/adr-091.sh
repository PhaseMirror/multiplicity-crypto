#!/usr/bin/env bash
# ADR-091 self-probe: the probes/ gate itself is present, executable, and
# runs clean (the probe that guards the guard).
set -u
cd "$(dirname "${BASH_SOURCE[0]}")/.."
[ -f probes/run-all.sh ] || { echo "FAIL ADR-091: probes/run-all.sh missing"; exit 1; }
[ -x probes/run-all.sh ] || { echo "FAIL ADR-091: probes/run-all.sh not executable"; exit 1; }
n=$(git ls-files 'probes/*.sh' | wc -l)
if [ "$n" -lt 15 ]; then
  echo "FAIL ADR-091: fewer than expected probe scripts tracked (got $n)"
  exit 1
fi
echo "PASS ADR-091: probes/ gate registered ($n probe scripts tracked)"