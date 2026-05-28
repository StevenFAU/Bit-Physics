---
date: 2026-05-28T21-55-00Z
author: phase-3 ising-classical stage-1a (Claude Code)
subject: Phase 3 ising-classical — STAGE 1a scaffold + impl-probe + spec-ref stub + RED tests + failing-tests-hash
verdict: CONFIRMED
head_sha: a4d96074c4c1eb59d183e41b7e1ec73ada8f6ac5
prior_sub_phase_tag: v0.2.4-sub-phase-phase-3-lenia
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: 688bc195d8b785753ae9500b4e1d48800ae961dd38ac4410f16fb7446de127ff
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
d_class_status: D-LAYOUT RESOLVED-ON-EVIDENCE (packages/ising-classical/) / D-HARNESS-LAYOUT RESOLVED-IN-CHARTER-v2 (pytest-against-captures) / D-CI RESOLVED-IN-CHARTER-v2 / D-PBT RESOLVED-IN-CHARTER / D-MUT-SCOPE NO / D-TAG NO / D-WEBGPU-DET + D-WIDE-TOL + D-ANCHOR + D-DET-REGISTRY + D-TOL-SCHEMA open-to-Stage-1b
failing_tests_output: tools/testkit/failing-tests-evidence/ising-classical-2026-05-28T21-40-00Z.txt
failing_tests_output_hash: sha256:572c9e4e0b186c69e1dfb4dad29d10d0d0901cbfb7aec4f8c36e3e3818013683
evidence_paths:
  - tools/testkit/probes/reports/ising-classical.md
  - docs/sim-specs/lattice-spin/ising-classical/spec-ref.md
  - packages/ising-classical/pyproject.toml
  - packages/ising-classical/ising_classical/sim.py
  - packages/ising-classical/ising_classical/reference/ising_numpy.py
  - packages/ising-classical/tests/test_code_verification.py
  - packages/ising-classical/tests/test_determinism.py
  - packages/ising-classical/tests/test_pbt_invariants.py
  - tools/testkit/failing-tests-evidence/ising-classical-2026-05-28T21-40-00Z.txt
evidence_hashes:
  tools/testkit/probes/reports/ising-classical.md: sha256:1451f9a96deba868b4dd8e20ac1b9186f5af01131da4949d9dfce07d736dbf66
  docs/sim-specs/lattice-spin/ising-classical/spec-ref.md: sha256:4213a134c70eb8354a403129cb19d4697f1331745540ffd964e4f10b98d5f6a6
  packages/ising-classical/pyproject.toml: sha256:957d300e65509696367038d77e904444f6f43e9cb88ea2c125b7fe35c4fceb07
  packages/ising-classical/ising_classical/sim.py: sha256:a726f3bdacdc7c1aed0a95740f2ae5d7f8cfdb2e4f622ec8b116dfee61eb4b04
  packages/ising-classical/ising_classical/reference/ising_numpy.py: sha256:e314929de45d0adb9b381a0e7d78db2c1d3c66cd8ff383091696acdaba0b1ede
  packages/ising-classical/tests/test_code_verification.py: sha256:257582691ede8e54e2ba0725a6d40068a6be0b16f1f355daf3853a072b24abae
  packages/ising-classical/tests/test_determinism.py: sha256:156994b13e1121057eb53372c87847e042707db4f3b883eac71ddfea02e5a475
  packages/ising-classical/tests/test_pbt_invariants.py: sha256:362bd45b683453f6642ec59f00fb08bacb5bd3f4255b17fa1f9948fa26b75fdc
  tools/testkit/failing-tests-evidence/ising-classical-2026-05-28T21-40-00Z.txt: sha256:572c9e4e0b186c69e1dfb4dad29d10d0d0901cbfb7aec4f8c36e3e3818013683
---

# Phase 3 — sub-phase Ising-classical — Stage 1a audit

> Scaffold + impl-probe + spec-ref stub + RED tests + failing-tests
> sha256-in-footer. Verdict **CONFIRMED** — RED state witnessed
> (NotImplementedError / FileNotFoundError, no collection errors);
> Stage 1b (impl + golden + tier-3 + determinism + PBT + .h5 + 13-gate)
> is safe to dispatch.

## § 1 — RD-2D harness probe (FACT — grep-cited)

The Stack-B exemplar `packages/reaction-diffusion-2d/` ships **zero
`*.test.ts`** under `packages/`; its acceptance tests are pytest:

- `packages/reaction-diffusion-2d/tests/test_code_verification.py:32-50`
  — loads the committed canonical capture + runs the NumPy reference +
  `diff_captures`.
- `packages/reaction-diffusion-2d/tests/test_determinism.py:24-28` —
  `run_twice_and_diff(sim.sim_runner_seeded, seed=42, tmp_dir=…)`.
