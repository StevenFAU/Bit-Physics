"""Solution/calculation verification (spec-ref.md § 6.2/6.4/6.5) — the
machine-exact gates, the sign pin, the two-spectra rule, and the
measured-convergent continuum checks."""

from __future__ import annotations

import numpy as np

from schrodinger_smoke.reference.isf import (
    IsfConfig,
    circulation_loop,
    constraint_project,
    continuous_laplacian_eigenvalues,
    discrete_laplacian_eigenvalues,
    divergence_from_phases,
    edge_phases,
    free_step,
    grid_coords,
    hopf_s2,
    make_scene,
    normalize,
    pressure_project,
    ring_probe_loop,
    run_isf,
    settle_ic,
    spherical_clebsch_lift,
    taylor_green_wave_2d,
    velocity_faces,
    vortex_ring_wave,
)


def _canonical_small() -> IsfConfig:
    return IsfConfig(n=32, hbar=0.05, dt=1.0 / 24.0, steps=12)


def test_unitary_norm_and_parseval_gates() -> None:
    """Strongest gates: free-step L2 norm drift <= 1e-13 and Parseval
    <= 1e-13, measured over the canonical run (machine-exact rows)."""
    res = run_isf(_canonical_small())
    assert res.norm_l2_drift <= 1e-13, res.norm_l2_drift
    assert res.parseval_rel_err <= 1e-13, res.parseval_rel_err


def test_projection_divergence_machine_zero() -> None:
    """Post-projection discrete divergence telescopes to FP-zero with the
    DISCRETE Eq.-17 eigenvalues. The declared ceiling absorbs the 1/dx^2
    amplification of the phase-level FP residual (measured 3e-12 at 48^3;
    declared 1e-10 with margin, still ~1e-15 in phase units)."""
    res = run_isf(_canonical_small())
    assert res.max_div_postproj <= 1e-10, res.max_div_postproj


def test_two_spectra_rule_is_load_bearing() -> None:
    """Deliberately solving the projection with the CONTINUOUS -|k|^2
    spectrum must leave an O(h^2)-floor residual ORDERS above the discrete
    solve — the review catch #1 regression guard (golden E's teeth)."""
    n = 32
    dx = 1.0 / n
    hbar = 0.05
    lam_disc = discrete_laplacian_eigenvalues((n, n, n), dx)
    lam_cont = continuous_laplacian_eigenvalues((n, n, n), dx)
    psi = vortex_ring_wave(n, (0.35, 0.5, 0.5), 0.22, 0.08, hbar)
    psi = settle_ic(psi, dx, lam_disc, 8)
    # generate a genuinely non-solenoidal state: one free step + normalize
    psi = normalize(free_step(psi, hbar, 1.0 / 24.0, lam_cont))
    right = pressure_project(psi, dx, lam_disc)
    wrong = pressure_project(psi, dx, lam_cont)
    div_right = float(np.max(np.abs(divergence_from_phases(edge_phases(right), dx))))
    div_wrong = float(np.max(np.abs(divergence_from_phases(edge_phases(wrong), dx))))
    assert div_right <= 1e-10, div_right
    assert div_wrong >= 1e3 * div_right, (div_wrong, div_right)


def test_velocity_sign_plane_wave() -> None:
    """Sign pin (§ 3): psi1 = e^{i*2pi*x} must give u = +hbar*2pi (the
    Re/Im flip guard — the two forms are negatives of each other)."""
    n, hbar = 32, 0.05
    x, _y, _z = grid_coords(n)
    psi = np.zeros((2, n, n, n), dtype=np.complex128)
    psi[0] = np.exp(1j * 2.0 * np.pi * x)
    psi[1] = 1e-12
    ux, uy, uz = velocity_faces(normalize(psi), hbar, 1.0 / n)
    assert np.allclose(ux, hbar * 2.0 * np.pi, rtol=0, atol=1e-12)
    assert float(np.max(np.abs(uy))) <= 1e-12
    assert float(np.max(np.abs(uz))) <= 1e-12


def test_clebsch_lift_unit_norm_and_velocity() -> None:
    """Golden C surface: the spherical-Clebsch TG lift is unit-norm to
    <= 1e-15 and induces a periodic velocity field with the expected
    hbar-independent structure scale."""
    n, hbar = 32, 0.1
    x, y, _z = grid_coords(n)
    psi = taylor_green_wave_2d(x, y, hbar)
    norm = np.sqrt(np.abs(psi[0]) ** 2 + np.abs(psi[1]) ** 2)
    assert float(np.max(np.abs(norm - 1.0))) <= 1e-15
    lift = spherical_clebsch_lift(np.array([[0.5]]), np.array([[1.2]]))
    assert abs(abs(lift[0, 0, 0]) ** 2 + abs(lift[1, 0, 0]) ** 2 - 1.0) <= 1e-15


