// signal-workbench — pure-JS f64 backend twin (Node-compatible: also the
// gen-verification.mjs data-spine engine). Mirrors
// packages/signal-workbench/signal_workbench/{windows,synthesis,reference}.py.
//
// JS numbers ARE f64, so this module is the browser-side analytic source of
// truth: signals are synthesized here in f64 and cast once to f32 for the
// GPU (the committed-buffer plan, spec-ref § 5.2 — no f32 trig-argument-
// reduction term on the gated path).

export const WINDOW_COEFFS = {
  rectangular: [1.0],
  hann: [0.5, 0.5],
  hamming: [0.54, 0.46],
  blackman: [0.42, 0.5, 0.08],
  blackmanharris3: [0.42323, 0.49755, 0.07922],
  blackmanharris4: [0.35875, 0.48829, 0.14128, 0.01168],
  nuttall4b: [0.355768, 0.487396, 0.144232, 0.012604],
  nuttall4c: [0.3635819, 0.4891775, 0.1365995, 0.0106411],
};

/** Periodic (DFT-even) sum-of-cosine window taps, f64. */
export function windowTaps(name, n) {
  const coeffs = WINDOW_COEFFS[name];
  if (!coeffs) throw new Error(`unknown window ${name}`);
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let v = 0;
    for (let k = 0; k < coeffs.length; k++) {
      v += (k % 2 === 0 ? 1 : -1) * coeffs[k] * Math.cos((2 * Math.PI * k * i) / n);
    }
    w[i] = v;
  }
  return w;
}

export function windowSum(name, n) {
  const w = windowTaps(name, n);
  let s = 0;
  for (let i = 0; i < n; i++) s += w[i];
  return s;
}

/** Bessel J_n(x) for n = 0..nMax via Miller downward recurrence (~1e-13). */
export function besselJArray(x, nMax) {
  if (x === 0) {
    const out = new Float64Array(nMax + 1);
    out[0] = 1;
    return out;
  }
  const start = 2 * Math.ceil((nMax + Math.ceil(Math.sqrt(40 * Math.abs(x))) + 16) / 2);
  let jp = 0; // J_{k+1}
  let jc = 1e-30; // J_k
  const out = new Float64Array(nMax + 1);
  let norm = 0;
  for (let k = start; k >= 1; k--) {
    const jm = ((2 * k) / x) * jc - jp;
    jp = jc;
    jc = jm;
    if (k - 1 <= nMax) out[k - 1] = jc;
    if ((k - 1) % 2 === 0 && k - 1 > 0) norm += 2 * jc;
    if (Math.abs(jc) > 1e250) {
      jc *= 1e-250;
      jp *= 1e-250;
      norm *= 1e-250;
      for (let m = k - 1; m <= nMax; m++) out[m] *= 1e-250;
    }
  }
  norm += out[0];
  for (let m = 0; m <= nMax; m++) out[m] /= norm;
  return out;
}

/** Signed J_n with the reflection J_{-n} = (-1)^n J_n. */
export function besselJ(order, x, table) {
  const n = Math.abs(order);
  const j = table ? table[n] : besselJArray(x, n)[n];
  return order < 0 && n % 2 === 1 ? -j : j;
}

/** Chowning FM frame in f64: A sin(2 pi kc i/N + I sin(2 pi km i/N)). */
export function fmSignal(n, kc, km, index, amplitude) {
  const x = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    x[i] =
      amplitude *
      Math.sin((2 * Math.PI * kc * i) / n + index * Math.sin((2 * Math.PI * km * i) / n));
  }
  return x;
}

export function sineSignal(n, fBins, amplitude, phase) {
  const x = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    x[i] = amplitude * Math.sin((2 * Math.PI * fBins * i) / n + phase);
  }
  return x;
}

/** Exact folded per-bin sine-amplitude array for coherent FM (spec § 4.4). */
export function fmLineBins(n, kc, km, index, amplitude) {
  const half = n >> 1;
  const amps = new Float64Array(half + 1);
  let nMax = Math.max(8, Math.ceil(index) + 8);
  const table = besselJArray(index, nMax + 64);
  while (nMax < 512 && Math.abs(table[Math.min(nMax, table.length - 1)]) >= 1e-18) nMax += 4;
  for (let order = -nMax; order <= nMax; order++) {
    let a = amplitude * besselJ(order, index, table);
    let k = kc + order * km;
    let kMod = ((k % n) + n) % n;
    if (kMod > half) {
      kMod = n - kMod;
      a = -a;
    }
    if (kMod === 0 || kMod === half) continue;
    amps[kMod] += a;
  }
  return amps;
}

/** |X[k]| of the coherent FM frame for k = 0..N/2 (rect window): N/2 * |amp|. */
export function fmExpectedMag(n, kc, km, index, amplitude) {
  const amps = fmLineBins(n, kc, km, index, amplitude);
  const mag = new Float64Array(amps.length);
  for (let k = 0; k < amps.length; k++) mag[k] = (Math.abs(amps[k]) * n) / 2;
  return mag;
}

/** Causal Dirichlet kernel D_N(w) as [re, im]. */
function dirichlet(omega, n) {
  const den = Math.sin(omega / 2);
  let ratio;
  if (Math.abs(den) < 1e-12) {
    ratio = (n * Math.cos((n * omega) / 2)) / Math.cos(omega / 2);
  } else {
    ratio = Math.sin((n * omega) / 2) / den;
  }
  const ph = (-omega * (n - 1)) / 2;
  return [ratio * Math.cos(ph), ratio * Math.sin(ph)];
}

