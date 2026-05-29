---
date: 2026-05-29
author: phase-3 neural-ca plan-drafting (Claude Code)
subject: probe report — task-6 neural-ca (sub-phase 3.2); FIRST DUAL-STACK sim of Phase 3 (Stack D PyTorch + Stack B WGSL, tied by a checkpoint)
verdict: PROBE COMPLETE (charter ready; Stack-B-test-infra BLOCK does NOT fire; 5 D-classes open for operator + 8 resolved-in-charter)
head_sha: ab5ab58
prior_sub_phase_landed_at: 86b0aa5
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: b7460150b61213bb8909659ffc7b103d846ad782f5062d272f2ce572e6abb15e
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
evidence_paths:
  - docs/architecture.md
  - docs/phases/phase-3-plan.md
  - docs/conventions/sub-phase-conventions.md
  - docs/phases/sub-phase-phase-3-ising-classical.md
  - docs/phases/sub-phase-phase-3-mass-spring-cloth.md
  - docs/phases/sub-phase-phase-3-rigid-body.md
  - tools/testkit/render_similarity/__init__.py
  - tools/testkit/render_similarity/metrics.py
  - tools/testkit/render_similarity/harness_mode.py
  - tools/testkit/equivalence/__main__.py
  - tools/testkit/equivalence/harness.py
  - tools/testkit/equivalence/tolerance.toml
  - tools/testkit/equivalence/tolerance-schema.json
  - tools/testkit/determinism/registry.toml
  - .github/workflows/python-strict.yml
  - .github/workflows/ts-strict.yml
  - packages/ising-classical/src/index.ts
  - common/common-ts/src/context.ts
  - packages/reaction-diffusion-2d-stack-d/tests/test_cross_stack_equivalence.py
  - docs/spec-amendments-proposed.md
  - docs/_audits/phase-3/progress.md
---

# Probe report — task-6 neural-ca (sub-phase 3.2)

**FIRST DUAL-STACK sim of Phase 3.** Stack D (PyTorch training + PyTorch
inference) **AND** Stack B (custom-WGSL/WebGPU inference), tied by one trained
checkpoint. Gate-14 (cross-stack equivalence) is ACTIVE and is realized via
**render-similarity** (D-inference ↔ B-inference, perceptual/statistical) — NOT
`compare_captures`. Probe per Convention #8 (verbatim live surfaces) + web-verify
per the dispatch (do not trust plan-supplied citations — task-4 Goldstein §4.3 +
2/3 catenary cites were wrong). Feeds charter
`docs/phases/sub-phase-phase-3-neural-ca.md`.

Every concrete claim below is tagged **FACT** (live repo), **WEB** (web-verified
this session), or **INFERENCE** (reasoning from FACTs).

## 0. Pre-flight + anchor (FACT)

- `uv run python tools/dispatch/preflight-phase.py 3` → **genuine exit 0** (8/8
  PASS: prior-phase-tag `v0.2.0-phase-2`, `common/common-warp`,
  `docs/common/warp.md`, the four Phase-2 ports, `integrity-all-green`). F1/F2
  stale-tooling false-positive fixed (`1793b83`); **no STOP-PREFLIGHT-NEW**.
- `uv run --no-sync python -m integrity --all --mode strict` →
  `summary: 0 HARD_FAIL, 14 SOFT_WARN` at HEAD `86b0aa5`; full-stderr digest
  `b7460150b61213bb8909659ffc7b103d846ad782f5062d272f2ce572e6abb15e` (§R measured
  live, not copied). Invariant = the **count** (0 HF / 14 SW); the digest is
  informational and drifts as Phase-3 sims add golden tables / audit lines.
- Prior sub-phase: task-5 mass-spring-cloth landed `closed-with-shifted-7` at
  `86b0aa5` (HEAD). Tasks 1–5 + ising-classical (3a) + 4 infra fixes all landed
  to `origin/main`; **no per-sub-phase tags** (phase-close-only; D-TAG NO).

## 1. ⚠ STACK-B TEST INFRA (the gating probe) — VERDICT: pattern EXISTS; BLOCK does NOT fire

