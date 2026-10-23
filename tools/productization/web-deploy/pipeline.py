"""Phase-5 web-deploy pipeline (phase plan § 5.5 shape; § 6.1 criteria; sub-phase 5.1).

Build-and-validate the Stack-B web frontends (built by the web-build track) into
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

# Stack-B web frontends + their CHARTER-named gate kind (web-build track).
# new_canonical sims need TWO browser runs (run-twice byte-identity).
GATE_KIND = {
    "reaction-diffusion-2d": "capture_roundtrip",
    "mandelbulb-explorer": "new_canonical",
    "neural-ca": "capture_roundtrip",
    "ising-classical": "observable",
    "strange-attractors": "new_canonical",
    "boids-3d": "new_canonical",
    # Phase-6 verification-demo: new_canonical = run-twice browser observable
    # capture for the v4-derived 2D lab (verify.py _gate_boids_2d) + the
    # app's in-page adapter-local brute-sort/fluid proof rows.
    "boids-2d": "new_canonical",
    "physarum": "new_canonical",
    # Phase-6 verification-demo: new_canonical = live f64 reference re-run
    # (verify.py _gate_eulerian_smoke) + run-twice (2 runs, automatic below).
    "eulerian-smoke": "new_canonical",
    # Phase-6 verification-demo: new_canonical = pointwise reproduction of the
    # committed 100K canonical capture (verify.py _gate_sph_water) + run-twice.
    "sph-water": "new_canonical",
    # Interfacial Fluid Lab: the capture is emitted by the same number-density,
    # phase-viscosity, surface-force, and pressure passes as the hero scenes.
    "sph-multiphase": "new_canonical",
    # Phase-6 verification-demo: new_canonical = pointwise reproduction of the
    # committed 16-cube diagnostic canonical (verify.py _gate_mpm_multimaterial)
    # + closed-form golden B-spline / fixture artifacts + run-twice.
    "mpm-multimaterial": "new_canonical",
    # Phase-6 verification-demo (Lane C): new_canonical = ROBUST-OBSERVABLE
    # reproduction of the committed 12-cube web-gate dam break (chaotic —
    # pointwise rejected per spec § 9) + the Props 5.1/5.4/5.5 closed-form
    # golden suite + on-device atomic==lex-oracle transfer bit-identity +
    # run-twice (verify.py _gate_pic_flip).
    "pic-flip": "new_canonical",
    # Phase-6 verification-demo: new_canonical = LIVE f64 reference re-run of
    # the NON-CHAOTIC translating-ring web-gate canonical at the 32^3 tier
    # (pointwise per-checkpoint, [defaults.isf] rel budget) + run-twice
    # byte-identity (verify.py _gate_schrodinger_smoke). The eulerian-smoke
    # live-reference precedent at the pic-flip reduced-tier scale.
    "schrodinger-smoke": "new_canonical",
    # Phase-6 verification-demo: new_canonical = CHAOS-IMMUNE live f64
    # reference re-run (verify.py _gate_curl_noise: f64-recomputed
    # iso-value residual at the browser's f32 canonical-scene positions
    # vs its f32 iso anchors, [defaults.curl-noise] budget) + committed-IC
    # match + live machine-exact goldens + run-twice byte-identity.
    "curl-noise": "new_canonical",
    # Phase-6 verification-demo: new_canonical = LIVE f64 reference re-run of
    # the NON-CHAOTIC fourier-multi web-gate canonical at the 128^2 tier
    # (pointwise per-checkpoint over BOTH solver fields t_ftcs AND t_spec,
    # [defaults.heat-equation] rel budget) + machine-exact spectral pinned-mode
    # + Parseval diagnostics + run-twice byte-identity
    # (verify.py _gate_heat_equation). The schrodinger-smoke live-reference
    # precedent with a dual-path (stencil + spectral) gated surface.
    "heat-equation": "new_canonical",
    # Phase-6 verification-demo: new_canonical = LIVE f64 reference re-run of
    # the single-frame fm-bessel + hann-leak N=4096 canonical (per-field
    # max_abs over both gated analysis paths — the coherent-FM rectangular
    # spectrum vs the exact folded J_n(I) line set AND the off-bin hann
    # spectrum vs the exact window-DTFT skirt, [defaults.signal-workbench]
    # rel budget) + browser JS-f64 Parseval/line-error diagnostics +
    # run-twice byte-identity (verify.py _gate_signal_workbench). The
    # heat-equation dual-path live-reference precedent on a 1D instrument.
    "signal-workbench": "new_canonical",
    # Phase-6 verification-demo, NEW fracture family: new_canonical = LIVE
    # f64 reference re-run of the SHARED canonical sent-void-96sq-m1 (the
    # backend canonical IS the web gate scene) — pointwise per-checkpoint
    # per-field max_abs over {ux, uy, d, h_field} at PRE-BURST checkpoints
    # ([defaults.phase-field-fracture] rel budget; the post-peak SENT
    # snap-back is legitimately dynamic per spec-ref § 3.6 and is gated by
    # peak-load / crack-energy / crack-path-IoU observables) + damage
    # monotonicity + run-twice byte-identity
    # (verify.py _gate_phase_field_fracture).
    "phase-field-fracture": "new_canonical",
    # Phase-6 verification-demo, NEW electromagnetics family: new_canonical =
    # committed Python-f64 reference comparison of the SHARED canonical
    # tfsf-cyl128-eps2.25-step512 (TMz Yee leapfrog + TF/SF 1-D aux incident
    # grid + dielectric cylinder, PEC box) — pointwise per-checkpoint
    # per-field max_abs over {ez, hx, hy} ([defaults.fdtd-optics] rel budget)
    # + run-twice byte-identity + the ANALYTIC instrument gates measured in
    # the same capture: Fresnel R=0.04 within T_FDTD_FRESNEL_REL and
    # cylinder-Mie Q_sca vs the committed Bohren-Huffman table within
    # T_FDTD_MIE_REL (verify.py _gate_fdtd_optics; spec-ref § 6 — the
    # analytic-gates conjunction is the sim's moat claim, so it is CI-held).
    "fdtd-optics": "new_canonical",
    # Phase-6 verification-demo, first Stack-B lattice-family sim:
    # new_canonical = LIVE Python-f64 reference comparison of the SHARED
    # canonical flatA128x8+dropletB128-step2000 (D2Q9 pseudopotential,
    # DDF-shifted pull streaming, committed pre-equilibrated ICs + psi-LUT)
    # — pointwise per-gated-checkpoint max(|d rho|/max|rho|, sqrt(3)|d u|)
    # ([defaults.lbm-multiphase] rel budget) + run-twice byte-identity + the
    # ANALYTIC instrument gates measured in the same capture: Maxwell
    # coexistence (LIVE-recomputed equal-area targets), tau-independence,
    # Young-Laplace slope + linearity, spurious-current ceiling, and the
    # G > G_c no-separation negative control (verify.py
    # _gate_lbm_multiphase; spec-ref § 6.2 — the analytic-gates conjunction
    # is the sim's moat claim, so it is CI-held).
    "lbm-multiphase": "new_canonical",
    # Flow Lenia release lab: the default full affinity/pressure/finite-square
    # Organism capture is replayed twice byte-exactly and its closed mass,
    # non-negativity, finite-state, and displacement-clamp invariants are held
    # by verify.py. The deeper M2–M6 CPU/GPU, inheritance, environment, reload,
    # and render-integrity artifacts remain package-local release gates.
    "flow-lenia": "new_canonical",
    "terrain-erosion": "new_canonical",
}
WEB_DIR = {s: f"packages/{s}/web" for s in GATE_KIND}

# Extra gated pages inside a sim's dist (rebuild v2, docs/planning/rebuild-v2/
# 00-foundation.md § 8): a v2 page is built into the SAME dist as the sim's v1
# page and served at sims/<sim>/<page>, so the per-sim build and dist contract
# is unchanged. Each page is driven separately and gated by the sim's SAME
# established gate (GATE_KIND); the sim passes only if every page passes.
# Values: (page path under dist/, its entry module relative to the web dir).
PAGES: dict[str, tuple[tuple[str, str], ...]] = {
    "reaction-diffusion-2d": (("v2/", "src/v2/main.ts"),),
    "physarum": (("v2/", "src/v2/main.ts"),),
}

# Discovery greps each page's entry for the capture hook and a shell marker:
# the v1 settings panel, or the v2 Field Studies shell (@bp/studio).
SHELL_MARKERS = ("createSettingsPanel", "createStudio")


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
def _entry_qualifies(entry: Path, label: str) -> tuple[bool, str]:
    if not entry.exists():
        return False, f"no {label} entry"
    txt = entry.read_text()
    if "exposeCapture" not in txt:
        return False, f"no capture-export hook in {label}"
    if not any(m in txt for m in SHELL_MARKERS):
        return False, f"no settings panel or studio shell in {label} (spec §10.1)"
    return True, ""


def _qualifies(web: Path, name: str | None = None) -> tuple[bool, str]:
    if not (web / "package.json").exists():
        return False, "no package.json (no Vite build)"
    ok, why = _entry_qualifies(web / "src" / "main.ts", "src/main.ts")
    if not ok:
        return ok, why
    for page, entry in PAGES.get(name or "", ()):
        if not (web / page / "index.html").exists():
            return False, f"page {page} has no {page}index.html"
        ok, why = _entry_qualifies(web / entry, entry)
        if not ok:
            return ok, f"page {page}: {why}"
    return True, ""


def discover_qualifying_sims() -> list[SimSpec]:
    # sims.json is the single registry of published sims (check_registry.py holds
    # every other list to it); GATE_KIND must cover exactly the same set.
    registry = {s["name"] for s in json.loads((TOOL / "sims.json").read_text())["sims"]}
    if registry != set(GATE_KIND):
        raise SystemExit(
            "pipeline.py GATE_KIND disagrees with sims.json: "
            f"missing {sorted(registry - set(GATE_KIND))}, "
            f"unregistered {sorted(set(GATE_KIND) - registry)}"
        )
    sims: list[SimSpec] = []
    for name, rel in sorted(WEB_DIR.items()):
        web = REPO / rel
        ok, reason = _qualifies(web, name)
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
                    # "" is the sim's root page; extra gated pages follow
                    "pages": ["", *(p for p, _ in PAGES.get(name, ()))],
                    # new_canonical needs 2 runs for run-twice byte-identity;
                    # neural-ca joins per the ratified cross-backend charter —
                    # foreign-ALU determinism is part of its fallback verdict
                    # (the 1-run mode made the fallback's run-twice term vacuous).
                    "runs": 2
                    if (GATE_KIND[name] == "new_canonical" or name == "neural-ca")
                    else 1,
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


def _deps_installed(web: Path) -> bool:
    """Every dependency of the sim resolvable from its dir or the repo root.

    The web frontends are an npm workspace (root package.json, one lockfile):
    dependencies hoist to REPO/node_modules, and `npm ci` run inside a member
    dir installs only that member's dependencies at the root — so a root
    node_modules alone does not prove THIS sim's deps are present.
    """
    pkg = json.loads((web / "package.json").read_text())
    deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
    roots = [web / "node_modules", REPO / "node_modules"]
    return all(any((r / d).exists() for r in roots) for d in deps)


def build_sim(sim: SimSpec) -> tuple[bool, str]:
    web = sim.path
    if not _deps_installed(web):
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

    pages = sim.metadata.get("pages", [""])
    results = [
        _drive_and_verify(
            sim,
            dist,
            out if page == "" else out / page.strip("/"),
            page,
            require_webgpu=require_webgpu,
        )
        for page in pages
    ]
    notes = " | ".join(f"[{p or 'root'}] {n}" for p, (_, _, n) in zip(pages, results))
    if any(st == "fail" for st, _, _ in results):
        status: Literal["pass", "fail", "deferred"] = "fail"
    elif any(st == "deferred" for st, _, _ in results):
        status = "deferred"
    else:
        status = "pass"
    return PipelineResult(
        sim,
        status,
        str(dist),
        all(v for _, v, _ in results),
        time.time() - t0,
        notes if len(pages) > 1 else results[0][2],
    )


def _drive_and_verify(
    sim: SimSpec, dist: Path, out: Path, page: str, *, require_webgpu: bool = True
) -> tuple[Literal["pass", "fail", "deferred"], bool, str]:
    """Drive one page of a built bundle and apply the sim's established gate."""
    out.mkdir(parents=True, exist_ok=True)
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
    if page:
        cmd += ["--entry", page]
    rc, log = _run(cmd, cwd=REPO)
    # Surface the driver log on success AND failure — stdout carries the results
    # JSON (`--json > results.json`), so the log goes to stderr. Without this the
    # driver's measured time-to-ready instrumentation is invisible on green runs
    # (run 27244441494: zero declarable readiness values).
    if log:
        print(
            f"--- driver log ({sim.name}{' ' + page if page else ''}) ---\n{log.rstrip()}",
            file=sys.stderr,
        )
    time_to_ready_ms = [int(ms) for ms in re.findall(r"time-to-ready (\d+) ms", log)]
    bundles = sorted(out.glob("capture-*.json"))

    if rc == 42 or "WEBGPU_UNAVAILABLE" in log:
        if require_webgpu:
            return (
                "fail",
                False,
                "browser WebGPU adapter unavailable — CI must provide one "
                "(lavapipe). Real browser-delivery gate did not run.",
            )
        return (
            "deferred",
            False,
            "browser-WebGPU unavailable in this environment; gate deferred to "
            "cloud CI (web-deploy.yml). Vite build OK; bundle deployable.",
        )
    if rc != 0 or not bundles:
        return (
            "fail",
            False,
            f"driver failed (rc={rc}): {log.splitlines()[-1] if log else ''}",
        )

    # Browser capture(s) in hand → apply the sim's established gate.
    sys.path.insert(0, str(TOOL))
    import verify  # type: ignore

    res = verify.verify_browser_capture(sim.name, bundles)
    return (
        "pass" if res.passed else "fail",
        bool(res.passed),
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
