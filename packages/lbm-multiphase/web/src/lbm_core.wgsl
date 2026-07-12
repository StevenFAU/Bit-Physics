// lbm-multiphase — D2Q9 pseudopotential compute kernels (NORMATIVE mirror of
// packages/lbm-multiphase/lbm_multiphase/reference.py run_scene; spec
// docs/sim-specs/lattice/lbm-multiphase/spec-ref.md §§ 3, 6).
//
// Contract with the f64 reference (do NOT reorder arithmetic):
//  - DDF-shifted state fbar = f - w_i, SoA planes (plane k at k*n2).
//  - Two-buffer pull streaming with halfway bounce-back at solids.
//  - All i-sums are sequential k = 0..8 accumulation.
//  - Tier-A psi via the committed LUT (linear interp, pinned arithmetic);
//    Tier-B psi polynomial + sqrt. NO transcendentals on the gate path
//    (the splat falloff below is polynomial on purpose).
//  - Velocity order: rest; +x,+y,-x,-y; (1,1),(-1,1),(-1,-1),(1,-1).
//
// Kernels: psi_pass -> collide_stream (per substep), paint (brush events),
// tracer_step (ungated cosmetics).

struct U {
  nx : u32,
  ny : u32,
  flags : u32,        // bit0: psi_kind (0=exp-lut, 1=cs); bits1-2: forcing
                      // (0=guo, 1=li-sigma, 2=sc-shift); bit3: gravity on
  pad0 : u32,
  tau : f32,
  g : f32,            // interaction coupling G (Kruger convention)
  sigma : f32,        // li-sigma strength
  cs_temp : f32,      // C-S temperature (Tier B)
  gx : f32,
  gy : f32,
  rho_ref : f32,      // buoyancy reference density
  eps_psi2 : f32,     // sigma-forcing psi^2 clamp
  splat_x : f32,      // pointer splat (ungated): position, radius^2
  splat_y : f32,
  splat_r2 : f32,
  splat_fx : f32,     // momentum splat strength
  splat_fy : f32,
  splat_fac : f32,    // density factor (condense > 1, boil < 1, 0 = off)
  brush_x : f32,      // paint kernel params
  brush_y : f32,
  brush_r2 : f32,
  brush_mode : f32,   // 0 erase, 1 wall
  brush_rho_w : f32,
  tracer_dt : f32,
  frame : u32,
  n_tracers : u32,
}

@group(0) @binding(0) var<uniform> u : U;
@group(0) @binding(1) var<storage, read> f_in : array<f32>;
@group(0) @binding(2) var<storage, read_write> f_out : array<f32>;
@group(0) @binding(3) var<storage, read_write> rhopsi : array<vec2<f32>>;
@group(0) @binding(4) var<storage, read_write> flags_buf : array<u32>;
@group(0) @binding(5) var<storage, read> psi_lut : array<f32>;
@group(0) @binding(6) var<storage, read_write> macro_out : array<vec4<f32>>;
@group(0) @binding(7) var<storage, read_write> tracers : array<vec4<f32>>;

const CXI = array<i32, 9>(0, 1, 0, -1, 0, 1, -1, -1, 1);
const CYI = array<i32, 9>(0, 0, 1, 0, -1, 1, 1, -1, -1);
const CXF = array<f32, 9>(0.0, 1.0, 0.0, -1.0, 0.0, 1.0, -1.0, -1.0, 1.0);
const CYF = array<f32, 9>(0.0, 0.0, 1.0, 0.0, -1.0, 1.0, 1.0, -1.0, -1.0);
const WQ = array<f32, 9>(
  0.4444444444444444,
  0.1111111111111111, 0.1111111111111111, 0.1111111111111111, 0.1111111111111111,
  0.027777777777777776, 0.027777777777777776, 0.027777777777777776, 0.027777777777777776);
const OPPI = array<u32, 9>(0u, 3u, 4u, 1u, 2u, 7u, 8u, 5u, 6u);
const PSI_LUT_N : u32 = 8192u;
const PSI_LUT_RHO_MAX : f32 = 6.0;

fn wrap(i : i32, n : i32) -> i32 {
  return (i + n) % n;
}

