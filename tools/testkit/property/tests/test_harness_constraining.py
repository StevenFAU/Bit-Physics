"""Constraining tests for the PBT harness and its invariant library.

These tests are deliberately mutation-oriented: every assertion is chosen so
that flipping a comparison operator, nudging a boundary constant, dropping a
factor, or swapping a return value in the source would turn the test RED.

The invariant `check_fn`s only ever consult `capture.steps()`, so we drive
them with a lightweight `_FakeCapture` that yields hand-built `StepState`
objects. This keeps the tests fast (no HDF5 round-trip) and lets us place
inputs *exactly* on the tolerance / bound boundaries — the regime where
off-by-one / `<` vs `<=` mutants live.

Each test docstring names the concrete mutant(s) it is designed to catch.
"""

from __future__ import annotations

from collections.abc import Iterable
from pathlib import Path

import numpy as np

from capture import CaptureManifest, StepState, write_capture
from property import (
    Fail,
    Invariant,
    InvariantResult,
    Pass,
    PropertyVerdict,
    run_invariants,
)
from property.invariants import (
    conservation_energy,
    conservation_mass,
    conservation_momentum,
    divergence_free_where_prescribed,
    monotone_bounds,
    no_particle_overlap_within_epsilon,
)
from property.invariants.conservation import _check_scalar_conservation
from property.strategies import (
    random_particle_configuration_1d,
    random_seed,
    smooth_scalar_field_in_unit_box,
)


# --------------------------------------------------------------------------
# Lightweight capture stub: invariants consume only `.steps()`.
# --------------------------------------------------------------------------
class _FakeCapture:
    """Minimal `Capture` stand-in exposing exactly the `steps()` surface used
    by every invariant `check_fn`."""

    def __init__(self, states: list[StepState]) -> None:
        self._states = states

    def steps(self) -> Iterable[StepState]:
        return iter(self._states)


def _state(step: int, **fields: np.ndarray) -> StepState:
    return StepState(step=step, state=dict(fields), diagnostics={})


# ==========================================================================
# conservation: _check_scalar_conservation + the three public factories
# ==========================================================================
def test_conservation_passes_when_sum_exactly_preserved() -> None:
    """Two steps whose `field` sums are byte-equal must PASS.

    Kills a mutant that swaps the `Pass`/`Fail` return at the tail, or that
    inverts the `drift > tolerance` comparison so equal sums report a fault.
    """
    cap = _FakeCapture(
        [
            _state(0, U=np.array([1.0, 2.0, 3.0])),
            _state(1, U=np.array([3.0, 2.0, 1.0])),  # permutation -> same sum
        ]
    )
    outcome = conservation_mass(field="U", tolerance=1e-12).check_fn(cap)
    assert isinstance(outcome, Pass)


def test_conservation_drift_exactly_at_tolerance_passes() -> None:
    """drift == tolerance must PASS (strict `>` boundary).

    Kills the `drift > tolerance` -> `drift >= tolerance` mutant: at the
    boundary the inclusive form would FAIL while the source PASSes.
    """
    initial = np.array([10.0])
    cap = _FakeCapture(
        [
            _state(0, U=initial),
            _state(1, U=np.array([10.0 + 1e-6])),  # drift == 1e-6
        ]
    )
    outcome = _check_scalar_conservation(cap, field="U", tolerance=1e-6, label="mass")
    assert isinstance(outcome, Pass)


def test_conservation_drift_just_above_tolerance_fails() -> None:
    """drift slightly above tolerance must FAIL.

    Kills the inverted comparison (`<`) and the `> tolerance` -> `> -tolerance`
    sign mutants; confirms the Fail path actually fires.
    """
    cap = _FakeCapture(
        [
            _state(0, U=np.array([10.0])),
            _state(1, U=np.array([10.0 + 2e-6])),  # drift == 2e-6 > 1e-6
        ]
    )
    outcome = _check_scalar_conservation(cap, field="U", tolerance=1e-6, label="mass")
    assert isinstance(outcome, Fail)
    assert outcome.counter_example["step"] == 1
    assert outcome.counter_example["drift"] > 1e-6
    # initial/current sums recorded for operator inspection (kills mutants
    # that swap initial<->current in the counter_example dict).
    assert outcome.counter_example["initial_sum"] == 10.0