**The §6.6 ANCHOR-PROBE "IF NO PATTERN EXISTS: BLOCK per §5.3" clause does NOT
fire.** A CI-testable Stack-B verification pattern exists and is consumable. But
the shape is NOT "WGSL inference runs in CI" — it is **offline-generated,
committed, LFS-tracked captures + CI reads them** (golden / cross-stack
comparison in pure Python). This was resolved at the convention level by
ising-classical's D-HARNESS-LAYOUT (`docs/phases/sub-phase-phase-3-ising-classical.md:383-421`).

The governing spec rule (FACT) — **§7.8 Runtime-only display surfaces**,
`docs/architecture.md:1498-1500`:

> CI does not exercise GGUI windows, interactive input handling, ImGui sub-window
> layouts, headless render pipelines needing real GPUs. These surfaces require
> explicit user-driven visual-verification gates after CI-green and before "phase
> complete."

Live evidence (FACT):

- **No GPU in CI.** `.github/workflows/ts-strict.yml` runs `vitest` under Node 22,
  no browser, no Dawn-Node, no Deno-WebGPU, no lavapipe; it operates ONLY in
  `common/common-ts/` (library primitives), not per-sim packages. The vitest step
  is labelled "skip-in-CI tests excluded per spec §7.8". `@webgpu/types` are
  compile-time stubs only.
- **WGSL path is local-only.** `packages/ising-classical/src/index.ts:1-9` +
  `:96-102`: the WebGPU sim "Requires a live WebGPU adapter; throws cleanly when
  navigator.gpu is undefined (CI no-GPU path per spec §7.8)". `common/common-ts/src/context.ts`
  `createContext()` throws if `navigator.gpu === undefined`; its happy-path test is
  `it.skip("… local only")`.
- **CI oracle = the committed capture.** Stack-B sims are tested by **pytest jobs
  in `.github/workflows/python-strict.yml`** (e.g. `test-ising-classical`,
  `:227-277`) that do a selective LFS pull
  (`git lfs pull --include="captures/ising-classical-ref/**"`) and run pytest
  against the **pre-committed** capture. The NumPy reference is the load-bearing
  CI oracle; the WGSL kernel is exercised on a GPU host locally and writes the
  canonical capture offline.
- **The capture path is cross-stack-ready.** `runWebgpuIsing`
  (`packages/ising-classical/src/index.ts:134-153`) builds a valid `CaptureManifest`
  (`stack.name="webgpu"`) via the TS `CaptureWriter`, byte-compatible with the
  Python `capture.load_capture` (proven by `common/common-ts/src/__tests__/cross-stack.test.ts`).
  So a Stack-B-produced render capture IS readable by the Python render-similarity
  testkit.

**INFERENCE (the D↔B realization for NCA):** the D↔B render-similarity gate runs
in CI as a **pure-Python comparison of two COMMITTED captures** — a D-inference
render-capture (PyTorch, generated offline) and a B-inference render-capture (WGSL,
generated offline on a GPU host) — exactly mirroring `test-ising-classical`'s
committed-capture pattern + RD-2D's `test_cross_stack_equivalence.py`. CI never
runs the WGSL render; it reads the two captures and applies PSNR/SSIM/LPIPS
(`render_similarity` is pure NumPy/skimage/lpips-CPU). This is §7.8-compliant and
fully precedented. The B-inference WGSL itself is exercised on a GPU host
locally per §7.8 (a §6.6-deliverable-E local check, not a CI gate).

→ **D-STACK-B-TEST-INFRA RESOLVED-IN-CHARTER (no BLOCK):** inherit ising's
pytest-against-committed-captures + NumPy/CPU-oracle; route the D↔B comparison to
`python-strict.yml/test-neural-ca-equiv`; the WGSL inference local-only per §7.8.

## 2. render_similarity API (the D↔B gate mechanism) — FACT

**Module path is a PACKAGE: `tools/testkit/render_similarity/`** — NOT the
`tools/testkit/equivalence/render_similarity.py` prose path in §6.6/§3.1
(`docs/phases/phase-3-plan.md:1793`, `:324`). Resolved-in-landing by task-2 per
§0.3; see `docs/phases/sub-phase-phase-3-render-similarity.md`. **Stable consumer
import** (`tools/testkit/render_similarity/__init__.py:20-22`):

```python
from render_similarity import psnr, ssim, lpips, ms_ssim
```

Exact signatures (`tools/testkit/render_similarity/metrics.py`):

