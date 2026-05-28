# Chakazul-Lenia (vendored reference)

Citation anchor for the Lenia continuous CA (`packages/lenia/`).
Vendored at SHA
[`adfc542939266de7f4bb7ebb552e8499701ee107`](https://github.com/Chakazul/Lenia/commit/adfc542939266de7f4bb7ebb552e8499701ee107)
(MIT, 2022-03-15 "upload LeniaF.py 'free kernel' version"). See
`MANIFEST.toml` for the per-file inventory + license posture.

## Why we vendor this

Phase 3 task-3 (Lenia sub-phase) lands a reference Lenia
implementation on Stack D (Taichi). The vendored Chakazul source is
the **citation anchor** for:

- **Quad4 kernel shape function** `K(r) = (4 r (1 - r))^4` —
  cited from `Python/LeniaF.py:493` (compact-support form
  `(r>0)*(r<1) * (4 * r * (1-r))**4`) and `Python/LeniaND.py:273`
  (alternate form `(4 * r * (1-r))**4`).
- **Quad4 polynomial growth function** `gn=1` —
  `np.maximum(0, 1 - (n-m)**2 / (9 * s**2))**4 * 2 - 1` cited from
  `Python/LeniaF.py:500` + `Python/LeniaND.py:279`.
- **Orbium unicaudatus preset** — verbatim entry at
  `Python/animals.json:5` (`R=13, T=10, b="1", m=0.15, s=0.015,
  kn=1, gn=1`).

`packages/lenia/lenia/` derives its kernel + growth + Orbium
parameters INDEPENDENTLY (Stack-D Taichi reformulation) from these
citation anchors per Convention #8 (grep-cite, no fabrication); the
vendored material is the **anchor**, not a redistributed dependency.

## License posture (MIT)

Chakazul/Lenia ships under the MIT license (see `LICENSE.md`). The
vendored copy is included verbatim per the MIT license's notice
requirement. Downstream Bit-Physics consumers (every later sim
referencing this directory) inherit MIT for the vendored bytes only;
`packages/lenia/` is licensed under the Bit-Physics root LICENSE.

## Stage-1b vendoring inventory

Per `MANIFEST.toml`:

- `LICENSE.md` — verbatim.
- `UPSTREAM_README.md` — verbatim (renamed from upstream `README.md`).
- `Python/LeniaF.py` — the kernel + growth dispatch tables (lines
  493, 500 — quad4 kernel + quad4 growth — are the load-bearing
  citation anchors).
- `Python/LeniaND.py` — sibling N-D form; redundant Quad4 citations
  at lines 273, 279.
- `Python/animals.json` — the canonical Orbium unicaudatus preset
  at line 5.