def test_conservation_uses_absolute_drift_negative_direction() -> None:
    """A DECREASE in sum beyond tolerance must FAIL too.

    `drift = abs(current - initial)`. Kills the mutant that drops `abs`
    (then a downward drift would be negative and never exceed tolerance).
    """
    cap = _FakeCapture(
        [
            _state(0, U=np.array([10.0])),
            _state(1, U=np.array([10.0 - 5e-6])),  # negative delta, |drift|=5e-6
        ]
    )
    outcome = _check_scalar_conservation(cap, field="U", tolerance=1e-6, label="mass")
    assert isinstance(outcome, Fail)
    assert abs(outcome.counter_example["drift"] - 5e-6) < 1e-12


def test_conservation_reference_is_step_zero_not_previous_step() -> None:
    """Drift is measured against step 0, NOT the immediately prior step.

    Steps: sum 10 -> 10 -> 10.5. If drift were computed vs the previous step
    each delta is 0 then 0.5; vs step 0 the deltas are 0 then 0.5. To make the
    two definitions diverge we use a RAMP: 10 -> 10.4 -> 10.8 with tol 0.5.
    Against step 0: drifts 0.4 (ok) then 0.8 (FAIL). Against previous step:
    0.4 then 0.4 — both within tol, would PASS. Source must FAIL.

    Kills the mutant that rebinds `initial` to the current step inside the loop.
    """
    cap = _FakeCapture(
        [
            _state(0, U=np.array([10.0])),
            _state(1, U=np.array([10.4])),
            _state(2, U=np.array([10.8])),
        ]
    )
    outcome = _check_scalar_conservation(cap, field="U", tolerance=0.5, label="mass")
    assert isinstance(outcome, Fail)
    assert outcome.counter_example["step"] == 2


def test_conservation_fewer_than_two_steps_passes_vacuously() -> None:
    """A single-step capture holds vacuously (the `< 2` guard).

    Kills `< 2` -> `< 1` / `<= 2` and the guard-removal mutant (which would
    crash on `max()` of an empty drift list or mis-report).
    """
    cap = _FakeCapture([_state(0, U=np.array([1.0, 2.0]))])
    outcome = _check_scalar_conservation(cap, field="U", tolerance=1e-9, label="mass")
    assert isinstance(outcome, Pass)
    assert "vacuously" in outcome.detail


def test_conservation_empty_capture_passes_vacuously() -> None:
    """Zero steps also takes the `< 2` vacuous-pass branch."""
    cap = _FakeCapture([])
    outcome = _check_scalar_conservation(cap, field="U", tolerance=1e-9, label="mass")
    assert isinstance(outcome, Pass)


def test_conservation_missing_field_at_step_zero_fails() -> None:
    """Field absent from step 0 -> Fail with the missing-field counter-example.

    Kills the mutant that flips `field not in ...` to `field in ...`.
    """
    cap = _FakeCapture(
        [
            _state(0, V=np.array([1.0])),  # no "U"
            _state(1, V=np.array([1.0])),
        ]
    )
    outcome = _check_scalar_conservation(cap, field="U", tolerance=1e-9, label="mass")
    assert isinstance(outcome, Fail)
    assert outcome.counter_example == {"missing_field": "U"}
    assert "step 0" in outcome.detail


def test_conservation_missing_field_at_later_step_fails() -> None:
    """Field present at step 0 but missing later -> Fail naming that step.

    Kills mutants that skip the in-loop membership check or mis-record the step.
    """
    cap = _FakeCapture(
        [
            _state(0, U=np.array([1.0])),
            _state(1, U=np.array([1.0])),
            _state(2, V=np.array([1.0])),  # "U" vanished at step 2
        ]
    )
    outcome = _check_scalar_conservation(cap, field="U", tolerance=1e-9, label="mass")
    assert isinstance(outcome, Fail)
    assert outcome.counter_example["missing_field"] == "U"
    assert outcome.counter_example["step"] == 2