/** Window DTFT W(w) via the exact shifted-Dirichlet closed form. */
export function windowDtft(name, n, omega) {
  const coeffs = WINDOW_COEFFS[name];
  let re = 0;
  let im = 0;
  const d0 = dirichlet(omega, n);
  re += coeffs[0] * d0[0];
  im += coeffs[0] * d0[1];
  for (let k = 1; k < coeffs.length; k++) {
    const s = (2 * Math.PI * k) / n;
    const dm = dirichlet(omega - s, n);
    const dp = dirichlet(omega + s, n);
    const sign = k % 2 === 0 ? 1 : -1;
    re += ((sign * coeffs[k]) / 2) * (dm[0] + dp[0]);
    im += ((sign * coeffs[k]) / 2) * (dm[1] + dp[1]);
  }
  return [re, im];
}

/** Exact windowed-tone DFT X[k] (the leakage golden, spec § 3.2):
 * X[k] = A/(2j) [e^{+j phase} W(wk - w0) - e^{-j phase} W(wk + w0)]. */
export function toneWindowedDft(name, n, f0Bins, amplitude, phase) {
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  const w0 = (2 * Math.PI * f0Bins) / n;
  const cp = Math.cos(phase);
  const sp = Math.sin(phase);
  for (let k = 0; k < n; k++) {
    const wk = (2 * Math.PI * k) / n;
    const [mr, mi] = windowDtft(name, n, wk - w0);
    const [pr, pi] = windowDtft(name, n, wk + w0);
    // e^{+j phase} W_minus - e^{-j phase} W_plus
    const tr = cp * mr - sp * mi - (cp * pr + sp * pi);
    const ti = cp * mi + sp * mr - (cp * pi - sp * pr);
    // multiply by A/(2j): (tr + j ti)/(2j) * A = (ti - j tr) * A/2
    re[k] = (amplitude / 2) * ti;
    im[k] = (-amplitude / 2) * tr;
  }
  return { re, im };
}

export function toneWindowedMagHalf(name, n, f0Bins, amplitude, phase) {
  const { re, im } = toneWindowedDft(name, n, f0Bins, amplitude, phase);
  const half = n >> 1;
  const mag = new Float64Array(half + 1);
  for (let k = 0; k <= half; k++) mag[k] = Math.hypot(re[k], im[k]);
  return mag;
}

export function additiveHarmonics(kind, nHarm) {
  const amps = new Float64Array(nHarm);
  for (let k = 1; k <= nHarm; k++) {
    if (kind === "saw") amps[k - 1] = ((k % 2 === 1 ? 1 : -1) * 2) / (Math.PI * k);
    else if (kind === "square" && k % 2 === 1) amps[k - 1] = 4 / (Math.PI * k);
    else if (kind === "triangle" && k % 2 === 1) {
      amps[k - 1] =
        (((k - 1) / 2) % 2 === 0 ? 1 : -1) * (8 / (Math.PI * Math.PI * k * k));
    }
  }
  return amps;
}

/** Additive truncated-Fourier saw/square/triangle (bandlimited by construction). */
export function additiveSignal(n, f0Bins, kind, nHarm) {
  const amps = additiveHarmonics(kind, nHarm);
  const x = new Float64Array(n);
  for (let k = 1; k <= nHarm; k++) {
    const a = amps[k - 1];
    if (a === 0) continue;
    for (let i = 0; i < n; i++) x[i] += a * Math.sin((2 * Math.PI * k * f0Bins * i) / n);
  }
  return x;
}

export function naiveSaw(n, f0Bins) {
  const x = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = (f0Bins * i) / n;
    x[i] = 2 * (t - Math.floor(t)) - 1;
  }
  return x;
}

export function chirpSignal(n, f0Bins, f1Bins) {
  const x = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const phase = (2 * Math.PI * (f0Bins * i + (0.5 * (f1Bins - f0Bins) * i * i) / n)) / n;
    x[i] = Math.sin(phase);
  }
  return x;
}

/** Golden magnitude for an on-bin additive frame: lines at k*f0 (folded). */
export function additiveExpectedMag(n, f0Bins, kind, nHarm) {
  const half = n >> 1;
  const amps = additiveHarmonics(kind, nHarm);
  const mag = new Float64Array(half + 1);
  for (let k = 1; k <= nHarm; k++) {
    const a = amps[k - 1];
    if (a === 0) continue;
    let bin = Math.round(k * f0Bins) % n;
    if (bin > half) bin = n - bin;
    if (bin === 0 || bin === half) continue;
    mag[bin] += (Math.abs(a) * n) / 2;
  }
  return mag;
}

/** Rayleigh/Parseval relative residual from a time frame + complex spectrum. */
export function parsevalResidual(x, specRe, specIm) {
  const n = x.length;
  let et = 0;
  for (let i = 0; i < n; i++) et += x[i] * x[i];
  let ef = 0;
  for (let k = 0; k < n; k++) ef += specRe[k] * specRe[k] + specIm[k] * specIm[k];
  ef /= n;
  return Math.abs(et - ef) / Math.max(et, 1e-300);
}
