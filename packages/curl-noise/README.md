# curl-noise

Phase-6 closed-form sim: procedural divergence-free flow-field particles
(Bridson, Hourihan, Nordenstam, SIGGRAPH 2007 + the divergence-free-noise
frontier: Curl-Flow 2022, Ding & Batty 2023, Baerentzen et al. 2025).

- **Spec:** `docs/sim-specs/closed-form/curl-noise/spec-ref.md`
- **Reference:** `curl_noise/reference/` — f64 NumPy: trig-free
  analytic-gradient+Hessian simplex noise (pinned constants, spec § 2.5),
  three constructions (2D rot, 3D curl, cross-product flagship), SDF
  boundaries, matched staggered discrete curl/div, iso-value residual +
  Newton reprojection, ABC flow.
- **Web demo:** `web/` — WebGPU/WGSL verification demo
  (`web/verification-demo-spec.md`).

Honesty boundary (load-bearing): this is a **kinematic/procedural**
construction — provably incompressible and boundary-tangent; it has no
pressure, no momentum/energy conservation, and no self-advection. It is
not a Navier-Stokes solver and is never marketed as one.

Run: `uv run --no-sync python -m curl_noise.reference.curlnoise --diagnostics`
Tests: `uv run --no-sync pytest packages/curl-noise/tests`
