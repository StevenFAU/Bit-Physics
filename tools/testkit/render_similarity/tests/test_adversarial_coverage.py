"""Adversarial-fixture meta-test for render-similarity (charter § 1.1 item 5).

Pattern mirrors ``tools/integrity/tests/test_adversarial_coverage.py:53-180``
in form: **hand-written test functions per fixture family** (no auto-discovery
loop). For each adversarial fixture under ``tests/fixtures/adversarial/<family>/``
this module ships one test function that:

- loads the manifest JSON to learn the expected classification + threshold,
- loads ``image_a.npy`` / ``image_b.npy``,
- invokes the corresponding metric function directly,
- asserts the metric classifies the pair per the manifest's expectation.

Charter § 1.1 item 5 placement rationale (charter-v2):

- The two CI workflows that would gate the fixtures (``integrity.yml`` +
  ``python-strict.yml``) trigger with identical breadth/frequency (push to
  ``main`` + pull_request; no path filters) — no coverage advantage to
  centralizing in ``tools/integrity/``.
- Cat 1-5 + Cat-X is a semantic schema (Cat 3 = golden-value numerical
  correctness of vendored algorithm implementations,
  `docs/architecture.md:724`); image-pair classification is outside Cat 3's
  scope. Wiring a `run_cat3_render_similarity` handler would fight the
  framework.
- `docs/architecture.md:673` places ``render_similarity/`` under
  ``tools/testkit/``, parallel to ``code_verification/`` / ``golden/`` /
  ``determinism/`` / ``equivalence/``. The fixture pack co-locates with the
  metric it verifies — architectural symmetry: cat fixtures co-locate with
  cat handlers under integrity; render-similarity fixtures co-locate with
  render-similarity under testkit.

No ``run_cat3_render_similarity`` integrity handler is wired; the meta-test
rides the ``test-render-similarity`` CI job under ``python-strict.yml``.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from render_similarity import lpips, ssim

_FIXTURE_ROOT = Path(__file__).resolve().parent / "fixtures" / "adversarial"


def _load_fixture(family: str) -> tuple[dict[str, object], np.ndarray, np.ndarray]:
    fixture_dir = _FIXTURE_ROOT / family
    manifest = json.loads((fixture_dir / "manifest.json").read_text(encoding="utf-8"))
    image_a = np.load(fixture_dir / "image_a.npy")
    image_b = np.load(fixture_dir / "image_b.npy")
    return manifest, image_a, image_b


def test_ssim_flags_inverted_checkerboard_as_different() -> None:
    """A correct SSIM scores the inverted-checkerboard pair << 1.0.

    A buggy SSIM (luminance-only; structure term dropped) would score this
    pair ≈ 1.0 because the two images share mean / variance / contrast
    statistics globally. The meta-test asserts the structure term is
    actually engaged.
    """
    manifest, a, b = _load_fixture("ssim_false_positive")
    score = ssim(a, b)
    threshold = float(manifest["expected_ssim_max"])  # type: ignore[arg-type]
    assert score < threshold, (
        f"SSIM adversarial fixture {manifest!r} undetected: scored {score!r} "
        f">= threshold {threshold!r} (buggy SSIM would pass here)"
    )


def test_lpips_flags_near_identical_pair_as_identical() -> None:
    """A correct LPIPS scores the near-identical uint8 pair << threshold.

    A buggy LPIPS that fails to normalize uint8 [0,255] → network [-1,1]
    would return a score driven by the 100x scale mismatch (typical
    failure mode for hand-rolled lpips-clones). The meta-test asserts
    the normalization is correctly applied — the manifest's threshold is
    well below any plausible different-pair LPIPS value.
    """
    manifest, a, b = _load_fixture("lpips_false_negative")
    score = lpips(a, b)
    threshold = float(manifest["expected_lpips_max"])  # type: ignore[arg-type]
    assert score < threshold, (
        f"LPIPS adversarial fixture {manifest!r} undetected: scored {score!r} "
        f">= threshold {threshold!r} (buggy LPIPS would fail here)"
    )
