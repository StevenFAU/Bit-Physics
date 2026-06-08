# binary-release — Phase 5 sub-phase 5.2 tooling

Build-and-validate native **Stack-C (C++ / Vulkan)** capture binaries and re-verify
correctness through the spec § 3.8 bootstrap gate. **No publish** — the `deploy` job
in `.github/workflows/binary-release.yml` is gated off (§ 4.3 / § 4.5).

## Layout

```
binary-release/
├── pipeline.py            # discover → build → bootstrap-validate (§ 5.5 shape)
├── lint.py                # CMakeLists linter (§ 6.2 qualifying criteria)
├── cmake/cpack-hooks.cmake# CPack component + AppImage hooks (go-live; deploy gated off)
├── sign/                  # no-op signing stubs (unsigned; § 4.3)
└── smoke/                 # fast contract tests + per_os/ launch harnesses
```

The top-level `cmake/Packaging.cmake` is the one packaging file landed outside this
tree (CMake include-path convention; phase plan § 6.2).

## Qualifying pool (§ 6.2; MEASURED — reconciliation §C)

Exactly **two** Stack-C packages carry a CMake build with a headless `*_capture`
target. The four Python-only `binary:true` canonical sims (sph-water, eulerian-smoke,
lattice-boltzmann-d3q19, reaction-diffusion-3d) have NO CMakeLists → they ship via
sub-phase 5.3 (pypi), correctly NOT here.

| Package | Bootstrap gate (R1/R3) |
|---|---|
| `reaction-diffusion-2d-stack-c` | **capture_roundtrip** — re-emit from the binary, `compare_captures(canonical, reemit)` at the `reaction-diffusion` tolerance (deterministic f64 → bit-exact 0.0/0.0). |
| `mass-spring-cloth` | **witness_pbt_surrogate** — in-binary 2-run determinism witness + Hypothesis PBT re-check (no NumPy oracle / no `compare_captures` soft-body op; never a fabricated tolerance row). |

## Usage

```sh
# discovery (CMake-capture pool; own-§13 opt-out)
uv run python tools/productization/binary-release/pipeline.py discover --json

# build + bootstrap-validate a single package (matrix job), driven from the testkit
# workspace so the equivalence/property imports resolve:
cd tools/testkit
uv run python ../../tools/productization/binary-release/pipeline.py validate \
  --artifacts /tmp/binrel --sim reaction-diffusion-2d-stack-c --json
```

## Build environment (§0.3 SHIFTs from the plan's Appendix-C recipe)

- **No Docker** in the build environment → a clean out-of-tree CMake build dir is
  the isolation boundary (analogous to 5.3's fresh-venv). Perf-ledger env label
  `binary-cmake-<os>` (the plan's `binary-docker-<os>`, de-Docker'd).
- **cmake ≥ 4.0** dropped pre-3.5 policy compat the vendored doctest declares →
  `pipeline.py` passes `-DCMAKE_POLICY_VERSION_MINIMUM=3.5` (a no-op cache var on
  CI's older apt cmake, which builds `cpp-strict` green today).
- The bootstrap round-trip is **programmatic** `compare_captures(json, json)`
  (R1) — the plan's `python -m testkit.equivalence` CLI is falsified.
- OS scope: lavapipe-pinned, **ubuntu-only** (mirrors `cpp-strict.yml`); Windows +
  macOS are DEFERRED-to-Phase-6.
