# Bit-Physics top-level task runner.
#
# This justfile orchestrates cross-stack commands. Per-stack workflows live
# in their own subdirectories (tools/testkit/, tools/integrity/,
# common/common-ts/, packages/<sim>/, etc.).
#
# Usage:
#   just            # list available recipes
#   just test       # run all in-scope test suites
#   just lint       # run all in-scope linters
#   just build-all  # build everything that has a build step

default:
	@just --list

# Run Python test suites for all workspace members.
test:
	uv run pytest -W error tools/testkit/

# Lint Python workspace.
lint:
	uv run ruff check tools/testkit/
	uv run mypy --strict tools/testkit/

# Build all packaged outputs. Currently no-op; later blocks/phases extend.
build-all:
	@echo "build-all: nothing to build at Phase 0 Block 1; later blocks extend."

# ---- Phase 1 Stage 3 additions ----
#
# Per Stage 2 shift #11 / #15 (charter docs/_audits/phase-1/
# stage-2-checkpoint-final-2026-05-20T13-48-37Z.md § 6): all Phase 1
# Stage 2 sim packages — regardless of target stack (B/C/D) — use
# Python pytest at TDD-bootstrap level. The per-sim implementation
# phase adds CMake/ctest (Stack C) and pnpm/vitest (Stack B WebGPU)
# infrastructure when actual stack-specific code lands. These recipes
# expose the canonical TDD-bootstrap invocation per sim.

# Tier 2 substacks (Stage 1 deliverables: particle, vector_field, closed_form).
test-tier2:
	uv run --directory tools/diagnostics pytest diagnostics/tier2/ -q

# Run a single sim's failing-tests suite (Phase 1 TDD-bootstrap contract).
# Usage:  just test-sim strange-attractors
test-sim sim:
	(cd packages/{{sim}} && PYTHONPATH=. python3 -m pytest tests/ -v)

# Run every Phase 1 sim's failing-tests suite (9 sims).
test-sims-all:
	@for sim in strange-attractors mandelbulb-explorer boids-3d physarum \
	            reaction-diffusion-3d sph-water eulerian-smoke \
	            lattice-boltzmann-d3q19 mpm-multimaterial; do \
		echo "---- $$sim ----"; \
		(cd packages/$$sim && PYTHONPATH=. python3 -m pytest tests/ -q) || true; \
	done

# Verify every Phase 1 golden table against its SymPy/closed-form generator.
verify-goldens:
	cd tools/testkit && uv run python -m golden.generator.lorenz_structural --verify
	cd tools/testkit && uv run python -m golden.generator.mandelbulb_de_samples --verify
	cd tools/testkit && uv run python -m golden.generator.boids_3agent_step1 --verify
	cd tools/testkit && uv run python -m golden.generator.physarum_deposit_step1 --verify
	cd tools/testkit && uv run python -m golden.generator.dfsph_density_evolution --verify
	cd tools/testkit && uv run python -m golden.generator.d3q19_equilibrium --verify
	cd tools/testkit && uv run python -m golden.generator.mls_mpm_quadratic_bspline --verify
