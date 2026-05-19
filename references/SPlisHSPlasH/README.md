# SPlisHSPlasH (vendored)

Subset of [InteractiveComputerGraphics/SPlisHSPlasH](https://github.com/InteractiveComputerGraphics/SPlisHSPlasH)
at tag `2.16.1` (SHA `6bff55a6eaf14083d34650f22a268ce156b62b54`), vendored via
sparse-checkout per the discipline in
[`docs/testkit/references.md`](../../docs/testkit/references.md).

Phase 0 Block 4 vendors this upstream to anchor the cubic-spline SPH-kernel
golden-value table (spec § 2.4). The vendored source is the **test target**,
not the source of truth: the Python reference implementation at
`tools/testkit/golden/reference_implementations/cubic_spline.py` is derived
independently from Monaghan 1992/2005, and the golden table carries
independent-reference anchors so that a typo in either the upstream or the
derivation is caught by the other.

## Contents

| File | Origin |
|---|---|
| `LICENSE` | upstream root `LICENSE` (MIT, © 2016 Jan Bender) |
| `UPSTREAM_README.md` | upstream root `README.md` (renamed to avoid colliding with this file) |
| `SPlisHSPlasH/SPHKernels.h` | upstream `SPlisHSPlasH/SPHKernels.h` — declares `CubicKernel` and other SPH kernels |
| `SPlisHSPlasH/SPHKernels.cpp` | upstream `SPlisHSPlasH/SPHKernels.cpp` — static-member initialization for kernel cache |
| `MANIFEST.toml` | this repo (schema: `tools/testkit/schemas/reference-manifest-v1.json`) |

## Verifying the vendoring

```bash
python -c "from pathlib import Path; \
import sys; sys.path.insert(0, 'tools/testkit'); \
from capture.manifest import load_reference_manifest; \
m = load_reference_manifest(Path('references/SPlisHSPlasH/MANIFEST.toml')); \
print(m['upstream']['sha'])"
# expected: 6bff55a6eaf14083d34650f22a268ce156b62b54
```

## Read-only

Per `docs/architecture.md` Appendix D § D.8, vendored sources are read-only.
Modifications HALT. Bug fixes flow upstream; the vendoring is updated when
upstream releases a fix.

## Why sparse-checkout

The full upstream tree is ~250 MB. The Phase 0 portfolio cites only
`SPlisHSPlasH/SPHKernels.h` (and its `.cpp` companion for completeness),
so sparse-checkout keeps the vendored footprint to ~80 KB.
