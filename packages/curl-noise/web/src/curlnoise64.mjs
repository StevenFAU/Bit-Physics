// curl-noise — pure-JS f64 mirror of the backend reference
// (packages/curl-noise/curl_noise/reference/noise.py + fields.py +
// boundary.py). Same formulas, same committed constants, same exact-integer
// hash/selection — JS doubles ARE IEEE f64, so machine-exact identities
// recompute here bit-comparably with the committed golden tables.
// Used by gen-verification.mjs (build-time HARD-FAIL recompute) and by the
// in-browser f64 spot-instruments. No dependencies.

export const SCALE = 22.0;
const TAYLOR_A = 1.79284291400159;
const TAYLOR_B = 0.85373472095314;

export const CHANNEL_OFFSETS = [
  [0.0, 0.0, 0.0],
  [31.416, -47.853, 12.793],
  [-233.19, 108.44, 71.98],
];
export const OCTAVE_DRIFTS = [
  [0.31, 0.17, -0.23],
  [-0.19, 0.29, 0.11],
  [0.13, -0.27, 0.31],
  [-0.29, -0.13, 0.19],
  [0.23, 0.31, -0.17],
  [0.11, -0.19, -0.29],
];
const SEED_STRIDE = [127.1, 311.7, 74.7];

function permuteInt(x) {
  return ((34 * x + 10) * x) % 289;
}
function mod289(x) {
  return ((x % 289) + 289) % 289;
}
function gradFromHash(h) {
  const j = h % 49;
  const xp = Math.floor(j / 7);
  const yp = j % 7;
  const ax = 4 * xp - 13;
  const ay = 4 * yp - 13;
  const ghn = 14 - Math.abs(ax) - Math.abs(ay);
  const sx = ax < 0 ? -1 : 1;
  const sy = ay < 0 ? -1 : 1;
  const interior = ghn > 0;
  const pxn = interior ? ax : ax - 14 * sx;
  const pyn = interior ? ay : ay - 14 * sy;
  return [pxn / 14, pyn / 14, ghn / 14];
}

/** value + gradient + symmetric Hessian (flattened row-major 9) at [x,y,z]. */
export function snoiseD2(v) {
  const cX = 1 / 6;
  const cY = 1 / 3;
  const s = (v[0] + v[1] + v[2]) * cY;
  const i = [Math.floor(v[0] + s), Math.floor(v[1] + s), Math.floor(v[2] + s)];
  const t = (i[0] + i[1] + i[2]) * cX;
  const x0 = [v[0] - i[0] + t, v[1] - i[1] + t, v[2] - i[2] + t];

  const g = [x0[0] >= x0[1] ? 1 : 0, x0[1] >= x0[2] ? 1 : 0, x0[2] >= x0[0] ? 1 : 0];
  const l = [1 - g[0], 1 - g[1], 1 - g[2]];
  const lzxy = [l[2], l[0], l[1]];
  const i1 = [Math.min(g[0], lzxy[0]), Math.min(g[1], lzxy[1]), Math.min(g[2], lzxy[2])];
  const i2 = [Math.max(g[0], lzxy[0]), Math.max(g[1], lzxy[1]), Math.max(g[2], lzxy[2])];

  const corners = [
    x0,
    [x0[0] - i1[0] + cX, x0[1] - i1[1] + cX, x0[2] - i1[2] + cX],
    [x0[0] - i2[0] + 2 * cX, x0[1] - i2[1] + 2 * cX, x0[2] - i2[2] + 2 * cX],
    [x0[0] - 0.5, x0[1] - 0.5, x0[2] - 0.5],
  ];

  const ii = [mod289(i[0]), mod289(i[1]), mod289(i[2])];
  const cz = [0, i1[2], i2[2], 1];
  const cy = [0, i1[1], i2[1], 1];
  const cx = [0, i1[0], i2[0], 1];
  const hash = [];
  for (let k = 0; k < 4; k++) {
    hash.push(permuteInt(permuteInt(permuteInt(ii[2] + cz[k]) + ii[1] + cy[k]) + ii[0] + cx[k]));
  }

  let val = 0;
  const grad = [0, 0, 0];
  const hess = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let k = 0; k < 4; k++) {
    let p = gradFromHash(hash[k]);
    const x = corners[k];
    const norm = TAYLOR_A - TAYLOR_B * (p[0] * p[0] + p[1] * p[1] + p[2] * p[2]);
    p = [p[0] * norm, p[1] * norm, p[2] * norm];
    const r2 = x[0] * x[0] + x[1] * x[1] + x[2] * x[2];
    const m = Math.max(0.5 - r2, 0);
    const m2 = m * m;
    const m3 = m2 * m;
    const m4 = m2 * m2;
    const pdx = p[0] * x[0] + p[1] * x[1] + p[2] * x[2];
    val += m4 * pdx;
    for (let a = 0; a < 3; a++) {
      grad[a] += -8 * m3 * pdx * x[a] + m4 * p[a];
      for (let b = 0; b < 3; b++) {
        hess[a * 3 + b] +=
          48 * m2 * pdx * x[a] * x[b] -
          8 * m3 * (x[a] * p[b] + p[a] * x[b]) -
          (a === b ? 8 * m3 * pdx : 0);
      }
    }
  }
  return {
    val: SCALE * val,
    grad: grad.map((x) => SCALE * x),
    hess: hess.map((x) => SCALE * x),
  };
}

