"""Frozen-gate Differentiable Logic CA - gate set, GoL circuit, config (Stack D / Taichi).

The 16 two-input boolean functions are realised as their **multilinear extensions** - the
unique bilinear polynomial agreeing with each truth table at the binary corners:

    g(a,b) = t00*(1-a)(1-b) + t01*(1-a)b + t10*a(1-b) + t11*ab

(t = the gate's truth table). Multilinear extensions are smooth on [0,1]^2, map [0,1]^2
into [0,1] (convex combination of corner values), and are EXACT at binary corners in f64
(small-integer arithmetic) - the "hard limit" of the relaxed gates in Miotti, Niklasson,
Randazzo, Mordvintsev, "Differentiable Logic Cellular Automata" (Google; arXiv:2506.04912;
ALIFE 2025 - anchor live-verified at the C-1 charter § 2 row 6; CITE-DON'T-IMPORT). Per the
ratified D-3 scope (batch-3 § 3.4) the gates are FROZEN / hand-constructed - no training,
no EFECT.

The **Game-of-Life circuit** is hand-constructed from these gates: an 8-neighbor popcount
adder tree (full/half adders from XOR/AND/OR) -> 4 count bits -> equality tests ->
``alive' = OR(n==3, AND(center, n==2))``. The circuit is data (a wire list), consumed by
both the pure-Python evaluator (golden surface) and the Taichi kernels; it is verified
exhaustively over all 512 (center x neighborhood) configurations against :func:`gol_rule`
(Conway's rule per Gardner, *Sci. Am.* 223(4), 1970).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

__all__ = [
    "GATE_TRUTH_TABLES",
    "GOL_CIRCUIT",
    "N_WIRES",
    "DiffLogicConfig",
    "blinker_initial_state",
    "circuit_step_python",
    "eval_circuit_python",
    "glider_initial_state",
    "gol_rule",
    "soft_gate",
]

# Truth tables (t00, t01, t10, t11) for the 16 two-input boolean functions, indexed by
# the standard binary encoding f = t00 + 2*t01 + 4*t10 + 8*t11. Named landmarks:
# 0 FALSE, 1 NOR, 6 XOR(=a+b-2ab? no - see note), 8 AND, 14 OR, 15 TRUE ... the INDEX
# encoding is positional; the closed forms below are derived from the tables, never
# hand-assigned per gate, so no transcription mismatch is possible.
GATE_TRUTH_TABLES: tuple[tuple[int, int, int, int], ...] = tuple(
    (f & 1, (f >> 1) & 1, (f >> 2) & 1, (f >> 3) & 1) for f in range(16)
)

# Convenience indices for the gates the GoL circuit uses (resolved FROM the tables).
_AND = 0b1000  # t11 only -> index 8
_OR = 0b1110  # t01,t10,t11 -> index 14
_XOR = 0b0110  # t01,t10 -> index 6
_NOT_A = 0b0011  # t00,t01 -> 1 - a -> index 3


def soft_gate(gate: int, a: float, b: float) -> float:
    """Multilinear extension of gate ``gate`` at soft inputs ``(a, b)`` (pure Python).

    Exact at binary corners; smooth and [0,1]-preserving on [0,1]^2. This is the golden
    surface the Taichi kernel mirrors arithmetically."""
    t00, t01, t10, t11 = GATE_TRUTH_TABLES[gate]
    return t00 * (1.0 - a) * (1.0 - b) + t01 * (1.0 - a) * b + t10 * a * (1.0 - b) + t11 * a * b


# --------------------------------------------------------------------------- #
# The hand-constructed Game-of-Life circuit (frozen wiring; D-3 scope).
#
# Wire slots: 0..8 are the inputs (0 = center c, 1..8 = the 8 neighbors in row-major
# order). Each circuit entry appends one wire: (gate_index, src_a, src_b).
# Popcount adder tree over n1..n8, then count==2 / count==3, then the GoL output.
# --------------------------------------------------------------------------- #
def _build_gol_circuit() -> tuple[tuple[int, int, int], ...]:
    wires: list[tuple[int, int, int]] = []

    def w(gate: int, a: int, b: int) -> int:
        wires.append((gate, a, b))
        return 9 + len(wires) - 1  # absolute wire id

    def full_adder(x: int, y: int, z: int) -> tuple[int, int]:
        xy = w(_XOR, x, y)
        s = w(_XOR, xy, z)
        c1 = w(_AND, x, y)
        c2 = w(_AND, z, xy)
        c = w(_OR, c1, c2)
        return s, c

    def half_adder(x: int, y: int) -> tuple[int, int]:
        return w(_XOR, x, y), w(_AND, x, y)

    # Level 1: three adders over the 8 neighbors (inputs 1..8).
    s_a, c_a = full_adder(1, 2, 3)
    s_b, c_b = full_adder(4, 5, 6)
    s_c, c_c = half_adder(7, 8)
    # Level 2: ones column (s_a+s_b+s_c) and twos column (c_a+c_b+c_c).
    bit0, carry0 = full_adder(s_a, s_b, s_c)
    t, u = full_adder(c_a, c_b, c_c)  # t = twos partial, u = fours partial
    # Combine columns: twos = t + carry0; fours = u + carry1.
    bit1, carry1 = half_adder(t, carry0)
    bit2, bit3 = half_adder(u, carry1)
    # Equality tests: count==2 -> (b3,b2,b1,b0) == 0010; count==3 -> 0011.
    not0 = w(_NOT_A, bit0, bit0)
    not2 = w(_NOT_A, bit2, bit2)
    not3 = w(_NOT_A, bit3, bit3)
    hi_clear = w(_AND, not2, not3)
    n_eq_2 = w(_AND, w(_AND, bit1, not0), hi_clear)
    n_eq_3 = w(_AND, w(_AND, bit1, bit0), hi_clear)
    # alive' = OR(n==3, AND(center, n==2))
    survive = w(_AND, 0, n_eq_2)
    w(_OR, n_eq_3, survive)
    return tuple(wires)


GOL_CIRCUIT: tuple[tuple[int, int, int], ...] = _build_gol_circuit()
#: Total wire count (9 inputs + circuit wires); the LAST wire is the cell output.
N_WIRES: int = 9 + len(GOL_CIRCUIT)


def eval_circuit_python(inputs: NDArray[np.float64]) -> float:
    """Evaluate the GoL circuit at soft ``inputs`` (shape (9,): center + 8 neighbors).

    Pure-Python golden surface; mirrors the kernel arithmetic wire-for-wire."""
    vals = [float(v) for v in inputs] + [0.0] * len(GOL_CIRCUIT)
    for i, (gate, a, b) in enumerate(GOL_CIRCUIT):
        vals[9 + i] = soft_gate(gate, vals[a], vals[b])
    return vals[-1]


def gol_rule(center: int, neighbor_count: int) -> int:
    """Conway's Game of Life transition (Gardner 1970): the independent A2 reference."""
    if neighbor_count == 3:
        return 1
    if neighbor_count == 2 and center == 1:
        return 1
    return 0


