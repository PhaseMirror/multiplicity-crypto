#!/usr/bin/env bash
# ADR-087: `lake build` warning policy is a ratchet, not a toggle.
#
# Fails on any of:
#   (i)   total `sorry` count in lean/MultiplicityCrypto/ > N (N = non-comment
#         lines of lean/.sorry-allowlist);
#   (ii)  a `sorry` inside a declaration not listed in the allowlist (new gap);
#   (iii) an allowlist entry with no matching `sorry` (stale entry = hard
#         failure, forcing the ratchet down);
#   (iv)  any `axiom` declaration or `admit` in the shipped module.
#
# The only legal direction of change is N -> 0. Never add an allowlist line.
set -euo pipefail

cd "$(dirname "$0")/.."

MODULE_DIR="lean/MultiplicityCrypto"
ALLOWLIST_FILE="lean/.sorry-allowlist"
fail=0

if [ ! -f "$ALLOWLIST_FILE" ]; then
  echo "FAIL: missing $ALLOWLIST_FILE" >&2
  exit 1
fi

# Allowlist symbols: non-comment, non-blank lines.
mapfile -t allow < <(grep -vE '^\s*(#|$)' "$ALLOWLIST_FILE" || true)
n=${#allow[@]}

# (iv) no axiom declarations / admit anywhere in the shipped module.
if grep -rnE '^\s*(axiom|axioms)\b' "$MODULE_DIR" >/dev/null 2>&1; then
  echo "FAIL: axiom declaration found in $MODULE_DIR:" >&2
  grep -rnE '^\s*(axiom|axioms)\b' "$MODULE_DIR" >&2
  fail=1
fi
if grep -rnwE 'admit' "$MODULE_DIR" >/dev/null 2>&1; then
  echo "FAIL: 'admit' found in $MODULE_DIR:" >&2
  grep -rnwE 'admit' "$MODULE_DIR" >&2
  fail=1
fi

# Collect sorry sites: file:line -> nearest preceding declaration name.
declare -a sorry_syms=()
while IFS=: read -r file line _; do
  sym=$(awk -v n="$line" '
    /^(theorem|lemma|def|abbrev|instance|example) / {
      name=$2; sub(/.*\./, "", name); sub(/[^A-Za-z0-9_.].*/, "", name)
      last=name
    }
    NR==n { print last; exit }
  ' "$file")
  sorry_syms+=("${sym:-<unknown>:$file:$line}")
done < <(grep -rnwE 'sorry' "$MODULE_DIR" 2>/dev/null || true)

total=${#sorry_syms[@]}

# (i) total count must not exceed N.
if [ "$total" -gt "$n" ]; then
  echo "FAIL: $total sorry occurrence(s) > allowlist N=$n:" >&2
  printf '  %s\n' "${sorry_syms[@]}" >&2
  fail=1
fi

# (ii) every sorry must be on the allowlist.
for sym in "${sorry_syms[@]}"; do
  if ! printf '%s\n' "${allow[@]:-}" | grep -qxF "$sym"; then
    echo "FAIL: sorry in declaration not on allowlist: $sym" >&2
    fail=1
  fi
done

# (iii) no stale allowlist entries.
for a in "${allow[@]:-}"; do
  [ -z "$a" ] && continue
  if ! printf '%s\n' "${sorry_syms[@]:-}" | grep -qxF "$a"; then
    echo "FAIL: stale allowlist entry (its sorry is gone): $a" >&2
    fail=1
  fi
done

if [ "$fail" -ne 0 ]; then
  exit 1
fi
echo "PASS: sorry ratchet N=$n, occurrences=$total (ADR-087)"
