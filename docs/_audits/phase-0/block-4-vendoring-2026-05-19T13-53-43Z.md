---
date: 2026-05-19T13-53-43Z
author: phase-0-block-4-agent
phase: 0
artifact: block
artifact_id: block-4-vendoring
verdict: CONFIRMED
evidence_paths:
  - references/SPlisHSPlasH/MANIFEST.toml
  - references/SPlisHSPlasH/LICENSE
  - references/SPlisHSPlasH/README.md
  - references/SPlisHSPlasH/UPSTREAM_README.md
  - references/SPlisHSPlasH/SPlisHSPlasH/SPHKernels.h
  - references/SPlisHSPlasH/SPlisHSPlasH/SPHKernels.cpp
  - tools/testkit/golden/__init__.py
  - tools/testkit/golden/verifier.py
  - tools/testkit/golden/derivations/cubic-spline-kernel.md
  - tools/testkit/golden/generator/__init__.py
  - tools/testkit/golden/generator/cubic_spline.py
  - tools/testkit/golden/reference_implementations/__init__.py
  - tools/testkit/golden/reference_implementations/cubic_spline.py
  - tools/testkit/golden/tables/cubic-spline-kernel.json
  - tools/testkit/golden/tests/__init__.py
  - tools/testkit/golden/tests/test_generator.py
  - tools/testkit/golden/tests/test_reference_implementation.py
  - tools/testkit/golden/tests/test_verifier.py
  - tools/testkit/pyproject.toml
  - docs/testkit/golden-values.md
  - docs/testkit/overview.md
head_sha: 52f66e8905904156b60935a3aa2bd9b904d3bf92
deferred_items:
  - { item: "Exercise CubicKernel from references/SPlisHSPlasH/SPlisHSPlasH/SPHKernels.h at runtime against the golden table", target_phase: 1,
      rationale: "Phase 0 ships the golden-value pipeline without a C++ toolchain; the vendored source is the test target for Cat 3 against a real SPH sim, which lands in Phase 1+ per spec § 11.2." }
  - { item: "Vendor additional kernel families (Wendland, quintic spline) as the portfolio adds sims that use them", target_phase: 1,
      rationale: "Phase 0 Block 4 only ships the cubic-spline kernel; later sims drive additional golden tables." }
ci_activation: []
top_level_deps_to_merge: []
---

# Block 4 — VENDORING close report

> SPlisHSPlasH vendored at SHA `6bff55a6eaf14083d34650f22a268ce156b62b54` (release `2.16.1`, published 2026-05-12). The cubic-spline golden-value pipeline (derivation, table, generator, reference implementation, verifier, tests, docs) is in place and tied to that SHA. Full testkit suite 44/44 green; ruff and mypy --strict clean.

## 1. What was built

FACT — SPlisHSPlasH vendored via sparse-checkout at
`references/SPlisHSPlasH/` (~56 KB on disk):

- `LICENSE` — upstream MIT license, © 2016 Jan Bender.
- `UPSTREAM_README.md` — upstream `README.md` (renamed; the vendored
  dir has its own `README.md` describing the vendoring discipline).
- `README.md` — local vendoring overview + verification snippet.
- `MANIFEST.toml` — schema-validated by
  `bit_physics_testkit.capture.load_reference_manifest`. Records the
  upstream URL, name, version `2.16.1`, SHA
  `6bff55a6eaf14083d34650f22a268ce156b62b54`, license, scope (used by
  `cat1.upstream-citation` and `cat3.cubic-kernel`), and the
  `fetch_command` reproduction string.
- `SPlisHSPlasH/SPHKernels.h` — 959 lines, includes the `CubicKernel`
  class at lines 16–95 (test target).
- `SPlisHSPlasH/SPHKernels.cpp` — 69 lines, static-member init.

FACT — cubic-spline golden-value pipeline at `tools/testkit/golden/`:

- `derivations/cubic-spline-kernel.md` — Monaghan 1992/2005 form,
  $q \in [0, 2]$, $\sigma_3 = 1/\pi$. Includes integration derivation
  of the 3D normalization, gradient-magnitude formula, anchor
  derivations, and the relationship to SPlisHSPlasH's support-radius
  parameterization.
- `tables/cubic-spline-kernel.json` — schema-validated against
  `tools/testkit/schemas/golden-v1.json`. Nine test points
  $q \in \{0, 0.25, ..., 2.0\}$ at $h=1$. Three
  `independent_reference` anchors (q=0, q=1, q=2) with DOIs.
