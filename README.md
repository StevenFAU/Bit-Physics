# Bit-Physics

A GPU-accelerated physics and emergence simulation portfolio, spanning the
full taxonomy of GPU simulation methods — from closed-form artifacts through
canonical reference implementations through frontier 2025–2026 published
methods — under a single coherent verification, build, documentation, and
shipping discipline.

The portfolio is simultaneously:

1. **A research artifact.** Citable, reproducible, with vendored upstream
   references and pinned SHAs.
2. **A pedagogical archive.** Every simulation explains the mathematics it
   implements; the path from equation to code is legible.
3. **An industry-aligned product surface.** Speaks the production dialect:
   OpenUSD, NanoVDB, NVIDIA Warp, NVIDIA Newton, PyTorch, JAX.
4. **A portfolio piece.** Each simulation ships — as a browser demo, a
   standalone binary, a Python package, an offline render, or some
   combination.

## Reading order

- **Design spec:** [`docs/architecture.md`](docs/architecture.md) — the
  authoritative contract for what this project is. Includes Appendices D
  (shared invariants), E (agent playbook), F (dispatch operations), G
  (convention catalog).
- **Glossary:** [`docs/glossary.md`](docs/glossary.md).
- **Phase plans:** [`docs/phases/`](docs/phases/) — per-phase implementation
  strategies.
- **External dependency pins:** [`docs/dependencies.md`](docs/dependencies.md).

## Common modules

Shared per-stack infrastructure under `common/`:

- `common-py` (Stack D / Taichi) — [`docs/common/py.md`](docs/common/py.md)
- `common-warp` (Stack E / NVIDIA Warp) — [`docs/common/warp.md`](docs/common/warp.md)
- `common-cpp` (Stack C / Vulkan + C++) — [`docs/common/cpp.md`](docs/common/cpp.md)
- `common-ts` (Stack B / WebGPU + TypeScript) — [`docs/common/ts.md`](docs/common/ts.md)
- `common-3dgs` (Stack E / 3D Gaussian Splatting) — [`docs/common/3dgs.md`](docs/common/3dgs.md)
- `common-web` (Stack B / shared web-frontend TS: capture-export + settings panel, consumed by all 7 sim web builds)

## License

[MIT](LICENSE) — see [`docs/architecture.md`](docs/architecture.md) § 12.7
for the rationale.

## Status

**Phases 0–5 closed** (tags `v0.0.0-phase-0` … `v0.5.0-phase-5`, 2026-06-10):
foundation, 9 reference sims, cross-stack replication (Stacks B/C/D/E),
Phase-3's seven sims + 3DGS/render-similarity infrastructure, Phase-4's nine
frontier variants, and Phase-5 productization (web-deploy / binary-release /
pypi-release / render-passes / preprint-extraction; 7 browser-WebGPU frontends
7/7 green on CI lavapipe). Phase 6 (continuous operation) is chartered at
[`docs/phases/phase-6-charter.md`](docs/phases/phase-6-charter.md). The
authoritative record is the append-only audit ledger under
[`docs/_audits/`](docs/_audits/) — see the
[Phase-5 close audit](docs/_audits/phase-5/phase-5-close-2026-06-10T12-38-41Z.md).
