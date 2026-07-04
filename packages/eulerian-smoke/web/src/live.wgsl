// Eulerian smoke — LIVE-LOOP-ONLY effect kernels (web presentation layer).
//
// Everything in this module is gate-inert by construction (spec § 3.2/§ 3.3):
// these entry points are dispatched ONLY by the live RAF loop — the canonical
// capture/gate path steps exclusively through the committed
// packages/eulerian-smoke/src/stable_fluids_2d.wgsl sequence and never
// dispatches any of these. Splats, buoyancy, 2D vorticity confinement (an
// aesthetic web-only addition — the 2D reference has NO confinement),
// dissipation, the velocity-masking obstacle toy, and the decoupled high-res
// dye all live here.

struct LiveParams {
  n: u32,          // sim grid side
  dye_n: u32,      // dye grid side (decoupled, higher res)
  dt: f32,
  dx: f32,
  dt_dx_dye: f32,  // dt / dx_dye = dt * dye_n — dye backtrace scale (dye grid units)
  buoyancy: f32,   // upward force coefficient on density (plume scenes)
  confine_eps: f32,// 2D vorticity-confinement strength (aesthetic; 0 = off)
  dissipate_vel: f32,   // Pavel-style 1/(1+dt*k) decay
  dissipate_dye: f32,
  inflow_u: f32,   // Kármán-scene inflow speed (0 = no inflow)
  pad0: f32,
  pad1: f32,
};

struct Splat {
  pos: vec2<f32>,     // grid coords (sim units, 0..n)
  delta_v: vec2<f32>, // velocity impulse
  color: vec4<f32>,   // dye color (rgb) + density amount (a)
  radius: f32,        // gaussian radius in sim cells
  pad0: f32,
  pad1: f32,
  pad2: f32,
};

struct Splats {
  count: u32,
  pad0: u32,
  pad1: u32,
  pad2: u32,
  items: array<Splat, 8>,
};

@group(0) @binding(0) var<uniform> lp: LiveParams;
@group(0) @binding(1) var<uniform> splats: Splats;
@group(0) @binding(2) var<storage, read_write> vel: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read_write> density: array<f32>;
@group(0) @binding(4) var<storage, read> curl_in: array<f32>;
@group(0) @binding(5) var<storage, read> dye_in: array<vec4<f32>>;
@group(0) @binding(6) var<storage, read_write> dye_out: array<vec4<f32>>;
@group(0) @binding(7) var<storage, read> vel_read: array<vec2<f32>>;
@group(0) @binding(8) var<storage, read> mask: array<f32>;

fn wrap(i: i32, n: i32) -> i32 {
  let m = i % n;
  return select(m, m + n, m < 0);
}

fn sim_idx(i: i32, j: i32) -> u32 {
  let n = i32(lp.n);
  return u32(wrap(i, n)) * lp.n + u32(wrap(j, n));
}

// Periodic minimum-image displacement (splats wrap across the torus).
fn torus_delta(a: f32, b: f32, n: f32) -> f32 {
  var d = a - b;
  if (d > 0.5 * n) { d -= n; }
  if (d < -0.5 * n) { d += n; }
  return d;
}

// --- splats: velocity impulse + density at sim res -------------------------
@compute @workgroup_size(8, 8, 1)
fn splat_sim(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= lp.n || gid.y >= lp.n) { return; }
  let idx = gid.x * lp.n + gid.y;
  let p = vec2<f32>(f32(gid.x) + 0.5, f32(gid.y) + 0.5);
  var v = vel[idx];
  var d = density[idx];
  let n = f32(lp.n);
  for (var s = 0u; s < splats.count; s += 1u) {
    let sp = splats.items[s];
    let dxs = torus_delta(p.x, sp.pos.x, n);
    let dys = torus_delta(p.y, sp.pos.y, n);
    let g = exp(-(dxs * dxs + dys * dys) / max(sp.radius * sp.radius, 1e-4));
    v += sp.delta_v * g;
    d += sp.color.a * g;
  }
  vel[idx] = v;
  density[idx] = d;
}

// --- splats: dye color at dye res -------------------------------------------
@compute @workgroup_size(8, 8, 1)
fn splat_dye(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= lp.dye_n || gid.y >= lp.dye_n) { return; }
  let idx = gid.x * lp.dye_n + gid.y;
  let scale = f32(lp.n) / f32(lp.dye_n);
  let p = (vec2<f32>(f32(gid.x) + 0.5, f32(gid.y) + 0.5)) * scale; // sim units
  var c = dye_out[idx];
  let n = f32(lp.n);
  for (var s = 0u; s < splats.count; s += 1u) {
    let sp = splats.items[s];
    let dxs = torus_delta(p.x, sp.pos.x, n);
    let dys = torus_delta(p.y, sp.pos.y, n);
    let g = exp(-(dxs * dxs + dys * dys) / max(sp.radius * sp.radius, 1e-4));
    // rgb injection scales with the splat amount (alpha) — emitters run every
    // frame, so unscaled color would saturate the accumulating dye field
    c = vec4<f32>(c.rgb + sp.color.rgb * sp.color.a * g, min(c.a + sp.color.a * g, 4.0));
  }
  dye_out[idx] = c;
}

// --- decoupled dye advection: SL backtrace at dye res, velocity sampled
//     bilinearly from the sim grid (PavelDoGreat decoupling; passive tracer,
//     presentation-only). Includes the same fraction-complete FP-edge guard.
fn backtrace_dye(pos: f32, velcomp: f32, n: f32) -> f32 {
  var x = pos - velcomp * lp.dt_dx_dye;
  x = x - floor(x / n) * n;
  if (x >= n) { x = 0.0; }
  return x;
}

