// SPH water — live full-DFSPH solver (Stack B WGSL).
//
// BEYOND-REFERENCE BY CONSTRUCTION (two-tier honesty, spec § 3.2 at
// packages/sph-water/web/verification-demo-spec.md): the kernel, density,
// continuity, and neighbor-search primitives in this module are the same
// formulas as the gated core (packages/sph-water/src/sph_core.wgsl — the
// f32 port of packages/sph-water/sph_water/reference/dfsph.py), but the
// full dual pressure solver, walls, XSPH viscosity, and interaction
// impulses go beyond the committed Phase-1 reference. Their evidence is
// the Tier-2 live diagnostics (density/divergence error convergence,
// mass conservation), not the gate.
//
// Solver: Bender & Koschier, "Divergence-Free Smoothed Particle
// Hydrodynamics", SCA '15 (DOI 10.1145/2786784.2786796) / TVCG '17:
//   alpha_i = rho_i / (|sum_j m_j grad W_ij|^2 + sum_j |m_j grad W_ij|^2)
//   constant-density solve:  kappa_i   = (rho*_i - rho_0) * alpha_i / dt^2
//   divergence-free solve:   kappa^v_i = (drho_i/dt) * alpha_i / dt
//   v_i -= dt * sum_j m_j (kappa_i/rho_i + kappa_j/rho_j) grad W_ij
// Fixed iteration caps (CPU-dispatched) — the determinism prerequisite
// (P24 cause #3 discipline; same-device run-twice byte-identical).
// Warm start (apply the previous frame's accumulated stiffness before
// iterating) is OFF by default: Carensac, Pronost & Bouakaz 2022
// (DOI 10.1007/s00371-021-02379-w) documents its cyclic
// compression-decompression instability — shipped as a teachable toggle.
// XSPH viscosity: Koschier et al., SPH tutorial (arXiv:2009.06944)
// eq. (103). Boundaries: analytic SDF box + sphere obstacle (position
// projection + restitution/friction velocity response).
//
// All pressure-solve gathers read kappa/rho/positions only (Jacobi
// style) — no read-write races, no atomics, no float-order hazards.
// Grid data (cell_start CSR + sorted_idx + pos_sorted) is built by the
// gated core's broadphase — the live solver literally runs on the
// verified neighbor search.

const PI: f32 = 3.14159265358979323846;

struct LiveParams {
  n: u32,
  nx: u32,
  ny: u32,
  nz: u32,
  n_cells: u32,
  warm_start: u32,
  cell_inv: f32,
  h: f32,
  origin: vec3<f32>,
  dt: f32,
  gravity: vec3<f32>,
  mass: f32,
  box_min: vec3<f32>,
  rho0: f32,
  box_max: vec3<f32>,
  xsph_alpha: f32,
  obstacle: vec4<f32>,      // xyz center, w radius (0 = off)
  impulse_pos: vec4<f32>,   // xyz center, w radius (0 = off)
  impulse_vel: vec4<f32>,   // xyz velocity change, w falloff exponent
  restitution: f32,
  friction: f32,
  kappa_clamp: f32,         // stiffness safety clamp
  surface_ncount: f32,      // divergence solve disabled below this neighbor count
  // CFL velocity clamp (live-tier stabilizer, spec § 3.2): one support
  // radius per step is the tunneling bound — v_max = cfl * 2h / dt.
  vmax: f32,
  _pad0: f32,
  _pad1: f32,
  _pad2: f32,
};

@group(0) @binding(0) var<uniform> L: LiveParams;
@group(0) @binding(1) var<storage, read_write> pos: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> vel: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> vel_out: array<vec4<f32>>;
// part_aux: x = rho, y = alpha, z = neighbor count, w = per-particle
// solver error (rho* - rho0 during density solve; drho/dt during
// divergence solve) — the Tier-2 diagnostics read this back.
@group(0) @binding(4) var<storage, read_write> part_aux: array<vec4<f32>>;
@group(0) @binding(5) var<storage, read_write> kappa: array<f32>;
@group(0) @binding(6) var<storage, read_write> kappa_total: array<f32>;
@group(0) @binding(7) var<storage, read_write> pos_sorted: array<vec4<f32>>;
@group(0) @binding(8) var<storage, read_write> sorted_idx: array<u32>;
@group(0) @binding(9) var<storage, read_write> cell_start: array<u32>; // CSR, n_cells + 1

