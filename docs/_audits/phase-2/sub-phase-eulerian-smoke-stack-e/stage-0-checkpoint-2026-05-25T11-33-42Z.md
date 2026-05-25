---
artifact: stage
artifact_id: sub-phase-eulerian-smoke-stack-e-stage-0
stage: stage-0-checkpoint
phase: phase-2
head_sha: 4433f4b98174051884bc7a1449374427332a2f1e
head_sha_at_checkpoint: acd6c0465d427836b53954054a3ff1efb2092f18
date: 2026-05-25T11-33-42Z
verdict: stage-0-CONFIRMED
evidence_paths:
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-e/stage-0-evidence-warp-jacobi-determinism-2026-05-25T11-33-42Z.md
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-e/stage-0-replay-2026-05-25T11-33-42Z.txt
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-e/stage-0-integrity-sweep-2026-05-25T11-33-42Z.txt
evidence_hashes:
  docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-e/stage-0-replay-2026-05-25T11-33-42Z.txt: sha256:9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34
  docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-e/stage-0-integrity-sweep-2026-05-25T11-33-42Z.txt: sha256:c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52
---

# Stage 0 pre-flight checkpoint — sub-phase-eulerian-smoke-stack-e

> SEVENTH per-sim cross-stack port; SECOND Stack-E port; SECOND R-P2
> chaotic-regime instance. Stage 0 (pre-flight) CLOSE. VERDICT
> stage-0-CONFIRMED. Empirical-verification stage: **NO source created**
> (`packages/eulerian-smoke-stack-e/` is Stage 1a's job — operator-confirmed
> charter-faithful scope, § 0 below). Confirms the plan-drafting believed-state
> at HEAD `acd6c04`: bit-identity replay HELD; integrity baseline-MATCH;
> `[overrides.eulerian-smoke]` present (D6 reuse); BOTH Phase-1 canonical
> captures present + LFS; common-warp socket-only consumption surface verified
> verbatim; **Warp CPU Jacobi-projection determinism 6/6 bit-identical
> (`79d15705…b342b2eea2`; R-A1 anchor / O-2 checkpoint 1).** 1 shift (S0-SME1,
> O-W7 part-2 deferral). Cumulative 199 → 200.

## § 0. Scope-conflict resolution (operator-confirmed; charter-faithful)

The Stage-0 dispatch listed an *additive sim scaffold + workspace registration
(21 → 22)* as Stage-0 deliverables. This **conflicts** with charter § 4 (Stage-0
touch set = "NO source"; the `packages/eulerian-smoke-stack-e/` skeleton is
**Stage 1a**, root workspace registration is **Stage 1b**) and with the
MPM-Stack-E Stage-0 structural template (pre-flight only; scaffold at Stage 1a
`88687b1`). Per Convention M (HEAD wins on drift) + Hard Rule 2 (surface
structural defects before proceeding), the conflict was surfaced to the operator
**before any source edit**. **Operator routing:** execute **charter-faithful
Stage 0 (pre-flight only; NO source, NO scaffold, NO workspace registration)**;
R-A1 = **Warp determinism kernel** (charter § 2 task 0.2), NOT a Phase-1
reference-trajectory sha. This checkpoint reflects that ratified scope.

## § 1. Scope

Stage 0 of `sub-phase-eulerian-smoke-stack-e`. Pre-flight verification only:
re-anchor at HEAD, confirm the plan-drafting D1–D17 premises against HEAD,
empirically establish the smoke-specific Warp CPU Jacobi-projection determinism
**R-A1 anchor** (O-2 chain checkpoint 1), and document the Stage-1a consumption
surface + 1a/1b/1c scope. **No source modification** (Convention A; § 0
boundary): no `packages/eulerian-smoke-stack-e/`, no root `pyproject.toml` /
`tolerance.toml` / `warp.md` / methodology / conventions / `equivalence.md` /
sim-source edits. The Task 0.2 verification kernel is ephemeral (reproduced in
the evidence artifact; NOT committed to `packages/`).

## § 2. Operator routing consumed (D1–D17)

