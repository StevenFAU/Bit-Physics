---
date: 2026-06-20
author: pre-dispatch-review-agent (independent session; Convention E-addendum, spec § 7.4)
phase: 6
cluster: amulet-acoustic
artifact: pre-dispatch-review
artifact_id: amulet-acoustic-pre-dispatch-review
subject: >
  Pre-dispatch review of the Phase-6.amulet-acoustic execution charter
  (docs/phases/phase-6-amulet-acoustic.md) and its physics/numerics authority
  (docs/phases/amulet-2d-coupled-solver-foundation.md), per Convention E-addendum
  (spec § 7.4) and parent charter v1.3.
verdict: SHIFT
verdict-state: SHIFTED
head_sha: ce556d27f398b4135c14b32ad0b9b5fd7829d771
prior_phase_tag: v0.5.0-phase-5
reviewed_docs:
  - "docs/phases/phase-6-amulet-acoustic.md (@ce556d2)"
  - "docs/phases/amulet-2d-coupled-solver-foundation.md (@ce556d2)"
evidence-paths:
  - "docs/phases/phase-6-amulet-acoustic.md"
  - "docs/phases/amulet-2d-coupled-solver-foundation.md"
  - "docs/phases/phase-6-charter.md"
  - "docs/_audits/phase-6/charter-amendment-operating-model-2026-06-11T12-51-28Z.md"
  - "docs/architecture.md (§ 1.3, § 2.4, § 2.6, § 3.5, § 7.4, § 7.12, § 7.13, § 8.1, Appendix D.6)"
  - "docs/planning/bit-physics-master-catalog.md (§ 15 Waves; Appendix H.7)"
  - "tools/integrity/integrity/scripts/replay_prior_phase.py"
not_run_per_constraint:
  - "Stage 0 / replay_prior_phase.py (forbidden for this session)"
  - "read-the-disk probe (forbidden)"
  - "build dispatch (forbidden)"
---

# Pre-dispatch review — Phase-6.amulet-acoustic charter + foundation doc

> **Mandate.** Independent-session pre-dispatch review per Convention E-addendum
> (spec § 7.4, FACT verified at architecture.md:1438–1448 this session). Read-only
> except for landing this one audit. Did NOT run Stage 0, the replay gate, or the
> read-the-disk probe. The verdict returns to the owner; the plan is not dispatched
> until the owner accepts a CONFIRMED or SHIFTED-with-acceptable-deltas verdict.
>
> Every concrete claim below is tagged **FACT** (grep/read-verified at HEAD
> `ce556d2` this session, Convention #8) or **INFERENCE** (reasoning over the
> cited FACTs). Nothing is asserted from memory.

---

## VERDICT: SHIFTED

The plan is **fundamentally sound and dispatch-worthy after deltas**. The
architecture is correct for the deliverable (Figure 6 is a steady-state field map →
a frequency-domain coupled FEM is the right engine), the governing physics is
largely correct and sign-consistent, the verification-honesty posture (Roy
Level-1/2-in-repo vs Level-3/4-experimental) is exemplary, and the v1.3
reconciliation is substantively complete. **No finding is REFUTE-level** — the
method is right. But there are **concrete, fixable deltas**: two mechanical
anchor/gate corrections and four physics/numerics tightenings. They are enumerated
in **§ D — Required deltas**. All are doc-level fixes; none require re-architecting.

Per the hard constraint, I did **not** edit the charter or foundation doc — the
deltas are recorded here for the owner to apply (or to dispatch with as
known-and-accepted findings).

---

## PART A — Mechanical review (Convention E / spec § 7.4 steps 1–5)

### A-1 (MEDIUM) — Top-line spec anchor misattributes § 15 (Waves) and Appendix H.7 to architecture.md; they live in the master catalog.

**FACT.** Charter line 3: `> **Spec anchor:** docs/architecture.md v2.4+ § 15
(Waves — Acoustic/Elastic) + Appendix H.7 (waves V&V posture) + § 3.5 (13-gate
acceptance).`

**FACT.** `docs/architecture.md` has **no § 15 and no Appendix H**. Its top-level
numbered sections run §1–§13 (sim taxonomy is §5.1–5.13; no waves category;
verified by enumerating all `^## ` headings) and its appendices run **A–G** only
(`# Appendix A`…`# Appendix G`; no Appendix H). The waves family is **not** in the
spec taxonomy.

