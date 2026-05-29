# mass-spring-cloth (Stack C — Vulkan / C++20)

Phase 3 task-5 reference sim. **First NEW Stack-C sim of Phase 3** and the
**first `soft-body` category** sim. A mass-spring cloth solved with **XPBD**
(Macklin, Müller, Chentanez 2016) reimplemented from scratch in a Vulkan compute
shader + C++20.

## Model

Classic Provot (1995) mass-spring cloth: an `nx × ny` grid of particles connected
by three families of springs, all expressed as **XPBD distance constraints** with
per-class compliance:

- **structural** — 4-neighbour edges (the woven warp/weft),
- **shear** — diagonal edges (resist in-plane shear),
- **bending / flexion** — 2-apart edges (resist out-of-plane folding).

Time integration: substepped semi-implicit Euler + per-substep **serial
Gauss-Seidel** constraint projection (Macklin 2016 §3). The projection runs in a
**single Vulkan invocation** (`local_size 1`, one workgroup) over a fixed
constraint order — no atomic scatter, no subgroup ops, f64, `precise`
(NoContraction) — so it is **bit-identical run-to-run** on the lavapipe CPU
backend (charter D-DET; MEASURED at Stage 1b).

## Vendored oracle (read-only)

`references/PositionBasedDynamics/` (Bender PBD 2.2.0, MIT) is a **read-only
cross-check oracle** for the XPBD constraint algebra (charter D-VENDOR-ROLE). It
is **not** a build dependency, **not** runtime-linked. The golden catenary table's
independent anchors are the analytic catenary + a hand-derivation + a textbook
value — Bender is not a golden source (spec § 2.4).

## Build / test (lavapipe-pinned)

```bash
cmake -S . -B build/cpp                 # from the repo root
cmake --build build/cpp -j
VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.json LP_NUM_THREADS=0 \
  ctest --test-dir build/cpp -R mass_spring_cloth --output-on-failure
```

(The ctests set the lavapipe env themselves via CTest `ENVIRONMENT` properties.)

## Layout

| Path | Contents |
|---|---|
| `include/bit_physics/mass_spring_cloth/cloth.hpp` | public API (`ClothConfig`, `ClothResult`, `run_cloth`, constraint builders) |
| `src/cloth.cpp` | serial-GS XPBD host driver (consumes the common-cpp Vulkan substrate) |
| `shaders/cloth_xpbd.comp` | the serial-GS XPBD compute shader |
| `tests/` | doctest acceptance suite (gate-3) + golden-table tests (gate-4) |

No gate-14 (single-stack terminal sim — no cross-stack equivalence pair).
