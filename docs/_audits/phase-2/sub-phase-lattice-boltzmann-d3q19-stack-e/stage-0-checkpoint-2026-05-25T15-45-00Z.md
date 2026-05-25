---
artifact: stage
artifact_id: sub-phase-lattice-boltzmann-d3q19-stack-e-stage-0
stage: stage-0-checkpoint
phase: phase-2
head_sha: 10af482ca05e1cccbf95fcda92c49f2004570be8
head_sha_at_checkpoint: c2e9621a7488619b479430f8180d985ac3a41317
date: 2026-05-25T15-45-00Z
verdict: stage-0-CONFIRMED
evidence_paths:
  - docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-e/stage-0-evidence-warp-bgk-collision-determinism-2026-05-25T15-45-00Z.md
  - docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-e/stage-0-replay-2026-05-25T15-45-00Z.txt
  - docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-e/stage-0-integrity-sweep-2026-05-25T15-45-00Z.txt
evidence_hashes:
  docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-e/stage-0-replay-2026-05-25T15-45-00Z.txt: sha256:9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34
  docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-e/stage-0-integrity-sweep-2026-05-25T15-45-00Z.txt: sha256:c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52
---

# Stage 0 pre-flight checkpoint — sub-phase-lattice-boltzmann-d3q19-stack-e

> EIGHTH per-sim cross-stack port; THIRD Stack-E port; SECOND LBM port; FIRST
> shape-(a) prediction on a LAMINAR trajectory. Stage 0 (pre-flight) CLOSE.
> VERDICT **stage-0-CONFIRMED**. Empirical-verification stage: **NO source
> created** (`packages/lattice-boltzmann-d3q19-stack-e/` is Stage 1a's job;
> charter § 4 Stage-0 touch set = "NO source"). Confirms the plan-drafting
> believed-state at HEAD `c2e9621`: bit-identity replay HELD; integrity
> baseline-MATCH; `[overrides.lattice-boltzmann-d3q19]` present (D6 reuse); BOTH
> Phase-1 canonical captures present + LFS (≤256 MiB → no held-local; D14);
> common-warp § 1.9.1 socket-only consumption surface verified verbatim;
> **Warp CPU BGK-collision determinism 6/6 bit-identical (`74e6bc16…282838bc`;
> R-A1 anchor / O-2 checkpoint 1)** + a MEASURED faithfulness witness
> (`max_abs_err=0.0` vs the NumPy reference collision; grounds the shape-(a)
> gate-14 prediction per § L.8). **1 shift (S0-LBME1 — dispatch anchor-sha
> framing drift; the 4th Stack-E drift-catch). Cumulative 216 → 217.**

## § 0. Dispatch-vs-HEAD anchor-sha framing drift (Convention M; Hard Rule 2 assessed — NOT a STOP)

**FINDING (S0-LBME1).** The Stage-0 dispatch ENTERING-STATE block carried two
anchor shas that do **NOT** match HEAD:

| Anchor | Dispatch claim | Actual at HEAD `c2e9621` (sha256) | Verdict |
|---|---|---|---|
| conventions | `1937a7cf` "(post-smoke-Stack-E Stage 2 amendments incl. § L.7 refined + § L.8)" | `7713828f3246e29f4154a64e34b4850056342a3ba16ef45215bf5b952b7d3164` | **dispatch stale** |
| methodology | `a154d10c` "(post-§ 6.1 R-P2 re-char + § 6.7 counter-instance)" | `f9c6a3cf3235e7ec48cd8d162f90fe0164065446fe86a8be66c328b6ee8b808f` | **dispatch stale** |
| architecture | `e82b7b8e` | `e82b7b8e4cc88441a1cdbedda1da2876ab9ccc74c64742585f66e4639292d267` | **match** |
| warp.md | (not in dispatch entering-state) | `eff17d306373b2b42b27172ae50e37934f527cf611cd1685b12dab2e000b75da` | **match charter** |

