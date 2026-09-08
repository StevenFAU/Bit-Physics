# Terrain erosion — Canyon Lab reference

## 1. Scope
Interactive layered canyon incision, shallow water, dilute suspended sediment,
alluvial deposition and slope relaxation. The accepted product design is
[the Canyon Lab plan](../../../planning/terrain-erosion-canyon-lab-spec.md).
## 2. Lineage
Original implementation of published equations. No external solver code copied.
Hydrostatic reconstruction: Audusse et al. (2004). Reservoir/cover model inspired
by Shobe et al. SPACE (2017), with local shear replacing stream power.
## 3. Algorithm
Conservative finite volumes; HLL fluxes; hydrostatic face reconstruction and
matching pressure corrections. Positive water and sediment, CFL-limited steps.
Start with first-order spatial/temporal transport as a measured baseline; higher
order is admitted only after wet/dry and coupled stability are established.
## 4. Equations
SWE with g=9.81 m/s² and quadratic friction. h [m], q [m²/s], S [m grain volume
per area]. Rock elevation = initial bed minus accumulated incision; loose grain
volume A has porosity .35. Erosion exchanges rock/cover with S; exponential
settling exchanges S with A. Water and total grain volume have explicit ledgers.
## 5. Implementation
Python/NumPy f64 reference and TypeScript/WGSL f32 browser solver. Dense shared
face fluxes, ping-pong state and GPU-resident rendering. Common context, panel
and capture protocol reused without changing existing simulations.
## 6. Verification posture
Analytic hydrostatic/flux/settling anchors, wet/dry conservation, manufactured
smooth-wave convergence, source-transfer identities, cover response, layer
crossing, random conservative states, CPU/GPU comparison, restart and same-device
repeatability. Negative controls must be rejected. No calibrated geological
prediction or breach-safety validation is claimed.
## 7. Golden values / Manufactured solutions
Acceptance tests at packages/terrain-erosion/tests; independent hand-derived
flux anchors: h=2,u=0 gives pressure 19.62; h=1,u=2,v=3 gives
(2,8.905,6,.02) for S=.01; vacuum gives zero. Settling is S0 exp(-ws t/h).
## 8. Determinism
Fixed state/parameters/step sequence: bit-exact on same adapter; cross-adapter
bounded error. Interactive wall-time inputs require the recorded step event log.
## 9. Equivalence
Initial declared probe bounds: canonical 32²/100 steps, absolute field error
2e-4 for f32 versus f64; normalized water/solid budget error 2e-4. Thresholds
are declared before browser tuning, and must not be widened to hide failures.
## 10. Diagnostics
Finite values, positivity, CFL, water and grain ledgers, extrema, excavation,
deposition, concentration ceiling and achieved simulated time. Mechanical energy
is not conserved by dissipative hydraulics and empirical material exchange.
## 11. Build and run
See packages/terrain-erosion/README.md. npm ci/build in web; pytest in package.
## 12. References
- Audusse et al., 2004: https://publications.imp.fu-berlin.de/478/
- Shobe et al., 2017: https://gmd.copernicus.org/articles/10/4577/2017/
- Delestre et al., SWASHES: https://arxiv.org/abs/1110.0288
- Delestre et al., steep-bed limits: https://arxiv.org/abs/1206.4986
## 13. Productization status
First-order WebGPU baseline implemented and locally verified, including a
30-minute soak. See docs/_audits/terrain-erosion/implementation-20260907.md for
measurements, scope differences and remote release status.
```yaml
productization:
  web: true
  binary: false
  pypi: false
  render: false
  preprint: false
```
