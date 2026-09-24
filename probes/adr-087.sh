#!/usr/bin/env bash
# ADR-087 probe: Lean proof surface clean — no sorry/axiom/admit and the
# .sorry-allowlist ratchet passes.
# Pin: PROVENANCE.md A.claimed (98990a8).
set -u
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if git grep -nE "sorry|axiom|admit" -- lean/MultiplicityCrypto; then
  echo "FAIL ADR-087: sorry/axiom/admit present in lean/MultiplicityCrypto"
  exit 1
fi
if ! bash scripts/check-sorry-allowlist.sh >/dev/null 2>&1; then
  echo "FAIL ADR-087: scripts/check-sorry-allowlist.sh ratchet"
  exit 1
fi
echo "PASS ADR-087: no sorry/axiom in lean, allowlist ratchet exits 0"