**Root cause (empirically traced).** The dispatch's `1937a7cf` / `a154d10c` are
the **smoke-Stack-E Stage-0** anchor values: the smoke-Stack-E Stage-0 checkpoint
(`…/sub-phase-eulerian-smoke-stack-e/stage-0-checkpoint-2026-05-25T11-33-42Z.md`
§ 3) records conventions
`1937a7cfa53a6daf790def43f5cc13ba932d54d2c185275a506eb9fab269d031` + methodology
`a154d10c48be5ee9b5fda7e4d4e3819eed758e792215f7602f49ebf8b1d76421` — the
**pre-smoke-Stage-2-amendment** state. Smoke-Stack-E's **landing** then amended
both additively (§ L.8 + § L.7-refined into conventions → `7713828f`; § 6.7 into
methodology → `f9c6a3cf`). The dispatch transcribed the smoke-E **Stage-0** sha
values but **annotated them with the smoke-E Stage-2 description** ("post-…
amendments") — the label describes the post-landing content, the digits are the
pre-landing hash. (Confirmed not an alternate-hash artifact: the `git
hash-object` blob ids are `0f45f47d` / `27f40768`, matching neither token.)

**Resolution (Convention M — HEAD wins; charter is authoritative).** The
**charter** (`docs/phases/sub-phase-lattice-boltzmann-d3q19-stack-e.md`,
front-matter) records conventions `7713828f…` + methodology `f9c6a3cf…` "verified
at HEAD", and the **immediately-prior plan-drafting landing audit** (§ closing
anchor re-check) records the same values as **unchanged at HEAD** with the exact
explanatory note ("the smoke-E *landing* amended both additively [§ L.8 /
§ 6.7]; expected carry-forward"). The actual HEAD state matches the charter and
the prior landing audit. The dispatch tokens are **stale framing**, exactly the
"dispatch headers carry stale MPM/smoke-inherited drift" pattern the dispatch's
own PRIOR-DRIFT NOTICE warns of (this is the **4th** such catch in the Stack-E
series; the dispatch itself flagged both values "verify").

**Hard Rule 2 (dispatch condition: "anchor shas drift unexpectedly") assessed —
NOT triggered.** There is **no unexpected drift of the actual repository
state**: HEAD = charter = prior-landing-audit. The only mismatch is against the
dispatch's framing tokens, which Convention M subordinates to the charter. No
STOP; the framing discrepancy is documented here (S0-LBME1; banked for the
post-Phase-2 cleanup sub-phase per the cleanup-deferrable posture).

## § 1. Scope

Stage 0 of `sub-phase-lattice-boltzmann-d3q19-stack-e`. Pre-flight verification
only (charter § 2 Tasks 0.0–0.6 + checkpoint + SHA back-fill): re-anchor at
HEAD, confirm the plan-drafting D1–D17 premises against HEAD, empirically
establish the LBM-specific Warp CPU **BGK-collision determinism R-A1 anchor**
(O-2 chain checkpoint 1), and document the Stage-1a consumption surface +
1a/1b/1c scope. **No source modification** (Convention A; charter § 4 Stage-0
"NO source"): no `packages/lattice-boltzmann-d3q19-stack-e/`, no root
`pyproject.toml` (workspace registration is Stage 1b), no `tolerance.toml` (D6
no-op) / `warp.md` / methodology / conventions / `equivalence.md` / sim-source
edits. The Task 0.2 verification kernel is ephemeral (reproduced in the evidence
artifact; NOT committed to `packages/`).

## § 2. Operator routing consumed (D1–D17)

All seventeen RATIFIED per the Stage-0 dispatch (D-class ratifications + probe
§ 9 / charter § 9). Load-bearing this stage: **D2** (Stage-1a = scaffold only;
impl/gate-10/registration at Stage 1b — § 10), **D6** (override reuse — § 5),
**D7/D15** (socket-only / own f64 `ndim=4` arrays — § 4/§ 7), **D8** (own
`wp.array(dtype=wp.float64, ndim=4)` + `wp.float64(0.0)` reduction seeds +
`wp.float64(1.0)` feq literal + precomputed f64 `c_s²`-constants — § 7/§ 8),
**D9** (Warp CPU `tolerance=0.0` bit-exact — § 8), **D10** (gate-14 = bit-exact
witness; STOP only on step-1 faithfulness failure — § 10), **D13** (CI-red
banked — § 9), **D14** (both captures LFS-committable, no held-local — § 6),
**D17** (gate-4 DUAL-ARM — § 11). No re-litigation; this stage verifies the
premises hold at HEAD.

