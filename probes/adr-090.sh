#!/usr/bin/env bash
# ADR-090 probe: PROVENANCE.md exists, is committed with the tree it
# describes, and the artifact denylist is empty in the index. The denylist
# sweep is a gate: it covers every artifact class this repo has ever shipped
# tracked, so a silent return of rust/target, node_modules, __pycache__,
# egg-info, or wasm fails the probe even though each was "git-ignored" at the
# time (tracked files are invisible to git check-ignore).
#
# Denylist-by-design: the enumerated classes are the past; a binary-extension
# sweep (below) additionally catches NEW binary classes without enumeration,
# and the adr-091 inventory gate forces registration of any tracked file under
# the code roots. Residual escapes are recorded in PROVENANCE.md B.
# Pin: PROVENANCE.md B (c7ea22e, denylist extended by round-3 hardening).
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
viol=$(git ls-files | grep -E '(^|/)(rust/target|\.lake|node_modules|__pycache__|ts/dist|rust/pkg)/|[^/]*\.egg-info/' || true)
viol="$viol$(git ls-files '*.wasm' '*.pyc' '*.pyo' '*.egg-link' | sed 's/^/ /')"
viol="$viol$(git ls-files | grep -E '\.(so|dylib|dll|exe|class|jar|a|o|profraw|profdata|tgz)$' | sed 's/^/ /')"
if [ -n "$(printf '%s' "$viol" | tr -s ' ' | sed '/^$/d')" ]; then
  echo "FAIL ADR-090: tracked artifact paths present in the index:"
  printf '  %s\n' "$viol"
  exit 1
fi
echo "PASS ADR-090: PROVENANCE.md committed and clean; artifact denylist empty"
echo "  denylist: rust/target .lake node_modules __pycache__ *.egg-info ts/dist rust/pkg *.wasm *.pyc"
echo "  binary-ext sweep: *.so *.dylib *.dll *.exe *.class *.jar *.a *.o *.profraw *.profdata *.tgz"