fn kernel_f(q: f32) -> f32 {
  if (q < 1.0) { return 1.0 - 1.5 * q * q + 0.75 * q * q * q; }
  if (q < 2.0) { let d = 2.0 - q; return 0.25 * d * d * d; }
  return 0.0;
}
fn kernel_fprime(q: f32) -> f32 {
  if (q < 1.0) { return -3.0 * q + 2.25 * q * q; }
  if (q < 2.0) { let d = 2.0 - q; return -0.75 * d * d; }
  return 0.0;
}

fn cell_coord(p: vec3<f32>) -> vec3<i32> {
  let c = vec3<i32>(floor((p - L.origin) * L.cell_inv));
  return clamp(c, vec3<i32>(0), vec3<i32>(i32(L.nx) - 1, i32(L.ny) - 1, i32(L.nz) - 1));
}
fn cell_id(c: vec3<i32>) -> u32 {
  return u32(c.x) + L.nx * (u32(c.y) + L.ny * u32(c.z));
}

// Density + BK alpha factor + neighbor count, one gather.
@compute @workgroup_size(64)
fn df_density_alpha(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= L.n) { return; }
  let h = L.h;
  let pi_ = pos[i].xyz;
  let support_sq = 4.0 * h * h;
  let sig_h3 = (1.0 / PI) / (h * h * h);
  let sig_h4 = (1.0 / PI) / (h * h * h * h);
  var rho = L.mass * sig_h3;
  var sum_grad = vec3<f32>(0.0);
  var sum_grad2 = 0.0;
  var ncount = 0.0;
  let cc = cell_coord(pi_);
  let z0 = max(cc.z - 1, 0); let z1 = min(cc.z + 1, i32(L.nz) - 1);
  let y0 = max(cc.y - 1, 0); let y1 = min(cc.y + 1, i32(L.ny) - 1);
  let x0 = max(cc.x - 1, 0); let x1 = min(cc.x + 1, i32(L.nx) - 1);
  for (var cz = z0; cz <= z1; cz = cz + 1) {
    for (var cy = y0; cy <= y1; cy = cy + 1) {
      let s = cell_start[cell_id(vec3<i32>(x0, cy, cz))];
      let e = cell_start[cell_id(vec3<i32>(x1, cy, cz)) + 1u];
      for (var slot = s; slot < e; slot = slot + 1u) {
        if (sorted_idx[slot] == i) { continue; }
        let r = pi_ - pos_sorted[slot].xyz;
        let d2 = dot(r, r);
        if (d2 < support_sq && d2 > 0.0) {
          let mag = sqrt(d2);
          let q = mag / h;
          rho = rho + L.mass * sig_h3 * kernel_f(q);
          let mg = L.mass * (sig_h4 * kernel_fprime(q) * (r / mag));
          sum_grad = sum_grad + mg;
          sum_grad2 = sum_grad2 + dot(mg, mg);
          ncount = ncount + 1.0;
        }
      }
    }
  }
  let denom = max(dot(sum_grad, sum_grad) + sum_grad2, 1e-6);
  part_aux[i] = vec4<f32>(rho, rho / denom, ncount, 0.0);
}

// XSPH viscosity (SPH tutorial eq. (103)) — reads vel, writes vel_out.
@compute @workgroup_size(64)
fn df_xsph(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= L.n) { return; }
  let h = L.h;
  let pi_ = pos[i].xyz;
  let vi = vel[i].xyz;
  let support_sq = 4.0 * h * h;
  let sig_h3 = (1.0 / PI) / (h * h * h);
  var dv = vec3<f32>(0.0);
  let cc = cell_coord(pi_);
  let z0 = max(cc.z - 1, 0); let z1 = min(cc.z + 1, i32(L.nz) - 1);
  let y0 = max(cc.y - 1, 0); let y1 = min(cc.y + 1, i32(L.ny) - 1);
  let x0 = max(cc.x - 1, 0); let x1 = min(cc.x + 1, i32(L.nx) - 1);
  for (var cz = z0; cz <= z1; cz = cz + 1) {
    for (var cy = y0; cy <= y1; cy = cy + 1) {
      let s = cell_start[cell_id(vec3<i32>(x0, cy, cz))];
      let e = cell_start[cell_id(vec3<i32>(x1, cy, cz)) + 1u];
      for (var slot = s; slot < e; slot = slot + 1u) {
        let j = sorted_idx[slot];
        if (j == i) { continue; }
        let r = pi_ - pos_sorted[slot].xyz;
        let d2 = dot(r, r);
        if (d2 < support_sq) {
          let q = sqrt(d2) / h;
          let rho_j = max(part_aux[j].x, 1e-6);
          dv = dv + (L.mass / rho_j) * (vel[j].xyz - vi) * sig_h3 * kernel_f(q);
        }
      }
    }
  }
  vel_out[i] = vec4<f32>(vi + L.xsph_alpha * dv, vel[i].w);
}