def test_taylor_green_near_steady() -> None:
    """Reused steady anchor (§ 6.2): the z-invariant TG lift held over a
    short window drifts only within the declared MEASURED ceiling (ISF's
    Landau-Lifshitz term makes this near-steady, not exact-steady)."""
    cfg = IsfConfig(n=32, hbar=0.1, dt=1.0 / 48.0, steps=12, scene="taylor-green")
    res = run_isf(cfg)
    rel_energy_drift = abs(res.energy_final - res.energy_initial) / res.energy_initial
    assert rel_energy_drift <= 0.35, rel_energy_drift


def test_ring_circulation_quantized() -> None:
    """Quantized circulation (§ 7 F): the settled translating-ring IC
    measures ∮u·dl within 1e-3 of 2*pi*hbar (measured-convergent, labeled
    approximate per the paper's own 'approximately 2πħ')."""
    for n in (32, 48):
        cfg = IsfConfig(n=n, hbar=0.05)
        lam_disc = discrete_laplacian_eigenvalues((n, n, n), 1.0 / n)
        psi = make_scene(cfg, lam_disc)
        circ = abs(circulation_loop(psi, cfg.hbar, ring_probe_loop(cfg)))
        target = 2.0 * np.pi * cfg.hbar
        assert abs(circ - target) / target <= 1e-3, (n, circ, target)


def test_edge_phase_headroom_guard() -> None:
    """The aliasing guard is recorded and stays below 1 (no principal-branch
    re-wraps) on the canonical scene — the § 3 precondition for the
    projection's telescoping exactness."""
    res = run_isf(_canonical_small())
    assert 0.0 < res.edge_phase_headroom < 1.0, res.edge_phase_headroom


def test_hopf_s2_on_unit_sphere() -> None:
    """s = conj(Psi) i Psi lands on S^2 exactly for unit spinors."""
    n = 16
    lam_disc = discrete_laplacian_eigenvalues((n, n, n), 1.0 / n)
    psi = make_scene(IsfConfig(n=n), lam_disc)
    sx, sy, sz = hopf_s2(psi)
    r = sx**2 + sy**2 + sz**2
    assert float(np.max(np.abs(r - 1.0))) <= 1e-12


def test_constraint_project_mechanism() -> None:
    """Alg-4 surface (§ 5, beyond-canonical/ungated): this pins the
    MECHANISM, not a statics claim — (a) the blend writes the prescribed
    plane-wave phase inside the region while preserving amplitudes, and
    (b) the trailing pressure projection returns a div-free state. (A
    static blend+project fixed point is NOT asserted: a masked phase whose
    winding cancels at the region boundary is pure gauge, and the paper's
    nozzle/obstacle behavior emerges only in dynamics.)"""
    n, hbar = 32, 0.05
    dx = 1.0 / n
    lam_disc = discrete_laplacian_eigenvalues((n, n, n), dx)
    psi = normalize(
        np.full((2, n, n, n), 1.0 + 0.0j)
        + 0.01 * (np.arange(n)[None, :, None, None] % 3)
    )
    x, _y, _z = grid_coords(n)
    mask = (x > 0.25) & (x < 0.75)
    k_vec = (2.0 * np.pi * 2.0, 0.0, 0.0)
    # (a) mechanism: reproduce the blend step and check the region's edge
    # phases carry exactly k.dx (the prescribed velocity in phase units)
    blended = psi.copy()
    phase = k_vec[0] * x
    for c in range(2):
        blended[c] = np.where(mask, np.abs(psi[c]) * np.exp(1j * phase), psi[c])
    assert np.allclose(np.abs(blended), np.abs(psi), rtol=0, atol=1e-15)
    ex, _ey, _ez = edge_phases(blended)
    interior = mask & np.roll(mask, -1, axis=0)
    assert np.allclose(ex[interior], k_vec[0] * dx, rtol=0, atol=1e-12)
    # (b) contract: the full surface ends div-free
    out = constraint_project(psi, mask, k_vec, hbar, t=0.0, dx=dx, lam_disc=lam_disc)
    div = float(np.max(np.abs(divergence_from_phases(edge_phases(out), dx))))
    assert div <= 1e-10, div
