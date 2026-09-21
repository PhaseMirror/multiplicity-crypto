**PHASE MIRROR ON THE WORKBENCH**

**multiplicity-crypto, Lawful Recursion, and the coats that must not merge**

*A five-step naming of the Ling 3.0 package audit against LawfulRecursionVersion 1.0, the Ξ-fragments, and the commercial Phase Mirror catalog. Companion to PM-HE-001, PM-PWEH-001, PIRTM-FD-001, UCC-YK-001, PP-PIRTM-001, FWP-ATTEST-001. Not a Certified event. Not a QKD protocol. Not civic law.*

| Field | Binding |
| :---- | :---- |
| **Document** | PM-MC-001 · Phase Mirror on multiplicity-crypto and Lawful Recursion |
| **Version / date** | 1.0 · 20 September 2026 |
| **Legal person speaking** | Foundry workshop diagnoses the crate. UNA holds the literary method and the marks. Operator LLC may host a managed oracle under PMCP — this paper does not grant that license. |
| **Year-one product** | UCC as a service. UAC / PIRTM / QKD / Pedersen-BN254 remain research or stubs until an accepted ADR and, for UAC, a partner QPU queue. |
| **Computational L0 kept** | LawfulRecursionVersion 1.0 · contraction c \< 1 · ||G||₁ \< 1.0. Phase Mirror does not compute c. Phase Mirror names when a README pretends it did. |
| **Observable nearby wire** | ADR-005 P²C PETC v1.2 (P2CWITv2 / BLAKE2b-16 / b'P2C\_V12'). Cited P²C Core v1.1 and UnsignedCrmfEnvelope remain unbound. BN254 \+ Ed25519 is not post-quantum (PM-PWEH-001). |
| **Evidence on this bench** | Ling 3.0 Flash VL audit of packages/multiplicity-crypto (PHASE\_MIRROR\_AUDIT.md \+ TEST\_RESULTS.md). Attached Ξ-Constitutional-Core.md, Ξ-Constitution.md, and three Phase Mirror commercial/legal papers. Crate tree itself is not in this artifacts folder. |

&nbsp;

| One sentence *A mock QKD backend is a test double. A SHA-256 fallback is a hash. A constitution that amends by repository quorum is a literary machine. None of those three may sit as a member vote, a diploma, or a photon.* |
| :---- |

# **0\. What arrived, and which person is speaking**

Four objects landed on the same bench in one pass. They are not one object.

* Ξ-Constitutional-Core.md (16 April 2026\) — LawfulRecursionVersion 1.0. Ambient space, constitutional projector Π\_CSL, ethical projector P\_E, channel-resolved map F, contraction c \< 1, ZetaCell bridge, prime-entropy S\_π, content-hash as single source of truth. This is computational L0. It is already the stack’s named contraction law.

* Ξ-Constitution.md v1.0 — a literary frame: PEET tribunal, Langlands registrar, ten critiques, Multiplicity Foundation pull-request amendments, 3/5 council kill-switch. This is not W.S. 17-22 / 17-32. It does not bind the UNA register.

* Three Phase Mirror papers (legal governance, callable protocol, agentic DSR \+ SaaS catalog) — method plus a four-pillar revenue architecture (open-core seats, compliance packs, certification fees, retainers). Method is UNA literary property. Revenue architecture, if any, is an Operator LLC door, and only one of the four doors.

* Ling 3.0 audit of multiplicity-crypto — stated QKD / WASM Pedersen BN254 / Python bridge versus MockQKDBackend, SHA-256 fallback, dead imports, missing vitest, unrunnable Python.

Civic invariant 5 still holds: no third party offers Phase Mirror as a managed service without a commercial license. This paper is the diagnostic, not the license. Civic invariant 8 still holds: credits and tokens do not overweight votes; exam fees do not write Certified (FWP-ATTEST-001, FWP-TRAIN-001).

# **1\. Two L0 planes. Do not mix them.**

The Core fragment and the civic nine are both called “L0” in different rooms. They are not the same floor.

