"""Phase-5 binary-release pipeline (phase plan § 5.5 shape; § 6.2 criteria).

Build-and-validate native binaries for every qualifying Stack-C (C++ / Vulkan)
sim and re-verify correctness via the spec § 3.8 bootstrap gate: configure +
build the sim's headless capture executable in a CLEAN out-of-tree CMake build
dir (the isolation boundary), run the binary to re-emit the canonical capture,
and judge per the R1/R3 routing:

  * capture_roundtrip (reaction-diffusion-2d-stack-c) — re-emit from the built
    binary, then ``equivalence.harness.compare_captures(canonical, reemit)``
    (R1: PROGRAMMATIC, NOT a CLI). Deterministic C++/f64 → expect bit-exact
    0.0/0.0 at the resolved ``reaction-diffusion`` tolerance row.
  * witness_pbt_surrogate (mass-spring-cloth) — the soft-body sim has no NumPy
    oracle and no ``compare_captures`` tolerance op; its § 3.8 surrogate
    (reconciliation §R3) is the IN-BINARY 2-run determinism witness (the binary
    self-asserts bit-identical re-run via ``assert_determinism``) + the
    Hypothesis PBT re-check against the built binary. NEVER a fabricated
    tolerance row. The committed ``.h5`` payload checksum is same-hw (R-CPPB2);
    its cross-build drift is recorded informationally, NOT gated.

§ 0.3 SHIFTs from the plan's Appendix-C STEP-5a recipe (MEASURED this dispatch):
  * No Docker in the build environment → the clean out-of-tree CMake build dir is
    the isolation boundary (analogous to 5.3's fresh-venv). Perf-ledger label is
    ``binary-cmake-<os>`` (the plan's ``binary-docker-<os>`` env label, de-Docker'd).
  * The STEP-5a ``python -m testkit.equivalence`` CLI is FALSIFIED (R1) — the
    round-trip calls the programmatic ``compare_captures(json, json)``.
  * Local cmake ≥ 4.0 dropped pre-3.5 policy compat that the vendored doctest
    needs; ``-DCMAKE_POLICY_VERSION_MINIMUM=3.5`` is passed (a no-op cache var on
    CI's older cmake).

Invoked by PATH (the ``tools/dispatch/preflight-phase.py`` precedent), because the
``binary-release/`` tool dir is hyphenated and not an importable module:

    python tools/productization/binary-release/pipeline.py discover --json
    python tools/productization/binary-release/pipeline.py validate --artifacts OUT --sim NAME

NO publish: the ``deploy`` job in binary-release.yml is gated off (§ 4.3 / § 4.5).
This module never drafts a GitHub Release.
"""

from __future__ import annotations

import argparse
import contextlib
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

REPO_ROOT = Path(__file__).resolve().parents[3]
SPEC_ROOT = REPO_ROOT / "docs" / "sim-specs"
PACKAGES_ROOT = REPO_ROOT / "packages"
TESTKIT_ROOT = REPO_ROOT / "tools" / "testkit"
TOLERANCE_TABLE = TESTKIT_ROOT / "equivalence" / "tolerance.toml"

# Lavapipe (software Vulkan) determinism pin — D14/D4; mirrors the cpp-strict CTest
# ENVIRONMENT properties + the gate-14 / PBT python drivers.
LAVAPIPE_ICD = "/usr/share/vulkan/icd.d/lvp_icd.json"
LAVAPIPE_ENV = {"VK_DRIVER_FILES": LAVAPIPE_ICD, "LP_NUM_THREADS": "0"}

# Local cmake ≥ 4.0 removed pre-3.5 policy compat the vendored doctest declares;
# a no-op cache var on CI's older apt cmake (which builds cpp-strict green today).
CMAKE_POLICY_FLAG = "-DCMAKE_POLICY_VERSION_MINIMUM=3.5"


@dataclass(frozen=True)
class SimSpec:
    name: str
    category: str
    stack: str  # always 'C' for binary-release
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


# --- Per-package bootstrap routing (MEASURED at the 5.2 dispatch) ----------
#
# The two Stack-C CMake packages (reconciliation §C). Keyed by package name; the
# discovery cross-checks the LIVE CMake-capture pool against this table (a third
# C++ package would surface as an un-routed SHIFT, failing the smoke contract).

