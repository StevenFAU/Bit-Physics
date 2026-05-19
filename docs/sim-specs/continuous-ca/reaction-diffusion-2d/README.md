# Reaction-diffusion 2D (Gray-Scott)

Phase 0 Block 8 integration sim. Stack B (WebGPU) + Python NumPy
reference + canonical capture
`gray-scott-lambda-128sq-seed42-step2000`.

## Index

- [`spec-ref.md`](spec-ref.md) — 13-section sim spec.
- [`algebraic.md`](algebraic.md) — derivation + discretization + stability + conservation.
- [`determinism.md`](determinism.md) — determinism declaration + sources/mitigations.

## Package

- Code: `packages/reaction-diffusion-2d/`
- Canonical capture: `captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.{h5,json}`
- Legacy-captures fixture: `tests/fixtures/legacy-captures/phase-0-rd-2d-ref.{h5,json}`
- Pre-implementation probe: `tools/testkit/probes/reports/reaction-diffusion-2d.md`
