// phase-field-fracture — pure-JS f64 mirror of the backend constants +
// loading protocol (packages/phase-field-fracture/phase_field_fracture/
// reference.py / solver.py). NO WebGPU here: these run in f64 and feed the
// gate scene (cast once to f32), the PROVE recomputations, and the EXPLAIN
// numbers. Formulas must stay bit-compatible with the Python reference —
// same operations, same order, IEEE f64.

// Miehe SENT steel groups (spec-ref § 4 / § 9 non-dim units ell=1, Gc=1).
export const E_PHYS_MPA = 210000.0;
export const NU_MIEHE = 0.3;
export const GC_PHYS_N_PER_MM = 2.7;
export const ELL_PHYS_MM = 0.015;
export const E_TILDE = (E_PHYS_MPA * ELL_PHYS_MM) / GC_PHYS_N_PER_MM;
export const L_TILDE = 1.0 / ELL_PHYS_MM;
export const FORCE_UNIT_N = GC_PHYS_N_PER_MM * 1.0;
export const SENT_PEAK_REPRODUCTION_KN = 0.7012;
export const E_VOID = 1e-6;
export const K_RES = 1e-6;

export function planeStrainLame(e, nu) {
  const lam = (e * nu) / ((1.0 + nu) * (1.0 - 2.0 * nu));
  const mu = e / (2.0 * (1.0 + nu));
  return [lam, mu];
}

export function dilatationalSpeed(lam, mu) {
  return Math.sqrt(lam + 2.0 * mu);
}

/** Config mirror of FractureConfig (defaults = the gate/canonical scene). */
export function fractureConfig({
  n = 96,
  lDomain = L_TILDE,
  eTilde = E_TILDE,
  nu = NU_MIEHE,
  uEnd = 0.42,
  vloadFrac = 1e-4,
  tRamp = 10.0,
  cfl = 0.4,
  cDamp = 1.5,
  mobilityM = 1.0,
} = {}) {
  const h = lDomain / n;
  const [lam, mu] = planeStrainLame(eTilde, nu);
  const cd = dilatationalSpeed(lam, mu);
  const dt = (cfl * h) / cd;
  const vload = vloadFrac * cd;
  const tEnd = tRamp * 0.5 + Math.abs(uEnd) / vload;
  const stepCount = Math.floor(tEnd / dt) + 1;
  return { n, lDomain, eTilde, nu, uEnd, vloadFrac, tRamp, cfl, cDamp,
    mobilityM, h, lam, mu, cd, dt, vload, stepCount };
}

/** Applied top displacement U(t) — smooth start ramp then constant rate
 * (solver.py u_applied, f64). Sign of uEnd selects tension/compression. */
export function uApplied(cfg, t) {
  const sign = cfg.uEnd < 0.0 ? -1.0 : 1.0;
  if (t <= 0.0) return 0.0;
  if (t < cfg.tRamp) return (sign * 0.5 * cfg.vload * t * t) / cfg.tRamp;
  return sign * cfg.vload * (t - 0.5 * cfg.tRamp);
}

/** Per-substep {t, uTop, vTop} sequence in f64, EXACTLY the Python loop:
 * t accumulates the F32-CAST dt in f64 (the dtype-preserving proxy detail —
 * solver.py step() does t_new = t + float(dt) with dt cast to the run
 * dtype). Returns Float64Arrays of length stepCount+1 (index = step). */
export function loadingSchedule(cfg) {
  const dt32 = Math.fround(cfg.dt);
  const uTop = new Float64Array(cfg.stepCount + 1);
  const vTop = new Float64Array(cfg.stepCount + 1);
  let t = 0.0;
  for (let i = 1; i <= cfg.stepCount; i++) {
    const tNew = t + dt32;
    uTop[i] = uApplied(cfg, tNew);
    vTop[i] = (uApplied(cfg, tNew + dt32) - uApplied(cfg, tNew)) / dt32;
    t = tNew;
  }
  return { uTop, vTop };
}

// --- closed-form constants (reference.py § 7.G — PROVE recomputes) --------

export function sigmaCAt1(e, gc, ell) {
  return Math.sqrt((3.0 * gc * e) / (8.0 * ell));
}

export function sigmaCAt2(e, gc, ell) {
  return Math.sqrt((27.0 * e * gc) / (256.0 * ell));
}

export function hCritAt1(gc, ell) {
  return (3.0 * gc) / (16.0 * ell);
}

export function at2HomogeneousDamage(hVal) {
  return (2.0 * hVal) / (1.0 + 2.0 * hVal);
}

/** AT2 1D optimal-profile discrete surface energy, geometric-series closed
 * form (golden derivation route 2): -> 1 as h -> 0. */
export function at2ProfileEnergyClosedForm(h) {
  const wInt = h / Math.tanh(h);
  const grad2 = (2.0 * (Math.exp(-h) - 1.0) ** 2) / (h * (1.0 - Math.exp(-2.0 * h)));
  return (wInt + grad2) / 2.0;
}

/** f64 diagnostics over readback f32 fields (checkpoint bundles). */
export function sumKineticEnergy(vx, vy, h) {
  let s = 0.0;
  for (let i = 0; i < vx.length; i++) s += vx[i] * vx[i] + vy[i] * vy[i];
  return 0.5 * s * h * h;
}

export function maxOf(arr) {
  let m = -Infinity;
  for (let i = 0; i < arr.length; i++) if (arr[i] > m) m = arr[i];
  return m;
}

export function allFinite(arr) {
  for (let i = 0; i < arr.length; i++) if (!Number.isFinite(arr[i])) return false;
  return true;
}

/** Regularized AT2 surface energy of a cell field d (f64, central-ish
 * one-sided gradient like numpy.gradient) — display/diagnostic mirror of
 * FractureSolver.fracture_energy. */
export function fractureEnergy(d, n, h) {
  let s = 0.0;
  const at = (i, j) => d[i * n + j];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const gx =
        i === 0 ? (at(1, j) - at(0, j)) / h
        : i === n - 1 ? (at(n - 1, j) - at(n - 2, j)) / h
        : (at(i + 1, j) - at(i - 1, j)) / (2 * h);
      const gy =
        j === 0 ? (at(i, 1) - at(i, 0)) / h
        : j === n - 1 ? (at(i, n - 1) - at(i, n - 2)) / h
        : (at(i, j + 1) - at(i, j - 1)) / (2 * h);
      const dv = at(i, j);
      s += 0.5 * (dv * dv + gx * gx + gy * gy);
    }
  }
  return s * h * h;
}
