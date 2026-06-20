# Phase 6.amulet-acoustic — 2D Coupled Acoustic–Structure–Thermoviscous DoA Forward-Model

> **Spec anchor:** docs/architecture.md v2.4+ § 15 (Waves — Acoustic/Elastic) + Appendix H.7 (waves V&V posture) + § 3.5 (13-gate acceptance).
> **Phase 6 charter anchor:** `docs/phases/phase-6-charter.md` — the v1.3 two-lane serial cluster model (§ 3); the v2 verification-hardening stack (§ 2.3 / § 2.4) remains normative. See the v1.3 reconciliation note below.
> **Physics & method authority:** `amulet-2d-coupled-solver-foundation.md` — the governing equations, coupling conditions, parameter table, mesh sizing, PML setup, excitation, and analytic verification benchmarks live there. This charter is the *execution* plan; it does not restate the physics, it points to it. The two documents are reconciled on every number.
> **Source paper (in hand):** Bergey, Garg, Gadre, *AMULET*, SenSys '26. Data/STLs: github.com/adbergey/AMULET.
> **Execution model (reconciled to parent charter v1.3):** Two-lane serial **cluster** execution (`docs/phases/phase-6-charter.md` § 3, v1.3). One coordinator chat + one charter-first self-driving Claude Code agent (spec § 7.13), auto-accept, committing direct-to-`main` with continuation handoffs. **No per-track tag** — a single `v0.6.0-phase-6` is proposed once at *phase* close (operator-pushed; I7 / spec § 7.12). *(Supersedes this charter's original v1.2 "sequential single-agent track, tagged at track close" framing — see the v1.3 reconciliation note below.)*

> **v1.3 reconciliation (applied 2026-06-20).** This charter was drafted against parent charter **v2** (the multi-track / per-track-tag / per-track-audit-dir model). The parent's **v1.3 amendment** (landed 2026-06-11; record `docs/_audits/phase-6/charter-amendment-operating-model-2026-06-11T12-51-28Z.md`) superseded exactly three things, now applied throughout this charter:
> 1. **multi-track standalone → two-lane serial cluster** execution (parent § 3);
> 2. **per-track tags → a single `v0.6.0-phase-6`** proposed once at phase close (per-track / per-cluster tag language stripped; the operator-only-push rule itself stands);
> 3. **per-track audit dir → the consolidated `docs/_audits/phase-6/`** (track-prefixed filenames; the dir already exists and hosts the C1-cluster audits).
>
> The full **v2 verification-hardening stack** (TDD output-hash, ≥3 anchors, tolerance budget, mutation, PBT, perf-ledger, pre-dispatch review, cross-phase replay) **remains normative** under v1.3, with "track" read as "cluster". Cross-phase replay anchors on **`v0.5.0-phase-5`** (the most recent phase tag).

> **ARCHITECTURE — read first.** The deliverable is AMULET **Figure 6**: a *time-harmonic* (steady-state) field map over (angle, frequency). That is natively a **frequency-domain** problem. The primary engine for this track is a **frequency-domain coupled finite-element solver** (Helmholtz in water + Navier–Cauchy elastodynamics in PLA + linearized-Navier–Stokes thermoviscous acoustics in the air cavity), driven by a scattered-field plane-wave background, truncated by a PML, swept over angle × frequency. **Time-domain solving and inverse design are explicitly OUT OF SCOPE for this track** — they were the wrong tool for this deliverable and are deferred to a later track if pursued at all.

> **Verification-hardening amendments (the v2 stack, normative under parent charter v1.3):**
>
> - **Cross-phase audit replay (first action):** Stage 0 runs `replay_prior_phase.py` against the **`v0.5.0-phase-5`** landing audit (the most recent phase tag).
> - **TDD output-hash in commit footer:** per spec § 1.3 step 4.
> - **Independent-reference anchors (new golden tables):** ≥ 3 per table per spec § 2.4.
> - **Tolerance-budget compliance:** tolerances **measured-then-declared**, never widened to pass (spec § 2.6).
> - **PBT-covered invariants in spec § 6:** per spec § 2.14.
> - **Perf-ledger row per sim/stage:** per spec § 2.15.
> - **Mutation-testing thresholds:** per spec § 2.13.
> - **Phase-plan review (Convention E-addendum):** owner runs pre-dispatch review before dispatch.
> - **Evidence-path verification + append-only check:** at closing audit.
> - **Operator-only tag pushing:** the track closes WITHOUT a per-track tag (v1.3 — a single `v0.6.0-phase-6` lands at *phase* close); the closing audit still ends with `Tag pushed: NO (operator action required)`.

---

## § 0 — Preconditions

P0.1 Prior-phase tag `v0.5.0-phase-5` exists; `replay_prior_phase.py` against its landing audit passes (Stage-0 gate, blocking).

P0.2 **Honest V&V framing — the Level-1/2-in-repo, Level-3/4-experimental split (binding).** This track owns Roy-2005 **Level 1 (code verification)** and **Level 2 (solution verification)** in-repo. It does **not** own Level 3 (model validation) or Level 4 (calculation/experiment validation) as repo deliverables — those happen in the owner's tank with physical printed structures. The repo deliverable is a **verified frequency-domain coupled forward model** plus the **harness and verdict protocol** for tank validation. No Level-1/2 "CONFIRMED" verdict may be applied to a Level-3 validation claim; the sim-to-measurement gap is a **finding to quantify with uncertainty bars**, not a number to drive to zero or a verdict to assert. This boundary is auditable (gate G-uq).

P0.3 This track lands the **first acoustic/waves-family solver** in the portfolio (spec § 15 was catalog-planned). It promotes `common-spectral`. Whether to create a new `common-fem` / `common-wave` module (assembly, complex sparse solve, PML, mixed elements) or fold into existing common modules is a **Stage-0 probe finding**; the agent decides per the probe and records the decision in the Stage-0 report (not routed as a blocking question).

P0.4 External-data availability confirmed at Stage-0 probe: AMULET released signatures + STL geometry fetchable from github.com/adbergey/AMULET (web-fetch evidence committed). If unavailable, the validation rung degrades to owner-tank-data only and the AMULET cross-validation claim is withdrawn until data is in hand; the charter does not block.

P0.5 The physics/method foundation doc is the authority for all governing equations, coupling conditions, the §1 parameter table, mesh sizing (96 kHz design frequency), PML configuration, scattered-field excitation, and the analytic verification benchmarks. The agent reads it before Stage 1 and treats any conflict between it and this charter as a HARD-STOP to the owner (there should be none — they are reconciled).

---

## § 1 — Scope

**Ships in this track:**

1. **Frequency-domain Helmholtz solver (water)** — P2 Lagrange, complex sparse solve, PML truncation. The floor everything couples onto.
2. **Frequency-domain elastodynamics solver (PLA)** — Navier–Cauchy, full P and S wave support, complex modulus (loss factor), elastic PML.
3. **Frequency-domain thermoviscous solver (air cavity)** — **full linearized Navier–Stokes (FLNS) as the truth model**, mixed inf-sup-stable elements (P2 velocity/temperature, P1 pressure), resolved boundary-layer mesh; **SLNS (three-Helmholtz) as the GPU-affordable production form**, cross-checked against FLNS. LRF / boundary-layer-impedance surrogates are documented fallbacks for fast sweeps only, never the truth model (per the over-not-under fidelity stance).
4. **The coupling** — Acoustic–Structure Boundary (inviscid water ↔ PLA: normal-only) and Thermoviscous Acoustic–Structure Boundary (air ↔ PLA: full no-slip vector + full stress + isothermal walls), plus thermoviscous↔inviscid stitching at the cavity mouth.
5. **Scattered-field plane-wave excitation** and the **(angle × frequency) sweep** reproducing the Figure-6 grid (9–90 kHz × 0–180°), extensible to the full **1–88 kHz** band over **0–360° at 1°** for design use. Built around **factor-once-per-frequency / back-substitute-per-angle** (the dominant speedup — the system matrix is identical across angles at fixed frequency; only the background-field RHS changes).
6. **Verification harness** against the analytic oracles (foundation doc §11): MMS (Helmholtz + Navier), plane-wave-through-PML reflection, fluid–solid plane-wave reflection/transmission vs angle (the "solid path" benchmark), Bessel cylindrical-cavity eigenmodes, analytic LRF tube/slit impedance.
7. **FEniCSx independent cross-check** — an open-source frequency-domain FEM second implementation of one canonical coupled case, in the cross-stack-equivalence role (the COMSOL the owner cannot license; FeniCSx is the in-repo, CI-able stand-in). COMSOL v6.3, if ever available, is out-of-band confirmation logged in the audit, not a gate.
8. **Validation harness + UQ budget** comparing simulated signatures against AMULET released data and owner tank data; headline output is the **sim-to-measurement gap with error bars** (P0.2).

**Does not ship:** time-domain solver; inverse design / differentiable design loop / j-Wave (deferred to a future track); 3D (the paper's own "several months" problem); tank experiments (owner-experimental); topology optimization; seal-coat-layer modeling beyond an optional thin-coating term (Caveat in foundation doc).

**Fidelity stance (binding):** over-resolve when uncertain. Full thermoviscous primary; mesh sized to the **96 kHz** hydrophone ceiling; 6–8 elements per shortest wavelength; ≥8 graded boundary-layer mesh layers; 8–10 PML layers. All per the foundation doc.

---

## § 2 — Per-unit charter

Each sim unit ports through the 13-gate acceptance (spec § 3.5); infrastructure units use the surrogate verification of spec § 2.11.

- **Unit A — Helmholtz (water) solver** (sim, 13-gate). PBT: energy conservation in the lossless limit; PML reflection below declared bound (measured-then-declared). Golden (≥3 anchors each): MMS observed-order-of-accuracy (O(h³) for P2); oscillating-cylinder Hankel-function analytic field; PML plane-wave-through-box spurious-reflection level.
- **Unit B — Elastodynamics (PLA) solver** (sim, 13-gate). PBT: P/S energy partition; reciprocity. Golden: Navier MMS; analytic P- and S-wave dispersion; rod/plate eigenfrequencies.
- **Unit C — Thermoviscous (air) solver** (sim, 13-gate). FLNS primary + SLNS production; FLNS↔SLNS equivalence (tolerance measured-then-declared). Golden: analytic LRF slit/tube complex wavenumber and impedance vs FLNS; Stokes boundary-layer velocity profile. Mesh: inf-sup-stable mixed elements; resolved boundary layer per foundation doc §6.
- **Unit D — Coupled solver** (sim, 13-gate). Assembles A+B+C via the §1.4 interface conditions. PBT: energy balance (incident = reflected + transmitted + dissipated); reciprocity (source↔receiver). Golden: **fluid–solid plane-wave reflection/transmission coefficients vs incidence angle, including P/S mode conversion and critical angles** (the load-bearing coupling benchmark — confirms Path 2 / the solid path); Bessel cavity eigenmodes (confirms Path 3 reverberance). Acceptance signature: resonances must **shift down and broaden** when thermoviscous losses are switched on (if they don't, coupling is wrong — this is a gate, not a note).
- **Unit E — Geometry + sweep + Figure-6 reproduction** (sim/diagnostic, 13-gate). STL cross-section voxelization/meshing from the AMULET 3D models; scattered-field plane-wave background; the (angle × freq) sweep with factor-once-per-frequency reuse; assembly of the (θ, f) field/hydrophone map. Geometry-fidelity / mesh-convergence study at 96 kHz (gate G-geom). Output: a reproduction of the Figure-6 grid (gate G-fig6 — qualitative match to the paper's reverberance map; qualitative because absolute levels depend on Level-3 modeling completeness not yet validated).
- **Unit F — Validation harness + UQ budget** (infrastructure, spec § 2.11). Ingests AMULET released signatures + owner tank data; computes per-angle cross-correlation, recovered goodness metric, DoA-error analogue under the paper's matching algorithm; assembles the UQ budget (numerical via GCI; model-form via the thermoviscous residual, geometry/staircasing, PLA material/damping uncertainty, seal-coat, air-fill fraction; measurement via tank). Headline: the gap with error bars (gate G-uq).

---

## § 3 — Stage decomposition

Verification-before-implementation throughout; NumPy numerical validation precedes any GPU work; ≤500-line commits, new files first (Convention A); failing-tests committed first with output-hash footer, implementation witnesses the hash (spec § 1.3 step 4); re-anchor against HEAD before every edit (Convention M, HEAD wins on drift); full CI sweep per push, any red stops (§ S.5); grep-verify all specifics, never assert from memory (Convention #8).

- **Stage 0 — Bootstrap, replay, probe, review.** First action: `replay_prior_phase.py` vs `v0.5.0-phase-5` (blocking). Audits land in the existing consolidated `docs/_audits/phase-6/` (track-prefixed `amulet-acoustic-*`; no separate dir to bootstrap). Read the foundation doc. Probe (read-the-disk, committed before any spec locks): testkit MMS / GCI / golden / PBT / determinism / equivalence surfaces; `common-spectral` surface; complex-sparse-solve and mixed-element FEM infra availability; `common-fem`/`common-wave` placement decision; AMULET STL + data fetchability (web-fetch evidence). Owner pre-dispatch review → `amulet-acoustic-pre-dispatch-review-<UTC>.md`, verdict CONFIRMED/SHIFTED before Stage 1.
- **Stage 1 — Unit A (Helmholtz/water).** Frequency-domain scalar Helmholtz, P2, PML. MMS gate (OOA within ±0.5 of formal); plane-wave-through-PML reflection < declared bound; Hankel oscillating-cylinder check. *Independent of every open question — the safe floor.*
- **Stage 2 — Unit B (elastodynamics/PLA).** Navier–Cauchy, P/S support, complex modulus, elastic PML. Navier MMS; P/S dispersion; eigenfrequency check.
- **Stage 3 — Unit C (thermoviscous/air).** FLNS (mixed elements, boundary-layer mesh) + SLNS; FLNS↔SLNS equivalence; LRF impedance + Stokes-profile goldens.
- **Stage 4 — Unit D, half 1 (water↔PLA coupling).** Acoustic–Structure Boundary. Fluid–solid R/T-vs-angle golden (confirm the solid path appears); Bessel cavity modes.
- **Stage 5 — Unit D, half 2 (air↔PLA + full coupling).** Thermoviscous Acoustic–Structure Boundary; full three-physics assembly. Energy-balance + reciprocity PBT; the resonance-shift-and-broaden acceptance signature.
- **Stage 6 — Unit E (geometry + sweep + Figure 6).** STL cross-section meshing; scattered-field background; factor-once-per-frequency angle sweep; Figure-6 grid reproduction; geometry/mesh-convergence study at 96 kHz.
- **Stage 7 — GPU port + perf + determinism.** Port the coupled solver to the project GPU stack; perf-ledger rows; determinism declaration; cross-file hash-regression gate (same adapter/seed, new-file@feature-off ≡ old-file hash).
- **Stage 8 — Unit F (validation + UQ).** AMULET-data + tank-data ingestion; per-angle correlation, goodness, DoA-error analogue; UQ budget; gap-with-error-bars artifact.
- **Closing stage.** `verify_evidence`; append-only check; failing-tests replay spot-check (3 random stages); mutation-threshold gate; perf-ledger review (flag any unit > 2× baseline, informational); SHA back-fill as separate commit (Convention #12, never `--amend`); landing audit; `Tag pushed: NO (operator action required)` (I7 — agent never pushes tags or creates releases).

---

## § 4 — Acceptance criteria

13-gate set per sim unit (A–E) per spec § 3.5, with the Phase-4-inherited mechanical gates:

1. Spec sheet committed. 2. Pre-implementation probe committed. 3. Tests committed **failing first** with output-hash footer. 4. **Code verification (MMS)** — observed OOA within ±0.5 of formal. 5. Tier-1 diagnostics (NaN/Inf). 6. Tier-2 diagnostics (field invariants — energy balance, PML reflection). 7. Citation chain (Cat 1) — every reference in the foundation doc (Beltman 1999, Tijdeman 1975, Bossart 2003, Kampinga SLNS, Ihlenburg, Atalla & Sgard, Marburg & Nolte, Tarrazó-Serrano PLA properties, COMSOL v6.3 docs, Bergey AMULET) with DOI/arXiv and SHA where vendored. 8. Public API (Cat 2). 9. Capture file + replayable (LFS via the ratified R2 path). 10. Determinism declaration consistent with harness output. 11. **Cross-stack equivalence** (the coupled canonical case ↔ **FEniCSx** independent implementation; tolerance measured-then-declared, never widened). 12. PBT invariants (§ 2). 13. Failing-tests replay verifiable + perf-ledger row.

**Track-specific additional gates:**

- **G-fig6 (Stage 6):** the Figure-6 grid (9–90 kHz × 0–180°) is reproduced and qualitatively matches the paper's air-cavity reverberance map.
- **G-geom (Stage 6):** geometry-fidelity / mesh-convergence study completed at 96 kHz against the AMULET STL cross-section; error quantified and entered in the UQ budget.
- **G-coupling (Stage 5):** resonances demonstrably shift down and broaden when thermoviscous losses are enabled (physical signature of correct coupling).
- **G-uq (Stage 8):** UQ budget assembled with all three uncertainty classes; sim-to-measurement gap reported with error bars; no Level-1/2 "CONFIRMED" applied to any Level-3 claim (P0.2 boundary, auditable).

Verdicts use the four-state set (CONFIRMED / SHIFTED / REFUTED / DEFERRED; compounds DISCONFIRMED-AT-HEAD, REFRAMED). Audits append-only.

---

## § 5 — Per-unit agent prompt template

```
COLD START. You are the Phase 6.amulet-acoustic agent (Claude Code, Opus 4.8 or Sonnet 4.6).
Repo: git@github.com:StevenFAU/Bit-Physics.git, local /home/clipbird/Projects/Bit-Physics.
Read docs/phases/phase-6-amulet-acoustic.md AND amulet-2d-coupled-solver-foundation.md in full
before acting. Self-drive; do not check in unless you hit a HARD-STOP.

ARCHITECTURE: this is a FREQUENCY-DOMAIN coupled FEM solver (Helmholtz water + Navier
elastodynamics PLA + thermoviscous LNS air), scattered-field plane-wave excitation, PML,
swept over angle x frequency to reproduce AMULET Figure 6. NOT time-domain. NOT inverse design.

FIRST ACTION: run replay_prior_phase.py against the v0.5.0-phase-5 landing audit. If RED, HARD-STOP.

Then proceed Stage 0 -> closing per § 3. For the current stage <N>:
  1. Re-anchor against origin/main HEAD (Convention M). HEAD wins on any drift.
  2. Probe-then-spec-then-failing-tests-then-implement. NumPy numerical validation precedes
     any GPU work. <=500-line commits, new files first (Convention A).
  3. Failing tests committed first, output-hash in commit footer; implementation witnesses it.
  4. Measure tolerances from disk, then declare. NEVER widen a tolerance to pass a gate.
     NEVER reverse-engineer a bound. 4x measured headroom is the standard for declared bounds.
  5. Full CI sweep per push (§ S.5). Any red -> stop and fix; do not proceed red.
  6. SHA back-fill is a SEPARATE commit (Convention #12), never --amend.
  7. NEVER push tags or create releases (I7). Closing audit ends "Tag pushed: NO".
  8. Surface real conflicts; never force/absorb silently (HARD RULE 2).
  9. Audits under docs/_audits/phase-6/ (track-prefixed amulet-acoustic-*) are append-only. FACT/INFERENCE tag
     every concrete claim; grep-verify all specifics (Convention #8) — never assert from memory.
  10. Build full thermoviscous (FLNS) as truth, SLNS as production; mesh to 96 kHz; 6-8 elem/
      wavelength; >=8 boundary-layer mesh layers; 8-10 PML layers. Foundation doc is authority.

HARD-STOP conditions (stop, write state, escalate — do not work around):
  - replay_prior_phase RED.
  - A declared tolerance cannot be met without widening it (finding, not a failure to paper over).
  - Foundation doc and charter conflict on any number (they are reconciled; a conflict is a defect).
  - AMULET released data unfetchable (validation degrades to owner-tank-only; withdraw the claim).
  - Resonances do NOT shift/broaden when thermoviscous losses are enabled (coupling defect).
  - Any cross-lane conflict or contact with an out-of-scope compute surface.

Report at each stage boundary in the structured stage-report format (gate table, file manifest
new-vs-modified, four-state verdicts, convention-compliance self-audit, deferred items, HEAD SHA).
```

---

## § 6 — Decisions left for the owner (non-blocking — technical calls are already made)

Technical decisions are resolved in this charter and do **not** require owner sign-off: frequency-domain primary; full thermoviscous (FLNS truth / SLNS production); FEniCSx as the in-repo cross-check; inverse design and time-domain deferred out of scope. The agent does not route these back as questions.

The only genuinely owner-prerogative items, none blocking dispatch:

1. **Hardware tier allocation** for GPU production captures (RX 6800 XT for dev/2D; A100 if the coupled grid + boundary-layer mesh pushes memory; the 4× 2080 Ti box for batched frequency sweeps). The agent develops on whatever is available and notes the recommended production tier in the perf-ledger.
2. **Track priority placement** in the Phase 6 § 4 ordering.
3. **Publication framing** (standalone verified-open-solver paper vs portfolio-preprint extension). Affects packaging, not the build.

---

## § 7 — Audit-file paths

Per spec § 8.1:

Reconciled to v1.3: all audits land in the **consolidated `docs/_audits/phase-6/`** (which already exists and hosts the C1-cluster audits), with an `amulet-acoustic-` filename prefix — NOT a per-track `docs/_audits/phase-6-amulet-acoustic/` directory.

- Track lands at `docs/_audits/phase-6/amulet-acoustic-landing-<UTC>.md`.
- Per-unit / per-stage reports at `docs/_audits/phase-6/amulet-acoustic-<unit-or-stage>-<UTC>.md`.
- Pre-dispatch review at `docs/_audits/phase-6/amulet-acoustic-pre-dispatch-review-<UTC>.md`.
- No audit-directory bootstrap commit is needed — the consolidated `docs/_audits/phase-6/` already exists; the track's first audit (the Stage-0 report) simply lands there.

---

## Appendix — One-paragraph honest read for the owner

The architecture is now right for the deliverable: Figure 6 is a steady-state field map, so the engine is a frequency-domain coupled FEM, and the verification moat's MMS/GCI machinery clears Roy Levels 1–2 in-repo above the median published acoustics bar. The build is block-by-block with an analytic oracle at every step, so each piece is trustworthy before it couples to the next; the fluid–solid reflection/transmission benchmark in Stage 4 is the one that proves the "solid path" physics, and the resonance-shift-and-broaden check in Stage 5 is the one that proves the thermoviscous coupling. The factor-once-per-frequency structure makes the full 0–360°-at-1° calibration map tractable rather than 360× the cost. The two real risks are both Level-3 (modeling completeness, not code correctness): the PLA elastic constants and damping the paper does not give (calibrate against your own samples), and the sim-to-measurement gap itself (validated in your tank, reported with error bars, treated as the finding). The thermoviscous physics — the historical hard part — is handled at full fidelity (FLNS) rather than hedged, with SLNS as the affordable production form and the analytic LRF impedance as the verification anchor.
