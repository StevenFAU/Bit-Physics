# Pre-implementation probe — common-3dgs (task-1, sub-phase 3.8)

> FIRST Phase-3 sub-phase. Introduces `common/common-3dgs/` — the
> 3D-Gaussian-Splatting common module (spec § 11.4 item 3.8; charter
> `docs/phases/sub-phase-phase-3-common-3dgs.md`). Authored at Stage 1a per the
> charter § 2 anchor-probe step + `docs/phases/phase-3-plan.md:1108-1130` (§6.1
> anchor-probe). Every concrete claim is grep-verified (Convention #8); INFERENCEs
> are tagged. `path:line` citations are full repo-relative per the cat1.intra-repo
> grammar (`tools/integrity/integrity/cat1_citations/intra_repo.py:29-36`).

## 1. Scope

Substantiates the surfaces `common/common-3dgs/` produces and consumes: the
§3.2.1 public API (`GaussianSplatModel` / `Camera` / `render`), the Inria
.ply 3DGS loader/saver, the forward EWA-splatting renderer, the smoke sim, the
vendored Inria reference at the §2.18-pinned SHA, and the shared-file + CI surfaces.
This probe is the input to the Stage-1a scaffold + RED tests and the Stage-1b
implementation; the implementer reads this rather than re-deriving from memory.

**(FACT) Determinism class (D-C default).** Default-declared `class = "bit-exact",
scope = "same-stack-same-hw"` in the determinism registry (Stage-1a draft);
MEASURED at Stage 1b. Warp f64/f32 is bit-faithful to NumPy when op-order is
preserved; the renderer uses a per-pixel front-to-back gather over a
depth-sorted Gaussian list (no atomics, no scatter) → determinism by construction.

## 2. API surfaces consumed (grep-verified)

### 2.1 `common_warp` (Stack-E socket; `common/common-warp/src/common_warp/__init__.py:11-39`)
common-3dgs is a Stack-E (Warp-backed) common module, sister to `common-warp`. It
consumes the established §1.9.1 socket:
- `common_warp.init(device, deterministic=...)` / `common_warp.set_seed(seed)` —
  runtime + determinism (`common/common-warp/src/common_warp/__init__.py:21`).
- `common_warp.Capture` / `common_warp.write_capture` — Layer-0 HDF5 capture
  (`common/common-warp/src/common_warp/__init__.py:11`); the smoke sim writes a
  capture whose payload is the rendered RGB image, feeding the schema-corpus fixture.
- `common_warp.capture.model.state_key` / `diagnostics_key` — payload-key helpers
  (`common/common-warp/src/common_warp/capture/model.py:1-7`), used by the hello
  smoke sim at `common/common-warp/examples/hello/sim.py:56`.

### 2.2 `warp` (Stack-E DSL; pinned `warp-lang>=1.13,<2.0`)
Warp 1.13.0 (verified importable at probe time: `warp 1.13.0`). `wp.array` storage
for model fields; `@wp.kernel` for the rasterizer; CPU backend runs `wp.launch`
serially over the launch dimension → bit-identical run-to-run (the determinism
basis documented at `common/common-warp/examples/hello/sim.py:23-29`).

### 2.3 `capture` (testkit, transitively via common_warp)
The common_warp writer wraps `capture.write_capture`
(`common/common-warp/src/common_warp/capture/writer.py:24`); the writer sets
`track_times=False` / `libver="earliest"` so HDF5 metadata variance is suppressed
at the source (determinism policy `tools/testkit/determinism/policy.md`).

### 2.4 `matplotlib` (PNG writer — D-D resolution)
The neural-rendered category stores a rendered RGB image (`docs/phases/phase-3-plan.md:416`).
No existing common-* module exposes an `(H,W,3)`-RGB-array→PNG writer: common-py's
`plot_field_2d` (`common/common-py/src/common_py/plotting.py:79`) is a colormapped
single-channel field `imshow`, semantically wrong for an RGB render. **D-D resolved:
common-3dgs provides its own `save_png()` writer** (matplotlib `imsave`-backed),
matplotlib being the established image-writing dependency in the repo
(`common/common-py/pyproject.toml` `[project.optional-dependencies].plotting`).

## 3. Upstream citations

### 3.1 Inria gaussian-splatting (vendored — `references/3DGS-reference/`)
- Pinned SHA `54c035f7834b564019656c3e3fcc3646292f727d` (§2.18
  `docs/phases/phase-3-plan.md:261`; web-fetched + verified at Stage 0,
  `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-0-2026-05-28T00-59-06Z.md:157`).
  Re-verified live at this probe: `git ls-remote https://github.com/graphdeco-inria/gaussian-splatting HEAD`
  → `54c035f7834b564019656c3e3fcc3646292f727d` (no drift).
- License: **NOASSERTION / "Other" — the Gaussian-Splatting NON-COMMERCIAL research
  license** (§2.18 `docs/phases/phase-3-plan.md:263-269`). FIRST non-permissive
  upstream in the repo. Vendored into `references/` as research material cited for
  independent derivation (spec § 2.4 / § 2.8); NOT a redistributed binary or a
  relicensed component. The non-commercial clause is inherited by task-8 + Phase-4 WU-C.
- .ply 3DGS format reference: Inria `scene/gaussian_model.py` (`load_ply` /
  `save_ply` / `construct_list_of_attributes` — the attribute layout: `x y z`,
  `nx ny nz`, `f_dc_0..2`, `f_rest_0..N`, `opacity`, `scale_0..2`, `rot_0..3`).
  Vendored under `references/3DGS-reference/` at Stage 1b for by-name citation;
  the common-3dgs parser is derived independently (spec § 2.4 symmetric-bug guard).
- Camera convention reference: Inria `utils/graphics_utils.py` (`getWorld2View2`,
  `getProjectionMatrix`) — world→view + view→clip construction; right-handed,
  column-vector convention. Cited at Stage 1b in `docs/common/3dgs.md`.

### 3.2 PhysGaussian (cite-only; NOT vendored by task-1)
SHA `8339ed6aa2cd5d50e1001a254a3d95aea678a956`; NO LICENSE (§2.18
`docs/phases/phase-3-plan.md:276-280`). Cited for the .ply-format appendix / the
task-8 consumption pattern only; task-8's sub-phase resolves its license posture.

## 4. Vendoring pattern (DISCOVERED — SHIFTED from the plan's `manifest.yaml`)

The discovered vendoring discipline (`docs/testkit/references.md`) uses
`references/<Name>/MANIFEST.toml` validated against
`tools/testkit/schemas/reference-manifest-v1.json` — NOT `manifest.yaml` as the
charter § 1.1 item 3 / §6.1 deliverable C phrase it. The existing exemplar is
`references/SPlisHSPlasH/MANIFEST.toml` (`[upstream]` / `[scope]` / `[vendoring]`
tables; `LICENSE` + `UPSTREAM_README.md` + sparse-checkout source subset). **§0.3
governs: follow the discovered `MANIFEST.toml` pattern; documented SHIFTED.** Vendoring
mechanism = sparse-checkout per `docs/testkit/references.md` (`git clone --no-checkout
--filter=blob:none … && git sparse-checkout set … && git checkout <SHA>`); read-only
per architecture.md Appendix D § D.8.

## 5. Public types / functions exported (the Cat-2 contract surface)

The package `common/common-3dgs/src/common_3dgs/__init__.py` `__all__` exports
(verified by cat2.python-exports `tools/integrity/integrity/cat2_contracts/python_module_exports.py:26`):

- `GaussianSplatModel` — data abstraction. Fields (§3.2.1
  `docs/phases/phase-3-plan.md:346-353`): `positions (N,3) f32`, `scales (N,3) f32`,
  `rotations (N,4) f32` (wxyz), `opacities (N,) f32` in [0,1],
  `sh_coefficients (N,K,3) f32` (K per SH degree; degree 3 → K=16). Warp-array-backed
  with NumPy accessors. classmethod `load_ply(path) -> GaussianSplatModel`; instance
  `save_ply(path) -> None`.
- `Camera` — view + projection matrices, near/far, image dims; construction helper
  from look-at + intrinsics (§3.2.1 `docs/phases/phase-3-plan.md:361`).
- `render(model, camera, *, image_height=None, image_width=None, background=(0,0,0))
  -> (H,W,3) float32 in [0,1]` (§3.2.1 `docs/phases/phase-3-plan.md:359`). Deterministic;
  empty-model branch returns a background-filled image.
- `save_png(image, path) -> Path` — the D-D RGB-image PNG writer.

## 6. Test-fixture paths (declared; resolvable post-implementation)

- Smoke-contract + PBT tests: `common/common-3dgs/tests/` (one test per §3.2.1 public
  symbol; ≥2 PBT invariants per `docs/phases/phase-3-plan.md:1044`).
- RED failing-tests evidence: `tools/testkit/failing-tests-evidence/common-3dgs-<UTC>.txt`
  (`docs/phases/phase-3-plan.md:1036`); sha256 in the test commit footer.
- Smoke sim: `common/common-3dgs/examples/smoke_3dgs/sim.py` (DISCOVERED smoke-sim
  pattern = common-warp's `examples/<name>/sim.py`, `common/common-warp/examples/hello/sim.py`;
  common-py's alternative is `smoke/`, `common/common-py/smoke/advection_1d.py` — Stack-E
  module → common-warp `examples/` analog chosen; §0.3 follow-discovered).
- Schema-corpus seed: `tests/fixtures/legacy-captures/phase-3-common-3dgs.h5` + `.json`
  sidecar (`docs/phases/phase-3-plan.md:1047`; sidecar shape per the existing corpus,
  e.g. `tests/fixtures/legacy-captures/lattice-boltzmann-d3q19-ref.json`).
- Mutation baseline: `tools/testkit/mutation/phase-3-common-3dgs-<UTC>.json` (Stage 1c;
  ≥80% per `docs/phases/phase-3-plan.md:1053`).

## 7. Determinism registry (NEW surface — §3.2.5)

`tools/testkit/determinism/registry.toml` does NOT yet exist (grep-verified absent at
probe time). §3.2.5 (`docs/phases/phase-3-plan.md:461-505`) designs it as a new Phase-3
surface; prior sims declare determinism in their capture manifests
(`tools/testkit/determinism/policy.md`) + the `determinism` sidecar block
(`tests/fixtures/legacy-captures/lattice-boltzmann-d3q19-ref.json`). Stage 1a CREATES
the registry with the first row `[neural-rendered.common-3dgs]` (D-C default); each
later Phase-3 task appends. **§0.3: the registry is a new surface, not a replacement of
the per-manifest declaration; documented as a probe finding.**

## 8. Shared-file + CI surfaces (DISCOVERED — two SHIFTED filenames)

- CI: the discovered Python-CI workflow is `.github/workflows/python-strict.yml` — there
  is NO `build-py.yml` (charter §6.1 deliverable H / §3.2.10). §0.3: add the
  `test-common-3dgs` job to `python-strict.yml` (pytest direct, no `just`). Documented SHIFTED.
- CHANGELOG: the discovered pattern is `### sub-phase-<name>` under `## [Unreleased]`
  (`CHANGELOG.md` `### sub-phase-closed-form` etc.) — NOT a `## Phase 3` header. §0.3:
  add `### sub-phase-phase-3-common-3dgs` under `## [Unreleased]`. Documented SHIFTED.
- README: the root `README.md` has NO common-modules listing. Common modules are
  enumerated in `docs/dependencies.md` (e.g. `bit-physics-common-warp` at
  `docs/dependencies.md:572`). Stage 1b appends a common-3dgs dependencies.md entry +
  a brief README pointer. Documented SHIFTED.
- justfile: `just run-3dgs-smoke` + `just test-3dgs` to be added (`justfile` currently
  has no per-common-module smoke/test recipe; `common/common-warp/examples/hello/sim.py`
  ships no justfile recipe). Added at Stage 1b following the `uv run` recipe style
  (`justfile:17-23`).
- glossary: add 3DGS / Spherical Harmonics / .ply-3DGS-format to `docs/glossary.md`
  (mirrors architecture.md Appendix C; the new terms append alphabetically).