| fn | signature | line | status |
|---|---|---|---|
| `psnr` | `psnr(image_a, image_b) -> float` (returns `inf` for identical) | :182 | implemented |
| `ssim` | `ssim(image_a, image_b) -> float` (skimage; [-1,1]) | :208 | implemented |
| `lpips` | `lpips(image_a, image_b, net: Literal["alex","vgg"]="alex") -> float` | :231 | implemented (lpips==0.1.4) |
| `ms_ssim` | `ms_ssim(image_a, image_b) -> float` | :279 | **SHELL** — always raises `NotImplementedError` (Phase-4 WU-C) |

- **Input contract:** `(H, W, C)` NumPy arrays, dtype `uint8 [0,255]` OR
  `float32 [0,1]` (auto-detected), RGB (C==3); LPIPS additionally requires
  H,W ≥ 64 (AlexNet max-pool). `_validate_pair` raises `ValueError` on mismatch.
- **Determinism (D-DET foundation, from task-2 landing):** all 4 metrics MEASURED
  bit-equal across two runs (CPU). **R-4 caveat:** LPIPS must run **CPU-only** for
  the equivalence gate — a GPU LPIPS diverges (reduction order). **R-3:** LPIPS
  weights sha256-pinned on first load.
- **Harness MODE is a STAGE-1a SHELL (FACT):** `tools/testkit/render_similarity/harness_mode.py:31-43`
  `run(left, right, tolerance_key, tolerance_table_path=None) -> int` **raises
  `NotImplementedError`**. The CLI dispatch exists
  (`tools/testkit/equivalence/__main__.py:74-85`,
  `python -m equivalence --mode render-similarity --left … --right …
  --tolerance-key continuous-ca.neural-ca`) but calls the shell. **The metric
  functions are implemented; the frame-pairing CLI orchestrator is deferred.**
  → INFERENCE: NCA's D↔B test imports the metric functions DIRECTLY (mirroring
  RD-2D's `from equivalence.harness import compare_captures` direct import in
  `test_cross_stack_equivalence.py`), pairs frames by index, asserts against the
  tolerance row. Completing `harness_mode.run` is task-2's deferred surface, NOT
  task-6's obligation (out-of-scope unless trivial; see D-XSTACK-METHOD).

**The CONTRASTING deterministic method NCA does NOT use (FACT):**
`packages/reaction-diffusion-2d-stack-d/tests/test_cross_stack_equivalence.py:26-46`
calls `compare_captures(left, right)` (field-by-field numeric diff at
`relative=1e-4, absolute=0.0`) and asserts `verdict.within_tolerance`. A learned
model in PyTorch vs WGSL is NOT bit/epsilon-equivalent cross-stack (different f32
conv reductions) — the equivalence is **distributional/perceptual** (spec §2.6
learned row = `distributional`). `compare_captures` would FAIL here.

## 3. Tolerance schema — three shapes; NCA gets TWO rows under TWO branches — FACT

`tools/testkit/equivalence/tolerance-schema.json` top-level `additionalProperties:false`.
Per §S.3 (`docs/conventions/sub-phase-conventions.md:1518-1544`), NCA is **named
in BOTH** of these shapes:

1. **`[render_similarity.<category>.<sim>]`** (the TS-inference render-similarity
   gate) — required triple `psnr_min` / `ssim_min` / `lpips_max`, per-sim entry
   `additionalProperties:false`. → `[render_similarity.continuous-ca.neural-ca]`.
2. **`[golden_tolerance.<category>.<sim>]`** (the training-side checkpoint gate) —
   bespoke keys; §S.3 names **`neural-ca-python: golden_checkpoint_match,
   training_loss_distributional_bound`**. → `[golden_tolerance.continuous-ca.neural-ca-python]`.

task-2 ships render-similarity **SCHEMA ONLY** — zero per-sim rows
(`tools/testkit/equivalence/tolerance.toml:98-108`); per-sim rows are added by consuming sims at their own
dispatch. **NCA adds both rows.** Spec §2.12 quality floors
(`docs/phases/phase-3-plan.md:405`, `:230`): **PSNR ≥ 28 dB, SSIM ≥ 0.85,
LPIPS ≤ 0.15**; below floor → quality-concern flag in report §6 (NOT auto-fail —
learned-dynamics is `distributional` per spec §2.6). §S.2: read
`tolerance-schema.json` + one existing entry BEFORE appending; the plan §3.2.4
prose shape `[continuous-ca.neural-ca-*]` is a starting design, NOT the landed
schema shape (lenia + ising both had to remap).

