"""Phase-5 pypi-release pipeline (phase plan § 5.5 shape; § 6.3 criteria).

Build-and-validate PyPI wheels for every qualifying Stack-D / Stack-E sim and
re-verify correctness via the spec § 3.8 bootstrap gate: build the wheel, install
it in a FRESH isolated venv, re-emit the canonical capture programmatically from
the INSTALLED artifact, and compare it to the in-repo canonical through
``equivalence.harness.compare_captures`` (R1: programmatic, NOT a CLI). Sims whose
canonical artifact is a golden TABLE (no committed ``.h5``) use the documented
golden-table surrogate (R3): the installed wheel must pass the sim's own committed
golden-anchor test suite.

Invoked by PATH (the ``tools/dispatch/preflight-phase.py`` precedent), because the
``pypi-release/`` tool dir is hyphenated and not an importable module:

    python tools/productization/pypi-release/pipeline.py discover --json
    python tools/productization/pypi-release/pipeline.py build   --sims-json sims.json --output OUT
    python tools/productization/pypi-release/pipeline.py validate --artifacts OUT --json

NO publish: the ``deploy`` job in pypi-release.yml is gated off (§ 4.5). This module
never uploads to PyPI.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import time
import tomllib
import venv
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

REPO_ROOT = Path(__file__).resolve().parents[3]
SPEC_ROOT = REPO_ROOT / "docs" / "sim-specs"
PACKAGES_ROOT = REPO_ROOT / "packages"
TOLERANCE_TABLE = REPO_ROOT / "tools" / "testkit" / "equivalence" / "tolerance.toml"

# Shared infra wheels every sim transitively depends on at runtime. Built once
# into the wheelhouse and reused for every per-sim fresh-venv install.
INFRA_PACKAGES = (
    "bit-physics-testkit",
    "bit-physics-diagnostics",
    "bit-physics-common-py",
    "bit-physics-common-warp",
    "bit-physics-common-3dgs",
)

# Frontier sims that are members of a pypi:true canonical family but have no
# §13 spec sheet of their own; they inherit the canonical's pypi flag.
FRONTIER_TO_CANONICAL = {
    "particle-lenia": "lenia",
    "flow-lenia": "lenia",
}

# Variant suffixes, longest-first, stripped to find a package's governing
# canonical sim (whose §13 carries the pypi flag — variants inherit it).
_VARIANT_SUFFIXES = (
    "-sh-update",
    "-stack-d",
    "-stack-e",
    "-stack-c",
    "-diff",
    "-neural",
)


@dataclass(frozen=True)
class SimSpec:
    name: str
    category: str
    stack: str  # 'B' | 'C' | 'D' | 'E'
    path: Path
    metadata: dict[str, Any]


@dataclass(frozen=True)
class PipelineResult:
    sim: SimSpec
    status: Literal["pass", "fail", "deferred"]
    artifact_path: Path | None
    capture_validated: bool
    duration_seconds: float
    notes: str


# --- §13 productization-flag discovery -------------------------------------


def _parse_productization_block(text: str) -> dict[str, bool] | None:
    """Extract the five-boolean ``productization:`` YAML block from a spec-ref."""
    lines = text.splitlines()
    flags: dict[str, bool] = {}
    in_block = False
    for line in lines:
        if line.strip() == "productization:":
            in_block = True
            continue
        if in_block:
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            if not line.startswith(("  ", "\t")):
                break  # dedent → block ended
            key, _, rest = stripped.partition(":")
            val = rest.split("#", 1)[0].strip().lower()
            if val in {"true", "false"}:
                flags[key.strip()] = val == "true"
    return flags or None


def _canonical_flags() -> dict[str, dict[str, Any]]:
    """Map each canonical sim → {category, flags} from its spec-ref §13."""
    out: dict[str, dict[str, Any]] = {}
    for spec in sorted(SPEC_ROOT.glob("*/*/spec-ref.md")):
        category = spec.parent.parent.name
        name = spec.parent.name
        flags = _parse_productization_block(spec.read_text(encoding="utf-8"))
        if flags is not None:
            out[name] = {"category": category, "flags": flags}
    return out


def _governing_canonical(
    pkg_name: str, canonicals: dict[str, dict[str, Any]]
) -> str | None:
    if pkg_name in FRONTIER_TO_CANONICAL:
        return FRONTIER_TO_CANONICAL[pkg_name]
    if pkg_name in canonicals:
        return pkg_name
    base = pkg_name
    changed = True
    while changed:
        changed = False
        for suf in _VARIANT_SUFFIXES:
            if base.endswith(suf):
                base = base[: -len(suf)]
                changed = True
                if base in canonicals:
                    return base
    return base if base in canonicals else None


def _pyproject_path(pkg_dir: Path) -> Path | None:
    """The sim's pyproject (handles the neural-ca python/ subdir layout)."""
    direct = pkg_dir / "pyproject.toml"
    if direct.exists():
        return direct
    nested = pkg_dir / "python" / "pyproject.toml"
    return nested if nested.exists() else None


