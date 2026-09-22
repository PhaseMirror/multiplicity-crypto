namespace MultiplicityCrypto
namespace Protocol

abbrev Byte := Fin 256
abbrev Bytes := List Byte
abbrev Digest := Bytes

def byte (value : Nat) : Byte :=
  ⟨value % 256, Nat.mod_lt value (by decide)⟩

def be16 (value : Nat) : Bytes :=
  [byte (value / 256), byte value]

def be32 (value : Nat) : Bytes :=
  [byte (value / 16777216), byte (value / 65536), byte (value / 256), byte value]

def be64 (value : Nat) : Bytes :=
  [byte (value / 72057594037927936), byte (value / 281474976710656),
   byte (value / 1099511627776), byte (value / 4294967296),
   byte (value / 16777216), byte (value / 65536),
   byte (value / 256), byte value]

theorem be16_length (value : Nat) : (be16 value).length = 2 := rfl
theorem be32_length (value : Nat) : (be32 value).length = 4 := rfl
theorem be64_length (value : Nat) : (be64 value).length = 8 := rfl

def classicalHmacInput (messageType : Byte) (sequence : Nat) (payload : Bytes) : Bytes :=
  [messageType] ++ be32 sequence ++ be16 payload.length ++ payload

abbrev Basis := Fin 4

structure BasisVector where
  b0 : Basis
  b1 : Basis
  b2 : Basis
  b3 : Basis
  deriving DecidableEq, Repr

def basisPack (vector : BasisVector) : Nat :=
  vector.b0.val + 4 * vector.b1.val + 16 * vector.b2.val + 64 * vector.b3.val

theorem basisPack_lt_256 (vector : BasisVector) : basisPack vector < 256 := by
  unfold basisPack
  have h0 : vector.b0.val < 4 := vector.b0.isLt
  have h1 : vector.b1.val < 4 := vector.b1.isLt
  have h2 : vector.b2.val < 4 := vector.b2.isLt
  have h3 : vector.b3.val < 4 := vector.b3.isLt
  omega

def basisPackByte (vector : BasisVector) : Byte :=
  ⟨basisPack vector, basisPack_lt_256 vector⟩

def vector0123 : BasisVector :=
  { b0 := ⟨0, by decide⟩, b1 := ⟨1, by decide⟩,
    b2 := ⟨2, by decide⟩, b3 := ⟨3, by decide⟩ }

def vector0000 : BasisVector :=
  { b0 := ⟨0, by decide⟩, b1 := ⟨0, by decide⟩,
    b2 := ⟨0, by decide⟩, b3 := ⟨0, by decide⟩ }

def vector3333 : BasisVector :=
  { b0 := ⟨3, by decide⟩, b1 := ⟨3, by decide⟩,
    b2 := ⟨3, by decide⟩, b3 := ⟨3, by decide⟩ }

def vector1230 : BasisVector :=
  { b0 := ⟨1, by decide⟩, b1 := ⟨2, by decide⟩,
    b2 := ⟨3, by decide⟩, b3 := ⟨0, by decide⟩ }

example : basisPack vector0123 = 0xE4 := rfl
example : basisPack vector0000 = 0x00 := rfl
example : basisPack vector3333 = 0xFF := rfl
example : basisPack vector1230 = 0x39 := rfl

theorem basisPack_vector0123 : basisPack vector0123 = 0xE4 := rfl
theorem basisPack_vector0000 : basisPack vector0000 = 0x00 := rfl
theorem basisPack_vector3333 : basisPack vector3333 = 0xFF := rfl
theorem basisPack_vector1230 : basisPack vector1230 = 0x39 := rfl

inductive SequenceStatus where
  | active
  | aborted
  deriving DecidableEq, Repr

inductive SequenceOutcome where
  | accepted
  | aborted
  deriving DecidableEq, Repr

structure SequenceState where
  status : SequenceStatus
  nextSeq : Nat
  acceptedCount : Nat
  deriving DecidableEq, Repr

def SequenceState.initial : SequenceState :=
  { status := .active, nextSeq := 0, acceptedCount := 0 }

def observeSequence (state : SequenceState) (sequence : Nat) :
    SequenceState × SequenceOutcome :=
  if state.status = .active then
    if sequence = state.nextSeq then
      ({ status := .active, nextSeq := state.nextSeq + 1,
         acceptedCount := state.acceptedCount + 1 }, .accepted)
    else
      ({ status := .aborted, nextSeq := state.nextSeq,
         acceptedCount := state.acceptedCount }, .aborted)
  else
    (state, .aborted)

def SequenceState.Invariant (state : SequenceState) : Prop :=
  state.acceptedCount = state.nextSeq

theorem initialSequenceInvariant : SequenceState.Invariant SequenceState.initial := by
  unfold SequenceState.Invariant
  rfl

theorem observeSequence_preservesInvariant
    (state : SequenceState) (sequence : Nat)
    (h : SequenceState.Invariant state) :
    SequenceState.Invariant (observeSequence state sequence).1 := by
  cases state with
  | mk status nextSeq acceptedCount =>
    simp [SequenceState.Invariant] at h
    cases status with
    | active =>
      by_cases heq : sequence = nextSeq
      · simp [observeSequence, heq, SequenceState.Invariant, h]
      · simp [observeSequence, heq, SequenceState.Invariant, h]
    | aborted =>
      simp [observeSequence, SequenceState.Invariant, h]

