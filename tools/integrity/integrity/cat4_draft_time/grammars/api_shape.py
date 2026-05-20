"""Cat 4 grammar (c) — ``<API X has shape Y>`` assertion.

Syntax
------

    <API X has shape Y>

where ``X`` is a fully-qualified symbol name and ``Y`` is its declared
shape (function signature, struct/class declaration line, or
module-level binding). The grammar appears in prose files; the
verifier resolves ``X`` against the codebase and compares its actual
shape to ``Y`` after whitespace normalization.

Symbol resolution
-----------------

- ``X`` containing ``.`` is treated as a **Python** dotted qualified
  name: ``common_py.determinism.Config`` or
  ``common_py.determinism.from_args``. The resolver imports nothing;
  it AST-parses the source under ``common/common-py/src/`` (and
  ``tools/`` packages that are part of the integrity surface) to find
  the matching ``FunctionDef`` / ``AsyncFunctionDef`` / ``ClassDef``
  by qualified name, then reconstructs the signature.
- ``X`` containing ``::`` is treated as a **C++** namespace-qualified
  name: ``bit_physics::common_cpp::determinism::Config`` or
  ``bit_physics::common_cpp::determinism::from_args``. The resolver
  regex-scans the header surface at ``common/common-cpp/include/``
  for the leaf declaration and extracts the declaration line.

Pass / fail
-----------

- PASS when ``X`` resolves to exactly one definition site whose
  normalized shape equals ``Y`` (whitespace runs collapsed to a single
  space; leading and trailing whitespace stripped on both sides).
- FAIL (HARD_FAIL) when ``X`` does not resolve, when it resolves to
  multiple sites whose shapes disagree, or when the resolved shape
  does not match ``Y``.

Scope / tradeoffs
-----------------

Charter § 1.7 R8 amendment: Phase 4's ``cat2.api_imports`` check
depends on this grammar being functional for the common-module public
APIs. The implementation is **deliberately surface-only**: Python
goes via :mod:`ast`, C++ via regex on the header. This handles the
common-cpp / common-py public-API shapes (structs with named fields,
free functions with simple types, member-function declarations on
classes / namespaces). Anything outside that envelope — templated
declarations, C++ overload sets, Python decorators that synthesize
attributes at import time — is **out of scope** for this grammar and
will HARD_FAIL with a diagnostic naming the limitation. A robust C++
AST walk (libclang) is banked for a follow-up phase.
"""

from __future__ import annotations

import ast
import re
from pathlib import Path

from ...common.repo import is_excluded, repo_tracked_files
from ...common.types import FailureMode, Finding
from ._md_scope import iter_narrative_lines

CHECK_ID = "cat4.api-shape"

# Opening of the assertion. Shape termination is bracket-balanced (see
# :func:`_extract_assertions`) so that ``->`` arrows and ``<T>`` template
# brackets inside ``Y`` are honored.
_OPEN_RE = re.compile(
    r"<API\s+"
    r"(?P<symbol>[A-Za-z_][A-Za-z0-9_:.]*)"
    r"\s+has\s+shape\s+"
)


def _extract_assertions(line: str) -> list[tuple[int, str, str]]:
    """Return ``(column, symbol, shape)`` triples for every assertion on ``line``.

    Shape boundary is the first ``>`` at *bracket depth zero*, where
    ``<API`` opens a depth-1 context and every additional ``<`` /
    ``>`` adjusts the depth. ``->`` is recognized as a single token so
    its ``>`` does not close the assertion.
    """
    out: list[tuple[int, str, str]] = []
    pos = 0
    while pos < len(line):
        m = _OPEN_RE.search(line, pos)
        if m is None:
            break
        symbol = m.group("symbol")
        i = m.end()
        depth = 1  # we are inside the opening '<API ...'
        shape_start = i
        while i < len(line):
            ch = line[i]
            # Skip '->' as a unit so its '>' is not counted.
            if ch == "-" and i + 1 < len(line) and line[i + 1] == ">":
                i += 2
                continue
            if ch == "<":
                depth += 1
            elif ch == ">":
                depth -= 1
                if depth == 0:
                    shape = line[shape_start:i].rstrip()
                    out.append((m.start(), symbol, shape))
                    i += 1
                    break
            i += 1
        pos = i
    return out


_PROSE_SUFFIXES = {".md", ".markdown", ".rst", ".txt"}

_PROSE_ROOTS = ("docs/", "README.md", "CHANGELOG.md", "CONTRIBUTING.md")

# Source roots scanned for symbol resolution. Order matters only as a
# stable enumeration; resolution is unique-by-qualified-name.
_PY_ROOTS: tuple[str, ...] = (
    "common/common-py/src",
    "tools/integrity/integrity",
    "tools/testkit",
    "tools/diagnostics/diagnostics",
)

_CPP_HEADER_ROOT = "common/common-cpp/include"


def _is_in_scope(rel: Path) -> bool:
    s = rel.as_posix()
    if rel.suffix not in _PROSE_SUFFIXES:
        return False
    return any(s == prefix or s.startswith(prefix) for prefix in _PROSE_ROOTS)


