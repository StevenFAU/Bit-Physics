# C-1 / U-4 `eulerian-smoke-frontier-clebsch-pfm` — unit landing report

> **Cluster:** Phase 6 / C-1 (charter `docs/phases/phase-6/c1-charter.md`, RATIFIED § 10).
> **Unit:** U-4 = Phase-4 ledger row 23 / spec § 11.5 item 4.15 — Stack C; the FIRST
> particle-flow-map (PFM) surface in the repo AND the first Stack-C volumetric-grid
> row (the greenfield substrate of the deferral record; U-5 vpfm reuses it).
> **Verdict:** **LANDED** — 14 gates green (ctest 14/14 tree-wide = doctest 9/9 with
> 152,686 assertions + the REFRAMED fixture gate; corpus 102/102; full § S.5 sweep
> **10/10 green** at `3ca0f97`, including `python-strict` through R2).
> **Commit chain:** `ecf68fb` (stage-0 probe; pushed session 2) → `276df4d`/`246ca8d`
> (stage-1a scaffold + RED 9/9, evidence footer-hashed `13580a91…`) → `1400f83` →
> `38d24c1` → `54717e4` (stage-1b GREEN 9/9) → `5ae657c` → `c8de5fc` → `6c43902`
> (stage-1c: spec sheet + REFRAMED gate + cascadic-init fix + capture + corpus + perf)
> → `3ca0f97` (§ 12 handoff append) → *(stage-2 SHA back-filled per Convention #12)*.

## Push-unblock record (session 3, this fold's precondition)

The § 12 handoff #2 PUSH-BLOCKED state was cleared by measurement this session:
operator provisioned the durable R2 creds file (`~/.config/bit-physics/r2-credentials.env`,
the `setup-lfs-s3-local.sh` Option-B allow rule, cluster-duration). Both LFS objects
HEAD-checked **absent** from R2 (404 vs a known-object 200 control; key layout
`<oid>.zstd`), pushed via `git lfs push --object-id origin --stdin` (2/2, 570 MB),
then **sha256 round-trip verified from R2** (download → zstd -d → digest == OID:
capture `ed4e5689…` PASS, corpus seed `d8f6795f…` PASS). Main pushed
`fa0d790..3ca0f97` via SSH; full sweep green (10 workflows).

## Gates (spec Appendix D.6, Stack-C adaptation)

| Gate | Verdict | Evidence |
|---|---|---|
| 1 spec sheet | GREEN | `docs/sim-specs/volumetric-grid/eulerian-smoke/spec-frontier-clebsch-pfm.md` (per-variant sheet; the shared `spec-frontier.md` stub STAYS for 4.16/4.17/4.22 — probe § 2) |
| 2 probe | GREEN | `c1-u4-clebsch-pfm-probe-2026-06-11T22-19-57Z.md` — anchor re-verified live (ACM DL 403; author-hosted CC-BY PDF sha `2e5eb375…`); **SHIFT: inviscid-Euler anchor-(c) adaptation** (steady 2D-TG-in-3D) |
| 3 failing-first | GREEN | RED ctest at `246ca8d`: 9 cases, 0 passed (sha `13580a91…` footer-hashed) |
| 4 goldens (≥3 anchors) | GREEN | A1 unit-norm ≤1e-15 + gauge invariance ≤1e-12 + carried-Φ bit-drift EXACTLY 0.0; A2 ‖T̃F̃−I‖ measured 3.7e-9 → declared 1e-7 (~25× margin, O(dt⁴) contraction gate measured ~16×); A3 steady-TG energy drift 8.7e-3 → 2.5e-2, IC residual 2.66e-3 → 1e-2 |
| 5/6 diagnostics | GREEN | per-frame KE/enstrophy/u_max budget metrics; `init_velocity_residual` MEASURED into result + capture manifest (0.045913 at 128³) |
| 7 citations | GREEN | DOI 10.1145/3731194 (live-verified, CITE-DON'T-IMPORT), Chern et al. 2016, Chern 2017, Zhou et al. 2024, Clebsch 1859; registry-slug 2024→2025 routes to cluster close (D-6) |
| 8 public API | GREEN | `bit_physics::clebsch_pfm` header surface (`include/bit_physics/clebsch_pfm/clebsch_pfm.hpp`); clean per-target `-O3 -ffp-contract=off` build |
| 9 capture | GREEN | `captures/eulerian-smoke-frontier-clebsch-pfm/taylor-green-128cube-seed42-step500.{h5,json}` — D.2.3 descriptor VERBATIM; .h5 sha256 `ed4e5689…` (738 MB LFS, in R2 + GitHub LFS); **[x][y][z] axis layout matching the parent** (SHIFT: internal x-fastest order transposed at write) |
| 10 determinism↔capture | GREEN | 2-run bit-identity witness `45ae09f3…` (tolerance 0.0; **run 2 IS the capture run**); cross-optimization-level identity `-O3` ≡ `-O0` (witness `c932298d…` at n=32, both builds); registry `[volumetric-grid.eulerian-smoke-frontier-clebsch-pfm]` class bit-exact; manifest `bit-exact-same-hw` |
| 11 PBT (≥2) | GREEN | `wave_function_normalized` (carried-value drift = 0.0 + post-reinit grid norm ≤1e-12, swept ħ ∈ {0.25, 0.5, 1.0} × both ICs) + `velocity_reconstruction_divergence_bounded` (scale-free: post ≤ 1e-3 × pre; 10× margin) + gauge-invariance bonus |
| 12 perf-ledger | GREEN | 12,480 s canonical invocation (cascadic init + 2-run witness + capture write; ~12 s/step at 128³, 16.8M particles, 20 threads) — `docs/perf-ledger.md` row at `6c43902` |
| 13 failing-replay | GREEN | worktree at `246ca8d` rebuilt THIS fold (2026-06-13): ctest reproduces the same RED shape — 9 cases, 0 passed, all via the `unimplemented (stage 1b): run_clebsch` throw (the U-3 banked ctest adaptation; pytest replay tool does not drive ctest) |
| 14 cross-stack | **N/A → REFRAMED gate GREEN** | no cross-stack sibling (charter § 3.4); the REFRAMED frontier-vs-parent metric gate is the equivalence surface — all four declared clauses green (below) |

## REFRAMED equivalence (measured-then-declared; no new tolerance category)

Budget-metric fixtures derived from both canonical captures (CI never pulls LFS —
probe § 4.4). **Measured reality:** the landed parent canonical trajectory is
numerically BLOWN UP by step 50 (u_max 1.337e8, 4.9e20 max; enstrophy NaN-saturated)
while the variant stays physical through step 100 (KE conserved 1.91e-2 rel;
enstrophy ×3.20 by real vortex stretching) and saturates at the wave-representation
ceiling (u_max 476.7 — 5+ orders below the parent). **Declared clauses (margins
≥2.5×), all GREEN:** (a) frame-0 agreement (KE rel 2.0e-2 ≤ 5e-2; enstrophy 1.3e-2
≤ 4e-2; u_max 8.1e-3 ≤ 2.5e-2; blob FP-tight ≤ 1e-12); (b) parent step-50 blowup
present (≥1e6); (c) variant physical window [0,100] (mass drift 1.31e-1 ≤ 0.25);
(d) saturation contrast (variant ≤ 600 over ALL frames vs parent ≥ 1e6). Thresholds
declared in spec § 3.4 per the ratified charter language — no budget widening.

## SHIFTs + findings (documented)

1. **Inviscid-Euler anchor-(c) adaptation** (probe § 4.1): steady 2D-TG-in-3D replaces
   the viscous-decay anchor — the wave-function method solves Euler, not Navier–Stokes.
2. **Wave-fit init instability (stage 1c, MEASURED):** plain fine-level descent
   diverges via the τ·ħ²/(2dx²) phase-noise CFL (hand-derived AND measured; the first
   canonical run produced a deterministically-garbage IC, residual 350 — DISCARDED;
   the silent gap was no 3D init-quality test, now gated in the PBT sweep). Fix =
   cascadic multigrid init; measured ladder 0.108 (16³) → 0.0459 (128³); E₀ 98% of
   analytic.
3. **Parent canonical trajectory measured BLOWN UP by step 50** → the equivalence gate
   was REFRAMED as the measured stability contrast (above) — frame-by-frame vorticity
   agreement is physically empty beyond frame 0.
4. **Capture axis layout transposed** to parent [x][y][z] (internal x-fastest order).
5. **Per-target `-O3 -ffp-contract=off`** bit-identical to `-O0` (witness-verified);
   tree default -O0 measured ~10× slower (infeasible at 128³).
6. **Handoff SHA divergence (session 3, measured):** § 12 handoff #2 cites local chain
   start `b3e4562` — an orphaned pre-amend duplicate of the landed `276df4d` (same
   message; not in HEAD history). The landed chain is as recorded above.
7. **origin/main advanced between sessions** (`0e2f28b` → `fa0d790`, Lane B P-5):
   fast-forward within local history — no divergence; the 9 U-4 commits applied clean.
8. **Mutation N/A** (C++; mutmut is python-only — the rd2d/U-3 precedent).

## Ledger fold

`docs/phase4/ledger.md` row 23 → **landed** (this commit). Corpus lock 38→39
(`phase-6-c1-clebsch-pfm` seed). Deferral history honored: P4-Greenfield-CPU,
greenfield-needs-base-sim — the base substrate now EXISTS for U-5.

**Next unit per ratified § 4 order:** U-5 `eulerian-smoke-frontier-vpfm` (reuses the
U-4 PFM substrate).