BINARY_ROUTING: dict[str, dict[str, Any]] = {
    "reaction-diffusion-2d-stack-c": {
        "method": "capture_roundtrip",
        "target": "bit_physics_rd2d_stack_c_capture",
        "category": "continuous-ca",
        "descriptor": "gray-scott-lambda-128sq-seed42-step2000",
        # The binary reads grid/seed/steps from a reference manifest (argv[1]) and
        # writes the re-emit to argv[2]; the in-repo Stack-C canonical is both the
        # config source and the round-trip LEFT operand.
        "binary_args": "ref_then_out",
        "canonical": "captures/reaction-diffusion-2d-stack-c/"
        "gray-scott-lambda-128sq-seed42-step2000.json",
        "tolerance_key": "reaction-diffusion (overrides.reaction-diffusion-2d → "
        "1e-4/0.0); deterministic C++/f64 → expect bit-exact 0.0/0.0",
    },
    "mass-spring-cloth": {
        "method": "witness_pbt_surrogate",
        "target": "bit_physics_mass_spring_cloth_capture",
        "category": "soft-body",
        "descriptor": "flag-wind-128x128-seed42-step1000",
        # Default args == the canonical descriptor; assert_determinism (default ON)
        # runs the trajectory twice and asserts bit-identical (tolerance 0.0).
        "binary_args": "out_only",
        "pbt": "packages/mass-spring-cloth/tests/python/test_pbt_invariants.py",
        # The committed .h5 payload sha256 is same-hw (R-CPPB2); cross-build drift
        # is EXPECTED and recorded informationally, never gated.
        "canonical": "captures/mass-spring-cloth-ref/flag-wind-128x128-seed42-step1000.json",
        "payload_checksum_gated": False,
        "surrogate": "in-binary 2-run determinism witness (assert_determinism) + "
        "Hypothesis PBT re-check; no NumPy oracle / no compare_captures soft-body "
        "op (reconciliation §R3)",
    },
}


def validation_route(sim_name: str) -> dict[str, Any] | None:
    return BINARY_ROUTING.get(sim_name)


# --- §13 opt-out discovery -------------------------------------------------


def _parse_productization_block(text: str) -> dict[str, bool] | None:
    """Extract the five-boolean ``productization:`` YAML block from a spec-ref."""
    flags: dict[str, bool] = {}
    in_block = False
    for line in text.splitlines():
        if line.strip() == "productization:":
            in_block = True
            continue
        if in_block:
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            if not line.startswith(("  ", "\t")):
                break
            key, _, rest = stripped.partition(":")
            val = rest.split("#", 1)[0].strip().lower()
            if val in {"true", "false"}:
                flags[key.strip()] = val == "true"
    return flags or None


def _own_spec(pkg: str) -> tuple[str | None, dict[str, bool] | None]:
    """The package's OWN spec-ref (category, §13 flags), or (None, None).

    Only a package's own spec-ref can opt it out of binary-release. The Stack-C
    ports that share a canonical's spec dir (rd2d-stack-c shares the Stack-B
    reaction-diffusion-2d spec, whose binary:false refers to the WEB sim) have no
    own spec-ref → they are NOT opted out by the unrelated canonical flag. This is
    the honest landed-reality rule; reconciliation §C ratifies rd2d-stack-c as the
    full 5.2 package (a documented §0.3 SHIFT from naïve canonical-flag inheritance).
    """
    for spec in SPEC_ROOT.glob(f"*/{pkg}/spec-ref.md"):
        category = spec.parent.parent.name
        return category, _parse_productization_block(spec.read_text(encoding="utf-8"))
    return None, None


_CAPTURE_TARGET_RE = re.compile(
    r"add_executable\(\s*([A-Za-z0-9_]*_capture)\b", re.MULTILINE
)


def _capture_target(cmakelists_text: str) -> str | None:
    m = _CAPTURE_TARGET_RE.search(cmakelists_text)
    return m.group(1) if m else None