**FACT.** `§ 15. Waves (Acoustic, Elastic, Quantum, Water)` is in
`docs/planning/bit-physics-master-catalog.md:1362`; `## Appendix H — Per-family
testing surface checklists` is at catalog:5076 and `### H.7 Waves — acoustic,
elastic, quantum, water (§ 15)` at catalog:5142. Catalog:611 states a sub-charter
author "jumps to the corresponding H.N appendix for the testing-anchor menu" —
i.e., the catalog is the *intended* source for Appendix H.7.

**FACT.** Of the three cited anchors, only `§ 3.5 (13-gate acceptance)` resolves in
architecture.md (architecture.md:848 + Appendix D.6:2616).

**INFERENCE.** The anchor conflates two documents. As written it does not resolve
against synced HEAD (Convention E-addendum step 2). The `v2.4+` notation *may*
signal an intent to bank a future spec § 15 / Appendix H.7 at landing (parent
charter § 7 / spec G.12 convention-evolution), but the line presents them as
existing spec sections with no "to-be-created" qualifier, and P0.3's "spec § 15 was
catalog-planned" muddles it further (§ 15 is *catalog*, not spec). → **Delta D-1.**

### A-2 (MEDIUM) — Charter § 4 13-gate enumeration diverges from the authoritative Appendix D.6 list.

**FACT.** Charter § 4 (lines 99–100) lists: …10 = determinism; **11 = Cross-stack
equivalence (FEniCSx)**; **12 = PBT invariants**; **13 = Failing-tests replay +
perf-ledger row**.

**FACT.** Appendix D.6 (architecture.md:2633–2637, authoritative per the D-appendix
header at architecture.md:2428 "phase plans … MUST NOT silently disagree with it")
defines: **11 = PBT (§ 2.14)**; **12 = perf-ledger wall-clock (§ 2.15)**; **13 =
phase-landing audit replays failing tests + hash match**.