| Plane | What it binds | What it must not do |
| :---- | :---- | :---- |
| **Computational L0** | LawfulRecursionVersion 1.0. F is a contraction when sup\_p λ\_p (L\_A,p \+ L\_B,p \+ L\_E,p) \= c \< 1\. Unique fixed point. LawfulRecursionHash on every Cell / kernel / manifest. | Does not seat a member. Does not freeze a garden. Does not replace a 14-day notice. Does not mint a diploma. |
| **Civic L0** | Nine invariants: no member profit distribution; no cameras in a declared privacy zone; no off-purpose list use; no administrator beyond written authority; no unlicensed managed Mirror; youth needs guardian consent; withdrawal is logged not argued; credits do not overweight votes; the association is not a PAC. | Does not compute c. Does not run Π\_CSL. Does not decide λ\_p. Does not treat a Rust assert as a member vote. |

&nbsp;

Named collision, not wished away: Ξ-Constitution Article IX lets “active repository contributors from the preceding 90 days” amend the literary constitution at 2/3 quorum, with a 1/3 veto and a 3/5 council kill-switch. Citizen Gardens members ratify material acts after 14-day notice (BR-CA-001 / BR-CA-002). Contributors ≠ members. A GitHub kill-switch ≠ WardMonitor SIG\_GOV\_KILL ≠ a UNA pause. Three names. Three owners. Keep them.

# **2\. Extract — what the crate claims, what ran**

## **2.1 Stated intent**

* README: “QKD Hybrid Encryption v1.0.1.”

* README: “Pedersen commitment (WASM-backed BN254).”

* README: eight TypeScript modules, four Python modules, one Rust module; Python crypto bridge \+ CAS registry.

* feedback.ts: L0–5 contractivity gate, contractivity\_score ≤ p/(p+1).

* Prime-indexed domain separation across TS and Rust.

## **2.2 Operating path the audit actually executed**

| Surface | What ran | What did not |
| :---- | :---- | :---- |
| **QKD** | MockQKDBackend.simulateQKD() → SHA-256 \+ HKDF \+ AES-GCM. 2/2 TS tests with vitest \--globals. | No QKD hardware. No entanglement. No quantum channel. No BB84/E91. |
| **Pedersen / BN254** | try { require('../rust/pkg/commitment\_wasm') } catch → SHA-256 stub tagged PM-COMMIT-p${prime}. | rust/pkg/ does not exist. WASM never built. BN254 curve ops never execute. |
| **Python package** | Nothing importable. agi import at \_\_init\_\_.py:32 is unwrapped. numpy / sympy / pytest / pirtm absent. | 0/0 runnable tests. Bridge files ts/python/crypto\_bridge.js and ts/dist/src/index.js absent. All MultiplicityCrypto.\_call() commands fall to \_fallback\_commitment(). |
| **TypeScript harness** | tsc \--noEmit passes. Prime sieve, HKDF, AES-256-GCM, hash-chain compile. QKD mock 2/2 with \--globals. | vitest not in devDependencies. No vitest.config.ts. tsconfig types include jest with no jest package. |
| **Rust** | Keccak256 transcript 2/2. Prime-indexed tags consistent with TS. | Empty \[workspace\] and \[dev-dependencies\]. No wasm-pack target. |
| **Contractivity gate** | feedback.ts:36–57 implements the inequality. | No test coverage. No logged (λ\_p, L\_p, λ\_p L\_p, ACE\_p) ledger the Core fragment requires. |

&nbsp;

What the audit correctly kept: prime-indexed domain separation is a mechanism, not a vibe. Rust transcript is deterministic. Those two stay on the “works” side of the ledger. Everything else in §2.1 is a label on a fallback.

# **3\. Map and rank the dissonances**

Impact × tractability. Impact is harm if a stranger treats the label as the mechanism. Tractability is whether a named owner can close it without a QPU, a CMVP, or a new legal person.

