// schrodinger-smoke — pure-JS f64 ISF kernel (no deps, Node + browser).
//
// A faithful JavaScript-double mirror of the committed f64 reference
// packages/schrodinger-smoke/schrodinger_smoke/reference/isf.py, used by
// (a) gen-verification.mjs to independently recompute the machine-exact
//     goldens at build time (HARD-FAIL on mismatch),
// (b) the browser app to build + settle scene ICs in f64 before the f32
//     upload (so the only IC divergence vs the backend is one f32 cast), and
// (c) the in-browser f64 readout of captured psi (edge phases -> velocity).
//
// Two-spectra rule (spec-ref § 3, golden E): free step = continuous Eq.-18
// eigenvalues; pressure projection = discrete Eq.-17 sin^2 eigenvalues.
// Layout: flat Float64Arrays, index (x*n + y)*n + z (matches the WGSL core).

export function idx(n, x, y, z) {
  return (x * n + y) * n + z;
}

// ---------------------------------------------------------------------------
// radix-2 Stockham C2C FFT (1D core + 3D wrapper), separate re/im arrays
// ---------------------------------------------------------------------------

function fft1dLines(re, im, n, stride, lineCount, lineStarts, sign) {
  const tre = new Float64Array(n);
  const tim = new Float64Array(n);
  const sre = new Float64Array(n);
  const sim = new Float64Array(n);
  for (let li = 0; li < lineCount; li++) {
    const base = lineStarts(li);
    for (let e = 0; e < n; e++) {
      sre[e] = re[base + e * stride];
      sim[e] = im[base + e * stride];
    }
    let a = { re: sre, im: sim };
    let b = { re: tre, im: tim };
    const half = n >> 1;
    for (let ls = 1; ls < n; ls <<= 1) {
      const l = ls << 1;
      for (let t = 0; t < half; t++) {
        const j = t % ls;
        const i = (t / ls) | 0;
        const ang = (sign * 2.0 * Math.PI * j) / l;
        const wr = Math.cos(ang);
        const wi = Math.sin(ang);
        const ia = i * ls + j;
        const ib = ia + half;
        const br = a.re[ib] * wr - a.im[ib] * wi;
        const bi = a.re[ib] * wi + a.im[ib] * wr;
        const ic = i * l + j;
        const id = ic + ls;
        b.re[ic] = a.re[ia] + br;
        b.im[ic] = a.im[ia] + bi;
        b.re[id] = a.re[ia] - br;
        b.im[id] = a.im[ia] - bi;
      }
      const sw = a;
      a = b;
      b = sw;
    }
    for (let e = 0; e < n; e++) {
      re[base + e * stride] = a.re[e];
      im[base + e * stride] = a.im[e];
    }
  }
}

/** In-place 3D C2C FFT. sign = -1 forward, +1 inverse (unscaled). */
export function fft3d(re, im, n, sign) {
  // axis 2 (z): stride 1, lines are (x,y)
  fft1dLines(re, im, n, 1, n * n, (li) => li * n, sign);
  // axis 1 (y): stride n, lines are (x,z)
  fft1dLines(re, im, n, n, n * n, (li) => ((li / n) | 0) * n * n + (li % n), sign);
  // axis 0 (x): stride n*n, lines are (y,z)
  fft1dLines(re, im, n, n * n, n * n, (li) => li, sign);
}

export function ifft3dScale(re, im, n) {
  const s = 1.0 / (n * n * n);
  for (let i = 0; i < re.length; i++) {
    re[i] *= s;
    im[i] *= s;
  }
}

// ---------------------------------------------------------------------------
// spectra (golden E)
// ---------------------------------------------------------------------------

function modeIndex(n, i) {
  return i <= n / 2 - 1 ? i : i - n; // fftfreq convention (signed)
}

