"""Cross-phase audit replay (spec § 7.5, Appendix G.7).

CLI:
    python -m integrity.scripts.replay_prior_phase \\
        --prior-phase <name> --audit <path> --gates <comma-list>

Behavior:
    1. Checks out the prior-phase tag in a worktree.
    2. Re-runs every gate listed in --gates (default:
       integrity,pytest,equivalence,determinism,perf-ledger,
       property,mutation,tolerance-budget — the eight gates the
       Phase-1 plan R9 amendment names).
    3. Compares actual gate results to the verdicts asserted in the
       prior-phase landing audit's front-matter.
    4. Exits 0 if all replayed gates match; 1 otherwise.

Phase 0 has no prior phase to replay; the script ships fully wired and
ready for Phase 1's first action.

The gate runners are configurable via the ``GATE_COMMANDS`` mapping
below; each entry is a list of argv tokens executed under the worktree
root. A gate "passes" if its exit code is 0.
"""

from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

import yaml

from ..common.repo import find_repo_root

_FRONT_MATTER = re.compile(r"^---\n(.*?)\n---\n", re.DOTALL)

# A conceptual phase handle such as "phase-0" or "phase-12". Resolved at
# replay time to the highest-semver landed tag matching the same N.
_PHASE_HANDLE_RE = re.compile(r"^phase-(\d+)$")
# The Phase-0 plan's tag template: vX.Y.Z-phase-N (e.g. v0.0.0-phase-0).
_SEMVER_PHASE_TAG_RE = re.compile(r"^v(\d+)\.(\d+)\.(\d+)-phase-(\d+)$")

# sys.executable is the absolute path to the interpreter running this
# script. Using it directly in subprocess argv avoids the "python not on
# PATH" failure mode the old hardcoded `"python"` token triggered on
# systems where only `python3` lives on PATH (and `python` resolves only
# inside an activated venv). `uv` argv entries stay as-is since `uv` is a
# separate executable, not a Python interpreter substitution.
GATE_COMMANDS: dict[str, list[str]] = {
    "integrity": [sys.executable, "-m", "integrity", "--all", "--mode", "strict"],
    # pytest, equivalence, determinism — invoked through `uv run` so the gate
    # resolves the workspace's venv (and brings pytest with it) without
    # relying on the caller pre-activating .venv. Matches the canonical
    # justfile invocation (`uv run pytest -W error tools/testkit/`).
    "pytest": ["uv", "run", "pytest", "-W", "error", "tools/testkit/"],
    "equivalence": ["uv", "run", "pytest", "-W", "error", "tools/testkit/equivalence/tests"],
    "determinism": ["uv", "run", "pytest", "-W", "error", "tools/testkit/determinism/tests"],
    "perf-ledger": [
        sys.executable,
        "-c",
        "print('perf-ledger gate is a phase-1+ placeholder')",
    ],
    # property — Phase 0 ships a property-based test harness under
    # tools/testkit/property/tests. Per the Phase 1 R9 amendment the gate
    # is a scoped pytest run, mirroring the equivalence/determinism shape.
    "property": ["uv", "run", "pytest", "-W", "error", "tools/testkit/property/tests/"],
    # mutation — Phase 0 LANDING § 4 declares the framework-validated
    # baseline; this gate verifies that baseline is still on disk with
    # the schema fields the landing audit attested to. Fresh per-target
    # kill-rate runs are out of replay scope (heavy + deferred per spec
    # § 2.13). See integrity.scripts.gate_helpers for the assertions.
    "mutation": [
        sys.executable,
        "-m",
        "integrity.scripts.gate_helpers",
        "mutation-baseline-present",
    ],
    # tolerance-budget — per the R9 amendment, "tolerance-budget.toml is
    # committed but has no per-sim overrides — the tolerance-budget gate
    # passes trivially". Gate verifies the budget file is on disk, parses,
    # has the [phase] block, and carries no per-sim overrides (which
    # belong in tolerance.toml). See gate_helpers for assertions.
    "tolerance-budget": [
        sys.executable,
        "-m",
        "integrity.scripts.gate_helpers",
        "tolerance-budget-trivial",
    ],
}


