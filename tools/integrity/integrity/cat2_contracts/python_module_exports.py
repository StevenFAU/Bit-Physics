"""Cat 2.python-exports — every public symbol in a package ``__init__.py`` resolves.

Spec § 3.2: HARD_FAIL. A "public symbol" is either:

- A name listed in ``__all__``, OR
- A name imported with `from .submodule import name` (when there is no
  ``__all__``).

We parse the AST of each ``__init__.py`` (no execution — pure static
analysis), enumerate the symbols, and assert each is reachable by either
(a) a same-package submodule of the same name with a matching attribute,
(b) a same-package submodule whose name matches the symbol, or (c) any
import-from statement that brings the symbol into the namespace.

Out of scope at Phase 0: cross-package re-exports, conditional imports.
"""

from __future__ import annotations

import ast
from pathlib import Path

from ..common.repo import is_excluded, repo_tracked_files
from ..common.types import FailureMode, Finding

CHECK_ID = "cat2.python-exports"


def _collect_dunder_all(tree: ast.Module) -> list[str] | None:
    for node in tree.body:
        if (
            isinstance(node, ast.Assign)
            and len(node.targets) == 1
            and isinstance(node.targets[0], ast.Name)
            and node.targets[0].id == "__all__"
            and isinstance(node.value, ast.List | ast.Tuple)
        ):
            names: list[str] = []
            for elt in node.value.elts:
                if isinstance(elt, ast.Constant) and isinstance(elt.value, str):
                    names.append(elt.value)
            return names
    return None


def _collect_imported_names(tree: ast.Module) -> dict[str, ast.ImportFrom | ast.Import]:
    out: dict[str, ast.ImportFrom | ast.Import] = {}
    for node in tree.body:
        if isinstance(node, ast.ImportFrom):
            for alias in node.names:
                exported = alias.asname or alias.name
                if exported == "*":
                    continue
                out[exported] = node
        elif isinstance(node, ast.Import):
            for alias in node.names:
                exported = alias.asname or alias.name.split(".")[0]
                out[exported] = node
    return out


def _module_path_for_import(
    init_path: Path, repo_root: Path, module: str, level: int
) -> Path | None:
    """Resolve `from <relative> import X` to a file path."""
    if level == 0:
        # absolute import; skip — we only verify intra-package wiring
        return None
    base = init_path.parent
    for _ in range(level - 1):
        base = base.parent
    rel = module.replace(".", "/") if module else ""
    if rel:
        candidate_pkg = base / rel / "__init__.py"
        candidate_mod = base / f"{rel}.py"
    else:
        candidate_pkg = base / "__init__.py"
        candidate_mod = None
    for c in (candidate_pkg, candidate_mod):
        if c is None:
            continue
        if (repo_root / c).exists() if not c.is_absolute() else c.exists():
            return c
    return None


def _check_init(repo_root: Path, init_rel: Path) -> list[Finding]:
    full = repo_root / init_rel
    try:
        text = full.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return []
    try:
        tree = ast.parse(text, filename=str(init_rel))
    except SyntaxError as exc:
        return [
            Finding(
                check=CHECK_ID,
                severity=FailureMode.HARD_FAIL,
                path=init_rel,
                line=exc.lineno,
                message=f"syntax error parsing __init__.py: {exc.msg}",
            )
        ]
    imported = _collect_imported_names(tree)
    dunder_all = _collect_dunder_all(tree)
    public_names = dunder_all if dunder_all is not None else list(imported.keys())

    findings: list[Finding] = []
    for name in public_names:
        if name not in imported:
            # Names not in `imported` may still be bound by a module-level
            # assignment, function, class, or annotation. Only flag if none
            # of those define it either.
            if _module_defines(tree, name):
                continue
            findings.append(
                Finding(
                    check=CHECK_ID,
                    severity=FailureMode.HARD_FAIL,
                    path=init_rel,
                    line=None,
                    message=(f"__all__ declares '{name}' but it is not bound in this module"),
                )
            )
            continue
        node = imported[name]
        if isinstance(node, ast.ImportFrom) and node.level > 0:
            target = _module_path_for_import(init_rel, repo_root, node.module or "", node.level)
            if target is None:
                findings.append(
                    Finding(
                        check=CHECK_ID,
                        severity=FailureMode.HARD_FAIL,
                        path=init_rel,
                        line=node.lineno,
                        message=(
                            f"export '{name}' imported from "
                            f"{'.' * node.level}{node.module or ''} "
                            f"but the target module file is missing"
                        ),
                    )
                )
                continue
            target_full = target if target.is_absolute() else repo_root / target
            try:
                target_text = target_full.read_text(encoding="utf-8")
                target_tree = ast.parse(target_text, filename=str(target))
            except (OSError, SyntaxError):
                continue
            # Check the target defines `name` somewhere at module scope.
            original_name = None
            for alias in node.names:
                if (alias.asname or alias.name) == name:
                    original_name = alias.name
                    break
            if original_name is None or original_name == "*":
                continue
            if not _module_defines(target_tree, original_name):
                findings.append(
                    Finding(
                        check=CHECK_ID,
                        severity=FailureMode.HARD_FAIL,
                        path=init_rel,
                        line=node.lineno,
                        message=(
                            f"export '{name}' (imported from "
                            f"{'.' * node.level}{node.module or ''} as "
                            f"'{original_name}') is not defined in "
                            f"{target}"
                        ),
                    )
                )
    return findings


def _module_defines(tree: ast.Module, name: str) -> bool:
    for node in tree.body:
        if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef | ast.ClassDef):
            if node.name == name:
                return True
        elif isinstance(node, ast.Assign):
            for tgt in node.targets:
                if isinstance(tgt, ast.Name) and tgt.id == name:
                    return True
        elif isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name):
            if node.target.id == name:
                return True
        elif isinstance(node, ast.ImportFrom):
            for alias in node.names:
                if (alias.asname or alias.name) == name:
                    return True
        elif isinstance(node, ast.Import):
            for alias in node.names:
                if (alias.asname or alias.name.split(".")[0]) == name:
                    return True
    return False


def run_cat2_python_exports(repo_root: Path, files: list[Path] | None = None) -> list[Finding]:
    """Entry point. Scans every `__init__.py` under tracked Python packages."""
    if files is not None:
        candidates = [p for p in files if p.name == "__init__.py"]
    else:
        candidates = [p for p in repo_tracked_files(repo_root) if p.name == "__init__.py"]
    findings: list[Finding] = []
    for init in candidates:
        if is_excluded(init):
            continue
        findings.extend(_check_init(repo_root, init))
    return findings