fn is_solid(idx : u32) -> bool {
  return (flags_buf[idx] & 1u) != 0u;
}

fn rho_wall_of(idx : u32) -> f32 {
  // rho_w packed in bits 16..31 as u16 scaled by 4/65535
  return f32(flags_buf[idx] >> 16u) * (4.0 / 65535.0);
}

// Pinned LUT interpolation — identical arithmetic to reference.psi_from_lut.
fn psi_lut_eval(rho : f32) -> f32 {
  let t = rho * (f32(PSI_LUT_N - 1u) / PSI_LUT_RHO_MAX);
  let ti = clamp(i32(t), 0, i32(PSI_LUT_N) - 2);
  let frac = t - f32(ti);
  let lo = psi_lut[u32(ti)];
  return lo + frac * (psi_lut[u32(ti) + 1u] - lo);
}

// Tier-B Yuan-Schaefer psi — identical arithmetic to reference.psi_cs_field.
fn psi_cs_eval(rho : f32) -> f32 {
  let phi = rho * 1.0; // b/4 with b = 4
  let num = 1.0 + phi * (1.0 + phi * (1.0 - phi));
  let den = 1.0 - phi;
  let p_eos = rho * 1.0 * u.cs_temp * num / (den * den * den) - 1.0 * rho * rho;
  let arg = 2.0 * (p_eos - rho * 0.3333333333333333) / (u.g * 0.3333333333333333);
  return sqrt(max(arg, 0.0));
}

fn psi_of(rho : f32) -> f32 {
  if ((u.flags & 1u) != 0u) {
    return psi_cs_eval(rho);
  }
  return psi_lut_eval(rho);
}

// Pull-gather the 9 shifted populations for cell (i, j) — shared by both
// passes so the accumulated rho is bit-identical between them.
fn pull(i : i32, j : i32, idx : u32, f : ptr<function, array<f32, 9>>) {
  let nxi = i32(u.nx);
  let nyi = i32(u.ny);
  let n2 = u.nx * u.ny;
  for (var k = 0u; k < 9u; k = k + 1u) {
    let si = wrap(i - CXI[k], nxi);
    let sj = wrap(j - CYI[k], nyi);
    let sidx = u32(si) * u.ny + u32(sj);
    if (is_solid(sidx)) {
      (*f)[k] = f_in[OPPI[k] * n2 + idx];
    } else {
      (*f)[k] = f_in[k * n2 + sidx];
    }
  }
}

@compute @workgroup_size(8, 8)
fn psi_pass(@builtin(global_invocation_id) gid : vec3<u32>) {
  if (gid.x >= u.nx || gid.y >= u.ny) { return; }
  let idx = gid.x * u.ny + gid.y;
  if (is_solid(idx)) {
    let rw = rho_wall_of(idx);
    rhopsi[idx] = vec2<f32>(rw, psi_of(rw));
    return;
  }
  var f : array<f32, 9>;
  pull(i32(gid.x), i32(gid.y), idx, &f);
  var rho = 1.0;
  for (var k = 0u; k < 9u; k = k + 1u) { rho = rho + f[k]; }
  // ungated condense/boil splat: scale rho for psi consistency this substep
  if (u.splat_fac != 0.0) {
    let dx = f32(gid.x) - u.splat_x;
    let dy = f32(gid.y) - u.splat_y;
    let q = 1.0 - (dx * dx + dy * dy) / u.splat_r2;
    if (q > 0.0) {
      rho = rho * (1.0 + (u.splat_fac - 1.0) * q * q);
    }
  }
  rhopsi[idx] = vec2<f32>(rho, psi_of(rho));
}