# Gate classification (Phase-4 consolidation C3). A gate is "correctness" if it
# attests the prior phase's DELIVERABLES reproduce (the sims/tools still behave);
# it is "meta" if it only checks tooling / ledger / budget hygiene that
# legitimately drifts across a frozen phase boundary (§D.5 tag-isolation: the
# replay runs the TAGGED gate logic against TAGGED content, so a meta-ledger that
# advanced post-tag reads red at the tag by design). `ReplayResult.ok` (and the
# CLI exit code) reflect the deliverable-correctness verdict; meta reds are
# reported SEPARATELY so a tag-frozen meta-red does not mask "the prior phase's
# deliverables are intact."
#
# The motivating finding (Phase-4 foundation-entry gate, pre-dispatch-review §13):
# replaying v0.3.0-phase-3 returned ok=False on TWO reds, neither a
# deliverable-correctness failure — the `mutation` baseline-present status string
# (framework-validated -> real-baseline) and three META tests bundled into the
# `pytest -W error tools/testkit/` run (i6/i7/cost-axis). This edit cleanly
# reclassifies the PURE-meta gates (mutation/tolerance-budget/perf-ledger). The
# `pytest`-gate-bundles-meta-tests case needs sub-test granularity and is SURFACED,
# not forced (a meta-marker / deselection on the testkit meta-tests).
#
# Bit-reproducibility tradeoff (weighed explicitly per the banked refinement): the
# strict "every gate replays identically" signal is NOT lost — it is retained as
# `strict_ok`. Only the default `ok` narrows to correctness. Unlisted gates
# default to "correctness" (fail-safe: a newly-added gate gates phase entry until
# it is deliberately reclassified).
GATE_CLASS: dict[str, str] = {
    "integrity": "correctness",
    "pytest": "correctness",
    "equivalence": "correctness",
    "determinism": "correctness",
    "property": "correctness",
    "perf-ledger": "meta",  # phase-1+ placeholder print — not a deliverable check
    "mutation": "meta",  # gate_helper baseline/ledger status + advisory below-floor
    "tolerance-budget": "meta",  # file-shape / trivially-passes hygiene check
}
_DEFAULT_GATE_CLASS = "correctness"


def classify_gate(name: str) -> str:
    """Return 'correctness' or 'meta' for a gate (default correctness — fail-safe)."""
    return GATE_CLASS.get(name, _DEFAULT_GATE_CLASS)


@dataclass
class GateResult:
    name: str
    passed: bool
    audit_verdict: str | None
    discrepancy: str | None = None
    gate_class: str = _DEFAULT_GATE_CLASS

    @property
    def clean(self) -> bool:
        """The gate ran green AND matched the audit verdict."""
        return self.passed and self.discrepancy is None


@dataclass
class ReplayResult:
    prior_phase: str
    audit_path: Path
    worktree: Path
    gates: list[GateResult] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        """Deliverable-correctness verdict: every CORRECTNESS gate is clean.

        A tag-frozen META-red (see GATE_CLASS) does NOT fail this — that is the
        C3 refinement. Use `strict_ok` for the all-gates-bit-identical signal.
        """
        correctness = [g for g in self.gates if g.gate_class == "correctness"]
        return all(g.clean for g in correctness)

    @property
    def strict_ok(self) -> bool:
        """Legacy semantics: EVERY gate (correctness + meta) is clean.

        Retained so the strong bit-reproducibility signal (§D.5) is not lost.
        """
        return all(g.clean for g in self.gates)

    @property
    def meta_ok(self) -> bool:
        """Every META gate is clean (reported separately from `ok`)."""
        return all(g.clean for g in self.gates if g.gate_class == "meta")

    @property
    def meta_discrepancies(self) -> list[GateResult]:
        """META gates that ran red or mismatched (surfaced, do not fail `ok`)."""
        return [g for g in self.gates if g.gate_class == "meta" and not g.clean]


def _read_front_matter(audit_path: Path) -> dict[str, object]:
    text = audit_path.read_text(encoding="utf-8")
    m = _FRONT_MATTER.match(text)
    if m is None:
        raise ValueError(f"audit {audit_path} has no YAML front-matter")
    data = yaml.safe_load(m.group(1))
    if not isinstance(data, dict):
        raise ValueError(f"audit {audit_path} front-matter is not a mapping")
    return data


def _audit_verdict_for_gate(fm: dict[str, object], gate: str) -> str | None:
    """Look up the audit's claimed verdict for a given gate.

    Honors two shapes:
        - `verdict: CONFIRMED` (whole-audit verdict; applied to every gate)
        - `gates: { integrity: PASS, pytest: PASS, ... }` (per-gate map)
    """
    gates = fm.get("gates")
    if isinstance(gates, dict):
        v = gates.get(gate)
        if isinstance(v, str):
            return v
    verdict = fm.get("verdict")
    return verdict if isinstance(verdict, str) else None