All seventeen RATIFIED per the Stage-0 dispatch (D-class leans § 9 / probe § 9)
+ the § 0 scope routing. Load-bearing for this stage: **D6** (override reuse —
§ 5), **D7/D15** (socket-only / own f64 arrays — § 7), **D8** (own f64 + the
`wp.float64(1.0)/wp.float64(6.0)` 3D Jacobi normaliser — § 8), **D9** (Warp CPU
`tolerance=0.0` bit-exact, even for chaos — § 8), **D10** (gate-14 =
divergence-rate witness; STOP only on step-1 faithfulness failure — Stage 1c),
**D13** (CI-red banked — § 9), **D14** (3D 738 MB capture held local — § 6). No
re-litigation; this stage verifies the premises hold at HEAD.

## § 3. Task 0.0 — Pre-flight (Convention M + § D.5)

(FACT — `git rev-parse HEAD`; `stage-0-replay-…txt`; `stage-0-integrity-sweep-…txt`.)

- **HEAD == `acd6c0465d427836b53954054a3ff1efb2092f18`** (plan-drafting close;
  the SHA back-fill recursion-stopper `acd6c04`). No drift. Working tree clean
  except untracked `.claude/` + two untracked
  `captures/eulerian-smoke-stack-d/taylor-green-…` files (not load-bearing).
- **Bit-identity replay (§ D.5).** `python -m integrity.scripts.replay_prior_phase
  --prior-phase phase-1 --audit docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget`
  → 8/8 gates PASS, `ok=True`; output sha256
  `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34` —
  **byte-identical to the replay invariant. HELD.**
- **Integrity sweep baseline-match.** `python -m integrity --all --mode strict`
  → `0 HARD_FAIL, 14 SOFT_WARN`, findings sha256
  `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` —
  **baseline-MATCH (streak HELD).** The 14 SOFT_WARN are the carried
  phase-0/1 cosmetic items (unchanged set).
- **Doc anchors unchanged:** conventions
  `1937a7cfa53a6daf790def43f5cc13ba932d54d2c185275a506eb9fab269d031`;
  methodology
  `a154d10c48be5ee9b5fda7e4d4e3819eed758e792215f7602f49ebf8b1d76421`;
  architecture
  `e82b7b8e4cc88441a1cdbedda1da2876ab9ccc74c64742585f66e4639292d267` — all
  match the charter front-matter.

**Hard Rule 2 (HEAD-drift / invariant-drift) NOT triggered.**

## § 4. Task 0.1 — Re-anchor against HEAD + common-warp socket consumption probe

(FACT — root `pyproject.toml` `[tool.uv.workspace].members`; `common_warp`
re-exports resolved at HEAD; `common/common-warp/examples/hello/sim.py` as the
reference dense-grid Warp consumer.)

- **Workspace members: 21** (3 tools + 10 Phase-1 sims + `common-py` + 5 Stack-D
  ports + `common-warp` + `mpm-multimaterial-stack-e`). eulerian-smoke Stack-E is
  NOT yet registered (Stage 1b adds the 22nd member per charter § 4; the package
  skeleton lands at Stage 1a).
- `common/common-warp/` present (§ 1.9.1 socket); `packages/eulerian-smoke/`
  Phase-1 reference present (sealed); `packages/mpm-multimaterial-stack-e/`
  (closest structural template) + `packages/eulerian-smoke-stack-d/` (chaotic-
  regime content template) present. All HEAD-verified.
