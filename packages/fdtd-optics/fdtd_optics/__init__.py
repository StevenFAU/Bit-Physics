"""fdtd-optics — 2D TMz Yee FDTD f64 reference.

Two pillars (`docs/sim-specs/electromagnetics/fdtd-optics/spec-ref.md` § 3, § 4):

- ``reference`` — the NORMATIVE gate solver: 2D TMz Yee leapfrog (Ez/Hx/Hy)
  with a 1-D-auxiliary-grid TF/SF plane-wave box and a dielectric cylinder
  (§ 3.2/§ 3.5). Its update order and slicing are the contract shared with
  the WGSL and JS implementations — behavior-frozen, never "improved".
- ``goldens`` — analytic golden generators (§ 4/§ 7): Mie sphere/cylinder
  series, Fresnel closed forms, slab-waveguide n_eff roots, grating orders,
  and the § 3.7 numerical-dispersion master relation.

TF/SF discipline (§ 3.5): the incident wave is injected only at the TF/SF
boundary from a 1-D auxiliary FDTD sharing the grid dispersion relation, so
scattered-field monitors see the pure scattered field; leakage is a gated
diagnostic, not an assumption.
"""
