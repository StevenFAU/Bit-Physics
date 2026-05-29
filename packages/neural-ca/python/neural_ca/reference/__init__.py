"""NumPy/CPU reference oracle for the Stack-B WGSL inference.

The WGSL inference runs on a GPU host LOCALLY (spec § 7.8) and writes a committed
capture; CI never runs WGSL. The CI-visible reproduction check (gate-13 /
``test-neural-ca-infer``) re-runs this pure-NumPy forward pass from the SAME
converted checkpoint weights and asserts it reproduces the committed
B-inference capture to a tolerance — the ising ``test-ising-classical``
pytest-against-committed-capture + NumPy-oracle precedent.
"""

from __future__ import annotations

from .nca_numpy import nca_forward_numpy

__all__ = ["nca_forward_numpy"]
