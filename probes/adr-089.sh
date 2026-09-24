#!/usr/bin/env bash
# ADR-089 probe: pirtm declared as optional dep; the ACE integration test
# skips via importorskip when pirtm is absent; MKT stub markers are
# explicit and the degenerate MBC 0.0 path raises.
# Pin: PROVENANCE.md D-17 (7832f42).
set -u
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if ! git grep -q 'pirtm' -- py/setup.py; then
  echo "FAIL ADR-089: pirtm not declared in py/setup.py"
  exit 1
fi
if ! git grep -q 'importorskip("pirtm")' -- py/multiplicity/cert/test_ace_crypto_integration.py; then
  echo "FAIL ADR-089: test_ace_crypto_integration.py lacks importorskip guard"
  exit 1
fi
n=$(git grep -c "NOT IMPLEMENTED — MBC prototype placeholder" -- py/multiplicity/mkt | wc -l)
if [ "$n" -lt 3 ]; then
  echo "FAIL ADR-089: fewer than 3 MKT stub modules carry the placeholder marker"
  exit 1
fi
if ! git grep -q "NotImplementedError" -- py/multiplicity/mkt/mkt_commitment.py; then
  echo "FAIL ADR-089: mkt_commitment.commit() lacks the degenerate-path guard"
  exit 1
fi
echo "PASS ADR-089: pirtm optional dep, importorskip, MKT markers, degenerate guard"