- **§ 1.9.1 socket consumption surface (D7 SOCKET-ONLY; Stage 1a import
  surface).** Verified verbatim at HEAD:
  - `init(device: str | None = None, deterministic: bool = False) -> str`
  - `Capture` (dataclass); `write_capture(capture, path, *, schema_version='1.0.0')
    -> None` (**f64-preserving** — `writer.py` uses `np.asarray` with no dtype
    coercion / downcast; D15); `read_capture(path) -> Capture`
  - `set_warp_deterministic(seed: int, device: str = 'cpu') -> int`
  - `deterministic_context() -> Iterator[int]` (no-arg; reconciled to §1.9.1)
  - `assert_deterministic_run(sim_fn, *, runs=2, tolerance=0.0) -> str`
    (the `tolerance == 0.0` path is the D9 bit-exact contract)
  - `set_seed` / `get_seed`
  - **NOT consumed (D7):** `Particles`/`allocate_particles` (f32-pinned),
    `ScalarField3D`/`VectorField3D`/`allocate_*_field` (f32-pinned — smoke's
    *natural structural fit* yet f64-blocked), `HashGrid` (no neighbor-search).
  - **Reference consumer** `examples/hello/sim.py`: consumes Runtime + Capture +
    Determinism + (for the hello sim) the f32 `ScalarField3D` Grids subsystem;
    omits `from __future__ import annotations` (O-W6). Smoke is f64 → declares
    its OWN `wp.array(dtype=wp.float64)` dense fields instead of Grids — the
    SECOND f64 socket-only consumer (CONFIRMS warp.md § 6.1; S-SME2).

**Hard Rule 2 (socket drift) NOT triggered** — surface verbatim per § 1.9.1.

## § 5. Task 0.5 — Tolerance reuse verification (D6 + S-SME3)

(FACT — `tools/testkit/equivalence/tolerance.toml` +
`tools/testkit/equivalence/harness.py` at HEAD.)

- **`[overrides.eulerian-smoke]` PRESENT** (tolerance.toml line 83) with
  `category = "smoke"` (only `category`; `relative`/`absolute` fall back to
  `[defaults.smoke]` = `relative = 1e-4, absolute = 0.0`). Established by
  eulerian-smoke Stack-D Stage 1.
- **Resolution keys on the LEFT/reference manifest.** `compare_captures` pulls
  `sim.category` + `sim.name` from the **LEFT** manifest and requires the RIGHT
  manifest to agree on `sim.category` (`harness.py` `compare_captures` +
  `_resolve_tolerance`); `_resolve_tolerance` resolves the override iff
  `sim_name in overrides`. The Phase-1 LEFT-partner captures carry
  `sim = {name: "eulerian-smoke", category: "volumetric-grid"}` → the existing
  `[overrides.eulerian-smoke]` resolves them to category `smoke`, `relative=1e-4`.
- **D6 REUSE premise CONFIRMED.** The Stack-E RIGHT capture sets the same
  `sim.name`/`category` → the existing override resolves it. **Stage 1c override
  edit is a no-op** — eulerian-smoke Stack-E is the SECOND per-sim cross-stack
  port to skip the Stage-1c `[overrides.<sim>]` add (MPM-Stack-E first). **No
  `tolerance.toml` edit this stage** (§ 0 boundary).

## § 6. Task 0.4 — Canonical-descriptor scope-analysis (§ N graduated discipline)

(FACT — `git ls-files` + `git show HEAD:…json` + LFS pointers at HEAD.) TWO
descriptors (gate-9 / gate-14 LEFT-partners), both **PRESENT + LFS-tracked**:

| Descriptor | dims | cadence | steps | LFS oid | size |
|---|---|---|---|---|---|
| `taylor-green-128cube-seed42-step500` (3D) | 128³ | 50 | 500 | `4604ebdc…` | **738,260,192 B (≈738 MB)** |
| `lid-driven-cavity-128sq-re100-seed42-step1000` (2D) | 128² | 100 | 1000 | `e13b0d05…` | **4,385,176 B (≈4.4 MB)** |

- Both manifests: `sim = {name: "eulerian-smoke", category: "volumetric-grid"}`,
  `stack.name = "numpy-reference"`, `dtype = "f64"`, `vorticity_eps = 0.0`,
  `n_jacobi = 20`. Reference wall-clocks: 3D `691.047 s`, 2D `5.087 s`.