def _infer_stack(deps: list[str]) -> str:
    blob = " ".join(deps).lower()
    if "warp-lang" in blob or "warp_lang" in blob:
        return "E"
    if "taichi" in blob:
        return "D"
    if "torch" in blob:
        return "D"
    return "D"  # pure-Python reference packages ship as Stack-D for PyPI purposes


def discover_qualifying_sims() -> list[SimSpec]:
    """Walk packages/ and return sims whose governing canonical §13 pypi:true.

    Variants inherit the canonical pypi flag (the §13 mechanism only covers the
    17 canonical sims; their cross-stack / -diff / frontier package variants
    carry no §13 of their own). Non-qualifying packages are reported via stderr.
    """
    canonicals = _canonical_flags()
    sims: list[SimSpec] = []
    nonq: list[tuple[str, str]] = []
    for pkg_dir in sorted(p for p in PACKAGES_ROOT.iterdir() if p.is_dir()):
        pkg = pkg_dir.name
        pp = _pyproject_path(pkg_dir)
        if pp is None:
            nonq.append((pkg, "no pyproject.toml (not a PyPI candidate)"))
            continue
        gov = _governing_canonical(pkg, canonicals)
        if gov is None:
            nonq.append((pkg, "no governing canonical sim in docs/sim-specs §13"))
            continue
        if not canonicals[gov]["flags"].get("pypi", False):
            nonq.append((pkg, f"governing canonical '{gov}' declares pypi:false (§13)"))
            continue
        doc = tomllib.loads(pp.read_text(encoding="utf-8"))
        proj = doc.get("project", {})
        deps = proj.get("dependencies", [])
        sims.append(
            SimSpec(
                name=pkg,
                category=canonicals[gov]["category"],
                stack=_infer_stack(deps),
                path=pkg_dir,
                metadata={
                    "governing_canonical": gov,
                    "pyproject": str(pp.relative_to(REPO_ROOT)),
                    "project_name": proj.get("name", pkg),
                },
            )
        )
    for name, reason in nonq:
        print(f"non-qualifying: {name}: {reason}", file=sys.stderr)
    return sims


# --- Per-sim validation routing (MEASURED at the 5.3 dispatch) -------------
#
# capture_roundtrip → fresh-venv re-emit + compare_captures vs the committed
#   canonical (.json manifest path; tolerance resolved from tolerance.toml).
# golden_table_surrogate → the installed wheel must pass the sim's own committed
#   golden-anchor test suite (R3: no committed .h5 / verified by golden anchors).