## § 3. Task 0.0 — Pre-flight anchor re-check (Convention M + § D.5)

(FACT — `git rev-parse HEAD`; `sha256sum`; re-ran `stage-0-replay-…txt` +
`stage-0-integrity-sweep-…txt` this stage.)

- **HEAD == `c2e9621a7488619b479430f8180d985ac3a41317`** (plan-drafting SHA
  back-fill). No drift from the dispatch's expected `c2e9621`. Working tree clean
  except untracked `.claude/` + four untracked
  `captures/eulerian-smoke-stack-{d,e}/taylor-green-…` files (not load-bearing).
- **Doc anchors (sha256 at HEAD; the authoritative Task-0.0 markers per charter
  § 2):** conventions
  `7713828f3246e29f4154a64e34b4850056342a3ba16ef45215bf5b952b7d3164`; methodology
  `f9c6a3cf3235e7ec48cd8d162f90fe0164065446fe86a8be66c328b6ee8b808f`; architecture
  `e82b7b8e4cc88441a1cdbedda1da2876ab9ccc74c64742585f66e4639292d267`; warp.md
  `eff17d306373b2b42b27172ae50e37934f527cf611cd1685b12dab2e000b75da` — **all four
  match the charter front-matter** (and the prior landing audit). See § 0 for the
  dispatch-token reconciliation.
- **Bit-identity replay (§ D.5).** `python -m
  integrity.scripts.replay_prior_phase --prior-phase phase-1 --audit
  docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md --gates
  integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget`
  → 8/8 gates PASS, `ok=True`; output sha256
  `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34` —
  **byte-identical to the replay invariant. HELD.**
- **Integrity sweep baseline-match.** `python -m integrity --all --mode strict`
  → `0 HARD_FAIL, 14 SOFT_WARN`, findings sha256
  `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` —
  **baseline-MATCH (streak HELD).** Byte-identical to the smoke-Stack-E Stage-0
  baseline file; the 14 SOFT_WARN are the carried phase-0/1 cosmetic items
  (unchanged set; includes the `lattice/d3q19-equilibrium.json` no-evaluator
  AUDIT_LOG, expected).
- **Workspace members: 22** (3 tools + 10 Phase-1 sims + `common-py` + 5 Stack-D
  ports + `common-warp` + `mpm-multimaterial-stack-e` + `eulerian-smoke-stack-e`).
  LBM-Stack-E is NOT yet registered; Stage 1b adds the **23rd** member per charter
  § 4 (the skeleton lands at Stage 1a but root registration is Stage 1b — D2).
- **Capture path `captures/lbm-ref/`** (the Convention #8 abbreviated path, NOT
  `captures/lattice-boltzmann-d3q19-ref/`) — **CONFIRMED at HEAD** (§ 6).
- **Cumulative shifts entering: 216** (charter 209 entering plan-drafting +
  S-LBME1..S-LBME7 banked at plan-drafting; matches the dispatch).

**Hard Rule 2 (HEAD-drift / invariant-drift) NOT triggered** (the § 0
dispatch-token discrepancy is framing, resolved in favor of charter/HEAD).

## § 4. Task 0.1 — common-warp § 1.9.1 socket consumption probe

(FACT — `common/common-warp/src/common_warp/__init__.py` re-exports +
sub-module signatures at HEAD.)

