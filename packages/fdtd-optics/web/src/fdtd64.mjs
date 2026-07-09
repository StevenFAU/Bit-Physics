// fdtd-optics — pure-JS f64 Yee reference (no deps, Node + browser).
//
// Mirror of `packages/fdtd-optics/fdtd_optics/reference.py` (the normative
// gate prototype, docs/sim-specs/electromagnetics/fdtd-optics/spec-ref.md
// § 6.2). Used by:
//  (a) gen-verification.mjs — recompute the committed gate checkpoints and
//      golden-table values, HARD-FAIL on drift vs the Python f64 backend;
//  (b) the browser PROVE layer — live f64 matched-pair reference re-run;
//  (c) capture.ts — f64 diagnostics on the f32 GPU checkpoints.
//
// The per-step order below is the CONTRACT shared with the WGSL kernels and
// the Python backend — see the numbered comments; do not reorder.

export const GATE64 = {
  n: 128,
  sc: 0.5,
  ia: 24,
  ib: 104,
  ja: 24,
  jb: 104,
  na: 320,
  t0: 80.0,
  tau: 20.0,
  cx: 80,
  cy: 64,
  r: 18,
  epsCyl: 2.25,
  steps: 512,
  checkpoints: [128, 256, 384, 512],
};

/** Ricker wavelet (2nd derivative of a Gaussian), unit peak at t0. */
export function ricker(t, t0, tau) {
  const a = ((t - t0) / tau) ** 2;
  return (1.0 - 2.0 * a) * Math.exp(-a);
}

/** Gate-scene material: 1/eps_r per cell (vacuum + dielectric cylinder). */
export function makeGateCb(g = GATE64) {
  const cb = new Float64Array(g.n * g.n).fill(1.0);
  for (let i = 0; i < g.n; i++) {
    for (let j = 0; j < g.n; j++) {
      const dx = i - g.cx;
      const dy = j - g.cy;
      if (dx * dx + dy * dy <= g.r * g.r) cb[i * g.n + j] = 1.0 / g.epsCyl;
    }
  }
  return cb;
}

/**
 * f64 gate-scene run. Returns Map(step -> {ez, hx, hy}) at the checkpoints.
 * hx[i*n+j] is Hx at (i, j+1/2) valid j<n-1; hy[i*n+j] is Hy at (i+1/2, j)
 * valid i<n-1; the tail row/column stays exactly 0 (matches the .bin layout).
 *
 * `srcTrace` (Float64Array of length steps) is the COMMITTED Python-f64
 * Ricker signature (public/fdtd-gate-ricker-f64.bin). Passing it makes this
 * run BIT-EXACT against the committed reference — JS Math.exp and numpy exp
 * differ by 1 ULP (the engine-drift lesson; heat-equation's committed decay
 * table is the same rule). Omitting it falls back to the local ricker().
 *
 * @param {typeof GATE64} g
 * @param {((step: number, ez: Float64Array, hx: Float64Array, hy: Float64Array) => void) | null} onStep
 * @param {Float64Array | null} srcTrace
 */
export function runGate64(g = GATE64, onStep = null, srcTrace = null) {
  const { n, sc: s, ia, ib, ja, jb, na } = g;
  const ez = new Float64Array(n * n);
  const hx = new Float64Array(n * n);
  const hy = new Float64Array(n * n);
  const ezi = new Float64Array(na);
  const hyi = new Float64Array(na);
  const cb = makeGateCb(g);
  const caps = new Map();
  const want = new Set(g.checkpoints);
  for (let t = 0; t < g.steps; t++) {
    // 1. bulk H update
    for (let i = 0; i < n; i++) {
      const row = i * n;
      for (let j = 0; j < n - 1; j++) hx[row + j] -= s * (ez[row + j + 1] - ez[row + j]);
    }
    for (let i = 0; i < n - 1; i++) {
      const row = i * n;
      for (let j = 0; j < n; j++) hy[row + j] += s * (ez[row + n + j] - ez[row + j]);
    }
    // 2. TF/SF H corrections (ezi at time level n, before the aux advance)
    for (let j = ja; j <= jb; j++) {
      hy[(ia - 1) * n + j] -= s * ezi[ia];
      hy[ib * n + j] += s * ezi[ib];
    }
    for (let i = ia; i <= ib; i++) {
      hx[i * n + (ja - 1)] += s * ezi[i];
      hx[i * n + jb] -= s * ezi[i];
    }
    // 3./4. aux 1-D incident grid advance + HARD source at node 0
    for (let k = 0; k < na - 1; k++) hyi[k] += s * (ezi[k + 1] - ezi[k]);
    for (let k = na - 2; k >= 1; k--) ezi[k] += s * (hyi[k] - hyi[k - 1]);
    ezi[0] = srcTrace ? srcTrace[t] : ricker(t, g.t0, g.tau);
    // 5. E update (interior; PEC edges untouched)
    for (let i = 1; i < n - 1; i++) {
      const row = i * n;
      for (let j = 1; j < n - 1; j++) {
        const k = row + j;
        ez[k] += s * cb[k] * (hy[k] - hy[k - n] - hx[k] + hx[k - 1]);
      }
    }
    // 6. TF/SF E corrections (hyi at n+1/2; vacuum cb=1 at the box edge)
    for (let j = ja; j <= jb; j++) {
      ez[ia * n + j] -= s * hyi[ia - 1];
      ez[ib * n + j] += s * hyi[ib];
    }
    if (onStep) onStep(t + 1, ez, hx, hy);
    if (want.has(t + 1)) {
      caps.set(t + 1, { ez: ez.slice(), hx: hx.slice(), hy: hy.slice() });
    }
  }
  return caps;
}