// External forces: gravity + interaction impulse. In-place on vel_out.
@compute @workgroup_size(64)
fn df_apply_ext(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= L.n) { return; }
  var v = vel_out[i].xyz;
  v = v + L.dt * L.gravity;
  if (L.impulse_pos.w > 0.0) {
    let d = pos[i].xyz - L.impulse_pos.xyz;
    let dist = length(d);
    if (dist < L.impulse_pos.w) {
      let fall = 1.0 - dist / L.impulse_pos.w;
      v = v + L.impulse_vel.xyz * pow(fall, max(L.impulse_vel.w, 1.0));
    }
  }
  vel_out[i] = vec4<f32>(v, vel_out[i].w);
}

// Warm start (Carensac 2022 teachable instability, OFF by default):
// stage the previous frame's accumulated constant-density stiffness into
// kappa so a df_apply_kappa pass can apply it before the solve iterates.
@compute @workgroup_size(64)
fn df_warm_start(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= L.n) { return; }
  if (L.warm_start == 0u) {
    kappa_total[i] = 0.0;
    return;
  }
  kappa[i] = kappa_total[i];
  kappa_total[i] = 0.0;
}

// Constant-density solve, predict half: rho* and kappa.
@compute @workgroup_size(64)
fn df_predict_density(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= L.n) { return; }
  let h = L.h;
  let pi_ = pos[i].xyz;
  let vi = vel_out[i].xyz;
  let support_sq = 4.0 * h * h;
  let sig_h4 = (1.0 / PI) / (h * h * h * h);
  var drho = 0.0;
  let cc = cell_coord(pi_);
  let z0 = max(cc.z - 1, 0); let z1 = min(cc.z + 1, i32(L.nz) - 1);
  let y0 = max(cc.y - 1, 0); let y1 = min(cc.y + 1, i32(L.ny) - 1);
  let x0 = max(cc.x - 1, 0); let x1 = min(cc.x + 1, i32(L.nx) - 1);
  for (var cz = z0; cz <= z1; cz = cz + 1) {
    for (var cy = y0; cy <= y1; cy = cy + 1) {
      let s = cell_start[cell_id(vec3<i32>(x0, cy, cz))];
      let e = cell_start[cell_id(vec3<i32>(x1, cy, cz)) + 1u];
      for (var slot = s; slot < e; slot = slot + 1u) {
        let j = sorted_idx[slot];
        if (j == i) { continue; }
        let r = pi_ - pos_sorted[slot].xyz;
        let d2 = dot(r, r);
        if (d2 < support_sq && d2 > 0.0) {
          let mag = sqrt(d2);
          let grad = sig_h4 * kernel_fprime(mag / h) * (r / mag);
          drho = drho + L.mass * dot(vi - vel_out[j].xyz, grad);
        }
      }
    }
  }
  let aux = part_aux[i];
  let rho_star = aux.x + L.dt * drho;
  let err = max(rho_star - L.rho0, 0.0); // correct compression only (no clumping)
  var k = err * aux.y / (L.dt * L.dt);
  k = clamp(k, 0.0, L.kappa_clamp);
  kappa[i] = k;
  kappa_total[i] = kappa_total[i] + k;
  part_aux[i] = vec4<f32>(aux.xyz, err);
}

// Divergence-free solve, predict half: drho/dt and kappa^v.
@compute @workgroup_size(64)
fn df_predict_divergence(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= L.n) { return; }
  let h = L.h;
  let pi_ = pos[i].xyz;
  let vi = vel_out[i].xyz;
  let support_sq = 4.0 * h * h;
  let sig_h4 = (1.0 / PI) / (h * h * h * h);
  var drho = 0.0;
  let cc = cell_coord(pi_);
  let z0 = max(cc.z - 1, 0); let z1 = min(cc.z + 1, i32(L.nz) - 1);
  let y0 = max(cc.y - 1, 0); let y1 = min(cc.y + 1, i32(L.ny) - 1);
  let x0 = max(cc.x - 1, 0); let x1 = min(cc.x + 1, i32(L.nx) - 1);
  for (var cz = z0; cz <= z1; cz = cz + 1) {
    for (var cy = y0; cy <= y1; cy = cy + 1) {
      let s = cell_start[cell_id(vec3<i32>(x0, cy, cz))];
      let e = cell_start[cell_id(vec3<i32>(x1, cy, cz)) + 1u];
      for (var slot = s; slot < e; slot = slot + 1u) {
        let j = sorted_idx[slot];
        if (j == i) { continue; }
        let r = pi_ - pos_sorted[slot].xyz;
        let d2 = dot(r, r);
        if (d2 < support_sq && d2 > 0.0) {
          let mag = sqrt(d2);
          let grad = sig_h4 * kernel_fprime(mag / h) * (r / mag);
          drho = drho + L.mass * dot(vi - vel_out[j].xyz, grad);
        }
      }
    }
  }
  let aux = part_aux[i];
  // Only correct compression (drho > 0); skip neighbor-deficient surface
  // particles (the standard free-surface guard).
  var d = max(drho, 0.0);
  if (aux.z < L.surface_ncount) { d = 0.0; }
  var k = d * aux.y / L.dt;
  k = clamp(k, 0.0, L.kappa_clamp);
  kappa[i] = k;
  part_aux[i] = vec4<f32>(aux.xyz, max(drho, 0.0));
}

