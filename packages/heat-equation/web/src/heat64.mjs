// heat64.mjs — pure-JS f64 twin of packages/heat-equation/heat_equation/
// (reference.py + spectral.py), used by BOTH the build-time data spine
// (gen-verification.mjs golden recomputes, HARD-FAIL) and the browser
// (gate IC construction, checkpoint diagnostics in f64). No dependencies.
//
// Grid convention matches the backend: nodes at x_i = i/N on [0,1), DFT
// sampling, indexing (x*N + y) row-major.

/** Pinned canonical IC: offset + three sin*sin modes (sim.py contract). */
export const CANONICAL_MODES = [
  [1, 1],
  [5, 3],
  [2, 7],
];
export const CANONICAL_AMPLITUDES = [0.5, 0.25, 0.125];
export const CANONICAL_OFFSET = 1.0;

/** Build the canonical IC in f64 (heat_equation.sim.make_canonical_ic). */
export function makeCanonicalIc(n) {
  const t = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let v = CANONICAL_OFFSET;
      for (let m = 0; m < CANONICAL_MODES.length; m++) {
        const [mx, my] = CANONICAL_MODES[m];
        v +=
          CANONICAL_AMPLITUDES[m] *
          Math.sin((2 * Math.PI * mx * i) / n) *
          Math.sin((2 * Math.PI * my * j) / n);
      }
      t[i * n + j] = v;
    }
  }
  return t;
}

/** Continuous Laplacian eigenvalue -(2*pi)^2*(m'^2+n'^2), fftfreq indexing. */
export function continuousEigenvalue(n, m, k) {
  const f = (a) => (a <= n / 2 ? a : a - n);
  return -((2 * Math.PI) ** 2) * (f(m) ** 2 + f(k) ** 2);
}

/** Discrete 5-point-stencil eigenvalue -(4/dx^2)*[sin^2(pi m/N)+sin^2(pi k/N)]. */
export function discreteEigenvalue(n, m, k) {
  const dx = 1 / n;
  return (
    (-4 / (dx * dx)) * (Math.sin((Math.PI * m) / n) ** 2 + Math.sin((Math.PI * k) / n) ** 2)
  );
}

/** Per-mode decay table exp(alpha*lambda_c*dt), f64, length n*n. */
export function decayTable(n, alpha, dt) {
  const out = new Float64Array(n * n);
  for (let m = 0; m < n; m++) {
    for (let k = 0; k < n; k++) {
      out[m * n + k] = Math.exp(alpha * continuousEigenvalue(n, m, k) * dt);
    }
  }
  return out;
}

/** One periodic FTCS step in f64 (reference.ftcs_step twin). */
export function ftcsStep(t, n, alpha, dt, source) {
  const out = new Float64Array(n * n);
  const r = alpha * dt * n * n; // r = alpha*dt/dx^2 with dx = 1/n
  for (let i = 0; i < n; i++) {
    const ip = (i + 1) % n;
    const im = (i + n - 1) % n;
    for (let j = 0; j < n; j++) {
      const jp = (j + 1) % n;
      const jm = (j + n - 1) % n;
      const c = t[i * n + j];
      let v =
        c +
        r * (t[ip * n + j] - 2 * c + t[im * n + j]) +
        r * (t[i * n + jp] - 2 * c + t[i * n + jm]);
      if (source) v += dt * source[i * n + j];
      out[i * n + j] = v;
    }
  }
  return out;
}

// --- radix-2 Stockham FFT, f64 (1D over rows/cols; 2D via two sweeps) -------