/** Continuous eigenvalues lambda = -|k|^2, k = 2*pi*mode (unit box, Eq. 18). */
export function continuousEigenvalue(n, mx, my, mz) {
  const s = mx * mx + my * my + mz * mz;
  return -((2.0 * Math.PI) ** 2) * s;
}

/** Discrete sin^2 eigenvalues (Eq. 17), dx = 1/n. */
export function discreteEigenvalue(n, mx, my, mz) {
  const dx = 1.0 / n;
  const s =
    Math.sin((Math.PI * mx) / n) ** 2 +
    Math.sin((Math.PI * my) / n) ** 2 +
    Math.sin((Math.PI * mz) / n) ** 2;
  return (-4.0 / (dx * dx)) * s;
}

/**
 * f64 spectral multiplier tables for the f32 GPU core (web spec § 1: computed
 * in f64 with mod-2pi reduction — the CUDA-port trig-bound lesson — then cast
 * to f32 at upload). Both fold the 1/N^3 inverse-FFT scale.
 */
export function buildTables(n, hbar, dt) {
  const n3 = n * n * n;
  const free = new Float32Array(n3 * 2);
  const invLam = new Float32Array(n3);
  const scale = 1.0 / n3;
  for (let x = 0; x < n; x++) {
    for (let y = 0; y < n; y++) {
      for (let z = 0; z < n; z++) {
        const i = idx(n, x, y, z);
        const mx = modeIndex(n, x);
        const my = modeIndex(n, y);
        const mz = modeIndex(n, z);
        // free-step phase -(hbar*dt/2)*|k|^2 = +(hbar*dt/2)*lambda, f64 mod-2pi
        const ang = ((hbar * dt) / 2.0) * continuousEigenvalue(n, mx, my, mz);
        const wrapped = ang - 2.0 * Math.PI * Math.round(ang / (2.0 * Math.PI));
        free[i * 2] = Math.cos(wrapped) * scale;
        free[i * 2 + 1] = Math.sin(wrapped) * scale;
        const lam = discreteEigenvalue(n, x, y, z);
        invLam[i] = lam !== 0.0 ? (1.0 / lam) * scale : 0.0;
      }
    }
  }
  return { free, invLam };
}

// ---------------------------------------------------------------------------
// spinor state helpers — psi = {re1, im1, re2, im2} Float64Arrays
// ---------------------------------------------------------------------------

export function makePsi(n) {
  const n3 = n * n * n;
  return {
    n,
    re1: new Float64Array(n3),
    im1: new Float64Array(n3),
    re2: new Float64Array(n3),
    im2: new Float64Array(n3),
  };
}

export function normalize(psi) {
  const { re1, im1, re2, im2 } = psi;
  for (let i = 0; i < re1.length; i++) {
    const m = Math.sqrt(re1[i] ** 2 + im1[i] ** 2 + re2[i] ** 2 + im2[i] ** 2);
    const inv = 1.0 / m;
    re1[i] *= inv;
    im1[i] *= inv;
    re2[i] *= inv;
    im2[i] *= inv;
  }
}

/** Edge phases eta = arg<Psi_v, Psi_{v+e}> along the given axis (0/1/2). */
export function edgePhasesAxis(psi, axis) {
  const { n, re1, im1, re2, im2 } = psi;
  const out = new Float64Array(n * n * n);
  const step = axis === 0 ? n * n : axis === 1 ? n : 1;
  const dimStride = axis === 0 ? n * n * n : axis === 1 ? n * n : n;
  for (let i = 0; i < out.length; i++) {
    // periodic neighbor along axis
    const block = Math.floor(i / dimStride) * dimStride;
    const j = block + ((i - block + step) % dimStride);
    const re = re1[i] * re1[j] + im1[i] * im1[j] + re2[i] * re2[j] + im2[i] * im2[j];
    const im = re1[i] * im1[j] - im1[i] * re1[j] + re2[i] * im2[j] - im2[i] * re2[j];
    out[i] = Math.atan2(im, re);
  }
  return out;
}

