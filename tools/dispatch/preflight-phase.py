#!/usr/bin/env python3
"""
Bit-Physics — Phase Preflight Script Template

Eventual repo location: tools/dispatch/preflight-phase-<N>.py

Every phase has its own preflight derived from this template. The agent's
FIRST action in any phase session is to run the relevant preflight:

    python tools/dispatch/preflight-phase-<N>.py

Exit 0  → all preconditions met; agent proceeds with phase work.
Exit 1  → at least one precondition failed; agent writes BLOCKED report
          with the script's stdout and ends session.

Each phase's preflight checks:
  1. Prior-phase tag exists (skip for Phase 0).
  2. Required paths exist.
  3. python -m integrity --all exits 0 (skip for Phase 0).
  4. Per-workspace-member pytest -W error exits 0 (skip for Phase 0).
  5. Required capture descriptors present (per shared-invariants § 2.3).
  6. External dependencies installable (probe-only; no install).
  7. Phase-specific gates.

The script is FAIL-FAST: it stops at the first failed check and prints
exactly which check failed, with the path/command involved.

Authored by Phase 0 Block 1 (this template); each subsequent phase's
landing audit ships its successor's preflight.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

# NOTE — Block 1 SHIFTED from the byte-for-byte "verbatim" rule for this file
# (phase-0-plan.md § 7.1 deliverable 10): the embedded source imports `os`
# but never uses it (ruff F401). Per Pattern N (Appendix E) the narrowest
# correction is to drop the unused import. The functional behavior of the
# script is unchanged. See the Block 1 report's "Design decisions" section.
#
# NOTE — Phase 0 post-landing hotfix (2026-05-19): the embedded source's
# Phase 1 preflight referenced (a) the unnested diagnostics layout
# `tools/diagnostics/tier1{,/...}`, (b) module name `bit_physics_integrity`,
# and (c) a single repo-root `pytest -W error tools/` invocation. None of
# these matched what Phase 0 actually shipped: Block 6 nested diagnostics
# under `tools/diagnostics/diagnostics/`, Block 5's wheel exposes `integrity`
# (not `bit_physics_integrity`), and the landing audit ran pytest per
# workspace member via `uv run --directory <member> pytest -W error`.
# Per Pattern N (Appendix E) the four corrections were applied to both
# this script and the § 7.1 embed in lockstep. See the hotfix audit at
# docs/_audits/phase-0/hotfix-preflight-phase-1-2026-05-19.md.


# NOTE — Tooling-hardening (2026-05-28, infra task per Convention I; audit
# docs/_audits/phase-3/preflight-hardening-*.md): the integrity precondition
# is invoked via `uv run python -m integrity --all`, NOT `sys.executable -m
# integrity`. The bare-interpreter form resolved to whatever editable
# `integrity` install happened to be first on the running interpreter's path —
# on at least one operator machine that was a STALE pre-rename install
# (GPU-Sims/GPU-Sims) predating the `--all` flag, so the check errored with
# `unrecognized arguments: --all` regardless of THIS repo's green state. The
# `uv run` form mirrors the canonical CI invocation (.github/workflows/
# integrity.yml) and resolves to this workspace's pinned integrity build.
INTEGRITY_CMD = ["uv", "run", "python", "-m", "integrity", "--all"]


@dataclass
class CheckResult:
    name: str
    passed: bool
    detail: str = ""


@dataclass
class PreflightReport:
    phase: int
    checks: list[CheckResult] = field(default_factory=list)

    def add(self, name: str, passed: bool, detail: str = "") -> None:
        self.checks.append(CheckResult(name=name, passed=passed, detail=detail))

    @property
    def all_passed(self) -> bool:
        return all(c.passed for c in self.checks)

    def print(self) -> None:
        print(f"=== Phase {self.phase} preflight ===")
        for c in self.checks:
            mark = "[PASS]" if c.passed else "[FAIL]"
            print(f"  {mark} {c.name}")
            if c.detail and not c.passed:
                print(f"         {c.detail}")
        print(f"=== {'ALL PASSED' if self.all_passed else 'FAILED'} ===")


def check_path_exists(p: Path) -> CheckResult:
    return CheckResult(
        name=f"path-exists:{p}",
        passed=p.exists(),
        detail=f"missing: {p}" if not p.exists() else "",
    )


def check_command(cmd: list[str], name: str | None = None) -> CheckResult:
    name = name or f"command:{' '.join(cmd)}"
    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=120, check=False
        )
        return CheckResult(
            name=name,
            passed=result.returncode == 0,
            detail=f"exit={result.returncode}; stderr={result.stderr[:500]}"
            if result.returncode != 0
            else "",
        )
    except FileNotFoundError:
        return CheckResult(
            name=name, passed=False, detail=f"command not found: {cmd[0]}"
        )
    except subprocess.TimeoutExpired:
        return CheckResult(name=name, passed=False, detail="timeout (>120s)")


def check_phase_tag(prior_phase: int) -> CheckResult:
    name = f"prior-phase-tag:v0.{prior_phase}.0-phase-{prior_phase}"
    result = subprocess.run(
        ["git", "tag", "--list", f"v0.{prior_phase}.0-phase-{prior_phase}"],
        capture_output=True,
        text=True,
        check=False,
    )
    has_tag = bool(result.stdout.strip())
    return CheckResult(
        name=name,
        passed=has_tag,
        detail=f"tag v0.{prior_phase}.0-phase-{prior_phase} not found"
        if not has_tag
        else "",
    )


def check_tool_available(tool: str) -> CheckResult:
    return CheckResult(
        name=f"tool-available:{tool}",
        passed=shutil.which(tool) is not None,
        detail=f"{tool} not in PATH" if shutil.which(tool) is None else "",
    )


def check_capture_descriptors(descriptors: list[tuple[str, str]]) -> list[CheckResult]:
    """Each descriptor is (sim_variant_dir, descriptor_name) e.g. ('reaction-diffusion-2d-ref',
    'gray-scott-lambda-128sq-seed42-step2000')."""
    out = []
    for variant_dir, descriptor in descriptors:
        manifest = Path("captures") / variant_dir / f"{descriptor}.json"
        payload = Path("captures") / variant_dir / f"{descriptor}.h5"
        out.append(check_path_exists(manifest))
        out.append(check_path_exists(payload))
    return out


def phase_0_preflight() -> PreflightReport:
    """Phase 0: foundation. Repo may be empty; minimal checks.

    Checks:
      - Tools available: git, python (>=3.12), uv, pnpm, node (>=22).
      - Working directory is a git repo.
      - No conflicting top-level files (script enumerates expected state).
    """
    r = PreflightReport(phase=0)
    r.add(*_tool_pair(check_tool_available("git")))
    r.add(*_tool_pair(check_tool_available("python3")))
    r.add(*_tool_pair(check_tool_available("uv")))
    r.add(*_tool_pair(check_tool_available("pnpm")))
    r.add(*_tool_pair(check_tool_available("node")))
    # Verify we're in a git repo
    in_repo = (
        subprocess.run(
            ["git", "rev-parse", "--git-dir"],
            capture_output=True,
            check=False,
        ).returncode
        == 0
    )
    r.add("in-git-repo", in_repo, "not inside a git repository" if not in_repo else "")
    return r


def phase_1_preflight() -> PreflightReport:
    """Phase 1: TDD bootstrap, 3 stages, 9 sims.

    Preconditions: Phase 0 landed.
    """
    r = PreflightReport(phase=1)
    _add_check(r, check_phase_tag(0))
    for p in [
        # Spec at docs/architecture.md is the canonical document; its
        # Appendices D, E, F, G contain what was previously in separate
        # conventions / shared-invariants / agent-playbook / dispatch-readiness
        # files (post-v2.3 consolidation).
        Path("docs/architecture.md"),
        Path("docs/glossary.md"),
        Path("tools/testkit/schemas/capture-v1.json"),
        Path("tools/testkit/capture/__init__.py"),
        Path("tools/testkit/determinism/harness.py"),
        Path("tools/testkit/equivalence/harness.py"),
        Path("tools/testkit/equivalence/tolerance.toml"),
        Path("tools/testkit/code_verification/mms"),
        Path("tools/testkit/golden/tables"),
        Path("tools/testkit/probes/template.md"),
        Path("tools/integrity/integrity"),
        Path("tools/diagnostics/diagnostics/tier1"),
        Path("tools/diagnostics/diagnostics/tier2/scalar_field"),
        Path("common/common-ts"),
        Path("packages/reaction-diffusion-2d"),
        Path("references/SPlisHSPlasH"),
    ]:
        _add_check(r, check_path_exists(p))
    # RD-2D capture per shared-invariants
    for c in check_capture_descriptors(
        [
            ("reaction-diffusion-2d-ref", "gray-scott-lambda-128sq-seed42-step2000"),
        ]
    ):
        _add_check(r, c)
    # Integrity green
    _add_check(
        r,
        check_command(
            INTEGRITY_CMD,
            name="integrity-all-green",
        ),
    )
    # Tests green — per workspace member, mirroring Phase 0 landing's
    # evidence pattern (`uv run --directory <member> pytest -W error`).
    # Each `uv run --directory` re-syncs that member's dev deps into the
    # shared `.venv`, so this both probes and reproduces the canonical
    # Phase 0 invocation. Operator must have done at least one prior
    # `uv sync --extra dev` per member for the venv to be primed; see
    # docs/dependencies.md "Operator notes".
    for member_dir, check_name in [
        ("tools/testkit", "pytest-testkit-green"),
        ("tools/integrity", "pytest-integrity-green"),
        ("tools/diagnostics", "pytest-diagnostics-green"),
        ("packages/reaction-diffusion-2d", "pytest-reaction-diffusion-2d-green"),
    ]:
        _add_check(
            r,
            check_command(
                ["uv", "run", "--directory", member_dir, "pytest", "-W", "error"],
                name=check_name,
            ),
        )
    return r


def phase_2_preflight() -> PreflightReport:
    """Phase 2: cross-stack replication, 10 stages (incl. Stage 0 common-warp bootstrap).

    Preconditions: Phase 1 landed.
    """
    r = PreflightReport(phase=2)
    _add_check(r, check_phase_tag(1))
    for p in [
        Path("common/common-cpp"),
        Path("common/common-py"),
        Path("tools/diagnostics/tier2/particle"),
        Path("tools/diagnostics/tier2/vector_field"),
        Path("tools/diagnostics/tier2/closed_form"),
    ]:
        _add_check(r, check_path_exists(p))
    # Per-sim probe reports and spec sheets
    for sim in [
        "strange-attractors",
        "mandelbulb-explorer",
        "boids-3d",
        "physarum",
        "reaction-diffusion-3d",
        "sph-water",
        "eulerian-smoke",
        "lattice-boltzmann-d3q19",
        "mpm-multimaterial",
    ]:
        _add_check(r, check_path_exists(Path(f"tools/testkit/probes/reports/{sim}.md")))
    # Source-sim captures per shared-invariants
    descriptors = [
        ("sph-water-ref", "dam-break-1M-particles-seed42-step1000"),
        ("eulerian-smoke-ref", "taylor-green-128cube-seed42-step500"),
        ("lattice-boltzmann-d3q19-ref", "poiseuille-64x32-seed42-step1000"),
        ("mpm-multimaterial-ref", "drop-impact-128cube-seed42-step500"),
    ]
    for c in check_capture_descriptors(descriptors):
        _add_check(r, c)
    _add_check(
        r,
        check_command(
            INTEGRITY_CMD,
            name="integrity-all-green",
        ),
    )
    return r


def phase_3_preflight() -> PreflightReport:
    """Phase 3: secondary categories, 11 tasks."""
    r = PreflightReport(phase=3)
    _add_check(r, check_phase_tag(2))
    for p in [
        Path("common/common-warp"),
        Path("docs/common/warp.md"),
    ]:
        _add_check(r, check_path_exists(p))
    # Phase 2 port directories. NOTE — these were authored against a
    # category-folder layout (continuous-ca/, particle-fluid/, hybrid-pg/)
    # the project never adopted; Phase 1/2 settled on packages/<sim>-stack-X.
    # Repointed to the real live paths (tooling-hardening 2026-05-28, F2).
    for port_dir in [
        "packages/reaction-diffusion-2d-stack-c",
        "packages/reaction-diffusion-2d-stack-d",
        "packages/sph-water-stack-d",
        "packages/mpm-multimaterial-stack-e",
    ]:
        _add_check(r, check_path_exists(Path(port_dir)))
    _add_check(
        r,
        check_command(
            INTEGRITY_CMD,
            name="integrity-all-green",
        ),
    )
    return r


def phase_4_preflight() -> PreflightReport:
    """Phase 4: frontier variants, 35 stages.

    Preconditions: Phase 3 landed. Stages 31-33 sim names locked. CUDA available
    OR documented fallback accepted.
    """
    r = PreflightReport(phase=4)
    _add_check(r, check_phase_tag(3))
    for p in [
        Path("common/common-3dgs"),
        Path("tools/testkit/render_similarity"),
        # Phase 3 sims. NOTE — repointed from the never-adopted category-folder
        # layout (continuous-ca/, rigid-body/, soft-body/) to packages/<sim>,
        # the live convention (tooling-hardening 2026-05-28, forward-looking).
        # RESOLVED (phase-4 batch-1 Stage 0, 2026-05-31): the two sims the
        # 2026-05-28 comment left to "FAIL — correctly — until that sim lands"
        # have now landed under their real package names. Repointed:
        #   cloth-xpbd        -> mass-spring-cloth (Phase-3 mass-spring-cloth, 86b0aa5)
        #   learned-dynamics  -> pinn-poisson       (Phase-3 task-7 learned-dynamics, c4c3f43)
        # This is the "Resolve when that sim lands" the prior comment directed.
        Path("packages/lenia"),
        Path("packages/neural-ca"),
        Path("packages/articulated-pedagogical"),
        Path("packages/mass-spring-cloth"),
        Path("packages/pinn-poisson"),
        # Pre-vendored frontier papers
        Path("references/papers"),
    ]:
        _add_check(r, check_path_exists(p))
    # CUDA availability check (best-effort; informational)
    nvidia_smi = shutil.which("nvidia-smi")
    cuda_ok = False
    if nvidia_smi:
        result = subprocess.run(
            ["nvidia-smi"], capture_output=True, text=True, check=False
        )
        cuda_ok = result.returncode == 0
    r.add(
        "cuda-available",
        cuda_ok,
        "CUDA not detected; Stages 31-33 will run in CPU-only fallback per "
        "shared-invariants § 5"
        if not cuda_ok
        else "",
    )
    # cuda-available is informational; treat as warning, not blocker
    if not cuda_ok:
        r.checks[-1].passed = True  # don't block; fallback documented
    _add_check(
        r,
        check_command(
            INTEGRITY_CMD,
            name="integrity-all-green",
        ),
    )
    return r


def phase_5_preflight() -> PreflightReport:
    """Phase 5: productization, 5 sub-phases.

    Preconditions: Phase 4 landed (partial Phase 4 acceptable per Phase 5 § 0).
    """
    r = PreflightReport(phase=5)
    _add_check(r, check_phase_tag(4))
    for p in [
        Path("tools/productization"),
        # Phase 5 doesn't require all of Phase 4 done, just _some_
        Path("docs/sim-specs"),
    ]:
        _add_check(r, check_path_exists(p))
    _add_check(
        r,
        check_command(
            INTEGRITY_CMD,
            name="integrity-all-green",
        ),
    )
    return r


# Helpers
def _tool_pair(c: CheckResult) -> tuple[str, bool, str]:
    return c.name, c.passed, c.detail


def _add_check(report: PreflightReport, c: CheckResult) -> None:
    report.checks.append(c)


PREFLIGHTS = {
    0: phase_0_preflight,
    1: phase_1_preflight,
    2: phase_2_preflight,
    3: phase_3_preflight,
    4: phase_4_preflight,
    5: phase_5_preflight,
}


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: preflight-phase.py <phase-number>", file=sys.stderr)
        return 2
    try:
        phase = int(sys.argv[1])
    except ValueError:
        print(f"Phase must be integer, got {sys.argv[1]!r}", file=sys.stderr)
        return 2
    if phase not in PREFLIGHTS:
        print(f"No preflight for phase {phase}", file=sys.stderr)
        return 2
    report = PREFLIGHTS[phase]()
    report.print()
    return 0 if report.all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