- **§ 1.9.1 socket consumption surface (D7 SOCKET-ONLY; Stage-1a import
  surface).** Verified verbatim at HEAD:
  - Runtime: `init(device: str | None = None, deterministic: bool = False) ->
    str`; `get_device`/`set_device`.
  - Capture: `Capture` (`@dataclass`); `write_capture(capture, path, *,
    schema_version: str = "1.0.0") -> None` (**f64-preserving** — `writer.py` uses
    `np.asarray(arr)` with NO dtype coercion/downcast on state payload; D15;
    § 7); `read_capture(path) -> Capture`.
  - Determinism: `set_warp_deterministic(seed: int, device: str =
    BIT_DETERMINISTIC_DEVICE) -> int` (`BIT_DETERMINISTIC_DEVICE = "cpu"`);
    `deterministic_context() -> Iterator[int]` (no-arg); `assert_deterministic_run(
    sim_fn, *, runs: int = 2, tolerance: float = 0.0) -> str` (the `tolerance ==
    0.0` path = sha256-over-raw-bytes, the D9 bit-exact contract); `set_seed`/
    `get_seed`.
  - **NOT consumed (D7):** `Particles`/`allocate_particles` (f32-pinned),
    `ScalarField3D`/`VectorField3D`/`allocate_*_field` (f32-pinned AND
    single-component — cannot hold the 19-component distribution), `HashGrid` (no
    neighbor-search; streaming is a fixed-offset gather). The port rolls its OWN
    `wp.array(dtype=wp.float64, ndim=4)`.
  - **Reference consumers:** `packages/mpm-multimaterial-stack-e` +
    `packages/eulerian-smoke-stack-e` (the first two common-warp consumers; both
    own-f64-`wp.array` socket-only) — the LBM port is the **THIRD f64 socket-only
    consumer** (CONFIRMS warp.md § 6.1 / § 6.2 f64-principle, 3rd instance;
    R-LBME3 / D15).

**Hard Rule 2 (socket drift) NOT triggered** — surface verbatim per § 1.9.1,
unchanged from the plan-drafting probe assessment.

## § 5. Task 0.5 — Tolerance-override REUSE verification (D6)

(FACT — `tools/testkit/equivalence/tolerance.toml` at HEAD.)

- **`[defaults.lbm]`** = `relative = 1e-5`, `absolute = 0.0` (the
  portfolio-tightest category).
- **`[overrides.lattice-boltzmann-d3q19]`** PRESENT with `category = "lbm"`
  (resolves `sim.category='lattice'` [physics-family] → tolerance-category `lbm`
  [numerical-method]; AT-BUDGET; established by `sub-phase-
  lattice-boltzmann-d3q19-stack-d` Stage 1c).
- **Resolution keys on the LEFT manifest `sim.name`.** Both Phase-1 LEFT-partner
  captures carry `sim = {category: "lattice", name: "lattice-boltzmann-d3q19",
  variant: "bgk-d3q19-qian-1992"}` → the existing `[overrides.
  lattice-boltzmann-d3q19]` resolves them to category `lbm`, `relative=1e-5`. The
  Stack-E RIGHT capture sets the same `sim.name`/`category` → the existing
  override resolves it.
- **D6 REUSE CONFIRMED.** LBM-Stack-E is the **THIRD** per-sim port to skip the
  Stage-1c `[overrides.<sim>]` add (after MPM-E + smoke-E). **Stage-1c override
  step collapses to a verify-only no-op.** No `tolerance.toml` edit this stage
  (charter § 4 boundary).

## § 6. Task 0.4 — Canonical-descriptor scope-analysis (§ N graduated discipline)

(FACT — `captures/lbm-ref/*.json` + `git lfs` pointers + `git check-attr` at
HEAD.) TWO descriptors (gate-9 / gate-14 LEFT-partners), both **PRESENT + LFS-
tracked**:

| Descriptor | dims (Nx,Ny,Nz) | τ | steps | cadence | LFS oid | size | numpy-ref wall-clock |
|---|---|---|---|---|---|---|---|
| `poiseuille-64x32-seed42-step1000` | 64×32×3 | 0.7 | 1000 | 1 | `0e0843aa…` | **202,350,128 B (≈202 MB)** | 3.784 s |
| `couette-32x16-seed42-step500` | 32×16×3 | 0.7 | 500 | 1 | `7a948434…` | **27,405,152 B (≈27 MB)** | 0.604 s |