| ID | Dissonance | Impact × tract. | Rank note |
| :---- | :---- | :---- | :---- |
| **D-01** | “QKD Hybrid Encryption” vs MockQKDBackend. Photon word on a classical KDF. | 9 × 9 | Rename or implement. No third path. |
| **D-02** | “WASM-backed BN254 Pedersen” vs SHA-256 stub. Curve word on a hash. | 9 × 8 | Build wasm-pack or document the stub as the product. |
| **D-03** | Python package cannot be imported. Dead modules (agi, topos, moonshine, pirtm, mkt\_colored\_braid). | 8 × 9 | Wrap or delete. ImportError is not a feature flag. |
| **D-04** | Test script names vitest; package.json does not. CI will lie or fail. | 7 × 9 | Declare the runner. Add globals config. |
| **D-05** | Contractivity gate present, untested, unledgers. Core §4 and §7 require logged λ\_p and a hash. | 8 × 6 | Mechanism exists; the Core’s single source of truth does not. |
| **D-06** | LawfulRecursionHash field in the Core is still “\[computed on commit\]”. Placeholder is not a hash. | 8 × 8 | Compute or refuse the field. |
| **D-07** | Ξ-Constitution PEET / Langlands / Foundation-council vs UNA member vote and Operator LLC firewall. | 9 × 5 | Literary analog only (same posture as ZM-001). Do not promote. |
| **D-08** | Commercial catalog sells CPMP / CPMA diplomas and calibration-data network effects. Credentials attest. Equity never mints a diploma. Calibration data is not collateral. | 8 × 4 | Catalog is a pitch, not a door. Four doors only. |
| **D-09** | Callable “oracle” papers want the Mirror on the merge-queue hot path. Stack law: Phase Mirror is a build-time diagnostic, not a runtime firewall. | 8 × 5 | Keep warn-only. G0–G5 stay PrismPM. SIG\_GOV\_KILL stays WardMonitor. |
| **D-10** | BN254 Pedersen claim sits next to year-one UCC receipts. BN254 \+ Ed25519 is not PQ (PM-PWEH-001). PWEH PQ is not year-one. | 7 × 4 | Do not advertise the stub as the receipt spine. |

&nbsp;

Ling 3.0 already named D-01 through D-05 as engineering mismatches. This paper adds D-06 through D-10 so the crate cannot be silently promoted into civic law, a diploma mill, a merge-queue firewall, or a post-quantum story.

# **4\. Five-step loop on the crate (diagnostic only)**

| Step | On this package |
| :---- | :---- |
| **1\. Extract** | Claims: QKD, Pedersen-WASM-BN254, Python bridge, L0–5 gate, prime tags. Constraints: no QPU, no rust/pkg, no pirtm on disk, no vitest declared. Stakeholders: crate maintainer, Foundry workshop, Operator LLC if hosted, UNA if the README is used as literary proof. Horizon: before any external consumer is pointed at the crate. |
| **2\. Map tensions** | Label vs path (D-01, D-02). Import vs disk (D-03). Script vs lockfile (D-04). Gate vs ledger (D-05). Hash field vs empty brackets (D-06). Literary court vs member vote (D-07). Diploma catalog vs attest-only (D-08). Hot-path oracle vs diagnostic coat (D-09). Curve generation vs PQ honesty (D-10). |
| **3\. Rank** | Close D-01, D-02, D-03, D-04, D-06 first — they are words that will travel. D-05 next. D-07 / D-08 / D-09 / D-10 are policy bindings already written in companion papers; this crate does not get to reopen them. |
| **4\. Produce** | Levers in §7. Fail-closed F-MC-01–12 in §6. Optional artifact below. No Certified bit. No SIG\_GOV\_KILL. No fifth door. |
| **5\. Precision question** | See §9. Blocking until the README either drops the photon word or a quantum channel exists, and until the hash field is a hash. |

# **5\. What the Core fragment actually requires of this crate**

LawfulRecursionVersion 1.0 is already the stack’s computational L0. The crate does not get a private constitution. If it claims lawful prime recursion, it owes the fragment’s engineering notes, not a new Article IX.

* λ\_p \= κ · p^{−σ} / ||A\_p|| with 0 \< κ \< 1, tuned so max(λ\_p L\_p) \< 1 − ε.

* Per-channel log: (λ\_p, L\_p, λ\_p L\_p, ACE\_p, projector\_status), hashed into a P-Kernel ledger. Poseidon or SHA-256 is named; Poseidon2 / UnsignedCrmfEnvelope dispatch remains unbound (ADR-005 nearby, not this crate).

* Training assert: (λ\_p L\_p).max() \< 1.0 − 1e-6.

* Every Cell, kernel, ledger entry, and simulation manifest stores LawfulRecursionHash and LawfulRecursionVersion.

Present tense on this crate: feedback.ts checks a related inequality and stops. There is no per-channel ledger. There is no content hash. The ZetaCell bridge (N \= 100 zeros, α\_k \= γ\_k^{−1/2}) is not in the audit’s file list. S\_π is not measured. Claiming the Core while shipping a SHA-256 commitment stub is D-05 \+ D-06, not a passing grade.

