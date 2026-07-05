"""Shared compute core for the six curl-noise golden tables (A-F).

Spec: docs/sim-specs/closed-form/curl-noise/spec-ref.md section 7. Each
thin CLI (curl_noise_divergence.py etc.) calls one compute_* function
here, wraps it with its independent-reference anchors, and verifies /
writes its table under golden/tables/closed-form/.

The computations import the curl-noise reference package (workspace
member) — the package-side cross-check lives at
packages/curl-noise/tests/test_golden_tables.py, and the SymPy symbolic
anchors are re-derived here independently of the NumPy implementation.

Everything is trig-free arithmetic + floor, so the committed values are
IEEE-deterministic; tolerances are still kept >= 1e-9 relative for
cross-build safety.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

# workspace root: generator/ -> golden/ -> testkit/ -> tools/ -> REPO ROOT
_REPO = Path(__file__).resolve().parents[4]
for _p in (str(_REPO / "packages" / "curl-noise"),):
    if _p not in sys.path:
        sys.path.insert(0, _p)

TABLES_DIR = Path(__file__).resolve().parents[1] / "tables" / "closed-form"


# --------------------------------------------------------------------------- #
# A — divergence (matched machine-zero + probe O(g^2) + route C)
# --------------------------------------------------------------------------- #
def compute_divergence() -> dict[str, object]:
    from curl_noise.reference.discrete import (
        fd_divergence_probe,
        matched_curl_2d,
        matched_curl_3d,
        matched_divergence_2d,
        matched_divergence_3d,
        nested_fd_divergence_2d,
    )
    from curl_noise.reference.fields import (
        CurlNoiseConfig,
        fbm_grad_hess,
        velocity,
    )

    out: dict[str, object] = {}

    rng = np.random.default_rng(64)
    psi = rng.standard_normal((65, 65))
    dx = 1.0 / 64
    u, w = matched_curl_2d(psi, dx)
    div = matched_divergence_2d(u, w, dx)
    flux = max(np.abs(u).max(), np.abs(w).max()) / dx
    out["matched_2d_normalized_div_max"] = float(np.abs(div).max() / flux)

    rng = np.random.default_rng(33)
    n = 32
    px = rng.standard_normal((n, n + 1, n + 1))
    py = rng.standard_normal((n + 1, n, n + 1))
    pz = rng.standard_normal((n + 1, n + 1, n))
    dx = 1.0 / n
    u3, v3, w3 = matched_curl_3d(px, py, pz, dx)
    div3 = matched_divergence_3d(u3, v3, w3, dx)
    flux3 = max(np.abs(u3).max(), np.abs(v3).max(), np.abs(w3).max()) / dx
    out["matched_3d_normalized_div_max"] = float(np.abs(div3).max() / flux3)

    cfg = CurlNoiseConfig(construction="crossprod", octaves=3, ell0=0.5)
    rng = np.random.default_rng(7)
    pts = rng.uniform(-3.0, 3.0, size=(300, 3))

    def vel(p):
        return velocity(p, cfg)

    d1 = float(np.abs(fd_divergence_probe(vel, pts, 1e-2)).max())
    d2 = float(np.abs(fd_divergence_probe(vel, pts, 1e-3)).max())
    out["probe_div_max_g1e-2"] = d1
    out["probe_div_max_g1e-3"] = d2
    out["probe_order"] = float(np.log(d1 / d2) / np.log(10.0))

    cfg2 = CurlNoiseConfig(construction="curl2d", octaves=3, ell0=0.5)

    def psi_fn(p):
        return fbm_grad_hess(p, cfg2, 0)[0]

    out["route_c_nested_fd_max_h1e-4"] = float(
        np.abs(nested_fd_divergence_2d(psi_fn, pts, 1e-4)).max()
    )
    return out


# --------------------------------------------------------------------------- #
# B — gradient MMS (analytic vs FD O(h^2)) + SymPy kernel identity
# --------------------------------------------------------------------------- #
def compute_gradient_mms() -> dict[str, object]:
    from curl_noise.reference.noise import snoise_grad_hess

    rng = np.random.default_rng(3)
    pts = rng.uniform(-8.0, 8.0, size=(200, 3))
    _, g, h_an = snoise_grad_hess(pts)

    def fd_grad(h):
        fd = np.zeros_like(g)
        for k in range(3):
            e = np.zeros(3)
            e[k] = h
            vp, _, _ = snoise_grad_hess(pts + e)
            vm, _, _ = snoise_grad_hess(pts - e)
            fd[:, k] = (vp - vm) / (2 * h)
        return fd

    e1 = float(np.abs(fd_grad(1e-3) - g).max())
    e2 = float(np.abs(fd_grad(1e-4) - g).max())

    def fd_hess(h):
        fd = np.zeros_like(h_an)
        for k in range(3):
            e = np.zeros(3)
            e[k] = h
            _, gp, _ = snoise_grad_hess(pts + e)
            _, gm, _ = snoise_grad_hess(pts - e)
            fd[:, :, k] = (gp - gm) / (2 * h)
        return fd

    he1 = float(np.abs(fd_hess(1e-3) - h_an).max())
    he2 = float(np.abs(fd_hess(1e-4) - h_an).max())
    return {
        "grad_fd_err_h1e-3": e1,
        "grad_fd_err_h1e-4": e2,
        "grad_mms_order": float(np.log(e1 / e2) / np.log(10.0)),
        "hess_fd_err_h1e-3": he1,
        "hess_fd_err_h1e-4": he2,
        "hess_mms_order": float(np.log(he1 / he2) / np.log(10.0)),
        "kernel_gradient_sympy_identity": sympy_kernel_gradient_identity(),
    }


def sympy_kernel_gradient_identity() -> str:
    """SymPy anchor: d/dx [ m^4 (p.x) ] with m = max(F - |x|^2, 0) equals
    the implementation formula -8 m^3 (p.x) x + m^4 p (interior branch).
    Returns 'zero' when the symbolic difference simplifies to 0."""
    import sympy as sp

    x1, x2, x3, p1, p2, p3, F = sp.symbols("x1 x2 x3 p1 p2 p3 F", real=True)
    x = sp.Matrix([x1, x2, x3])
    p = sp.Matrix([p1, p2, p3])
    m = F - (x1**2 + x2**2 + x3**2)
    kernel = m**4 * (p.dot(x))
    grad = sp.Matrix([sp.diff(kernel, xi) for xi in (x1, x2, x3)])
    formula = -8 * m**3 * p.dot(x) * x + m**4 * p
    diff = sp.simplify(grad - formula)
    return "zero" if diff == sp.zeros(3, 1) else f"NONZERO: {diff}"


def sympy_kernel_hessian_identity() -> str:
    """SymPy anchor for the Hessian formula (golden C uses it too)."""
    import sympy as sp

    x1, x2, x3, p1, p2, p3, F = sp.symbols("x1 x2 x3 p1 p2 p3 F", real=True)
    xs = (x1, x2, x3)
    x = sp.Matrix([x1, x2, x3])
    p = sp.Matrix([p1, p2, p3])
    m = F - (x1**2 + x2**2 + x3**2)
    kernel = m**4 * (p.dot(x))
    hess = sp.Matrix([[sp.diff(kernel, xi, xj) for xj in xs] for xi in xs])
    formula = (
        48 * m**2 * p.dot(x) * (x * x.T)
        - 8 * m**3 * (x * p.T + p * x.T)
        - 8 * m**3 * p.dot(x) * sp.eye(3)
    )
    diff = sp.simplify(hess - formula)
    return "zero" if diff == sp.zeros(3, 3) else f"NONZERO: {diff}"


# --------------------------------------------------------------------------- #
# C — cross-product identity + iso-value residual / reprojection
# --------------------------------------------------------------------------- #
def compute_crossprod() -> dict[str, object]:
    from curl_noise.reference.advect import advect
    from curl_noise.reference.curlnoise import CANONICAL_DT, seeded_tracers
    from curl_noise.reference.fields import (
        CANONICAL_CONFIG,
        CurlNoiseConfig,
        divergence_trace,
        velocity,
    )
    from curl_noise.reference.manifold import (
        iso_value_residual,
        iso_values,
        reproject,
    )

    cfg = CurlNoiseConfig(construction="crossprod", octaves=3, ell0=0.5)
    rng = np.random.default_rng(7)
    pts = rng.uniform(-3.0, 3.0, size=(300, 3))
    vscale = float(np.abs(velocity(pts, cfg)).max())
    out: dict[str, object] = {
        "hessian_trace_div_max": float(np.abs(divergence_trace(pts, cfg)).max()),
        "velocity_scale": vscale,
        "crossprod_div_sympy_identity": sympy_crossprod_div_identity(),
    }

    rng = np.random.default_rng(11)
    x0 = rng.uniform(0.1, 0.9, size=(128, 3))
    f0 = iso_values(x0, cfg)
    x = x0 + rng.normal(scale=1e-3, size=x0.shape)
    out["reproject3_residual_median"] = float(
        np.median(iso_value_residual(reproject(x, f0, cfg, 3), f0, cfg))
    )

    pts0 = seeded_tracers(42, 256)
    r_coarse = advect(
        pts0,
        CANONICAL_CONFIG,
        n_steps=16,
        dt=2.0 * CANONICAL_DT,
        integrator="rk4",
        reproject_iters=0,
        capture_interval=16,
    ).iso_residual_max[-1]
    r_fine = advect(
        pts0,
        CANONICAL_CONFIG,
        n_steps=32,
        dt=CANONICAL_DT,
        integrator="rk4",
        reproject_iters=0,
        capture_interval=32,
    ).iso_residual_max[-1]
    on = advect(
        pts0,
        CANONICAL_CONFIG,
        n_steps=32,
        dt=CANONICAL_DT,
        integrator="rk4",
        reproject_iters=1,
        capture_interval=32,
    ).iso_residual_max[-1]
    out["rk4_residual_dt2x"] = float(r_coarse)
    out["rk4_residual_dt1x"] = float(r_fine)
    out["rk4_residual_reprojected"] = float(on)
    return out


def sympy_crossprod_div_identity() -> str:
    """SymPy: div(grad f1 x grad f2) == 0 for generic smooth f1, f2."""
    import sympy as sp

    x, y, z = sp.symbols("x y z", real=True)
    f1 = sp.Function("f1")(x, y, z)
    f2 = sp.Function("f2")(x, y, z)
    g1 = sp.Matrix([sp.diff(f1, s) for s in (x, y, z)])
    g2 = sp.Matrix([sp.diff(f2, s) for s in (x, y, z)])
    v = g1.cross(g2)
    div = sum(sp.diff(v[i], s) for i, s in enumerate((x, y, z)))
    return "zero" if sp.simplify(div) == 0 else "NONZERO"


# --------------------------------------------------------------------------- #
# D — boundary tangency (machine-exact analytic; O(h) discretized; medial)
# --------------------------------------------------------------------------- #
def compute_boundary() -> dict[str, object]:
    from curl_noise.reference.boundary import velocity_2d_ramped
    from curl_noise.reference.fields import (
        CANONICAL_CONFIG,
        CurlNoiseConfig,
        velocity,
    )

    cfg = CANONICAL_CONFIG
    rng = np.random.default_rng(9)
    n = 256
    theta = np.arccos(rng.uniform(-1, 1, n))
    phi = rng.uniform(0, 2 * np.pi, n)
    n_hat = np.stack(
        [
            np.sin(theta) * np.cos(phi),
            np.sin(theta) * np.sin(phi),
            np.cos(theta),
        ],
        axis=1,
    )
    surf = np.asarray(cfg.obstacle_center) + cfg.obstacle_radius * n_hat
    v = velocity(surf, cfg)
    out: dict[str, object] = {
        "sphere_vn_over_vscale": float(np.abs(np.sum(v * n_hat, axis=1)).max() / np.abs(v).max())
    }

    cfg2 = CurlNoiseConfig(construction="curl2d", octaves=3, ell0=0.5)
    center = np.array([0.5, 0.5, 0.0])
    radius, d0 = 0.2, 0.15
    ang = np.linspace(0, 2 * np.pi, 257)[:-1]
    surf3 = np.stack(
        [
            center[0] + radius * np.cos(ang),
            center[1] + radius * np.sin(ang),
            np.zeros_like(ang),
        ],
        axis=1,
    )
    nh = np.zeros_like(surf3)
    nh[:, 0] = np.cos(ang)
    nh[:, 1] = np.sin(ang)
    v2 = velocity_2d_ramped(surf3, cfg2, center, radius, d0)
    out["cylinder_vn_over_vscale"] = float(
        np.abs(np.sum(v2 * nh, axis=1)).max() / max(np.abs(v2).max(), 1e-300)
    )

    def grid_sdf(pts, h):
        def sdf_exact(p):
            rel = p[:, :2] - center[None, :2]
            return np.linalg.norm(rel, axis=1) - radius

        base = np.floor(pts[:, :2] / h) * h
        frac = (pts[:, :2] - base) / h
        cs = []
        for dx_i in (0.0, 1.0):
            for dy_i in (0.0, 1.0):
                q = base + np.array([dx_i, dy_i]) * h
                q3 = np.concatenate([q, np.zeros((q.shape[0], 1))], axis=1)
                cs.append(sdf_exact(q3))
        c00, c01, c10, c11 = cs
        fx, fy = frac[:, 0], frac[:, 1]
        d = c00 * (1 - fx) * (1 - fy) + c01 * (1 - fx) * fy + c10 * fx * (1 - fy) + c11 * fx * fy
        gd = np.zeros((pts.shape[0], 3))
        gd[:, 0] = ((c10 - c00) * (1 - fy) + (c11 - c01) * fy) / h
        gd[:, 1] = ((c01 - c00) * (1 - fx) + (c11 - c10) * fx) / h
        return d, gd

    def vn_at(h):
        v_d = velocity_2d_ramped(surf3, cfg2, center, radius, d0, sdf_values=grid_sdf(surf3, h))
        return float(np.abs(np.sum(v_d * nh, axis=1)).max())

    e_c, e_f = vn_at(2e-2), vn_at(2e-3)
    out["discretized_vn_h2e-2"] = e_c
    out["discretized_vn_h2e-3"] = e_f
    out["discretized_vn_order"] = float(np.log(e_c / e_f) / np.log(10.0))
    return out


# --------------------------------------------------------------------------- #
# E — analytic reference fields (ABC / Taylor-Green / FBM linearity)
# --------------------------------------------------------------------------- #
def compute_analytic_fields() -> dict[str, object]:
    from curl_noise.reference.discrete import (
        fd_divergence_probe,
        matched_curl_2d,
        matched_divergence_2d,
    )
    from curl_noise.reference.fields import (
        CurlNoiseConfig,
        abc_curl,
        abc_flow,
        fbm_grad_hess,
    )

    sample = np.array([[0.3, 1.1, -0.7], [2.0, -1.0, 0.5], [-0.4, 0.9, 2.2]])
    v = abc_flow(sample, 1.0, 1.0, 1.0)
    out: dict[str, object] = {
        "abc_velocity_samples": [[float(c) for c in row] for row in v],
        "abc_beltrami_residual": float(np.abs(abc_curl(sample) - v).max()),
        "abc_fd_probe_div_max": float(np.abs(fd_divergence_probe(abc_flow, sample, 1e-2)).max()),
        "abc_div_sympy": sympy_abc_div_identity(),
    }

    def tg_vel(p):
        vv = np.zeros_like(p)
        vv[:, 0] = np.sin(p[:, 0]) * np.cos(p[:, 1])
        vv[:, 1] = -np.cos(p[:, 0]) * np.sin(p[:, 1])
        return vv

    rng = np.random.default_rng(13)
    pts = rng.uniform(-3, 3, size=(200, 3))
    out["taylor_green_fd_probe_div_max_h1e-3"] = float(
        np.abs(fd_divergence_probe(tg_vel, pts, 1e-3)).max()
    )

    n = 48
    dx = 1.0 / n
    nodes = np.stack(
        np.meshgrid(*([np.linspace(0, 1, n + 1)] * 2), indexing="ij"), axis=-1
    ).reshape(-1, 2)
    pts_n = np.concatenate([nodes, np.full((nodes.shape[0], 1), 0.37)], axis=1)
    cfg = CurlNoiseConfig(construction="curl2d", octaves=3, ell0=0.5)
    psi, _, _ = fbm_grad_hess(pts_n, cfg, 0)
    u, w = matched_curl_2d(psi.reshape(n + 1, n + 1), dx)
    div = matched_divergence_2d(u, w, dx)
    flux = max(np.abs(u).max(), np.abs(w).max()) / dx
    out["fbm_matched_normalized_div_max"] = float(np.abs(div).max() / flux)
    return out


def sympy_abc_div_identity() -> str:
    import sympy as sp

    x, y, z, a, b, c = sp.symbols("x y z A B C", real=True)
    v = sp.Matrix(
        [
            a * sp.sin(z) + c * sp.cos(y),
            b * sp.sin(x) + a * sp.cos(z),
            c * sp.sin(y) + b * sp.cos(x),
        ]
    )
    div = sp.diff(v[0], x) + sp.diff(v[1], y) + sp.diff(v[2], z)
    return "zero" if sp.simplify(div) == 0 else "NONZERO"


# --------------------------------------------------------------------------- #
# F — confinement / Clebsch identities (execution-corrected) + Beltrami
# --------------------------------------------------------------------------- #
def compute_helicity() -> dict[str, object]:
    from curl_noise.reference.fields import (
        CurlNoiseConfig,
        abc_curl,
        abc_flow,
        clebsch_helicity_integrand,
        gradient_orthogonality,
        helicity_density,
        velocity,
    )

    cfg = CurlNoiseConfig(construction="crossprod", octaves=3, ell0=0.5)
    rng = np.random.default_rng(7)
    pts = rng.uniform(-3.0, 3.0, size=(300, 3))
    og1, og2 = gradient_orthogonality(pts, cfg)
    cle = clebsch_helicity_integrand(pts, cfg)
    hel = helicity_density(pts, cfg)
    vscale = float(np.abs(velocity(pts, cfg)).max())

    sample = np.array([[0.3, 1.1, -0.7], [2.0, -1.0, 0.5], [-0.4, 0.9, 2.2]])
    v_abc = abc_flow(sample)
    return {
        "grad_orthogonality_over_vscale": float(max(np.abs(og1).max(), np.abs(og2).max()) / vscale),
        "clebsch_integrand_over_vscale": float(np.abs(cle).max() / vscale),
        "kinetic_helicity_max": float(np.abs(hel).max()),
        "helicity_counterexample_sympy": sympy_helicity_counterexample(),
        "abc_beltrami_residual": float(np.abs(abc_curl(sample) - v_abc).max()),
        "abc_helicity_minus_speed2_max": float(
            np.abs(np.sum(v_abc * abc_curl(sample), axis=1) - np.sum(v_abc * v_abc, axis=1)).max()
        ),
        "confinement_sympy": sympy_confinement_identities(),
    }


def sympy_helicity_counterexample() -> str:
    """The v0.2 refutation, symbolically: f1 = x*y, f2 = z + x^2 gives
    v.(curl v) = -4*x*y (NOT identically zero)."""
    import sympy as sp

    x, y, z = sp.symbols("x y z", real=True)
    f1, f2 = x * y, z + x**2
    g1 = sp.Matrix([sp.diff(f1, s) for s in (x, y, z)])
    g2 = sp.Matrix([sp.diff(f2, s) for s in (x, y, z)])
    v = g1.cross(g2)
    curl = sp.Matrix(
        [
            sp.diff(v[2], y) - sp.diff(v[1], z),
            sp.diff(v[0], z) - sp.diff(v[2], x),
            sp.diff(v[1], x) - sp.diff(v[0], y),
        ]
    )
    h = sp.expand(v.dot(curl))
    return str(h)  # expected "-4*x*y"


def sympy_confinement_identities() -> str:
    """SymPy: v.grad f1 == v.grad f2 == 0 and (f1 grad f2).v == 0 for
    generic smooth f1, f2 (the corrected golden-F identities)."""
    import sympy as sp

    x, y, z = sp.symbols("x y z", real=True)
    f1 = sp.Function("f1")(x, y, z)
    f2 = sp.Function("f2")(x, y, z)
    g1 = sp.Matrix([sp.diff(f1, s) for s in (x, y, z)])
    g2 = sp.Matrix([sp.diff(f2, s) for s in (x, y, z)])
    v = g1.cross(g2)
    checks = [
        sp.simplify(v.dot(g1)),
        sp.simplify(v.dot(g2)),
        sp.simplify((f1 * g2).dot(v)),
    ]
    return "zero" if all(c == 0 for c in checks) else f"NONZERO: {checks}"


# --------------------------------------------------------------------------- #
# Generic table IO helpers shared by the thin CLIs
# --------------------------------------------------------------------------- #
def write_table(path: Path, table: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w") as fh:
        json.dump(table, fh, indent=2)
        fh.write("\n")
    print(f"wrote {path}")


def compare_numeric(
    name: str, table_val, fresh_val, atol: float, rtol: float, failures: list[str]
) -> None:
    if isinstance(table_val, str):
        if table_val != fresh_val:
            failures.append(f"{name}: table={table_val!r} fresh={fresh_val!r}")
        return
    if isinstance(table_val, list):
        t = np.asarray(table_val, dtype=np.float64)
        f = np.asarray(fresh_val, dtype=np.float64)
        if t.shape != f.shape or not np.allclose(t, f, atol=atol, rtol=rtol):
            failures.append(f"{name}: array mismatch")
        return
    t, f = float(table_val), float(fresh_val)
    if abs(t - f) > atol + rtol * abs(f):
        failures.append(f"{name}: table={t} fresh={f}")


def verify_table(table_path: Path, fresh: dict[str, object]) -> int:
    if not table_path.exists():
        print(f"FAIL: table not found at {table_path}", file=sys.stderr)
        return 1
    with table_path.open() as fh:
        table = json.load(fh)
    atol = float(table["tolerance"]["absolute"])
    rtol = float(table["tolerance"]["relative"])
    failures: list[str] = []
    for tp in table["test_points"]:
        for key, val in tp["expected"].items():
            if key not in fresh:
                failures.append(f"unknown expected key {key!r}")
                continue
            compare_numeric(key, val, fresh[key], atol, rtol, failures)
    if failures:
        print(f"FAIL — {table_path.name}:", file=sys.stderr)
        for f in failures:
            print(f"  {f}", file=sys.stderr)
        return 1
    print(f"OK — {table_path.name} matches a fresh recompute.")
    return 0
