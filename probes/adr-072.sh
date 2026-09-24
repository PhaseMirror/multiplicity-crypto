#!/usr/bin/env bash
# ADR-072 probe: vitest runner declared and configured with globals.
set -u
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if ! git show HEAD:ts/package.json | grep -q '"vitest"'; then
  echo "FAIL ADR-072: vitest not declared in ts/package.json"
  exit 1
fi
if ! git show HEAD:ts/vitest.config.ts | grep -q 'globals: true'; then
  echo "FAIL ADR-072: vitest.config.ts lacks 'globals: true'"
  exit 1
fi
echo "PASS ADR-072: vitest + globals configured"