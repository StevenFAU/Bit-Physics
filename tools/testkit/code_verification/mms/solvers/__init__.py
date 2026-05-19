"""Reference solvers for the MMS pipeline.

`heat_1d_ftcs`: forward-Euler in time, centered second differences in space
(formal spatial order 2). `heat_1d_broken`: first-order forward differences
in space (formal spatial order 1) — the analyzer rejects this solver.
"""

from .heat_1d_broken import broken_first_order_step, run_heat_1d_broken
from .heat_1d_ftcs import ftcs_step, run_heat_1d_ftcs

__all__ = [
    "broken_first_order_step",
    "ftcs_step",
    "run_heat_1d_broken",
    "run_heat_1d_ftcs",
]
