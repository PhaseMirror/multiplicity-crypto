#!/usr/bin/env bash
# ADR-083 probe: no claim that this crate's BN254/SHA-256/PM-COMMIT
# commitments are post-quantum or quantum-resistant (ADR-083 #5). Honest
# negation lines ("... is NOT post-quantum") are allowed.
# Scoped to review surface: README, SOURCES, source headers (the .tex papers
# and ADR docs legitimately discuss PQ contexts; they are not capability claims).
set -u
cd "$(dirname "${BASH_SOURCE[0]}")/.."
hits=$(git grep -nE "post.?quantum|quantum.?resistant" -- README.md SOURCES.md 'ts/src/*' 'py/*' 'rust/src/*' 2>/dev/null)
viol=$(printf '%s\n' "$hits" | grep -E "BN254|commitment|Pedersen" | grep -viE "[Nn]ot|[Nn]ever" || true)
if [ -n "$viol" ]; then
  echo "FAIL ADR-083: PQ capability claim for a commitment mechanism:"
  printf '%s\n' "$viol" | sed 's/^/  /'
  exit 1
fi
echo "PASS ADR-083: no post-quantum/quantum-resistant claim for BN254 or commitments"