- **Scope (§ N).** Stage 1b regenerates both canonicals via Warp-CPU. Wall-clock
  anchors: numpy reference 3D 691.047 s / 2D 5.087 s; Taichi Stack-D 3D 698.986 s
  / 2D 8.470 s (charter). Warp-CPU is single-threaded-serial + JIT-compiled; a
  conservative Stage-0 estimate sits in the §-N production-correction band
  [0.5×, 3×] of the Taichi anchor — re-measured at Stage 1b.
- **D14:** the 3D 738 MB capture is **held LOCAL** (under the W1 2 GB ceiling but
  not committed to LFS by default per the prior-ports posture). The
  **schema-corpus representative-subset (≤ ~256 MiB; methodology § 5.4) = the 2D
  4.4 MB capture** (well under the ceiling; routed at Stage 1c).

## § 7. Task 0.3 — f64-storage + `wp.float64()` literal audit (R-SME2; D8/D15)

(FACT — empirical at the R-A1 surface § 8 + `writer.py` at HEAD.)

- **Own f64 storage.** The R-A1 kernel declares `wp.array(dtype=wp.float64,
  ndim=3)` for `u`/`v`/`w`/`div`/`p` — NOT common-warp's f32 Grids. Stage 1b's
  dense fields follow (D15). `wp.from_numpy(..., dtype=wp.float64)` with explicit
  `dtype=` (O-W7) round-trips the f64 host arrays.
- **Pure-literal constant (O-W7 part-1).** `inv6 = wp.float64(1.0) /
  wp.float64(6.0)` — the 3D Jacobi normaliser — **compiles + runs bit-
  identically**. Bare `1.0/6.0` would infer f32 and perturb the chaotic
  trajectory (S-SME4; the exact constant that leaked `~1e-9` in Taichi).
- **`write_capture` f64-preservation.** `common_warp.capture.writer.write_capture`
  treats every payload value as `np.asarray(arr)` with **no dtype coercion** and
  delegates to the testkit writer → f64 payloads are preserved on the HDF5 round
  trip (D15; confirmed at HEAD by reading `writer.py`).

## § 8. Task 0.2 — Warp CPU Jacobi-projection determinism (empirical; R-A1 / O-2 ckpt 1)

(FACT — ephemeral verification kernel; full source + raw output in
`stage-0-evidence-warp-jacobi-determinism-2026-05-25T11-33-42Z.md`.)

A minimal collocated 3D Jacobi pressure-projection (ported from the Phase-1
`project_pressure_3d`: centered-difference divergence → `rhs = (ρ/dt)·div` →
20-sweep Jacobi with the `inv6 = wp.float64(1.0)/wp.float64(6.0)` normaliser →
gradient correction), all f64, **pure gather (no `wp.atomic_add`)**, consuming
the common-warp socket (`set_warp_deterministic(42,"cpu")` +
`deterministic_context()`).

- **6 runs (3 pairs), identical seed+inputs, `device="cpu"`: all 6 sha256
  identical → `79d15705fdce26c31ffd92ae07592037cc112fb30c30736cea2c98b342b2eea2`.**
- **VERDICT: DETERMINISTIC (6/6 bit-identical).** R-SME4 (Jacobi fixed-cap
  determinism) CONFIRMED empirically; R-SME5 (atomic-scatter) **N/A** — the
  collocated gather has no shared-node contention, so determinism is even more
  structurally trivial than MPM-Stack-E's P2G atomic-scatter (`a8f6e654…`). Warp
  CPU `wp.launch` serial-launch (Subsystem-3 D4 contract) + f64 = bit-exact.
  **Hard Rule 2 (Warp CPU determinism unachievable) NOT triggered.**
- **Correctness witness:** max|div| `7.651e+01` (pre) → `5.147e+01` (post) — the
  projection reduces divergence (sign-correct; faithful to the reference; the
  non-zero residual is the determinism-safe fixed-cap, not a convergence claim).
- This digest is the **Stage 1a R-A1 re-verification anchor** (O-2 checkpoint 2 =
  Stage-1a gate-10 production reproduction; the exact digest depends on the final
  IC).

## § 9. Task 0.8 — D13 CI-red banked acknowledgment

