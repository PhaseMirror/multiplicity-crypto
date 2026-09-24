#!/usr/bin/env bash
# ADR-074 probe: no "computed on commit" placeholder text in tracked sources.
set -u
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if git grep -n "computed on commit" -- '*.java' '*.ts' '*.js' '*.py' '*.rs' '*.lean'; then
  echo "FAIL ADR-074: 'computed on commit' placeholder present"
  exit 1
fi
echo "PASS ADR-074: no 'computed on commit' placeholder"