**FACT.** "Cross-stack equivalence" is **not** one of the 13 D.6 gates; it is spec
§ 2.6, run as a separate harness and explicitly conditional ("Sims that don't claim
cross-stack equivalence … don't run that gate", architecture.md:416).

**INFERENCE.** The charter inserts a non-canonical gate (cross-stack-equiv) into
slot 11, displaces PBT to 12, and merges D.6's gates 12+13 into charter-13 —
keeping the count at 13 only by coincidence. An auditor checking "all 13 gates per
D.6" would find PBT/perf-ledger/replay misnumbered. Separately, the FEniCSx check
is really an **independent-implementation verification** (an external FEM, not one
of the project's GPU stacks A–G), so labeling it "cross-stack equivalence / § 2.6"
is also a terminological conflation; the genuine intra-project § 2.6 equivalence
here is the NumPy↔GPU agreement that Stage 7 produces. The FEniCSx check is
**valuable and should be kept** — but as a track-specific additional gate (alongside
G-fig6/G-geom/G-coupling/G-uq), not as a renumbering of the canonical 13. → **Delta D-2.**

### A-3 (LOW–MEDIUM) — "It promotes common-spectral" (P0.3) is the wrong module for a FEM track.

**FACT.** P0.3: "This track lands the first acoustic/waves-family solver in the
portfolio (spec § 15 was catalog-planned). **It promotes `common-spectral`.**
Whether to create a new `common-fem` / `common-wave` module … is a Stage-0 probe
finding."

**FACT.** `common-spectral` is catalog-described as "Spectral PDE solvers,
FFT-based" (catalog:506, status 📋 Proposed) and is the waves-*family*'s consumer
for "FFT-based SSFM, pseudospectral" sims (catalog:1436 — i.e., Schrödinger/BEC).
`common-spectral` is not mentioned in architecture.md at all (grep-clean).

**INFERENCE.** This track builds a **finite-element** frequency-domain solver
(complex sparse assembly, mixed elements, PML) — not an FFT/pseudospectral method.
The family-level "waves → common-spectral consumer" note has been imported and
misapplied to this FEM sub-cluster. The very next sentence correctly pivots to
`common-fem`/`common-wave`, which is the right module family. → **Delta D-3.**

### A-4 (LOW–MEDIUM) — Serial-cluster sequencing: C-1 is not closed; the charter does not encode a "C-1 closed first" precondition.

**FACT.** Parent charter § 3 / amendment § 3 mandate **serial** cluster execution
in Lane A: "C-1 = Phase-4-Greenfield-CPU pool … C-2+ = catalog family clusters"
(phase-6-charter.md:144–146; amendment:94–102).

**FACT.** amulet-acoustic is a catalog-family (waves, catalog § 15) cluster → a
C-2+ cluster. **C-1 is not closed:** `docs/_audits/phase-6/` contains no
`c1-close` / cluster-close audit and no U-6 landing audit (only
`c1-u6-edge-probe-2026-06-15T15-42-50Z.md`); git log shows U-6 EDGE mid-build
(`b7c752b … EDGE GREEN trajectory`, stage-1b). The recalled close-gate note
(`c1-close-requires-u6-canonical-capture`) flags a blocking U-6 canonical capture
still outstanding.

**FACT.** Charter preconditions (§ 0) gate only on the `v0.5.0-phase-5` replay
(P0.1), **not** on C-1 closure. Charter § 6 item 2 leaves "Track priority placement
in the Phase 6 § 4 ordering" as a non-blocking owner decision.

**INFERENCE.** Under serial-cluster discipline, dispatching amulet-acoustic while
C-1 is open would run two Lane-A clusters concurrently — the exact state-divergence
risk the v1.3 single-writer rationale exists to prevent (amendment:59–64). This is
an **owner-sequencing** matter (and § 6.2 already routes ordering to the owner), so
it is not dispatch-blocking on its own — but the charter should state the
precondition explicitly, and the owner should consciously sequence amulet-acoustic
**after** C-1 close (or ratify the exception). → **Delta D-4 (owner sequencing).**

### A-5 (LOW) — Catalog H.7's prescribed cross-code peers are time-domain; the charter's FEniCSx substitution is correct but unacknowledged.

**FACT.** Catalog H.7 (catalog:5148) names the waves cross-code peers as
"k-Wave ↔ SimSonic for acoustic; SPECFEM3D ↔ SeisSol for seismic." **FACT.** The
charter names FEniCSx (frequency-domain FEM) as the in-repo cross-check and does not
mention these.

**INFERENCE.** k-Wave (pseudospectral), SimSonic (FDTD), SPECFEM3D/SeisSol
(spectral-element) are **time-domain** codes — structurally mismatched to a
frequency-domain steady-state coupled solve. FEniCSx (frequency-domain FEM) is the
correct independent peer. The substitution is sound; the charter should simply
record *why* the catalog-menu peers don't apply, so the deviation is auditable
rather than silent. → folded into **Delta D-2 / D-5**.

### A-6 (LOW) — Minor mechanical nits.

- **FACT/INFERENCE.** Charter Unit D (line 73) "Assembles A+B+C via the **§1.4**
  interface conditions": ambiguous — the interface *conditions* (the math) are in
  **foundation § 4** (4.1–4.4); charter § 1 item 4 is the scope bullet. Pick one
  unambiguous reference.
- **FACT.** Gate-7 citation parenthetical (charter line 100) omits **Brekhovskikh**,
  yet Brekhovskikh is THE analytic oracle for the load-bearing fluid–solid
  R/T-vs-angle gate (foundation § 11.4). It should be named in the citation chain.
  The gate text says "every reference in the foundation doc," so this is an
  illustrative-list omission, not a hard contradiction.
- **FACT.** "Bossart **2003**" (charter line 100) — the year is not in the
  foundation (it says "Bossart et al.", foundation:113); verify at citation-chain time.
- **INFERENCE.** "≥3 anchors each" (charter Unit A) is over-applied to single-oracle
  checks (MMS-OOA, Hankel field are one analytic oracle each); the ≥3-independent-
  reference rule (§ 2.4) fits the genuine value-*tables* (LRF-impedance-vs-f,
  R/T-vs-angle, P/S-dispersion-vs-f, eigenfrequency set), which naturally carry ≥3
  anchor points. Clarify which goldens are multi-anchor tables vs single-oracle checks.

### A-7 — Mechanical items that CONFIRM (no action).

- **FACT.** All four headline parameters **agree** between charter and foundation:
  operating **1–88 kHz**; Figure-6 grid **9–90 kHz × 0–180°** (10×13 = ~130 solves,
  foundation:13); calibration **0–360° @ 1°**; **96 kHz** mesh design frequency
  (hydrophone ceiling). No drift.
- **FACT (numeric spot-check).** Foundation § 5 boundary-layer table is correct:
  δ_v = 0.22 mm·√(100 Hz/f) gives 70/23/7.4/7.1 µm at 1/9/88/96 kHz (recomputed);
  δ_t ≈ 1.2 δ_v gives 84/28/8.9/8.5 µm. § 6 wavelength table is correct:
  water 1481/96k = 15.4 mm, air 343/96k = 3.6 mm, PLA-S 790–1000/96k = 8.2–10.4 mm.
- **FACT.** Spec anchors other than A-1 resolve: § 1.3 step 4 (output-hash footer,
  architecture.md:211); § 2.4 (≥3 anchors, :2625); § 2.6 (tolerance budget
  subsection, :418); § 2.11 (:551); § 2.13/2.14/2.15 (:581/:616/:630); § 3.5 +
  D.6 (:848/:2616); § 7.4 (Convention E-addendum, :1438); § 7.12 + I7 (:1546/:1567,
  test_i7_no_agent_tags.py); § 7.13 (:1577); § 8.1 audit-path convention (:1614,
  :63 `docs/_audits/phase-<N>/<artifact>-<UTC>.md` — the `amulet-acoustic-` prefix
  is compliant). `replay_prior_phase.py` exists
  (tools/integrity/integrity/scripts/). Tag `v0.5.0-phase-5` exists; its landing
  audit `phase-5-close-2026-06-10T12-38-41Z.md` exists (P0.1 target present).
- **FACT — v1.3 reconciliation is complete and correct on all five points the
  review brief named:** (1) two-lane serial **cluster** framing, not standalone
  track (charter:7,10; reconciliation note :9–14); (2) consolidated
  `docs/_audits/phase-6/` with `amulet-acoustic-` prefix, dir exists (charter
  § 7 :173–178); (3) single `v0.6.0-phase-6` at phase close, no per-track tags
  (charter:7,11,29,92); (4) replay anchor `v0.5.0-phase-5` (charter:14,20,35,83,125
  — tag verified to exist); (5) full v2 hardening stack present — TDD output-hash,
  ≥3 anchors, tolerance budget, mutation, PBT, perf-ledger, pre-dispatch review,
  replay (charter:18–29, all nine enumerated). The residual "track" wording is
  explicitly mapped to "cluster" (charter:14) and is acceptable.

---

## PART B — Adversarial physics / numerics review (foundation doc)

Posture: hostile reviewer. The headline is that the physics is **mostly right** and
several subtle things are handled *correctly* (called out as confirmations so the
owner can weigh them against the findings). The findings are ranked by severity.

### B-1 (MEDIUM–HIGH) — The 2D elastic reduction (plane-strain vs plane-stress) is NOT stated, and it materially changes c_P, the R/T coefficients, and the coupling.

**FACT.** Foundation § 3.2 gives Navier–Cauchy in 2D (u_x, u_y) but never states
whether the reduction is **plane strain** (ε_zz = 0) or **plane stress**
(σ_zz = 0). The charter does not state it either. The water/air domains are
scalar/vector acoustics where 2D is just ∂/∂z = 0 (no ambiguity); the ambiguity is
**purely the elastic domain**.

**INFERENCE.** Plane-strain vs plane-stress changes the effective Lamé λ and hence
c_P = √((λ+2μ)/ρ_s) — which directly drives the fluid–solid reflection/transmission
coefficients and the P/S critical angles that Stage 4's load-bearing Brekhovskikh
gate checks. For a cross-section of a body extended out-of-plane, **plane strain**
is conventional (and the COMSOL 2D Solid Mechanics default), but the AMULET is a
*compact* 6.2 cm spiral (foundation:28), so neither is rigorously correct — the
honest 2D≠3D caveat (foundation:203) covers the residual, but the *choice* still
has to be made consciously and entered in the UQ budget. → **Delta D-6.** This is
exactly the omission the review brief asked to catch.

### B-2 (MEDIUM–HIGH) — The elastic PML is used but has NO absorption/reflection verification oracle in the ladder (and PLA≈water impedance means energy reaches the elastic boundary).

**FACT.** Elastic PML is in scope (charter Unit B "elastic PML"; foundation § 7
"elastic PML form on any solid that reaches the boundary"). **FACT.** The
verification ladder tests the PML only on the **scalar Helmholtz/water** side:
foundation § 11.1 "plane-wave-through-PML box (spurious reflection < −40 dB)";
charter Unit A golden "PML plane-wave-through-box". The elastodynamics rung
(foundation § 11.2; charter Unit B) lists **MMS / P-S dispersion / eigenfrequencies
— no elastic-PML reflection test**.

**INFERENCE (and a partial confirmation).** The review brief asked specifically
about *M-PML stability at grazing incidence*. The classic catastrophic elastic-PML
instability is a **time-domain** phenomenon (temporal blow-up of the PML ODEs);
this is a **frequency-domain** solver, so that failure mode is **moot** — a point in
the doc's favor that it should *state* (so the agent doesn't over-engineer an
M-PML). The *real* frequency-domain risk is **grazing-incidence accuracy**: the
elastic-PML reflection coefficient rises for near-grazing and especially **S-waves**.
Because PLA's impedance is close to water (the whole premise of Path 2 — energy
*enters* the solid, foundation:45), the elastic field genuinely reaches the
truncation boundary, so an unverified elastic PML is a live risk. The ladder has no
gate for it. → **Delta D-7:** add an elastic-PML plane-wave-through-box reflection
gate with **separate P- and S-wave grazing-incidence** checks (S near grazing is the
worst case), and state that the instability concern is frequency-domain-moot.

