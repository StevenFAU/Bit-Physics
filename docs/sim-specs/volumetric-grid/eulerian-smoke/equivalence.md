# eulerian-smoke — Cross-stack equivalence

## Tolerance row

Category `smoke` per `tools/testkit/equivalence/tolerance.toml`:

| Axis | Value |
|---|---|
| `relative` | `1.0e-4` |
| `absolute` | `0.0` |

Per-sim override added at sub-phase-eulerian-smoke-stack-d Stage 1:
`[overrides.eulerian-smoke] category = "smoke"` — resolves
`sim.category="volumetric-grid"` (physics-family) to tolerance-category `smoke`
(numerical-method). At-budget (`[budgets.smoke.cross_stack]` = `1e-4`); NOT a
widening (spec § 2.6). FIFTH per-sim override.

## Cross-stack scope

| Pair | Status | Phase |
|---|---|---|
| NumPy-reference (CPU) ↔ Stack-D Taichi (CPU) | **gate-14 CHAOTIC-REGIME escape-hatch invoked (within_tolerance=False is the correct verdict)** (Stage 1 + Stage 2) | Phase 2 cross-stack |
| NumPy-reference (CPU) ↔ Stack-E Warp (CPU) | **gate-14 cross-stack BIT-EXACT (within_tolerance=True, max_abs_err=0.0 on BOTH descriptors, through the full horizon incl. the 3D blow-up)** (§ E below) | Phase 2 cross-stack |
| Stack-C (Vulkan, MAC-staggered) self-replicates | Not yet exercised (unimplemented) | Phase 2+ |
| Flow-map family variants (Clebsch-PFM etc.) | Not in scope | Phase 4+ |