VALIDATION_ROUTING: dict[str, dict[str, Any]] = {
    # --- capture_roundtrip (committed canonical .h5 + a re-emit surface) ---
    "ising-classical": {
        "method": "capture_roundtrip",
        "import": "ising_classical",
        "reemit": {
            "kind": "sim_runner_seeded",
            "module": "ising_classical.sim",
            "seed": 42,
        },
        "canonical": "captures/ising-classical-ref/metropolis-128sq-T2.27-seed42-step10000.json",
        "tolerance_key": "lattice-spin (default 0.0/0.0)",
    },
    "articulated-pedagogical": {
        "method": "capture_roundtrip",
        "import": "articulated_pedagogical",
        "reemit": {
            "kind": "sim_runner_seeded",
            "module": "articulated_pedagogical.sim",
            "seed": 42,
        },
        "canonical": "captures/rigid-body-pedagogical-ref/pendulum-trajectory-seed42-step1000.json",
        "tolerance_key": "rigid-body (default 0.0/0.0); capture sim.name=rigid-body-pedagogical",
    },
    "articulated-pedagogical-diff": {
        "method": "capture_roundtrip",
        "import": "articulated_pedagogical_diff",
        "reemit": {
            "kind": "default_capture",
            "module": "articulated_pedagogical_diff.capture",
        },
        "canonical": "captures/articulated-pedagogical-diff-ref/"
        "articulated-pedagogical-diff-recover-state-seed42.json",
        "tolerance_key": "rigid-body (default 0.0/0.0)",
    },
    "mpm-multimaterial": {
        "method": "capture_roundtrip",
        "import": "mpm_multimaterial",
        "reemit": {
            "kind": "sim_runner_seeded",
            "module": "mpm_multimaterial.sim",
            "seed": 42,
        },
        "canonical": "captures/mpm-ref/drop-impact-128cube-seed42-step500.json",
        "tolerance_key": "overrides.mpm-multimaterial → mpm 1e-4/0.0",
    },
    "mpm-multimaterial-stack-d": {
        "method": "capture_roundtrip",
        "import": "mpm_multimaterial_stack_d",
        "reemit": {
            "kind": "sim_runner_seeded",
            "module": "mpm_multimaterial_stack_d.sim",
            "seed": 42,
        },
        "canonical": "captures/mpm-multimaterial-stack-d/drop-impact-128cube-seed42-step500.json",
        "tolerance_key": "overrides.mpm-multimaterial → mpm 1e-4/0.0",
    },
    "mpm-multimaterial-stack-e": {
        "method": "capture_roundtrip",
        "import": "mpm_multimaterial_stack_e",
        "reemit": {
            "kind": "sim_runner_seeded",
            "module": "mpm_multimaterial_stack_e.sim",
            "seed": 42,
        },
        "canonical": "captures/mpm-multimaterial-stack-e/drop-impact-128cube-seed42-step500.json",
        "tolerance_key": "overrides.mpm-multimaterial → mpm 1e-4/0.0",
    },
    "neural-ca": {
        "method": "capture_roundtrip",
        "import": "neural_ca",
        "reemit": {
            "kind": "module_main",
            "module": "neural_ca",
            "args": [
                "infer",
                "--grid",
                "64",
                "--steps",
                "1000",
                "--seed",
                "42",
                "--capture-every",
                "50",
            ],
            "checkpoint": "tools/testkit/golden/checkpoints/neural-ca-emoji-disk.safetensors",
            "needs_lfs_checkpoint": True,
        },
        "canonical": "captures/neural-ca-ref/growing-emoji-64sq-seed42-step1000.json",
        "tolerance_key": "continuous-ca (default — MEASURED + added at this dispatch)",
        "precondition": "[defaults.continuous-ca] tolerance row (R3 §C-6); needs the LFS checkpoint",
    },
    # --- golden_table_surrogate (no committed .h5; golden-anchor verified) ---
    "lenia": {
        "method": "golden_table_surrogate",
        "import": "lenia",
        "surrogate": "Quad4-kernel + Orbium-trajectory golden anchors "
        "(tests/test_kernel_anchors.py vs lenia-kernel/orbium golden tables).",
    },
    "lenia-diff": {
        "method": "golden_table_surrogate",
        "import": "lenia_diff",
        "surrogate": "gradient-golden anchors (analytic/FD on the differentiable engine).",
    },
    "mpm-multimaterial-diff": {
        "method": "golden_table_surrogate",
        "import": "mpm_multimaterial_diff",
        "surrogate": "gradient-golden anchors (no committed -diff capture).",
    },
    "particle-lenia": {
        "method": "golden_table_surrogate",
        "import": "particle_lenia",
        "surrogate": "force-analytic / energy-translation golden anchors.",
    },
    "flow-lenia": {
        "method": "golden_table_surrogate",
        "import": "flow_lenia",
        "surrogate": "mass-conservation / zero-flow-residual golden anchors.",
    },
    "pinn-poisson": {
        "method": "golden_table_surrogate",
        "import": "pinn_poisson",
        "surrogate": "analytic-L2 + classical-FD-L2 on the frozen network "
        "(pinn-poisson-canonical.json).",
    },
    "3dgs-mpm": {
        "method": "golden_table_surrogate",
        "import": "gs_mpm",
        "surrogate": "coupling golden (3dgs-mpm-coupling.json) + render-similarity gate.",
    },
    "3dgs-mpm-sh-update": {
        "method": "golden_table_surrogate",
        "import": "gs_mpm_sh_update",
        "surrogate": "SH-rotation Wigner-D golden (3dgs-mpm-sh-rotation.json).",
    },
}


