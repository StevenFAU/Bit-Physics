# Lenia Quad4 kernel — derivation

Companion derivation for
`tools/testkit/golden/tables/lenia-kernel.json` +
`tools/testkit/golden/tables/lenia-orbium-trajectory.json`.

Upstream citation: Chakazul/Lenia at SHA
`adfc542939266de7f4bb7ebb552e8499701ee107`
(`references/Chakazul-Lenia/`), MIT.

## § 1 — Quad4 kernel shape function

### § 1.1 Closed form (Chakazul, grep-cited)

```
K(r) = (4 r (1 - r))^4    for r ∈ [0, 1]
K(r) = 0                  for r > 1     (compact support)
```

Grep-citations against the vendored Chakazul source at the pinned SHA:

- `references/Chakazul-Lenia/Python/LeniaF.py:493` — compact-support form:
  ```python
  1: lambda r: (r>0)*(r<1) * (4 * r * (1-r))**4,  # polynomial (quad4)
  ```
- `references/Chakazul-Lenia/Python/LeniaND.py:273` — sibling raw form:
  ```python
  0: lambda r: (4 * r * (1-r))**4,  # polynomial (quad4)
  ```

The compact-support `(r>0)*(r<1)` mask in `LeniaF.py` is the load-bearing
implementation contract; the raw polynomial form in `LeniaND.py` is the
algebraic shape. The two agree on `(0, 1)` and the polynomial vanishes
at both endpoints (`K(0) = K(1) = 0`), so the closed-interval [0, 1]
boundary is identical to the open-interval (0, 1) on the boundary
values.

### § 1.2 Three canonical anchors (independent-reference grade)

Hand-derivation:

1. **`r = 0`**:
   ```
   K(0) = (4 · 0 · (1 - 0))^4 = (0)^4 = 0
   ```
   The §6.3 plan-prose at `docs/phases/phase-3-plan.md:1351` calls this
   the "peak K(0)" — mathematically incorrect; charter §1.2 + Stage-1a
   audit §4.2 record the SHIFTED-on-evidence anchor correction. The
   peak is at `r = 0.5`, NOT at `r = 0`.

2. **`r = 0.5`** (PEAK):
   ```
   K(0.5) = (4 · 0.5 · (1 - 0.5))^4 = (1)^4 = 1
   ```
   Peak location proof: `d/dr [(4·r·(1-r))^4] = 0` is equivalent to
   `d/dr [4·r·(1-r)] = 0` because `(·)^4` is monotone where the
   argument is positive. The inner expression `4·r·(1-r)` has its own
   maximum at `r = 0.5` where its derivative `4·(1 - 2r) = 0`. There
   `4·r·(1-r) = 1`, so `K(0.5) = 1^4 = 1`.

3. **`r = 1`**:
   ```
   K(1) = (4 · 1 · (1 - 1))^4 = (0)^4 = 0
   ```
   Compact-support boundary.

### § 1.3 Mid-curve cross-check anchors

For golden-table regression robustness, the table also records
intermediate values (not independent-reference grade but exact under
the closed form):

| `r` | `K(r)` |
|---|---|
| 0.1 | `0.016796160000000008` = `(0.36)^4` |
| 0.25 | `0.31640625` = `(0.75)^4` |
| 0.4 | `0.8493465599999999` = `(0.96)^4` |
| 0.6 | `0.8493465599999999` = `(0.96)^4` (symmetric to 0.4) |
| 0.75 | `0.31640625` = `(0.75)^4` (symmetric to 0.25) |
| 0.9 | `0.016796159999999987` = `(0.36)^4` (symmetric to 0.1) |

The float64-format trailing digits reflect IEEE-754 round-off; the
golden table uses the exact `(4r(1-r))^4` evaluation under
`np.float64` arithmetic.

## § 2 — Quad4 polynomial growth function (gn = 1)

### § 2.1 Closed form (Chakazul, grep-cited)

```
G(u; mu, sigma) = max(0, 1 - (u - mu)^2 / (9 · sigma^2))^4 · 2 - 1
```

Grep-citations:

