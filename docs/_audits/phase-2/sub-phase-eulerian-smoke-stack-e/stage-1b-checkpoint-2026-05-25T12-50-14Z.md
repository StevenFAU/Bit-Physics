---
artifact: stage
artifact_id: sub-phase-eulerian-smoke-stack-e-stage-1b
stage: stage-1b-checkpoint
phase: phase-2
head_sha: <COMMIT_2_SHA_PENDING>
head_sha_at_checkpoint: 9d9718f573a9d78a057c04c377e1fbd694ad4c82
date: 2026-05-25T12-50-14Z
verdict: stage-1b-CONFIRMED
evidence_paths:
  - captures/eulerian-smoke-stack-e/lid-driven-cavity-128sq-re100-seed42-step1000.json
  - captures/eulerian-smoke-stack-e/lid-driven-cavity-128sq-re100-seed42-step1000.h5
  - docs/perf-ledger.md
  - docs/sim-specs/volumetric-grid/eulerian-smoke/spec-ref-stack-e.md
---

# Stage 1b checkpoint — sub-phase-eulerian-smoke-stack-e

> SEVENTH per-sim cross-stack port; SECOND Stack-E port. Stage 1b (the
> implementation) CLOSE. VERDICT stage-1b-CONFIRMED. Landed the NVIDIA Warp
> `@wp.kernel` Stam-Fedkiw stable-fluids implementation (`9d9718f`); **gates 4–13
> GREEN (15 passed, 2 skipped = gate-14 Stage 1c)**; resolves the Stage-1a gate-13
> RED anchor (`b04cdbde`) to GREEN. **STEP-1 cross-stack BIT-EXACT (max_abs_err
> 0.0** on all fields 2D+3D vs the Phase-1 NumPy reference — D10 port-faithfulness
> perfect). Registered the 22nd workspace member (21 → 22). O-2 chain checkpoints
> 2 (gate-10) + 3 (2D canonical 2-run, bit-identical). Integrity baseline-MATCH
> (`c19492ad…`); bit-identity replay HELD (`9399fc33…`). 3 shifts (S1b-SME1..3);
> cumulative 202 → 205.

## § 1. Scope

Stage 1b of `sub-phase-eulerian-smoke-stack-e`: the substantive port (charter § 2
line 84 + § 4 Stage-1b row, authoritative). NEW: `reference/stable_fluids_warp.py`
+ `reference/__init__.py` + `sim.py` + `invariants.py` +
`docs/sim-specs/volumetric-grid/eulerian-smoke/spec-ref-stack-e.md` + TWO
canonical captures. Additive edits: root `pyproject.toml` (22nd member) + `uv.lock`
+ `docs/perf-ledger.md` (2 warp-cpu rows). NOT touched (charter boundary): Phase-1
source, common-warp, `tolerance.toml` (D6 no-op), `equivalence.md` / methodology /
conventions / warp.md (Stage 2).

## § 2. Operator routing consumed

D6 (override REUSE — no tolerance.toml edit), D7 (socket-only common-warp:
Runtime + Capture + Determinism; own f64 wp.arrays), D9 (`tolerance=0.0` CPU
bit-exact even for chaos), D10 (gate-14 = divergence-rate witness;
`within_tolerance=False` EXPECTED; STOP only on step-1 faithfulness failure —
which did NOT occur, step-1 is bit-exact), D14 (3D 738 MB capture held local),
D15 (own `wp.array(dtype=wp.float64)`). Stage-0 R-A1 `79d15705…`; Stage-1a gate-13
RED anchor `90b0fba7…`.

## § 3. Task 1b.0 — Preflight (Convention M)

(FACT — `git rev-parse`; `/tmp/stage0/s1b-replay.txt`; `/tmp/stage0/s1b-integrity.txt`.)
HEAD entering = `045afd6` (Stage-1a SHA back-fill). Post-implementation
(at `9d9718f`): bit-identity replay → 8/8 PASS, `ok=True`, sha256
`9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34` — **HELD.**
Integrity sweep → `0 HARD_FAIL, 14 SOFT_WARN`, findings sha256
`c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` —
**baseline-MATCH** (the new package + 2 captures + 2 perf rows + spec sheet +
member registration add ZERO integrity findings — no cat1/cat2/cat5 entry
references `eulerian-smoke-stack-e`). Doc anchors unchanged (conventions
`1937a7cf…`; methodology `a154d10c…`; architecture `e82b7b8e…`). gate-13 RED anchor
`90b0fba7…` + R-A1 `79d15705…` match the Stage-0/1a record. **Hard Rule 2 (HEAD/
invariant drift, new integrity findings, anchor mismatch) NOT triggered.**

