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

# ---- Phase 3 common-3dgs ----

# Render one frame of the 3dgs-smoke scene (writes PNG + Layer-0 HDF5 capture
# under common/common-3dgs/examples/smoke_3dgs/out/).
run-3dgs-smoke:
	PYTHONPATH=common/common-3dgs/src:common/common-3dgs/examples \
		uv run --no-sync python common/common-3dgs/examples/smoke_3dgs/sim.py

# Run the common-3dgs test suite (smoke-contract + property-based).
test-3dgs:
	cd common/common-3dgs && uv run --no-sync python -m pytest tests/

# Verify every Phase 1 golden table against its SymPy/closed-form generator.
verify-goldens:
	cd tools/testkit && uv run python -m golden.generator.lorenz_structural --verify
	cd tools/testkit && uv run python -m golden.generator.mandelbulb_de_samples --verify
	cd tools/testkit && uv run python -m golden.generator.boids_3agent_step1 --verify
	cd tools/testkit && uv run python -m golden.generator.physarum_deposit_step1 --verify
	cd tools/testkit && uv run python -m golden.generator.dfsph_density_evolution --verify
	cd tools/testkit && uv run python -m golden.generator.d3q19_equilibrium --verify
	cd tools/testkit && uv run python -m golden.generator.mls_mpm_quadratic_bspline --verify

# ---- Phase 3 lenia ----

# Run the Lenia CLI (writes the canonical Orbium capture to captures/lenia/).
run-lenia:
	uv run --no-sync python -m lenia --seed 42 --steps 1000 --grid 256 \
		--preset orbium-unicaudatus --out captures/lenia \
		--tolerance-key continuous-ca.lenia --determinism-arch cpu

# Run the Lenia test suite (kernel anchors + growth + sim shells + determinism + PBT).
test-lenia:
	uv run --no-sync python -m pytest packages/lenia/tests/ -v

# ---- Phase 3 ising-classical ----

# Run the Ising-classical CLI (writes the canonical capture to captures/ising-classical-ref/).
run-ising-classical:
	uv run --no-sync python -m ising_classical --seed 42 --steps 10000 --grid 128 \
		--temp 2.27 --out captures/ising-classical-ref

# Run the Ising-classical test suite (code-verification + determinism + golden + PBT + diagnostics).
test-ising-classical:
	uv run --no-sync python -m pytest packages/ising-classical/tests/ -v

# ---- Phase 3 rigid-body-pedagogical ----

# Run the articulated-pedagogical CLI (Featherstone ABA; default single-joint tier).
run-rigid-body-pedagogical:
	uv run --no-sync python -m articulated_pedagogical --tier single-joint \
		--seed 42 --steps 1000 --dt 0.001

# Run the articulated-pedagogical test suite (golden + determinism + PBT + capture + diagnostics).
test-rigid-body-pedagogical:
	uv run --no-sync python -m pytest packages/articulated-pedagogical/tests/ -v

# ---- Phase 3 mass-spring-cloth (Stack C — Vulkan / C++; lavapipe-pinned) ----

# Build + run the mass-spring-cloth capture binary (default: canonical
# flag-wind-128x128-seed42-step1000 -> captures/mass-spring-cloth-ref/).
run-cloth:
	cmake -S . -B build/cpp
	cmake --build build/cpp --target bit_physics_mass_spring_cloth_capture -j
	VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.json LP_NUM_THREADS=0 \
		./build/cpp/packages/mass-spring-cloth/bit_physics_mass_spring_cloth_capture \
		captures/mass-spring-cloth-ref/flag-wind-128x128-seed42-step1000.json

# Build + run the mass-spring-cloth ctests (gate-3 acceptance + gate-4 golden + gate-11 PBT).
test-cloth:
	cmake -S . -B build/cpp
	cmake --build build/cpp -j
	ctest --test-dir build/cpp -R mass_spring_cloth --output-on-failure