(FACT — D13 RATIFIED.) The remote-CI red state from the LFS-bandwidth-quota
condition is ongoing and known-banked. **No action at Stage 0.** Local
verification is unaffected: Task 0.0 replay + integrity both ran clean locally;
both canonical-capture LFS pointers are present. The sub-phase lands LOCAL-ONLY
(the established posture of the prior sub-phases).

## § 10. Task 0.7 — Stage 1a/1b/1c scope-analysis (Stage-1a-dispatch input)

(Charter § 2/§ 4 stage shape: plan-drafting + Stage 0 + 1a + 1b + 1c + Stage 2.)
Per-sub-stage touch set:

- **Stage 1a (failing-tests + scaffold; gate-13 RED anchor).**
  - NEW `packages/eulerian-smoke-stack-e/` (pkg `eulerian_smoke_stack_e/` +
    own `pyproject.toml` + `tests/` at clean `ModuleNotFoundError`). `pyproject`
    mirrors **common-warp's** filterwarnings posture (NO bare-form filter; Warp
    emits no Python Warning — § 8 evidence / S0-1 N/A), deps
    `bit-physics-common-warp` + `warp-lang>=1.13,<2.0` + `h5py` + `hypothesis` +
    `numpy>=2.0`; `[[tool.mypy.overrides]] ignore_missing_imports` for `warp` +
    testkit modules.
  - Build against the § 1.9.1 socket **verbatim** from the start (§ L.5 S1b-3).
  - The failing-tests commit is the **gate-13 RED anchor** (the `git worktree`
    pattern replays `ModuleNotFoundError`). **NOTE:** root workspace
    registration (21 → 22) is **Stage 1b** per charter § 4, NOT Stage 1a.
- **Stage 1b (implementation GREEN; per-port specifics).** Determinism-strategy
  docstring first; Warp Stam-Fedkiw reference (`semi_lagrangian_advect` 2D/3D,
  `maccormack_advect_2d`, `diffuse`, `project_pressure`/`project_pressure_3d`
  Jacobi-20, `vorticity_confinement` OFF, `curl`/`divergence`) over own f64
  `wp.array`s — **O-W7 part-2 (the `wp.float64(v)` index-taint workaround)
  applies to the SL-backtrace base-node derivation here** (S0-SME1); `sim.py`
  wrapper; `invariants.py`; spec sheet (`spec-ref-stack-e.md`); gates 4–13 GREEN
  (gate-4 MMS-only, § 11); TWO canonical captures (3D held local); perf-ledger
  rows (2D + 3D, warp-cpu); **root `pyproject.toml` workspace registration
  21 → 22**; gate-13 replay. O-2 checkpoints 2 + 3.
- **Stage 1c (gate-14 cross-stack equivalence + landing-prep).**
  `compare_captures(LEFT=captures/eulerian-smoke-ref/…, RIGHT=captures/eulerian-
  smoke-stack-e/…)` at `relative=1e-4`, BOTH descriptors; per-field per-frame
  witness + divergence-rate analysis in `equivalence.md` (additive Stack-E
  section); **predicted `within_tolerance=False` on BOTH (R-P2 escape-hatch —
  the CORRECT verdict; D10)**; schema-corpus subset (the 2D capture); override
  edit **no-op** (D6). gate-14 test asserts `within_tolerance=False` AND the
  § 6.2 escape-hatch criteria. **STOP only on a step-1 port-faithfulness
  failure** (D10 inverted STOP-discipline). O-2 checkpoint 4.
- **Stage 2 (landing).** 22-root regression sweep (per-package pytest-config; no
  blanket `-W error` — N1); integrity sweep; bit-identity replay; evidence-path
  verify; **IC-15 disposition (D5)**: methodology § 6 R-P2 SECOND-INSTANCE
  additive note (stack-portable Taichi → Warp) + the R-SME9 resolution-dependence
  § L.4 refinement candidate (D16) + warp.md § 6 line-207 refinement (D15);
  CHANGELOG; banked roll-up.

## § 11. Task 0.6 — gate-4 MMS-runner consumability