- Both manifests: `sim = {name: "lattice-boltzmann-d3q19", category: "lattice",
  variant: "bgk-d3q19-qian-1992"}`, `stack.name = "numpy-reference"`,
  `dtype = "f64"`, `determinism = {atomic_ops: false, subgroup_ops: false,
  claimed: "bit-exact-same-hw"}`. Poiseuille adds `force_x_lattice = 1e-5`
  (Guo body force); Couette adds `wall_velocity_top_lattice = 0.05` (moving plate).
  `nz_convention = "depth-3-z-periodic-slab"`.
- **`atomic_ops: false` CONFIRMS R-LBME5 N/A** (no atomic-scatter; streaming is a
  gather) — corroborates the § 8 R-A1 determinism posture.
- **Scope (§ N).** Stage 1b regenerates both canonicals via Warp-CPU. Wall-clock
  anchors: numpy reference Poiseuille 3.784 s / Couette 0.604 s; LBM-Stack-D
  Taichi Poiseuille 4.954 s / Couette 0.973 s (charter). Warp-CPU is
  single-threaded-serial + JIT-compiled; a conservative Stage-0 estimate sits in
  the §-N production-correction band [0.5×, 3×] of the Taichi anchor — re-measured
  at Stage 1b. (JIT compile cost amortizes per-process; the § 8 R-A1 module load
  took ≈2.1 s on this runner, a one-time cost.)
- **D14:** BOTH captures **≤ 256 MiB** (202 MB + 27 MB < 268,435,456 B) → BOTH
  **LFS-committable; NO held-local** (the § L.8 "don't list untracked held-local
  paths" convention is structurally not exercised this sub-phase, unlike smoke-E's
  738 MB 3D capture). The **schema-corpus representative-subset (methodology
  § 5.4) = the Couette 27 MB capture** (routed at Stage 1c).

## § 7. Task 0.3 — f64-storage + `wp.float64()` seed/literal audit (R-LBME2; D8/D15)

(FACT — empirical at the R-A1 surface § 8 + `writer.py` at HEAD.)

- **Own f64 storage.** The R-A1 kernel declares `wp.array(dtype=wp.float64,
  ndim=4)` for the `(19,Nx,Ny,Nz)` distribution — NOT common-warp's f32 Grids
  (which are single-component and cannot hold 19 directions). Stage 1b's
  distribution follows (D8/D15). `wp.from_numpy(..., dtype=wp.float64)` /
  `wp.from_numpy(..., dtype=wp.int32)` with explicit `dtype=` (O-W7) round-trips
  the f64 distribution + the int32 velocity matrix + the f64 weights.
- **`wp.float64(0.0)` reduction seeds + `wp.float64(1.0)` feq literal.** The four
  19-term moment accumulators (`rho`/`mx`/`my`/`mz`) seed `wp.float64(0.0)`; the
  feq polynomial uses `wp.float64(1.0)` — **compile + run bit-identically** (§ 8).
  The precomputed f64 `c_s²`-derived constants (`inv_cs2 = 1/c_s²`,
  `inv_two_cs4 = 1/(2 c_s⁴)`, `inv_two_cs2 = 1/(2 c_s²)` from `c_s² = 1/3`) are
  passed as `wp.float64` scalar kernel args — matching the NumPy reference's
  precompute (`equilibrium.feq_field`).
- **`write_capture` f64-preservation.** `common_warp.capture.writer.write_capture`
  treats state payload values as `np.asarray(arr)` with **no dtype coercion** and
  delegates to the testkit writer → f64 payloads are preserved on the HDF5 round
  trip (D15; confirmed at HEAD by reading `writer.py`). (Scalar diagnostics are
  cast to Python `float` = f64 — also lossless for f64 scalars.)

## § 8. Task 0.2 — Warp CPU BGK-collision determinism (empirical; R-A1 / O-2 ckpt 1)