/** FBM channel: value + gradient + Hessian, mirrors fields.fbm_grad_hess. */
export function fbmD2(x, cfg, channel) {
  const off = CHANNEL_OFFSETS[channel].map(
    (o, k) => o + SEED_STRIDE[k] * (cfg.seed ?? 0),
  );
  const time = cfg.time ?? 0;
  let val = 0;
  const grad = [0, 0, 0];
  const hess = new Array(9).fill(0);
  let amp = 1.0;
  let ell = cfg.ell0;
  for (let o = 0; o < cfg.octaves; o++) {
    const d = OCTAVE_DRIFTS[o % OCTAVE_DRIFTS.length];
    const p = [
      (x[0] + off[0] + time * d[0]) / ell,
      (x[1] + off[1] + time * d[1]) / ell,
      (x[2] + off[2] + time * d[2]) / ell,
    ];
    const n = snoiseD2(p);
    val += amp * n.val;
    for (let k = 0; k < 3; k++) grad[k] += (amp / ell) * n.grad[k];
    for (let k = 0; k < 9; k++) hess[k] += (amp / (ell * ell)) * n.hess[k];
    amp *= cfg.gain;
    ell /= cfg.lacunarity;
  }
  return { val, grad, hess };
}

function rampq(r) {
  const rc = Math.min(Math.max(r, 0), 1);
  return (15 / 8) * rc - (10 / 8) * rc ** 3 + (3 / 8) * rc ** 5;
}
function rampqD1(r) {
  if (r < 0 || r > 1) return 0;
  return 15 / 8 - (30 / 8) * r * r + (15 / 8) * r ** 4;
}

/** Obstacle-aware potentials (values + gradients) — boundary.py mirror. */
export function potentials(x, cfg) {
  const n1 = fbmD2(x, cfg, 0);
  const n2 = fbmD2(x, cfg, 1);
  if (!cfg.obstacleCenter) {
    return { f1: n1.val, g1: n1.grad, f2: n2.val, g2: n2.grad };
  }
  const rel = [
    x[0] - cfg.obstacleCenter[0],
    x[1] - cfg.obstacleCenter[1],
    x[2] - cfg.obstacleCenter[2],
  ];
  const dist = Math.max(Math.hypot(...rel), 1e-300);
  const nh = rel.map((r) => r / dist);
  const d = dist - cfg.obstacleRadius;
  const u = d / cfg.obstacleRampWidth;
  const r0 = rampq(u);
  const r1 = rampqD1(u) / cfg.obstacleRampWidth;
  const amp = cfg.obstacleNoiseAmp;
  const f1 = d + amp * r0 * n1.val;
  const g1 = [0, 1, 2].map(
    (k) => nh[k] + amp * (r1 * n1.val * nh[k] + r0 * n1.grad[k]),
  );
  return { f1, g1, f2: n2.val, g2: n2.grad };
}

export function crossprodVelocity(x, cfg) {
  const p = potentials(x, cfg);
  const a = cfg.amplitude ?? 1;
  return [
    a * (p.g1[1] * p.g2[2] - p.g1[2] * p.g2[1]),
    a * (p.g1[2] * p.g2[0] - p.g1[0] * p.g2[2]),
    a * (p.g1[0] * p.g2[1] - p.g1[1] * p.g2[0]),
  ];
}

export function isoValues(x, cfg) {
  const p = potentials(x, cfg);
  return [p.f1, p.f2];
}

