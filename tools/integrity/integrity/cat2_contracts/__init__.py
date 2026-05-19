"""Cat 2 — Contract verification (spec § 3.2). HARD_FAIL.

Phase 0 ships the `cat2.python-exports` sub-check only. Stack-C (C++) and
Stack-B (Bun/TS) contract checks ship in Phase 1+; placeholders below.
"""

from __future__ import annotations

from .python_module_exports import run_cat2_python_exports

__all__ = ["run_cat2_python_exports"]


# TODO(phase-1): cat2.cpp-headers — match public C++ symbols declared in
# header files to definitions in the corresponding translation units.
# TODO(phase-1): cat2.ts-exports — match exports declared in *.d.ts
# surfaces to implementations in *.ts files.
