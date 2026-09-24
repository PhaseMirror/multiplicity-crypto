#!/usr/bin/env bash
# ADR-091 self-probe: the probes/ gate itself is present, executable, and
# runs clean (the probe that guards the guard).
#
# Meta-probes:
#   (i)  source-inventory gate — every tracked source/test file under the
#        enumerated roots (ts/src/, py/, rust/src/, lean/) MUST have a
#        registration row in probes/inventory.txt, and every row must still be
#        tracked. Adding a module without registering it (and so without an ADR
#        decision) fails the gate.
#   (ii) governance gate — every probe (probes/adr-NNN.sh) AND every ADR cited
#        in probes/inventory.txt must resolve to a docs/ADR-NNN-*.md whose
#        status is Accepted. New code therefore resolves to accepted doctrine,
#        or the change must carry the amendment/addition first: the mechanism
#        behind "code that contradicts an accepted ADR requires an amendment or
#        revert" is a command, not a preference.
# Pin: PROVENANCE.md A.gate (9993912) + G.register (65fd862) + H (governance).
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

# (ii) governance: probe scripts and inventory ADR citations must resolve to
# Accepted ADR docs.
is_accepted() {
  local tok=$1 doc
  doc=$(git ls-files "docs/$tok-*" | head -1)
  [ -n "$doc" ] || { echo "  $tok has no docs/$tok-*.md"; return 1; }
  git show "HEAD:$doc" | grep -q -- '- \*\*Status\*\*: Accepted' || {
    echo "  $tok ($doc) is not Accepted"; return 1; }
}
govfail=0
for num in $(git ls-files 'probes/adr-0??.sh' | sed -nE 's#probes/adr-(0[0-9]+)\.sh#\1#p' | sort -u); do
  if ! is_accepted "ADR-$num"; then govfail=1; echo "FAIL ADR-091: probe adr-$num does not resolve to an Accepted ADR"; fi
done
for tok in $(grep -oE 'ADR-[0-9]{3}' probes/inventory.txt | sort -u); do
  if ! is_accepted "$tok"; then govfail=1; echo "FAIL ADR-091: inventory citation $tok does not resolve to an Accepted ADR"; fi
done
if [ "$govfail" -ne 0 ]; then exit 1; fi

echo "PASS ADR-091: probes/ gate registered ($n probe scripts; $(printf '%s\n' "$tracked" | wc -l) source files registered in inventory)"
echo "  source-inventory gate: any new file under ts/src py/ rust/src/ lean/ requires a register row"
echo "  governance gate: every probe and every inventory ADR citation resolves to an Accepted ADR"