def _normalize(s: str) -> str:
    """Collapse whitespace runs to a single space; strip ends."""
    return re.sub(r"\s+", " ", s).strip()


# ---------- Python resolver ----------


def _python_module_paths(repo_root: Path, dotted: str) -> list[tuple[Path, str]]:
    """Return list of (file, relative_qualname_inside_file) for ``dotted``.

    Strategy: enumerate ``a.b.c`` -> for each prefix length k from
    longest to 1, look up ``<root>/<a>/<b>/.../<prefix_k>.py`` and
    ``<root>/<a>/.../<prefix_k>/__init__.py``. The remaining suffix
    (``.c`` etc.) is the qualified-name path inside that module.
    """
    parts = dotted.split(".")
    candidates: list[tuple[Path, str]] = []
    for root_name in _PY_ROOTS:
        root = repo_root / root_name
        if not root.exists():
            continue
        for k in range(len(parts), 0, -1):
            mod_path = parts[:k]
            inner = parts[k:]
            module_file = root.joinpath(*mod_path).with_suffix(".py")
            package_init = root.joinpath(*mod_path, "__init__.py")
            for cand in (module_file, package_init):
                if cand.is_file():
                    candidates.append((cand, ".".join(inner)))
    return candidates


def _ast_find(module: ast.Module, qualname: str) -> ast.AST | None:
    """Find a top-level / nested FunctionDef/AsyncFunctionDef/ClassDef by qualname.

    Empty qualname returns the module itself (callers can decide what
    to do with that — typically not supported as an "API shape").
    """
    if qualname == "":
        return module
    parts = qualname.split(".")
    container: ast.AST = module
    for part in parts:
        body = getattr(container, "body", None)
        if body is None:
            return None
        nxt: ast.AST | None = None
        for node in body:
            if (
                isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef | ast.ClassDef)
                and node.name == part
            ):
                nxt = node
                break
        if nxt is None:
            return None
        container = nxt
    return container


def _python_signature(node: ast.AST) -> str | None:
    """Render a callable / class node back into a normalized declaration string."""
    if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef):
        kw = "async def " if isinstance(node, ast.AsyncFunctionDef) else "def "
        args_str = _render_args(node.args)
        ret = ""
        if node.returns is not None:
            ret = f" -> {ast.unparse(node.returns)}"
        return _normalize(f"{kw}{node.name}({args_str}){ret}")
    if isinstance(node, ast.ClassDef):
        bases = [ast.unparse(b) for b in node.bases]
        kwds = [f"{k.arg}={ast.unparse(k.value)}" for k in node.keywords if k.arg]
        parts = bases + kwds
        head = node.name + ("(" + ", ".join(parts) + ")" if parts else "")
        return _normalize(f"class {head}")
    return None


def _render_args(args: ast.arguments) -> str:
    pieces: list[str] = []
    posonly = list(getattr(args, "posonlyargs", []))
    regular = list(args.args)
    defaults_for_pos = args.defaults  # last-N defaults align to (posonly+regular)
    pos_all = posonly + regular
    # Pad defaults to align with positional args.
    pad = [None] * (len(pos_all) - len(defaults_for_pos)) + list(defaults_for_pos)
    for i, a in enumerate(pos_all):
        pieces.append(_render_arg(a, pad[i]))
        if posonly and i == len(posonly) - 1:
            pieces.append("/")
    if args.vararg is not None:
        pieces.append("*" + _render_arg(args.vararg, None))
    elif args.kwonlyargs:
        pieces.append("*")
    for j, a in enumerate(args.kwonlyargs):
        d = args.kw_defaults[j] if j < len(args.kw_defaults) else None
        pieces.append(_render_arg(a, d))
    if args.kwarg is not None:
        pieces.append("**" + _render_arg(args.kwarg, None))
    return ", ".join(pieces)


def _render_arg(a: ast.arg, default: ast.expr | None) -> str:
    name = a.arg
    if a.annotation is not None:
        name = f"{name}: {ast.unparse(a.annotation)}"
    if default is not None:
        name = f"{name} = {ast.unparse(default)}"
    return name


def _resolve_python(repo_root: Path, dotted: str) -> tuple[str | None, str | None]:
    """Return (normalized_shape, error). Exactly one of the two is non-None."""
    candidates = _python_module_paths(repo_root, dotted)
    if not candidates:
        return (None, f"no Python module contains symbol {dotted!r}")
    resolved: list[str] = []
    parse_errors: list[str] = []
    for module_file, qualname in candidates:
        try:
            text = module_file.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError) as e:
            parse_errors.append(f"{module_file}: {e}")
            continue
        try:
            mod = ast.parse(text)
        except SyntaxError as e:
            parse_errors.append(f"{module_file}: {e}")
            continue
        node = _ast_find(mod, qualname)
        if node is None or node is mod:
            continue
        sig = _python_signature(node)
        if sig is None:
            continue
        resolved.append(sig)
    if not resolved:
        suffix = f" (parse errors: {parse_errors})" if parse_errors else ""
        return (None, f"symbol {dotted!r} not found in any candidate module{suffix}")
    # Dedupe (a class re-exported through an __init__ would not appear
    # because we look only at FunctionDef/ClassDef bodies, not Imports).
    unique = sorted(set(resolved))
    if len(unique) > 1:
        return (None, f"symbol {dotted!r} resolved to {len(unique)} distinct shapes: {unique}")
    return (unique[0], None)