def test_conservation_sum_over_multidim_field() -> None:
    """`np.sum` must total the WHOLE array (kills axis=0 / partial-sum mutants).

    Step 0 sums to 10; step 1 is a reshape preserving the total -> PASS. If the
    source summed only one axis the two totals would differ and it would FAIL.
    """
    cap = _FakeCapture(
        [
            _state(0, U=np.array([[1.0, 2.0], [3.0, 4.0]])),  # sum 10
            _state(1, U=np.array([[4.0, 3.0], [2.0, 1.0]])),  # sum 10
        ]
    )
    outcome = conservation_mass(field="U", tolerance=1e-12).check_fn(cap)
    assert isinstance(outcome, Pass)


def test_conservation_factory_names_and_defaults() -> None:
    """The three factories carry distinct default fields / categories / names.

    Kills mutants that swap default field strings ("U"/"P"/"E"), the
    `applies_to_category` literals, or the f-string `name` construction.
    """
    mass = conservation_mass()
    mom = conservation_momentum()
    energy = conservation_energy()

    assert mass.name == "conservation_mass:U"
    assert mass.applies_to_category == "continuous-ca"

    assert mom.name == "conservation_momentum:P"
    assert mom.applies_to_category == "particle-fluid"

    assert energy.name == "conservation_energy:E"
    assert energy.applies_to_category == "rigid-body"


def test_conservation_factory_label_in_detail() -> None:
    """The label routed into the detail string differs per factory.

    Kills a mutant that hard-codes one label or swaps label between factories.
    """
    cap_fail = _FakeCapture(
        [
            _state(0, P=np.array([1.0])),
            _state(1, P=np.array([5.0])),  # big drift
        ]
    )
    out = conservation_momentum(field="P", tolerance=1e-9).check_fn(cap_fail)
    assert isinstance(out, Fail)
    assert out.detail.startswith("momentum:")


# ==========================================================================
# geometry: no_particle_overlap_within_epsilon
# ==========================================================================
def _pos(step: int, arr: np.ndarray) -> StepState:
    return _state(step, X=arr)


def test_overlap_well_separated_passes() -> None:
    """Particles far apart -> Pass.

    Kills the mutant inverting `min_dist < epsilon`.
    """
    cap = _FakeCapture([_pos(0, np.array([[0.0, 0.0], [1.0, 0.0], [0.0, 1.0]]))])
    out = no_particle_overlap_within_epsilon("X", epsilon=1e-3).check_fn(cap)
    assert isinstance(out, Pass)


def test_overlap_separation_exactly_at_epsilon_passes() -> None:
    """min separation == epsilon must PASS (strict `<` boundary).

    Kills `min_dist < epsilon` -> `min_dist <= epsilon`: the inclusive form
    would FAIL on the exactly-touching-at-epsilon configuration.
    """
    eps = 0.5
    cap = _FakeCapture([_pos(0, np.array([[0.0, 0.0], [0.5, 0.0]]))])  # dist == 0.5
    out = no_particle_overlap_within_epsilon("X", epsilon=eps).check_fn(cap)
    assert isinstance(out, Pass)


def test_overlap_separation_just_below_epsilon_fails() -> None:
    """min separation slightly below epsilon must FAIL and report the distance.

    Kills the comparison-inversion mutant and confirms the reported
    `min_distance` is the true minimum (not, e.g., the max pair distance).
    """
    cap = _FakeCapture([_pos(0, np.array([[0.0, 0.0], [0.4, 0.0]]))])  # dist 0.4
    out = no_particle_overlap_within_epsilon("X", epsilon=0.5).check_fn(cap)
    assert isinstance(out, Fail)
    assert abs(out.counter_example["min_distance"] - 0.4) < 1e-12
    assert out.counter_example["step"] == 0


def test_overlap_detects_minimum_among_many_pairs() -> None:
    """Only ONE close pair among several far pairs still trips the check.

    Kills a mutant that reduces with `max` instead of `min` over pair
    distances — `max` would be large and wrongly PASS.
    """
    cap = _FakeCapture(
        [
            _pos(
                0,
                np.array([[0.0, 0.0], [5.0, 0.0], [5.0, 0.001]]),  # last pair: 0.001
            )
        ]
    )
    out = no_particle_overlap_within_epsilon("X", epsilon=0.01).check_fn(cap)
    assert isinstance(out, Fail)
    assert abs(out.counter_example["min_distance"] - 0.001) < 1e-9