## § 4. Task 1b.1 — Warp reference implementation

`reference/stable_fluids_warp.py`: per-cell-gather `@wp.kernel`s over own f64
`wp.array`s (D15), re-deriving the Phase-1 algebraic surface VERBATIM (no Phase-1
import; Convention A/D):

- `_sl_advect_{2d,3d}_k` (bilinear/trilinear SL backtrace; `np.mod`-faithful
  positive-modulus `_pmod(x,n)=x-n*floor(x/n)`; lex vertex order),
  `maccormack_advect_2d` (predictor-corrector, host-NumPy combine),
  `_lap5_k`/`_lap7_k` (diffuse), `_div{2d,3d}_k`, `_jacobi{2d,3d}_k`
  (fixed-20-sweep, on-device double-buffer), `_grad_sub_{2d,3d}_k`, `_curl3d_k`.
- **np.roll neighbor-summation ORDER replicated** (`p[im]+p[ip]+p[jm]+…`,
  matching `np.roll(+1)+np.roll(-1)+…`) → step-1 cross-stack BIT-EXACT (§ 8).
- **O-W6**: kernel module omits `from __future__ import annotations`.
- **O-W7**: pure-literal `inv6 = wp.float64(1.0)/wp.float64(6.0)` 3D-Jacobi seed;
  float backtrace position → `wp.int32(...)` base node on a non-reused float
  (S1b-SME1 — empirically the `fi = wp.float64(i)` fresh-var assignment does NOT
  taint the int loop index; narrower than the MPM S0-ME1 reused-variable case).
- NumPy-marshalling wrappers present the Phase-1 public API verbatim.

## § 5. Task 1b.2 — sim.py + invariants.py + spec sheet

- `sim.py`: 8-clause determinism docstring (§ 6 load-bearing); `sim_runner_seeded`
  (3D), `sim_runner_seeded_2d` (2D), `sim_runner_diagnostic` (32³×10),
  `compute_canonical_trajectory_3d`; consumes the common-warp socket ONLY
  (`init("cpu", deterministic=True)` + `set_warp_deterministic` +
  `deterministic_context` + `Capture` + `write_capture` — f64-preserving). Analytic
  Taylor-Green (3D) + lid-driven (2D) ICs (RNG-free).
- `invariants.py`: `divergence_free_post_projection` + `smoke_density_nonneg`
  (50 examples each).
- `spec-ref-stack-e.md`: gate-7 Cat-1 spec sheet (Stam 1999 / Fedkiw 2001 /
  Taylor 1937 DOIs; chaotic-regime R-P2 § 9; O-2 chain § 8).

## § 6. Task 1b.3 — Gates 4–13 verification

(FACT — `uv run --package eulerian-smoke-stack-e --extra dev python -m pytest`
→ **15 passed, 2 skipped**.)

| Gate | Status | Notes |
|---|---|---|
| 4 (code-verification) | **GREEN** | MMS-ONLY (no golden; `test_mms_convergence.py`); advection + projection OOA ≈ 2 ± 0.5 vs the shared `incompressible_ns_2d` source. |
| 5 (Tier-1) | **GREEN** | `check_health` NaN/Inf scan clean across the diagnostic trajectory. |
| 6 (Tier-2 IC-6) | **GREEN** | `check_divergence_free` (advisory) + `check_circulation`/`check_helicity`/`check_energy_spectrum` finite (vector_field). |
| 7 (Cat-1 citations) | **GREEN** | `spec-ref-stack-e.md` + the `reference` docstring cite Stam 1999 (DOI 10.1145/311535.311548) + Fedkiw 2001 (DOI 10.1145/383259.383260) + Taylor 1937 (DOI 10.1098/rspa.1937.0036); `integrity --cat 1` baseline-MATCH. |
| 8 (Cat-2 public API) | **GREEN** | `reference`/`sim`/`invariants` exports; `--cat 2` baseline-MATCH. |
| 9 (Captures) | **GREEN** | TWO captures via common-warp `write_capture` (f64); `read_capture` round-trips (55 payload keys 2D); 2D LFS-tracked, 3D held local (D14). § 7. |
| 10 (Determinism) | **GREEN** | `run_twice_and_diff(sim_runner_diagnostic, 42)` content_equivalent + `assert_deterministic_run(_projection_state, tolerance=0.0)` (W-2 §1.9.1; O-2 ckpt 2). |
| 11 (PBT) | **GREEN** | 2 invariants @ 50 examples each. |
| 12 (perf-ledger) | **GREEN** | `docs/perf-ledger.md` TWO warp-cpu rows (2D 5.897s; 3D 541.977s). § 7. |
| 13 (failing-tests replay) | **GREEN** | § E worktree at `b04cdbde` → 6 `ModuleNotFoundError` (collection errors); HEAD `9d9718f` GREEN (15 passed). § 9. |
| 14 (cross-stack) | **DEFERRED** | `test_cross_stack_equivalence.py` SKIPPED (×2); un-skipped at Stage 1c. Step-1 bit-exact + chaotic → `within_tolerance=False` predicted (R-P2). |