@compute @workgroup_size(8, 8)
fn collide_stream(@builtin(global_invocation_id) gid : vec3<u32>) {
  if (gid.x >= u.nx || gid.y >= u.ny) { return; }
  let idx = gid.x * u.ny + gid.y;
  let n2 = u.nx * u.ny;
  if (is_solid(idx)) {
    for (var k = 0u; k < 9u; k = k + 1u) { f_out[k * n2 + idx] = 0.0; }
    macro_out[idx] = vec4<f32>(0.0, 0.0, 0.0, 1.0);
    return;
  }
  var f : array<f32, 9>;
  pull(i32(gid.x), i32(gid.y), idx, &f);

  // condense/boil splat mirrors psi_pass's rho scaling on the state itself
  if (u.splat_fac != 0.0) {
    let dxs = f32(gid.x) - u.splat_x;
    let dys = f32(gid.y) - u.splat_y;
    let qs = 1.0 - (dxs * dxs + dys * dys) / u.splat_r2;
    if (qs > 0.0) {
      let fac = 1.0 + (u.splat_fac - 1.0) * qs * qs;
      for (var k = 0u; k < 9u; k = k + 1u) {
        f[k] = f[k] * fac + (fac - 1.0) * WQ[k];
      }
    }
  }

  var rho = 1.0;
  var mx = 0.0;
  var my = 0.0;
  for (var k = 0u; k < 9u; k = k + 1u) {
    rho = rho + f[k];
    mx = mx + CXF[k] * f[k];
    my = my + CYF[k] * f[k];
  }

  let psi_c = rhopsi[idx].y;
  var sx = 0.0;
  var sy = 0.0;
  let nxi = i32(u.nx);
  let nyi = i32(u.ny);
  for (var k = 1u; k < 9u; k = k + 1u) {
    let ni = wrap(i32(gid.x) + CXI[k], nxi);
    let nj = wrap(i32(gid.y) + CYI[k], nyi);
    let nb = rhopsi[u32(ni) * u.ny + u32(nj)].y;
    let wnb = WQ[k] * nb;
    sx = sx + wnb * CXF[k];
    sy = sy + wnb * CYF[k];
  }
  var fx = -u.g * psi_c * sx;
  var fy = -u.g * psi_c * sy;
  if ((u.flags & 8u) != 0u) {
    fx = fx + (rho - u.rho_ref) * u.gx;
    fy = fy + (rho - u.rho_ref) * u.gy;
  }
  // ungated pointer momentum splat (polynomial falloff, no transcendentals)
  if (u.splat_fx != 0.0 || u.splat_fy != 0.0) {
    let dx = f32(gid.x) - u.splat_x;
    let dy = f32(gid.y) - u.splat_y;
    let q = 1.0 - (dx * dx + dy * dy) / u.splat_r2;
    if (q > 0.0) {
      fx = fx + rho * u.splat_fx * q * q;
      fy = fy + rho * u.splat_fy * q * q;
    }
  }

  let tau = u.tau;
  let inv_tau = 1.0 / tau;
  let inv_rho = 1.0 / rho;
  let forcing = (u.flags >> 1u) & 3u;
  var vx : f32;
  var vy : f32;
  var out_vx : f32;
  var out_vy : f32;
  if (forcing == 2u) { // sc-shift (pedagogy toggle)
    vx = (mx + tau * fx) * inv_rho;
    vy = (my + tau * fy) * inv_rho;
    out_vx = (mx + 0.5 * fx) * inv_rho;
    out_vy = (my + 0.5 * fy) * inv_rho;
  } else {
    vx = (mx + 0.5 * fx) * inv_rho;
    vy = (my + 0.5 * fy) * inv_rho;
    out_vx = vx;
    out_vy = vy;
  }
  var vpx = vx;
  var vpy = vy;
  if (forcing == 1u) { // li-sigma
    let denom = (tau - 0.5) * max(psi_c * psi_c, u.eps_psi2);
    let corr = u.sigma / denom;
    vpx = vx + corr * fx;
    vpy = vy + corr * fy;
  }

  let u2 = vx * vx + vy * vy;
  let rho_m1 = rho - 1.0;
  let src_pref = 1.0 - 0.5 * inv_tau;
  for (var k = 0u; k < 9u; k = k + 1u) {
    let cu = 3.0 * (CXF[k] * vx + CYF[k] * vy);
    let feq = WQ[k] * (rho_m1 + rho * (cu + 0.5 * cu * cu - 1.5 * u2));
    var fstar = f[k] - inv_tau * (f[k] - feq);
    if (forcing != 2u) {
      var cf = 3.0 * ((CXF[k] - vpx) * fx + (CYF[k] - vpy) * fy);
      let cvp = CXF[k] * vpx + CYF[k] * vpy;
      cf = cf + 9.0 * cvp * (CXF[k] * fx + CYF[k] * fy);
      fstar = fstar + src_pref * WQ[k] * cf;
    }
    f_out[k * n2 + idx] = fstar;
  }
  macro_out[idx] = vec4<f32>(rho, out_vx, out_vy, 0.0);
}