def test_overlap_single_particle_skipped() -> None:
    """n < 2 short-circuits (`continue`) and never flags overlap.

    Kills `n < 2` -> `n < 1` / `n <= 2`: at n==1 there are no pairs, and an
    off-by-one boundary would either crash on empty `triu_indices` math or
    mis-handle the n==2 case.
    """
    cap = _FakeCapture([_pos(0, np.array([[0.0, 0.0]]))])  # exactly one particle
    out = no_particle_overlap_within_epsilon("X", epsilon=1.0).check_fn(cap)
    assert isinstance(out, Pass)


def test_overlap_two_particles_not_skipped() -> None:
    """n == 2 is BELOW no boundary: it must be checked, not skipped.

    Pairs with two coincident particles -> Fail. Kills `n < 2` -> `n < 3`
    (which would wrongly skip the n==2 overlap).
    """
    cap = _FakeCapture([_pos(0, np.array([[1.0, 1.0], [1.0, 1.0]]))])  # coincident
    out = no_particle_overlap_within_epsilon("X", epsilon=1e-6).check_fn(cap)
    assert isinstance(out, Fail)
    assert out.counter_example["min_distance"] == 0.0


def test_overlap_missing_field_fails() -> None:
    """Positions field absent -> Fail (kills `not in` -> `in` flip)."""
    cap = _FakeCapture([_state(0, Y=np.array([[0.0, 0.0]]))])
    out = no_particle_overlap_within_epsilon("X", epsilon=1.0).check_fn(cap)
    assert isinstance(out, Fail)
    assert out.counter_example == {"step": 0}


def test_overlap_non_2d_field_fails() -> None:
    """A 1-D positions array -> Fail (the `ndim != 2` guard).

    Kills `x.ndim != 2` -> `== 2` and similar guard mutants.
    """
    cap = _FakeCapture([_pos(0, np.array([0.0, 1.0, 2.0]))])  # 1-D
    out = no_particle_overlap_within_epsilon("X", epsilon=1.0).check_fn(cap)
    assert isinstance(out, Fail)
    assert "2-D" in out.detail


def test_overlap_invariant_name_embeds_field_and_epsilon() -> None:
    """name == f"...:{field}:{epsilon}" — kills f-string field/eps mutants."""
    inv = no_particle_overlap_within_epsilon("X", epsilon=1e-6)
    assert inv.name == "no_particle_overlap_within_epsilon:X:1e-06"
    assert inv.applies_to_category == "particle-fluid"


# ==========================================================================
# scalar_field: monotone_bounds
# ==========================================================================
def test_monotone_bounds_inside_passes() -> None:
    """Values strictly inside [lo, hi] -> Pass."""
    cap = _FakeCapture([_state(0, F=np.array([0.1, 0.5, 0.9]))])
    out = monotone_bounds("F", lo=0.0, hi=1.0).check_fn(cap)
    assert isinstance(out, Pass)


def test_monotone_bounds_exactly_on_boundaries_passes() -> None:
    """min == lo and max == hi must PASS (the bounds are inclusive).

    Kills `mn < lo` -> `mn <= lo` and `mx > hi` -> `mx >= hi`: the inclusive
    mutants would FAIL on the exactly-on-boundary field.
    """
    cap = _FakeCapture([_state(0, F=np.array([0.0, 0.5, 1.0]))])
    out = monotone_bounds("F", lo=0.0, hi=1.0).check_fn(cap)
    assert isinstance(out, Pass)


def test_monotone_bounds_below_lo_fails() -> None:
    """A value just below lo -> Fail (kills `mn < lo` inversion / sign)."""
    cap = _FakeCapture([_state(0, F=np.array([-1e-9, 0.5]))])
    out = monotone_bounds("F", lo=0.0, hi=1.0).check_fn(cap)
    assert isinstance(out, Fail)
    assert out.counter_example["min"] < 0.0
    assert out.counter_example["step"] == 0


