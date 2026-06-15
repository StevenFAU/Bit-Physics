# Phase 6 / Cluster C-1 — Phase-4-Greenfield-CPU pool — Cluster Charter

> **Project:** Bit-Physics (`git@github.com:StevenFAU/Bit-Physics.git`; owner: Steven Cohen)
> **Spec anchor:** `docs/architecture.md` v2.4 § 11.5 (items 4.2 / 4.12 / 4.15–4.17 / 4.20–4.22) + § 12.9 (citation registry) + Appendix D (§ D.2.3 descriptors, § D.6 13 gates, § D.7 tier-2 substacks) + Appendix E (playbook).
> **Phase-6 charter anchor:** `docs/phases/phase-6-charter.md` v1.3 § 2.6 (Phase-4-Greenfield-CPU deferral track) + § 3.2 (C-1 = first cluster).
> **Plan location:** `docs/phases/phase-6/c1-charter.md` (this file).
> **Execution model:** Lane A, serial single-agent self-driving dispatch with continuation handoffs (charter v1.3 § 3.2); charter-first PHASE-0 HARD-STOP pattern.
> **Status:** **PROPOSED — awaiting operator ratification.** Nothing in this cluster is built until Steven ratifies §§ 4–6.
> **Authored:** 2026-06-11 (charter-stage session; all records below read at HEAD `e08da52` or fetched live this session).

---

## § 0 — Preconditions and provenance

