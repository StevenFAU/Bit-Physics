"""heat-equation — 2D transient heat diffusion f64 reference.

Two gated solver paths (spec-ref.md § 1):

- ``reference``  — FTCS explicit stencil (interactive default; gated against
  its own DISCRETE amplification ``g_h^N`` and the 2D MMS).
- ``spectral``   — FFT exponential-integrator (machine-exact per mode on the
  periodic box; the analytic yardstick and the honest large-step solver).

Two-spectra discipline (spec-ref.md § 3.2): the FTCS run is compared against
the discrete eigenvalues; the spectral run against the continuous ones.
Mixing them is the #1 porting trap.
"""