def test_monotone_bounds_above_hi_fails() -> None:
    """A value just above hi -> Fail (kills `mx > hi` inversion / sign)."""
    cap = _FakeCapture([_state(0, F=np.array([0.5, 1.0 + 1e-9]))])
    out = monotone_bounds("F", lo=0.0, hi=1.0).check_fn(cap)
    assert isinstance(out, Fail)
    assert out.counter_example["max"] > 1.0


def test_monotone_bounds_checks_every_step() -> None:
    """A violation at a LATER step is caught (loop runs over all steps).

    Kills a mutant that `break`s/`return`s after step 0 or checks only the
    first step.
    """
    cap = _FakeCapture(
        [
            _state(0, F=np.array([0.5])),
            _state(1, F=np.array([0.5])),
            _state(2, F=np.array([2.0])),  # out of bounds at step 2
        ]
    )
    out = monotone_bounds("F", lo=0.0, hi=1.0).check_fn(cap)
    assert isinstance(out, Fail)
    assert out.counter_example["step"] == 2


def test_monotone_bounds_empty_array_skipped() -> None:
    """An empty field array is skipped via `arr.size == 0` (continue).

    Kills `arr.size == 0` -> `!= 0` (which would skip a real field and miss
    a genuine violation, or crash on np.min of empty).
    """
    cap = _FakeCapture(
        [
            _state(0, F=np.array([])),  # empty -> skipped
            _state(1, F=np.array([0.5])),  # in-bounds
        ]
    )
    out = monotone_bounds("F", lo=0.0, hi=1.0).check_fn(cap)
    assert isinstance(out, Pass)


def test_monotone_bounds_missing_field_fails() -> None:
    """Field absent -> Fail (kills `field not in` -> `in`)."""
    cap = _FakeCapture([_state(0, G=np.array([0.5]))])
    out = monotone_bounds("F", lo=0.0, hi=1.0).check_fn(cap)
    assert isinstance(out, Fail)
    assert out.counter_example["missing_field"] == "F"


def test_monotone_bounds_name_embeds_field_and_range() -> None:
    """name == f"monotone_bounds:{field}:[{lo},{hi}]"."""
    inv = monotone_bounds("F", lo=-2.0, hi=3.0)
    assert inv.name == "monotone_bounds:F:[-2.0,3.0]"
    assert inv.applies_to_category == "continuous-ca"


# ==========================================================================
# scalar_field: divergence_free_where_prescribed
# ==========================================================================
def test_divergence_free_constant_field_passes() -> None:
    """A spatially constant velocity has zero central-difference divergence.

    Kills the mutant that drops the `* 0.5` (constant field still gives 0) —
    so we pair this with a NONZERO-divergence test below.
    """
    vx = np.ones((4, 4))
    vy = np.ones((4, 4))
    cap = _FakeCapture([_state(0, Vx=vx, Vy=vy)])
    out = divergence_free_where_prescribed("Vx", "Vy", tolerance=1e-9).check_fn(cap)
    assert isinstance(out, Pass)


def test_divergence_free_nonzero_divergence_fails() -> None:
    """A field with a genuine central-difference divergence above tol -> Fail.

    vx = x (linear ramp along last axis) gives central diff
    (roll(-1)-roll(1))*0.5 == 1 in the interior. Kills the inversion of
    `mx > tolerance` and the mutant that nulls the divergence computation.
    """
    n = 5
    ramp = np.tile(np.arange(n, dtype=float), (n, 1))  # vx varies along axis -1
    vy = np.zeros((n, n))
    cap = _FakeCapture([_state(0, Vx=ramp, Vy=vy)])
    out = divergence_free_where_prescribed("Vx", "Vy", tolerance=0.5).check_fn(cap)
    assert isinstance(out, Fail)
    # interior central difference of a unit ramp is exactly 1.0
    assert out.counter_example["max_abs_div"] >= 1.0 - 1e-9