- `git pull --rebase` run at session start: already up to date at `e08da52`.
- Read at HEAD this session: `docs/phases/phase-6-charter.md` (v1.3 incl. operating-model amendment), `docs/_audits/phase-4/landing-2026-06-01T01-44-34Z.md` (§ 4 deferred scope), `docs/phase4/ledger.md` (27-row ledger + deferred re-scope section), `docs/phases/phase-4-plan.md` (§§ 8.1–8.4 stage briefings), `docs/architecture.md` (§ 5.6–§ 5.8 frontier inventory, § 12.9 citation registry, Appendix A.2, Appendix D, Appendix E), `docs/_audits/phase-4/batch-2-charter-2026-05-31T20-04-45Z.md` and `batch-3-charter-2026-05-31T22-13-27Z.md` (HELD-sim rationale), `tools/testkit/equivalence/tolerance.toml` + `tolerance-budget.toml` (category inventory).
- Every paper anchor in § 2 was fetched live this session (Convention #8 — measure live, never assert from memory). URLs recorded per row.
- Master catalog **not** used for anchoring (SUPERSEDED for anchoring purposes per charter § 3.2 / dispatch convention #10).
- Cross-phase audit replay (charter v2-amendment item 2) is a **build-dispatch first action**, not a charter-stage action; it is scheduled in § 7 below.

## § 1 — Pool enumeration (Stage A — from landed records, no memory)

C-1 = the **Phase-4-Greenfield-CPU** deferral pool: the 8 Phase-4 frontier rows deferred with cause *other than* missing CUDA hardware. Authoritative sources:

- `docs/_audits/phase-4/landing-2026-06-01T01-44-34Z.md:160-165` (§ 4 Home 2) — "**Phase-4-Greenfield-CPU** (CPU-feasible; each needs a base sim / sound-anchor first) — 8 sims".
- `docs/phase4/ledger.md:83-97` (deferred re-scope, Home 2 table) and the per-row Status column.
- `docs/phases/phase-6-charter.md:106-107` (§ 2.6) — "the 8 greenfield-needs-base-sim frontier rows (base sims first, then ports), operator-decidable batches."

Reconciliation: 9 LANDED + 10 (→ Phase-4-CUDA, parked per charter § 3.2) + 8 (→ this pool) = 27 = spec § 11.5 items 4.1–4.27 (`docs/_audits/phase-4/landing-2026-06-01T01-44-34Z.md:167-168`). No row is in two pools; membership of all 8 is unambiguous.

| # | Ledger row / stage | Spec item | Sim / planned variant | Original stack | Recorded deferral cause (verbatim) | Deferral record |
|---|---|---|---|---|---|---|
| 1 | 10 | 4.2 | `particle-fluids/sph-water` / `diff` | D (DiffTaichi — locked v8 amendment, plan § 8.1) | "deferred → P4-Greenfield-CPU (5th diff sim; CPU-feasible, operator-decidable future diff batch)" | `docs/phase4/ledger.md:29`; prerequisite row "a 5th differentiable sim — CPU-feasible; operator-decidable for a future diff batch" `docs/phase4/ledger.md:90` |
| 2 | 20 | 4.12 | `particle-fluids/sph-water` / `neural` (3DGS-SPH) | E | "deferred → P4-Greenfield-CPU (greenfield-needs-base-sim; no landed Stack-E SPH parent; operator-HELD batch-2)" | `docs/phase4/ledger.md:39`; `docs/phase4/ledger.md:91`; hold rationale `docs/_audits/phase-4/batch-2-charter-2026-05-31T20-04-45Z.md:121` |
| 3 | 23 | 4.15 | `volumetric-grid/eulerian-smoke` / `frontier-clebsch-pfm` | C | "deferred → P4-Greenfield-CPU (greenfield-needs-base-sim; new particle-flow-map substrate, Stack-C)" | `docs/phase4/ledger.md:42`; `docs/phase4/ledger.md:92`; hold rationale batch-3 charter §1.3 (`docs/_audits/phase-4/batch-3-charter-2026-05-31T22-13-27Z.md:90,99`) |
| 4 | 24 | 4.16 | `volumetric-grid/eulerian-smoke` / `frontier-edge` | C | "deferred → P4-Greenfield-CPU (greenfield-needs-base-sim; EDGE compressible flow-map, Stack-C)" | `docs/phase4/ledger.md:43`; `docs/phase4/ledger.md:93`; batch-3 charter `docs/_audits/phase-4/batch-3-charter-2026-05-31T22-13-27Z.md:91` |
| 5 | 25 | 4.17 | `volumetric-grid/eulerian-smoke` / `frontier-vpfm` | C | "deferred → P4-Greenfield-CPU (greenfield-needs-base-sim; VPFM flow-map, Stack-C)" | `docs/phase4/ledger.md:44`; `docs/phase4/ledger.md:94`; batch-3 charter `docs/_audits/phase-4/batch-3-charter-2026-05-31T22-13-27Z.md:92` |
| 6 | 28 | 4.20 | `continuous-ca/neural-ca` / `frontier-difflogic-ca` | D + § 4.2.A | "deferred → P4-Greenfield-CPU (greenfield-needs-base-sim; differentiable-logic CA substrate; operator-HELD batch-3)" | `docs/phase4/ledger.md:47`; `docs/phase4/ledger.md:95`; batch-3 charter §3.4 (`docs/_audits/phase-4/batch-3-charter-2026-05-31T22-13-27Z.md:172-176`) |
| 7 | 29 | 4.21 | `lattice/lattice-boltzmann-d3q19` / `frontier-moment-encoded` | C + § 4.2.B | "deferred → P4-Greenfield-CPU (qualitative-anchor-leaning; sound-anchor strategy needed first; operator-HELD batch-3)" | `docs/phase4/ledger.md:48`; `docs/phase4/ledger.md:96`; batch-3 charter `docs/_audits/phase-4/batch-3-charter-2026-05-31T22-13-27Z.md:89,101` — **note record conflict, § 5 item A-2** |
| 8 | 30 | 4.22 | `volumetric-grid/eulerian-smoke` / `frontier-gaussian-fluids` | E + § 4.2.B + § 4.2.C | "deferred → P4-Greenfield-CPU (greenfield-needs-base-sim; new 3DGS-fluid substrate; operator-HELD batch-3)" | `docs/phase4/ledger.md:49`; `docs/phase4/ledger.md:97`; batch-3 charter `docs/_audits/phase-4/batch-3-charter-2026-05-31T22-13-27Z.md:100` |

The ten Phase-4-CUDA rows (15/16/17/18/22/31/32/33/34/35) stay parked pending an A100-class CUDA-12 host (`docs/phase4/ledger.md:65-81`; charter § 3.2) and are **out of C-1 scope**.

## § 2 — Live anchor verification (Stage B — PHASE-0 HARD-STOP pattern)

Every assigned anchor was fetched live this session. Recorded-anchor sources: plan § 8.1 (`docs/phases/phase-4-plan.md:2463`), plan § 8.3 (`:2508`), plan § 8.4 table (`:2529-2538`), spec § 12.9 registry (`docs/architecture.md:2206-2221`), spec Appendix A.1/A.2 (`docs/architecture.md:2247`, `:2273-2310`). Verdicts: **CONFIRMED** (record matches live source) or **SHIFT** (record wrong; corrected below). **No anchor is unrecoverable — zero BLOCKED-pattern sims.** All eight anchors have open-access pages (arXiv, project pages, or ACM DL landing pages readable without paywall for bibliographic data).

| # | Sim (stage) | Recorded anchor (verbatim) | Live verification — URL(s) fetched + what was confirmed | Verdict |
|---|---|---|---|---|
| 1 | sph-water-diff (S10) | "Hu, Y., et al. (2020). 'DiffTaichi: Differentiable Programming for Physical Simulation.' *ICLR '20*." (`docs/architecture.md:2247`); "D (DiffTaichi — locked v8 amendment)" (`docs/phases/phase-4-plan.md:2463`) | <https://arxiv.org/abs/1910.00935> — title exact; "Published at ICLR 2020"; authors Yuanming Hu, Luke Anderson, Tzu-Mao Li, Qi Sun, Nathan Carr, Jonathan Ragan-Kelley, Frédo Durand. Method = reverse-mode-differentiable Taichi kernels — matches the `ti.ad.Tape` diff-variant pattern of the 4 landed diff sims. | **CONFIRMED** |
| 2 | 3dgs-sph (S20) | "Liu et al. 2024 Gaussian Splashing" (`docs/architecture.md:2209`, `:2261`, `:1123`, `:1230`); "neural (3DGS-SPH; Gaussian Splashing 2024)" (`docs/phases/phase-4-plan.md:2508`) | <https://arxiv.org/abs/2401.15318> — authors **Yutao Feng**, Xiang Feng, Yintong Shang, Ying Jiang, Chang Yu, Zeshun Zong, Tianjia Shao, Hongzhi Wu, Kun Zhou, Chenfanfu Jiang, Yin Yang — **no author named Liu**. Current (v2, 2024-07-23) title: "Gaussian Splashing: **Unified Particles for Versatile Motion Synthesis and Rendering**"; v1 (2024-01-27) subtitle was "Dynamic Fluid Synthesis with Gaussian Splatting". Method = PBD unified particles + 3DGS rendering — matches spec's description "PBD + 3DGS for dynamic fluid synthesis" (`docs/architecture.md:1230`); the **SPH coupling is our adaptation** ("SPH-extensible", `docs/architecture.md:1123`), already flagged at batch-2 (`docs/_audits/phase-4/batch-2-charter-2026-05-31T20-04-45Z.md:121`). | **SHIFT S-1** (author attribution + title) |
| 3 | clebsch-pfm (S23) | "Clebsch-PFM 2024 (SIGGRAPH Asia)" (`docs/phases/phase-4-plan.md:2531`); registry slug `clebsch-pfm-2024` (`docs/architecture.md:2218`); but Appendix A.2: "Li, Z., et al. (2025) … *SIGGRAPH '25* Best Paper Honorable Mention. ACM TOG 44(4)" (`docs/architecture.md:2274`) | <https://pearseven.github.io/PFMClebschProject/> + <https://dl.acm.org/doi/10.1145/3731194> — "Clebsch Gauge Fluid on Particle Flow Maps"; authors Zhiqi Li, Candong Lin, Duowen Chen, Xinyi Zhou, Shiying Xiong, Bo Zhu (Georgia Tech / Zhejiang); ACM TOG 44(4), **SIGGRAPH 2025 (North America), Best Paper Award Honorable Mention**. Method = Clebsch wave functions evolved on particle flow maps via novel gauge transformation + coarse-grid velocity reconstruction — matches spec § 5.6 description (`docs/architecture.md:1146`). No arXiv preprint confirmed: the project page's listed arXiv 2409.06246 resolves to a *different* paper, "Particle-Laden Fluid on Flow Maps" (verified <https://arxiv.org/abs/2409.06246>). Canonical anchor = DOI `10.1145/3731194`. | **SHIFT S-2** (plan-table year/venue + registry slug year) |
| 4 | edge (S24) | "EDGE 2024 (SIGGRAPH; compressible flow-map)" (`docs/phases/phase-4-plan.md:2532`); slug `edge-compressible-2024` (`docs/architecture.md:2219`); A.2: "Chen, D., Li, Z., et al. (2025). 'Fluid Simulation on Compressible Flow Maps (EDGE).' *SIGGRAPH '25*. ACM TOG 44(4)" (`docs/architecture.md:2275`) | **The record conflates two distinct SIGGRAPH 2025 papers:** (a) "**EDGE: Epsilon-Difference Gradient Evolution for Buffer-Free Flow Maps**" — Zhiqi Li, Ruicheng Wang, Junlin Li, Duowen Chen, Sinan Wang, Bo Zhu (Georgia Tech); buffer-free Hermite flow maps, O(1) memory, up to 90% backward-map memory reduction — <https://pearseven.github.io/EDGEProject/> + <https://dl.acm.org/doi/10.1145/3731193>; (b) "**Fluid Simulation on Compressible Flow Maps**" — Chen, Li, Zhang, He, Zhou, van Bloemen Waanders, Zhu; unified compressible flow-map framework (shocks / weakly-compressible / shallow water) — <https://cdwj.github.io/projects/compressible-flowmap-project-page/index.html> + <https://dl.acm.org/doi/10.1145/3731192>. The compressible paper's project page **never uses the term "EDGE"** (verified this session); the batch-3 description "Epsilon-Difference Gradient Evolution for buffer-free flow maps; O(1) memory" (`docs/_audits/phase-4/batch-3-charter-2026-05-31T22-13-27Z.md:91`) describes paper (a). | **SHIFT S-3** (two-paper conflation + year) → **D-class decision D-1, § 6** |
| 5 | vpfm (S25) | "VPFM 2025" (`docs/phases/phase-4-plan.md:2533`); slug `vpfm-2025` (`docs/architecture.md:2220`); A.2: "'Vortex Particle Flow Maps (VPFM).' *SIGGRAPH 2025*" (`docs/architecture.md:2276`) | <https://arxiv.org/abs/2505.21946> + <https://dl.acm.org/doi/10.1145/3731198> — full title "**Fluid Simulation on Vortex Particle Flow Maps**"; authors Sinan Wang, Junwei Zhou, Fan Feng, Zhiqi Li, Yuchen Sun, Duowen Chen, Greg Turk, Bo Zhu; ACM TOG 44(4), SIGGRAPH 2025. Method = vorticity + flow-map quantities on vortex particles, Hessian evolution, dynamic solid boundaries (no-through / no-slip), 3–12× longer flow-map length — matches spec § 5.6 (`docs/architecture.md:1148`). | **CONFIRMED** (title refined to full form) |
| 6 | difflogic-ca (S28) | "DiffLogic CA 2024" slug `difflogic-ca-2024` (`docs/architecture.md:2213`); plan § 8.4 "DiffLogic CA 2024" (`docs/phases/phase-4-plan.md:2536`); batch-3 "(Google, 2024)" (`docs/_audits/phase-4/batch-3-charter-2026-05-31T22-13-27Z.md:74`); but spec body: "Miotti, Niklasson, Randazzo, Mordvintsev, Google; March 2025 … arXiv:2506.04912" (`docs/architecture.md:1095`, `:2304`) | <https://arxiv.org/abs/2506.04912> + <https://google-research.github.io/self-organising-systems/difflogic-ca/> + ISAL proceedings <https://direct.mit.edu/isal/proceedings/isal2025/37/54/134069> — "Differentiable Logic Cellular Automata: From Game of Life to Pattern Generation"; authors Pietro Miotti, Eyvind Niklasson, Ettore Randazzo, Alexander Mordvintsev (Google Paradigms of Intelligence); **2025** (blog March 2025; arXiv June 2025; ALIFE/ISAL 2025 proceedings). Method = NCA + differentiable logic-gate networks (DLGN), end-to-end differentiable in training, fully discrete at inference; learns Conway's Game of Life — matches the batch-3 frozen-gate/truth-table scoping. | **SHIFT S-4** (year 2024 → 2025 in slug, plan, batch-3 prose) |
| 7 | moment-encoded-lbm (S29) | "Chen, Y., Li, W., Levin, D., Wu, K. (2025). 'High-Performance Moment-Encoded Lattice Boltzmann Method.' 1000×400×400, 16-bit quantization, 25% memory reduction, 4.3× speedup, single-GPU" (`docs/architecture.md:1180`, `:2300`); slug `moment-encoded-lbm-2025` (`docs/architecture.md:2214`) | <https://arxiv.org/abs/2602.05295> — "**High-Performance Moment-Encoded Lattice Boltzmann Method with Stability-Guided Quantization**"; authors Yixin Chen, Wei Li, David I.W. Levin, Kui Wu — confirmed; submitted **2026-02-05** (not 2025); abstract claims "16-bit moment quantization", "up to **6×** speedup", "**50%** memory reduction in fluid-only scenarios and **25%** in scenes with complex solid boundaries" — the spec's "4.3× / 25% / 1000×400×400" figures do not match the current abstract (plausibly drawn from a draft or from the predecessor HOME-LBM paper, "High-Order Moment-Encoded Kinetic Simulation of Turbulent Flows", ACM TOG, <https://dl.acm.org/doi/10.1145/3618341>). Method (16-bit moment-space quantization of D3Q19-class LBM with stability analysis) matches the intended frontier delta. | **SHIFT S-5** (year 2025 → 2026; perf-figure drift; no venue beyond arXiv yet) |
| 8 | gaussian-fluids (S30) | "Xing, J., et al. 'Gaussian Fluids: A Grid-Free Fluid Solver based on Gaussian Spatial Representation.' *SIGGRAPH 2025*, Peking University" (`docs/architecture.md:1152`, `:2278`); slug `gaussian-fluids-2025` (`docs/architecture.md:2216`) | <https://arxiv.org/abs/2405.18133> + <https://dl.acm.org/doi/10.1145/3721238.3730620> + <https://xjr01.github.io/GaussianFluids/> — title exact; authors Jingrui Xing, Bin Wang, Mengyu Chu, Baoquan Chen; SIGGRAPH 2025 Conference Papers. Method = velocity field as weighted Gaussian mixture (GSR), continuously differentiable, custom first-order optimization per step; Taylor–Green + Kármán-street evaluations — matches spec § 5.6. Public reference implementation exists: <https://github.com/xjr01/Gaussian-Fluids-Code> (license verification at build-time probe per Appendix D.3; vendor only if LICENSE permits). | **CONFIRMED** |

**Anchor-SHIFT summary (5 SHIFTs, no BLOCKED):** S-1 Gaussian Splashing "Liu et al." → **Feng et al. 2024** + retitle; S-2 Clebsch-PFM "2024 / SIGGRAPH Asia" → **SIGGRAPH 2025, TOG 44(4), DOI 10.1145/3731194**; S-3 EDGE = **two-paper conflation** (D-1); S-4 DiffLogic CA "2024" → **2025, arXiv:2506.04912**; S-5 moment-LBM "2025" → **arXiv:2602.05295, Feb 2026** + perf-figure drift. Per § 0.3 these are recorded here append-only; the spec § 12.9 registry-slug corrections are routed to the cluster-close landing audit (spec Appendix D.8 #8 forbids mid-phase appendix edits). The dispatch's expectation ("every prior frontier batch has SHIFTED at least one anchor") is met: the prior records' wrong years, wrong author attribution, and one conflated DOI-pair are documented verbatim above, not papered over.

## § 3 — Per-sim charter proposals (Stage C)

Common scope shape for every unit (grounded in spec Appendix D at HEAD): variant/reference implementation; capture with the **already-locked descriptor** from Appendix D.2.3; spec sheet de-stubbed (§ 2 cites the § 2-verified anchor); acceptance suite per the 13 gates (Appendix D.6) with the failing-tests-first commit + output hash (spec § 1.3 step 4); **≥ 2 PBT invariants** (spec § 2.14); **≥ 3 independent-reference anchors** per golden table (spec § 2.4); perf-ledger row (spec § 2.15); Tier-2 diagnostics per Appendix D.7. Gate-14 cross-stack equivalence applies only where a cross-stack pairing exists (noted per sim). Reproducibility postures below are **expectations to be MEASURED at build, then declared** (never widened to pass); tolerance routing names the `tolerance.toml` category (`tools/testkit/equivalence/tolerance.toml`).

### 3.1 — U-1 `sph-water-diff` (S10 / spec 4.2, Stack D)

- **Scope:** 5th diff variant per the banked batch-1 pattern: `InverseProblem` subclass + `ParamSpec` (viscosity, kernel-size, density-base, surface-tension, damping — control problem per `docs/phases/phase-4-plan.md:2463`); 3 example scripts; gradient verification `rel_tol=1e-5` (WU-A `verify_sim_gradients`); capture `dam-break-1M-particles-seed42-step1000` (`docs/architecture.md:2507`), schema 1.1.0 `gradient_fields`.
- **Stack:** D (DiffTaichi) — **CONFIRM** (locked v8 amendment; parent `sph-water-stack-d` landed Phase 2 Stage 3). No SHIFT.
- **Gates:** 13 + parent-equivalence (forward pass vs `sph-water-stack-d`). Gate 14: pairs with the landed Taichi parent (same-stack forward equivalence, not a new cross-stack pair). Posture expectation: **bit-exact same-stack** (Taichi CPU serial precedent of the 4 landed diff sims) — MEASURE.
- **PBT (≥2, proposal):** `gradient_matches_finite_difference` + `density_summation_positive` (or `momentum_change_bounded_by_impulse` — pick at build per measured surface).
- **Tolerance routing:** existing `sph` category (`[overrides.sph-water]` already routes; diff row added to parent `equivalence.md`). **No new category.**

### 3.2 — U-2 `neural-ca-frontier-difflogic` (S28 / spec 4.20, Stack D + § 4.2.A)

- **Scope:** Differentiable-Logic CA per the batch-3 RIGOROUS-iff-scoped framing (`docs/_audits/phase-4/batch-3-charter-2026-05-31T22-13-27Z.md:88`): **frozen / hand-constructed gates only — no training ⇒ no EFECT**. Goldens: 16 two-input soft-gate truth tables in the hard limit (closed-form); a hand-constructed circuit reproducing an exact deterministic CA transition (Game-of-Life blinker/glider fixtures); WU-A gradient-vs-FD through soft gates. Capture `growing-emoji-64sq-seed42-step1000` under `neural-ca-frontier-difflogic` (`docs/architecture.md:2536`).
- **Stack:** D + § 4.2.A — **CONFIRM**.
- **Gates:** 13; no cross-stack sibling → gate 14 N/A. Posture expectation: **bit-exact** (discrete logic at inference; soft-gate forward is deterministic CPU) — MEASURE.
- **PBT (≥2, proposal):** `hard_limit_matches_truth_table` (∀ gate, ∀ inputs) + `gradient_matches_finite_difference`; candidate third: gate-output boundedness in [0,1].
- **Tolerance routing:** existing `continuous-ca` category (bit-exact 0.0/0.0 default) — consistent with the bit-exact expectation. **No new category** expected; if MEASURE disagrees, that is a STOP-and-surface, not a widening.
- **Scope ruling needed:** the batch-3 "decidable 4th" IN/HOLD question was left open at batch-3 close (`docs/_audits/phase-4/batch-3-charter-2026-05-31T22-13-27Z.md:339`) — ratified here as D-3.

### 3.3 — U-3 `lattice-boltzmann-frontier-moment-encoded` (S29 / spec 4.21, Stack C + § 4.2.B)

- **Scope:** 16-bit moment-space quantized LBM per arXiv:2602.05295 (anchor S-5), on the landed Stack-C D3Q19 parent. Sound-anchor strategy (the deferral's stated lack, resolved per batch-3 `docs/_audits/phase-4/batch-3-charter-2026-05-31T22-13-27Z.md:89,101`): (a) mass + momentum moment conservation exact-to-FP; (b) D3Q19 moment-transform matrix identities M·M⁻¹ = I as exact linear-algebra goldens (Krüger 2017, spec Appendix A.1); (c) **bounded-quantization equivalence vs the landed parent** on `poiseuille-64x32-seed42-step1000` (`docs/architecture.md:2530`), with the parent's analytic Poiseuille profile as the third independent anchor.
- **Stack:** C — **CONFIRM** (lavapipe-runnable per batch-3 `docs/_audits/phase-4/batch-3-charter-2026-05-31T22-13-27Z.md:89`).
- **Gates:** 13 + frontier-vs-parent bounded equivalence. Posture expectation: **bit-exact same-stack-same-hw** for the quantized update itself (deterministic integer/FP pipeline) — MEASURE; vs-parent is a *bounded-error* comparison by construction (quantization), NOT bit-exact.
- **PBT (≥2, proposal):** `mass_moment_conserved` + `momentum_moment_conserved` (post-collision, periodic no-force regime); candidate third: quantization round-trip error ≤ declared bound.
- **Tolerance routing:** **flags a NEW need** — the vs-parent quantization-equivalence bound does not fit the existing `lbm` cross-stack category (which encodes FP-round-off, not designed 16-bit quantization error). Routed as **D-2** (new category or per-sim override + operator-approved `tolerance-budget.toml` amendment per Appendix D.8 #17 — operator-gated either way; MEASURED-then-declared at build).

### 3.4 — U-4 `eulerian-smoke-frontier-clebsch-pfm` (S23 / spec 4.15, Stack C)

- **Scope:** First unit of the flow-map family; builds the shared **particle-flow-map (PFM) substrate** for Stack C (greenfield — the "new particle-flow-map substrate" of the deferral record). Clebsch wave-function evolution + gauge transformation per DOI 10.1145/3731194 (anchor § 2 row 3). Capture `taylor-green-128cube-seed42-step500` (`docs/architecture.md:2522`).
- **Anchor strategy (replacing the qualitative-only posture that held it at batch-3):** (a) per-particle wave-function normalization |ψ| = 1 preserved exact-to-FP (the paper's gauge constraint — an exact invariant); (b) flow-map composition identity (backward∘forward ≈ id over short horizons, bounded, resolution-converging); (c) Taylor–Green analytic early-time vorticity decay (the parent's existing MMS/golden surface) at matched resolution — plus **qualitative vorticity-preservation reference fixtures vs the landed parent** as the REFRAMED equivalence (plan § 8.4 acceptance language, `docs/phases/phase-4-plan.md:2548`), posture documented in spec-sheet § 6.
- **Stack:** C — **CONFIRM** (lavapipe-runnable per batch-3 `docs/_audits/phase-4/batch-3-charter-2026-05-31T22-13-27Z.md:90`).
- **Gates:** 13; gate 14 N/A (no cross-stack sibling; vs-parent comparison is the REFRAMED frontier equivalence). Posture expectation: **FP-round-off same-stack** (Vulkan reduction ordering — MEASURE; the boids-3d WGSL lesson applies).
- **PBT (≥2, proposal):** `wave_function_normalized` + `velocity_reconstruction_divergence_bounded`; candidate third: gauge-transform invariance of reconstructed velocity.
- **Tolerance routing:** existing `smoke` category for any pointwise comparisons; the REFRAMED qualitative gate is metric-based (vorticity/energy budgets + render-similarity threshold), declared in the spec sheet — **no budget widening**.

### 3.5 — U-5 `eulerian-smoke-frontier-vpfm` (S25 / spec 4.17, Stack C)

- **Scope:** Vortex-particle flow maps per arXiv:2505.21946 (anchor § 2 row 5), **reusing the U-4 PFM substrate** (vorticity + Hessian evolution on particles; solid-boundary treatment deferred to a minimal no-slip fixture — the full dynamic-boundary surface is the paper's heaviest part and ships only if the build probe sizes it CPU-feasible; otherwise documented SHIFT). Capture `taylor-green-128cube-seed42-step500` (`docs/architecture.md:2524`).
- **Anchor strategy:** (a) discrete div(curl) = 0 identity on the reconstructed velocity (exact); (b) total-circulation / vorticity-moment budgets bounded (Kelvin); (c) Taylor–Green analytic decay + REFRAMED qualitative vortical-agreement fixtures vs parent.
- **Stack:** C — **CONFIRM**. Gates / posture / tolerance: as U-4 (13 gates; gate 14 N/A; FP-round-off expectation; `smoke` category + metric-based REFRAMED gate).
- **PBT (≥2, proposal):** `reconstructed_velocity_divergence_free` + `total_circulation_bounded`.

### 3.6 — U-6 `eulerian-smoke-frontier-edge` (S24 / spec 4.16, Stack C)

- **Scope:** **Pending D-1** (anchor conflation, § 2 row 4). Under the recommended resolution (paper (a), EDGE proper): buffer-free flow-map gradients via Hermite interpolation + epsilon-difference higher-order derivatives; O(1)-memory property is mechanically measurable (a perf-ledger + memory assertion, a rare *rigorous* frontier claim). Grid-side flow maps — independent of the U-4 particle substrate but shares the flow-map verification vocabulary. Capture `taylor-green-128cube-seed42-step500` (`docs/architecture.md:2523`).
- **Anchor strategy:** (a) Hermite-evolved flow-map gradient matches FD of the evolved map (bounded, order-verifiable); (b) memory ceiling constant in flow-map length (measured); (c) Taylor–Green decay + REFRAMED qualitative fixtures vs parent; optional fourth: short-horizon equivalence vs a small buffered reference implementation built for test only.
- **Stack:** C — **CONFIRM**. Gates / posture / tolerance: as U-4. **PBT (≥2, proposal):** `flow_map_gradient_matches_fd` + `backward_map_memory_constant`.

### 3.7 — U-7 `eulerian-smoke-frontier-gaussian-fluids` (S30 / spec 4.22, Stack E + § 4.2.B + § 4.2.C)

- **Scope:** Grid-free Gaussian-spatial-representation solver per arXiv:2405.18133 (anchor § 2 row 8). Dual-socket consumer (WU-B sparse + WU-C 3DGS) and a `render_similarity` HARD-gate consumer (batch-3 hold rationale `docs/_audits/phase-4/batch-3-charter-2026-05-31T22-13-27Z.md:100`). Public reference impl `github.com/xjr01/Gaussian-Fluids-Code` — license probe at build start per Appendix D.3 (vendor only if LICENSE permits; else cite-only). Capture `taylor-green-128cube-seed42-step500` (`docs/architecture.md:2525`).
- **Anchor strategy:** (a) Taylor–Green analytic vortex (the paper's own primary evaluation — pointwise-comparable, rigorous); (b) divergence-residual of the projected velocity field bounded; (c) Kármán-street qualitative fixture + render-similarity vs golden hero shot (PSNR > declared threshold).
- **Stack:** E — **CONFIRM** (Warp CPU fallback measured viable across Phases 3–4; per-step first-order optimization is CPU-heavy — perf-ledger row tagged CPU-only, informational).
- **Gates:** 13 incl. `render_similarity`; gate 14 N/A. Posture expectation: **FP-round-off** (optimization loop; fixed iteration counts + seeded init — MEASURE; if iteration-order nondeterminism appears, declare per the R-P2-style escape hatch with evidence).
- **PBT (≥2, proposal):** `velocity_field_continuously_differentiable_at_samples` (Gaussian-mixture eval consistency) + `projection_reduces_divergence_norm`.
- **Tolerance routing:** `smoke` for grid-sampled comparisons vs parent fixtures; render gate per render-similarity harness. Phase-4 plan pre-authorized tolerance-budget amendments for "gaussian-fluid frontier variants" via separate operator-approved commits if legitimately needed (`docs/phases/phase-4-plan.md:20`) — flagged as **possible**, not assumed.

### 3.8 — U-8a `sph-water-stack-e` (prerequisite base sim) + U-8b `sph-water-neural` (S20 / spec 4.12, Stack E)

- **U-8a (NEW unit, needs D-4 ratification):** the recorded blocker is "no landed Stack-E SPH parent" (`docs/phase4/ledger.md:39`). Proposal: port `sph-water` to Stack E (Warp) as a Layer-5-style cross-stack replication (parent ref + `sph-water-stack-d` both landed; `equivalence.md` + `algebraic.md` + determinism decl exist). Descriptor `dam-break-1M-particles-seed42-step1000` (added for `stack-e` at cluster-close audit per Appendix D.2.3 extension rule). **Gate 14 applies** (cross-stack vs ref + stack-d at `sph` category tolerance). Posture expectation: FP-round-off cross-stack, bit-exact same-stack — MEASURE.
- **U-8b:** 3DGS-coupled SPH per Feng et al. 2024 (anchor S-1): `PhysicsCoupling` instantiation (WU-C), per-Gaussian transform from SPH state, hero-shot render + render-similarity, physics-equivalence vs U-8a parent. **Method-match caveat (recorded):** the paper couples PBD fluid; our SPH coupling is the spec-sanctioned adaptation ("SPH-extensible", `docs/architecture.md:1123`) — the spec sheet § 2 will state this explicitly rather than claim paper-faithfulness.
- **Stack:** E — **CONFIRM** (both). **PBT (≥2 each, proposal):** U-8a: `density_summation_positive` + `momentum_conserved_no_external_forces`; U-8b: `render_similarity_self_identity` + `gaussian_transform_rigid_consistency`.
- **Tolerance routing:** `sph` (both); render gate per render-similarity harness. **No new category.**

## § 4 — Proposed serial build order (one unit at a time, single-writer)

| Order | Unit | Rationale |
|---|---|---|
| 1 | U-1 sph-water-diff | Lowest risk; 100%-banked pattern (4 landed diff sims); rigorous gates; warms the cluster on a green path |
| 2 | U-2 difflogic-ca | Rigorous-iff-scoped (frozen gates); Stack D continuity from U-1; needs only D-3 ratified |
| 3 | U-3 moment-encoded-lbm | Rigorous anchors; first Stack-C unit; bounded, well-posed novelty (quantization); needs D-2 |
| 4 | U-4 clebsch-pfm | Opens the greenfield PFM substrate deliberately mid-cluster (not first — risk; not last — substrate feeds U-5) |
| 5 | U-5 vpfm | Reuses U-4's PFM substrate while it is freshest |
| 6 | U-6 edge | Grid-side flow maps; anchor newly ratified via D-1; closes the flow-map family |
| 7 | U-7 gaussian-fluids | Heaviest cross-cutting unit (dual socket + render HARD gate) — late, with maximum banked context |
| 8 | U-8a → U-8b sph-water-stack-e → 3dgs-sph | U-8a is new-scope (D-4) and gate-14-bearing; U-8b depends on it — strictly last |

Ascending-risk + substrate-reuse ordering; D-class decisions (§ 6) are all resolvable at ratification time, before unit 3. Each unit lands fully (13 gates or declared-deferred-with-cause) before the next dispatches; continuation handoffs per charter § 3.2 at context fill.

## § 5 — AMBIGUOUS items (not decided here — listed with verbatim records + recommendation)

- **A-1 — Row 10 pool membership vs "future diff batch".** Ledger row 10 reads "operator-decidable future diff batch" (`docs/phase4/ledger.md:29`) — readable as routing S10 to a *separate* diff batch rather than C-1. But the landing audit § 4 and charter § 2.6 count it in the 8-row Greenfield-CPU pool (`docs/_audits/phase-4/landing-2026-06-01T01-44-34Z.md:162`). **Recommendation:** include in C-1 (it is one of the 8; a separate one-sim batch contradicts the v1.3 serial-cluster model). Steven ratifies.
- **A-2 — Row 29 deferral-cause record conflict.** Ledger/landing record "qualitative-anchor-leaning; sound-anchor strategy needed first" (`docs/phase4/ledger.md:48`) vs batch-3 charter "rigorous anchors EXIST but heavy Stack-C lift" (`docs/_audits/phase-4/batch-3-charter-2026-05-31T22-13-27Z.md:89`) — the later, more detailed batch-3 analysis contradicts the ledger's cause summary. **Recommendation:** treat batch-3 (+ this charter's § 3.3 anchor strategy) as governing; the cause conflict changes nothing about membership. Recorded here append-only; no retro-edit of either record (§ 0.3).

## § 6 — D-class decisions awaiting ratification (Steven decides; none assumed below)

| ID | Decision | Recommendation |
|---|---|---|
| D-1 | **EDGE anchor (SHIFT S-3):** which paper anchors spec item 4.16 — (a) "EDGE: Epsilon-Difference Gradient Evolution for Buffer-Free Flow Maps" (Li et al., DOI 10.1145/3731193) or (b) "Fluid Simulation on Compressible Flow Maps" (Chen et al., DOI 10.1145/3731192)? | **(a)** — the variant suffix is `frontier-edge` and every in-repo method description (buffer-free, O(1) memory) describes (a); (b) becomes a Phase-6 catalog-family candidate, not a C-1 member |
| D-2 | **Moment-LBM quantization tolerance:** new `tolerance.toml` category (e.g. `lbm-quantized`) + `tolerance-budget.toml` cap, or per-sim override under `lbm` with budget amendment? Either path is operator-gated (Appendix D.8 #17). | New category, MEASURED-then-declared at build; cap proposed in the amendment commit with the measured value + margin documented |
| D-3 | **difflogic-ca scope:** ratify the batch-3 frozen-gate / truth-table / no-training (no-EFECT) scope as the C-1 unit definition (the batch-3 §12 "decidable 4th" question, never ruled). | Ratify as scoped; a trained-gate variant is a separate future candidate |
| D-4 | **U-8a `sph-water-stack-e` in-scope ruling:** building the missing Stack-E SPH parent is new scope beyond the 8 deferred rows (it unblocks row 20). In C-1, or defer row 20 again? | In C-1 as U-8a (the charter § 2.6 wording "base sims first, then ports" anticipates exactly this) |
| D-5 | **Build order:** ratify § 4 (or re-order). | As proposed |
| D-6 | **Registry-slug corrections** (S-2 `clebsch-pfm-2024`, S-4 `difflogic-ca-2024`, S-5 figures/year, S-1 author attribution): route the spec § 12.9 / Appendix A textual corrections to the cluster-close landing audit (Appendix D.8 #8 forbids mid-phase appendix edits). | Route to cluster-close audit; this charter is the SHIFT record of note until then |

## § 7 — Build-dispatch preconditions (on "continue" post-ratification)

1. First action: cross-phase audit replay vs the most recent tag (`v0.5.0-phase-5`) per charter v2-amendment item 2; discrepancy → BLOCKED.
2. Per-unit: failing-tests-first commit with output hash (spec § 1.3 step 4); Convention A ≤500-line commits, new-files-first; Convention M re-anchor before editing any existing file; § S.5 full CI sweep every push, any red = STOP; Convention #12 SHA back-fill; **no tags** (I7; single `v0.6.0-phase-6` proposed at phase close only).
3. Lane-A surfaces only; rebase conflicts touching Lane-B surfaces → HARD-STOP.
4. Cluster close per charter § 3.3: mini-audit at `docs/_audits/phase-6/c1-close-<UTC>.md`, `verify_evidence` green, full CI green, 13 gates or declared-deferred-with-cause per unit, **no tag**.

## § 8 — Charter commit SHAs (Convention #12)

- §§ 0–2 (pool + anchors): `1636d2b`
- §§ 3–9 (proposals + decisions): `253a3dc`

## § 9 — Continuation handoff (stub)

> *Empty at charter stage by design. If a build session approaches context fill: commit landed work, append here — state, next unit/step, open questions, last-commit SHA — push, report. The continuation session resumes from this block at HEAD (Appendix D.9 format).*

### Handoff #1 — build session 1 (2026-06-11, appended at context checkpoint)

`CONTINUE_FROM: next-unit=U-4 (eulerian-smoke-frontier-clebsch-pfm, S23/4.15); last-commit-sha=531a354; partial-work=none (U-3 fully landed; clean unit boundary); remaining-context-budget=~30%`

**State:** §10 ratification + S-5 amendment applied. **U-1, U-2, U-3 LANDED** (13 gates
each; per-unit landing reports under `docs/_audits/phase-6/`; CI sweep green at each
push — U-3's sweep was in flight at handoff write, confirmed in the session report).
Ledger rows 10/28/29 → landed. D-2 exercised (`lbm-quantized` declared; amendment
2026-06-11T15-22-14Z). Corpus lock now 38.

**Next step (U-4, ratified § 4 order):** probe-first per the unit pattern: read
`packages/eulerian-smoke/` + the Stack-C precedents (now TWO: rd2d-stack-c + the U-3
lbm-me package — reuse its CMake/lavapipe/capture-writer shape), design the
particle-flow-map substrate per the § 3.4 anchor strategy (|ψ|=1 exact invariant,
flow-map composition identity, Taylor–Green decay + REFRAMED qualitative fixtures), DOI
10.1145/3731194 anchor. Then U-5 (vpfm, reuses the PFM substrate), U-6 (edge, D-1 =
DOI 10.1145/3731193), U-7 (gaussian-fluids), U-8a/U-8b.

**Banked environment notes (load-bearing):** U-1 landing report § Environment +
memory: `/tmp` quota breaks worktree `uv sync` (use `TMPDIR=~/.cache/bp-tmp`);
`GIT_LFS_SKIP_SMUDGE=1` for worktree ops; LFS push = R2-first
(`git lfs push --object-id origin --stdin`) then `git -c lfs.standalonetransferagent=
push git@github.com:…`; cmake needs `-DCMAKE_POLICY_VERSION_MINIMUM=3.5`; eof-fixer
rewrites capture `.json` (re-add); the B-2 worktree `--generate` recipe is the
byte-stable gate-13 path for pytest units (ctest units: hash-footer + manual worktree
replay, see U-3 landing § findings).

*End of C-1 cluster charter (PROPOSED — awaiting operator ratification).*

---

## § 10 — Ratification record + S-5 amendment (2026-06-11, build dispatch — appended additively per § 0.3; the original §§ 2/5/6 entries above stand un-edited as the record-of-proposal)

**Operator ratification (Steven, via build dispatch 2026-06-11):** D-1 → **EDGE proper, DOI 10.1145/3731193** anchors spec item 4.16 (coordinator independently verified distinct from DOI 10.1145/3731192). D-2 → **RATIFIED** (new tolerance category for moment-LBM quantization; bounds measured-then-declared at build). D-3 → **RATIFIED** (batch-3 frozen-gate scoping governs difflogic-ca). D-4 → **RATIFIED** (sph-water-stack-e builds in-cluster as U-8a). D-5 → **RATIFIED** (serial order § 4 as proposed). D-6 → **RATIFIED** (registry-slug corrections route to cluster-close audit). A-1 → **Row 10 is IN C-1.** A-2 → **batch-3 governs** Row 29's cause record (supersedes the stale ledger cause; SHIFT documented at § 5 A-2). Charter status is now **RATIFIED**; build proceeds per § 4 order.

**S-5 amendment (figure-SHIFT DOWNGRADED to a source-location clarification; date SHIFT STANDS).** Coordinator verification found, and this session re-verified live (#8) at <https://arxiv.org/html/2602.05295>, that the spec's figures are **not** stale — they appear verbatim in the paper's **Fig. 1 (teaser) caption**: "Snapshot of a turbulent smoke simulation around a Ducati motorcycle on a **1000×400×400 grid** … Compared to HOME-LBM (li2023high), our method **reduces the memory footprint by 25% and achieves 4.3× speedup**, enabling practical high-resolution, large-scale flow simulation on a single GPU." The **abstract** carries the separate best-case figures: "up to **6×** speedup and reduces GPU memory footprint by up to **50%** in fluid-only scenarios and **25%** in scenes with complex solid boundaries compared to the state-of-the-art LBM solver". Both figure sets are correct with distinct in-paper locations; the U-3 spec sheet must cite the matching location for whichever claim it makes (Fig.-1-caption figures = vs-HOME-LBM single-scene comparison; abstract figures = best-case envelope). The S-5 **date** correction stands as recorded in § 2: registry year "2025" → arXiv:2602.05295, submitted 2026-02-05.

## § 11 — U-3 rel-bound provenance note (build session 2 first action, 2026-06-11 — appended per § 0.3)

`lbm-quantized relative=5.0e-2` is measurement-backed (dispatch-2 § 1 case 1, no breach): the stage-1c canonical-horizon comparison (1001 frames; quantized capture sha256 `dabb947ca87f6429d7473327941810ad9917be7b040857f9265811365e2ba763` vs landed numpy parent `captures/lbm-ref/poiseuille-64x32-seed42-step1000.h5` sha256 `0e0843aa8707e5f07f2e12fae81c764fccdbe91b408833bbc67450f1b5e16f68`; landed at `c06d0b1`) measured **max_rel = 1.98e-2 over |u| > 1e-6 cells** — a domain that is a *superset* of the outside-abs-floor zone (|u| > 1e-5 = the declared absolute), so it conservatively bounds the outside-floor max_rel — declared 5.0e-2 at 2.5× margin; recorded in the `tools/testkit/equivalence/tolerance.toml` category comment and amendment `docs/_audits/tolerance-budget-amendments/2026-06-11T15-22-14Z-lbm-quantized.md`.

## § 12 — Continuation handoff #2 — build session 2 (2026-06-12T07-38Z, appended at a PUSH-BLOCKED boundary)

`CONTINUE_FROM: next-action=UNBLOCK-PUSH-then-U-5; last-local-commit=6c43902 (9 commits ahead of origin fa0d790); partial-work=U-4 BUILT + locally GREEN, stage-2 landing fold pending CI; blocked-on=R2 LFS credentials (operator-held)`

**State:** Dispatch-2 § 1 provenance check CLOSED (§ 11 below; pushed, CI green).
**U-4 clebsch-pfm fully built**: stages 0–1c committed (probe pushed `ecf68fb`;
local chain `b3e4562`→`6c43902`); ALL local gates green — ctest 14/14 (doctest 9/9 =
152,686 assertions + the REFRAMED fixture gate), corpus suites 102/102, 2-run
bit-identity witness `45ae09f3…` (run 2 = the capture run), canonical capture
`ed4e5689…` (738 MB) + corpus seed `d8f6795f…` (lock 38→39). Spec sheet
`spec-frontier-clebsch-pfm.md` carries every declared bound WITH its backing
measurement (the dispatch-2 § 2 pairing rule).

**SHIFTs (all documented in spec § 2/§ 3 + commit chain):** inviscid-Euler anchor-(c)
adaptation (steady 2D-TG-in-3D); wave-fit init instability (τ·ħ²/dx² CFL — first
canonical run produced a deterministic-garbage IC, residual 350, DISCARDED; fix =
cascadic multigrid init, measured ladder 0.108→0.0459, + a PBT init-quality gate);
parent canonical trajectory measured BLOWN UP by step 50 → REFRAMED gate is the
measured stability contrast (variant physical through step 100, saturates ~477 at
the wave ceiling vs parent 4.9e20); capture axis layout transposed to parent
[x][y][z]; per-target -O3 -ffp-contract=off (bit-identical to -O0, witness-verified).

**BLOCKED (push withheld deliberately):** this session's environment has NO R2
credentials (`lfs-s3: no bucket set`; the moved-env note). Both new LFS objects are
in **GitHub LFS** (pushed via SSH auth — the D4 steady-state fallback), but NOT in
R2 — and `python-strict` pulls `tests/fixtures/legacy-captures/**` THROUGH R2 on
every main push, so pushing now would knowingly red CI (§ S.5 forbids). **Unblock
(operator):** export the scoped R2 env (R2_ACCOUNT_ID, AWS_ACCESS_KEY_ID,
AWS_SECRET_ACCESS_KEY, S3_BUCKET), then:
`printf "ed4e5689eca33029056614b8522339b19f8472295d2038937a5ec5c39c27f0bc\nd8f6795fd2b09400929dc92a8000d42d7102d70719dcaaa979dcabaa2230efe0\n" | git lfs push --object-id origin --stdin`
then `git -c lfs.standalonetransferagent= push git@github.com:StevenFAU/Bit-Physics.git main`,
watch the full sweep, and the next session does the U-4 stage-2 landing fold
(landing report under `docs/_audits/phase-6/`, ledger row 23 → landed, Convention
#12 SHA back-fill) before resuming U-5 vpfm (which reuses the U-4 PFM substrate).

## § 13 — Continuation handoff #3 — build session 3 (2026-06-15T15-44Z, appended at a clean U-6 stage-0/1a boundary)

`CONTINUE_FROM: next-step=U-6 stage-1a (eulerian-smoke-frontier-edge scaffold); last-commit=479412a (origin/main, clean — 0 ahead); partial-work=U-6 stage-0 probe DONE; blocked-on=none`

**State (supersedes the § 12 CONTINUE_FROM, now STALE):** U-4 clebsch-pfm **landed**
(`ce70309`) and U-5 vpfm **landed** this session (`c65ba08`; full § S.5 sweep GREEN —
all 10 workflows incl. `python-strict` through R2). Both LFS objects in R2 + GitHub LFS.
origin/main = `479412a`.

**U-5 resolution (this session, by measurement — Convention M):** resumed mid-stage-1c;
the prior session's canonical capture was **NaN-poisoned** (the descriptor dt=0.005
crosses the 128³ inviscid-TG CFL ceiling 1/(n·dt)=1.56 and blows up by step 250 — root
cause confirmed by code-read: pure advective feedback, no dissipation/clamp). Re-derived
the **dt=0.00125** CFL-safe SHIFT (measured-then-declared; 500 steps = physical t=0.625,
pre-cascade), regenerated a fully-physical 11-frame capture (witness `41caa46f…`, payload
`1e04a359…`), **authored the missing `test_reframed_equivalence.py`** (referenced by spec
§ 3.5 but absent), filled spec TBD-1c, and landed: stage-1c-i `2739112` → 1c-ii `9850116`
→ stage-2 fold `76bbedd` → SHA back-fill `c65ba08`. The REFRAMED result is stronger than
U-4 (frame-0 ~50× tighter via the direct vorticity lift; physical for ALL 500 steps, no
saturation regime, vs the parent's ~20-order blowup).

**Next unit (U-6, ratified § 4 order — the flow-map family's final C-1 member):** the
stage-0 probe is committed (`479412a`, `docs/_audits/phase-6/c1-u6-edge-probe-2026-06-15T15-42-50Z.md`)
— anchor EDGE proper (DOI 10.1145/3731193, D-1 ratified, incompressible grid flow maps,
NOT the compressible-flowmap paper …3731192) re-verified LIVE. **Plan of record:**
GRID-side buffer-free flow maps (backward map ψ + on-grid gradient evolution ∇ψ +
tetrahedron epsilon-difference higher derivatives + Hermite interpolation) — INDEPENDENT
of the U-4/U-5 particle substrate; copy-adapt only the Stack-C grid layer (MAC grid,
periodic MG Poisson, staggered curl/div f64 kernels, capture/determinism harness, TG
anchor) from vpfm. The **O(1)-memory-independent-of-flow-map-length** claim is the
distinctive rigorous measurable gate (perf-ledger memory row + `backward_map_memory_constant`
PBT). **Build-time risks flagged:** size the CFL-safe dt at 128³ before the canonical
capture (the U-5 lesson — do NOT assume 0.005); solid-boundary DEFERRED (periodic
descriptor). Then U-7 (gaussian-fluids, Stack E) + U-8a (sph-water-stack-e, D-4) remain.