/** Open-field cross-product Jacobian-trace divergence (golden C identity). */
export function traceDivOpen(x, cfg) {
  const n1 = fbmD2(x, cfg, 0);
  const n2 = fbmD2(x, cfg, 1);
  const H1 = n1.hess;
  const H2 = n2.hess;
  const g1 = n1.grad;
  const g2 = n2.grad;
  // columns of J: d_c v = (H1 col c) x g2 + g1 x (H2 col c); trace = sum diag
  let tr = 0;
  for (let c = 0; c < 3; c++) {
    const h1c = [H1[0 * 3 + c], H1[1 * 3 + c], H1[2 * 3 + c]];
    const h2c = [H2[0 * 3 + c], H2[1 * 3 + c], H2[2 * 3 + c]];
    const t1 = [
      h1c[1] * g2[2] - h1c[2] * g2[1],
      h1c[2] * g2[0] - h1c[0] * g2[2],
      h1c[0] * g2[1] - h1c[1] * g2[0],
    ];
    const t2 = [
      g1[1] * h2c[2] - g1[2] * h2c[1],
      g1[2] * h2c[0] - g1[0] * h2c[2],
      g1[0] * h2c[1] - g1[1] * h2c[0],
    ];
    tr += t1[c] + t2[c];
  }
  return tr * (cfg.amplitude ?? 1);
}

/** Confinement + Clebsch identities at a point (golden F, corrected). */
export function confinement(x, cfg) {
  const p = potentials(x, cfg);
  const a = cfg.amplitude ?? 1;
  const v = [
    a * (p.g1[1] * p.g2[2] - p.g1[2] * p.g2[1]),
    a * (p.g1[2] * p.g2[0] - p.g1[0] * p.g2[2]),
    a * (p.g1[0] * p.g2[1] - p.g1[1] * p.g2[0]),
  ];
  const dot = (u, w) => u[0] * w[0] + u[1] * w[1] + u[2] * w[2];
  return {
    conf1: dot(v, p.g1),
    conf2: dot(v, p.g2),
    clebsch: dot(p.g2.map((g) => p.f1 * g), v),
    speed: Math.hypot(...v),
  };
}

// --- matched staggered curl/div (discrete.py mirror, 2D) --------------------
export function matchedDiv2dNormalized(psi, n, dx) {
  // psi: (n+1)*(n+1) row-major; returns max |div| / flux scale
  const u = [];
  const w = [];
  let fluxMax = 0;
  for (let ix = 0; ix <= n; ix++) {
    for (let iy = 0; iy < n; iy++) {
      const val = (psi[ix * (n + 1) + iy + 1] - psi[ix * (n + 1) + iy]) / dx;
      u.push(val);
      fluxMax = Math.max(fluxMax, Math.abs(val) / dx);
    }
  }
  for (let ix = 0; ix < n; ix++) {
    for (let iy = 0; iy <= n; iy++) {
      const val = -(psi[(ix + 1) * (n + 1) + iy] - psi[ix * (n + 1) + iy]) / dx;
      w.push(val);
      fluxMax = Math.max(fluxMax, Math.abs(val) / dx);
    }
  }
  let dmax = 0;
  for (let ix = 0; ix < n; ix++) {
    for (let iy = 0; iy < n; iy++) {
      const div =
        (u[(ix + 1) * n + iy] - u[ix * n + iy]) / dx +
        (w[ix * (n + 1) + iy + 1] - w[ix * (n + 1) + iy]) / dx;
      dmax = Math.max(dmax, Math.abs(div));
    }
  }
  return dmax / fluxMax;
}

// --- ABC flow (fields.py mirror) --------------------------------------------
export function abcFlow(x, A = 1, B = 1, C = 1) {
  return [
    A * Math.sin(x[2]) + C * Math.cos(x[1]),
    B * Math.sin(x[0]) + A * Math.cos(x[2]),
    C * Math.sin(x[1]) + B * Math.cos(x[0]),
  ];
}
export function abcCurl(x, A = 1, B = 1, C = 1) {
  return [
    C * Math.cos(x[1]) + A * Math.sin(x[2]),
    A * Math.cos(x[2]) + B * Math.sin(x[0]),
    B * Math.cos(x[0]) + C * Math.sin(x[1]),
  ];
}

/** Deterministic LCG for JS-side identity sweeps (no RNG parity needed —
 * the identities hold for ANY inputs; committed rng-tied values are
 * embedded verbatim, not recomputed). */
export function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
