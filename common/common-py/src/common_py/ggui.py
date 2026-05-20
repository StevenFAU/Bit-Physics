"""Taichi GGUI F-key workaround surface (charter § 7.1 deliverable D).

Taichi's GGUI traps the F-keys (F1-F12) for its built-in performance
overlay even after the user has bound them to sim-side hotkeys; the
overlay's key handler runs before the user callback and consumes the
event. This module documents the workaround pattern Stack D sims
should use (poll-then-dispatch) and provides a small helper.

See also: spec § 4.4 (Stack D limitations).
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

__all__ = ["KEYS_TRAPPED_BY_GGUI", "FKeyDispatcher"]


# Documented in upstream Taichi issue tracker — these specific keycodes
# are consumed by GGUI's overlay handler before the user callback runs.
# Stack D sims poll the window's *raw* key state on each frame and
# dispatch handlers themselves.
KEYS_TRAPPED_BY_GGUI: tuple[str, ...] = (
    "F1",
    "F2",
    "F3",
    "F4",
    "F5",
    "F6",
    "F7",
    "F8",
    "F9",
    "F10",
    "F11",
    "F12",
)


@dataclass
class FKeyDispatcher:
    """Poll-then-dispatch helper for F-key handlers in Taichi GGUI sims.

    Usage::

        dispatcher = FKeyDispatcher()
        dispatcher.bind("F5", lambda: capture_screenshot())
        # Inside the per-frame loop:
        dispatcher.poll(window)

    The ``window`` argument must expose ``is_pressed(key) -> bool``
    (Taichi GGUI's ``ti.ui.Window`` does). The dispatcher tracks edges
    so each handler fires once per press, not once per frame held.
    """

    handlers: dict[str, Callable[[], None]] = field(default_factory=dict)
    _pressed: dict[str, bool] = field(default_factory=dict)

    def bind(self, key: str, handler: Callable[[], None]) -> None:
        if key not in KEYS_TRAPPED_BY_GGUI:
            raise ValueError(
                f"FKeyDispatcher only handles F-keys; got {key!r}. Allowed: {KEYS_TRAPPED_BY_GGUI}"
            )
        self.handlers[key] = handler

    def poll(self, window: Any) -> None:
        for key, handler in self.handlers.items():
            held = bool(window.is_pressed(key))
            was_pressed = self._pressed.get(key, False)
            if held and not was_pressed:
                handler()
            self._pressed[key] = held