def circuit_step_python(state: NDArray[np.float64]) -> NDArray[np.float64]:
    """One hard/soft CA step on a periodic grid via the pure-Python circuit evaluator.

    O(N^2 * circuit) - golden/test surface only; the capture path uses the Taichi kernel."""
    n = state.shape[0]
    out = np.zeros_like(state)
    for i in range(n):
        for j in range(n):
            vals = np.empty(9, dtype=np.float64)
            vals[0] = state[i, j]
            k = 1
            for di in (-1, 0, 1):
                for dj in (-1, 0, 1):
                    if di == 0 and dj == 0:
                        continue
                    vals[k] = state[(i + di) % n, (j + dj) % n]
                    k += 1
            out[i, j] = eval_circuit_python(vals)
    return out


@dataclass(frozen=True)
class DiffLogicConfig:
    """Canonical frozen-gate DiffLogic-CA configuration (GoL on a 16^2 torus)."""

    grid_n: int = 16
    steps: int = 32
    seed: int = 42
    # Soft-excitation inverse problem (WU-A): K-step soft rollout, single-cell blend.
    soft_steps: int = 2
    excite_cell: tuple[int, int] = (8, 8)


def glider_initial_state(cfg: DiffLogicConfig) -> NDArray[np.float64]:
    """The canonical glider at the grid center (translates one cell diagonally / 4 steps)."""
    s = np.zeros((cfg.grid_n, cfg.grid_n), dtype=np.float64)
    c = cfg.grid_n // 2
    for di, dj in ((0, 1), (1, 2), (2, 0), (2, 1), (2, 2)):
        s[(c + di) % cfg.grid_n, (c + dj) % cfg.grid_n] = 1.0
    return s


def blinker_initial_state(cfg: DiffLogicConfig) -> NDArray[np.float64]:
    """The period-2 blinker (vertical triple) at the grid center."""
    s = np.zeros((cfg.grid_n, cfg.grid_n), dtype=np.float64)
    c = cfg.grid_n // 2
    for di in (-1, 0, 1):
        s[(c + di) % cfg.grid_n, c] = 1.0
    return s
