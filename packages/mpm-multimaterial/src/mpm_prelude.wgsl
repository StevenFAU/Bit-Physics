// prelude.wgsl — shared structs, quadratic B-spline, fixed-point encoding,
// 3x3 SVD, and the per-material constitutive functions.
//
// Port source (verbatim math): packages/mpm-multimaterial/mpm_multimaterial/reference/mls_mpm.py
// Shape function: packages/mpm-multimaterial/mpm_multimaterial/reference/shape_functions.py
// Golden anchor: tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json
//
// Materials beyond neo-Hookean are reference-less additions (spec § 3.2):
//   snow — Stomakhin et al. 2013 (DOI 10.1145/2461912.2461948)
//   sand — Klár et al. 2016 (DOI 10.1145/2897824.2925906)
//   water — Tampubolon et al. 2017 (DOI 10.1145/3072959.3073651), Tait EOS
// Each ships with its own live invariant (spec § 4.3).

struct SimParams {
  gravity: vec3f,
  dt: f32,
  grid_n: u32,
  n_particles: u32,
  floor_z: i32,
  n_pointers: u32,
  dx: f32,
  inv_dx: f32,
  fp_scale: f32,      // fixed-point multiplier M (default 1e7)
  inv_fp_scale: f32,  // 1 / M
  // Stress is physical (built from E, V0); particle masses ride the buffers
  // pre-normalized to ~1 mass-unit each. This factor (1 / mass_unit) rescales
  // the stress injection into the same normalized units so the decoded grid
  // velocities are identical to the unscaled math.
  inv_mass_unit: f32,
  frame: u32,
  // Live-loop speed limit guarding the i32 momentum channel against
  // pile-up overflow (spec § 3.3 per-cell bound). The gated canonical scene
  // passes 1e9 — the branch never fires there.
  vmax_clamp: f32,
  pad0: f32,
}

// AoS particle state. mass is in normalized units (~1 per particle);
// vol0 is the reference volume V_p^0 (physical). For water, F stays I and
// Jp carries J = det(F) as a scalar (Tampubolon 2017); for snow, Jp is the
// plastic determinant J_p (Stomakhin 2013); jelly/sand leave Jp = 1.
struct Particle {
  pos: vec3f,
  mass: f32,
  vel: vec3f,
  vol0: f32,
  C: mat3x3f,
  F: mat3x3f,
  Jp: f32,
  mat_id: u32,
  pad0: f32,
  pad1: f32,
}

// Fixed-point accumulation cell: WebGPU has no float atomics, so the P2G
// scatter accumulates i32 quanta — integer addition is associative, making
// the scatter order-independent (the determinism proof, spec § 3.3).
struct GridAtom {
  m: atomic<i32>,
  mx: atomic<i32>,
  my: atomic<i32>,
  mz: atomic<i32>,
}

struct Material {
  mu0: f32,
  lam0: f32,
  model: u32,   // 0 neo-Hookean (jelly), 1 snow, 2 sand, 3 water
  xi: f32,      // snow hardening exponent
  theta_c: f32, // snow critical compression
  theta_s: f32, // snow critical stretch
  alpha: f32,   // sand Drucker-Prager cone coefficient (from friction angle)
  k_stiff: f32, // water Tait stiffness
  gamma_exp: f32, // water Tait exponent
  pad0: f32,
  pad1: f32,
  pad2: f32,
}

struct Pointer {
  pos: vec3f,
  radius: f32,
  vel: vec3f,
  strength: f32,
}

// ---------------------------------------------------------------------------
// Quadratic B-spline (the golden-verified line).
// base = floor(pos/dx + 0.5) - 1; fp = pos/dx - base ∈ [0.5, 1.5).
// Weights at nodes (base, base+1, base+2):
//   w0 = 0.5*(1.5-fp)^2   w1 = 0.75-(fp-1)^2   w2 = 0.5*(fp-0.5)^2
// ---------------------------------------------------------------------------

fn bspline_weights(fp: f32) -> vec3f {
  return vec3f(
    0.5 * (1.5 - fp) * (1.5 - fp),
    0.75 - (fp - 1.0) * (fp - 1.0),
    0.5 * (fp - 0.5) * (fp - 0.5),
  );
}

// Piecewise closed form N(x) — golden-table sample surface.
fn bspline_n(x: f32) -> f32 {
  let ax = abs(x);
  if (ax < 0.5) {
    return 0.75 - x * x;
  }
  if (ax < 1.5) {
    return 0.5 * (1.5 - ax) * (1.5 - ax);
  }
  return 0.0;
}

// ---------------------------------------------------------------------------
// Fixed-point encoding for the P2G scatter (PB-MPM / webgpu-ocean pattern).
// ---------------------------------------------------------------------------

fn encode_fixed(x: f32, scale: f32) -> i32 {
  return i32(round(x * scale));
}

fn decode_fixed(v: i32, inv_scale: f32) -> f32 {
  return f32(v) * inv_scale;
}

