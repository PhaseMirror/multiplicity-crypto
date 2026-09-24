#!/usr/bin/env node
// ADR-084 diff-vectors gate.
//
// Runs every vector in vectors/protocol.json through the TypeScript, Python,
// and Rust shipped paths and fails with a non-zero exit code if any language
// disagrees with the pinned expected values.
//
//   npm run diff-vectors              # gate
//   npm run diff-vectors -- --update  # regenerate manifest pins from protocol.ts, then gate
//
// The TypeScript gate is a vitest conformance suite
// (ts/src/__tests__/vectors-conformance.test.ts); the Python and Rust gates
// are dedicated executor binaries (py/scripts/vector_executor.py and
// rust/src/bin/vector_executor.rs).

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const tsDir = resolve(root, 'ts');
const pyDir = resolve(root, 'py');
const rustDir = resolve(root, 'rust');
const manifestPath = resolve(root, 'vectors/protocol.json');
const vitestBin = resolve(tsDir, 'node_modules/.bin/vitest');

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const languages = ['ts', 'py', 'rust'];
const failures = [];
const summary = {};

function normalize(value) {
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return String(value);
  return value;
}

function encodeInputs(inputs) {
  return Object.entries(inputs)
    .map(([key, value]) =>
      Array.isArray(value) ? `${key}:${value.join(',')}` : `${key}:${normalize(value)}`
    )
    .join('\t');
}

function encodeExpected(vector) {
  return Object.fromEntries(
    Object.entries(vector.expected).map(([key, value]) => [key, normalize(value)])
  );
}

function parseRustResults(output) {
  const results = new Map();
  for (const row of output.trim().split('\n')) {
    if (row.length === 0) continue;
    const parts = row.split('\t').filter((part) => part.length > 0);
    const id = parts[0];
    const outputs = {};
    for (const part of parts.slice(1)) {
      const [key, ...rest] = part.split(':');
      outputs[key] = rest.join(':');
    }
    results.set(id, outputs);
  }
  return results;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} exited with ${result.status}\n${result.stdout}${result.stderr}`
    );
  }
  return result;
}

function compareVector(language, vector, expected, actual) {
  const normalized = Object.fromEntries(
    Object.entries(actual).map(([key, value]) => [key, String(value)])
  );
  let matched = true;
  for (const key of Object.keys(expected)) {
    if (normalized[key] !== expected[key]) {
      failures.push(
        `[${language}] ${vector.id}: ${key} expected ${expected[key]}, got ${String(normalized[key])}`
      );
      matched = false;
    }
  }
  for (const key of Object.keys(normalized)) {
    if (!(key in expected)) {
      failures.push(`[${language}] ${vector.id}: unexpected output key ${key}`);
      matched = false;
    }
  }
  return matched;
}

const updateMode = process.argv.includes('--update');

// --update: regenerate the manifest pins from the canonical reference
// (protocol.ts), then continue to gate every language against the new pins.
if (updateMode) {
  run(vitestBin, ['run', 'src/__tests__/vectors-conformance.test.ts'], {
    cwd: tsDir,
    env: { ...process.env, DIFF_VECTORS_UPDATE: '1' }
  });
}

// TypeScript gate: the conformance suite checks every vector against
// protocol.ts (the canonical reference); a non-zero exit aborts the gate.
run(vitestBin, ['run', 'src/__tests__/vectors-conformance.test.ts'], { cwd: tsDir });
summary.ts = manifest.vectors.length;

// Python gate.
{
  const executor = resolve(pyDir, 'scripts/vector_executor.py');
  const result = run('python3', [executor, manifestPath], {
    env: { ...process.env, PYTHONPATH: pyDir }
  });
  const outputs = JSON.parse(result.stdout);
  let passed = 0;
  for (const vector of manifest.vectors) {
    if (compareVector('py', vector, encodeExpected(vector), outputs[vector.id] ?? {})) {
      passed += 1;
    }
  }
  summary.py = passed;
}

// Rust gate (fed the encoded inputs on stdin so no JSON crate is required).
{
  const inputLines = manifest.vectors
    .map((vector) => `${vector.id}\t${vector.operation}\t${encodeInputs(vector.inputs)}`)
    .join('\n');
  const result = run(
    'cargo',
    [
      'run',
      '--quiet',
      '--manifest-path',
      resolve(rustDir, 'Cargo.toml'),
      '--bin',
      'vector_executor'
    ],
    { cwd: rustDir, input: inputLines }
  );
  const outputs = parseRustResults(result.stdout);
  let passed = 0;
  for (const vector of manifest.vectors) {
    if (compareVector('rust', vector, encodeExpected(vector), outputs.get(vector.id) ?? {})) {
      passed += 1;
    }
  }
  summary.rust = passed;
}

for (const language of languages) {
  process.stdout.write(
    `${language} gate: ${summary[language]}/${manifest.vectors.length} vectors matched\n`
  );
}

if (failures.length > 0) {
  process.stdout.write('\nvector mismatches:\n');
  for (const failure of failures) {
    process.stdout.write(`  ${failure}\n`);
  }
  process.exit(1);
}
process.exit(0);