## § 7. Task 1b.4 — Canonical captures + perf-ledger (§ N)

(FACT — `sim_runner_seeded_2d`/`sim_runner_seeded`; committed-blob / on-disk sha256.)

| Descriptor | dims | wall-clock | size | disposition | payload (LFS-oid / .h5) sha256 |
|---|---|---|---|---|---|
| `lid-driven-cavity-128sq-re100-seed42-step1000` (2D) | 128² | 5.897 s | 4,385,176 B | **committed (LFS)** — D14/§5.4 schema-corpus subset | `aa67929f…214734` |
| `taylor-green-128cube-seed42-step500` (3D) | 128³ | 541.977 s | 738,260,192 B | **held LOCAL** (D14; uncommitted) | `6b5158e8…b47fe5` |

- 2D byte-size identical to the Phase-1 ref capture (4,385,176 B); 3D byte-size
  identical (738,260,192 B). BOTH manifests match the Phase-1 ref
  `sim.name="eulerian-smoke"` / `category="volumetric-grid"` / `variant` → gate-14
  `compare_captures` resolves `smoke`/`1e-4` via the existing
  `[overrides.eulerian-smoke]` (D6 REUSE; no new row).
- Committed-blob shas: 2D `.h5` LFS-pointer blob `9d4183a9…`; 2D `.json`
  `e93189ed…` (post-eof-fixer; the writer's payload.checksum embeds the .h5 content
  sha `aa67929f…`). 3D held-local `.json` sha256 `b8875b91…bf43c0`.
- perf-ledger: 2D 1.16× the numpy-ref baseline (0.70× Stack-D); 3D 0.78× baseline
  (under baseline; 0.78× Stack-D) — both within the 2× regression band.

## § 8. Step-1 cross-stack port-faithfulness (D10; gate-14 readiness) — S1b-SME2

(FACT — Phase-1 `eulerian_smoke.reference.stable_fluids` vs Stack-E
`eulerian_smoke_stack_e.reference.stable_fluids_warp` on the identical IC, n=24.)

