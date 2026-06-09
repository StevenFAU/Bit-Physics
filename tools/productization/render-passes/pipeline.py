"""Phase-5 render-passes pipeline (phase plan § 5.5 shape; § 6.4 criteria; v9 R4).

Build-and-validate a deterministic Cycles render for the canonical render sim and
re-verify the artifact the way a render artifact CAN be verified: not against an
analytic anchor (renders are static images, not capture re-emitters — bootstrap
§ 3.8 is N/A here, per Appendix E) but by DETERMINISM + ASSET-INTEGRITY:

  1. convert  — extract the canonical capture's render field/step → .npy + meta
                (``convert.py``, uv/h5py).
  2. export   — .npy → OpenVDB render asset, bit-exact f64 round-trip checked
                (``blender/vdb_export.py``, Blender's bundled openvdb).
  3. render   — render the canonical pass TWICE in the same pinned Blender
                (``blender/render.py``, Cycles CPU, fixed seed+samples).
  4. verify   — DETERMINISM GATE: the two renders' DECODED PIXEL BUFFERS must be
                BIT-IDENTICAL (MEASURED; the PNG container's ancillary chunks vary
                run-to-run, so the gate is on pixels, not file bytes). The PSNR/SSIM
                quality gate (§ 5a) is reported alongside. ASSET-INTEGRITY GATE:
                the VDB round-trips the capture field bit-exactly.

NO publish: the ``deploy`` job in render-passes.yml is gated off. Renders are
committed to ``docs/renders/<sim>/`` in the repo, not deployed externally.

The ``render-passes/`` tool dir is hyphenated (not an importable module), so this
file is invoked by PATH, mirroring pypi-release/binary-release::

    python tools/productization/render-passes/pipeline.py discover --json
    python tools/productization/render-passes/pipeline.py validate --artifacts OUT --sim eulerian-smoke --json

Blender is located via ``$BIT_PHYSICS_BLENDER`` (a path to the executable) or the
``blender`` on ``PATH``. § 0.3 SHIFT: this environment has no Docker, so the local
gate runs a pinned portable Blender rather than the plan's pinned Docker image;
the CI workflow pins the toolchain by download digest. Same Blender → same pixels.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

REPO_ROOT = Path(__file__).resolve().parents[3]
SPEC_ROOT = REPO_ROOT / "docs" / "sim-specs"
CAPTURES_ROOT = REPO_ROOT / "captures"
BLENDER_DIR = Path(__file__).resolve().parent / "blender"

# v9 R4: "5.4 render canonical = eulerian-smoke". The discovery below measures the
# render:true pool live; this names the single canonical pick the phase ships.
RENDER_CANONICAL = "eulerian-smoke"

# Render-similarity quality floors (Appendix E STEP 5a). With a deterministic
# renderer the two runs are bit-identical, so these are over-achieved (PSNR is the
# identical-pair sentinel, SSIM 1.0); they are the floor a non-deterministic
# renderer would have to clear instead. Never widened to force a pass.
PSNR_FLOOR = 40.0
SSIM_FLOOR = 0.98
# Finite stand-in for the +inf PSNR of a bit-identical pair (keeps the JSON
# report valid; paired with the ``psnr_identical_sentinel`` flag).
PSNR_IDENTICAL_SENTINEL = 999.0


@dataclass(frozen=True)
class SimSpec:
    name: str
    category: str
    capture_h5: Path
    capture_manifest: Path
    spec_path: Path
    metadata: dict[str, Any]


@dataclass(frozen=True)
class PipelineResult:
    sim: SimSpec
    status: Literal["pass", "fail", "deferred"]
    artifact_path: Path | None
    asset_integrity: dict[str, Any] | None
    determinism: dict[str, Any] | None
    duration_seconds: float
    notes: str


# --- §13 productization-flag discovery (render flag) ------------------------


def _parse_productization_block(text: str) -> dict[str, bool] | None:
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


def _render_true_canonicals() -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for spec in sorted(SPEC_ROOT.glob("*/*/spec-ref.md")):
        flags = _parse_productization_block(spec.read_text(encoding="utf-8"))
        if flags and flags.get("render", False):
            out[spec.parent.name] = {
                "category": spec.parent.parent.name,
                "spec_path": spec,
            }
    return out


def _find_volumetric_capture(sim: str) -> tuple[Path, Path] | None:
    """Find a committed 3D (.h5, manifest.json) pair for ``sim`` (R4 criterion).

    A volumetric render needs a 3D scalar grid; among the sim's committed captures
    pick the one whose manifest declares 3D ``config.dims``. Deterministic order.
    """
    cap_dir = CAPTURES_ROOT / f"{sim}-ref"
    if not cap_dir.is_dir():
        return None
    for manifest in sorted(cap_dir.glob("*.json")):
        try:
            doc = json.loads(manifest.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        dims = doc.get("config", {}).get("dims", [])
        rel = doc.get("payload", {}).get("path", "")
        h5 = cap_dir / rel if rel else manifest.with_suffix(".h5")
        if len(dims) == 3 and h5.exists():
            return h5, manifest
    return None


def discover_qualifying_sims() -> list[SimSpec]:
    """Return the chosen canonical render sim (Appendix E: canonical only).

    Criteria (§ 6.4, R4-relaxed): render:true §13, published spec sheet, a committed
    3D ``.h5`` canonical capture (the h5→render-asset conversion source), volumetric
    visual interest. The render:true pool is measured live; the phase ships the R4
    canonical (``eulerian-smoke``). Non-qualifying render:true sims are reported to
    stderr for the probe.
    """
    canonicals = _render_true_canonicals()
    qualifying: dict[str, SimSpec] = {}
    for name, info in canonicals.items():
        cap = _find_volumetric_capture(name)
        if cap is None:
            print(
                f"non-qualifying: {name}: render:true but no committed 3D .h5 capture",
                file=sys.stderr,
            )
            continue
        h5, manifest = cap
        qualifying[name] = SimSpec(
            name=name,
            category=info["category"],
            capture_h5=h5,
            capture_manifest=manifest,
            spec_path=info["spec_path"],
            metadata={"render_true_pool": sorted(canonicals)},
        )
    if RENDER_CANONICAL in qualifying:
        return [qualifying[RENDER_CANONICAL]]
    return [qualifying[n] for n in sorted(qualifying)][:1]


# --- Blender discovery ------------------------------------------------------


def find_blender() -> str:
    """Locate the Blender executable ($BIT_PHYSICS_BLENDER or PATH)."""
    env = os.environ.get("BIT_PHYSICS_BLENDER")
    if env and Path(env).exists():
        return env
    found = shutil.which("blender")
    if found:
        return found
    raise FileNotFoundError(
        "Blender not found: set $BIT_PHYSICS_BLENDER to the executable or put "
        "`blender` on PATH (the render toolchain; phase plan § 6.4)."
    )


def _run_blender(
    script: str, script_args: list[str]
) -> subprocess.CompletedProcess[str]:
    blender = find_blender()
    cmd = [
        blender,
        "-b",
        "--factory-startup",
        "-noaudio",
        "-P",
        str(BLENDER_DIR / script),
        "--",
        *script_args,
    ]
    return subprocess.run(cmd, cwd=REPO_ROOT, capture_output=True, text=True)


def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return "sha256:" + h.hexdigest()


def _pixel_sha256(png_path: Path) -> tuple[str, Any]:
    from PIL import Image  # uv env has Pillow
    import numpy as np

    arr = np.asarray(Image.open(png_path))
    return "sha256:" + hashlib.sha256(arr.tobytes()).hexdigest(), arr


def _write_canonical_png(src_png: Path, dst_png: Path) -> str:
    """Re-encode pixels with no ancillary chunks → byte-deterministic canonical PNG."""
    from PIL import Image
    import numpy as np

    arr = np.asarray(Image.open(src_png))
    Image.fromarray(arr).save(dst_png, format="PNG", optimize=False)
    return _sha256_file(dst_png)


# --- The gate ---------------------------------------------------------------


def run_pipeline_for_sim(sim: SimSpec, output_dir: Path) -> PipelineResult:
    """convert → export(+integrity) → render×2 → determinism/quality verify."""
    import convert  # sibling module (PATH-invoked, same dir on sys.path)

    t0 = time.monotonic()
    output_dir.mkdir(parents=True, exist_ok=True)
    npy = output_dir / "field.npy"
    meta_json = output_dir / "asset-meta.json"
    vdb = output_dir / "render-asset.vdb"
    integrity_json = output_dir / "asset-integrity.json"

    # 1. extract field/step from the canonical capture
    manifest = convert.load_manifest(sim.capture_manifest)
    meta = convert.extract_field(sim.capture_h5, npy, meta_json, manifest=manifest)

    # 2. export VDB render asset + asset-integrity round-trip check
    rc = _run_blender(
        "vdb_export.py",
        ["--npy", str(npy), "--out-vdb", str(vdb), "--integrity", str(integrity_json)],
    )
    if not integrity_json.exists():
        return PipelineResult(
            sim,
            "fail",
            None,
            None,
            None,
            time.monotonic() - t0,
            f"vdb_export failed: {rc.stderr[-500:]}",
        )
    integrity = json.loads(integrity_json.read_text(encoding="utf-8"))
    if not integrity.get("roundtrip_bit_exact", False):
        return PipelineResult(
            sim,
            "fail",
            vdb,
            integrity,
            None,
            time.monotonic() - t0,
            "asset-integrity NOT bit-exact "
            f"(max_abs={integrity.get('roundtrip_max_abs')}) — not widened",
        )

    # enrich the render meta with the asset sha + render_category for render.py
    meta_full = {**meta, "render_asset_sha256": integrity["render_asset_sha256"]}
    meta_json.write_text(
        json.dumps(meta_full, indent=2, sort_keys=True), encoding="utf-8"
    )

    # 3. render the canonical pass twice
    run1, run2 = output_dir / "run1.png", output_dir / "run2.png"
    prov = output_dir / "render-provenance.json"
    for out in (run1, run2):
        rc = _run_blender(
            "render.py",
            [
                "--vdb",
                str(vdb),
                "--meta",
                str(meta_json),
                "--out",
                str(out),
                "--provenance",
                str(prov),
            ],
        )
        if not out.exists():
            return PipelineResult(
                sim,
                "fail",
                vdb,
                integrity,
                None,
                time.monotonic() - t0,
                f"render failed for {out.name}: {rc.stderr[-500:]}",
            )

    # 4. DETERMINISM gate (bit-exact decoded pixels) + quality (PSNR/SSIM)
    sha1, arr1 = _pixel_sha256(run1)
    sha2, arr2 = _pixel_sha256(run2)
    sys.path.insert(0, str(REPO_ROOT / "tools" / "testkit"))
    from render_similarity import psnr, ssim  # type: ignore

    # Determinism is judged on the full RGBA pixel buffer (strict); the testkit
    # render-similarity metrics operate on 3-channel RGB, so drop alpha for those.
    pixel_bit_identical = sha1 == sha2
    rgb1, rgb2 = arr1[..., :3], arr2[..., :3]
    psnr_raw = float(psnr(rgb1, rgb2))
    ssim_v = float(ssim(rgb1, rgb2))
    # PSNR is +inf for an identical pair (testkit sentinel); keep the report valid
    # JSON by recording a finite sentinel plus a flag rather than the inf token.
    import math

    psnr_identical = not math.isfinite(psnr_raw)
    psnr_v = PSNR_IDENTICAL_SENTINEL if psnr_identical else psnr_raw
    quality_pass = psnr_v >= PSNR_FLOOR and ssim_v >= SSIM_FLOOR

    hero = output_dir / "hero.png"
    hero_sha = _write_canonical_png(run1, hero)
    raw_bytes_identical = _sha256_file(run1) == _sha256_file(run2)

    determinism = {
        "gate": "byte-identical-pixels"
        if pixel_bit_identical
        else "render-similarity-floor",
        "pixel_bit_identical": pixel_bit_identical,
        "run1_pixel_sha256": sha1,
        "run2_pixel_sha256": sha2,
        "raw_png_bytes_identical": raw_bytes_identical,
        "raw_png_byte_note": (
            "PNG container carries run-varying ancillary chunks (eXIf timestamp, "
            "tEXt render-time); the gate is on the DECODED pixel buffer"
        ),
        "psnr_db": psnr_v,
        "psnr_identical_sentinel": psnr_identical,
        "ssim": ssim_v,
        "psnr_floor": PSNR_FLOOR,
        "ssim_floor": SSIM_FLOOR,
        "quality_pass": quality_pass,
        "hero_png_sha256": hero_sha,
    }
    report = output_dir / "determinism-report.json"
    report.write_text(
        json.dumps(determinism, indent=2, sort_keys=True), encoding="utf-8"
    )

    ok = pixel_bit_identical and quality_pass
    psnr_str = "inf(identical)" if psnr_identical else f"{psnr_v:.1f}dB"
    note = (
        f"asset bit-exact; render {'pixel-bit-identical' if pixel_bit_identical else 'NON-deterministic'}; "
        f"PSNR={psnr_str} SSIM={ssim_v:.4f}; hero {hero_sha[:23]}"
    )
    return PipelineResult(
        sim,
        "pass" if ok else "fail",
        hero,
        integrity,
        determinism,
        time.monotonic() - t0,
        note,
    )


# --- Results JSON (§ 5.5) ---------------------------------------------------


def results_to_json(
    results: list[PipelineResult], *, sub_phase: str, commit_sha: str
) -> dict[str, Any]:
    sim_results = {
        r.sim.name: {
            "status": r.status,
            "duration_seconds": round(r.duration_seconds, 3),
            "artifact_path": str(r.artifact_path) if r.artifact_path else None,
            "asset_integrity": r.asset_integrity,
            "determinism": r.determinism,
            "notes": r.notes,
        }
        for r in results
    }
    fail = sum(1 for r in results if r.status == "fail")
    return {
        "sub_phase": sub_phase,
        "commit_sha": commit_sha,
        "qualifying_sims": [r.sim.name for r in results],
        "sim_results": sim_results,
        "overall_status": "fail" if fail else "pass",
        "fail_count": fail,
        "pass_count": sum(1 for r in results if r.status == "pass"),
    }


def _head_sha() -> str:
    rc = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=REPO_ROOT, capture_output=True, text=True
    )
    return rc.stdout.strip() if rc.returncode == 0 else "unknown"


# --- CLI --------------------------------------------------------------------


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
                        "capture_h5": str(s.capture_h5.relative_to(REPO_ROOT)),
                        "capture_manifest": str(
                            s.capture_manifest.relative_to(REPO_ROOT)
                        ),
                        "spec_path": str(s.spec_path.relative_to(REPO_ROOT)),
                    }
                    for s in sims
                ],
                indent=2,
            )
        )
    else:
        for s in sims:
            print(f"{s.name}\t{s.category}\t{s.capture_h5.relative_to(REPO_ROOT)}")
    return 0


def main_validate(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(prog="pipeline validate")
    ap.add_argument("--artifacts", required=True)
    ap.add_argument("--sim", help="validate a single sim by name")
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
        results, sub_phase="render-passes", commit_sha=_head_sha()
    )
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
    # Make sibling modules (convert) importable under PATH invocation.
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    raise SystemExit(main())