function fft1dBatch(re, im, n, stride, batchStride, batches, dir) {
  // Stockham autosort on scratch arrays (per-line gather keeps it simple; the
  // build spine and diagnostics run at N <= 256 so this is plenty fast).
  const sr = new Float64Array(n);
  const si = new Float64Array(n);
  const tr = new Float64Array(n);
  const ti = new Float64Array(n);
  for (let b = 0; b < batches; b++) {
    const base = b * batchStride;
    for (let e = 0; e < n; e++) {
      sr[e] = re[base + e * stride];
      si[e] = im[base + e * stride];
    }
    let inR = sr;
    let inI = si;
    let outR = tr;
    let outI = ti;
    for (let ls = 1; ls < n; ls <<= 1) {
      const l = ls << 1;
      const half = n >> 1;
      for (let t2 = 0; t2 < half; t2++) {
        const j = t2 % ls;
        const i2 = (t2 / ls) | 0;
        const ang = (dir * 2 * Math.PI * j) / l;
        const wr = Math.cos(ang);
        const wi = Math.sin(ang);
        const a = i2 * ls + j;
        const bIdx = a + half;
        const c = i2 * l + j;
        const d = c + ls;
        const xr = inR[bIdx] * wr - inI[bIdx] * wi;
        const xi = inR[bIdx] * wi + inI[bIdx] * wr;
        outR[c] = inR[a] + xr;
        outI[c] = inI[a] + xi;
        outR[d] = inR[a] - xr;
        outI[d] = inI[a] - xi;
      }
      const swR = inR;
      const swI = inI;
      inR = outR;
      inI = outI;
      outR = swR;
      outI = swI;
    }
    for (let e = 0; e < n; e++) {
      re[base + e * stride] = inR[e];
      im[base + e * stride] = inI[e];
    }
  }
}

/** In-place 2D FFT (dir=-1 forward, +1 inverse WITHOUT 1/N^2 normalization). */
export function fft2d(re, im, n, dir) {
  // axis 0 (rows vary): stride n, batch = each column start j, batchStride 1
  fft1dBatch(re, im, n, n, 1, n, dir);
  // axis 1 (cols vary): stride 1, batch = each row start i*n
  fft1dBatch(re, im, n, 1, n, n, dir);
}

/** One exact spectral step in f64: FFT -> per-mode decay -> IFFT (real out). */
export function spectralStep(t, n, decay) {
  const re = Float64Array.from(t);
  const im = new Float64Array(n * n);
  fft2d(re, im, n, -1);
  for (let i = 0; i < n * n; i++) {
    re[i] *= decay[i];
    im[i] *= decay[i];
  }
  fft2d(re, im, n, 1);
  const inv = 1 / (n * n);
  const out = new Float64Array(n * n);
  for (let i = 0; i < n * n; i++) out[i] = re[i] * inv;
  return out;
}

/** sum(T)*dx*dy (total heat). */
export function totalHeat(t, n) {
  let s = 0;
  for (let i = 0; i < t.length; i++) s += t[i];
  return s / (n * n);
}

/** sqrt(sum(T^2)*dx*dy). */
export function l2Norm(t, n) {
  let s = 0;
  for (let i = 0; i < t.length; i++) s += t[i] * t[i];
  return Math.sqrt(s / (n * n));
}

/** Amplitude of the sin(2 pi m x) sin(2 pi k y) mode (discrete orthogonality). */
export function sinsinAmplitude(t, n, m, k) {
  let s = 0;
  for (let i = 0; i < n; i++) {
    const sx = Math.sin((2 * Math.PI * m * i) / n);
    for (let j = 0; j < n; j++) {
      s += t[i * n + j] * sx * Math.sin((2 * Math.PI * k * j) / n);
    }
  }
  return (4 / (n * n)) * s;
}

/** Parseval relative error of the f64 FFT on field t (machine-exact gate). */
export function parsevalRelErr(t, n) {
  const re = Float64Array.from(t);
  const im = new Float64Array(n * n);
  let spatial = 0;
  for (let i = 0; i < t.length; i++) spatial += t[i] * t[i];
  fft2d(re, im, n, -1);
  let fourier = 0;
  for (let i = 0; i < re.length; i++) fourier += re[i] * re[i] + im[i] * im[i];
  return Math.abs(spatial - fourier / (n * n)) / spatial;
}