export function divergence(psi) {
  const { n } = psi;
  const n3 = n * n * n;
  const div = new Float64Array(n3);
  const dx2 = (1.0 / n) ** 2;
  for (let axis = 0; axis < 3; axis++) {
    const eta = edgePhasesAxis(psi, axis);
    const step = axis === 0 ? n * n : axis === 1 ? n : 1;
    const dimStride = axis === 0 ? n3 : axis === 1 ? n * n : n;
    for (let i = 0; i < n3; i++) {
      const block = Math.floor(i / dimStride) * dimStride;
      const jm = block + ((i - block - step + dimStride) % dimStride);
      div[i] += eta[i] - eta[jm];
    }
  }
  for (let i = 0; i < n3; i++) div[i] /= dx2;
  return div;
}

/** FFT Poisson pressure projection with the DISCRETE Eq.-17 eigenvalues. */
export function pressureProject(psi) {
  const { n, re1, im1, re2, im2 } = psi;
  const dre = divergence(psi);
  const dim = new Float64Array(dre.length);
  fft3d(dre, dim, n, -1);
  for (let x = 0; x < n; x++) {
    for (let y = 0; y < n; y++) {
      for (let z = 0; z < n; z++) {
        const i = idx(n, x, y, z);
        const lam = discreteEigenvalue(n, x, y, z);
        if (lam !== 0.0) {
          dre[i] /= lam;
          dim[i] /= lam;
        } else {
          dre[i] = 0.0;
          dim[i] = 0.0;
        }
      }
    }
  }
  fft3d(dre, dim, n, 1);
  ifft3dScale(dre, dim, n);
  for (let i = 0; i < re1.length; i++) {
    const c = Math.cos(dre[i]);
    const s = -Math.sin(dre[i]);
    const r1 = re1[i] * c - im1[i] * s;
    const i1 = re1[i] * s + im1[i] * c;
    const r2 = re2[i] * c - im2[i] * s;
    const i2 = re2[i] * s + im2[i] * c;
    re1[i] = r1;
    im1[i] = i1;
    re2[i] = r2;
    im2[i] = i2;
  }
}

/** Free step in f64 (used by the build-time golden recompute only). */
export function freeStep(psi, hbar, dt) {
  const { n } = psi;
  for (const [re, im] of [
    [psi.re1, psi.im1],
    [psi.re2, psi.im2],
  ]) {
    fft3d(re, im, n, -1);
    for (let x = 0; x < n; x++) {
      for (let y = 0; y < n; y++) {
        for (let z = 0; z < n; z++) {
          const i = idx(n, x, y, z);
          const lam = continuousEigenvalue(
            n,
            modeIndex(n, x),
            modeIndex(n, y),
            modeIndex(n, z),
          );
          const ang = ((hbar * dt) / 2.0) * lam;
          const c = Math.cos(ang);
          const s = Math.sin(ang);
          const r = re[i] * c - im[i] * s;
          im[i] = re[i] * s + im[i] * c;
          re[i] = r;
        }
      }
    }
    fft3d(re, im, n, 1);
    ifft3dScale(re, im, n);
  }
}

// ---------------------------------------------------------------------------
// scene ICs (paper § 3.1 slab imprint; TRTX polynomial knots)
// ---------------------------------------------------------------------------

/** Multiply the paper's slab phase imprint for one ring into thetaAcc. */
export function ringTheta(thetaAcc, n, center, radius, thickness, normal) {
  const nl = Math.hypot(normal[0], normal[1], normal[2]);
  const nx = normal[0] / nl;
  const ny = normal[1] / nl;
  const nz = normal[2] / nl;
  for (let x = 0; x < n; x++) {
    for (let y = 0; y < n; y++) {
      for (let z = 0; z < n; z++) {
        const rx = x / n - center[0];
        const ry = y / n - center[1];
        const rz = z / n - center[2];
        const d = rx * nx + ry * ny + rz * nz;
        const px = rx - d * nx;
        const py = ry - d * ny;
        const pz = rz - d * nz;
        const rho2 = px * px + py * py + pz * pz;
        if (Math.abs(d) < thickness && rho2 < radius * radius) {
          thetaAcc[idx(n, x, y, z)] += Math.PI * (1.0 + d / thickness);
        }
      }
    }
  }
}