def validation_route(sim_name: str) -> dict[str, Any] | None:
    return VALIDATION_ROUTING.get(sim_name)


# --- Build (wheelhouse) ----------------------------------------------------


def _workspace_members() -> dict[str, Path]:
    """Map project-name → pyproject path for every workspace member (sims,
    commons, tools). Used to compute the build closure for a sim's wheelhouse."""
    members: dict[str, Path] = {}
    roots = [
        *PACKAGES_ROOT.glob("*/pyproject.toml"),
        *PACKAGES_ROOT.glob("*/python/pyproject.toml"),
        *(REPO_ROOT / "common").glob("*/pyproject.toml"),
        *(REPO_ROOT / "tools").glob("*/pyproject.toml"),
    ]
    for pp in roots:
        try:
            name = (
                tomllib.loads(pp.read_text(encoding="utf-8"))
                .get("project", {})
                .get("name")
            )
        except (OSError, tomllib.TOMLDecodeError):
            continue
        if name:
            members[name] = pp
    return members


def _workspace_dep_closure(sim_pyproject: Path) -> list[str]:
    """Deps-first closure of workspace-member dependencies for a sim (the
    sim's own wheel is built separately). Variants depend on their base sim,
    which itself depends on the infra/commons — all resolved transitively."""
    members = _workspace_members()
    start_name = (
        tomllib.loads(sim_pyproject.read_text(encoding="utf-8"))
        .get("project", {})
        .get("name", "")
    )
    order: list[str] = []
    seen: set[str] = {start_name}

    def visit(pp: Path) -> None:
        proj = tomllib.loads(pp.read_text(encoding="utf-8")).get("project", {})
        deps = list(proj.get("dependencies", []))
        # Also include workspace-source siblings declared as OPTIONAL/dev deps.
        # A -diff variant declares its base sim as a dev-only dependency (e.g.
        # lenia-diff's `dev` extra carries `lenia`, imported by the WU-F forward-
        # equivalence test). The §3.8 golden surrogate installs `{wheel}[dev]`, so
        # that sibling must be in the wheelhouse — else the dev install can't
        # resolve it, the harness falls back to a no-dev install, and pytest
        # COLLECTION of the sibling-importing test file fails (sinking the whole
        # run even though the golden-anchor test the `-k` filter targets does not
        # import the sibling). This completes the checkpoint's stated wheelhouse-
        # closure intent ("a variant like -diff gets its base-sim sibling").
        for extra_deps in proj.get("optional-dependencies", {}).values():
            deps.extend(extra_deps)
        for spec in deps:
            dep_name = (
                spec.split(";")[0]
                .split("[")[0]
                .split(">")[0]
                .split("=")[0]
                .split("<")[0]
                .split("~")[0]
                .strip()
            )
            if dep_name in members and dep_name not in seen:
                seen.add(dep_name)
                visit(members[dep_name])  # deps-first
                order.append(dep_name)

    visit(sim_pyproject)
    # Union with the infra baseline (defensive: transitively-imported commons).
    for pkg in INFRA_PACKAGES:
        if pkg not in seen:
            order.append(pkg)
    return order


