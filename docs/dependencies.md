# External dependency pins

Per spec § 9.2 and Appendix D § D.4. Each entry is a load-bearing external
dependency with a verification command. Pins are re-verified at each
consuming block/phase per Convention-8 (no fabrication from memory).

Phase 0 Block 1 seeds this file. Later blocks and phases append entries via
their landing audits.

## Verified at Phase 0 Block 1 (2026-05-18)

| Dependency | Used by | Pin (Block 1 known-good) | License | Verification command |
|---|---|---|---|---|
| **pre-commit/pre-commit-hooks** | `.pre-commit-config.yaml` | `v6.0.0` (2025-08-09) | MIT | `gh release view -R pre-commit/pre-commit-hooks` |
| **astral-sh/ruff-pre-commit** | `.pre-commit-config.yaml` | `v0.15.13` (2026-05-14) | MIT | `gh release view -R astral-sh/ruff-pre-commit` |
| **compilerla/conventional-pre-commit** | `.pre-commit-config.yaml` | `v4.4.0` (2026-02-18) | Apache-2.0 | `gh release view -R compilerla/conventional-pre-commit` |
| **uv** | repo-root + workspace members | `0.11.15` (May 2026) | Apache-2.0 / MIT | `uv --version` |
| **Python** | all Python phases | `3.12+` | PSF | `python3 --version` |
| **Node** | Block 7, Phase 5 web-deploy | `22 LTS+` | OpenJS / various | `node --version` |
| **pnpm** | Block 7, Stack B sims | `10.x+` | MIT | `pnpm --version` |
| **h5py** | `tools/testkit/capture/` | `>=3.10` | BSD-3-Clause | `pip index versions h5py` |
| **numpy** | `tools/testkit/capture/` | `>=2.0` | BSD-3-Clause | `pip index versions numpy` |
| **jsonschema** | `tools/testkit/capture/` | `>=4.20` | MIT | `pip index versions jsonschema` |

## Forward-looking pins (declared by later blocks/phases)

See Appendix D § D.3 (vendored dependency pins — SPlisHSPlasH, OpenVDB,
NVIDIA Newton, etc.) and § D.4 (additional non-vendored deps — h5wasm,
Lightning, PhysicsNeMo, Warp, Taichi) in
[`architecture.md`](architecture.md).

## Append discipline

Append-only. Each later phase appends rows; existing rows are NOT modified
without a separate operator-approved amendment commit.
