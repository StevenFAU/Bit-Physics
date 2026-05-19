"""Symbolic derivation of the manufactured source term (spec § 2.2).

The pipeline accepts a manufactured solution u(x, t) and a PDE operator L[u]
and emits the source term S = u_t - L[u] (residual form). It writes a
deterministic markdown derivation report so the runner does not re-derive at
test time.

Phase 0 uses this only for the heat equation 1D; the function signatures are
intentionally general so Phase 1+ can add Poisson / advection-diffusion / etc.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Final

import sympy as sp


@dataclass(frozen=True)
class DerivationResult:
    """Symbolic record of a manufactured-solution derivation."""

    pde_name: str
    u_symbolic: sp.Expr
    source_symbolic: sp.Expr
    parameters: dict[str, sp.Symbol]
    coordinate: sp.Symbol
    time: sp.Symbol

    def as_lambdas(self) -> tuple[sp.Expr, sp.Expr]:
        """Return (u, S) as simplified sympy expressions."""
        return sp.simplify(self.u_symbolic), sp.simplify(self.source_symbolic)


_SECTION_DIVIDER: Final[str] = "\n\n"


def derive_heat_1d() -> DerivationResult:
    """Derive the manufactured source for u(x, t) = sin(2 pi x / L) cos(t).

    PDE:        u_t = D * u_xx + S(x, t)
    Solution:   u(x, t) = sin(2 pi x / L) cos(t)
    Source:     S = u_t - D * u_xx
                  = sin(2 pi x / L) * [D * (2 pi / L)^2 cos(t) - sin(t)]
    """
    x, t = sp.symbols("x t", real=True)
    L, D = sp.symbols("L D", positive=True)
    k = 2 * sp.pi / L
    u = sp.sin(k * x) * sp.cos(t)
    residual = sp.diff(u, t) - D * sp.diff(u, x, 2)
    source = sp.simplify(residual)
    return DerivationResult(
        pde_name="heat-1d",
        u_symbolic=u,
        source_symbolic=source,
        parameters={"L": L, "D": D},
        coordinate=x,
        time=t,
    )


def render_markdown(result: DerivationResult) -> str:
    """Render a deterministic markdown derivation report.

    The report is content-addressable: identical SymPy expressions render
    byte-identical output, so committed `derivation.md` files are stable.
    """
    u_str = sp.latex(result.u_symbolic)
    s_str = sp.latex(result.source_symbolic)
    u_t = sp.latex(sp.diff(result.u_symbolic, result.time))
    u_xx = sp.latex(sp.diff(result.u_symbolic, result.coordinate, 2))
    lines = [
        f"# MMS derivation — {result.pde_name}",
        "",
        "Derived by `tools/testkit/code_verification/mms/derive.py` (SymPy). The runner",
        "does not re-derive at test time per spec § 2.2; tests assert that this file",
        "is reproducible from the same `derive_*` entry point.",
        "",
        "## Manufactured solution",
        "",
        f"$$u(x, t) = {u_str}$$",
        "",
        "## Required derivatives",
        "",
        f"$$\\frac{{\\partial u}}{{\\partial t}} = {u_t}$$",
        "",
        f"$$\\frac{{\\partial^2 u}}{{\\partial x^2}} = {u_xx}$$",
        "",
        "## Source term",
        "",
        "Substituting into $u_t = D\\,u_{xx} + S$ yields",
        "",
        f"$$S(x, t) = {s_str}$$",
        "",
        "## Boundary conditions",
        "",
        "Periodic on $[0, L]$. The manufactured solution is $L$-periodic by",
        "construction (argument $k = 2\\pi / L$).",
        "",
        "## Verification",
        "",
        "`tests/test_derive.py` re-runs `derive_heat_1d()` and asserts that the",
        "returned `source_symbolic` is symbolically equal to the expected residual",
        "form, locking this derivation against unintended drift.",
        "",
    ]
    return "\n".join(lines)


def write_derivation(out_path: Path) -> Path:
    """Persist the heat-1d derivation markdown to `out_path`.

    Returns `out_path` for chaining.
    """
    result = derive_heat_1d()
    out_path.write_text(render_markdown(result), encoding="utf-8")
    return out_path


def main() -> int:
    """CLI: regenerate `solutions/heat_1d/derivation.md`."""
    target = Path(__file__).resolve().parent / "solutions" / "heat_1d" / "derivation.md"
    write_derivation(target)
    rel = target.relative_to(Path.cwd()) if target.is_relative_to(Path.cwd()) else target
    print(f"wrote {rel}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