/** max |a[k] - b[k]| over the full arrays (f64 accumulate). */
export function maxAbsDiff(a, b) {
  let m = 0;
  for (let k = 0; k < a.length; k++) {
    const d = Math.abs(a[k] - b[k]);
    if (d > m) m = d;
  }
  return m;
}

/** max |a[k]|. */
export function maxAbs(a) {
  let m = 0;
  for (let k = 0; k < a.length; k++) {
    const d = Math.abs(a[k]);
    if (d > m) m = d;
  }
  return m;
}

// ---------------------------------------------------------------------------
// Analytic closed forms (mirrors of fdtd_optics/goldens.py — the exact ones;
// the special-function tables (Mie, slab) are committed JSON, not recomputed
// here).

/** Fresnel power reflectance at normal incidence. */
export function fresnelNormalR(n1, n2) {
  return ((n1 - n2) / (n1 + n2)) ** 2;
}

/** Fresnel R_s, R_p at incidence angle thetaDeg (n1 -> n2). */
export function fresnelRsRp(thetaDeg, n1, n2) {
  const th = (thetaDeg * Math.PI) / 180;
  const st = (n1 / n2) * Math.sin(th);
  if (st >= 1) return { rs: 1, rp: 1 }; // TIR
  const ct = Math.cos(th);
  const ct2 = Math.sqrt(1 - st * st);
  const rs = ((n1 * ct - n2 * ct2) / (n1 * ct + n2 * ct2)) ** 2;
  const rp = ((n1 * ct2 - n2 * ct) / (n1 * ct2 + n2 * ct)) ** 2;
  return { rs, rp };
}

/** Phased-array steering angle (deg) for element spacing d (cells),
 * wavelength lambda (cells), per-element phase step dphi (radians). */
export function arraySteerDeg(dphi, lambda, d) {
  return (Math.asin((dphi * lambda) / (2 * Math.PI * d)) * 180) / Math.PI;
}

/** Numerical-dispersion master relation (uFDTD): given S_c, cells/wavelength
 * nLambda and propagation angle thetaDeg, solve for the ratio c_p/c. */
export function dispersionVpRatio(sc, nLambda, thetaDeg) {
  const th = (thetaDeg * Math.PI) / 180;
  // omega*dt = 2*pi*Sc/nLambda; lhs = [sin(omega*dt/2)/Sc]^2 with dt=Sc, dx=1
  const wdt = (2 * Math.PI * sc) / nLambda;
  const lhs = (Math.sin(wdt / 2) / sc) ** 2;
  const f = (k) =>
    Math.sin((k * Math.cos(th)) / 2) ** 2 + Math.sin((k * Math.sin(th)) / 2) ** 2 - lhs;
  // bisection on k in (0, pi]
  let lo = 1e-9;
  let hi = Math.PI;
  for (let it = 0; it < 200; it++) {
    const mid = 0.5 * (lo + hi);
    if (f(lo) * f(mid) <= 0) hi = mid;
    else lo = mid;
  }
  const k = 0.5 * (lo + hi);
  const kExact = (2 * Math.PI) / nLambda;
  return kExact / k; // c̃_p / c = omega/k̃ over omega/k_exact
}