def _resolve_phase_handle(handle: str, repo_root: Path) -> str:
    """Resolve a ``--prior-phase`` value to a concrete git tag.

    Two input shapes are accepted:

    1. **Conceptual handle** — ``phase-N`` (where N is a non-negative
       integer). The function lists ``git tag`` entries matching the
       Phase-0-plan template ``vX.Y.Z-phase-N``, parses each as a
       (major, minor, patch) tuple, and returns the literal tag with
       the highest semver. Raises ``ValueError`` if no matching tag
       exists, so callers do not silently fall back to a non-existent
       ref.

    2. **Literal git ref** — any string that does NOT match the
       ``phase-N`` regex (including explicit landed tags such as
       ``v0.0.0-phase-0`` or commit SHAs) is returned unchanged. This
       preserves backward compatibility with callers that resolve the
       tag themselves (per Hard-Rule-2 / Convention-M: HEAD wins).
    """
    m = _PHASE_HANDLE_RE.match(handle)
    if m is None:
        return handle
    n = m.group(1)
    proc = subprocess.run(
        ["git", "tag", "--list", f"v*.*.*-phase-{n}"],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=True,
    )
    candidates: list[tuple[tuple[int, int, int], str]] = []
    for raw in proc.stdout.splitlines():
        line = raw.strip()
        sm = _SEMVER_PHASE_TAG_RE.match(line)
        if sm is None:
            continue
        if sm.group(4) != n:
            continue
        candidates.append(((int(sm.group(1)), int(sm.group(2)), int(sm.group(3))), line))
    if not candidates:
        raise ValueError(
            f"no tag matches handle {handle!r} (looked for tags shaped vX.Y.Z-phase-{n})"
        )
    candidates.sort()
    return candidates[-1][1]


def _checkout_worktree(repo_root: Path, tag: str) -> Path:
    """Materialize a worktree at ``tag`` under a temp path; caller cleans up.

    The worktree is also `uv sync`-prepared with `--all-packages
    --all-extras` so every workspace member's dev extras (h5py,
    hypothesis, pytest, mutmut, ruff, …) land in the worktree's local
    `.venv`. Without this, `uv run pytest` from a freshly-checked-out
    worktree fails to collect tests — testkit's pyproject lists pytest
    as a dev extra, so a base-deps-only sync omits it.
    """
    target = repo_root / f".replay-{tag}"
    if target.exists():
        shutil.rmtree(target)
    subprocess.run(
        ["git", "worktree", "add", "--detach", str(target), tag],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=True,
    )
    # Best-effort: only sync if the worktree looks uv-managed. Stub
    # fixtures (used by the unit tests under tools/integrity/tests/)
    # ship a bare git repo with no pyproject.toml; for those, skip
    # the sync so the stub-gate path remains exercisable.
    if (target / "pyproject.toml").exists() and (target / "uv.lock").exists():
        subprocess.run(
            ["uv", "sync", "--frozen", "--all-packages", "--all-extras"],
            cwd=target,
            capture_output=True,
            text=True,
            check=True,
        )
    return target


def _remove_worktree(repo_root: Path, target: Path) -> None:
    subprocess.run(
        ["git", "worktree", "remove", "--force", str(target)],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=False,
    )
    if target.exists():
        shutil.rmtree(target, ignore_errors=True)


def _resolve_cmd_for_worktree(cmd: list[str], worktree: Path) -> list[str]:
    """Substitute the outer ``sys.executable`` token with the worktree's interpreter.

    The cross-phase replay materializes a worktree at the prior-phase
    tag, then runs each gate's argv with ``cwd=worktree``. Argvs that
    use ``uv run`` resolve the worktree's local ``.venv`` correctly
    because ``uv`` inspects the cwd. Argvs that use ``sys.executable``
    directly do NOT: ``sys.executable`` is the OUTER repository's
    interpreter, and ``python -m integrity`` (or
    ``python -m integrity.scripts.gate_helpers …``) under that
    interpreter imports the OUTER repository's integrity package
    (editable-installed in the outer ``.venv``), not the worktree's
    tagged source. That binding turns the cross-phase replay into a
    HEAD-tool-against-tag-content category error — see
    ``docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/stage-0-blocked-replay-2026-05-20T18-52-10Z.md``
    for the failure mode that surfaced this defect (HEAD's
    ``_SUBDIRS_PICKED_UP`` extension landing post-tag caused the
    integrity gate to false-FAIL on v0.1.0-phase-1).

    The fix: when the worktree carries a uv-managed ``.venv`` (i.e.
    ``_checkout_worktree`` ran ``uv sync`` successfully), every
    ``sys.executable`` token in the argv is rewritten to the
    worktree's ``.venv/bin/python``. ``-m integrity`` under that
    interpreter then resolves to the worktree's tagged source via
    the worktree's ``.venv/lib/.../site-packages``. Stub fixtures
    (the unit tests under ``tools/integrity/tests/``) ship without a
    ``.venv``; for those the original argv is returned unchanged so
    the test path remains exercisable.
    """
    worktree_python = worktree / ".venv" / "bin" / "python"
    if not worktree_python.exists():
        return cmd
    return [str(worktree_python) if tok == sys.executable else tok for tok in cmd]


