"""Acceptance written before implementation; physical oracles are independent."""

import numpy as np
import pytest
from terrain_erosion.reference import flux, step, initial, stable_dt, budgets


def test_flux_independent_anchors():
    # Stationary pressure, advective contact, and dry vacuum: hand evaluations.
    np.testing.assert_allclose(flux([2, 0, 0, 0.02], [2, 0, 0, 0.02]), [0, 19.62, 0, 0])
    np.testing.assert_allclose(
        flux([1, 2, 3, 0.01], [1, 2, 3, 0.01]), [2, 8.905, 6, 0.02]
    )
    np.testing.assert_array_equal(flux([0, 0, 0, 0], [0, 0, 0, 0]), [0, 0, 0, 0])


def test_lake_at_rest_over_wet_dry_island():
    s = initial(32, "lake")
    before = s.copy()
    for _ in range(40):
        s = step(s, 0.01, dx=1, erosion=0, settling=0)
    np.testing.assert_allclose(s[..., :4], before[..., :4], atol=1e-12)


def test_closed_dam_break_conserves_water_and_sediment():
    s = initial(32, "dam")
    water, solid = budgets(s)
    for _ in range(150):
        s = step(s, 0.01, dx=1, erosion=0, settling=0)
    assert np.isfinite(s).all()
    assert s[..., 0].min() >= 0
    assert s[..., 3].min() >= 0
    assert abs(budgets(s)[0] - water) < 1e-9
    assert abs(budgets(s)[1] - solid) < 1e-9
    assert s[16, 24, 0] > 0


def test_settling_exponential_and_solid_budget():
    s = initial(8, "settling")
    before = budgets(s)
    for _ in range(100):
        s = step(s, 0.01, dx=1, erosion=0, settling=0.1)
    np.testing.assert_allclose(s[..., 3], 0.01 * np.exp(-0.1), atol=1e-13)
    np.testing.assert_allclose(budgets(s), before, atol=1e-12)


def test_erosion_moves_real_rock_to_sediment():
    s = initial(16, "channel")
    s[..., 2] = s[..., 0] * 2
    for _ in range(20):
        s = step(s, 0.01, dx=1, erosion=1, settling=0)
    assert s[..., 5].max() > 0
    assert s[..., 3].max() > 0
    assert abs(budgets(s)[1]) < 1e-10


def test_cover_shields_rock():
    bare = initial(8, "channel")
    bare[..., 2] = bare[..., 0] * 2
    covered = bare.copy()
    covered[..., 6] = 0.3
    b = step(bare, 0.01, dx=1, erosion=1, settling=0)
    c = step(covered, 0.01, dx=1, erosion=1, settling=0)
    assert c[..., 5].sum() < b[..., 5].sum() * 0.1


def test_unsafe_dt_is_refused():
    s = initial(8, "dam")
    with pytest.raises(ValueError, match="CFL"):
        step(s, 10, dx=1)


def test_reference_repeatability():
    s = initial(16, "dam")
    np.testing.assert_array_equal(step(s, 0.01, dx=1), step(s, 0.01, dx=1))


def test_random_nonnegative_conservative_states():
    rng = np.random.default_rng(4102)
    for _ in range(12):
        s = initial(12, "settling")
        s[..., 0] = rng.uniform(0.05, 2, (12, 12))
        s[..., 3] = 0.01 * s[..., 0]
        s[..., 1:3] = rng.uniform(-0.1, 0.1, (12, 12, 2))
        water, solid = budgets(s)
        out = step(s, stable_dt(s, 1) * 0.8, dx=1)
        assert np.isfinite(out).all()
        assert out[..., [0, 3, 5, 6]].min() >= 0
        np.testing.assert_allclose(budgets(out), [water, solid], atol=1e-11)


def test_smooth_standing_wave_first_order_convergence():
    """Linearized SWE standing wave; nonlinear remainder O(amplitude²)."""
    errors = []
    for n in (24, 48, 96):
        length = 16.0
        dx = length / n
        amplitude = 1e-5
        x = (np.arange(n) + 0.5) * dx
        s = initial(n, "settling")
        s[..., 3] = 0
        s[..., 0] = 1 + amplitude * np.cos(np.pi * x / length)
        final = 0.3 * length / np.sqrt(9.81)
        t = 0.0
        while t < final - 1e-12:
            dt = min(stable_dt(s, dx) * 0.9, final - t)
            s = step(s, dt, dx=dx, erosion=0, settling=0, friction=0)
            t += dt
        exact = 1 + amplitude * np.cos(np.pi * x / length) * np.cos(
            np.pi * np.sqrt(9.81) * final / length
        )
        errors.append(float(np.mean(abs(s[..., 0] - exact))))
    order = np.log2(np.array(errors[:-1]) / errors[1:])
    assert min(order) > 0.8
    assert errors[-1] < amplitude * 0.02


def test_negative_controls_detect_relevant_defects():
    lake = initial(24, "lake")
    broken = step(lake, 0.01, erosion=0, settling=0, negative=1)
    assert np.max(abs(broken[..., 1:3])) > 1e-3
    channel = initial(24, "channel")
    channel[..., 2] = 0.4
    broken = step(channel, 0.01, erosion=1, settling=0, negative=2)
    assert abs(budgets(broken)[1] - budgets(channel)[1]) > 1e-3


def test_open_boundary_exports_are_accounted():
    s = initial(16, "channel")
    s[..., 2] = s[..., 0]
    before = budgets(s)
    for _ in range(100):
        s = step(s, 0.01, erosion=1, open_boundary=True)
    assert s[..., 8].sum() < 0
    np.testing.assert_allclose(budgets(s), before, atol=1e-10)


def test_hypothesis_reservoir_transfer():
    from hypothesis import given, settings, strategies as st

    @settings(max_examples=35, deadline=None)
    @given(
        st.floats(min_value=0.01, max_value=2, allow_nan=False),
        st.floats(min_value=0, max_value=0.02, allow_nan=False),
        st.floats(min_value=0, max_value=0.2, allow_nan=False),
    )
    def check(depth, concentration, settling):
        s = initial(4, "settling")
        s[..., 0] = depth
        s[..., 3] = depth * concentration
        out = step(s, min(0.01, stable_dt(s, 1) * 0.8), settling=settling)
        assert out[..., 3].min() >= 0
        np.testing.assert_allclose(budgets(out), budgets(s), atol=1e-12)

    check()


def test_committed_independent_flux_table():
    import json
    from pathlib import Path

    root = Path(__file__).resolve().parents[3]
    table = json.loads(
        (
            root / "tools/testkit/golden/tables/geomorphology/terrain-erosion-flux.json"
        ).read_text()
    )
    assert len([p for p in table["test_points"] if p.get("independent_reference")]) >= 3
    for point in table["test_points"]:
        state = point["inputs"]["state"]
        np.testing.assert_allclose(
            flux(state, state),
            [point["expected"][k] for k in ["water", "normal", "tangent", "sediment"]],
            atol=1e-12,
        )