### B-3 (MEDIUM) — The § 4.1 normal-acceleration coupling condition, as literally written, is sign-inconsistent with its own prose and with the standard form.

**FACT.** Foundation § 4.1 (line 80) writes, under the prose "the fluid's normal
acceleration **equals** the structure's":
`−n·(−(1/ρ)∇p_t) = −ω² n·u`.

**INFERENCE.** Expand with one consistent outward normal n (1-D interface, fluid in
x<0, solid in x>0, e^{iωt}): fluid acceleration a_f = −∇p/ρ; solid acceleration
a_s = −ω²u. Physical continuity a_{f,n} = a_{s,n} ⇒ **(1/ρ) n·∇p = +ω² n·u**. The
written equation reduces to (1/ρ) n·∇p = **−**ω² n·u — i.e., a_{f,n} = −a_{s,n},
which contradicts the "equals" prose. It is **recoverable** only if n on the LHS is
the *fluid's* outward normal and n on the RHS is the *solid's* outward normal
(opposite directions — the COMSOL inward/outward bookkeeping), but the doc uses a
single symbol n and never states this, while it *does* use the solid normal n_s for
the load term it quotes (foundation:161 "F = p·n_s").

**Confirmation that bounds the severity.** The assembled-system block form in § 4.4
is the **standard non-symmetric (u,p) coupling** with the correct asymmetric signs
(`[[K_s−ω²M_s, −C],[ρ_f ω² Cᵀ, K_f−ω²M_f]]`, foundation:95) — so the author knows
the formulation; § 4.1 reads as transcription looseness, not a conceptual error.
Moreover the load-bearing **Brekhovskikh R/T-vs-angle gate** (§ 11.4) and the global
**energy-balance + reciprocity** checks (§ 11.6) would *catch* an actual wrong-sign
coupling at implementation. → **Delta D-8:** pin one unambiguous normal-orientation
convention in § 4.1 (and make its sign consistent with the § 4.4 block form and the
"equals" prose) before the agent hard-codes a coupling sign.