- `packages/reaction-diffusion-2d/src/index.ts:1-8` — the WGSL/WebGPU
  driver is **local-only** ("Phase 0 CI excludes WebGPU-device-
  requiring tests per spec section 7.8"); the NumPy reference is the
  CI-visible oracle.

**WGSL runtime story (D-DET-RUNTIME).** RD-2D introduces **no headless-
WebGPU CI runtime**; CI runs the NumPy reference, the WGSL kernel runs
locally on a GPU host. Ising-classical adopts the identical split: NO
new runtime introduced (charter R-4 + spec §7.8). Confirmed — ising
follows RD-2D verbatim; STOP-D-RUNTIME NOT fired.

## § 2 — Scaffold (FACT)

`packages/ising-classical/` (25th workspace member, registered in root
`pyproject.toml`) mirrors the RD-2D layout:

| Path | Role | Stage-1a state |
|---|---|---|
| `ising_classical/reference/ising_numpy.py` | NumPy reference (CI oracle) | shell — `IsingParams` + canonical constants real; `critical_temperature`/`onsager_magnetization`/`initial_condition`/`metropolis_sweep`/`magnetization_per_spin`/`energy_per_spin`/`evolve` raise `NotImplementedError("Stage 1b")` |
| `ising_classical/sim.py` | SimRunner adapters | `sim_runner_seeded` + `sim_runner_pbt` raise `NotImplementedError` |
| `ising_classical/__main__.py` | CLI (§3.2.6) | argparse shell |
| `src/metropolis.wgsl` + `src/index.ts` | local-only WGSL impl | `src/README.md` placeholder; land Stage 1b |
| `tests/` (6 modules + conftest) | pytest-against-captures | RED |

`docs/sim-specs/lattice-spin/ising-classical/spec-ref.md` — 13-section
stub; §6 PBT invariants FULLY DECLARED (`magnetization_bounded` +
`energy_per_spin_bounded`) per spec §2.14. `tools/testkit/probes/
reports/ising-classical.md` — impl-probe (API surfaces grep-verified;
DOIs FACT-tagged).

## § 3 — RED witness (FACT)

`uv run --no-sync python -m pytest packages/ising-classical/tests/ -v`:

```
15 failed, 2 passed in 0.58s
```

- **0 collection errors** (deferred imports for the impl-gate; reference
  module imports cleanly — shells exist).
- Failure modes: **38 `NotImplementedError`** (impl gate) + **7
  `FileNotFoundError`** (canonical capture not produced yet — allowed
  per dispatch "FileNotFoundError (no captures yet)").
- The **2 passing** are pure-constant scaffold tests
  (`test_canonical_params_lock`, `test_canonical_descriptor_matches_filename`)
  — NOT impl gates; they validate the locked descriptor + dataclass.
  (Mirror of RD-2D, where reference-sanity scaffold checks pass at
  Stage 1a.)

Evidence captured to
`tools/testkit/failing-tests-evidence/ising-classical-2026-05-28T21-40-00Z.txt`
(pre-commit-normalized form so the footer hash is byte-stable);
`sha256:572c9e4e0b186c69e1dfb4dad29d10d0d0901cbfb7aec4f8c36e3e3818013683`.
Recorded in the RED commit footer (`Failing-tests-output` +
`Failing-tests-output-hash`).

## § 4 — §0.3 SHIFT-from-discovered re-confirm (FACT)

- **D-LAYOUT** resolved-on-evidence to `packages/ising-classical/`
  (existing-convention precedence; §6.3a literal
  `lattice-spin/ising-classical/typescript/` superseded — mirrors
  lenia D-LAYOUT). NO plan edit.
- **D-CI** routes the Stage-1b `test-ising-classical` job into
  `.github/workflows/python-strict.yml` (mirror `test-lenia`), NOT
  `ts-strict.yml`/`build-ts.yml` (the latter does not exist).
- No NEW prose-math drift discovered (STOP-PROSE-MATH not fired); the
  closed-form Onsager/Yang/Kramers-Wannier anchors are §6.3a-consistent.

## § 5 — First-Stack-B-SIM friction (surfaced)

- **FRICTION #1 (RUF002 ambiguous unicode).** ruff flagged the `×`
  (U+00D7 MULTIPLICATION SIGN) in a reference docstring (RUF002);
  replaced with ASCII `x`. The other math unicode (`∈ Σ β √ ≤ ⁴ ·`) is
  NOT flagged by the repo ruff config. Banked for later Stack-B / any
  Python sim with math-heavy docstrings: keep `×`→`x` in docstrings.
- **FRICTION #2 (failing-tests evidence normalization).** The
  pre-commit `trailing-whitespace`/`end-of-file-fixer` hooks rewrite
  the captured pytest output, so the footer sha256 MUST be computed
  from the **post-hook-normalized** file (compute hash after the first
  hook pass, then re-commit). Lenia's "standard normalization mirror"
  note is the precedent; banked for every later sim's TDD footer.
- **FRICTION #3 (pytest dev extras).** `uv sync --all-packages` alone
  does not install pytest into the workspace venv; `uv sync
  --all-packages --all-extras` (or per-package `--extra dev`) is
  required ([[bit-physics-uv-sync-prunes-venv]] sibling). Inherited
  from lenia friction #5.

These are pipeline/hygiene frictions, not Stack-B-algorithm STOPs;
named per charter §1.1 load-bearing-flag. None fired a hard STOP.

## § 6 — Verdict

**CONFIRMED.** RD-2D pytest-against-captures harness adopted verbatim;
scaffold + spec-ref stub + impl-probe landed; RED witnessed (15 failed
/ 2 passed, 0 collection errors, NotImplementedError + FileNotFoundError
modes); failing-tests sha256 recorded byte-stable. Integrity unchanged
(0 HARD_FAIL / 14 SOFT_WARN; live digest `688bc195…de127ff`). **Stage
1b is safe to dispatch.**