fn sample_vel_sim(p_dye: vec2<f32>) -> vec2<f32> {
  // p_dye in dye grid units -> sim grid units (cell centers at integer+0.5)
  let scale = f32(lp.n) / f32(lp.dye_n);
  let q = p_dye * scale - vec2<f32>(0.5, 0.5);
  let i0 = i32(floor(q.x));
  let j0 = i32(floor(q.y));
  let f = q - vec2<f32>(floor(q.x), floor(q.y));
  let f00 = vel_read[sim_idx(i0, j0)];
  let f01 = vel_read[sim_idx(i0, j0 + 1)];
  let f10 = vel_read[sim_idx(i0 + 1, j0)];
  let f11 = vel_read[sim_idx(i0 + 1, j0 + 1)];
  return mix(mix(f00, f10, f.x), mix(f01, f11, f.x), f.y);
}

@compute @workgroup_size(8, 8, 1)
fn advect_dye(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= lp.dye_n || gid.y >= lp.dye_n) { return; }
  let idx = gid.x * lp.dye_n + gid.y;
  let nd = f32(lp.dye_n);
  let pc = vec2<f32>(f32(gid.x) + 0.5, f32(gid.y) + 0.5);
  let v = sample_vel_sim(pc);
  let xb = backtrace_dye(f32(gid.x), v.x, nd);
  let yb = backtrace_dye(f32(gid.y), v.y, nd);
  let i0 = i32(floor(xb));
  let j0 = i32(floor(yb));
  let fx = xb - f32(i0);
  let fy = yb - f32(j0);
  let ndye = i32(lp.dye_n);
  let f00 = dye_in[u32(wrap(i0, ndye)) * lp.dye_n + u32(wrap(j0, ndye))];
  let f01 = dye_in[u32(wrap(i0, ndye)) * lp.dye_n + u32(wrap(j0 + 1, ndye))];
  let f10 = dye_in[u32(wrap(i0 + 1, ndye)) * lp.dye_n + u32(wrap(j0, ndye))];
  let f11 = dye_in[u32(wrap(i0 + 1, ndye)) * lp.dye_n + u32(wrap(j0 + 1, ndye))];
  let adv = (1.0 - fx) * (1.0 - fy) * f00 + (1.0 - fx) * fy * f01
          + fx * (1.0 - fy) * f10 + fx * fy * f11;
  // Pavel-style dissipation folded into the advection pass
  dye_out[idx] = adv / (1.0 + lp.dt * lp.dissipate_dye);
}

// --- buoyancy: vel.y += dt * buoyancy * density (plume scenes) ---------------
@compute @workgroup_size(8, 8, 1)
fn buoyancy(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= lp.n || gid.y >= lp.n) { return; }
  let idx = gid.x * lp.n + gid.y;
  var v = vel[idx];
  v.y += lp.dt * lp.buoyancy * density[idx];
  vel[idx] = v;
}

// --- 2D vorticity confinement (AESTHETIC, web-only; the 2D reference has no
//     confinement — Fedkiw-2001 formula specialized to 2D, non-physical
//     forcing that visibly worsens energy conservation; OFF during any
//     canonical/energy-diagnostic run). Reads the curl buffer the fused
//     divergence_curl pass already produced.
@compute @workgroup_size(8, 8, 1)
fn confine(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= lp.n || gid.y >= lp.n) { return; }
  let i = i32(gid.x);
  let j = i32(gid.y);
  let idx = gid.x * lp.n + gid.y;
  let w = curl_in[idx];
  let gx = abs(curl_in[sim_idx(i + 1, j)]) - abs(curl_in[sim_idx(i - 1, j)]);
  let gy = abs(curl_in[sim_idx(i, j + 1)]) - abs(curl_in[sim_idx(i, j - 1)]);
  let mag = sqrt(gx * gx + gy * gy) + 1e-5;
  let nx = gx / mag;
  let ny = gy / mag;
  var v = vel[idx];
  v += lp.dt * lp.confine_eps * lp.dx * vec2<f32>(ny * w, -nx * w);
  vel[idx] = v;
}

// --- dissipation (live-loop only; Pavel form) --------------------------------
@compute @workgroup_size(8, 8, 1)
fn dissipate(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= lp.n || gid.y >= lp.n) { return; }
  let idx = gid.x * lp.n + gid.y;
  vel[idx] = vel[idx] / (1.0 + lp.dt * lp.dissipate_vel);
  density[idx] = density[idx] / (1.0 + lp.dt * lp.dissipate_dye);
}

// --- obstacle toy: velocity masking + optional inflow strip (Kármán scene).
//     Labeled exploratory in the UI: velocity is zeroed inside painted solid
//     cells AFTER projection (the pressure solve does not see the mask), and
//     an inflow band maintains a constant stream. Interior-BC toy, not a port
//     — the reference has no wall BCs at all.
@compute @workgroup_size(8, 8, 1)
fn obstacle_apply(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= lp.n || gid.y >= lp.n) { return; }
  let idx = gid.x * lp.n + gid.y;
  var v = vel[idx] * (1.0 - mask[idx]);
  if (lp.inflow_u != 0.0 && gid.x < 3u) {
    v = vec2<f32>(lp.inflow_u, 0.0);
  }
  vel[idx] = v;
  density[idx] = density[idx] * (1.0 - mask[idx]);
}