export function psiFromTheta(n, theta, eps = 0.01) {
  const psi = makePsi(n);
  for (let i = 0; i < theta.length; i++) {
    psi.re1[i] = Math.cos(theta[i]);
    psi.im1[i] = Math.sin(theta[i]);
    psi.re2[i] = eps;
  }
  return psi;
}

/** TRTX polynomial knot: psi1 = sum c * z1^a * z2^b on the inverse-stereographic S^3. */
export function knotPsi(n, polynomial, scale = 4.0, center = [0.5, 0.5, 0.5], eps = 0.01) {
  const psi = makePsi(n);
  for (let x = 0; x < n; x++) {
    for (let y = 0; y < n; y++) {
      for (let z = 0; z < n; z++) {
        const gx = scale * (x / n - center[0]);
        const gy = scale * (y / n - center[1]);
        const gz = scale * (z / n - center[2]);
        const r2 = gx * gx + gy * gy + gz * gz;
        const inv = 1.0 / (r2 + 1.0);
        const z1r = 2.0 * gx * inv;
        const z1i = 2.0 * gy * inv;
        const z2r = (r2 - 1.0) * inv;
        const z2i = 2.0 * gz * inv;
        let pr = 0.0;
        let pi = 0.0;
        for (const [cr, ci, a, b] of polynomial) {
          // z1^a * z2^b
          let tr = 1.0;
          let ti = 0.0;
          for (let k = 0; k < a; k++) {
            const nr = tr * z1r - ti * z1i;
            ti = tr * z1i + ti * z1r;
            tr = nr;
          }
          for (let k = 0; k < b; k++) {
            const nr = tr * z2r - ti * z2i;
            ti = tr * z2i + ti * z2r;
            tr = nr;
          }
          pr += cr * tr - ci * ti;
          pi += cr * ti + ci * tr;
        }
        const i = idx(n, x, y, z);
        psi.re1[i] = pr;
        psi.im1[i] = pi;
        psi.re2[i] = eps;
      }
    }
  }
  return psi;
}

/** Normalize + fixed settling projections (paper § 3.2; 8 = backend default). */
export function settle(psi, iterations = 8) {
  normalize(psi);
  for (let k = 0; k < iterations; k++) pressureProject(psi);
}

// ---------------------------------------------------------------------------
// readouts (f64 — used for the browser capture so the readout code path
// matches the backend's velocity_cell_centered)
// ---------------------------------------------------------------------------

/** Cell-centred velocities (average of the two incident MAC faces per axis). */
export function velocityCellCentered(psi, hbar) {
  const { n } = psi;
  const n3 = n * n * n;
  const dx = 1.0 / n;
  const out = [new Float64Array(n3), new Float64Array(n3), new Float64Array(n3)];
  for (let axis = 0; axis < 3; axis++) {
    const eta = edgePhasesAxis(psi, axis);
    const step = axis === 0 ? n * n : axis === 1 ? n : 1;
    const dimStride = axis === 0 ? n3 : axis === 1 ? n * n : n;
    for (let i = 0; i < n3; i++) {
      const block = Math.floor(i / dimStride) * dimStride;
      const jm = block + ((i - block - step + dimStride) % dimStride);
      out[axis][i] = (0.5 * hbar * (eta[i] + eta[jm])) / dx;
    }
  }
  return out;
}

export function normL2(psi) {
  const { re1, im1, re2, im2 } = psi;
  let s = 0.0;
  for (let i = 0; i < re1.length; i++) {
    s += re1[i] ** 2 + im1[i] ** 2 + re2[i] ** 2 + im2[i] ** 2;
  }
  return s;
}

