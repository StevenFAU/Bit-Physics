"""1D Yee Fresnel gate — measured normal-incidence reflectance
(spec `docs/sim-specs/electromagnetics/fdtd-optics/spec-ref.md` § 4 golden A).

Two-run subtraction (total minus incident) on the validated spike scene:
n=6000, vacuum -> eps=2.25 at cell 3000, soft Ricker at 100, probe at 2000,
Mur-1 both ends, 9000 steps. Exact R = ((1-1.5)/(1+1.5))^2 = 0.04; the
spike measured 0.040167 in f64 (0.42% off — grid dispersion + finite pulse),
comfortably inside the 1% gate band.
"""

from __future__ import annotations

from fdtd_optics.reference import Fresnel1dScene, fresnel_reflectance_1d


def test_fresnel_1d_within_one_percent_of_exact() -> None:
    r = fresnel_reflectance_1d(Fresnel1dScene())
    assert abs(r - 0.04) / 0.04 < 0.01, f"measured R={r}"
    # Pin the validated spike value itself (regression witness, loose band).
    assert abs(r - 0.040167) < 5e-5, f"measured R={r} drifted from the spike"