def test_divergence_free_tolerance_is_strict_upper() -> None:
    """|div|_max exactly at tolerance must PASS (kills `>` -> `>=`).

    Build a 1-D field (ndim==1 so the y-term is skipped). With PERIODIC
    `np.roll` central differences, the ramp [0,1,2,3,4] yields a max |div|
    of exactly 1.5 (the wrap-around boundary dominates the interior 1.0).
    Setting tolerance == 1.5 places the value exactly on the boundary, so
    the strict `>` source PASSes while a `>=` mutant would FAIL.
    """
    vx = np.array([0.0, 1.0, 2.0, 3.0, 4.0])  # periodic max |div| == 1.5
    vy = np.zeros(5)
    cap = _FakeCapture([_state(0, Vx=vx, Vy=vy)])
    out = divergence_free_where_prescribed("Vx", "Vy", tolerance=1.5).check_fn(cap)
    assert isinstance(out, Pass)


def test_divergence_free_just_above_tolerance_fails() -> None:
    """The same ramp (max |div| == 1.5) with tolerance just below -> Fail.

    Pairs with the boundary test above to pin the `>` comparison from both
    sides and to confirm the reported `max_abs_div` is the true periodic max.
    """
    vx = np.array([0.0, 1.0, 2.0, 3.0, 4.0])
    vy = np.zeros(5)
    cap = _FakeCapture([_state(0, Vx=vx, Vy=vy)])
    out = divergence_free_where_prescribed("Vx", "Vy", tolerance=1.5 - 1e-9).check_fn(cap)
    assert isinstance(out, Fail)
    assert abs(out.counter_example["max_abs_div"] - 1.5) < 1e-9


def test_divergence_free_1d_skips_y_term() -> None:
    """For 1-D fields the y (axis -2) term must NOT be added (`ndim > 1` guard).

    A 1-D constant field is divergence-free; if the guard were dropped the
    `np.roll(..., axis=-2)` on a 1-D array would re-roll axis 0 and could
    introduce spurious divergence. Constant field stays 0 regardless, so we
    assert Pass AND that a 1-D ramp (no y-term) reports exactly the x-only div.
    """
    vx = np.array([0.0, 2.0, 4.0, 6.0])  # x-only central diff == 2.0 interior
    vy = np.array([100.0, 100.0, 100.0, 100.0])  # would matter only if y added
    cap = _FakeCapture([_state(0, Vx=vx, Vy=vy)])
    out = divergence_free_where_prescribed("Vx", "Vy", tolerance=1.5).check_fn(cap)
    assert isinstance(out, Fail)
    # x-only interior central difference of step-2 ramp == 2.0
    assert abs(out.counter_example["max_abs_div"] - 2.0) < 1e-9


def test_divergence_free_missing_field_fails() -> None:
    """Either component missing -> Fail (kills the `or` -> `and` mutant)."""
    cap = _FakeCapture([_state(0, Vx=np.zeros((3, 3)))])  # no Vy
    out = divergence_free_where_prescribed("Vx", "Vy", tolerance=1e-9).check_fn(cap)
    assert isinstance(out, Fail)
    assert out.counter_example == {"step": 0}


def test_divergence_free_shape_mismatch_fails() -> None:
    """Vx / Vy shape mismatch -> Fail (kills `!=` -> `==` guard flip)."""
    cap = _FakeCapture([_state(0, Vx=np.zeros((3, 3)), Vy=np.zeros((2, 2)))])
    out = divergence_free_where_prescribed("Vx", "Vy", tolerance=1e-9).check_fn(cap)
    assert isinstance(out, Fail)
    assert "shape mismatch" in out.detail


def test_divergence_free_name_embeds_components() -> None:
    inv = divergence_free_where_prescribed("Vx", "Vy")
    assert inv.name == "divergence_free_where_prescribed:(Vx,Vy)"
    assert inv.applies_to_category == "incompressible-flow"


# ==========================================================================
# harness orchestration: run_invariants aggregation + dataclasses
# ==========================================================================
def _passing_inv(name: str) -> Invariant:
    return Invariant(name=name, applies_to_category="", check_fn=lambda cap: Pass())


def _failing_inv(name: str, detail: str = "boom") -> Invariant:
    return Invariant(
        name=name,
        applies_to_category="",
        check_fn=lambda cap: Fail(detail=detail, counter_example={"why": detail}),
    )