def build_wheelhouse_deps(sim: SimSpec, wheelhouse: Path) -> list[str]:
    """Build every workspace-source dependency of the sim into the wheelhouse."""
    wheelhouse.mkdir(parents=True, exist_ok=True)
    notes: list[str] = []
    sim_pp = REPO_ROOT / sim.metadata["pyproject"]
    for pkg in _workspace_dep_closure(sim_pp):
        rc = subprocess.run(
            ["uv", "build", "--package", pkg, "--wheel", "-o", str(wheelhouse)],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
        )
        if rc.returncode != 0:
            notes.append(f"dep build FAILED {pkg}: {rc.stderr.strip()[-300:]}")
        else:
            notes.append(f"dep wheel: {pkg}")
    return notes


def build_sim_wheel(sim: SimSpec, wheelhouse: Path) -> tuple[Path | None, str]:
    project_name = sim.metadata.get("project_name", sim.name)
    rc = subprocess.run(
        ["uv", "build", "--package", project_name, "--wheel", "-o", str(wheelhouse)],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
    )
    if rc.returncode != 0:
        return None, f"wheel build FAILED: {rc.stderr.strip()[-600:]}"
    dist = sorted(wheelhouse.glob(f"{project_name.replace('-', '_')}-*.whl"))
    if not dist:
        return None, f"wheel built but not found for {project_name}"
    return dist[-1], f"wheel built: {dist[-1].name}"


# --- Bootstrap validation (the spec § 3.8 gate) ----------------------------


def _make_fresh_venv(where: Path) -> Path:
    if where.exists():
        shutil.rmtree(where)
    venv.EnvBuilder(with_pip=True, clear=True).create(where)
    return where / "bin" / "python"