// Shared correction half: v_i -= dt * sum_j m (k_i/rho_i + k_j/rho_j) grad W.
// Reads kappa/rho/positions only — Jacobi-style, race-free.
@compute @workgroup_size(64)
fn df_apply_kappa(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= L.n) { return; }
  let h = L.h;
  let pi_ = pos[i].xyz;
  let support_sq = 4.0 * h * h;
  let sig_h4 = (1.0 / PI) / (h * h * h * h);
  let ki = kappa[i] / max(part_aux[i].x, 1e-6);
  var dv = vec3<f32>(0.0);
  let cc = cell_coord(pi_);
  let z0 = max(cc.z - 1, 0); let z1 = min(cc.z + 1, i32(L.nz) - 1);
  let y0 = max(cc.y - 1, 0); let y1 = min(cc.y + 1, i32(L.ny) - 1);
  let x0 = max(cc.x - 1, 0); let x1 = min(cc.x + 1, i32(L.nx) - 1);
  for (var cz = z0; cz <= z1; cz = cz + 1) {
    for (var cy = y0; cy <= y1; cy = cy + 1) {
      let s = cell_start[cell_id(vec3<i32>(x0, cy, cz))];
      let e = cell_start[cell_id(vec3<i32>(x1, cy, cz)) + 1u];
      for (var slot = s; slot < e; slot = slot + 1u) {
        let j = sorted_idx[slot];
        if (j == i) { continue; }
        let r = pi_ - pos_sorted[slot].xyz;
        let d2 = dot(r, r);
        if (d2 < support_sq && d2 > 0.0) {
          let mag = sqrt(d2);
          let grad = sig_h4 * kernel_fprime(mag / h) * (r / mag);
          let kj = kappa[j] / max(part_aux[j].x, 1e-6);
          dv = dv - L.dt * L.mass * (ki + kj) * grad;
        }
      }
    }
  }
  vel_out[i] = vec4<f32>(vel_out[i].xyz + dv, vel_out[i].w);
}

// Integrate + SDF boundaries (box walls, sphere obstacle).
@compute @workgroup_size(64)
fn df_integrate(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= L.n) { return; }
  var v = vel_out[i].xyz;
  let sp = length(v);
  if (sp > L.vmax && sp > 0.0) { v = v * (L.vmax / sp); }
  var p = pos[i].xyz + L.dt * v;
  let eps = 1e-4;
  for (var axis = 0; axis < 3; axis = axis + 1) {
    if (p[axis] < L.box_min[axis] + eps) {
      p[axis] = L.box_min[axis] + eps;
      if (v[axis] < 0.0) { v[axis] = -v[axis] * L.restitution; }
      v = v * (1.0 - L.friction);
    }
    if (p[axis] > L.box_max[axis] - eps) {
      p[axis] = L.box_max[axis] - eps;
      if (v[axis] > 0.0) { v[axis] = -v[axis] * L.restitution; }
      v = v * (1.0 - L.friction);
    }
  }
  if (L.obstacle.w > 0.0) {
    let d = p - L.obstacle.xyz;
    let dist = length(d);
    if (dist < L.obstacle.w && dist > 0.0) {
      let n = d / dist;
      p = L.obstacle.xyz + n * L.obstacle.w;
      let vn = dot(v, n);
      if (vn < 0.0) { v = v - (1.0 + L.restitution) * vn * n; }
    }
  }
  pos[i] = vec4<f32>(p, pos[i].w);
  vel_out[i] = vec4<f32>(v, vel_out[i].w);
}