### B-4 (MEDIUM) — The thermoviscous–solid coupling (§ 4.2, the harder one) is verified only by a QUALITATIVE gate, while the inviscid coupling (§ 4.1) gets a quantitative angle-resolved oracle.

**FACT.** § 4.1 (inviscid water↔PLA) is verified by the **quantitative**
Brekhovskikh plane-wave R/T-vs-angle oracle incl. mode conversion and critical
angles (foundation § 11.4; charter Unit D golden). **FACT.** § 4.2 (thermoviscous
air↔PLA — full no-slip vector + full stress + isothermal, which the doc itself calls
"what makes the air-cavity losses physical", foundation:88) is verified only by the
**qualitative** signature gate G-coupling: "resonances shift down and broaden when
losses are enabled" (charter line 106; foundation § 5 "Signature of correctness").
There is no quantitative analytic oracle for § 4.2 anywhere in the ladder.

**INFERENCE.** The physically subtler, more error-prone coupling has the *weaker*
verification. "They move" is a presence/absence check, not a correctness check — a
miscalibrated § 4.2 stress or thermal term can still produce *some* downward shift.
→ **Delta D-9:** strengthen § 4.2 verification to a **quantitative** check — e.g., a
thermoviscous channel terminated by a compliant (elastic) wall against a
semi-analytic limit, or at minimum require the *magnitude* of the resonance shift +
broadening (Δf, ΔQ) to converge against the FLNS truth model within a
measured-then-declared tolerance, rather than the binary "they move" gate.