theorem observeExpected_incrementsExactlyOnce
    (state : SequenceState)
    (hActive : state.status = .active) :
    let result := observeSequence state state.nextSeq
    result.1.status = .active ∧
    result.1.nextSeq = state.nextSeq + 1 ∧
    result.1.acceptedCount = state.acceptedCount + 1 ∧
    result.2 = .accepted := by
  simp [observeSequence, hActive]

theorem observeMismatch_aborts
    (state : SequenceState) (sequence : Nat)
    (hActive : state.status = .active)
    (hMismatch : sequence ≠ state.nextSeq) :
    let result := observeSequence state sequence
    result.1.status = .aborted ∧
    result.1.nextSeq = state.nextSeq ∧
    result.1.acceptedCount = state.acceptedCount ∧
    result.2 = .aborted := by
  simp [observeSequence, hActive, hMismatch]

theorem observeAfterAbort_isSticky
    (state : SequenceState) (sequence : Nat)
    (hAborted : state.status = .aborted) :
    observeSequence state sequence = (state, .aborted) := by
  simp [observeSequence, hAborted]

structure Hash where
  apply : Bytes → Digest
  deterministic : ∀ {left right : Bytes}, left = right → apply left = apply right

def sessionId (hash : Hash) (nonceA nonceB : Bytes) : Digest :=
  hash.apply (nonceA ++ nonceB)

theorem sessionId_deterministic
    (hash : Hash) (leftA rightA leftB rightB : Bytes)
    (ha : leftA = rightA) (hb : leftB = rightB) :
    sessionId hash leftA leftB = sessionId hash rightA rightB := by
  simp [ha, hb]

inductive Sender where
  | alice
  | bob
  deriving DecidableEq, Repr

def aliceLabel : Bytes :=
  [0x41, 0x4c, 0x49, 0x43, 0x45, 0x00, 0x00, 0x00]

def bobLabel : Bytes :=
  [0x42, 0x4f, 0x42, 0x00, 0x00, 0x00, 0x00, 0x00]

theorem aliceLabel_length : aliceLabel.length = 8 := rfl
theorem bobLabel_length : bobLabel.length = 8 := rfl

def senderLabel : Sender → Bytes
  | .alice => aliceLabel
  | .bob => bobLabel

structure TranscriptChain where
  sender : Sender
  genesis : Digest
  current : Digest
  messages : List Bytes
  deriving DecidableEq, Repr

def TranscriptChain.initial
    (hash : Hash) (sender : Sender) (version sid : Bytes) : TranscriptChain :=
  { sender := sender,
    genesis := hash.apply (version ++ sid ++ senderLabel sender),
    current := hash.apply (version ++ sid ++ senderLabel sender),
    messages := [] }

def TranscriptChain.append
    (hash : Hash) (chain : TranscriptChain) (message : Bytes) : TranscriptChain :=
  { chain with
    current := hash.apply (chain.current ++ message),
    messages := chain.messages ++ [message] }

def TranscriptChain.digestFromMessages
    (hash : Hash) (genesis : Digest) (messages : List Bytes) : Digest :=
  messages.foldl (fun current message => hash.apply (current ++ message)) genesis

def TranscriptChain.Invariant (hash : Hash) (chain : TranscriptChain) : Prop :=
  chain.current = TranscriptChain.digestFromMessages hash chain.genesis chain.messages

theorem TranscriptChain.initialInvariant
    (hash : Hash) (sender : Sender) (version sid : Bytes) :
    TranscriptChain.Invariant hash
      (TranscriptChain.initial hash sender version sid) := by
  unfold TranscriptChain.Invariant
  rfl

theorem TranscriptChain.appendInvariant
    (hash : Hash) (chain : TranscriptChain) (message : Bytes)
    (h : TranscriptChain.Invariant hash chain) :
    TranscriptChain.Invariant hash (TranscriptChain.append hash chain message) := by
  unfold TranscriptChain.Invariant
  unfold TranscriptChain.append
  rw [h]
  simp [TranscriptChain.digestFromMessages, List.foldl_append]

structure TranscriptContext where
  alice : TranscriptChain
  bob : TranscriptChain
  deriving DecidableEq, Repr

def TranscriptContext.initial
    (hash : Hash) (version sid : Bytes) : TranscriptContext :=
  { alice := TranscriptChain.initial hash .alice version sid,
    bob := TranscriptChain.initial hash .bob version sid }

def TranscriptContext.initialFromNonces
    (hash : Hash) (version nonceA nonceB : Bytes) : TranscriptContext :=
  TranscriptContext.initial hash version (sessionId hash nonceA nonceB)

def TranscriptContext.appendAlice
    (hash : Hash) (context : TranscriptContext) (message : Bytes) : TranscriptContext :=
  { context with alice := TranscriptChain.append hash context.alice message }

def TranscriptContext.appendBob
    (hash : Hash) (context : TranscriptContext) (message : Bytes) : TranscriptContext :=
  { context with bob := TranscriptChain.append hash context.bob message }

def contextHash (hash : Hash) (context : TranscriptContext) : Digest :=
  hash.apply (context.alice.current ++ context.bob.current)

theorem contextHash_deterministic
    (hash : Hash) (left right : TranscriptContext)
    (ha : left.alice.current = right.alice.current)
    (hb : left.bob.current = right.bob.current) :
    contextHash hash left = contextHash hash right := by
  apply hash.deterministic
  simp [ha, hb]

theorem contextHash_initial
    (hash : Hash) (version sid : Bytes) :
    contextHash hash (TranscriptContext.initial hash version sid) =
      hash.apply
        ((hash.apply (version ++ sid ++ aliceLabel)) ++
         (hash.apply (version ++ sid ++ bobLabel))) := by
  rfl


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

end Protocol
end MultiplicityCrypto