def _noop_runner(initial_condition: object, out_dir: Path) -> Path:
    """A sim_runner whose capture is never read by our stub invariants.

    The stub invariants ignore the capture entirely, so we just need
    `load_capture` to succeed; emit a tiny valid capture.
    """
    states = [
        StepState(step=0, state={"U": np.array([1.0])}, diagnostics={}),
        StepState(step=1, state={"U": np.array([1.0])}, diagnostics={}),
    ]
    return write_capture(states, _runner_manifest(), out_dir)


def _runner_manifest() -> CaptureManifest:
    return CaptureManifest(
        schema_version="1.0.0",
        sim={"name": "pbt-orch", "category": "continuous-ca", "variant": "stub"},
        stack={"name": "numpy-stub", "version": "0.0.1", "build_id": "stub"},
        config={"tier": "test", "dims": [1], "dtype": "f64", "seed": 0, "params": {}},
        run={
            "step_count": 2,
            "capture_interval": 1,
            "wall_clock_seconds": 0.0,
            "start_utc": "2026-05-19T00:00:00Z",
        },
        payload={"format": "hdf5", "path": "orch.h5", "checksum": "sha256:" + "0" * 64},
        determinism={
            "claimed": "bit-exact-same-hw",
            "atomic_ops": False,
            "subgroup_ops": False,
        },
    )


def test_run_invariants_all_pass_sets_all_passed_true(tmp_path: Path) -> None:
    """Every invariant passing -> all_passed True and one result per invariant.

    Kills the `all(...)` -> `any(...)` mutant on the aggregation, and the
    mutant that drops/duplicates results.
    """
    verdict = run_invariants(
        _noop_runner,
        invariants=[_passing_inv("a"), _passing_inv("b")],
        n_examples=3,
        tmp_dir=tmp_path,
    )
    assert isinstance(verdict, PropertyVerdict)
    assert verdict.all_passed is True
    assert [r.invariant for r in verdict.results] == ["a", "b"]
    assert all(r.passed for r in verdict.results)


def test_run_invariants_one_failure_flips_all_passed_false(tmp_path: Path) -> None:
    """A single failing invariant among passers -> all_passed False.

    Kills `all(...)` -> `any(...)` (which would stay True because some pass)
    and the `not`-insertion mutant on `r.passed`.
    """
    verdict = run_invariants(
        _noop_runner,
        invariants=[_passing_inv("a"), _failing_inv("b", "nope")],
        n_examples=3,
        tmp_dir=tmp_path,
    )
    assert verdict.all_passed is False
    by_name = {r.invariant: r for r in verdict.results}
    assert by_name["a"].passed is True
    assert by_name["b"].passed is False
    assert by_name["b"].detail == "nope"
    assert by_name["b"].counter_example == {"why": "nope"}


def test_run_invariants_preserves_invariant_order(tmp_path: Path) -> None:
    """Results come back in the SAME order as the input invariants.

    Kills a mutant that reverses / sorts the results list.
    """
    names = ["z", "m", "a"]
    verdict = run_invariants(
        _noop_runner,
        invariants=[_passing_inv(n) for n in names],
        n_examples=2,
        tmp_dir=tmp_path,
    )
    assert [r.invariant for r in verdict.results] == names


def test_run_invariants_passing_result_detail_is_ok(tmp_path: Path) -> None:
    """A passed invariant yields detail 'ok' (kills the literal-string mutant)."""
    verdict = run_invariants(
        _noop_runner,
        invariants=[_passing_inv("only")],
        n_examples=2,
        tmp_dir=tmp_path,
    )
    assert verdict.results[0].detail == "ok"
    assert verdict.results[0].counter_example is None


def test_run_invariants_failure_carries_counter_example(tmp_path: Path) -> None:
    """A failing invariant's counter_example reaches the InvariantResult.

    The harness uses `outcome.counter_example if not None else example`. Here
    the stub supplies a non-None counter_example, so it must pass through
    unchanged. Kills a mutant that drops the counter_example or always
    substitutes `example`.
    """
    verdict = run_invariants(
        _noop_runner,
        invariants=[_failing_inv("c", "detail-x")],
        n_examples=2,
        tmp_dir=tmp_path,
    )
    assert verdict.results[0].counter_example == {"why": "detail-x"}


