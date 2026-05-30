"""Vendored-manifest pin-consistency meta-test (Phase-4 A4).

Every landed vendored upstream ships ``references/<name>/MANIFEST.toml``
(UPPERCASE) with an ``[upstream]`` block carrying ``name / version / sha /
url / license / license_file``. This meta-test guards two things:

1. **HARD (assert):** every manifest is structurally complete — the
   ``[upstream]`` block parses and carries non-empty ``name``, ``version``,
   ``sha``, ``url``, ``license``; ``url`` is an
   ``https://github.com/<org>/<repo>`` form; ``license_file`` is present
   unless the dep is cite-only (``license == "NONE"`` → no source / LICENSE
   vendored, e.g. PhysGaussian). A structurally-broken manifest is a real
   defect and fails the build.

2. **SOFT (warn, never fails):** the manifest's ``license`` agrees with the
   spec's vendored-dependency registry (architecture.md § D.3 — the
   spec-side equivalent of the phase plans' § 3.3 / § 2.18 vendoring
   tables) for deps whose repo D.3 names. Drift here is **SOFT_WARN, not
   HARD_FAIL** per the A4 dispatch (the registry tables are prose that
   evolves). Implemented via ``warnings.warn`` under a per-test
   ``filterwarnings("always")`` override so the suite-wide
   ``filterwarnings=["error"]`` does not escalate it.

**Probe-then-pin deps (OpenVDB, Newton — SHA resolves at vendoring time by
design):** their D.3 rows exist before the manifest does. When their
manifest lands, this guard checks **presence + repo + license**, never a
pre-baked SHA. The SHA is not cross-checked for ANY dep — registry pins
drift legitimately as upstreams re-release.

The check lives in the integrity meta-test suite (``tools/integrity/tests/``,
run by ``.github/workflows/integrity.yml``). It is intentionally NOT a new
``integrity --all`` SOFT_WARN category, so it does not perturb the
``0 HARD_FAIL / 14 SOFT_WARN`` baseline invariant (§ R).
"""

from __future__ import annotations

import re
import tomllib
import warnings
from pathlib import Path

import pytest

from integrity.common.repo import find_repo_root

_REPO_ID_RE = re.compile(r"github\.com/([\w.-]+/[\w.-]+?)(?:\.git)?/?$")
# Repo identifiers appear in D.3 verification commands as `-R <org>/<repo>`
# or `repos/<org>/<repo>`.
_D3_REPO_RE = re.compile(r"(?:-R\s+|repos/)([\w.-]+/[\w.-]+)")

_REQUIRED_UPSTREAM_KEYS = ("name", "version", "sha", "url", "license")


def _manifests(repo_root: Path) -> list[Path]:
    return sorted((repo_root / "references").glob("*/MANIFEST.toml"))


def _repo_id_from_url(url: str) -> str | None:
    m = _REPO_ID_RE.search(url.strip())
    return m.group(1).lower() if m else None


def _license_token(raw: str) -> str:
    return re.sub(r"[*`]", "", raw).strip()


def _d3_registry(repo_root: Path) -> dict[str, str]:
    """Parse architecture.md § D.3 into {repo_id_lower: license}.

    Each D.3 table row is ``| Dep | Used by | Pin | License | Verify cmd |``.
    The repo identifier is mined from the verification command (``-R org/repo``
    / ``repos/org/repo``); the license is the 4th column.
    """
    spec = (repo_root / "docs" / "architecture.md").read_text(encoding="utf-8")
    out: dict[str, str] = {}
    in_d3 = False
    for line in spec.splitlines():
        if line.startswith("## D.3"):
            in_d3 = True
            continue
        if in_d3 and line.startswith("## "):
            break
        if not in_d3 or not line.lstrip().startswith("|"):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) < 5 or cells[0] in {"Dependency"} or set(cells[0]) <= {"-"}:
            continue
        license_token = _license_token(cells[3])
        for rid in _D3_REPO_RE.findall(cells[4]):
            out[rid.lower()] = license_token
    return out


def test_manifests_are_structurally_complete() -> None:
    """HARD: every references/*/MANIFEST.toml [upstream] is well-formed."""
    repo_root = find_repo_root()
    manifests = _manifests(repo_root)
    assert manifests, "expected at least one references/<name>/MANIFEST.toml"
    for mf in manifests:
        data = tomllib.loads(mf.read_text(encoding="utf-8"))
        rel = mf.relative_to(repo_root)
        assert "upstream" in data, f"{rel}: missing [upstream] block"
        up = data["upstream"]
        for key in _REQUIRED_UPSTREAM_KEYS:
            val = up.get(key)
            assert isinstance(val, str) and val.strip(), f"{rel}: [upstream].{key} empty/missing"
        url = up["url"].strip()
        assert url.startswith("https://github.com/"), f"{rel}: url not github https: {url!r}"
        assert _repo_id_from_url(url), f"{rel}: url has no org/repo: {url!r}"
        # license_file required EXCEPT cite-only deps (NONE license → no LICENSE vendored).
        if _license_token(up["license"]).upper() != "NONE":
            lf = up.get("license_file")
            assert isinstance(lf, str) and lf.strip(), f"{rel}: license_file empty/missing"


@pytest.mark.filterwarnings("always")
def test_manifest_license_agrees_with_d3_registry() -> None:
    """SOFT_WARN (never fails): manifest license vs architecture.md § D.3.

    A drift emits a ``warnings.warn`` (surfaced in the pytest warnings
    summary) but does not fail the build — the registry is prose and
    evolves. The SHA is never cross-checked (probe-then-pin discipline +
    legitimate re-release drift). Deps with no D.3 repo row (vendored under
    a phase plan § 2.18 table instead) are silently skipped.
    """
    repo_root = find_repo_root()
    registry = _d3_registry(repo_root)
    assert registry, "could not parse any rows from architecture.md § D.3"
    for mf in _manifests(repo_root):
        up = tomllib.loads(mf.read_text(encoding="utf-8")).get("upstream", {})
        rel = mf.relative_to(repo_root)
        repo_id = _repo_id_from_url(str(up.get("url", "")))
        if repo_id is None or repo_id not in registry:
            continue
        manifest_license = _license_token(str(up.get("license", "")))
        if manifest_license != registry[repo_id]:
            warnings.warn(
                f"{rel}: license drift — MANIFEST [upstream].license="
                f"{manifest_license!r} but architecture.md § D.3 says "
                f"{registry[repo_id]!r} for {repo_id!r}",
                stacklevel=2,
            )