(FACT — `tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/` +
`packages/eulerian-smoke/tests/test_mms_convergence.py` at HEAD.)

- The shared `incompressible_ns_2d` manufactured source is **importable** (`from
  code_verification.mms.solutions.incompressible_ns_2d.solution import …`) and is
  already consumed by the Phase-1
  `packages/eulerian-smoke/tests/test_mms_convergence.py` (importing the
  `incompressible_ns_2d.solution` module). gate-4 for
  Stack-E is **MMS-ONLY — NO golden table** (mirrors smoke-Stack-D; advection
  arm 1.9892 / projection arm 1.9976 ≈ formal p=2). Consumable surface confirmed
  for Stage 1b's inline `test_mms_convergence.py`.

## § 12. Banked items / observations

- **S0-SME1 (shift) — O-W7 part-2 deferral + R-A1 surface is a pure gather.**
  The R-A1 anchor uses the **Jacobi-projection** surface (charter-permitted
  alternative to SL-backtrace), which is a pure gather with integer-mod periodic
  wrap. Two consequences vs the MPM-Stack-E template: (1) **R-SME5 atomic-scatter
  N/A** — determinism is structurally trivial (no `wp.atomic_add` contention); no
  serialisation knob needed (banked #8 Warp analog, even simpler than MPM). (2)
  **O-W7 part-2** (the `wp.float64(v)` index-taint workaround; MPM-Stack-E S0-ME1)
  is **NOT exercised at Stage 0** — it applies at **Stage 1b** to the
  `semi_lagrangian_advect` SL-backtrace + MacCormack base-node derivation. O-W7
  part-1 (pure-literal `wp.float64(1.0)/wp.float64(6.0)`) IS exercised + compiles
  + runs bit-identically. Stage-1b carry-forward (NOT a §L.6 doc amendment —
  Stage 2 boundary).
- **S0-1 filterwarnings N/A for Warp.** No bare-form filter needed (§ 8 evidence);
  the Stack-E `pyproject` inherits common-warp's posture, not the Taichi Stack-D
  ports' bare-form discipline.
- **R-SME9 resolution-dependence (NEW; plan-drafting S-SME6).** The 64³ derisk
  DECAYS / 128³ canonical BLOWS UP false-laminar trap STAYS-BANKED for the Stage-2
  § L.4 refinement candidate (D16). Not re-exercised at Stage 0 (the R-A1 anchor
  is a 16³ determinism probe, not a trajectory simulation).
- **Banked roll-up:** no surprise items. LFS-architecture (D13), 3D-capture-held-
  local (D14), N1 per-package pytest-config, mypy-warp-stub all STAY-BANKED.

## § 13. Stage 1a readiness verdict

**READY.** All preflight premises hold at HEAD: HEAD stable; invariants HELD;
override present (reuse); BOTH canonical captures present + LFS; socket-only
consumption surface verified verbatim; Warp CPU Jacobi-projection determinism
6/6 bit-identical; gate-4 MMS surface consumable. No blocking dependencies. No
items require operator attention beyond the ratified D1–D17 + the § 0
charter-faithful scope routing. Stage 1a is dispatchable (scaffold +
failing-tests RED anchor + `tests/` surface against the § 1.9.1 socket).

## § 14. Verdict

**stage-0-CONFIRMED.** 1 shift (S0-SME1 O-W7 part-2 deferral / pure-gather R-A1);
cumulative **199 → 200**. Bit-identity replay HELD (`9399fc33…`); integrity
baseline-MATCH (`c19492ad…`; 0 HARD_FAIL / 14 SOFT_WARN). R-A1 anchor established
(`79d15705…b342b2eea2`; 6/6 bit-identical; O-2 checkpoint 1). NOT implementation:
`packages/eulerian-smoke-stack-e/` NOT created (Stage 1a). No `-phase-N` tag
(D12). Local-only (D13). Operator routes Stage 1a separately.

---

*End of Stage 0 pre-flight checkpoint. `head_sha` back-filled in COMMIT 2
(Convention #12; separate commit; never `--amend`; N1 enumeration).*