def replay(
    prior_phase: str,
    audit_path: Path,
    gates: list[str],
    repo_root: Path | None = None,
) -> ReplayResult:
    root = repo_root or find_repo_root()
    fm = _read_front_matter(audit_path)
    resolved_tag = _resolve_phase_handle(prior_phase, root)
    worktree = _checkout_worktree(root, resolved_tag)
    result = ReplayResult(prior_phase=resolved_tag, audit_path=audit_path, worktree=worktree)
    try:
        for gate in gates:
            cmd = GATE_COMMANDS.get(gate)
            audit_verdict = _audit_verdict_for_gate(fm, gate)
            if cmd is None:
                result.gates.append(
                    GateResult(
                        name=gate,
                        passed=False,
                        audit_verdict=audit_verdict,
                        discrepancy=f"unknown gate {gate!r}",
                        gate_class=classify_gate(gate),
                    )
                )
                continue
            resolved_cmd = _resolve_cmd_for_worktree(cmd, worktree)
            proc = subprocess.run(
                resolved_cmd, cwd=worktree, capture_output=True, text=True, check=False
            )
            passed = proc.returncode == 0
            discrepancy = None
            if (
                audit_verdict
                and audit_verdict.upper() in {"CONFIRMED", "PASS", "OK"}
                and not passed
            ):
                discrepancy = (
                    f"audit claimed {audit_verdict} but replay failed "
                    f"(rc={proc.returncode}); stderr={proc.stderr[:200]!r}"
                )
            result.gates.append(
                GateResult(
                    name=gate,
                    passed=passed,
                    audit_verdict=audit_verdict,
                    discrepancy=discrepancy,
                    gate_class=classify_gate(gate),
                )
            )
    finally:
        _remove_worktree(root, worktree)
    return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m integrity.scripts.replay_prior_phase")
    parser.add_argument(
        "--prior-phase",
        required=True,
        help=(
            "Phase handle (e.g. 'phase-0') or literal git ref. A handle "
            "resolves to the highest-semver tag matching vX.Y.Z-phase-N; "
            "anything else is treated as a literal ref."
        ),
    )
    parser.add_argument("--audit", required=True, type=Path)
    parser.add_argument(
        "--gates",
        default=(
            "integrity,pytest,equivalence,determinism,perf-ledger,"
            "property,mutation,tolerance-budget"
        ),
        help="Comma-separated gate names.",
    )
    args = parser.parse_args(list(argv) if argv is not None else sys.argv[1:])
    gate_list = [g.strip() for g in args.gates.split(",") if g.strip()]
    try:
        result = replay(args.prior_phase, args.audit, gate_list)
    except (subprocess.CalledProcessError, ValueError) as exc:
        print(f"replay_prior_phase: {exc}", file=sys.stderr)
        return 1
    for g in result.gates:
        status = "PASS" if g.passed else "FAIL"
        print(f"  {status}  gate={g.name} [{g.gate_class}] audit_verdict={g.audit_verdict}")
        if g.discrepancy:
            print(f"        discrepancy: {g.discrepancy}", file=sys.stderr)
    # Surface meta-reds separately: they do NOT fail `ok` (C3) but must be visible.
    if result.meta_discrepancies:
        names = ", ".join(g.name for g in result.meta_discrepancies)
        print(
            f"  NOTE: {len(result.meta_discrepancies)} META gate(s) red "
            f"({names}) — tag-frozen hygiene, does NOT fail correctness ok= (C3).",
            file=sys.stderr,
        )
    print(
        f"summary: prior_phase={result.prior_phase} ok={result.ok} "
        f"(correctness) strict_ok={result.strict_ok} meta_ok={result.meta_ok}"
    )
    return 0 if result.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