- `references/Chakazul-Lenia/Python/LeniaF.py:500`:
  ```python
  1: lambda n, m, s: np.maximum(0, 1 - (n-m)**2 / (9 * s**2) )**4 * 2 - 1,  # polynomial (quad4)
  ```
- `references/Chakazul-Lenia/Python/LeniaND.py:279` — sibling form
  (`0:` selector, same expression).

The Orbium unicaudatus preset at
`references/Chakazul-Lenia/Python/animals.json:5` has `"gn": 1`, so
Orbium uses this **polynomial** growth (NOT the bell-curve `exp`
form used by some Lenia variants).

### § 2.2 Anchor evaluations

At `u = mu`:
```
G(mu; mu, sigma) = max(0, 1 - 0)^4 · 2 - 1 = 1^4 · 2 - 1 = 1
```
Peak (positive saturation).

At `|u - mu| >> sigma`:
```
G(u; mu, sigma) = max(0, 1 - LARGE)^4 · 2 - 1
                = max(0, NEGATIVE)^4 · 2 - 1
                = 0^4 · 2 - 1 = -1
```
Negative saturation (the `max(0, …)` clips the polynomial). The
saturation threshold is at `(u - mu)^2 = 9 · sigma^2`, i.e.
`|u - mu| = 3 · sigma`.

### § 2.3 Property `|G| ≤ 1` (used by spec-ref §6 invariant 2)

For all `u ∈ ℝ`, `G(u; mu, sigma) ∈ [-1, 1]`:

- The `max(0, …)` clamps the polynomial argument to `[0, 1]` (the
  inner `1 - (u-mu)^2/(9·sigma^2)` peaks at 1 when `u = mu` and
  decreases as `u` departs from `mu`; the clamp prevents negative
  arguments).
- `[0, 1]^4 ⊆ [0, 1]`.
- `2 · [0, 1] - 1 = [-1, 1]`.

So `G ∈ [-1, 1]` exactly; per-step Euler increment `dt · G` is
bounded by `dt`; combined with the `clip(0, 1)` step (which only
shrinks the per-cell change), the Lenia Quad4 forward satisfies
the spec-ref §6 invariant 2
`|A_{n+1}(x) - A_n(x)| ≤ dt` exactly.

## § 3 — Orbium unicaudatus preset

### § 3.1 Verbatim entry (Chakazul, grep-cited)

```json
{"code":"O2u","name":"Orbium unicaudatus","cname":"球虫(單尾)","params":{"R":13,"T":10,"b":"1","m":0.15,"s":0.015,"kn":1,"gn":1}, "cells":"..."}
```

Source: `references/Chakazul-Lenia/Python/animals.json:5`.

Parameter map:

- `R = 13` — Quad4 kernel radius (pixels). The kernel window is
  `(2R+1) × (2R+1) = 27 × 27`.
- `T = 10` — Lenia "time" parameter; the Euler step size is
  `dt = 1 / T = 0.1`.
- `b = "1"` — kernel band weight: a single weight 1 (no multi-band
  composition for Orbium). The Stage-1b implementation uses a
  single-band kernel with the Quad4 shape.
- `m = 0.15` (mu) — growth-function center.
- `s = 0.015` (sigma) — growth-function width.
- `kn = 1` — kernel shape selector: Quad4 polynomial.
- `gn = 1` — growth function selector: Quad4 polynomial growth.

### § 3.2 Stage-1b posture on the `cells` payload

The `"cells"` field is a CXRLE-encoded creature pattern (Chakazul's
own run-length encoding for cell positions). The Stage-1b
implementation **does not** decode the `cells` payload — RLE
creature-UX decoding is out of scope per
`docs/phases/phase-3-plan.md:1310-1312` § 6.3 OUT OF SCOPE. Instead,
Stage 1b seeds a deterministic Gaussian-blob IC keyed to the seed
parameter, which exercises the Quad4 + growth + Euler step at a
non-trivial spatial profile suitable for golden-trajectory
anchoring.

The `R`, `T`, `m`, `s`, `kn`, `gn` parameters from the Chakazul
preset ARE consumed by the Stage-1b implementation (per
`packages/lenia/lenia/sim.py` `LeniaConfig` defaults), so the
preset citation is load-bearing.

— Derivation ends —