def discover_qualifying_sims() -> list[SimSpec]:
    """Walk packages/ and return Stack-C sims with a CMake headless-capture target
    that are not opted out (§ 6.2). Non-qualifying packages report via stderr; a
    capture package missing from BINARY_ROUTING is surfaced as a §0.3 SHIFT."""
    sims: list[SimSpec] = []
    nonq: list[tuple[str, str]] = []
    for pkg_dir in sorted(p for p in PACKAGES_ROOT.iterdir() if p.is_dir()):
        pkg = pkg_dir.name
        cml = pkg_dir / "CMakeLists.txt"
        if not cml.exists():
            continue  # not a Stack-C CMake package (Python-only → 5.3, not 5.2)
        target = _capture_target(cml.read_text(encoding="utf-8"))
        if target is None:
            nonq.append((pkg, "CMakeLists has no *_capture executable target"))
            continue
        category, flags = _own_spec(pkg)
        if flags is not None and flags.get("binary") is False:
            nonq.append((pkg, "own §13 declares binary:false → DEFERRED"))
            continue
        route = BINARY_ROUTING.get(pkg)
        if route is None:
            print(
                f"SHIFT: {pkg} has a CMake capture target ({target}) but no "
                f"binary-release routing — a new Stack-C package; surface per §0.3.",
                file=sys.stderr,
            )
        sims.append(
            SimSpec(
                name=pkg,
                category=(route or {}).get("category") or category or "unknown",
                stack="C",
                path=pkg_dir,
                metadata={
                    "cmake_target": (route or {}).get("target") or target,
                    "cmakelists": str(cml.relative_to(REPO_ROOT)),
                    "method": (route or {}).get("method"),
                },
            )
        )
    for name, reason in nonq:
        print(f"non-qualifying: {name}: {reason}", file=sys.stderr)
    return sims


def non_qualifying_report() -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    for pkg_dir in sorted(p for p in PACKAGES_ROOT.iterdir() if p.is_dir()):
        cml = pkg_dir / "CMakeLists.txt"
        if not cml.exists():
            continue
        if _capture_target(cml.read_text(encoding="utf-8")) is None:
            out.append({"name": pkg_dir.name, "reason": "no *_capture target"})
            continue
        _, flags = _own_spec(pkg_dir.name)
        if flags is not None and flags.get("binary") is False:
            out.append({"name": pkg_dir.name, "reason": "own §13 binary:false"})
    return out


# --- Build (clean out-of-tree CMake) ---------------------------------------


def _run(cmd: list[str], **kw: Any) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def configure_and_build(sim: SimSpec, build_dir: Path) -> tuple[Path | None, str]:
    """Clean-configure the top-level CMake tree and build the sim's capture target.

    The fresh build dir is the bootstrap isolation boundary (no Docker; §0.3)."""
    target = sim.metadata["cmake_target"]
    if build_dir.exists():
        shutil.rmtree(build_dir)
    build_dir.mkdir(parents=True, exist_ok=True)
    cfg = _run(
        ["cmake", "-S", str(REPO_ROOT), "-B", str(build_dir), CMAKE_POLICY_FLAG],
        cwd=REPO_ROOT,
    )
    if cfg.returncode != 0:
        return (
            None,
            f"cmake configure FAILED: {(cfg.stderr or cfg.stdout).strip()[-600:]}",
        )
    jobs = str(os.cpu_count() or 4)
    bld = _run(
        ["cmake", "--build", str(build_dir), "--target", target, "-j", jobs],
        cwd=REPO_ROOT,
    )
    if bld.returncode != 0:
        return None, f"cmake build FAILED: {(bld.stderr or bld.stdout).strip()[-600:]}"
    matches = sorted(
        p for p in build_dir.rglob(target) if p.is_file() and os.access(p, os.X_OK)
    )
    if not matches:
        return None, f"built but capture binary {target!r} not found under {build_dir}"
    return matches[0], f"built {target} ({matches[0].relative_to(build_dir)})"


# --- Bootstrap validation (the spec § 3.8 gate) ----------------------------


def _capture_roundtrip(sim: SimSpec, binary: Path, work: Path) -> tuple[bool, str]:
    route = BINARY_ROUTING[sim.name]
    canon = REPO_ROOT / route["canonical"]
    work.mkdir(parents=True, exist_ok=True)
    out = work / Path(route["canonical"]).name
    env = {**os.environ, **LAVAPIPE_ENV}
    emit = _run([str(binary), str(canon), str(out)], env=env)
    if emit.returncode != 0:
        return False, f"re-emit FAILED: {(emit.stderr or emit.stdout).strip()[-600:]}"
    if not out.exists():
        return False, f"binary emitted no manifest at {out}"
    reemit_h5 = out.with_suffix(".h5")
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
            "--no-sync",
            "python",
            "-c",
            cmp_snippet,
            str(canon),
            str(out),
            str(TOLERANCE_TABLE),
        ],
        cwd=TESTKIT_ROOT,
    )
    if cmp.returncode != 0:
        return (
            False,
            f"compare_captures FAILED: {(cmp.stderr or cmp.stdout).strip()[-600:]}",
        )
    within, mx, mr, nf = cmp.stdout.strip().splitlines()[-1].split("|")
    ok = within == "True"
    bin_sha = _sha256(binary)
    reemit_sha = _sha256(reemit_h5) if reemit_h5.exists() else "n/a"
    return ok, (
        f"compare_captures within_tolerance={within} max_abs={mx} max_rel={mr} "
        f"fields={nf}; binary_sha256={bin_sha}; reemit_h5_sha256={reemit_sha}"
    )