- `generator/cubic_spline.py` — SymPy regenerator, idempotent
  (2-space indent, sorted keys, deterministic byte output). Re-verifies
  each committed anchor against the symbolic value at gen time to
  within $10^{-10}$ absolute; raises `RuntimeError` on disagreement.
- `reference_implementations/cubic_spline.py` — sole Python
  implementation. NumPy-based; signature
  `evaluate(inputs: dict) -> dict`. Block 5 INTEGRITY imports from
  here.
- `verifier.py` — implements
  `verify_against_table(table_path, evaluator) -> GoldenVerifierResult`
  per Phase 0 plan § 3.3.4 exactly. Per-point absolute + relative
  tolerance check; raises `KeyError` if the evaluator omits an
  expected output key.
- `tests/test_generator.py` — schema validity, byte-for-byte
  idempotency, anchor count ≥ 3, peak and compact-support anchor
  values.
- `tests/test_verifier.py` — reference impl passes (9/9), a
  deliberately-wrong evaluator (piecewise threshold at q=1.5) fails,
  fake-table API contract, `KeyError` on missing output key.
- `tests/test_reference_implementation.py` — peak, boundary, support,
  scaling-as-$h^{-3}$ and $h^{-4}$, input-validation errors.

FACT — supporting plumbing:

- `tools/testkit/pyproject.toml` — `golden` added to
  `tool.hatch.build.targets.wheel.packages`, `tool.mypy.files`, and
  `tool.pytest.ini_options.testpaths`. No new top-level dependencies
  (`sympy>=1.13` was already declared in Block 3).
- `docs/testkit/golden-values.md` — pipeline documentation +
  step-by-step recipe for authoring a new golden algorithm.
- `docs/testkit/overview.md` — `golden-values.md` index entry
  updated from "(pending)" to a live link.

## 2. Design decisions made

INFERENCE — **Plan-§-7.4 paraphrase of $W(0, h{=}1)$ corrected.** The
plan paraphrases the q=0 anchor as "$W(0, h{=}1) = 8/\pi$." That value
belongs to the support-radius parameterization SPlisHSPlasH uses
(`m_k = 8/(\pi h^3)`, $q \in [0, 1]$, support at $q = 1$), where the
parameter labelled $h$ is the **support radius**, not the smoothing
length. The plan's other anchor constraints — test points up to $q=2$,
$W(q{=}2) \equiv 0$, piecewise boundary at $q=1$ — pin the *Monaghan
classical convention* with $q \in [0, 2]$. For that convention the
unit-integral constraint $\int_{\mathbb R^3} W = 1$ admits only
$\sigma_3 = 1/\pi$, giving $W(0, h{=}1) = 1/\pi \approx 0.318$.
$8/\pi$ would *over-normalize* the kernel by a factor of 8 in real
space; the two values are related by the variable change
$h_\text{Monaghan} = h_\text{support}/2$, which leaves the kernel
function unchanged. The derivation doc § 4 and the q=0 anchor in the
table commit to $1/\pi$; the divergence from the plan paraphrase is
explicitly logged in the derivation doc as an INFERENCE.

INFERENCE — **Independent-reference anchor placement.** The plan
recommends q=0 (peak), q=1 (piecewise boundary), q=2 (compact
support), and optionally q=0.5 (Liu & Liu 2003 cross-reference). The
table ships the three required anchors; q=0.5 is omitted because
Liu & Liu Appendix B was not consulted at vendor time (Convention #8 —
no assertion from memory). A future Phase 1+ pass may add it.

INFERENCE — **Sparse-checkout scope minimized.** The plan says "at
minimum the SPH kernel implementation files." Only `SPHKernels.h` and
`SPHKernels.cpp` are vendored from `SPlisHSPlasH/`; other files in
that directory (`FluidModel.h/cpp`, `NeighborhoodSearch.h`, the DFSPH
subtree, etc.) are not cited by the Phase 0 golden table and would
bloat the vendored footprint from ~56 KB to ~2.6 MB. A future block or
phase that needs additional upstream files appends to the
sparse-checkout set and updates the MANIFEST.

INFERENCE — **Vendored upstream's `README.md` renamed to
`UPSTREAM_README.md`.** The vendored directory carries our own
`README.md` describing the vendoring (so a developer browsing
`references/SPlisHSPlasH/` sees our docs first). The upstream's
README is preserved verbatim as `UPSTREAM_README.md`. The MANIFEST
doesn't reference either README path; the renaming has no functional
impact.

INFERENCE — **Tolerance set at `1e-12` absolute + relative.** The
plan does not pin a tolerance for the cubic-spline table. The values
in the table are float64 round-trips of high-precision SymPy
evaluations (30 significant digits then cast to `float`); `1e-12` is
about four orders of magnitude looser than float64 unit-in-the-last-
place precision near 0.3, giving comfortable headroom for evaluators
that compute via slightly different intermediate paths.

