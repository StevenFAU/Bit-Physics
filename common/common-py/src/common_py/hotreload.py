"""Hot-reload via watchfiles + child-process re-exec (charter § 7.1 D).

Phase 1 Stage 1 ships the surface; the body is a thin wrapper around
``watchfiles.watch`` that re-execs the current Python process when any
watched path changes. Per spec § 4.4, this is the recommended pattern
for Stack D sims since Taichi cannot be re-initialized in-process.
"""

from __future__ import annotations

import os
import sys
from collections.abc import Iterable
from pathlib import Path

__all__ = ["watch_and_reexec"]


def watch_and_reexec(paths: Iterable[Path], debounce_ms: int = 250) -> None:
    """Block on watchfiles; ``execvp`` the current interpreter on change.

    INFERENCE: ``watchfiles.watch`` is a generator that yields a set
    of (Change, str) tuples per detected change; iterating it
    indefinitely returns control only on KeyboardInterrupt. The
    re-exec uses :func:`os.execvp` so the OS replaces the process
    image (Taichi cleanup is implicit).
    """
    try:
        from watchfiles import watch
    except ImportError as exc:  # pragma: no cover
        raise ImportError(
            "common_py.hotreload requires watchfiles. Add to your project's "
            "dependencies or install via `pip install watchfiles`."
        ) from exc
    paths_list = [str(Path(p).resolve()) for p in paths]
    if not paths_list:
        raise ValueError("watch_and_reexec needs at least one path to watch")
    for _changes in watch(*paths_list, debounce=debounce_ms):
        # Re-exec the current interpreter with the original argv.
        os.execvp(sys.executable, [sys.executable, *sys.argv])
