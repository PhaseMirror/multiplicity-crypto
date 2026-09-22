# ADR-075: Rust Cargo.toml — Remove Empty Boilerplate Sections

- **Status**: Accepted
- **Deciders**: Rust owner, Crate maintainer
- **Date**: 2026-09-22
- **Companion**: PHASE_MIRROR_AUDIT.md §1 row 8, §3 "What Is Broken" row 38
- **Supersedes**: `rust/Cargo.toml` lines 24-28 (empty `[workspace]` and `[dev-dependencies]`)

## Context

`rust/Cargo.toml` contains:
```toml
[dev-dependencies]
wasm-bindgen-test = "0.3"

[workspace]

[lints.rust]
unexpected_cfgs = { level = "warn", check-cfg = ['cfg(kani)'] }
```

Issues:
1. `[workspace]` is empty — a no-op in a single-crate setup. Only needed if this crate is part of a Cargo workspace with multiple members.
2. `[dev-dependencies]` declares `wasm-bindgen-test` but the crate has **no integration tests** using it (only 2 unit tests in `transcript.rs` using standard `#[test]`).
3. The crate declares `crate-type = ["cdylib", "rlib"]` for WASM but no `wasm-pack` build has been run.

## Decision

1. **Remove the empty `[workspace]` table** — it serves no purpose in a single-crate package.

2. **Either:**
   a. Remove `[dev-dependencies]` entirely (since `wasm-bindgen-test` is unused), OR
   b. Add actual integration tests that use `wasm-bindgen-test` if WASM testing is planned.

3. **If WASM is not currently built**, consider removing `wasm-bindgen` and `getrandom` (with `js` feature) from `[dependencies]` unless they're used in `lib.rs` (currently only `transcript.rs` exists, which uses `sha3` only).

4. **Keep `[lints.rust]`** — it's valid for the kani verification configuration.

## Consequences

- `cargo clippy` and `cargo check` run without warnings about empty tables
- Cargo.toml accurately reflects the crate's actual structure
- No misleading boilerplate for future contributors

## Testing

- `cd rust && cargo check` passes with no warnings about empty workspace
- `cd rust && cargo clippy` passes
- `grep -c "workspace" rust/Cargo.toml` returns 0 (or 1 if comment only)
- `grep "wasm-bindgen-test" rust/Cargo.toml` returns 0 unless integration tests added

## References

- PHASE_MIRROR_AUDIT.md §1 row 8, §3 row 38
- `rust/Cargo.toml` lines 1-30
- TEST_RESULTS.md §17