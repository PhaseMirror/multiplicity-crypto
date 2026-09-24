#!/usr/bin/env bash
# ADR-087 probe: Lean proof surface clean — no sorry/axiom/admit in ANY
# tracked *.lean source (not just lean/MultiplicityCrypto/; a scratch file in
# the committed tree is a contradiction), and the .sorry-allowlist ratchet
# passes with a numeric N.
# Pin: PROVENANCE.md A.claimed (98990a8).
set -u
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if git grep -nE "sorry|axiom|admit" -- 'lean/*.lean' 'lean/**/*.lean'; then
  echo "FAIL ADR-087: sorry/axiom/admit present in tracked lean sources"
  exit 1
fi
out=$(bash scripts/check-sorry-allowlist.sh 2>&1) || {
  echo "FAIL ADR-087: scripts/check-sorry-allowlist.sh ratchet"
  exit 1
}
printf '%s\n' "$out" | grep -qE "PASS: sorry ratchet N=0, occurrences=0" || {
  echo "FAIL ADR-087: ratchet not at N=0 (expected numeric N=0, occurrences=0)"
  exit 1
}
echo "PASS ADR-087: 0 sorry/axiom in tracked lean; allowlist ratchet N=0, occurrences=0"