#!/usr/bin/env bash
# ADR-090 probe: PROVENANCE.md exists, is committed with the tree it
# describes, and no build-artifact directory is tracked (each is either
# ignored or removed).
# Pin: PROVENANCE.md (c7ea22e).
set -u
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if [ ! -f PROVENANCE.md ]; then
  echo "FAIL ADR-090: PROVENANCE.md missing"
  exit 1
fi
if ! git diff --exit-code -- PROVENANCE.md >/dev/null 2>&1; then
  echo "FAIL ADR-090: PROVENANCE.md not committed with the tree it describes"
  exit 1
fi
if [ "$(git ls-files rust/target/ | wc -l)" -ne 0 ] || [ "$(git ls-files .lake/ | wc -l)" -ne 0 ]; then
  echo "FAIL ADR-090: rust/target or .lake is tracked"
  exit 1
fi
echo "PASS ADR-090: PROVENANCE.md committed and clean; build artifacts untracked"