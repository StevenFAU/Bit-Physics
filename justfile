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