def _run(cmd: list[str], **kw: Any) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def _capture_roundtrip(
    sim: SimSpec, wheel: Path, wheelhouse: Path, work: Path
) -> tuple[bool, str]:
    route = VALIDATION_ROUTING[sim.name]
    py = _make_fresh_venv(work / "venv")
    inst = _run(
        [
            str(py),
            "-m",
            "pip",
            "install",
            "-q",
            "--find-links",
            str(wheelhouse),
            str(wheel),
        ]
    )
    if inst.returncode != 0:
        return False, f"fresh-venv install FAILED: {inst.stderr.strip()[-600:]}"

    reemit_dir = work / "reemit"
    reemit_dir.mkdir(parents=True, exist_ok=True)
    r = route["reemit"]
    import_name = route["import"]
    if r["kind"] == "module_main":
        # Roll a frozen LFS checkpoint forward via the INSTALLED console module
        # (neural-ca: `python -m neural_ca infer …`). The checkpoint is fixed input
        # data read from the repo working tree (LFS-materialized), exactly like the
        # in-repo canonical — the gate tests the INSTALLED code re-emitting from it.
        ckpt = REPO_ROOT / r["checkpoint"]
        if not ckpt.exists():
            return False, f"re-emit checkpoint missing (LFS not fetched?): {ckpt}"
        loc = _run([str(py), "-c", f"import {import_name} as p; print(p.__file__)"])
        if loc.returncode != 0 or "site-packages" not in loc.stdout:
            return (
                False,
                f"installed package not isolated: {(loc.stdout or loc.stderr).strip()[-300:]}",
            )
        emit = _run(
            [
                str(py),
                "-m",
                r["module"],
                *r["args"],
                "--checkpoint",
                str(ckpt),
                "--out",
                str(reemit_dir),
            ]
        )
        if emit.returncode != 0:
            return (
                False,
                f"fresh-venv re-emit FAILED: {(emit.stderr or emit.stdout).strip()[-700:]}",
            )
        # The CLI writes <descriptor>.{h5,json}; the descriptor matches the
        # canonical basename (same grid/seed/steps), so resolve the manifest there.
        reemit_manifest = str(reemit_dir / Path(route["canonical"]).name)
        if not Path(reemit_manifest).exists():
            found = sorted(str(p) for p in reemit_dir.glob("*.json"))
            return (
                False,
                f"re-emit wrote no manifest at {reemit_manifest}; found {found}",
            )
    elif r["kind"] in ("sim_runner_seeded", "default_capture"):
        if r["kind"] == "sim_runner_seeded":
            snippet = (
                f"import sys, pathlib\n"
                f"import {import_name} as _pkg\n"
                f"assert 'site-packages' in _pkg.__file__, _pkg.__file__\n"
                f"from {r['module']} import sim_runner_seeded\n"
                f"m = sim_runner_seeded({r['seed']}, pathlib.Path(sys.argv[1]))\n"
                f"print(m)\n"
            )
        else:
            snippet = (
                f"import sys, pathlib\n"
                f"import {import_name} as _pkg\n"
                f"assert 'site-packages' in _pkg.__file__, _pkg.__file__\n"
                f"from {r['module']} import default_capture\n"
                f"m = default_capture(pathlib.Path(sys.argv[1]))\n"
                f"print(m)\n"
            )
        emit = _run([str(py), "-c", snippet, str(reemit_dir)])
        if emit.returncode != 0:
            return (
                False,
                f"fresh-venv re-emit FAILED: {(emit.stderr or emit.stdout).strip()[-700:]}",
            )
        reemit_manifest = emit.stdout.strip().splitlines()[-1]
    else:
        return False, f"re-emit kind {r['kind']!r} not wired for {sim.name}"

    # Compare host-side (the equivalence harness lives in the repo workspace).
    cmp_snippet = (
        "import sys, pathlib\n"
        "from equivalence.harness import compare_captures\n"
        "v = compare_captures(pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), "
        "pathlib.Path(sys.argv[3]))\n"
        "mx = max((d['max_abs_err'] for d in v.per_field_diff.values()), default=0.0)\n"
        "mr = max((d['max_rel_err'] for d in v.per_field_diff.values()), default=0.0)\n"
        "print(f'{v.within_tolerance}|{mx}|{mr}|{len(v.per_field_diff)}')\n"
    )
    cmp = _run(
        [
            "uv",
            "run",
            # --no-sync: inherit the caller-prepared env (CI syncs
            # bit-physics-testkit; a bare re-sync would strip it — the
            # workspace root has no default deps). P6-FPEDGE latent-break fix.
            "--no-sync",
            "python",
            "-c",
            cmp_snippet,
            str(REPO_ROOT / route["canonical"]),
            reemit_manifest,
            str(TOLERANCE_TABLE),
        ],
        cwd=REPO_ROOT,
    )
    if cmp.returncode != 0:
        return (
            False,
            f"compare_captures FAILED: {(cmp.stderr or cmp.stdout).strip()[-700:]}",
        )
    verdict = cmp.stdout.strip().splitlines()[-1]
    within, mx, mr, nf = verdict.split("|")
    ok = within == "True"
    return (
        ok,
        f"compare_captures within_tolerance={within} max_abs={mx} max_rel={mr} fields={nf}",
    )