def _witness_pbt_surrogate(sim: SimSpec, binary: Path, work: Path) -> tuple[bool, str]:
    route = BINARY_ROUTING[sim.name]
    work.mkdir(parents=True, exist_ok=True)
    out = work / f"{route['descriptor']}.json"
    env = {**os.environ, **LAVAPIPE_ENV}
    # (1) in-binary witness round-trip: default args == canonical descriptor;
    # assert_determinism (default ON) runs twice and asserts bit-identical.
    emit = _run([str(binary), str(out)], env=env)
    if emit.returncode != 0:
        return False, (
            "in-binary 2-run determinism / capture FAILED: "
            f"{(emit.stderr or emit.stdout).strip()[-600:]}"
        )
    wm = re.search(r"witness=([0-9a-f]+)", emit.stdout)
    witness = wm.group(1) if wm else "unknown"
    reemit_payload = "n/a"
    with contextlib.suppress(OSError, KeyError, json.JSONDecodeError):
        reemit_payload = json.loads(out.read_text())["payload"]["checksum"]
    # (2) Hypothesis PBT re-check against the BUILT binary.
    pbt = _run(
        [
            "uv",
            "run",
            "--no-sync",
            "python",
            str(REPO_ROOT / route["pbt"]),
            str(binary),
        ],
        cwd=TESTKIT_ROOT,
        env=env,
    )
    pbt_tail = " | ".join((pbt.stdout or pbt.stderr).strip().splitlines()[-2:])
    ok = pbt.returncode == 0
    bin_sha = _sha256(binary)
    return ok, (
        f"witness={witness}; PBT_rc={pbt.returncode} :: {pbt_tail}; "
        f"binary_sha256={bin_sha}; reemit_payload={reemit_payload} "
        f"(committed payload checksum NOT gated — same-hw / R-CPPB2 cross-build drift)"
    )


def run_pipeline_for_sim(sim: SimSpec, output_dir: Path) -> PipelineResult:
    import time

    t0 = time.monotonic()
    output_dir.mkdir(parents=True, exist_ok=True)
    route = BINARY_ROUTING.get(sim.name)
    if route is None:
        return PipelineResult(
            sim,
            "deferred",
            None,
            False,
            time.monotonic() - t0,
            "no binary-release routing (un-routed Stack-C package; §0.3 SHIFT)",
        )
    binary, build_note = configure_and_build(sim, output_dir / "build")
    if binary is None:
        return PipelineResult(
            sim, "fail", None, False, time.monotonic() - t0, build_note
        )
    work = output_dir / "work"
    try:
        if route["method"] == "capture_roundtrip":
            ok, note = _capture_roundtrip(sim, binary, work)
        else:
            ok, note = _witness_pbt_surrogate(sim, binary, work)
    except Exception as exc:  # defensive: bootstrap is subprocess-heavy
        ok, note = False, f"bootstrap exception: {exc!r}"
    dt = time.monotonic() - t0
    return PipelineResult(
        sim, "pass" if ok else "fail", binary, ok, dt, f"{build_note}; {note}"
    )


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
            "method": BINARY_ROUTING.get(r.sim.name, {}).get("method"),
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
    payload = results_to_json(
        results,
        sub_phase="binary-release",
        commit_sha=_head_sha(),
        non_qualifying=non_qualifying_report(),
    )
    if args.json:
        print(json.dumps(payload, indent=2))
    else:
        for r in results:
            print(
                f"{r.sim.name}\t{r.status}\t{r.duration_seconds:.1f}s\t{r.notes[:140]}"
            )
    return 0 if payload["overall_status"] == "pass" else 1


def main(argv: list[str] | None = None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    if not argv:
        print("usage: pipeline.py {discover|validate} ...", file=sys.stderr)
        return 2
    verb, rest = argv[0], argv[1:]
    if verb == "discover":
        return main_discover(rest)
    if verb == "validate":
        return main_validate(rest)
    print(f"unknown verb: {verb}", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
