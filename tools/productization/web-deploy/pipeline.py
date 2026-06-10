"""Phase-5 web-deploy pipeline (phase plan § 5.5 shape; § 6.1 criteria; sub-phase 5.1).

Build-and-validate the 7 Stack-B web frontends (built by the web-build track) into
headless-deployable bundles and re-verify each through the BROWSER:

  1. build    — ``npm ci`` + ``vite build`` per qualifying sim → ``web/dist`` (§6.1).
  2. drive     — serve the built bundle, load it in headless Chromium with WebGPU,
                 assert the WebGPU path actually engaged (not a Canvas2D/WebGL
                 fallback), trigger the capture-export hook, extract the
                 browser-emitted capture (``web/headless/driver.mjs``).
  3. verify    — re-apply the sim's OWN established gate to the browser capture
                 (``verify.py``); NO tolerance added or widened.

The browser-WebGPU step requires a WebGPU-capable headless Chromium over a SECURE
context (localhost) — which the driver provides, so the gate RUNS LOCALLY
(ANGLE-Vulkan; probe § 4 — the web-build track's "unavailable" was an about:blank
artifact). ``--require-webgpu`` (default, and CI) makes a missing adapter a FAIL;
``--allow-webgpu-deferral`` (for a genuinely WebGPU-less box) downgrades to
``deferred`` instead. The cloud CI (``web-deploy.yml`` on ubuntu-latest + Mesa
lavapipe) runs the gate on a second, independent browser-WebGPU backend. The gate is
real and authored, never a silent DOM-load substitute.

NO publish: the ``deploy`` job in web-deploy.yml is gated off (Phase 5 ships
artifact-ready; no GitHub Pages publish).

The ``web-deploy/`` dir is hyphenated (not importable); invoked by PATH, mirroring
pypi-release / render-passes::

    python tools/productization/web-deploy/pipeline.py discover --json
    python tools/productization/web-deploy/pipeline.py build --sims-json sims.json --output OUT
    python tools/productization/web-deploy/pipeline.py validate --artifacts OUT --sim physarum --json
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

REPO = Path(__file__).resolve().parents[3]
TOOL = Path(__file__).resolve().parent
DRIVER = TOOL / "web" / "headless" / "driver.mjs"
SUB_PHASE = "web-deploy"

# The 7 Stack-B web frontends + their CHARTER-named gate kind (web-build track).
# new_canonical sims need TWO browser runs (run-twice byte-identity).
GATE_KIND = {
    "reaction-diffusion-2d": "capture_roundtrip",
    "mandelbulb-explorer": "new_canonical",
    "neural-ca": "capture_roundtrip",
    "ising-classical": "observable",
    "strange-attractors": "new_canonical",
    "boids-3d": "new_canonical",
    "physarum": "new_canonical",
}
WEB_DIR = {s: f"packages/{s}/web" for s in GATE_KIND}


@dataclass(frozen=True)
class SimSpec:
    name: str
    category: str
    stack: str
    path: Path
    metadata: dict


@dataclass(frozen=True)
class PipelineResult:
    sim: SimSpec
    status: Literal["pass", "fail", "deferred"]
    artifact_path: Path | None
    capture_validated: bool
    duration_seconds: float
    notes: str


# --------------------------------------------------------------------------- #
# Discovery (phase plan § 6.1 qualifying criteria)
# --------------------------------------------------------------------------- #
def _qualifies(web: Path) -> tuple[bool, str]:
    if not (web / "package.json").exists():
        return False, "no package.json (no Vite build)"
    main = web / "src" / "main.ts"
    if not main.exists():
        return False, "no src/main.ts entry"
    txt = main.read_text()
    if "exposeCapture" not in txt:
        return False, "no capture-export hook"
    if "createSettingsPanel" not in txt:
        return False, "no settings panel (spec §10.1)"
    return True, ""


def discover_qualifying_sims() -> list[SimSpec]:
    sims: list[SimSpec] = []
    for name, rel in sorted(WEB_DIR.items()):
        web = REPO / rel
        ok, reason = _qualifies(web)
        if not ok:
            print(f"non-qualifying: {name} — {reason}", file=sys.stderr)
            continue
        sims.append(
            SimSpec(
                name=name,
                category="stack-B",
                stack="B",
                path=web,
                metadata={
                    "gate_kind": GATE_KIND[name],
                    "web_dir": rel,
                    "runs": 2 if GATE_KIND[name] == "new_canonical" else 1,
                },
            )
        )
    return sims


# --------------------------------------------------------------------------- #
# Build + drive + verify
# --------------------------------------------------------------------------- #
def _run(cmd: list[str], cwd: Path | None = None) -> tuple[int, str]:
    p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, check=False)
    return p.returncode, (p.stdout + p.stderr)


def build_sim(sim: SimSpec) -> tuple[bool, str]:
    web = sim.path
    if not (web / "node_modules").exists():
        rc, out = _run(["npm", "ci"], cwd=web)
        if rc != 0:
            rc, out = _run(["npm", "install"], cwd=web)
            if rc != 0:
                return False, out[-1200:]
    rc, out = _run(["npx", "vite", "build"], cwd=web)
    return (rc == 0 and "built in" in out), out[-1200:]


def run_pipeline_for_sim(
    sim: SimSpec,
    output_dir: Path,
    *,
    require_webgpu: bool = True,
    skip_build: bool = False,
) -> PipelineResult:
    t0 = time.time()
    out = output_dir / sim.name
    out.mkdir(parents=True, exist_ok=True)
    dist = sim.path / "dist"

    if not skip_build:
        ok, log = build_sim(sim)
        if not ok:
            return PipelineResult(
                sim,
                "fail",
                None,
                False,
                time.time() - t0,
                f"vite build failed: {log[-400:]}",
            )
    if not dist.exists():
        return PipelineResult(
            sim, "fail", None, False, time.time() - t0, "no dist/ after build"
        )

    runs = sim.metadata["runs"]
    cmd = [
        "node",
        str(DRIVER),
        str(dist),
        sim.name,
        sim.metadata["gate_kind"],
        str(out),
        "--runs",
        str(runs),
    ]
    rc, log = _run(cmd, cwd=REPO)
    # Surface the driver log on success AND failure — stdout carries the results
    # JSON (`--json > results.json`), so the log goes to stderr. Without this the
    # driver's measured time-to-ready instrumentation is invisible on green runs
    # (run 27244441494: zero declarable readiness values).
    if log:
        print(f"--- driver log ({sim.name}) ---\n{log.rstrip()}", file=sys.stderr)
    time_to_ready_ms = [int(ms) for ms in re.findall(r"time-to-ready (\d+) ms", log)]
    bundles = sorted(out.glob("capture-*.json"))

    if rc == 42 or "WEBGPU_UNAVAILABLE" in log:
        if require_webgpu:
            return PipelineResult(
                sim,
                "fail",
                str(dist),
                False,
                time.time() - t0,
                "browser WebGPU adapter unavailable — CI must provide one "
                "(lavapipe). Real browser-delivery gate did not run.",
            )
        return PipelineResult(
            sim,
            "deferred",
            str(dist),
            False,
            time.time() - t0,
            "browser-WebGPU unavailable in this environment; gate deferred to "
            "cloud CI (web-deploy.yml). Vite build OK; bundle deployable.",
        )
    if rc != 0 or not bundles:
        return PipelineResult(
            sim,
            "fail",
            str(dist),
            False,
            time.time() - t0,
            f"driver failed (rc={rc}): {log.splitlines()[-1] if log else ''}",
        )

    # Browser capture(s) in hand → apply the sim's established gate.
    sys.path.insert(0, str(TOOL))
    import verify  # type: ignore

    res = verify.verify_browser_capture(sim.name, bundles)
    status: Literal["pass", "fail"] = "pass" if res.passed else "fail"
    return PipelineResult(
        sim,
        status,
        str(dist),
        bool(res.passed),
        time.time() - t0,
        f"{res.kind}: passed={res.passed} run_twice={res.run_twice_identical} "
        f"time_to_ready_ms={time_to_ready_ms} {json.dumps(res.detail, default=str)}",
    )


def assemble_deploy_artifact(results: list[PipelineResult], output_dir: Path) -> Path:
    """Combine the per-sim dist bundles into one deployable site root (one subdir per
    sim + an index). Called only by the GATED-OFF deploy job; never run in Phase 5."""
    site = output_dir / "site"
    site.mkdir(parents=True, exist_ok=True)
    (site / "index.json").write_text(
        json.dumps(
            {"sims": [r.sim.name for r in results if r.status == "pass"]}, indent=2
        )
    )
    return site


# --------------------------------------------------------------------------- #
# Results doc / CLI
# --------------------------------------------------------------------------- #
def empty_results_doc() -> dict:
    return {
        "sub_phase": SUB_PHASE,
        "commit_sha": _head_sha(),
        "qualifying_sims": [],
        "non_qualifying": [],
        "sim_results": {},
        "overall_status": "pass",
        "deferred_count": 0,
        "fail_count": 0,
        "pass_count": 0,
    }


def _head_sha() -> str:
    rc, out = _run(["git", "rev-parse", "HEAD"], cwd=REPO)
    return out.strip() if rc == 0 else "unknown"


def main_discover(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args(argv)
    sims = discover_qualifying_sims()
    payload = [
        {
            "name": s.name,
            "category": s.category,
            "stack": s.stack,
            "path": str(s.path.relative_to(REPO)),
            "metadata": s.metadata,
        }
        for s in sims
    ]
    print(json.dumps(payload) if a.json else "\n".join(s.name for s in sims))
    return 0 if sims else 2


def main_build(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sims-json")
    ap.add_argument("--sim")
    ap.add_argument("--output", required=True)
    a = ap.parse_args(argv)
    sims = _select(a)
    status = {}
    for s in sims:
        ok, log = build_sim(s)
        status[s.name] = "pass" if ok else "fail"
        if not ok:
            print(log, file=sys.stderr)
    print(json.dumps({"build_status": status}))
    return 0


def main_validate(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sims-json")
    ap.add_argument("--sim")
    ap.add_argument("--artifacts", required=True)
    ap.add_argument("--json", action="store_true")
    ap.add_argument(
        "--allow-webgpu-deferral",
        action="store_true",
        help="local: report 'deferred' (not 'fail') when browser WebGPU is absent",
    )
    ap.add_argument("--skip-build", action="store_true")
    a = ap.parse_args(argv)
    sims = _select(a)

    doc = empty_results_doc()
    doc["qualifying_sims"] = [s.name for s in sims]
    for s in sims:
        r = run_pipeline_for_sim(
            s,
            Path(a.artifacts),
            require_webgpu=not a.allow_webgpu_deferral,
            skip_build=a.skip_build,
        )
        doc["sim_results"][s.name] = {
            "status": r.status,
            "duration_seconds": round(r.duration_seconds, 2),
            "artifact_path": r.artifact_path,
            "capture_validated": r.capture_validated,
            "notes": r.notes,
        }
    res = list(doc["sim_results"].values())
    doc["pass_count"] = sum(1 for r in res if r["status"] == "pass")
    doc["fail_count"] = sum(1 for r in res if r["status"] == "fail")
    doc["deferred_count"] = sum(1 for r in res if r["status"] == "deferred")
    doc["overall_status"] = "fail" if doc["fail_count"] else "pass"
    print(json.dumps(doc, indent=2))
    return 0 if doc["overall_status"] == "pass" else 1


def _select(a) -> list[SimSpec]:
    all_sims = discover_qualifying_sims()
    if getattr(a, "sim", None):
        return [s for s in all_sims if s.name == a.sim]
    if getattr(a, "sims_json", None):
        names = {x["name"] for x in json.loads(Path(a.sims_json).read_text())}
        return [s for s in all_sims if s.name in names]
    return all_sims


def main(argv: list[str]) -> int:
    if len(argv) < 2 or argv[1] not in ("discover", "build", "validate"):
        print("usage: pipeline.py [discover|build|validate] ...", file=sys.stderr)
        return 2
    verb, rest = argv[1], argv[2:]
    return {"discover": main_discover, "build": main_build, "validate": main_validate}[
        verb
    ](rest)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