## 4. Determinism registry — TWO rows (training non-det + inference bit-exact) — FACT

`tools/testkit/determinism/registry.toml`. Plan §3.2.5
(`docs/phases/phase-3-plan.md:487-503`) gives the canonical NCA rows verbatim:

```toml
[continuous-ca.neural-ca.training]
stack = "D"
class = "non-deterministic"          # by design — PyTorch backprop atomics
seed_pinned = true
distributional_bound = "EFECT"

[continuous-ca.neural-ca.inference]
stack = "B"
class = "bit-exact"
scope = "same-stack-same-hw"
atomic_ops = "none"
subgroup_ops = "none"
seed_pinned = true
```

**INFERENCE:** training non-determinism is **by design** (unlike ising, which
landed bit-exact after STOP-DET did not fire). NCA cannot be bit-exact on the
training side; it carries `distributional_bound = "EFECT"` from Stage 1a. The
inference row mirrors ising's bit-exact WGSL posture. EFECT = Empirical
Characteristic Function Equality Convergence Test, spec §2.5
(`docs/architecture.md:392`) + Appendix A (`:2316`, arXiv:2406.16820); the
non-determinism-by-design clause: "Non-determinism by design (stochastic CA, Monte
Carlo) is acceptable but must be declared and tested with distributional equality
(e.g., EFECT) rather than bit-exact comparison." **No prior Phase-3 sim has
*derived* an EFECT bound** — this is novel territory (see D-DET / STOP-EFECT).

## 5. Checkpoint artifact + conversion pipeline — ABSENT; NEW; load-bearing — FACT

- `tools/testkit/golden/checkpoints/` **does not exist** (FACT). **No `.safetensors`
  file anywhere in the repo** (all `*checkpoint*` hits are `.venv/` torch/warp or
  audit `.md` filenames). No checkpoint-artifact handling in testkit.
- safetensors is **not mentioned in `docs/architecture.md`** (capture format is
  HDF5-only §2.7; bespoke neural-weights distribution explicitly deferred
  post-Phase-5, `docs/architecture.md:1724`). BUT plan §6.6 deliverable F
  explicitly mandates `tools/testkit/golden/checkpoints/neural-ca-emoji-{name}.safetensors`
  (`docs/phases/phase-3-plan.md:1851`).
- **INFERENCE (D-CHECKPOINT-CONVERSION, new pipeline):** PyTorch training emits a
  `.safetensors` checkpoint; a `convert_checkpoint.py` reads it and emits a
  WGSL-loadable artifact (flat f32 buffer + documented layout, or JSON). The
  conversion MUST be **exact** (same float values, documented layout) and **TESTED**
  (round-trip / weights-equality asserting bit-identical weight values pre/post),
  and the converted artifact verified. A lossy conversion breaks the D↔B gate.
  Both artifacts are binary → LFS-tracked → §Q applies.

## 6. Dual-stack PACKAGING — lean UNIFIED `packages/neural-ca/` — FACT + INFERENCE

- **Every Phase-3 sim landed at `packages/<sim>/`** via §0.3 existing-convention
  precedence, NOT the plan's prose `continuous-ca/neural-ca/python/` (FACT:
  lenia/ising/rigid-body/cloth landing entries, `docs/_audits/phase-3/progress.md`).
- **ising precedent = ONE package, TWO languages** (FACT): `packages/ising-classical/`
  holds `src/*.wgsl`+`src/index.ts` (TS/WGSL) AND `ising_classical/sim.py` (Python)
  AND `tests/*.py`. A single sim with two language surfaces lives in one package.
- **RD-2D precedent = `-stack-{b,d}` suffix** but only because those are
  **independent ports** (each a full standalone sim), `packages/reaction-diffusion-2d-stack-{b,d}/`.