def _golden_table_surrogate(
    sim: SimSpec, wheel: Path, wheelhouse: Path, work: Path
) -> tuple[bool, str]:
    route = VALIDATION_ROUTING[sim.name]
    py = _make_fresh_venv(work / "venv")
    inst = _run(
        [
            str(py),
            "-m",
            "pip",
            "install",
            "-q",
            "--find-links",
            str(wheelhouse),
            f"{wheel}[dev]",
        ]
    )
    if inst.returncode != 0:
        # retry without the dev extra (pytest may resolve from the public index)
        inst = _run(
            [
                str(py),
                "-m",
                "pip",
                "install",
                "-q",
                "pytest",
                "--find-links",
                str(wheelhouse),
                str(wheel),
            ]
        )
        if inst.returncode != 0:
            return False, f"fresh-venv install FAILED: {inst.stderr.strip()[-600:]}"

    # Confirm the installed package resolves to site-packages, not the repo tree.
    loc = _run([str(py), "-c", f"import {route['import']} as p; print(p.__file__)"])
    if loc.returncode != 0 or "site-packages" not in loc.stdout:
        return (
            False,
            f"installed package not isolated: {(loc.stdout or loc.stderr).strip()[-300:]}",
        )

    # Run the sim's OWN committed golden-anchor tests against the installed wheel.
    test_dir = sim.path / "tests"
    rc = _run(
        [
            str(py),
            "-m",
            "pytest",
            str(test_dir),
            "-q",
            "-p",
            "no:cacheprovider",
            "-k",
            "golden or anchor or kernel or conserv or force or coupling or rotation or analytic",
        ],
        cwd=REPO_ROOT,
    )
    tail = (rc.stdout or rc.stderr).strip().splitlines()[-3:]
    if rc.returncode == 0:
        return (
            True,
            f"golden-anchor surrogate PASS ({route['surrogate']}) :: "
            + " | ".join(tail),
        )
    # exit-5 = no tests selected by -k; fall back to the full suite
    if rc.returncode == 5:
        rc2 = _run(
            [str(py), "-m", "pytest", str(test_dir), "-q", "-p", "no:cacheprovider"],
            cwd=REPO_ROOT,
        )
        tail2 = (rc2.stdout or rc2.stderr).strip().splitlines()[-3:]
        return rc2.returncode == 0, "golden surrogate (full suite) :: " + " | ".join(
            tail2
        )
    return False, "golden-anchor surrogate FAIL :: " + " | ".join(tail)


def run_pipeline_for_sim(sim: SimSpec, output_dir: Path) -> PipelineResult:
    """Build the wheel, install it in a fresh venv, validate via the § 3.8 gate."""
    t0 = time.monotonic()
    output_dir.mkdir(parents=True, exist_ok=True)
    wheelhouse = output_dir / "wheelhouse"
    build_wheelhouse_deps(sim, wheelhouse)
    wheel, build_note = build_sim_wheel(sim, wheelhouse)
    if wheel is None:
        return PipelineResult(
            sim, "fail", None, False, time.monotonic() - t0, build_note
        )

    route = VALIDATION_ROUTING.get(sim.name)
    if route is None:
        return PipelineResult(
            sim, "fail", wheel, False, time.monotonic() - t0, "no validation route"
        )
    work = output_dir / "work"
    try:
        if route["method"] == "capture_roundtrip":
            ok, note = _capture_roundtrip(sim, wheel, wheelhouse, work)
        else:
            ok, note = _golden_table_surrogate(sim, wheel, wheelhouse, work)
    except Exception as exc:  # defensive: bootstrap is subprocess-heavy
        ok, note = False, f"bootstrap exception: {exc!r}"
    finally:
        # Reclaim disk: the fresh venv (incl. torch/taichi/warp) is large; the
        # small wheelhouse is kept for the CI upload-artifact step.
        shutil.rmtree(work / "venv", ignore_errors=True)
    dt = time.monotonic() - t0
    return PipelineResult(
        sim, "pass" if ok else "fail", wheel, ok, dt, f"{build_note}; {note}"
    )


def assemble_deploy_artifact(results: list[PipelineResult], output_dir: Path) -> Path:
    """Combine per-sim wheels into a dist bundle. NOT exercised by the CI gate
    (the deploy job is gated off; § 4.5). Present for the post-phase go-live."""
    bundle = output_dir / "dist"
    bundle.mkdir(parents=True, exist_ok=True)
    for r in results:
        if r.artifact_path and r.artifact_path.exists():
            shutil.copy2(r.artifact_path, bundle / r.artifact_path.name)
    return bundle