// ---------------------------------------------------------------------------
// 3x3 SVD via Jacobi eigen-decomposition of F^T F (fixed 8 sweeps — no
// data-dependent iteration count, keeping the pass run-twice deterministic).
// Shared by snow (singular-value clamp) and sand (Hencky-strain return map).
// ---------------------------------------------------------------------------

struct Svd3 {
  u: mat3x3f,
  sigma: vec3f,
  v: mat3x3f,
}

fn jacobi_rotate(a: ptr<function, mat3x3f>, v: ptr<function, mat3x3f>, p: i32, q: i32) {
  let apq = (*a)[p][q];
  if (abs(apq) < 1e-12) {
    return;
  }
  let app = (*a)[p][p];
  let aqq = (*a)[q][q];
  let tau = (aqq - app) / (2.0 * apq);
  var t: f32;
  if (tau >= 0.0) {
    t = 1.0 / (tau + sqrt(1.0 + tau * tau));
  } else {
    t = -1.0 / (-tau + sqrt(1.0 + tau * tau));
  }
  let c = 1.0 / sqrt(1.0 + t * t);
  let s = t * c;
  // Column-major subtlety: r[c][rw] is math entry R[rw][c], so the Givens
  // signs below give math R[p][q] = +s, R[q][p] = -s — the root of the
  // rotation quadratic that actually ZEROES a[p][q] under R^T A R. (The
  // transposed sign choice converges to a non-eigenbasis V and silently
  // destroys sand friction — caught by the U*Sigma*V^T reconstruction test.)
  var r = mat3x3f(vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), vec3f(0.0, 0.0, 1.0));
  r[p][p] = c;
  r[q][q] = c;
  r[p][q] = -s;
  r[q][p] = s;
  *a = transpose(r) * (*a) * r;
  *v = (*v) * r;
}

fn svd3(f: mat3x3f) -> Svd3 {
  var a = transpose(f) * f;
  var v = mat3x3f(vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), vec3f(0.0, 0.0, 1.0));
  for (var sweep = 0; sweep < 8; sweep++) {
    jacobi_rotate(&a, &v, 0, 1);
    jacobi_rotate(&a, &v, 0, 2);
    jacobi_rotate(&a, &v, 1, 2);
  }
  var eig = vec3f(max(a[0][0], 0.0), max(a[1][1], 0.0), max(a[2][2], 0.0));
  // Sort eigenpairs descending with parity-preserving column exchanges
  // (each swap negates one column to keep det(V) = +1).
  for (var i = 0; i < 2; i++) {
    for (var j = 0; j < 2 - i; j++) {
      if (eig[j] < eig[j + 1]) {
        let te = eig[j];
        eig[j] = eig[j + 1];
        eig[j + 1] = te;
        let tc = v[j];
        v[j] = v[j + 1];
        v[j + 1] = -tc;
      }
    }
  }
  var sigma = sqrt(eig);
  let b = f * v;
  var u: mat3x3f;
  // Rebuild U columns; orthonormal completion guards degenerate sigmas.
  if (sigma.x > 1e-8) {
    u[0] = b[0] / sigma.x;
  } else {
    u[0] = vec3f(1.0, 0.0, 0.0);
  }
  if (sigma.y > 1e-8) {
    u[1] = b[1] / sigma.y;
  } else {
    u[1] = normalize(any_orthogonal(u[0]));
  }
  u[1] = normalize(u[1] - dot(u[1], u[0]) * u[0]);
  u[2] = cross(u[0], u[1]);
  if (sigma.z > 1e-8) {
    // Push a reflection (inverted element) into sigma_min: det(U) stays +1.
    if (dot(u[2], b[2] / sigma.z) < 0.0) {
      sigma.z = -sigma.z;
    }
  }
  return Svd3(u, sigma, v);
}

fn any_orthogonal(n: vec3f) -> vec3f {
  if (abs(n.x) < 0.9) {
    return cross(n, vec3f(1.0, 0.0, 0.0));
  }
  return cross(n, vec3f(0.0, 1.0, 0.0));
}

fn diag3(d: vec3f) -> mat3x3f {
  return mat3x3f(vec3f(d.x, 0.0, 0.0), vec3f(0.0, d.y, 0.0), vec3f(0.0, 0.0, d.z));
}

fn det3(m: mat3x3f) -> f32 {
  return determinant(m);
}

// ---------------------------------------------------------------------------
// Constitutive models — each returns the Kirchhoff stress tau = J*sigma,
// the quantity the reference injects as `stress` (mls_mpm.py
// compute_particle_stresses + p2g_with_stress).
// ---------------------------------------------------------------------------

const IDENTITY3: mat3x3f = mat3x3f(
  vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), vec3f(0.0, 0.0, 1.0));

// Neo-Hookean (jelly) — verbatim port of compute_particle_stresses,
// including the log_j = -30 guard when J <= 0 (part of the verified behavior).
fn stress_neo_hookean(f: mat3x3f, mu: f32, lam: f32) -> mat3x3f {
  let j_det = det3(f);
  var log_j = -30.0;
  if (j_det > 0.0) {
    log_j = log(j_det);
  }
  let ff = f * transpose(f);
  return mu * (ff - IDENTITY3) + (lam * log_j) * IDENTITY3;
}