- **3D step-1 `max_abs_err`: u=0.0 v=0.0 w=0.0 density=0.0 p=0.0.**
- **2D step-1 `max_abs_err`: u=0.0 v=0.0 p=0.0.**
- **BIT-EXACT** — the `np.roll` operation-order + `np.mod`-via-floor replication is
  exact (exceeds the plan-drafting `~1e-16` prediction; matches Stack-D's 0.0).
  D10 step-1 port-faithfulness is PERFECT; the only STOP condition (step-1
  faithfulness failure) is NOT triggered. The later-step chaotic divergence
  (3D energy 2.6e5 → 3.2e19 @ step50 → ~6.7e45 plateau; 2D Kelvin-Helmholtz) is
  the EXPECTED R-P2 regime, NOT a defect.

## § 9. O-2 four-checkpoint chain + gate-13 replay

- **Checkpoint 1 (Stage 0):** R-A1 `79d15705…b342b2eea2` (ephemeral Jacobi kernel).
- **Checkpoint 2 (gate-10):** `assert_deterministic_run(_projection_state,
  tolerance=0.0)` on the production `project_pressure_3d` — bit-exact run-to-run
  (NOT byte-equal to `79d15705…`: the production `np.roll` order differs from the
  Stage-0 ephemeral kernel's index order; S1a-SME2 holds). GREEN.
- **Checkpoint 3 (canonical-scale 2-run):** the 2D canonical (`128²×1000`)
  reproduced bit-identical across two runs (worst_abs_diff `0.0`; 55-key payload
  digest match). The 3D single-run determinism is inherited (same gather kernels +
  serial-launch posture; gate-10 diagnostic 2-run + this 2D canonical 2-run cover
  it). GREEN.
- **Checkpoint 4 (Stage 1c):** formal gate-14.
- **gate-13:** a clean `git worktree` at `b04cdbde` (the Stage-1a RED anchor, with
  the package NOT editable-installed) reproduces **6 `ModuleNotFoundError`**
  collection errors; HEAD `9d9718f` is GREEN (15 passed, 2 skipped). **S1b-SME
  operational note:** when the package IS editable-installed (post-`uv sync`), the
  install's import finder resolves `eulerian_smoke_stack_e` to HEAD and defeats the
  worktree replay — the faithful RED replay requires the editable install absent
  (the Stage-1a posture). The committed Stage-1a RED evidence (`90b0fba7…`) is the
  canonical RED witness.

## § 10. Banked items / observations (shifts S1b-SME1..S1b-SME3)

- **S1b-SME1 — O-W7 part-2 EXERCISED + NARROWED.** The SL-backtrace base-node
  derivation needs `float(tid)` AND `int(tid)` indexing. Empirically (de-risk
  kernels), `fi = wp.float64(i)` into a FRESH variable does NOT taint the int loop
  index `i` for later `out[i,j]` / `field[i0,j]` indexing — narrower than the MPM
  S0-ME1 case (`rx = fx - wp.float64(bx)` tainted the REUSED `bx`). The discipline:
  assign the float to a fresh var; derive the int base via `wp.int32(<float_base>)`
  on a non-reused float. All 11 kernels compile + run. (Stage-2 § L.6 refinement
  candidate; no doc edit at Stage 1b.)
- **S1b-SME2 — step-1 cross-stack BIT-EXACT (0.0), exceeding the ~1e-16
  prediction** (§ 8). The `np.roll`-order + `np.mod`-via-floor replication is
  byte-exact; gate-14 step-1 faithfulness (D10) is perfect → the chaotic-regime
  `within_tolerance=False` will be a clean divergence-rate verdict, not a near-miss.
- **S1b-SME3 — `uv sync` prunes the workspace `.venv`.** Plain `uv sync` (run after
  member registration) removed the non-root workspace tools (`integrity`,
  `pyyaml`, …) from `.venv`, breaking the cat4 pre-commit hook
  (`ModuleNotFoundError: No module named 'yaml'`). **Fix: `uv sync --all-packages`
  (restores all members) — or follow the MPM precedent and run `uv lock` ONLY (no
  sync; the .venv already carries the members).** Recorded as a workflow hazard for
  Stage 1c / Stage 2 (which run integrity).
- **Operational notes (NOT shifts):** (a) gate-13 worktree replay editable-install
  contamination (§ 9). (b) the 2D capture `.json` received an eof-fixer trailing
  newline at commit (harmless — `json.load` whitespace-insensitive; MPM-precedented;
  the .json committed-blob sha is `e93189ed…`, the .h5 LFS-oid `aa67929f…` is
  stable). (c) ruff did NOT re-sort the Stage-1a test imports after registration
  (the S1a-SME2 predicted churn did not materialise).
- **STAY-BANKED:** LFS-architecture (D13); 3D-capture-held-local (D14); R-SME9
  resolution-dependence (Stage-2 § L.4 candidate); S1a-SME1 charter §6 reconcile
  (Stage-2) — no surprises.

## § 11. Stage 1c readiness

**READY.** Stage 1c deliverables (charter § 2/§ 4 Stage-1c row): gate-14
`compare_captures(LEFT=captures/eulerian-smoke-ref/…, RIGHT=captures/eulerian-smoke-
stack-e/…)` at `relative=1e-4` for BOTH descriptors (the 3D LEFT-partner is
materialised locally, 738 MB; the 3D RIGHT-partner is held local) → predicted
`within_tolerance=False` on BOTH (R-P2; step-1 bit-exact + positive divergence
rate) → `equivalence.md` additive Stack-E section → tolerance-override REUSE
verify-only (D6 no-op) → schema-corpus subset (the 2D capture) → un-skip the
gate-14 test (×2). O-2 checkpoint 4. STOP only on a step-1 port-faithfulness
failure (which is bit-exact 0.0 — will not trigger). No blocking dependencies.

## § 12. Verdict

**stage-1b-CONFIRMED.** Gates 4–13 GREEN (15 passed, 2 skipped=gate-14);
step-1 cross-stack BIT-EXACT (0.0; D10 perfect); 22nd workspace member registered;
O-2 checkpoints 2 + 3; TWO canonical captures (2D LFS-committed, 3D held-local
D14); integrity baseline-MATCH (`c19492ad…`); bit-identity replay HELD
(`9399fc33…`); gate-13 RED `b04cdbde` → GREEN `9d9718f`. 3 shifts (S1b-SME1..3);
cumulative **202 → 205**. No `-phase-N` tag (D12). Local-only (D13). Operator
routes Stage 1c separately.

---

*End of Stage 1b checkpoint. `head_sha` back-filled in the SHA back-fill commit
(Convention #12; separate commit; never `--amend`; N1 enumeration).*