Compatibility note kept from PIRTM-FD-001 and PP-PIRTM-001: PIRTM refuse ≠ PrismPM F-control ≠ WardMonitor SIG\_GOV\_KILL ≠ UCC Δ ≠ 0\. Four no’s. One name per no. A contractivity assert in feedback.ts is none of those four until it is wired, tested, and hashed.

# **6\. Fail-closed on labels (F-MC-01–12)**

These are workshop rules for this crate and for any README, pitch, or portal view that points at it. They are not civic L0 and not a CMVP profile. Overlays cannot weaken them any more than PrismPM overlays can weaken C-controls.

| ID | Rule |
| :---- | :---- |
| **F-MC-01** | The string “QKD” is refused in a user-facing title unless a quantum channel (hardware API or named BB84/E91 simulation with an explicit “simulated” qualifier in the same heading) exists on the executed path. MockQKDBackend alone is “simulated classical KDF.” |
| **F-MC-02** | The string “Pedersen” or “BN254” is refused as a capability claim unless rust/pkg/commitment\_wasm exists and is loaded, or the README’s primary sentence is “SHA-256 tagged commitment; BN254 WASM not built.” Fallback-always-active is not “WASM-backed.” |
| **F-MC-03** | A package \_\_init\_\_ that imports a missing module without guard is REJ. Dead modules are deleted or stubbed before the crate is referenced from Foundry docs. |
| **F-MC-04** | npm test / cargo test / pytest documented in README must be the commands that actually run. A test runner named in scripts and absent from devDependencies is REJ. |
| **F-MC-05** | LawfulRecursionHash may not ship as “\[computed on commit\]”. Empty brackets are not a hash. Refuse the field or write the digest. |
| **F-MC-06** | A contractivity gate without a test and without a per-channel log may not be cited as enforcement of c \< 1\. Presence of an inequality is not Banach’s theorem applied. |
| **F-MC-07** | Ξ-Constitution Articles III–IX (PEET, Langlands, Foundation council, repo-quorum amendments) are literary. They do not bind UNA members, do not replace 14-day notice, and do not sit as Examiner. |
| **F-MC-08** | Certification product names (PMA / CPMP / CPMA) and exam fees do not write a Certified bit, a creation event, or a member standing. Exam fee lives on /shop if it lives at all (FWP-TRAIN-001). Equity never mints a diploma. |
| **F-MC-09** | Phase Mirror remains a build-time diagnostic. It does not become a merge-queue firewall, a runtime pulse-cut, or a hardware interrupt. Callable protocol papers may stay warn-only. Blocking belongs to PrismPM C/F controls, UCC Δ, PIRTM refuse, or WardMonitor — each under its own name. |
| **F-MC-10** | BN254 \+ Ed25519 is not post-quantum. Year-one UCC receipts stay hash \+ version \+ build \+ time (UCC-YK-001). This crate is not the receipt spine. |
| **F-MC-11** | Calibration / false-positive telemetry from a hosted oracle is not collateral, not a membership surplus, and not a fifth door. If collected, name the legal person and the door (gift, sponsor-class, recoverable grant, operator equity). |
| **F-MC-12** | Anyone at or above 10% of the Operator LLC, or holding its board seat, cannot sit as Examiner of this crate’s “Certified Implementation.” Dual seat still needs the firewall paper. This audit is not that paper. |

# **7\. Levers to test now**

Owners are workshop roles, not a shadow board. Metrics are observable. Horizons assume the crate is in-tree somewhere the maintainer can touch; if the crate is not on this disk, the first lever is to seat it or stop citing it.