(FACT — ephemeral verification kernel; full source + raw output in
`stage-0-evidence-warp-bgk-collision-determinism-2026-05-25T15-45-00Z.md`.)

A minimal D3Q19 BGK collision (ported from the Phase-1 `density_field` +
`momentum_field` + `feq_field` + the relaxation `f - (f - f_eq)/τ`): per-cell
19-term lex-order moment reductions → `u = mom/max(ρ,1e-30)` → Qian-1992 feq
polynomial → BGK relax, all f64, **pure per-cell gather (no `wp.atomic_add`)**,
consuming the common-warp socket (`set_warp_deterministic(42,"cpu")` +
`deterministic_context()`).

- **6 runs (3 pairs), identical seed+inputs, `device="cpu"`: all 6 sha256
  identical → `74e6bc166fbbcb67706d1ba2dc68d40cc93849ad66e32be965e46a77282838bc`.**
- **VERDICT: DETERMINISTIC (6/6 bit-identical).** R-LBME4 (collision-step
  FP-accumulation determinism-safe) CONFIRMED empirically; R-LBME5 (atomic-scatter)
  **N/A** — the per-cell gather has no shared-node contention; IC-15 aspect #5
  (iterative solver) N/A (single-pass explicit). Warp CPU `wp.launch`
  serial-launch (Subsystem-3 D4 contract) + f64 = bit-exact. **Hard Rule 2
  (R-LBME8 / dispatch condition 6: Warp CPU determinism unachievable) NOT
  triggered.**
- **Faithfulness witness (MEASURED, § L.8; NOT the R-A1 anchor claim):**
  `max_abs_err = 0.0` vs the NumPy reference collision — the faithful Warp f64
  port reproduces NumPy **byte-for-byte** on the collision FP-accumulation surface
  (aspect #4, FIRST Warp measurement). Corroborates probe Task 1.6 Part B (full
  step-1 seed-difference `0.0`) and **grounds the shape-(a) gate-14 prediction**
  empirically — not predicted-from-regime (the smoke-Stack-E anti-pattern avoided).
- **Mass-conservation witness:** `max|ρ_post − ρ_pre| = 4.441e-16` — collision is
  mass-invariant to f64 round-off (physical correctness; the LBM analog of MPM's
  partition-of-unity / smoke's divergence-reduction witness).
- **Digest scope (memory caveat applied).** `74e6bc16…` is **specific to the
  16×8×3 probe grid + IC**. The O-2 chain re-witnesses the determinism PROPERTY at
  Stage 1b (ckpt 2 = gate-10 production reproduction; ckpt 3 = canonical-scale
  2-run) with a **different digest value** (summation-order non-associativity over
  a different grid/IC). Stage 1b must NOT assert byte-for-byte reproduction of
  this specific digest — what is re-witnessed is `assert_deterministic_run(…
  tolerance=0.0)` returning a single stable digest.

## § 9. D13 — CI-red banked acknowledgment

(FACT — D13 RATIFIED.) The remote-CI red state from the LFS-bandwidth-quota
condition is ongoing and known-banked. **No action at Stage 0.** Local
verification is unaffected: Task 0.0 replay + integrity both ran clean locally;
both canonical-capture LFS pointers are present. The sub-phase lands LOCAL-ONLY
(the established posture of the prior sub-phases).

## § 10. Stage 1a/1b/1c scope-analysis (Stage-1a-dispatch input; § N inherited)

(Charter § 2/§ 4 stage shape: plan-drafting + Stage 0 + 1a + 1b + 1c + Stage 2;
D2 = the smoke-Stack-E split, NOT the MPM impl-folded-into-1a pattern.)

- **Stage 1a (failing-tests + scaffold ONLY; gate-13 RED anchor).** NEW
  `packages/lattice-boltzmann-d3q19-stack-e/` (pkg `lattice_boltzmann_d3q19_stack_e/`
  + own `pyproject.toml` + `tests/` at clean `ModuleNotFoundError`). `pyproject`
  mirrors **common-warp's** filterwarnings posture (NO bare-form filter — § 7
  evidence / S0-1 N/A), deps `bit-physics-common-warp` + `warp-lang>=1.13,<2.0` +
  `h5py` + `hypothesis` + `numpy>=2.0`. Build against the § 1.9.1 socket
  **verbatim** (§ L.5 S1b-3). **NO implementation, NO gate-10, NO root workspace
  registration** (those are Stage 1b — D2).
