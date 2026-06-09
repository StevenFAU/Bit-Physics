"""Phase-5 preprint-extraction smoke harness (TDD; phase plan § 2.1 gate 3 / § 1.3 step 4).

Fast contract tests for the preprint-extraction pipeline: discovery of the canonical
preprint sim, the § 6.5 section/bibliography mapping, and — the load-bearing one —
the DETERMINISTIC-EXTRACTION gate (STEP-5a): extracting the same spec sheet in two
SEPARATE processes (distinct ``PYTHONHASHSEED``) yields byte-identical ``main.tex``
and ``references.bib``. That gate is the § 3.8 surrogate and runs here WITHOUT any
TeX toolchain (it is pure Python), so CI exercises it on every push.

The heavy clean-compile gate (``run_pipeline_for_sim``, which shells out to
``latexmk``) is gated behind ``BIT_PHYSICS_PREPRINT_BOOTSTRAP=1`` so the default
smoke run stays fast and needs no TeX. Authored BEFORE the implementation (spec
§ 1.3): this module fails at import (no ``pipeline`` / ``extract`` modules) until
STEP 5 lands them.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

import extract
import pipeline

REPO_ROOT = pipeline.REPO_ROOT
EXTRACT_PY = Path(extract.__file__)


# --- Discovery -------------------------------------------------------------


def test_discover_returns_canonical_preprint_sim() -> None:
    sims = pipeline.discover_qualifying_sims()
    assert len(sims) == 1, "Appendix F: discover returns the chosen canonical only"
    sim = sims[0]
    assert sim.name == pipeline.PREPRINT_CANONICAL == "pinn-poisson"
    assert isinstance(sim, pipeline.SimSpec)
    assert sim.spec_path.exists()


def test_canonical_criteria_satisfied() -> None:
    sim = pipeline.discover_qualifying_sims()[0]
    crit = sim.metadata["criteria"]
    assert crit["preprint_flag"] is True
    assert crit["sections_populated"] is True
    assert crit["has_vendored_upstream"] is True
    assert "PhysicsNeMo-PINN" in crit["vendored_upstreams"]
    assert crit["has_mms_or_gci"] is True


# --- The deterministic-extraction gate (STEP-5a; the § 3.8 surrogate) -------


def _extract_proc(spec: Path, out: Path, hashseed: str) -> Path:
    env = {**os.environ, "PYTHONHASHSEED": hashseed}
    main = out / "main.tex"
    rc = subprocess.run(
        [sys.executable, str(EXTRACT_PY), str(spec), "--out", str(main)],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        env=env,
    )
    assert rc.returncode == 0, rc.stderr
    assert main.exists()
    return main


def test_extraction_byte_identical_across_processes(tmp_path: Path) -> None:
    """Two extractions in distinct processes/hash-seeds -> byte-identical main.tex."""
    spec = pipeline.discover_qualifying_sims()[0].spec_path
    m1 = _extract_proc(spec, tmp_path / "r1", "1")
    m2 = _extract_proc(spec, tmp_path / "r2", "999")
    assert m1.read_bytes() == m2.read_bytes(), (
        "extraction is NON-deterministic across hash seeds — fix sort-before-emit in "
        "extract.py; do NOT loosen this to a diff-tolerant compare"
    )
    b1 = (tmp_path / "r1" / "references.bib").read_bytes()
    b2 = (tmp_path / "r2" / "references.bib").read_bytes()
    assert b1 == b2, "references.bib non-deterministic across hash seeds"


def test_no_pdf_emitted(tmp_path: Path) -> None:
    """Extraction commits source only — never a built PDF (no-binary-artifact)."""
    spec = pipeline.discover_qualifying_sims()[0].spec_path
    extract.extract(spec, tmp_path)
    assert not list(tmp_path.glob("*.pdf"))
    assert (tmp_path / "main.tex").exists()
    assert (tmp_path / "references.bib").exists()
    assert (tmp_path / "bitphysics-preprint.cls").exists()


# --- § 6.5 section / bibliography mapping ----------------------------------


def test_section_mapping(tmp_path: Path) -> None:
    spec = pipeline.discover_qualifying_sims()[0].spec_path
    extract.extract(spec, tmp_path)
    tex = (tmp_path / "main.tex").read_text(encoding="utf-8")
    for sec in (
        "\\section{Introduction}",
        "\\section{Method}",
        "\\section{Mathematical Formulation}",
        "\\section{Evaluation}",
    ):
        assert sec in tex, f"missing mapped section: {sec}"
    # § 13 (productization status) is repo metadata, NOT part of the preprint.
    assert "productization:" not in tex
    assert "\\bibliography{references}" in tex


def test_bibliography_has_vendored_and_references(tmp_path: Path) -> None:
    spec = pipeline.discover_qualifying_sims()[0].spec_path
    extract.extract(spec, tmp_path)
    bib = (tmp_path / "references.bib").read_text(encoding="utf-8")
    assert "physicsnemo" in bib.lower(), "vendored MANIFEST.toml upstream missing"
    assert "raissi" in bib.lower(), "spec § 12 reference missing"
    # Emitted in sorted cite-key order (determinism).
    keys = [
        ln.split("{", 1)[1].rstrip(",")
        for ln in bib.splitlines()
        if ln.startswith("@misc{")
    ]
    assert keys == sorted(keys), "bibliography not emitted in sorted cite-key order"


def test_output_is_ascii(tmp_path: Path) -> None:
    """Unicode glyphs are mapped to LaTeX — output is pure ASCII (pdflatex-clean)."""
    spec = pipeline.discover_qualifying_sims()[0].spec_path
    extract.extract(spec, tmp_path)
    for name in ("main.tex", "references.bib"):
        data = (tmp_path / name).read_bytes()
        assert data.decode("ascii"), f"{name} is not pure ASCII"


# --- Toolchain discovery ---------------------------------------------------


def test_find_latexmk_errors_without_toolchain(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("BIT_PHYSICS_LATEXMK", raising=False)
    monkeypatch.setattr(pipeline.shutil, "which", lambda _: None)
    with pytest.raises(FileNotFoundError):
        pipeline.find_latexmk()


# --- Results JSON schema (§ 5.5) -------------------------------------------


def test_results_json_schema() -> None:
    sim = pipeline.discover_qualifying_sims()[0]
    result = pipeline.PipelineResult(
        sim=sim,
        status="pass",
        artifact_path=Path("docs/preprints/pinn-poisson/main.tex"),
        reproducibility={"main_tex_byte_identical": True},
        compile_result={
            "exit_code": 0,
            "clean_compile": True,
            "unresolved_warnings": [],
        },
        duration_seconds=0.8,
        notes="ok",
    )
    payload = pipeline.results_to_json(
        [result], sub_phase="preprint-extraction", commit_sha="abc"
    )
    assert payload["overall_status"] == "pass"
    assert payload["pass_count"] == 1 and payload["fail_count"] == 0
    assert payload["sim_results"]["pinn-poisson"]["compile"]["clean_compile"]


# --- Heavy gate (gated; needs latexmk) -------------------------------------


@pytest.mark.skipif(
    os.environ.get("BIT_PHYSICS_PREPRINT_BOOTSTRAP") != "1",
    reason="preprint bootstrap gate (shells out to latexmk); set BIT_PHYSICS_PREPRINT_BOOTSTRAP=1",
)
def test_preprint_bootstrap_gate(tmp_path: Path) -> None:
    sim = pipeline.discover_qualifying_sims()[0]
    result = pipeline.run_pipeline_for_sim(sim, tmp_path / sim.name)
    assert result.status == "pass", result.notes
    assert result.reproducibility["main_tex_byte_identical"] is True
    assert result.compile_result["clean_compile"] is True
    assert result.compile_result["unresolved_warnings"] == []