# ---------- C++ resolver ----------

# Free-function or member-function declaration line. Best-effort regex.
_CPP_DECL_RE_TMPL = (
    # leading return type / qualifiers (non-greedy, no semicolons)
    r"(?P<decl>[A-Za-z_][\w:&<>* ,]*?\s+{name}\s*\([^;{{]*\)"
    r"\s*(?:const|noexcept|=\s*default|=\s*delete|override|final|\s)*)\s*;"
)

# Struct/class declaration (`struct Name {` or `struct Name : Base {`).
_CPP_TYPE_DECL_RE_TMPL = r"(?P<decl>(?:struct|class)\s+{name}(?:\s*:\s*[^\{{]*)?)\s*\{{"


def _find_cpp_header_files(repo_root: Path) -> list[Path]:
    root = repo_root / _CPP_HEADER_ROOT
    if not root.exists():
        return []
    return [p for p in root.rglob("*.hpp")] + [p for p in root.rglob("*.h")]


def _resolve_cpp(repo_root: Path, qualname: str) -> tuple[str | None, str | None]:
    """Resolve a ``a::b::c`` C++ symbol against ``common/common-cpp/include/``."""
    parts = qualname.split("::")
    leaf = parts[-1]
    # Compose the namespace prefix that must enclose the declaration
    # (allowing collapsed or expanded namespace forms).
    namespace_chain = parts[:-1]
    headers = _find_cpp_header_files(repo_root)
    if not headers:
        return (None, "no C++ headers under common/common-cpp/include/ to scan")
    func_re = re.compile(_CPP_DECL_RE_TMPL.format(name=re.escape(leaf)), re.MULTILINE)
    type_re = re.compile(_CPP_TYPE_DECL_RE_TMPL.format(name=re.escape(leaf)), re.MULTILINE)
    hits: list[str] = []
    for header in headers:
        try:
            text = header.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        # Crude namespace gate: every namespace component must appear in the
        # file ahead of the declaration. Cheap, sound for the common-cpp
        # public surface where namespaces are nested explicitly.
        if namespace_chain and not all(
            re.search(rf"\bnamespace\s+(?:[\w:]+::)?{re.escape(ns)}\b", text)
            or re.search(rf"\bnamespace\s+(?:[\w:]+\s*::\s*)?{re.escape(ns)}\b", text)
            for ns in namespace_chain
        ):
            continue
        for rx in (type_re, func_re):
            for m in rx.finditer(text):
                hits.append(_normalize(m.group("decl")))
    if not hits:
        return (None, f"C++ symbol {qualname!r} not found in header surface")
    unique = sorted(set(hits))
    if len(unique) > 1:
        return (None, f"C++ symbol {qualname!r} resolved to {len(unique)} shapes: {unique}")
    return (unique[0], None)


# ---------- dispatch + scan ----------


def _resolve(repo_root: Path, symbol: str) -> tuple[str | None, str | None]:
    if "::" in symbol:
        return _resolve_cpp(repo_root, symbol)
    if "." in symbol:
        return _resolve_python(repo_root, symbol)
    return (None, f"symbol {symbol!r} is not qualified (use '.' for Python or '::' for C++)")


def _scan_file(repo_root: Path, rel_path: Path) -> list[Finding]:
    full = repo_root / rel_path
    try:
        text = full.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return []
    findings: list[Finding] = []
    for line_no, line in iter_narrative_lines(text):
        for _col, symbol, raw_shape in _extract_assertions(line):
            expected = _normalize(raw_shape)
            shape, err = _resolve(repo_root, symbol)
            if err is not None:
                findings.append(
                    Finding(
                        check=CHECK_ID,
                        severity=FailureMode.HARD_FAIL,
                        path=rel_path,
                        line=line_no,
                        message=(
                            f"draft assertion <API {symbol} has shape ...> could not resolve: {err}"
                        ),
                    )
                )
                continue
            assert shape is not None  # invariant from _resolve
            if shape != expected:
                findings.append(
                    Finding(
                        check=CHECK_ID,
                        severity=FailureMode.HARD_FAIL,
                        path=rel_path,
                        line=line_no,
                        message=(
                            f"draft assertion <API {symbol} has shape ...> "
                            f"mismatch — expected {expected!r}, actual {shape!r}"
                        ),
                    )
                )
    return findings


def run_cat4_api_shape(repo_root: Path, files: list[Path] | None = None) -> list[Finding]:
    """Scan prose files for ``<API X has shape Y>`` assertions and verify each."""
    candidates = files if files is not None else repo_tracked_files(repo_root)
    findings: list[Finding] = []
    for rel in candidates:
        if is_excluded(rel):
            continue
        if not _is_in_scope(rel):
            continue
        findings.extend(_scan_file(repo_root, rel))
    return findings