### B-5 (MEDIUM) — FLNS↔SLNS cross-check on "one canonical channel" under-covers the spiral curvature/corners where SLNS is most likely to deviate.

**FACT.** The plan: FLNS is truth; SLNS (Kampinga three-Helmholtz) is the
GPU-affordable production form used for the headline Figure-6 sweep; "cross-check
against FLNS on **one canonical channel**" (foundation:117; charter Unit C).
**FACT.** The doc explicitly flags that the related Berggren–Bernland–Noreland
Wentzell surrogate "does not apply to surfaces with large curvatures (relevant given
the spiral)" (foundation:118) — but raises no analogous concern for SLNS.

**INFERENCE.** SLNS's accuracy rests on a locally-1D wall-normal boundary-layer
correction; that assumption is most strained exactly at **tight spiral curvature and
corners/cusps** — i.e., the geometry the production sweep actually runs in. A
canonical *straight* slit/tube validates SLNS in the easy regime only. Since
G-coupling and the Figure-6 product would be produced with SLNS, an under-resolved
SLNS at curvature could bias the resonance broadening that is the headline physics.
→ **Delta D-10:** the FLNS↔SLNS equivalence must include a **curved/cornered channel
representative of the spiral**, and the equivalence tolerance must be established in
that geometry before SLNS is trusted for the Figure-6 deliverable.

### B-6 (LOW–MEDIUM) — Smaller physics/completeness notes.

- **INFERENCE.** **Complex-modulus sign.** With the stated e^{iωt} convention
  (foundation:55), PLA damping must enter as M(1+iη), η>0, to give spatial decay
  (M(1−iη) would give growth). The doc says "add a complex modulus (loss factor η)"
  without fixing the sign (foundation:64,176). State it, since it sets Path-2 decay
  and resonance width.
- **INFERENCE.** **Thermal BC at the cavity mouth.** § 4.3 stitches thermoviscous↔
  inviscid by "continuity of pressure and normal velocity" but the energy equation
  also needs a thermal condition at the mouth (continuity of heat flux / adiabatic).
  Unstated. Low impact if BLs don't reach the mouth (which § 5 argues), but should be
  named.
- **INFERENCE/CONFIRM.** **No analytic oracle for the spiral thermoviscous field.**
  This is inherent (none exists); the spiral result correctly rests on verified-FLNS
  + mesh convergence + FLNS↔SLNS agreement. The doc should *state* this dependency
  chain so the absence of a direct oracle is explicit, not implicit.
- **CONFIRM.** **MMS norm.** "O(h³) for P2" is the L2 rate (H1/energy is O(h²));
  specifying the norm in which OOA is measured avoids a false "rate too low" flag.

### B-7 — Physics/numerics that CONFIRM (genuine strengths; no action).

- **FACT/INFERENCE.** **Governing equations are correct and sign-consistent with
  e^{iωt}.** Helmholtz § 3.1 (∇·(−1/ρ∇p) − ω²/(ρc²)p = 0 ⇔ ∇²p+k²p=0, ✓). Navier–
  Cauchy § 3.2 (∇·σ + ρ_sω²u = 0; isotropic form and c_P,c_S correct, ✓). FLNS § 3.3
  continuity/momentum/energy all reduce correctly under ∂_t→iω, and the background
  excitation p_b = p_0 e^{−ik·x} (§ 8) is consistent with the e^{iωt} outgoing
  convention (✓).
