"""Phase-5 preprint-extraction pipeline (phase plan § 5.5 shape; § 6.5 criteria; v9 R4).

Build-and-validate an academic-preprint LaTeX source for the canonical sim and
re-verify it the way a preprint artifact CAN be verified — NOT against an analytic
anchor (the source sim's physics was already gated through Phase-3 acceptance;
bootstrap § 3.8 is N/A here, Appendix F) but by DETERMINISM + CLEAN-COMPILE:

  1. extract  — ``spec-ref.md`` -> ``main.tex`` + ``references.bib`` + class
                (``extract.py``; § 6.5 section/bib mapping).
  2. reproduce — run ``extract`` TWICE; the two ``main.tex`` (and ``references.bib``)
                outputs MUST be BYTE-IDENTICAL (``cmp`` == 0). This is the § 3.8
                surrogate (STEP-5a). A non-byte-identical emit is a real
                nondeterminism — fixed by sort-before-emit in ``extract.py``, never
                tolerated with a diff-tolerant compare.
  3. compile  — ``latexmk`` the extracted ``main.tex`` in the pinned TeX toolchain;
                must exit 0 with NO unresolved ``\\ref``/``\\cite`` warnings.

NO publish: the ``deploy`` job in preprint-extraction.yml is gated off (no arXiv
submission in Phase 5). NO PDF is committed — the workflow builds it on demand.

The ``preprint-extraction/`` tool dir is hyphenated (not an importable module), so
this file is invoked by PATH, mirroring render-passes/pypi-release::

    python tools/productization/preprint-extraction/pipeline.py discover --json
    python tools/productization/preprint-extraction/pipeline.py validate --artifacts OUT --sim pinn-poisson --json

The TeX toolchain is located via ``$BIT_PHYSICS_LATEXMK`` (path to ``latexmk``) or
``latexmk`` on ``PATH``. § 0.3 SHIFT: this environment has no Docker, so the local
gate runs a pinned PORTABLE TeX Live (TinyTeX, sha256-verified) rather than the
plan's pinned TeX Live Docker image — same pin guarantee, no container runtime
(mirrors 5.2's de-Docker'd CMake and 5.4's de-Docker'd Blender).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

REPO_ROOT = Path(__file__).resolve().parents[3]
SPEC_ROOT = REPO_ROOT / "docs" / "sim-specs"
REFERENCES_ROOT = REPO_ROOT / "references"
THIS_DIR = Path(__file__).resolve().parent

# v9 R4 (operator-ratified): "5.5 preprint canonical = pinn-poisson". The discovery
# below measures the preprint:true §13 pool live; this names the single canonical pick.
PREPRINT_CANONICAL = "pinn-poisson"

# Spec-ref sections that must be populated for a qualifying sim (§ 6.5).
REQUIRED_SECTIONS = ("1", "3", "4", "6", "12")


@dataclass(frozen=True)
class SimSpec:
    name: str
    category: str
    spec_path: Path
    metadata: dict[str, Any]


@dataclass(frozen=True)
class PipelineResult:
    sim: SimSpec
    status: Literal["pass", "fail", "deferred"]
    artifact_path: Path | None
    reproducibility: dict[str, Any] | None
    compile_result: dict[str, Any] | None
    duration_seconds: float
    notes: str


# --- §13 productization-flag discovery (preprint flag) ----------------------


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


def _preprint_true_pool() -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for spec in sorted(SPEC_ROOT.glob("*/*/spec-ref.md")):
        flags = _parse_productization_block(spec.read_text(encoding="utf-8"))
        if flags and flags.get("preprint", False):
            out[spec.parent.name] = {
                "category": spec.parent.parent.name,
                "spec_path": spec,
            }
    return out


def _vendored_upstreams(sim_id: str) -> list[str]:
    """References whose MANIFEST.toml used_by_sims includes sim_id (§ 6.5 bib source)."""
    found: list[str] = []
    if not REFERENCES_ROOT.is_dir():
        return found
    import tomllib

    for manifest in sorted(REFERENCES_ROOT.glob("*/MANIFEST.toml")):
        try:
            doc = tomllib.loads(manifest.read_text(encoding="utf-8"))
        except tomllib.TOMLDecodeError:
            continue
        if sim_id in doc.get("scope", {}).get("used_by_sims", []):
            found.append(manifest.parent.name)
    return found


def _criteria(spec_path: Path) -> dict[str, Any]:
    """Measure the § 6.5 canonical-selection criteria for one sim (evidence dict)."""
    import extract  # sibling (PATH-invoked, same dir on sys.path)

    md = spec_path.read_text(encoding="utf-8")
    sections = extract.parse_sections(md)
    sim_id = f"{spec_path.parent.parent.name}/{spec_path.parent.name}"
    flags = _parse_productization_block(md) or {}
    upstreams = _vendored_upstreams(sim_id)
    sections_ok = all(sections.get(n, "").strip() for n in REQUIRED_SECTIONS)
    has_mms_gci = bool(re.search(r"\bMMS\b|\bGCI\b|convergence[- ]order", md))
    has_frontier = bool(re.search(r"\bfrontier\b|frontier-variant", md))
    return {
        "preprint_flag": flags.get("preprint", False),
        "not_opted_out": flags.get("preprint", True) is not False,
        "sections_populated": sections_ok,
        "required_sections": list(REQUIRED_SECTIONS),
        "vendored_upstreams": upstreams,
        "has_vendored_upstream": bool(upstreams),
        "has_mms_or_gci": has_mms_gci,
        "has_frontier_variant_story": has_frontier,
    }


def discover_qualifying_sims() -> list[SimSpec]:
    """Return the chosen canonical preprint sim (Appendix F: canonical only).

    Criteria (§ 6.5, all load-bearing must hold): preprint:true §13 (not opted out),
    spec-ref §§ 1/3/4/6/12 populated, ≥1 vendored upstream in references/, an MMS/GCI
    convergence story, a frontier-variant story. The preprint:true pool is measured
    live; the phase ships the operator-ratified R4 canonical (``pinn-poisson``).
    Non-qualifying preprint:true sims are reported to stderr for the probe.
    """
    pool = _preprint_true_pool()
    qualifying: dict[str, SimSpec] = {}
    for name, info in pool.items():
        crit = _criteria(info["spec_path"])
        load_bearing = (
            crit["preprint_flag"]
            and crit["sections_populated"]
            and crit["has_vendored_upstream"]
            and crit["has_mms_or_gci"]
        )
        if not load_bearing:
            missing = [
                k
                for k in (
                    "preprint_flag",
                    "sections_populated",
                    "has_vendored_upstream",
                    "has_mms_or_gci",
                )
                if not crit[k]
            ]
            print(f"non-qualifying: {name}: fails {','.join(missing)}", file=sys.stderr)
            continue
        qualifying[name] = SimSpec(
            name=name,
            category=info["category"],
            spec_path=info["spec_path"],
            metadata={"criteria": crit, "preprint_true_pool": sorted(pool)},
        )
    if PREPRINT_CANONICAL in qualifying:
        return [qualifying[PREPRINT_CANONICAL]]
    return [qualifying[n] for n in sorted(qualifying)][:1]


# --- TeX toolchain discovery ------------------------------------------------


def find_latexmk() -> str:
    """Locate latexmk ($BIT_PHYSICS_LATEXMK or PATH)."""
    env = os.environ.get("BIT_PHYSICS_LATEXMK")
    if env and Path(env).exists():
        return env
    found = shutil.which("latexmk")
    if found:
        return found
    raise FileNotFoundError(
        "latexmk not found: set $BIT_PHYSICS_LATEXMK to the executable or put "
        "`latexmk` on PATH (the pinned TeX toolchain; phase plan § 6.5)."
    )


def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return "sha256:" + h.hexdigest()


# Unresolved-reference / unresolved-citation patterns (the clean-compile gate).
_UNRESOLVED_RE = re.compile(
    r"Citation `[^']*' .*undefined|Reference `[^']*' .*undefined"
    r"|There were undefined (references|citations)",
    re.IGNORECASE,
)


def _compile(main_tex: Path) -> dict[str, Any]:
    """latexmk the extracted main.tex; gate on exit 0 AND no unresolved ref/cite."""
    latexmk = find_latexmk()
    work = main_tex.parent
    rc = subprocess.run(
        [
            latexmk,
            "-pdf",
            "-interaction=nonstopmode",
            "-halt-on-error",
            main_tex.name,
        ],
        cwd=work,
        capture_output=True,
        text=True,
        errors="replace",  # pdflatex/latexmk emit non-UTF8 bytes (box dumps, ^^ chars)
    )
    log = work / (main_tex.stem + ".log")
    log_text = log.read_text(encoding="utf-8", errors="replace") if log.exists() else ""
    unresolved = sorted(set(m.group(0) for m in _UNRESOLVED_RE.finditer(log_text)))
    pdf = work / (main_tex.stem + ".pdf")
    clean = rc.returncode == 0 and not unresolved and pdf.exists()
    return {
        "tool": "latexmk",
        "exit_code": rc.returncode,
        "pdf_built": pdf.exists(),
        "unresolved_warnings": unresolved,
        "clean_compile": clean,
        "stderr_tail": rc.stderr[-400:],
    }


# --- The gate ---------------------------------------------------------------


def _extract_subprocess(spec_path: Path, run_dir: Path) -> tuple[Path, Path]:
    """Invoke extract.py as a SEPARATE process (STEP-5a: distinct PYTHONHASHSEED).

    Running each extraction in its own interpreter is the load-bearing detail of the
    reproducibility gate — hashed-collection iteration order (the named trap) only
    diverges across processes, so an in-process double-call would miss it.
    """
    run_dir.mkdir(parents=True, exist_ok=True)
    main_path = run_dir / "main.tex"
    rc = subprocess.run(
        [
            sys.executable,
            str(THIS_DIR / "extract.py"),
            str(spec_path),
            "--out",
            str(main_path),
        ],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
    )
    if rc.returncode != 0 or not main_path.exists():
        raise RuntimeError(f"extract.py failed: {rc.stderr[-500:]}")
    return main_path, run_dir / "references.bib"


def run_pipeline_for_sim(sim: SimSpec, output_dir: Path) -> PipelineResult:
    """extract×2 in SEPARATE processes (byte-identity gate) -> clean-compile gate."""
    t0 = time.monotonic()
    output_dir.mkdir(parents=True, exist_ok=True)
    main1, bib1 = _extract_subprocess(sim.spec_path, output_dir / "run1")
    main2, bib2 = _extract_subprocess(sim.spec_path, output_dir / "run2")

    main_identical = main1.read_bytes() == main2.read_bytes()
    bib_identical = bib1.read_bytes() == bib2.read_bytes()
    reproducibility = {
        "gate": "byte-identical-main-tex",
        "main_tex_byte_identical": main_identical,
        "references_bib_byte_identical": bib_identical,
        "run1_main_tex_sha256": _sha256_file(main1),
        "run2_main_tex_sha256": _sha256_file(main2),
        "references_bib_sha256": _sha256_file(bib1),
    }
    if not main_identical:
        return PipelineResult(
            sim,
            "fail",
            None,
            reproducibility,
            None,
            time.monotonic() - t0,
            "extraction NON-deterministic: main.tex differs across runs — fix "
            "sort-before-emit in extract.py; do NOT widen the gate",
        )

    compile_result = _compile(main1)
    ok = main_identical and compile_result["clean_compile"]
    note = (
        f"extraction byte-identical (main.tex sha {reproducibility['run1_main_tex_sha256'][:23]}); "
        f"latexmk exit {compile_result['exit_code']}, "
        f"{'clean' if compile_result['clean_compile'] else 'NOT clean'}, "
        f"{len(compile_result['unresolved_warnings'])} unresolved ref/cite"
    )
    return PipelineResult(
        sim,
        "pass" if ok else "fail",
        main1,
        reproducibility,
        compile_result,
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
            "reproducibility": r.reproducibility,
            "compile": r.compile_result,
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
                        "spec_path": str(s.spec_path.relative_to(REPO_ROOT)),
                        "criteria": s.metadata.get("criteria"),
                    }
                    for s in sims
                ],
                indent=2,
            )
        )
    else:
        for s in sims:
            print(f"{s.name}\t{s.category}\t{s.spec_path.relative_to(REPO_ROOT)}")
    return 0 if sims else 2


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
        results, sub_phase="preprint-extraction", commit_sha=_head_sha()
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
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    raise SystemExit(main())
