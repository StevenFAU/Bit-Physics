"""Cat 4 grammar (c) — ``<API X has shape Y>`` tests (charter § 1.7 R8).

Positive + negative cases for the API-shape verifier covering both
Python (AST-resolved) and C++ (header-regex-resolved) surfaces.
"""

from __future__ import annotations

from pathlib import Path

from integrity.cat4_draft_time.grammars.api_shape import (
    CHECK_ID,
    run_cat4_api_shape,
)
from integrity.common.types import FailureMode


def _write(repo: Path, rel: str, body: str) -> None:
    full = repo / rel
    full.parent.mkdir(parents=True, exist_ok=True)
    full.write_text(body, encoding="utf-8")


def _python_module(repo: Path) -> None:
    """Materialize a tiny Python package under common/common-py/src/ for tests."""
    _write(repo, "common/common-py/src/example/__init__.py", "")
    _write(
        repo,
        "common/common-py/src/example/api.py",
        "from dataclasses import dataclass\n"
        "\n"
        "@dataclass\n"
        "class Config:\n"
        "    deterministic: bool = False\n"
        "    seed: int = 0\n"
        "\n"
        "def from_args(args: int) -> Config:\n"
        "    return Config(seed=args)\n",
    )


def _cpp_header(repo: Path) -> None:
    """Materialize a tiny common-cpp header for tests."""
    _write(
        repo,
        "common/common-cpp/include/example/api.hpp",
        "#pragma once\n"
        "#include <cstdint>\n"
        "namespace example {\n"
        "struct Config {\n"
        "    bool deterministic = false;\n"
        "    uint64_t seed = 0;\n"
        "};\n"
        "Config from_args(int& argc, char** argv);\n"
        "}  // namespace example\n",
    )


def test_positive_python_class_shape(tmp_path: Path) -> None:
    _python_module(tmp_path)
    _write(
        tmp_path,
        "docs/draft.md",
        "Spec: <API example.api.Config has shape class Config>.\n",
    )
    findings = run_cat4_api_shape(tmp_path, [Path("docs/draft.md")])
    assert findings == [], f"expected clean: {findings}"


def test_positive_python_function_with_whitespace_variation(tmp_path: Path) -> None:
    """Whitespace runs collapse on both sides — variant spacing still passes."""
    _python_module(tmp_path)
    _write(
        tmp_path,
        "docs/draft.md",
        "Func: <API example.api.from_args has shape def from_args(args:    int)   ->   Config>.\n",
    )
    findings = run_cat4_api_shape(tmp_path, [Path("docs/draft.md")])
    assert findings == [], f"expected clean: {findings}"


def test_negative_python_symbol_absent(tmp_path: Path) -> None:
    _python_module(tmp_path)
    _write(
        tmp_path,
        "docs/draft.md",
        "Bad: <API example.api.does_not_exist has shape def does_not_exist() -> None>.\n",
    )
    findings = run_cat4_api_shape(tmp_path, [Path("docs/draft.md")])
    assert len(findings) == 1, findings
    f = findings[0]
    assert f.check == CHECK_ID
    assert f.severity == FailureMode.HARD_FAIL
    assert "not found" in f.message


def test_negative_python_signature_mismatch(tmp_path: Path) -> None:
    _python_module(tmp_path)
    _write(
        tmp_path,
        "docs/draft.md",
        "Wrong: <API example.api.from_args has shape def from_args(args: str) -> int>.\n",
    )
    findings = run_cat4_api_shape(tmp_path, [Path("docs/draft.md")])
    assert len(findings) == 1, findings
    f = findings[0]
    assert f.severity == FailureMode.HARD_FAIL
    assert "mismatch" in f.message


def test_positive_cpp_struct(tmp_path: Path) -> None:
    _cpp_header(tmp_path)
    _write(
        tmp_path,
        "docs/draft.md",
        "Spec: <API example::Config has shape struct Config>.\n",
    )
    findings = run_cat4_api_shape(tmp_path, [Path("docs/draft.md")])
    assert findings == [], f"expected clean: {findings}"


def test_positive_cpp_function(tmp_path: Path) -> None:
    _cpp_header(tmp_path)
    _write(
        tmp_path,
        "docs/draft.md",
        "Func: <API example::from_args has shape Config from_args(int& argc, char** argv)>.\n",
    )
    findings = run_cat4_api_shape(tmp_path, [Path("docs/draft.md")])
    assert findings == [], f"expected clean (got {findings})"


def test_negative_cpp_signature_mismatch(tmp_path: Path) -> None:
    _cpp_header(tmp_path)
    _write(
        tmp_path,
        "docs/draft.md",
        "Wrong: <API example::from_args has shape int from_args()>.\n",
    )
    findings = run_cat4_api_shape(tmp_path, [Path("docs/draft.md")])
    assert len(findings) == 1, findings
    assert "mismatch" in findings[0].message


def test_negative_unqualified_symbol_rejected(tmp_path: Path) -> None:
    """A bare name (no ``.`` or ``::``) is rejected as ambiguous."""
    _write(tmp_path, "docs/draft.md", "<API bareName has shape void bareName()>.\n")
    findings = run_cat4_api_shape(tmp_path, [Path("docs/draft.md")])
    assert len(findings) == 1, findings
    assert "not qualified" in findings[0].message
