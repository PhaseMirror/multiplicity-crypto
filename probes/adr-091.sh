#!/usr/bin/env bash
# ADR-091 self-probe: the probes/ gate itself is present, executable, and
# runs clean (the probe that guards the guard).
#
# Meta-probe: source-inventory gate. Every tracked source/test file under the
# enumerated roots (ts/src/, py/, rust/src/, lean/) MUST have a registration
# row in probes/inventory.txt, and every inventory row must still be tracked.
# Adding a module without registering it (and so without an ADR decision)
# fails the gate — the process rule behind "code that contradicts an accepted
# ADR requires an amendment or revert".
# Pin: PROVENANCE.md A.gate (9993912) + G.register (this commit).
set -u
cd "$(dirname "${BASH_SOURCE[0]}")/.."
[ -f probes/run-all.sh ] || { echo "FAIL ADR-091: probes/run-all.sh missing"; exit 1; }
[ -x probes/run-all.sh ] || { echo "FAIL ADR-091: probes/run-all.sh not executable"; exit 1; }
n=$(git ls-files 'probes/*.sh' | wc -l)
if [ "$n" -lt 15 ]; then
  echo "FAIL ADR-091: fewer than expected probe scripts tracked (got $n)"
  exit 1
fi

ROOTS=('ts/src/' 'py/' 'rust/src/' 'lean/')
tracked=$(git ls-files -- "${ROOTS[@]}" | sort)
inventory=$(grep -vE '^\s*(#|$)' probes/inventory.txt | awk '{print $1}' | sort -u)

missing=$(comm -23 <(printf '%s\n' "$tracked") <(printf '%s\n' "$inventory"))
if [ -n "$missing" ]; then
  echo "FAIL ADR-091: tracked source not registered in probes/inventory.txt:"
  printf '  %s\n' "$missing"
  exit 1
fi
stale=$(comm -13 <(printf '%s\n' "$tracked") <(printf '%s\n' "$inventory"))
if [ -n "$stale" ]; then
  echo "FAIL ADR-091: inventory row no longer tracked (stale entry):"
  printf '  %s\n' "$stale"
  exit 1
fi

echo "PASS ADR-091: probes/ gate registered ($n probe scripts; $(printf '%s\n' "$tracked" | wc -l) source files registered in inventory)"
echo "  source-inventory gate: any new file under ts/src py/ rust/src/ lean/ requires a register row"