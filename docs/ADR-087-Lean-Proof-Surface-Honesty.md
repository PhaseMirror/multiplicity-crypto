# ADR-087: Lean Proof-Surface Honesty — `sorry` and Axioms May Not Ship

- **Status**: Accepted
- **Deciders**: Formal Methods steward, Crate maintainer, Kernel owner
- **Date**: 2026-09-24
- **Companion**: Phase Mirror Round 2 (D-14); ADR-074 (F-MC-05 spirit applied to proofs); LawfulRecursionVersion 1.0 Core fragment
- **Supersedes**: None (extends F-MC-05 from placeholder *hashes* to placeholder *proofs*)
- **Blocks**: None

## Context

The `lean/` module was added after ADR-068..083 and is unregistered by every README/SOURCES/ADR. It ships a Lean 4 formalization (`lean/MultiplicityCrypto/Protocol.lean`, 299 lines) with:

| Location | Kind | Content |
|----------|------|---------|
| `Protocol.lean:282` | `sorry` | `contractivityBound_strict` — the L0 gate inequality proof ADR-073 wanted |
| `Protocol.lean:284-285` | `axiom` | `getPrimeAtIndex : Nat → Nat` + `getPrimeAtIndex_inj : ∀ {n m}, getPrimeAtIndex n = getPrimeAtIndex m → n = m` |
| `Protocol.lean:290-291` | `sorry` | `domainTag_prime_inj` |
| `test.lean:13,15-16,22` | `sorry`/`axiom` | duplicate, unbuilt scratch file |
| `.lake/build/` | build artifacts | committed; trace records `sorry` warnings at Protocol.lean:278,290 |

The build `lake build` succeeds with **`sorry` warnings**; no CI gate treats a warning as failure.

**Two concrete soundness problems**:

1. `domainTag_prime_inj` is **false as stated**. `domainTag p = [0x50,0x4D] ++ be32 p` and `be32(value) = [byte(v/16777216), byte(v/65536), byte(v/256), byte v]` with `byte n = n % 256` **wraps** — `be32 p = be32 (p + 2^32·k)` for large `k`. Injectivity over `Nat` requires a bound (`p < 2^32`) that the theorem does not state. The proof cannot be completed without changing the statement.
2. `getPrimeAtIndex_inj` is an **axiom, not a theorem**. `getPrimeAtIndex` is a bare unconstrained axiom; a Free Variable plus an injectivity axiom can be *added* consistently only because the axiom set is chosen so — but nothing in Lean constrains `getPrimeAtIndex` to be a prime-sequence or injective, so the axiom is a free assumption dressed as a lemma. Any downstream theorem depending on it inherits an unproven premise.
3. `lean/test.lean` duplicates the same `sorry`s and is **not part of the lakefile roots** (`roots := #[\`MultiplicityCrypto.Protocol]`) — unbuilt, unverified, and invisible to `lake build`.

**The crate's own rule extended**: F-MC-05 says *a placeholder is not a hash; empty brackets are not a digest*. By parity: **a `sorry` is not a proof; an unconstrained axiom is not a definition.** ADR-073 required "test coverage OR stop citing c < 1" — a Lean `sorry` covering `contractivityBound_strict` satisfies neither branch.

**Hidden assumptions named**:
- A Lean module that *compiles* was assumed to be *verified*; `lake build` returning success with warnings is not verification.
- An `axiom` declaration was assumed equivalent to a proven lemma because it type-checks.
- The fourth language was assumed to be covered by the three-language audit; it is invisible to README, SOURCES, and ADR-068..083.

## Decision

1. **`sorry` may not ship in a shipped proof module.** Either:
   a. Prove `contractivityBound_strict` (add `hScale > 0`, adjust statement to `score ≤ p·scale/(p+1)` with integer-safe handling) and `domainTag_prime_inj` (restate with a `p < 2^32` bound, or strengthen `be32` to an injective encoding on `Nat`), OR
   b. Mark the module **research-incomplete**: README and SOURCES list `lean/` with an explicit `status: incomplete proofs; theorems under sorry; not a verification claim`, and the module is *not* cited anywhere as evidence of correctness.

2. **`getPrimeAtIndex` SHALL be defined, not axiomatized**: either implement `def getPrimeAtIndex (n : Nat) : Nat` (nth-prime sieve) and prove `getPrimeAtIndex_inj` from it, or delete the axiom pair and the theorem that depends on `domainTag_index_inj`.