# --- Results JSON (§ 5.5) --------------------------------------------------


def results_to_json(
    results: list[PipelineResult],
    *,
    sub_phase: str,
    commit_sha: str,
    non_qualifying: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    sim_results = {
        r.sim.name: {
            "status": r.status,
            "duration_seconds": round(r.duration_seconds, 3),
            "artifact_path": str(r.artifact_path) if r.artifact_path else None,
            "capture_validated": r.capture_validated,
            "notes": r.notes,
        }
        for r in results
    }
    fail = sum(1 for r in results if r.status == "fail")
    deferred = sum(1 for r in results if r.status == "deferred")
    passed = sum(1 for r in results if r.status == "pass")
    return {
        "sub_phase": sub_phase,
        "commit_sha": commit_sha,
        "qualifying_sims": [r.sim.name for r in results],
        "non_qualifying": non_qualifying or [],
        "sim_results": sim_results,
        "overall_status": "fail" if fail else "pass",
        "deferred_count": deferred,
        "fail_count": fail,
        "pass_count": passed,
    }


def _head_sha() -> str:
    rc = _run(["git", "rev-parse", "HEAD"], cwd=REPO_ROOT)
    return rc.stdout.strip() if rc.returncode == 0 else "unknown"


# --- CLI -------------------------------------------------------------------


def main_discover(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(prog="pipeline discover")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args(argv)
    sims = discover_qualifying_sims()
    if args.json:
        print(
            json.dumps(
                [
                    {
                        "name": s.name,
                        "category": s.category,
                        "stack": s.stack,
                        "path": str(s.path.relative_to(REPO_ROOT)),
                        "metadata": s.metadata,
                        "validation": validation_route(s.name),
                    }
                    for s in sims
                ],
                indent=2,
            )
        )
    else:
        for s in sims:
            route = validation_route(s.name)
            print(
                f"{s.name}\t{s.category}\tStack-{s.stack}\t{route['method'] if route else '?'}"
            )
    return 0 if sims else 2


def main_build(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(prog="pipeline build")
    ap.add_argument("--sims-json", required=True)
    ap.add_argument("--output", required=True)
    args = ap.parse_args(argv)
    out = Path(args.output)
    spec_names = {d["name"] for d in json.loads(Path(args.sims_json).read_text())}
    sims = [s for s in discover_qualifying_sims() if s.name in spec_names]
    wheelhouse = out / "wheelhouse"
    status = {}
    for s in sims:
        build_wheelhouse_deps(s, wheelhouse)
        wheel, note = build_sim_wheel(s, wheelhouse)
        status[s.name] = {"wheel": str(wheel) if wheel else None, "note": note}
    print(json.dumps(status, indent=2))
    return 0


def main_validate(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(prog="pipeline validate")
    ap.add_argument("--artifacts", required=True)
    ap.add_argument("--sim", help="validate a single sim by name (matrix job)")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args(argv)
    out = Path(args.artifacts)
    sims = discover_qualifying_sims()
    if args.sim:
        sims = [s for s in sims if s.name == args.sim]
        if not sims:
            print(f"unknown sim: {args.sim}", file=sys.stderr)
            return 2
    results = [run_pipeline_for_sim(s, out / s.name) for s in sims]
    payload = results_to_json(results, sub_phase="pypi-release", commit_sha=_head_sha())
    if args.json:
        print(json.dumps(payload, indent=2))
    else:
        for r in results:
            print(
                f"{r.sim.name}\t{r.status}\t{r.duration_seconds:.1f}s\t{r.notes[:120]}"
            )
    return 0 if payload["overall_status"] == "pass" else 1


def main(argv: list[str] | None = None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    if not argv:
        print("usage: pipeline.py {discover|build|validate} ...", file=sys.stderr)
        return 2
    verb, rest = argv[0], argv[1:]
    if verb == "discover":
        return main_discover(rest)
    if verb == "build":
        return main_build(rest)
    if verb == "validate":
        return main_validate(rest)
    print(f"unknown verb: {verb}", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