def test_run_invariants_default_strategy_runs_with_none_ic(tmp_path: Path) -> None:
    """With strategy=None the harness falls back to st.just(None).

    The runner must therefore receive `None` as the IC. We assert via a runner
    that records the ICs it observed. Kills the mutant that drops the
    `strategy if strategy is not None else st.just(None)` fallback.
    """
    seen: list[object] = []

    def recording_runner(ic: object, out_dir: Path) -> Path:
        seen.append(ic)
        return _noop_runner(ic, out_dir)

    verdict = run_invariants(
        recording_runner,
        invariants=[_passing_inv("a")],
        strategy=None,
        n_examples=4,
        tmp_dir=tmp_path,
    )
    assert verdict.all_passed
    assert seen, "runner should have been invoked at least once"
    assert all(ic is None for ic in seen)


# --------------------------------------------------------------------------
# dataclass defaults — small but mutation-sensitive
# --------------------------------------------------------------------------
def test_pass_default_detail() -> None:
    """Pass() defaults detail='ok' (kills the default-literal mutant)."""
    assert Pass().detail == "ok"


def test_fail_default_counter_example_is_none() -> None:
    """Fail(detail=...) leaves counter_example None by default."""
    f = Fail(detail="x")
    assert f.counter_example is None
    assert f.detail == "x"


def test_invariant_result_default_counter_example_is_none() -> None:
    """InvariantResult counter_example defaults to None."""
    r = InvariantResult(invariant="i", passed=True, detail="ok")
    assert r.counter_example is None


def test_property_verdict_default_results_empty() -> None:
    """PropertyVerdict.results defaults to an empty list (field default_factory)."""
    v = PropertyVerdict(all_passed=True)
    assert v.results == []


# ==========================================================================
# strategies: generated values honour declared ranges / shapes
# ==========================================================================
def test_smooth_scalar_field_shape_and_bounds() -> None:
    """Generated field has the requested length and stays within [lo, hi].

    Kills mutants in the strategy that change the shape index, drop the
    np.clip, or shift the [lo, hi] clamp.
    """
    from hypothesis import given, settings

    strat = smooth_scalar_field_in_unit_box(shape=(16,), lo=0.0, hi=1.0)

    @settings(max_examples=25, deadline=None)
    @given(strat)
    def _check(field: np.ndarray) -> None:
        assert field.shape == (16,)
        assert field.dtype == np.float64
        assert float(field.min()) >= 0.0
        assert float(field.max()) <= 1.0

    _check()


def test_smooth_scalar_field_custom_bounds_respected() -> None:
    """Non-default [lo, hi] clamp is honoured (kills hard-coded 0/1 mutants)."""
    from hypothesis import given, settings

    strat = smooth_scalar_field_in_unit_box(shape=(8,), lo=-3.0, hi=-1.0)

    @settings(max_examples=20, deadline=None)
    @given(strat)
    def _check(field: np.ndarray) -> None:
        assert float(field.min()) >= -3.0
        assert float(field.max()) <= -1.0

    _check()


def test_particle_configuration_shape_and_domain() -> None:
    """1-D particle config is (N, 1) and bounded by the domain.

    Kills mutants that swap the shape tuple or the lo/hi domain bounds.
    """
    from hypothesis import given, settings

    strat = random_particle_configuration_1d(n_particles=6, domain=(2.0, 5.0))

    @settings(max_examples=25, deadline=None)
    @given(strat)
    def _check(pos: np.ndarray) -> None:
        assert pos.shape == (6, 1)
        assert pos.dtype == np.float64
        assert float(pos.min()) >= 2.0
        assert float(pos.max()) <= 5.0

    _check()


def test_random_seed_range() -> None:
    """Seeds are nonnegative and clamped below 2**30.

    Kills mutants on the min_value (0) and max_value ((1<<30)-1) bounds.
    """
    from hypothesis import given, settings

    @settings(max_examples=50, deadline=None)
    @given(random_seed())
    def _check(seed: int) -> None:
        assert isinstance(seed, int)
        assert 0 <= seed <= (1 << 30) - 1

    _check()