3. **`lake build` warning policy is a ratchet, not a toggle.** A bare "fail on warnings" would break CI immediately (the build currently emits 2 `sorry` warnings — `contractivityBound_strict` and `domainTag_prime_inj`) and would therefore be accepted-and-never-executed (the same failure mode as ADR-070 #3):
   - A file `lean/.sorry-allowlist` is committed with exactly the current symbols: `contractivityBound_strict`, `domainTag_prime_inj` (baseline **N = 2**).
   - The CI Lean step SHALL fail on any of: (i) total `sorry` warnings > N; (ii) a `sorry` on a symbol *not* in the allowlist (new gap); (iii) an allowlist entry whose `sorry` is gone but the entry retained (stale entry = hard failure, forcing the ratchet down).
   - The only legal direction of change is N → 0. Each accepted PR that removes a `sorry` deletes its allowlist line; N may never increase.

4. **`lean/test.lean` SHALL be added to the lakefile roots or deleted** — an unbuilt scratch file is not a test.

5. **`lean/` SHALL be registered**: README Contents table + SOURCES.md get `lean/MultiplicityCrypto/Protocol.lean` rows; `.lake/` artifacts are `.gitignore`d like other build output.

6. Until 1–3 are satisfied, **no manifest, ADR, or docstring may cite Lean as a verification of the protocol or the contractivity gate.**

## Consequences

- Formal-methods claims match the proof state; `sorry` is either gone or loudly labeled.
- The contractivity theorem (ADR-073's original subject) is either proven or explicitly unpromoted.
- Lean joins the crate's registered, auditable surface instead of arriving after the audit window.

## Testing

- `grep -rn "sorry" lean/MultiplicityCrypto/` returns 0 for Option (a), or README/SOURCES show `status: incomplete proofs` for Option (b).
- `grep -rn "^axiom\|^  axiom\|getPrimeAtIndex_inj" lean/MultiplicityCrypto/` returns 0 (after option 2), or shows a `def getPrimeAtIndex`.
- `cat lean/.sorry-allowlist` lists exactly `contractivityBound_strict`, `domainTag_prime_inj` (baseline N = 2); after this commit it lists neither (N = 0 — both proved, stale-entry rule forced removal). CI Lean step exits 0 with any allowlist set and > 0 with any `sorry` outside it.
- Removing a `sorry` without removing its allowlist line fails CI (stale-entry rule); the allowlist line count never exceeds 2 and decreases monotonically to 0.
- `grep "lean" README.md SOURCES.md` returns ≥1 registration row each.

## References

- `lean/MultiplicityCrypto/Protocol.lean:275-296`, `lean/test.lean:9-27`, `lakefile.lean:5-10`
- `.lake/build/lib/lean/MultiplicityCrypto/Protocol.trace` (sorry warnings)
- ADR-074 (LawfulRecursionHash placeholder rule), ADR-073 (contractivity gate), ADR-082 (build-time diagnostic posture), ADR-068 F-MC-05
- LawfulRecursionVersion 1.0 Core fragment (λ_p, per-channel ledger)

## Addendum (2026-09-24) — implemented, `simple=false` not needed: proofs complete

Ruled **Option (a)** — the proof surface ships complete; the module is not marked research-incomplete.

**Decision 1a — both theorems proved (Lean 4.34.0-rc2, core only, no mathlib):**

- `contractivityBound_strict` is proved directly (core Nat lemmas only): from `ContractivityBound.isValid` (`score·(p+1) ≤ p·scale`) and `scale > 0`, assume `¬ score < scale`, then `scale·(p+1) ≤ score·(p+1)` (`Nat.mul_le_mul_right`) contradicts `p·scale < scale·(p+1)` (`Nat.mul_add` + `Nat.lt_add_of_pos_right`). No statement change was needed beyond the already-present `hScale > 0`.
- `domainTag_prime_inj` was **false as stated** and is restated with the `p < 2^32` bound exactly as Decision 1a offers: `p1 < 2^32, p2 < 2^32 → domainTag p1 = domainTag p2 → p1 = p2`. The proof goes through a new `be32_inj_lt` lemma (`be32 a = be32 b` under the same bound): each of the four byte positions is extracted via `l[i]?.map Fin.val` (avoiding dependent elimination on the proof-carrying `Fin` elements), and `omega` closes the reconstruction since `omega` normalizes `Nat` `/` and `%` by constant divisors.

**Decision 2 — axiom pair deleted, not simulated.** Chose the sanctioned branch "delete the axiom pair and the theorem that depends on `domainTag_index_inj`". `getPrimeAtIndex` remains defined only where it is real (TS `multiplicity.ts:20`); no unconstrained axiom or fake nth-prime function is shipped in Lean.

**Decision 3 — ratchet closed 2 → 0 in the same commit.** The baseline was `N = 2` (`contractivityBound_strict`, `domainTag_prime_inj`). Because both `sorry`s were proved in a single commit, the stale-entry rule forces the allowlist to ship empty (`N = 0`). `lean/.sorry-allowlist` exists with no symbols; `scripts/check-sorry-allowlist.sh` enforces (i) count ≤ N, (ii) sorry-on-unlisted-declaration fails, (iii) stale entry fails, plus a hard failure on `axiom`/`admit`. Both fail modes verified by direct execution before commit.

**Decision 4 — `lean/test.lean` deleted.** Its content was a strict duplicate of the fixed `sorry`s; with the real proofs in place it was obsolete.

**Decision 5 — `lean/` registered; `.lake/` untracked.** README Contents table and SOURCES.md gain Lean rows; the 11 previously tracked `.lake/build/…` artifacts and `.lake/config/…` files were removed from the index (`git rm -r --cached .lake`) and `.lake/` is gitignored via the new root `.gitignore`.

**Verification performed before commit:** `lake build` at repo root completes with zero `sorry` warnings; `scripts/check-sorry-allowlist.sh` exits 0; `grep -rnE 'sorry|axiom|admit' lean/MultiplicityCrypto/` returns nothing; the checker was shown to fail (exit 1) both when a new `sorry` is introduced and when an allowlist entry goes stale.