- **INFERENCE.** **SLNS regime justification is sound.** § 5 establishes thin,
  non-overlapping boundary layers in a sub-wavelength channel — exactly the regime
  where SLNS / LRF are valid; using FLNS as truth and SLNS as production (LRF/BLI as
  documented fallbacks only) honors the over-not-under stance correctly.
- **INFERENCE.** **Inf-sup / LBB pairing is correct.** The LNS momentum+continuity is
  a (near-)Stokes saddle-point; **Taylor–Hood P2 velocity / P1 pressure** is the
  canonical inf-sup-stable pair (P2 temperature is a sound accuracy match). Matches
  COMSOL's thermoviscous element choice. The "equal-order needs stabilization; don't"
  reasoning is right.
- **INFERENCE.** **Factor-once-per-frequency / back-substitute-per-angle is correct**
  for this system: in the scattered-field formulation the operator A(f) is
  angle-independent and θ enters only the RHS, so one LU factorization per frequency
  serves all angles. Caveat to note: this presumes the **direct-solve** path
  (foundation § 12 "feasible to ~10⁶ DOF for 2D"); under iterative GMRES the gain is
  via preconditioner/multi-RHS reuse, a weaker but real speedup.
- **INFERENCE.** **The Brekhovskikh R/T-vs-angle oracle is the right load-bearing
  check** and would catch a § 4.1 coupling-sign error; **energy-balance + reciprocity**
  global checks add a second net for both couplings. Bessel cavity modes are the
  correct Path-3 oracle (matches catalog H.7).