INFERENCE — **ASCII-only citations in `generator/cubic_spline.py`.**
Ruff's RUF001/RUF002 lint flags the en-dash (–) and the Greek small
letter sigma (σ) inside Python string literals and docstrings as
confusable. Citations were converted to ASCII hyphens for the
page-range separator, and σ_3 in docstrings was spelled "sigma_3".
The mathematical content is unchanged; the markdown derivation doc
(`derivations/cubic-spline-kernel.md`) retains full typography
because ruff does not lint `.md`.

## 3. Open items

- Block 5 INTEGRITY will:
  - Construct a Cat 3 (numerical-truth) check that imports
    `bit_physics_testkit.golden.reference_implementations.cubic_spline.evaluate`
    and calls `verify_against_table` against
    `tools/testkit/golden/tables/cubic-spline-kernel.json`.
  - Construct a Cat 1 (citations) check that grep-verifies the
    `derivation.upstream_path` in the table actually exists under
    `references/SPlisHSPlasH/` and that the manifest SHA matches the
    table's `derivation.upstream_sha`.
  - Per Phase 0 plan § 3.3.4 invariant: verify exactly one Python
    implementation of the cubic-spline kernel exists in the repo
    (a grep for `def evaluate` matching the kernel signature outside
    `tools/testkit/golden/reference_implementations/cubic_spline.py`
    must return zero hits).
- Block 8 RD-2D and any future SPH sim will be the first runtime
  consumer of the SPH kernel; until then, the vendored `SPHKernels.h`
  is not executed.
- See `deferred_items` in the front-matter for the C++ runtime
  exercise and additional kernel families.

## 4. Conventions honored

- **Convention #8** — SHA `6bff55a6eaf14083d34650f22a268ce156b62b54`
  obtained via `git ls-remote --tags` and cross-checked against the
  upstream Releases page via `WebFetch`. Not asserted from memory.
- **Convention #12** — the vendored SHA is committed verbatim in the
  same commit as the vendoring; no back-fill required.
- **Convention M** — re-anchored on `docs/phases/phase-0-plan.md`
  § 7.4 and § 3.3.4, the spec § 2.4 + § 2.8, and the live
  `tools/testkit/schemas/golden-v1.json` + `reference-manifest-v1.json`
  before authoring each artifact.
- **Convention A** — Block 1 wrote
  `docs/testkit/overview.md`; the one-line edit (turning the pending
  link live) is small and additive. The two Block 4 commits are
  feat(testkit) for the deliverable + docs(phase-0) for the audit
  trail, per the Block 2 / Block 3 pattern.
- **Conventional Commits** — both commits use
  `feat(testkit):` and `docs(phase-0):` prefixes.
- **FACT / INFERENCE tagging** — every concrete claim above is
  tagged.
- **Hard Rule 2** — surfaced once: the plan's paraphrased
  $W(0, h{=}1) = 8/\pi$ disagrees with the integration-fixed
  $\sigma_3 = 1/\pi$. Per the spec's mathematical content rather
  than the plan's paraphrase, $W(0, h{=}1) = 1/\pi$ is committed.
  The divergence is documented in the derivation doc § 4 and called
  out as INFERENCE above.

## 5. Self-verification (run before commit)

- `pytest -W error tools/testkit/` → 44 passed, 0 failed.
- `ruff check tools/testkit/` → All checks passed.
- `mypy --strict tools/testkit/` → no issues found in 50 source files.
- `python -m golden.generator.cubic_spline` is idempotent (committed
  table re-emits byte-for-byte).
- `load_reference_manifest(references/SPlisHSPlasH/MANIFEST.toml)`
  validates and returns `sha = 6bff55a6eaf14083d34650f22a268ce156b62b54`.

## 6. Critical sanity check (per plan § 7.4)

Hand-evaluation at the three anchor points (3D, $h = 1$,
$\sigma_3 = 1/\pi$):

- q=0: $W = 1/\pi = 0.3183098861837907$. Match ✓.
- q=1: $W = \sigma_3 \cdot (1 - 3/2 + 3/4) = (1/\pi) \cdot (1/4) = 0.07957747154594767$.
  $|\nabla W| = \sigma_3 \cdot |-3 + 9/4| = (1/\pi) \cdot (3/4) = 0.238732414637843$. Match ✓.
- q=2: $W = \sigma_3 \cdot (1/4) \cdot 0^3 = 0$. $|\nabla W| = 0$. Match ✓.
