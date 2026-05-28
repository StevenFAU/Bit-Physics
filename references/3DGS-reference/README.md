# gaussian-splatting (vendored)

Subset of [graphdeco-inria/gaussian-splatting](https://github.com/graphdeco-inria/gaussian-splatting)
at SHA `54c035f7834b564019656c3e3fcc3646292f727d` (main HEAD, 2024-10-30; the repo
has no release tags), vendored via sparse-checkout per the discipline in
[`docs/testkit/references.md`](../../docs/testkit/references.md) and pinned in
[`docs/phases/phase-3-plan.md`](../../docs/phases/phase-3-plan.md) § 2.18.

Phase-3 task-1 (`common/common-3dgs/`) vendors this upstream to anchor the Inria
3D-Gaussian-Splatting **.ply scene format** and the **camera / spherical-harmonic /
forward-render conventions** (Kerbl et al. 2023). The vendored source is the
**citation anchor and test target**, NOT a redistributed dependency: the
common-3dgs loader/saver, `Camera`, and forward EWA-splatting renderer are derived
independently from these references plus the published method (spec § 2.4
symmetric-bug guard).

## ⚠ License — NON-COMMERCIAL

See [`LICENSE.md`](LICENSE.md). This is the **Gaussian-Splatting research license**
(GitHub classifies it `NOASSERTION` / "Other") — **NON-COMMERCIAL**. It is the
first non-permissive upstream in the repo. Vendoring into `references/` is
acceptable because the directory holds research material cited for independent
derivation (spec § 2.4 / § 2.8), not a relicensed or redistributed Bit-Physics
component. **The non-commercial clause is load-bearing: NO commercial use, NO
relicensing.** Every downstream 3DGS sub-phase (task-8 3dgs-mpm, Phase-4 WU-C)
inherits this constraint.

## Contents

| File | Origin | Cited for |
|---|---|---|
| `LICENSE.md` | upstream root `LICENSE.md` | the NON-COMMERCIAL research license |
| `UPSTREAM_README.md` | upstream root `README.md` (renamed) | upstream overview |
| `scene/gaussian_model.py` | upstream `scene/gaussian_model.py` | `.ply` attribute layout (`construct_list_of_attributes`, `save_ply`, `load_ply`) |
| `scene/cameras.py` | upstream `scene/cameras.py` | camera model |
| `utils/graphics_utils.py` | upstream `utils/graphics_utils.py` | `getWorld2View2` / `getProjectionMatrix` view+projection conventions |
| `utils/sh_utils.py` | upstream `utils/sh_utils.py` | spherical-harmonic → RGB evaluation (`eval_sh`, `C0`/`C1`) |
| `gaussian_renderer/__init__.py` | upstream `gaussian_renderer/__init__.py` | forward-render call structure |
| `MANIFEST.toml` | this repo (schema: `tools/testkit/schemas/reference-manifest-v1.json`) | — |

## Read-only

Per [`docs/architecture.md`](../../docs/architecture.md) Appendix D § D.8, vendored
sources are **read-only**. Modifications HALT. Bug fixes flow upstream; the
vendoring is updated when upstream releases a fix.

## Why sparse-checkout

The full upstream tree (with assets) is large; the portfolio cites only the
algorithmic Python references above, so sparse-checkout keeps the vendored
footprint small (~116 KB).