// Brush painting: walls with wettability (rho_w) or erase. Runs on demand.
@compute @workgroup_size(8, 8)
fn paint(@builtin(global_invocation_id) gid : vec3<u32>) {
  if (gid.x >= u.nx || gid.y >= u.ny) { return; }
  let dx = f32(gid.x) - u.brush_x;
  let dy = f32(gid.y) - u.brush_y;
  if (dx * dx + dy * dy > u.brush_r2) { return; }
  let idx = gid.x * u.ny + gid.y;
  if (u.brush_mode > 0.5) {
    let rw = u32(clamp(u.brush_rho_w, 0.0, 4.0) * (65535.0 / 4.0));
    flags_buf[idx] = 1u | (rw << 16u);
  } else {
    if (is_solid(idx)) {
      flags_buf[idx] = 0u;
      // refill erased cells at rest with the scene vapor density
      // (delivered via brush_rho_w in erase mode) so the sim stays finite
      let n2 = u.nx * u.ny;
      for (var k = 0u; k < 9u; k = k + 1u) {
        f_out[k * n2 + idx] = WQ[k] * (u.brush_rho_w - 1.0);
      }
    }
  }
}

fn hash01(x : u32) -> f32 {
  var h = x;
  h = h ^ (h >> 16u);
  h = h * 0x7feb352du;
  h = h ^ (h >> 15u);
  h = h * 0x846ca68bu;
  h = h ^ (h >> 16u);
  return f32(h & 0x00ffffffu) / 16777216.0;
}

// Tracer advection (ungated cosmetics): bilinear-sample u, respawn by hash.
@compute @workgroup_size(64)
fn tracer_step(@builtin(global_invocation_id) gid : vec3<u32>) {
  let t = gid.x;
  if (t >= u.n_tracers) { return; }
  var p = tracers[t];
  let fx = clamp(p.x, 0.0, f32(u.nx) - 1.001);
  let fy = clamp(p.y, 0.0, f32(u.ny) - 1.001);
  let i0 = u32(fx);
  let j0 = u32(fy);
  let ax = fx - f32(i0);
  let ay = fy - f32(j0);
  let i1 = min(i0 + 1u, u.nx - 1u);
  let j1 = min(j0 + 1u, u.ny - 1u);
  let m00 = macro_out[i0 * u.ny + j0];
  let m10 = macro_out[i1 * u.ny + j0];
  let m01 = macro_out[i0 * u.ny + j1];
  let m11 = macro_out[i1 * u.ny + j1];
  let vx = mix(mix(m00.y, m10.y, ax), mix(m01.y, m11.y, ax), ay);
  let vy = mix(mix(m00.z, m10.z, ax), mix(m01.z, m11.z, ax), ay);
  let rho = mix(mix(m00.x, m10.x, ax), mix(m01.x, m11.x, ax), ay);
  p.x = p.x + vx * u.tracer_dt;
  p.y = p.y + vy * u.tracer_dt;
  p.z = p.z + 0.016; // age
  p.w = rho;
  let wrapped_x = p.x < 0.0 || p.x >= f32(u.nx);
  let wrapped_y = p.y < 0.0 || p.y >= f32(u.ny);
  if (wrapped_x || wrapped_y || p.z > 6.0) {
    let seed = t * 747796405u + u.frame * 2891336453u;
    p = vec4<f32>(
      hash01(seed) * f32(u.nx),
      hash01(seed ^ 0x9e3779b9u) * f32(u.ny),
      hash01(seed ^ 0x85ebca6bu) * 3.0,
      1.0);
  }
  tracers[t] = p;
}
