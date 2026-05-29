# PositionBasedDynamics / Bender (vendored)

Subset of [InteractiveComputerGraphics/PositionBasedDynamics](https://github.com/InteractiveComputerGraphics/PositionBasedDynamics)
at the latest stable release tag `2.2.0` (SHA `aa62c44f0d43956452e1f960a40333ec2d6d3ea5`,
published 2022-12-13), vendored via sparse-checkout per the discipline in
[`docs/testkit/references.md`](../../docs/testkit/references.md).

Phase 3 task-5 (`mass-spring-cloth`) vendors this upstream as a **read-only
cross-check oracle** (spec § 2.3 + § 2.4) for the XPBD cloth-constraint
formulation (Macklin, Müller, Chentanez 2016). `packages/mass-spring-cloth/`
reimplements XPBD **independently** in its own Vulkan compute shaders + C++20
from the Macklin 2016 paper per Convention #8; Bender is the citation anchor +
manual derivation-time cross-check, **NOT** a build dependency, **NOT**
runtime-linked, **NOT** `FetchContent`'d (charter D-VENDOR-ROLE). The golden
catenary table's independent-reference anchors are the analytic catenary form +
hand-derivation + a textbook value (spec § 2.4) — Bender is **not** a golden
source.

The pinned SHA is the **latest stable release** per spec Appendix D.3 ("Latest
stable", verified via `gh release view`), which differs from the Phase-3
external-SHA registry (`docs/phases/phase-3-plan.md` § 2.18) entry
`d0894bdb…` (master HEAD); see the task-5 landing audit for the documented
SHIFT (the operator decides whether to re-point § 2.18).

## Contents

| File | Origin |
|---|---|
| `LICENSE` | upstream root `LICENSE` (MIT, © 2015-present PositionBasedDynamics contributors) |
| `UPSTREAM_README.md` | upstream root `README.md` (renamed to avoid colliding with this file) |
| `PositionBasedDynamics/XPBD.h` | upstream — declares `solve_DistanceConstraint`, `solve_IsometricBendingConstraint` (XPBD compliant constraints) |
| `PositionBasedDynamics/XPBD.cpp` | upstream — XPBD compliance↔stiffness mapping + Lagrange-multiplier update (Macklin 2016 Eqs. 8, 18) |
| `PositionBasedDynamics/PositionBasedDynamics.h` | upstream — declares `solve_DistanceConstraint`, `solve_DihedralConstraint` (classic PBD constraints) |
| `PositionBasedDynamics/PositionBasedDynamics.cpp` | upstream — PBD distance + dihedral bending constraint bodies |
| `MANIFEST.toml` | this repo (schema: `tools/testkit/schemas/reference-manifest-v1.json`; ships optional `[[citations]]` per the Chakazul-Lenia precedent) |

## Read-only

Per `docs/architecture.md` Appendix D § D.8, vendored sources are read-only.
Modifications HALT. Bug fixes flow upstream; the vendoring is updated when
upstream releases a fix.

## Why sparse-checkout

The full upstream tree (with `extern/`, demos, data) is hundreds of MB. task-5
cites only the constraint formulations in `PositionBasedDynamics/`, so
sparse-checkout keeps the vendored footprint to a few tens of KB.