- **FACT/INFERENCE.** **The Roy Level-1/2-in-repo vs Level-3/4-experimental split is
  honestly drawn with no material leakage** (P0.2; foundation Caveats). G-fig6 is
  explicitly *qualitative* ("absolute levels depend on Level-3 completeness not yet
  validated"); the sim-to-measurement gap is "a finding to quantify with uncertainty
  bars, not a number to drive to zero"; G-uq forbids a Level-1/2 CONFIRMED on any
  Level-3 claim; the foundation even warns against treating "matches Figure 6
  qualitatively" as proof the paper used the same model (foundation:200). This is an
  exemplary honesty posture and a strength of the plan. (Optional refinement: tag each
  validation artifact with its Roy level — AMULET-data and tank-data are Level-4-
  flavored; a COMSOL-Fig-6 comparison would be Level-3 model-to-model.)

---

## PART C — Severity-ranked finding summary

| # | Sev | Part | Finding | Delta |
|---|-----|------|---------|-------|
| B-1 | MED–HIGH | B | 2D plane-strain vs plane-stress unstated (affects c_P, R/T, coupling) | D-6 |
| B-2 | MED–HIGH | B | Elastic PML used but unverified; no P/S grazing-incidence reflection gate | D-7 |
| A-1 | MED | A | § 15 / Appendix H.7 misattributed to architecture.md (they're in the catalog) | D-1 |
| A-2 | MED | A | Charter § 4 13-gate enumeration diverges from authoritative D.6 | D-2 |
| B-3 | MED | B | § 4.1 normal-accel coupling sign self-inconsistent as written | D-8 |
| B-4 | MED | B | § 4.2 thermoviscous-solid coupling verified only qualitatively | D-9 |
| B-5 | MED | B | FLNS↔SLNS cross-check under-covers spiral curvature | D-10 |
| A-3 | LOW–MED | A | "Promotes common-spectral" wrong for a FEM track | D-3 |
| A-4 | LOW–MED | A | C-1 not closed; serial-cluster sequencing precondition unstated | D-4 |
| A-5 | LOW | A | Catalog H.7 cross-code peers are time-domain; FEniCSx sub unacknowledged | D-2/D-5 |
| A-6 | LOW | A | §1.4 cross-ref; Brekhovskikh/Bossart-year citation nits; ≥3-anchor over-application | D-5 |
| B-6 | LOW–MED | B | Complex-modulus sign; mouth thermal BC; spiral-oracle dependency; MMS norm | D-11 |

---

## PART D — Required deltas (owner applies; charter/foundation untouched by this session)

Acceptance bar for an owner "SHIFTED-with-acceptable-deltas" → dispatch:

1. **D-1 (charter line 3 + P0.3).** Re-attribute the waves anchors: master-catalog
   § 15 (Waves) + catalog Appendix H.7 (waves V&V menu) + architecture.md § 3.5
   (13-gate). If a future spec § 15 / Appendix H.7 is intended at landing, say so
   explicitly ("to be banked at cluster landing per parent § 7 / spec G.12").
2. **D-2 (charter § 4).** Restore the canonical D.6 numbering (11 = PBT, 12 =
   perf-ledger row, 13 = failing-tests replay + hash). Keep the FEniCSx
   independent-implementation check as a **track-specific additional gate**
   (e.g., G-equiv) alongside G-fig6/G-geom/G-coupling/G-uq, and frame it as
   independent-implementation verification (not § 2.6 cross-stack equivalence — that
   is the Stage-7 NumPy↔GPU agreement). Record why the catalog-H.7 time-domain
   cross-code peers don't apply (A-5).
3. **D-3 (P0.3).** Replace "It promotes `common-spectral`" with `common-fem` /
   `common-wave` (the Stage-0 module-placement decision the same line already
   defers).
4. **D-4 (owner sequencing + § 0).** State the precondition that C-1 is closed before
   amulet-acoustic dispatches (serial-cluster discipline), OR have the owner ratify
   running it next-after-C-1-close. (Non-blocking on its own; an owner call.)
5. **D-5 (charter § 4 gate 7 / Unit goldens).** Add Brekhovskikh to the citation
   parenthetical; verify the Bossart year at citation-chain time; clarify which
   goldens are multi-anchor value-tables (≥3 anchors meaningful) vs single-oracle
   checks; fix the §1.4-vs-foundation-§4 interface-condition cross-ref.
6. **D-6 (foundation § 3.2 / § 6).** State and justify the 2D elastic assumption
   (plane strain recommended for a cross-section / COMSOL default), note the effect
   on c_P and R/T, and fold the choice's error into the UQ budget.
7. **D-7 (foundation § 7 + § 11.2; charter Unit B).** Add an elastic-PML
   plane-wave-through-box reflection gate with **separate P- and S-wave
   grazing-incidence** checks; state that the time-domain elastic-PML instability is
   moot in the frequency domain (so no M-PML is needed).
8. **D-8 (foundation § 4.1).** Pin one unambiguous normal-orientation convention and
   make the normal-acceleration sign consistent with the § 4.4 block form and the
   "equals" prose.
9. **D-9 (foundation § 5 / charter G-coupling).** Upgrade § 4.2 verification from the
   qualitative shift-and-broaden gate to a quantitative one (Δf/ΔQ convergence vs
   FLNS within a measured tolerance, or a compliant-wall semi-analytic limit).
10. **D-10 (foundation § 3.3 / charter Unit C).** Require the FLNS↔SLNS equivalence to
    include a curved/cornered channel representative of the spiral, with the tolerance
    established in that geometry before SLNS drives the Figure-6 product.
11. **D-11 (foundation, minor).** State the e^{iωt} complex-modulus sign M(1+iη);
    name the thermal BC at the cavity mouth; state that the spiral thermoviscous field
    has no direct analytic oracle (rests on verified-FLNS + convergence + SLNS
    agreement); specify the norm for the MMS OOA.

---

## Constraints honored

- **Read-only** except for landing this one audit file. The charter and foundation
  doc were **not** edited; all issues are recorded here as findings/required-deltas
  for the owner to decide on (HARD CONSTRAINT).
- **Did NOT** run Stage 0, `replay_prior_phase.py`, or the read-the-disk probe; did
  **not** dispatch the build.
- Every specific claim is grep/read-verified at HEAD `ce556d2` (Convention #8) and
  tagged FACT/INFERENCE. Append-only.

**Verdict returned to owner: SHIFTED.** Dispatch is appropriate once D-1, D-2, D-6,
D-7, D-8 are applied and D-3/D-4/D-5/D-9/D-10/D-11 are applied-or-accepted. The plan
is strong; none of the deltas touch its architecture.

*End of pre-dispatch review.*
