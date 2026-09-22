abbrev Byte := Fin 256
abbrev Bytes := List Byte
def byte (value : Nat) : Byte := ⟨value % 256, Nat.mod_lt value (by decide)⟩
def be32 (value : Nat) : Bytes := [byte (value / 16777216), byte (value / 65536), byte (value / 256), byte value]

def ContractivityBound.isValid (score : Nat) (p : Nat) (scale : Nat) : Prop :=
  score * (p + 1) ≤ p * scale

theorem contractivityBound_strict (score : Nat) (p : Nat) (scale : Nat) 
    (hScale : scale > 0) 
    (hValid : ContractivityBound.isValid score p scale) :
    score < scale := by
  sorry

axiom getPrimeAtIndex : Nat → Nat
axiom getPrimeAtIndex_inj : ∀ {n m : Nat}, getPrimeAtIndex n = getPrimeAtIndex m → n = m

def domainTag (prime : Nat) : Bytes :=
  [byte 0x50, byte 0x4D] ++ be32 prime

theorem domainTag_prime_inj (p1 p2 : Nat) (h : domainTag p1 = domainTag p2) : p1 = p2 := by
  sorry

theorem domainTag_index_inj (n m : Nat) 
    (h : domainTag (getPrimeAtIndex n) = domainTag (getPrimeAtIndex m)) : n = m := by
  apply getPrimeAtIndex_inj
  apply domainTag_prime_inj _ _ h