- **INFERENCE (D-LAYOUT lean):** NCA is **one sim, two halves tied by ONE
  checkpoint** (training half + inference half) — closer to ising's single-package
  shape than RD-2D's independent ports. §6.6 itself uses ONE `neural-ca/` dir with
  `python/` + `typescript/` subdirs. Lean **unified `packages/neural-ca/python/`
  (PyTorch training) + `packages/neural-ca/typescript/` (WGSL inference) + the
  checkpoint + convert + D↔B test co-located**. Resolve definitively at Stage-0
  probe per §0.3 (SHIFT-from-discovered if the live convention differs).

## 7. Vendor upstream — WEB-verified — NO §2.18 row → A-4/A-5 candidates

- **WEB:** Mordvintsev "Growing Neural Cellular Automata" official code lives at
  **`github.com/google-research/self-organising-systems`**, license **Apache-2.0**
  (permissive — like Bender MIT; NOT non-commercial like Inria), default branch
  `master`, HEAD SHA **`3d5547ca48b60ecac459834e2c05c9ff5df87991`** (committed
  2026-01-09). The only release tag `biomaker-v1.0.0` is a different sub-project
  (biomaker), not NCA → per plan §2.18 pinning rule ("latest stable release tag
  within 12 months… otherwise default-branch HEAD") the pin = **default-branch
  HEAD `3d5547ca…`**. NCA code under `isotropic_nca/` + `notebooks/` (the Distill
  growing-ca colab).
- **FACT:** plan §2.18 (`docs/phases/phase-3-plan.md:255-311`) pins exactly FIVE
  upstreams (Inria, PhysGaussian, Bender, PhysicsNeMo, Lenia) and says it resolves
  "all five" — there is **NO growing-neural-ca / Mordvintsev row**. Spec
  Appendix D.3 (`docs/architecture.md:2545-2553`) likewise has **NO** NCA vendor
  pin/license row (only a bibliography entry, `:2218`).
- **D-VENDOR-ROLE / D-VENDOR-SHA:** vendor `references/growing-neural-ca/` READ-ONLY
  reference-oracle at SHA `3d5547ca…`; reimplement the NCA update rule from the
  Distill paper (cite by name, do NOT import/call — §H.2). `references/` excluded
  from hooks + Cat-2 (cloth `references/SPlisHSPlasH` precedent).
- **Corrigenda to file at Stage 0** (NOT in this plan-drafting pass — precedent:
  cloth/rigid-body filed A-1/A-2/A-3 at Stage 0): **A-4** — plan §2.18 add the
  growing-neural-ca row (`3d5547ca…`, Apache-2.0); **A-5** — spec Appendix D.3 add
  the growing-neural-ca vendor pin/license row. Format mirrors A-3 (plan-level) +
  A-2 (spec-level) in `docs/spec-amendments-proposed.md`.

## 8. Anchor web-verify — published PSNR/SSIM anchors DO NOT EXIST → D-ANCHOR re-shapes

- **WEB (decisive):** the Distill paper (`distill.pub/2020/growing-ca/`) trains
  with **pixel-wise L2 loss on RGBA** ("At the last step we apply pixel-wise L2
  loss between RGBA channels in the grid and the target pattern") and **publishes
  NO PSNR, SSIM, or LPIPS values or thresholds** — evaluation is qualitative
  (visual inspection / interactive demos).
- → The plan §6.6 v9-addendum anchors (`docs/phases/phase-3-plan.md:1828`)
  **"Anchor 1: PSNR threshold from Mordvintsev et al. 2020"** and **"Anchor 2:
  SSIM lower-bound from a separately-published NCA reference"** **do not exist as
  published numbers in the primary source.** This is the dispatch-flagged D-ANCHOR
  re-shape.
- **INFERENCE (D-ANCHOR re-shaped anchor set, per §2.12 measure-then-lock + spec
  §9):**
  - **Anchor 1 (training-convergence, NOT cross-stack):** the Mordvintsev L2 loss
    is the training golden — `golden_checkpoint_match` (the checkpoint reproduces a
    target-pattern reconstruction at a training-loss bound). It is NOT a
    render-similarity anchor.
  - **Anchor 2 (the §2.12 quality floors):** PSNR ≥ 28 / SSIM ≥ 0.85 / LPIPS ≤ 0.15
    are the LOWER acceptance floor for the D↔B render-similarity row.
  - **Anchor 3 (the locked gate):** the **MEASURED** D↔B render-similarity at
    Stage 1b, locked per §2.12 (the actual `psnr_min`/`ssim_min`/`lpips_max`), plus
    a hand-derived "patterns visually equivalent" criterion documented in
    spec-ref §9. **Document in spec-ref §6 that this gate is statistical, not
    analytic** (§6.6 v9 item; spec §5.12 + §2.6 learned-row).
  - Flag plan §6.6 v9 Anchor-1/Anchor-2 prose as a **§0.3 SHIFT-from-discovered**
    in report §1 (the published-metric anchors don't exist); this is plan-prose
    drift, documented as a SHIFT, NOT a spec amendment.

## 9. Spec/dispatch citation corrections (Convention #8 — checked, not asserted)

- **"Gate 14" is NOT a spec gate.** `docs/architecture.md` §3.5 (`:832-854`) + D.6
  (`:2585-2606`) define exactly **13** Layer-4 gates. Cross-stack equivalence is a
  **CI gate** per §2.6 / §9.3 (`:1782`) + the Layer-5 merge gate (`:856-865`).
  "gate-14 = cross-stack equivalence" is a **per-sub-phase local convention** (used
  throughout Phase 2/3 audits), not spec §3.5. The charter frames it as the
  local-convention cross-stack equivalence gate realized as a CI gate.
- **§2.6 learned row (FACT, `docs/architecture.md:414`):** `| Learned dynamics |
  trajectory-divergent | trajectory-divergent | distributional |`. Same-stack-same-hw
  for the *learned-dynamics category* is **trajectory-divergent** (NOT bit-exact);
  cross-stack = **distributional**. INFERENCE: this categorizes the learned SIM
  family's multi-step trajectories; the plan §3.2.5 resolves the *inference-forward-pass*
  registry row as `bit-exact same-stack-same-hw` (a fixed-checkpoint single forward
  pass is deterministic on CPU same-hw). The charter honors BOTH: cross-stack =
  distributional (render-similarity); same-stack inference reproducibility MEASURED
  at 1b (lean bit-exact per plan §3.2.5, do not pre-declare — D-DET).
- **Dispatch §2.9/§2.10/§2.12 "LOCK/floor" cites map to the PLAN, not
  architecture.md.** In `docs/architecture.md`: §2.9 = Pre-implementation probes
  (`:523`), §2.10 = Layer 0→N gate (`:536`), §2.12 = Schema-version bump policy
  (`:563`). The "Stack-B framework LOCK (custom WGSL)" + "PyTorch-direct, NOT
  promoted to common-py" LOCKs are in **plan §6.6** (`docs/phases/phase-3-plan.md:1781-1784`,
  citing §2.9/§2.10 *as plan-internal anchors*). The "equivalence-bound floor /
  measure-then-lock" concept = spec **§2.6 Tolerance budget** (`docs/architecture.md:418-445`)
  + D.8 item 17 (`:2646`). **Do NOT cite architecture.md §2.9/§2.10/§2.12 for
  LOCK/floor claims — they HARD_FAIL Cat 4.** Charter cites plan §6.6 + spec §2.6.
- **NCA canonical capture descriptor (FACT, `docs/architecture.md:2505`, D.2.3):**
  `| neural-ca | ref | growing-emoji-64sq-seed42-step1000 | Phase 3 task-6 |`. The
  schema-corpus seed is `tests/fixtures/legacy-captures/phase-3-neural-ca.h5`
  (plan §6.6 v9 item 10). Canonical sim name = **neural-ca** (consistent across
  §3.4 / §6.6 / §3.1 / D.1 `:2431`).
- **PBT gate-11 (FACT):** spec `docs/architecture.md:612` allows "neural surrogate
  trajectories" to declare NO invariants and run no PBT gate — BUT plan §6.6 v9
  item 7 (`:1827`) CHOOSES to declare **two** invariants: `field_values_bounded`
  (output ∈ [-1,1] or [0,1] every step under random valid seeds) +
  `inference_determinism` (same weights+seed+input → bit-exact output across two
  runs — **the foundation for D↔B render-similarity**). NCA runs the PBT gate.
- **§S6 is not a section** of `docs/conventions/sub-phase-conventions.md` (S.1–S.5
  only); charters operationalize "§S6" as §R.5 (measure-don't-copy digest) + §B.6
  (evidence-paths real sha256, no `: self` sentinel — verify_evidence rejects it).

## 10. Convention operative lines (FACT — for charter §8 operationalization)

- **§Q LFS** (`docs/conventions/sub-phase-conventions.md:1314-1319`): a sub-phase
  committing a new `.h5`/`captures/` object runs `source tools/lfs/setup-lfs-s3-local.sh`
  **as the first action after the anchor probe**; non-zero → STOP-LFS-PUSH. NCA
  ships `phase-3-neural-ca.h5` + canonical capture(s) + the `.safetensors`
  checkpoint + the converted WGSL artifact → §Q applies. Same-shell push recipe
  (ising root-cause): GitHub via `git -c lfs.standalonetransferagent= push`; R2 via
  `source … && git lfs push --object-id --stdin origin` in the SAME command.
- **§R two-field** (`:1408-1420`, `:1451-1456`): front-matter
  `integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"` (stable; STOP-D on change) +
  `integrity_digest_at_head: <measured sha256 of full stderr>` (informational,
  never copied). §R.4 STOP-D fires only on a HARD_FAIL appearing or the SOFT_WARN
  count changing from 14.
- **§S.3** (`:1518-1544`): three legal tolerance shapes; NCA = render_similarity
  branch (TS) + golden_tolerance branch (training). §S.2 (`:1501-1509`): read the
  schema first; plan prose is a starting design.
- **§S.5** (`:1577-1601`): post-push, query the FULL workflow set at the pushed SHA
  (`gh run list --commit "$(git rev-parse HEAD)" --limit 30`); any failure on a
  push-to-main workflow → STOP-CI-RED. `--workflow=<name>` is diagnostic narrowing,
  NOT the closure check.
- **§H vendoring** (`:387-417`): Stage-0 verify `[upstream].sha` matches documented,
  `used_by_sims` + `used_by_checks` populated, tree exists; SHA/tree drift → BLOCK.
  §H.2: cite vendored algorithms BY NAME, derive independently, do not import.
  MANIFEST format: cloth uses `references/<name>/MANIFEST.toml` (NOT `manifest.yaml`
  — §6.6 deliverable G's `manifest.yaml` is §0.3 SHIFT-from-discovered).
- **Convention #12** (`:74-87`): two-commit SHA back-fill at every stage close —
  placeholder `head_sha:` → commit → `git rev-parse HEAD` → edit → commit again
  `chore(<slug>-sha-backfill): …`. Never `--amend`.
- **cross-stack methodology doc** (`docs/conventions/cross-stack-equivalence-methodology.md`):
  the charter's D↔B gate references it; NCA's D↔B is the FIRST intentionally
  **statistical (render-similarity), not bit-exact** Phase-3 cross-stack gate.

## 11. Dependency + terminal status — CONFIRMED

- **task-2 → task-6 is a HARD dep, SATISFIED** (FACT): plan §3.1 (`docs/phases/phase-3-plan.md:324`,
  `:334`); render-similarity landed `closed-with-shifted-1`; `from render_similarity
  import psnr, ssim, lpips` available; its landing audit names task-6 as a HARD
  consumer with the dep satisfied.
- **task-6 is TERMINAL on the produce side** (FACT): plan §3.1 (`:328`) "(terminal)".
- Ising/RD-2D established the Stack-B pytest-against-captures test infra (§1) — the
  second precondition is satisfied.

## 12. Probe verdict

Charter is ready for Stage 0. **Stack-B-test-infra BLOCK does NOT fire** (§1).
**Five D-classes open for operator routing** (lean each): D-STACK-B-TEST-INFRA
(RESOLVED-IN-CHARTER, surfaced for confirmation), D-XSTACK-METHOD, D-ANCHOR,
D-DET, D-CHECKPOINT-CONVERSION — the load-bearing pair is **D-XSTACK-METHOD +
D-ANCHOR**. **Eight D-classes RESOLVED-IN-CHARTER** (D-VENDOR-ROLE, D-VENDOR-SHA,
D-LAYOUT, D-TOL, D-CI, D-MANIFEST-FMT, D-NAMING, D-TAG). Two corrigenda (A-4 plan
§2.18, A-5 spec D.3) + one §0.3 anchor-prose SHIFT staged for Stage 0.