/** Analytic free Gaussian packet (component 1), heat kernel at i*hbar/2. */
export function gaussianPacket(n, t, hbar, sigma0, center = 0.5) {
  const psi = makePsi(n);
  const a = sigma0 * sigma0;
  // a_t = a + i*hbar*t/2 ; pref = (a/a_t)^{3/2}
  const atr = a;
  const ati = 0.5 * hbar * t;
  const den = atr * atr + ati * ati;
  // sqrt(a/a_t): complex sqrt of (a*atr/den, -a*ati/den)
  const qr = (a * atr) / den;
  const qi = (-a * ati) / den;
  const mod = Math.hypot(qr, qi);
  const arg = Math.atan2(qi, qr);
  const sr = Math.sqrt(mod) * Math.cos(arg / 2);
  const si = Math.sqrt(mod) * Math.sin(arg / 2);
  // pref = (sr + i*si)^3
  const p2r = sr * sr - si * si;
  const p2i = 2 * sr * si;
  const pr = p2r * sr - p2i * si;
  const pi_ = p2r * si + p2i * sr;
  for (let x = 0; x < n; x++) {
    for (let y = 0; y < n; y++) {
      for (let z = 0; z < n; z++) {
        const r2 =
          (x / n - center) ** 2 + (y / n - center) ** 2 + (z / n - center) ** 2;
        // exp(-r2/(4*a_t)) = exp(-r2*conj(a_t)/(4*den))
        const er = (-r2 * atr) / (4 * den);
        const ei = (r2 * ati) / (4 * den);
        const em = Math.exp(er);
        const cr = em * Math.cos(ei);
        const ci = em * Math.sin(ei);
        const i = idx(n, x, y, z);
        psi.re1[i] = pr * cr - pi_ * ci;
        psi.im1[i] = pr * ci + pi_ * cr;
      }
    }
  }
  return psi;
}

/** Spherical-Clebsch TG lift (golden C fixture; landed clebsch-pfm port). */
export function taylorGreenWave2d(n, hbar) {
  const psi = makePsi(n);
  const k = 2.0 * Math.PI;
  for (let x = 0; x < n; x++) {
    for (let y = 0; y < n; y++) {
      const zc = -Math.cos((k * x) / n);
      const theta = (4.0 * (-Math.cos((k * y) / n) / k)) / hbar;
      const alpha = Math.acos(Math.max(-1, Math.min(1, zc)));
      const ca = Math.cos(alpha / 2);
      const sa = Math.sin(alpha / 2);
      const ch = Math.cos(theta / 2);
      const sh = Math.sin(theta / 2);
      for (let z = 0; z < n; z++) {
        const i = idx(n, x, y, z);
        psi.re1[i] = ca * ch;
        psi.im1[i] = ca * sh;
        psi.re2[i] = sa * ch;
        psi.im2[i] = -sa * sh;
      }
    }
  }
  return psi;
}

/** Pack an f64 spinor into the GPU's interleaved f32 vec4 layout. */
export function packF32(psi) {
  const n3 = psi.re1.length;
  const out = new Float32Array(n3 * 4);
  for (let i = 0; i < n3; i++) {
    out[i * 4] = psi.re1[i];
    out[i * 4 + 1] = psi.im1[i];
    out[i * 4 + 2] = psi.re2[i];
    out[i * 4 + 3] = psi.im2[i];
  }
  return out;
}

/** Unpack GPU f32 vec4 layout into an f64 spinor (for the f64 readout). */
export function unpackF32(data, n) {
  const psi = makePsi(n);
  const n3 = n * n * n;
  for (let i = 0; i < n3; i++) {
    psi.re1[i] = data[i * 4];
    psi.im1[i] = data[i * 4 + 1];
    psi.re2[i] = data[i * 4 + 2];
    psi.im2[i] = data[i * 4 + 3];
  }
  return psi;
}
