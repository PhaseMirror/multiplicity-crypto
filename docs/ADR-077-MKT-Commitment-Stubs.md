# ADR-077: mkt_commitment.py — Stub or Remove Missing Modules

- **Status**: Accepted
- **Deciders**: Python owner, Crate maintainer
- **Date**: 2026-09-22
- **Companion**: PHASE_MIRROR_AUDIT.md §3 row 37, §5 row 7
- **Supersedes**: `py/multiplicity/mkt/mkt_commitment.py` imports

## Context

`py/multiplicity/mkt/mkt_commitment.py` contains:
```python
from multiplicity.mkt.mkt_colored_braid import ColoredBraid
from multiplicity.mkt.mkt_constants_estimation import estimate_constants
from multiplicity.mkt.mkt_invariant import InvariantPolynomial
```

These three modules **do not exist on disk**. The MBC (Multiplicity Braid Commitment) prototype is non-functional without them.

The README claims "4 Python modules" including `mkt_commitment.py` as "MBC prototype over braid/invariant payloads" but the prototype cannot even import.

## Decision

1. **Either create minimal stubs for the three missing modules OR remove `mkt_commitment.py` and its references.**

2. **If stubbing (minimal approach):**
   - Create `py/multiplicity/mkt/mkt_colored_braid.py` with `ColoredBraid` class (stub)
   - Create `py/multiplicity/mkt/mkt_constants_estimation.py` with `estimate_constants` function (stub)
   - Create `py/multiplicity/mkt/mkt_invariant.py` with `InvariantPolynomial` class (stub)
   - Each stub must have a clear docstring: "NOT IMPLEMENTED — MBC prototype placeholder"

3. **If removing (recommended):**
   - Delete `py/multiplicity/mkt/mkt_commitment.py`
   - Remove `from . import mkt` from `py/multiplicity/__init__.py:31`
   - Update README Python Module Map to reflect actual modules

4. **The MBC prototype is explicitly research-grade.** No production claim is made. Stubs are acceptable if clearly marked.

## Consequences

- `python3 -c "import multiplicity.mkt"` no longer fails on missing imports
- If stubbed: MBC prototype imports but functions are no-ops
- If removed: One less dead module in the package surface
- README accurately reflects importable modules

## Testing

- `python3 -c "import multiplicity.mkt"` exits 0
- If stubbed: `python3 -c "from multiplicity.mkt.mkt_commitment import ColoredBraid"` exits 0
- `grep -r "mkt_colored_braid\|mkt_constants_estimation\|mkt_invariant" py/` returns only stub definitions (if stubbed) or 0 (if removed)

## References

- PHASE_MIRROR_AUDIT.md §3 row 37, §5 row 7
- `py/multiplicity/mkt/mkt_commitment.py`
- `py/multiplicity/__init__.py` line 31
- README.md Python Module Map