// Snow (Stomakhin 2013) — fixed-corotated elasticity with exponential
// hardening mu = mu0 * e^{xi (1 - Jp)} (lambda hardens identically).
fn stress_snow(f_e: mat3x3f, jp: f32, m: Material) -> mat3x3f {
  let h = clamp(exp(m.xi * (1.0 - jp)), 0.1, 20.0);
  let mu = m.mu0 * h;
  let lam = m.lam0 * h;
  let s = svd3(f_e);
  let r = s.u * transpose(s.v);
  let j_det = det3(f_e);
  return 2.0 * mu * (f_e - r) * transpose(f_e) + (lam * (j_det - 1.0) * j_det) * IDENTITY3;
}

// Sand (Klár 2016) — St. Venant-Kirchhoff on the Hencky (log) strain.
// F is kept post-projection (inside the cone), so no clamp here.
fn stress_sand(f_e: mat3x3f, m: Material) -> mat3x3f {
  let s = svd3(f_e);
  let sig = clamp(abs(s.sigma), vec3f(1e-6), vec3f(1e6));
  let eps = log(sig); // Hencky strain (principal)
  let tr_eps = eps.x + eps.y + eps.z;
  let tau_p = 2.0 * m.mu0 * eps + vec3f(m.lam0 * tr_eps);
  return s.u * diag3(tau_p) * transpose(s.u);
}

// Water (Tampubolon 2017 / Tait EOS) — J tracked as a scalar; tau = -J p I,
// p = k ((1/J)^gamma - 1) (positive in compression).
fn stress_water(j: f32, m: Material) -> mat3x3f {
  let jc = clamp(j, 0.05, 4.0);
  let p = m.k_stiff * (pow(1.0 / jc, m.gamma_exp) - 1.0);
  return (-jc * p) * IDENTITY3;
}

fn particle_stress(f: mat3x3f, jp: f32, m: Material) -> mat3x3f {
  switch (m.model) {
    case 1u: {
      return stress_snow(f, jp, m);
    }
    case 2u: {
      return stress_sand(f, m);
    }
    case 3u: {
      return stress_water(jp, m);
    }
    default: {
      return stress_neo_hookean(f, m.mu0, m.lam0);
    }
  }
}

// ---------------------------------------------------------------------------
// Plastic return maps (applied in G2P after the trial F update).
// ---------------------------------------------------------------------------

// Snow: clamp elastic singular values to [1-theta_c, 1+theta_s]; the volume
// change removed from F_E moves into Jp (Stomakhin 2013 § 7).
// The live invariant (spec § 4.3): post-return-map sigmas are always in range.
fn snow_return_map(f_trial: mat3x3f, jp: ptr<function, f32>, m: Material) -> mat3x3f {
  let s = svd3(f_trial);
  let sig_clamped = clamp(s.sigma, vec3f(1.0 - m.theta_c), vec3f(1.0 + m.theta_s));
  let det_trial = s.sigma.x * s.sigma.y * s.sigma.z;
  let det_new = sig_clamped.x * sig_clamped.y * sig_clamped.z;
  *jp = clamp((*jp) * det_trial / det_new, 0.1, 10.0);
  return s.u * diag3(sig_clamped) * transpose(s.v);
}

// Sand: closed-form Drucker-Prager projection in principal-stretch space
// (Klár 2016 § 4). eps = trial Hencky strain, H = projected Hencky strain.
//   Case II (tr eps > 0): tip projection, H = 0 → sigma = 1, zero stress.
//   Case I  (delta_gamma <= 0): elastic, H = eps.
//   Case III: H = eps - delta_gamma * eps_hat/|eps_hat| — traceless
//   correction, so tr(H) = tr(eps): the volume-preservation invariant.
fn sand_return_map(f_trial: mat3x3f, m: Material) -> mat3x3f {
  let s = svd3(f_trial);
  let sig = clamp(abs(s.sigma), vec3f(1e-6), vec3f(1e6));
  let eps = log(sig);
  let tr_eps = eps.x + eps.y + eps.z;
  if (tr_eps > 0.0) {
    // Case II — expansion: project to the cone tip (stress-free separation).
    return s.u * transpose(s.v);
  }
  let eps_hat = eps - vec3f(tr_eps / 3.0);
  let eps_hat_norm = length(eps_hat);
  let delta_gamma = eps_hat_norm
    + m.alpha * tr_eps * (3.0 * m.lam0 + 2.0 * m.mu0) / (2.0 * m.mu0);
  if (delta_gamma <= 0.0 || eps_hat_norm < 1e-12) {
    // Case I — inside the cone: elastic.
    return f_trial;
  }
  // Case III — project onto the cone face along the traceless direction.
  let h = eps - (delta_gamma / eps_hat_norm) * eps_hat;
  return s.u * diag3(exp(h)) * transpose(s.v);
}
