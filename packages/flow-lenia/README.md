# flow-lenia

Phase-4 batch-3 sim 3/3 (frontier-algorithm batch; FINAL).

Mass-conservative **Flow Lenia** (Plantec et al., ALIFE 2022; arXiv:2212.07906). Matter is
transported by **reintegration tracking**: each cell redistributes its *full* mass to the
flow-displaced neighbours (the redistribution weights sum to 1), so the total mass `Σ A` is conserved
**by construction** — to floating-point **summation roundoff (~Nε), NOT bit-exact** (the honest
tolerance; the weights sum to 1 algebraically, their float sum carries roundoff).

## Anchors (Stack D / Taichi engine; ≥3 independent)

- **A1** — exact mass conservation: `Σ A_{t+dt} == Σ A_t` to summation roundoff (MEASURED; regime:
  periodic BC). This is the SOUND home of the Phase-3 plain-Lenia `mass_approximately_conserved`
  invariant that was FALSIFIED under Quad4 — re-routed here where it holds by construction (not
  widened).
- **A2** — non-negativity: bilinear-splat of non-negative mass with non-negative weights → `A ≥ 0`.
- **A3** — zero-flow identity: `F ≡ 0` ⇒ each cell maps to itself with weight 1 ⇒ `A` unchanged
  pointwise (EXACT).

The flow is the affinity gradient `F = ∇U` (`U = K * A`); the conservation / non-negativity /
zero-flow invariants are **flow-agnostic** (properties of the reintegration transport). The full
α-weighted Flow Lenia flow `F = (1−α)∇U − α∇A_Σ` is a documented extension (invariants unchanged);
the reintegration uses the bilinear-splat (point-distribution) limit of the paper's uniform square
distribution `D` (both redistribute the full mass).

## Full ecosystem oracle

The package also contains a separate pure-NumPy f64 target named
`flow-lenia-ecosystem-v1`. It implements the multi-channel published model without changing the
Taichi primitive above:

- normalized three-ring perception kernels and bell growth;
- target-channel affinity plus density-gated Sobel pressure;
- exact finite uniform-square Reintegration Tracking by periodic destination gather;
- local `H`/`Q` rule fields with average, whole-genome, gene-wise, best-affinity, and negotiation
  inheritance;
- deterministic contiguous-patch mutation and lineage identity.

The entry points are `FlowLeniaEcosystemConfig`, `step_reference`,
`reintegrate_with_genomes`, and `mutate_patch`. Frozen cross-language fixtures live under
`tests/fixtures/flow-lenia-ecosystem-v1.json`; compact M2 and M4 browser fixtures are generated from
the same oracle.

## WebGPU ecosystem implementation

`web/` contains the completed M0 foundation, M2 Organism Lab, M3 Visual Laboratory, M4
localized Ecosystem Lab, M5 Arena Lab, and M6 public release for the full ecosystem model:

- a plane-batched 2D Stockham wrapper around the repository's shared FFT butterfly;
- C=3 to K=9 spectral fan-out;
- faithful `dd=5` finite-square destination gather in mass-only and full-state bandwidth variants;
- explicit portable buffer/binding/dispatch inventories;
- standard browser lifecycle, capture, and benchmark hooks;
- the full global-parameter C=3/K=9 growth, affinity, Sobel pressure, displacement, and conservative
  transport step;
- exact-seed reset/capture plus density, channels, affinity, and flow scientific views;
- compact live PROVE diagnostics, f64-derived intermediate/rollout fixtures, and a same-adapter
  long-horizon determinism gate;
- deterministic fixed-step pipette, add, erase, and stir tools with an explicit open-mass ledger;
- pan/zoom/fit and fixed-rate time controls, read-only cell/kernel/response inspection, trails,
  contours, flow glyphs, pressure, and flux views;
- six authored organism/ablation cards, including synchronized pressure and finite-square sigma
  comparisons, with keyboard, pointer, pinch, and radial touch controls.
- packed per-cell H/Q plus fingerprint, lineage, and flags with genome-free organism allocation;
- specialized average, whole-genome, gene-wise, best-affinity, and negotiation gather pipelines at
  the portable eight-storage binding floor;
- deterministic contiguous mutation patches, a bounded parent/child lineage ring, exact-lineage and
  quantized-phenotype diversity metrics, and read-only lineage/phenotype views;
- three-founder, negotiation-sea, and three-pane identity-dilution experiment cards.
- opt-in per-cell authored affinity, soft-wall, timed-gate, and region fields that preserve the M4
  allocation and behavior when Arena mode is absent;
- GPU affinity/wall/erase brushes, a slowly orbiting attractor, and a scripted three-lobed storm,
  all upstream of the unchanged pressure/transport path and all mass-neutral;
- corridor-divergence, maze-navigation, and storm-recovery cards with region abundance, recovery
  history, and a bounded lineage transition graph;
- complete-state `flow-lenia-arena-experiment-v1` JSON export/import with SHA-256 validation and
  byte-exact same-adapter continuation after restore;
- a responsive Arena product surface, six-field canonical capture, shader provenance hash,
  poster/live catalogue assets, and a dedicated two-run public-deploy gate.

The committed Chromium/Dawn reference measurement passes the FFT, conservation, uniform-genome,
portable-limit, memory, and browser-contract probes. It freezes 256² as the desktop default and
128² as the adaptive tier. See `docs/sim-specs/continuous-ca/lenia/m0-webgpu-benchmark.md` for the
measured feasibility scope. The complete M2 gate is documented in
`docs/sim-specs/continuous-ca/lenia/m2-organism-validation.md`; the measured 256² organism step
retains the desktop timing and memory budgets. M3 event/card/render validation is recorded in
`docs/sim-specs/continuous-ca/lenia/m3-visual-laboratory-validation.md`; a synchronized 256² pair
owns 52.02 MiB and render-only changes leave scientific mass byte-exact. M4 validation is recorded
in `docs/sim-specs/continuous-ca/lenia/m4-localized-ecosystem-validation.md`; the complete 256²
localized solver is below the 128 MiB allocation budget and every mixing rule is separately checked
against the f64 oracle and same-adapter deterministic replay. M5–M6 validation is recorded in
`docs/sim-specs/continuous-ca/lenia/m5-m6-arena-release-validation.md`; it covers environment
anchors, all three deterministic Arena cards, exact reload/continuation, region and lineage
instrumentation, render integrity, responsive smoke, canonical capture, public deployment, and the
desktop memory/timing budgets.

## Determinism vs conservation (distinct)

Run-to-run determinism is **bit-exact** (Taichi CPU single-thread serial fixes the `ti.atomic_add`
scatter order). The mass INVARIANT is conserved only to **summation roundoff** — the two are
declared separately.

## CLI

```
python -m flow_lenia --grid 32 --steps 40    # rollout; prints mass drift + min mass
```

Single-stack (gate-14 N/A; parent-vs-frontier REFRAMED to the invariant posture). NO tag (I7).
