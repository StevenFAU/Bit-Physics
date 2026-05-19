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

## License

[MIT](LICENSE) — see [`docs/architecture.md`](docs/architecture.md) § 12.7
for the rationale.

## Status

Phase 0 (Foundation) in progress. Subsequent phases follow per
`docs/architecture.md` Part XI.