| Owner | Lever | Metric | Horizon |
| :---- | :---- | :---- | :---- |
| **Crate maintainer** | P0: wrap or delete agi import; add numpy/sympy to install\_requires or drop Python extra. | python3 \-c "import multiplicity" exits 0 | 7 days |
| **TS owner** | P0: add vitest to devDependencies; commit vitest.config.ts with globals: true. | npm test exits 0 with no extra flags | 7 days |
| **Docs owner** | P0: retitle QKD and Pedersen claims to match the executed path, or park the crate behind a research banner. | Zero user-facing headings that F-MC-01 or F-MC-02 would refuse | 7 days |
| **Rust/TS owner** | P1: wasm-pack build of commitment\_wasm, or a README sentence that the SHA-256 stub is the shipped commitment. | computeCommitment path is one documented mechanism | 21 days |
| **Python owner** | P1: delete or stub missing modules; remove crypto\_bridge.js dependency or create the file. | Zero ImportError on package load; constructor does not require Node | 21 days |
| **Kernel owner** | P1: compute LawfulRecursionHash of the Core fragment; attach version 1.0 to any manifest this crate emits. | Hash field is a digest, not brackets | 14 days |
| **QA owner** | P2: tests for feedback.ts gate, aead decrypt, frequency. Log (λ\_p, L\_p) or stop citing c \< 1\. | Coverage ≥ 70% on named TS modules; gate test exists | 30 days |
| **Foundry steward** | Do not wire this crate to POST /close, to /creations Certified, or to a hosted PMCP SKU until D-01–D-06 are closed. | Zero production references from UCC-YK-001 surfaces | Standing |
| **Operator LLC counsel (when a door is named)** | If a managed Mirror or compliance pack is sold, name the door and the person. Catalog prices in the attached SaaS paper are not adopted by this artifact. | Door ∈ {gift, sponsor-class, recoverable grant, operator equity} | Before first invoice |

# **8\. Unbound, kept unbound**

Naming a gap is not filling it. The following stay on the unbound register. Companion papers already hold several of these; this crate does not retire them.

* P²C Core v1.1 Witness Calculus — still absent from artifacts. Observable wire remains ADR-005 P²C PETC v1.2.

* UnsignedCrmfEnvelope / BCS / Poseidon2 dispatch — unbound versus ADR-005.

* Partner QPU queue — UAC and any non-mock QKD wait on it.

* CMVP / Certified ladder event — C-24 shaped, separate from creation attestation (PrismPM-WF-001, FWP-ATTEST-001).

* Public stablecoin / MSC / V \= 1+S+C — unbound (DR-FS-001, SP-M-002).

* Hosting provider for the portal SSP — unbound on purpose (C-11).

* Intrinsic 7 as Sybil patch — refused (SYB-001, FE-001).

* Ξ-Constitution PEET tribunal as a membership court — refused.

* Phase Mirror as runtime firewall — refused (PM-HE-001).

* hundian NODE\_CAP \= 12 versus Lifebushidō 3^k human topology — named dissonance, not wished away (HT-LB-001). Irrelevant to this crate except as a reminder that we do not silently retune constants to make a README true.

# **9\. Precision question**

| Blocking *When a stranger reads the heading “QKD Hybrid Encryption v1.0.1,” which legal person is making that claim, and which executed path are they willing to swear to — MockQKDBackend, or a quantum channel that is not on this disk?* |
| :---- |

Until that is answered in an artifact that names the person and the path, the crate is research clay. It may sit in Foundry. It may not be sold as a photon, a Pedersen argument, a diploma, or a civic constitution.

Secondary questions, already open on the stack and not closed here: Does the agent optimize for accuracy or compliance. Which metric wins if cost and dignity collide. Is this seat practice, equity, or both — and if both, where is the firewall paper.

# **10\. What this paper does not do**

* Does not patch the crate. The audit’s P0 list remains the maintainer’s. This document does not ship TypeScript.

* Does not adopt the attached SaaS price card ($6k / $36k / $100k+, $395–$995 exams, $10k–$50k retainers). Prices are not a door.

* Does not treat the Ling 3.0 “Protocol is callable. Ship it.” close of the merge-queue essay as Foundry authorization. That essay is about a different oracle surface. Our coat stays diagnostic.

* Does not compute LawfulRecursionHash. F-MC-05 forbids pretending we did.

* Does not give legal, medical, or financial advice. Dual-seat and PMCP four gates stay as already written.

* Does not resolve D-07 by declaring the Ξ-Constitution “aligned.” Alignment is the word the Mirror retired. Binding artifact or not.

# **11\. Optional artifact**

| Keep on the crate README until D-01 and D-02 close *Simulated classical cryptography with prime-indexed tags. No quantum channel. No BN254 WASM on disk. LawfulRecursionVersion 1.0 is the contraction law we owe, not a badge this package has earned.* |
| :---- |

&nbsp;

*The Phase Mirror does not resolve dissonance — it names it. A fallback that always runs is the product. Call it that, or build the other thing.*

Two persons. Five infrastructures. Four doors. Two seats. Four gates. Five steps. Nine civic invariants. One contraction constant less than one. Twelve to a node. One hundred members to DUNA. This crate is none of those numbers until its labels match its path.