> The spec-designated Stack-C (Vulkan, MAC-staggered) primary is unimplemented;
> the frozen diff partner is the Phase-1 NumPy-reference capture
> (`stack.name="numpy-reference"`). (The Phase-1 stub's "Stack C self-replicates /
> Not yet exercised" framing is superseded.)

---

# Cross-Stack Equivalence — IC-15 chaotic-regime witness (CHAOTIC-REGIME TEMPLATE)

> **The FIFTH per-sim cross-stack pair, and the FIRST of the five spec-Phase-2
> pairs to exercise the IC-15 R-P2 chaotic-regime escape-hatch** (methodology
> `cross-stack-equivalence-methodology.md` § 2 item 1 → § 6, FORMALIZED at this
> sub-phase's Stage 2). This `equivalence.md` is authored as the **template**
> future chaotic-regime cross-stack pairs inherit: a chaotic pair's witness
> documents the cross-stack DIVERGENCE RATE (Lyapunov-positive), NOT a per-field
> FP-round-off-margin table — because chaotic trajectories cannot be cross-stack
> content-equivalent at non-trivial horizons. Gate-14 `within_tolerance=False` is
> the CORRECT verdict; the physical correctness of the port is verified by the
> stack-agnostic gates 4-13 (all GREEN).

## § 1. The cross-stack pair

`sim.{category="volumetric-grid", name="eulerian-smoke"}`, `dtype=f64`. LEFT =
Phase-1 NumPy reference (`numpy-reference`; SEALED). RIGHT = Stack-D Taichi-DSL CPU
port (`taichi-stack-d`). TWO canonical descriptors (D4 dual-capture):

| Descriptor | fields | frames | reference `.h5` |
|---|---|---|---|
| `taylor-green-128cube-seed42-step500` (3D) | `u,v,w,density` | 11 (cadence-50) | `captures/eulerian-smoke-ref/…` (738,260,192 B) |
| `lid-driven-cavity-128sq-re100-seed42-step1000` (2D) | `u,v,density` | 11 (cadence-100) | `captures/eulerian-smoke-ref/…` (4,385,176 B) |

The Stack-D captures reproduce the descriptors at byte-identical sizes; the 3D
738 MB capture is held local pending the Phase-1-canonical-regeneration question
(banked, Option-2 routing).

## § 2. Gate-14 verdict — within_tolerance=False (CHAOTIC-REGIME escape-hatch invoked)

`compare_captures(numpy_ref, stack_d)` at `relative=1e-4, absolute=0.0` (`smoke`
category, resolved via the MANDATORY `[overrides.eulerian-smoke]` entry). BOTH
verdicts `within_tolerance=False` — the IC-15 R-P2 chaotic-regime escape-hatch
(methodology § 6) is invoked. Capture-level roll-up (max over committed frames):

| Descriptor | within_tolerance | worst max_abs_err | worst field |
|---|---|---|---|
| taylor-green-128cube-seed42-step500 | **False** | `5.86e+20` | `v` |
| lid-driven-cavity-128sq-re100-seed42-step1000 | **False** | `1.07e+01` | `v` |

## § 3. Port faithfulness evidence (the divergence is the flow's, not the port's)

The Stack-D port matches the SEALED NumPy reference to FP-round-off at step 1,
BEFORE the chaotic trajectory has diverged — ruling out an implementation defect:

| Step-1 baseline | `max_abs_err` |
|---|---|
| 3D Taylor-Green (64³ derisk) | `5.6e-16` |
| 2D lid-driven-cavity (128²) | `0.0` (bit-identical) |

Corroborated independently: a fresh NumPy reference run blows up on its own (the
instability lives in the SEALED Phase-1 reference, not the port); a fresh NumPy 2D
run reproduces the committed reference capture bit-for-bit (`max|u diff|=0.0`).

## § 4. Divergence-rate witness (the load-bearing cross-stack metric for chaotic pairs)

Step-by-step cross-stack `max_abs_err` (Stack-D Taichi vs sealed NumPy reference,
same IC) — exponential, accelerating growth:

**3D Taylor-Green (64³ derisk):**

| step | 1 | 10 | 30 | 60 |
|---|---|---|---|---|
| `max_abs_err` | `5.6e-16` | `7.8e-16` | `1.9e-14` | `1.1e-10` |

Estimated cross-stack-divergence Lyapunov rate `λ ≈ 0.12 → 0.29 per step`
(`ln(1.1e-10/5.6e-16)/59 ≈ 0.21/step` mean, accelerating as the flow develops
finer scales). Underlying FIELD instability at canonical resolution (128³):
reference `max|u|` `0.999 → 8.1e7` (step 50) `→ 5.1e19` (step 250);
field-amplification rate `ln(8.1e7)/50 ≈ 0.36/step`. The Stack-D capture blows up
to a DIFFERENT magnitude (`1.2e19`) — the signature of chaotic backend divergence.
Mechanism: collocated-grid centered-difference projection + under-resolved
fixed-20-sweep Jacobi (a smoother, not a converged solver) leaves a residual the
Taylor-Green vortex amplifies as it cascades to small scales.

**2D lid-driven-cavity (128²):**

| step | 1 | 2 | 5 |
|---|---|---|---|
| `max_abs_err` | `0.0` | `8.9e-16` | `1.0e+03` |

`~1e18`-fold growth from step 2 to step 5 (`λ` effectively `≫ 1/step`). The
reference `u` reaches `~1.6e3` by step 5. Mechanism: **Kelvin-Helmholtz
instability** of the thin lid-shear-layer (`0.5(1+tanh((y-0.95)/0.02))`) on a
periodic grid — the sharp shear layer rolls up; the periodic-BC approximation of
the lid-driven cavity is violently unstable at 128²/dt=0.001.

## § 5. Why within_tolerance=False is the correct verdict

The cross-stack equivalence harness is a **test**, not an aspiration (spec § 3.6).
Two arithmetic backends computing the same algorithm differ at FP-round-off (~1e-16)
from step 1; a positive-Lyapunov trajectory amplifies that difference exponentially
to O(field). Cross-stack content-equivalence at `relative=1e-4` over the full
500/1000-step horizons is therefore **physically impossible** — FP-round-off
amplification under sensitive dependence is PHYSICS, not a defect, and not a
tolerance-calibration problem. Silently widening the tolerance or shortening the
horizon would mis-describe the result; the methodology's R-P2 escape-hatch
(§ 6) is the correct disposition. `within_tolerance=False` is the CORRECT verdict.

## § 6. Within-stack correctness — gates 4-13 all GREEN

The port's physical correctness is verified by the stack-agnostic gates,
INDEPENDENT of cross-stack content-equivalence:

| Gate | Status | Witness |
|---|---|---|
| 4 (MMS OOA) | GREEN | advection 1.9892 / projection 1.9976 (within ±0.5 of p=2) |
| 5 (Tier 1) | GREEN | NaN/Inf scan clean (diagnostic trajectory) |
| 6 (Tier 2 vector_field, IC-6) | GREEN | divergence-free advisory + circulation/helicity/spectrum finite |
| 7/8 (citations + API) | GREEN | Stam 1999 / Fedkiw 2001 / Taylor 1937; public API |
| 9 (captures) | GREEN | both descriptors at byte-identical sizes |
| 10 (determinism) | GREEN | `run_twice_and_diff` content-equivalent (bit-exact even for chaos — within-stack determinism is order-deterministic) |
| 11 (PBT) | GREEN | divergence-free-post-projection + smoke-density-nonneg @ 50 examples |
| 12 (perf) | GREEN | 2D 8.470s (1.66×) / 3D 698.986s (1.01× numpy-ref) |
| 13 (replay) | GREEN | worktree at the failing-tests SHA reproduces 6 ModuleNotFoundError |

A chaotic-regime pair is a **physically-correct port whose cross-stack
content-equivalence does not apply** — gate-10 (within-stack determinism) is
bit-exact even though the trajectory is chaotic, because within-stack determinism
is order-deterministic; the chaos surfaces ONLY across two arithmetic backends.

## § 7. Implications for future cross-stack ports of chaotic-regime simulations

- **Probe protocol (conventions § L.4):** plan-drafting probes for cross-stack
  ports MUST simulate the canonical trajectory (`sim_runner_diagnostic` for
  ~50-100 steps) and report the max-field-value growth rate. Bounded → tame regime
  (FP-round-off cross-stack expected). Exponential → chaotic regime (R-P2
  escape-hatch; plan gate-14 as a divergence-rate witness from the start). The S6
  code-structure read alone is INSUFFICIENT — it gave smoke a false "laminar"
  verdict that cross-stack execution refuted.
- **gate-14 framing:** a chaotic pair's gate-14 test asserts `within_tolerance=
  False` AND that the escape-hatch criteria (§ 4 / methodology § 6.2) hold (step-1
  faithfulness + positive divergence rate) — converting the test from a
  content-equivalence assertion to an escape-hatch-invocation-correctness assertion.
- **Cross-stack as defect-amplifier:** the smoke canonicals are unstable in the
  SEALED Phase-1 reference; within-stack determinism + finite-NaN/Inf gates were
  GREEN and could not see it. Cross-stack execution made it visible — cross-stack
  testing surfaces latent defects beyond its equivalence-as-contract framing.
- **Phase-1-canonical-regeneration question (banked):** whether future Phase-1
  canonicals should "exhibit stable physics" rather than "exercise the numerics
  including unstable cases" is a Phase-1 design question surfaced (not resolved)
  here; banked for operator routing (Option-2).

---

# § E. Stack-E (NVIDIA Warp, CPU) — cross-stack BIT-EXACT witness

> **The SECOND `eulerian-smoke` cross-stack pair, and the SIXTH spec-Phase-2 pair.**
> Where the Stack-D Taichi port produced a chaotic-regime escape-hatch verdict
> (`within_tolerance=False`; § 2–§ 4 above), the Stack-E Warp port produced the
> **opposite** result: gate-14 is **cross-stack BIT-EXACT** — the Warp port matches
> the sealed Phase-1 NumPy reference **byte-for-byte** across the full horizon of
> BOTH canonicals, `within_tolerance=True`, `max_abs_err=0.0`. This section is the
> bit-exactness witness; it does NOT supersede the Stack-D chaotic-regime witness
> (a different pair, a different backend, a different — and equally correct — verdict).

## § E.1. The cross-stack pair

`sim.{category="volumetric-grid", name="eulerian-smoke"}`, `dtype=f64`. LEFT =
Phase-1 NumPy reference (`numpy-reference`; SEALED). RIGHT = Stack-E NVIDIA-Warp
CPU port (`warp-stack-e`). TWO canonical descriptors (D4 dual-capture); tolerance
resolves to `smoke`/`relative=1e-4` via the REUSED `[overrides.eulerian-smoke]`
(D6; verified post-amendment — the LEFT/RIGHT manifests agree on
`sim.{name,category,variant}`).

## § E.2. Gate-14 verdict — within_tolerance=True (cross-stack BIT-EXACT)

`compare_captures(numpy_ref, warp_stack_e)` at `relative=1e-4, absolute=0.0`. BOTH
verdicts `within_tolerance=True`; the cross-stack difference is **exactly zero** at
every committed frame (the strongest possible form of equivalence — well beyond the
`1e-4` budget):

| Descriptor | within_tolerance | worst max_abs_err | per-frame divergence |
|---|---|---|---|
| `taylor-green-128cube-seed42-step500` (3D) | **True** | `0.0` | `0.0` at every frame (0,50,…,500) |
| `lid-driven-cavity-128sq-re100-seed42-step1000` (2D) | **True** | `0.0` | `0.0` at every frame (0,100,…,1000) |

## § E.3. Bit-exactness through the chaotic horizon (the load-bearing finding)

The 3D Taylor-Green canonical genuinely **blows up** — at step 500 the reference
reaches `|u| ≈ 5.13e19`, `|v| ≈ 2.54e19`, `|w| ≈ 5.61e19` — yet the Warp port reaches
those magnitudes **bit-for-bit** (`a.tobytes() == b.tobytes()`, `max|diff| = 0.0`):

| Descriptor | frame | field | ref absmax | stack-e absmax | max\|diff\| | bytes_equal |
|---|---|---|---|---|---|---|
| 3D | 500 | u | 5.1347e+19 | 5.1347e+19 | 0.0 | True |
| 3D | 500 | v | 2.5420e+19 | 2.5420e+19 | 0.0 | True |
| 3D | 500 | w | 5.6147e+19 | 5.6147e+19 | 0.0 | True |
| 2D | 1000 | u | 2.0754e+00 | 2.0754e+00 | 0.0 | True |
| 2D | 1000 | v | 1.2604e+00 | 1.2604e+00 | 0.0 | True |

`within_tolerance` verdicts the cross-stack DIFFERENCE, not the field magnitude;
a positive-Lyapunov trajectory blowing up to `5e19` is compatible with a `0.0`
cross-stack difference when both backends compute the identical FP sequence.

## § E.4. This is not a defect (distinct-provenance evidence)

The two captures are genuinely independent runs, not a copy or a wiring artifact:

| Axis | LEFT (NumPy reference) | RIGHT (Warp Stack-E) |
|---|---|---|
| `.h5` checksum (2D / 3D) | `e13b0d05…` / `4604ebdc…` | `aa67929f…` / `6b5158e8…` |
| `stack.{build_id, name}` | `sub-phase-eulerian-smoke` / `numpy-reference` | `sub-phase-eulerian-smoke-stack-e` / `warp-stack-e` |
| `run.start_utc` | 2026-05-22 | 2026-05-25 |
| `run.wall_clock_seconds` (2D / 3D) | 5.087s / 691.047s | 5.897s / 541.977s |

Distinct `.h5` payloads, distinct provenance, distinct wall-clocks — the f64 field
arrays nonetheless agree byte-for-byte.

## § E.5. Why bit-exact (logical consistency with step-1 port faithfulness)

The Stage-1b step-1 cross-stack baseline was already **BIT-EXACT** (`max_abs_err=0.0`,
exceeding the `~1e-16` FP-round-off prediction — the Warp port replicates the NumPy
`np.roll` gather order, the `np.mod`-via-floor periodic wrap, and the fixed-20-sweep
Jacobi arithmetic with identical f64 operation order). With a step-1 cross-stack
**seed difference of exactly zero**, a positive-Lyapunov trajectory has **nothing to
amplify** — so the trajectories stay byte-identical for the entire horizon,
**regardless of Lyapunov regime**. Chaotic amplification requires a non-zero
seed-difference; it does not manufacture one.

This is the inverse of the Stack-D Taichi result: Taichi introduced a Taichi-FP-specific
`~1e-16` step-1 round-off that the chaotic flow amplified to `O(field)`
(`within_tolerance=False`); Warp, executing the same algorithm with the same operation
order, introduces no round-off. **The chaotic-regime escape-hatch is therefore NOT
stack-portable Taichi → Warp** — cross-stack divergence is a property of the
backend-pair's arithmetic, not of the (shared) chaotic trajectory.

## § E.6. Within-stack correctness — gates 4-13 all GREEN

The Stack-E port's physical correctness is verified by the stack-agnostic gates
(15 passed at Stage 1b; the gate-14 cross-stack assertion runs at Stage 1c-revisited).
gate-10 within-stack determinism is bit-exact (`tolerance=0.0`) even though the 3D
trajectory is chaotic — within-stack determinism is order-deterministic. The
cross-stack bit-exactness (this section) is a strictly stronger statement: not just
that the port is internally reproducible, but that it reproduces a *different backend*
byte-for-byte.