- **Stage 1b (implementation GREEN; per-port specifics).** Determinism-strategy
  docstring first; Warp D3Q19 reference (`bgk_step` collision + Guo, `stream`
  periodic-mod gather, `apply_bounce_back_y_walls` `OPP` swap + moving-wall
  injection, `density_field`/`momentum_field`/`feq_field` as `@wp.kernel`s over an
  own `wp.array(dtype=wp.float64, ndim=4)`) → `sim.py` (`sim_runner_seeded` +
  `sim_runner_seeded_couette` + `sim_runner_diagnostic`; common-warp `init`/
  `set_warp_deterministic`/`write_capture`) → `invariants.py` → `spec-ref-stack-e.md`
  → gates 4–13 GREEN (gate-4 DUAL-ARM 4a+4b — § 11) → TWO canonical captures (both
  LFS-committable) → perf-ledger rows (Poiseuille + Couette, warp-cpu) → **root
  `pyproject.toml` workspace registration 22 → 23** → gate-13 replay. O-2
  checkpoints 2 (gate-10 production reproduction) + 3 (canonical-scale 2-run).
- **Stage 1c (gate-14 cross-stack equivalence + landing-prep).**
  `compare_captures(LEFT=captures/lbm-ref/…, RIGHT=captures/lattice-boltzmann-
  d3q19-stack-e/…)` at `relative=1e-5`, BOTH descriptors; per-field per-frame
  witness + bit-exactness analysis in `equivalence.md` (additive Stack-E section);
  **predicted `within_tolerance=True` AND `max_abs_err=0.0` on BOTH (shape (a)
  bit-exact; grounded by § 8's MEASURED `0.0`)**; schema-corpus subset (the Couette
  capture); override edit **no-op** (D6). gate-14 test asserts `within_tolerance=
  True` AND `max_abs_err==0.0` AND tolerance resolves to `lbm`/`1e-5`. **STOP only
  on a step-1 port-faithfulness failure** (inert per § 8's MEASURED `0.0`). O-2
  checkpoint 4.
- **Stage 2 (landing).** 23-root regression sweep (per-package pytest-config; no
  blanket `-W error` — N1); integrity sweep; bit-identity replay; evidence-path
  verify; **IC-15 disposition (D5)**: methodology § 6.7 within-sim cross-backend
  corroboration (LBM-D Taichi shape (b) `~6e-15` → LBM-E Warp shape (a) `0.0`) +
  aspect-#4 second-data-point note + the candidate "Warp CPU f64 is bit-faithful to
  NumPy" portfolio observation (n=2; surfaced not asserted) + equivalence.md § Stack-E
  bit-exactness witness + conventions § L.7 O-1 shape-(a) third-instance note (first
  on a laminar trajectory) + warp.md § 6 line-208 LBM-row dtype f32→f64 refinement
  (D15); CHANGELOG; landing audit; SHA back-fill.

## § 11. Task 0.6 — gate-4 DUAL-ARM consumability (D17)

(FACT — `tools/testkit/golden/tables/lattice/d3q19-equilibrium.json` +
`tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/` at HEAD.)

- **Arm 4a (D3Q19 equilibrium golden).** `d3q19-equilibrium.json` **PRESENT**
  (`algorithm: "lattice-boltzmann-d3q19-equilibrium-qian-1992"`; `tolerance:
  {absolute: 1e-15, relative: 0.0}`; `test_points`). The Stage-1b feq port
  reproduces all 19 `f_i^eq` + the moments at `abs=1e-15` (bit-exact-achievable —
  the feq polynomial is byte-faithful per § 8's `max_abs_err=0.0`).
- **Arm 4b (NS-2D MMS).** The shared `incompressible_ns_2d` manufactured source
  (`solution.py` + `derivation.md` + `__init__.py`) is **PRESENT** and consumable
  (the same module the smoke-Stack-E + Phase-1 ports import). Stage 1b reuses the
  collision+streaming surface in fully-periodic forced-Taylor-Green mode; observed
  OOA within ±0.5 of formal `p=2` (LBM-Stack-D reproduced `2.39`).
- **D17 DUAL-ARM CONFIRMED consumable** (NEW vs smoke's MMS-only).

## § 12. Banked items / shift

- **S0-LBME1 (shift) — dispatch anchor-sha framing drift (§ 0).** The dispatch
  carried the smoke-Stack-E **Stage-0** conventions/methodology shas (`1937a7cf` /
  `a154d10c`) but labeled them "post-smoke-Stage-2 amendments"; HEAD = charter =
  prior-landing-audit = `7713828f` / `f9c6a3cf` (post-smoke-E-landing, the §L.8 /
  §6.7 amendments already folded in). Resolved in favor of charter/HEAD (Convention
  M); NOT a Hard Rule 2 STOP (no actual repo drift). The **4th Stack-E drift-catch**
  — banked for the post-Phase-2 cleanup sub-phase (dispatch-hygiene class). Cumulative
  216 → 217.
- **MEASURED corroboration (not a shift; confirming).** R-A1 faithfulness
  `max_abs_err=0.0` on the collision surface is the FIRST Warp measurement on IC-15
  aspect #4; it grounds the shape-(a) gate-14 prediction (§ 8) and adds the LBM-E
  data point to the candidate "Warp CPU f64 is bit-faithful to NumPy" portfolio
  observation (n=2; routed at Stage 2 / D5).
- **STAY-BANKED (no Stage-0 change):** LFS-architecture CI-red (D13);
  N1 per-package pytest-config; S0-1 filterwarnings N/A for Warp; mypy-warp-stub.
  § L.8 held-local-listing convention structurally not exercised (D14 — both
  captures LFS-committable).

## § 13. Stage 1a readiness verdict

**READY.** All preflight premises hold at HEAD: HEAD stable; invariants HELD
(replay `9399fc33…`; integrity `c19492ad…`); doc anchors match the charter;
override present (D6 reuse); BOTH canonical captures present + LFS (no held-local;
D14); socket-only consumption surface verified verbatim (D7); f64-storage +
seed/literal posture confirmed (D8/D15); Warp CPU BGK-collision determinism 6/6
bit-identical (R-A1 / O-2 ckpt 1) with a MEASURED `max_abs_err=0.0` faithfulness
witness; gate-4 DUAL-ARM surfaces consumable (D17). No blocking dependencies. The
only surfaced item is S0-LBME1 (dispatch framing drift; resolved, banked).
Stage 1a is dispatchable (scaffold + failing-tests RED anchor + `tests/` surface
against the § 1.9.1 socket — scaffold ONLY per D2).

## § 14. Verdict

**stage-0-CONFIRMED.** 1 shift (S0-LBME1 — dispatch anchor-sha framing drift,
resolved in favor of charter/HEAD per Convention M); cumulative **216 → 217**.
Bit-identity replay HELD (`9399fc33…`); integrity baseline-MATCH (`c19492ad…`;
0 HARD_FAIL / 14 SOFT_WARN). R-A1 anchor established
(`74e6bc16…282838bc`; 6/6 bit-identical; O-2 checkpoint 1) + MEASURED
faithfulness `max_abs_err=0.0` (grounds shape (a)). NOT implementation:
`packages/lattice-boltzmann-d3q19-stack-e/` NOT created (Stage 1a). No
`-phase-N` tag (D12). Local-only (D13). Operator routes Stage 1a separately.

---

*End of Stage 0 pre-flight checkpoint. `head_sha` back-filled in COMMIT 2
(Convention #12; separate commit; never `--amend`; N1 enumeration).*
