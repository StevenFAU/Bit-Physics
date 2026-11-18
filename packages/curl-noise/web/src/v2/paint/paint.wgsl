// Flow Sculpture — Paint the Stream (06-curl-noise.md, "Signature moment").
//
// The visitor paints a height map ψ (the stream function) on a periodic N×N
// grid; particles flow along its contour lines. The velocity is the rotated
// gradient of ψ's uniform cubic B-spline,
//     v = (∂ψ/∂y, −∂ψ/∂x),
// so ∇·v = ∂²ψ/∂x∂y − ∂²ψ/∂y∂x = 0 for the interpolant itself (its mixed
// partials are the same sum), and v·∇ψ = 0: particles move along the
// contours. FieldView2D draws the map with the same B-spline (Sigg &
// Hadwiger), so the contour lines on screen are the particles' streamlines.
//
// Units: positions in cells, ψ in cells² per second, so v is in cells per
// second and equal steps of ψ between contour lines carry equal flow.
//
// Kernels: `stamp` (a brush stroke's dab, ping-ponged through psi_tmp and
// copied back), `seed`, `anchor` (after the map changed) and `advect` (RK4,
// one Newton step back onto the particle's contour, respawn by age). A
// particle's draws are counter hashes of (seed, particle, restart count):
// the same seed gives the same bytes. No builtin sin/cos/exp anywhere.

struct PaintU {
  // x = N, y = particles, z = seed, w = steps in this dispatch
  dims: vec4<u32>,
  // x = dt (s), y = life (s), z = reproject (1/0), w = unused
  step: vec4<f32>,
  // xy = dab centre (cells), z = radius (cells), w = amount (ψ units; raise > 0, lower < 0)
  brush: vec4<f32>,
  // x = mode (0 raise/lower, 1 smooth), y = smoothing strength (0–1)
  brush2: vec4<f32>,
};

@group(0) @binding(0) var<uniform> U: PaintU;
@group(0) @binding(1) var<storage, read_write> psi: array<f32>;
@group(0) @binding(2) var<storage, read_write> psi_tmp: array<f32>;
// x, y (cells), ψ₀ (the contour it rides), age (s)
@group(0) @binding(3) var<storage, read_write> parts: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read_write> restarts: array<u32>;

// Offsets are only −1 … +2 and coordinates stay in [0, N): wrap with a
// compare, not % (several times slower in stencils on GPUs).
fn wrap_i(i: i32) -> i32 {
  let n = i32(U.dims.x);
  return select(select(i, i - n, i >= n), i + n, i < 0);
}
fn wrap_p(p: vec2<f32>) -> vec2<f32> {
  let n = f32(U.dims.x);
  return p - n * floor(p / n);
}
fn at(i: i32, j: i32) -> f32 {
  return psi[u32(wrap_i(j)) * U.dims.x + u32(wrap_i(i))];
}

// uniform cubic B-spline weights, and their first and second derivatives
fn bw(t: f32) -> vec4<f32> {
  let s = 1.0 - t;
  let t2 = t * t;
  let t3 = t2 * t;
  return vec4<f32>(s * s * s, 3.0 * t3 - 6.0 * t2 + 4.0, -3.0 * t3 + 3.0 * t2 + 3.0 * t + 1.0, t3) / 6.0;
}
fn bd(t: f32) -> vec4<f32> {
  let s = 1.0 - t;
  let t2 = t * t;
  return vec4<f32>(-s * s, 3.0 * t2 - 4.0 * t, -3.0 * t2 + 2.0 * t + 1.0, t2) * 0.5;
}

struct Psi {
  v: f32,
  gx: f32,
  gy: f32,
};

/** ψ and its gradient at p (cells), from the 4×4 B-spline neighbourhood. */
fn psi_eval(p_in: vec2<f32>) -> Psi {
  let p = wrap_p(p_in);
  let c = floor(p);
  let t = p - c;
  let i0 = i32(c.x) - 1;
  let j0 = i32(c.y) - 1;
  let wx = bw(t.x);
  let wy = bw(t.y);
  let dx = bd(t.x);
  let dy = bd(t.y);
  var o: Psi;
  o.v = 0.0;
  o.gx = 0.0;
  o.gy = 0.0;
  for (var j = 0; j < 4; j++) {
    let r = vec4<f32>(at(i0, j0 + j), at(i0 + 1, j0 + j), at(i0 + 2, j0 + j), at(i0 + 3, j0 + j));
    let row_v = dot(wx, r);
    let row_d = dot(dx, r);
    o.v += wy[j] * row_v;
    o.gx += wy[j] * row_d;
    o.gy += dy[j] * row_v;
  }
  return o;
}

/** The velocity: ψ's gradient turned a quarter turn. */
fn vel(p: vec2<f32>) -> vec2<f32> {
  let s = psi_eval(p);
  return vec2<f32>(s.gy, -s.gx);
}

fn pt_pcg(v: u32) -> u32 {
  let s = v * 747796405u + 2891336453u;
  let w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}
fn pt_u01(h: u32) -> f32 {
  return f32(h >> 8u) * (1.0 / 16777216.0);
}

/** A uniform point of the torus for particle i's e-th start. */
fn pt_spawn(i: u32, e: u32) -> vec2<f32> {
  let h0 = pt_pcg((i * 0x9E3779B9u) ^ pt_pcg((e * 0x85EBCA6Bu) ^ pt_pcg(U.dims.z)));
  let h1 = pt_pcg(h0 ^ 0x68E31DA4u);
  let n = f32(U.dims.x);
  return vec2<f32>(pt_u01(h0), pt_u01(h1)) * n;
}
fn pt_life(i: u32, e: u32) -> f32 {
  return U.step.y * (0.6 + 0.4 * pt_u01(pt_pcg((i * 0x27D4EB2Fu) ^ (e * 0x165667B1u + 7u))));
}

/** One Newton step back onto {ψ = ψ₀} along ∇ψ (none where ψ is flat). */
fn onto_contour(p: vec2<f32>, psi0: f32) -> vec2<f32> {
  let s = psi_eval(p);
  let g = vec2<f32>(s.gx, s.gy);
  let g2 = dot(g, g);
  if (g2 < 1e-12) { return p; }
  return p - ((s.v - psi0) / g2) * g;
}

@compute @workgroup_size(256)
fn advect(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= U.dims.y) { return; }
  var q = parts[i];
  var p = q.xy;
  var psi0 = q.z;
  var age = q.w;
  var e = restarts[i];
  let dt = U.step.x;
  for (var s = 0u; s < U.dims.w; s++) {
    age = age + dt;
    let k1 = vel(p);
    let k2 = vel(p + 0.5 * dt * k1);
    let k3 = vel(p + 0.5 * dt * k2);
    let k4 = vel(p + dt * k3);
    p = wrap_p(p + (dt / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4));
    if (U.step.z > 0.5) {
      p = wrap_p(onto_contour(p, psi0));
    }
    if (age > pt_life(i, e) || any(p != p)) {
      e = e + 1u;
      p = pt_spawn(i, e);
      psi0 = psi_eval(p).v;
      age = 0.0;
    }
  }
  parts[i] = vec4<f32>(p, psi0, age);
  restarts[i] = e;
}

@compute @workgroup_size(256)
fn seed(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= U.dims.y) { return; }
  let p = pt_spawn(i, 0u);
  let life = pt_life(i, 0u);
  let age = life * pt_u01(pt_pcg(i ^ 0xA511E9B3u ^ (U.dims.z * 0x63D83595u)));
  parts[i] = vec4<f32>(p, psi_eval(p).v, age);
  restarts[i] = 0u;
}

// after the map changed: each particle now rides the contour through where it is
@compute @workgroup_size(256)
fn anchor(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= U.dims.y) { return; }
  let q = parts[i];
  parts[i] = vec4<f32>(q.xy, psi_eval(q.xy).v, q.w);
}

/** Squared distance on the torus (nearest image). */
fn torus_d2(a: vec2<f32>, b: vec2<f32>) -> f32 {
  let n = f32(U.dims.x);
  var d = abs(a - b);
  d = min(d, vec2<f32>(n) - d);
  return dot(d, d);
}

// One brush dab over the whole grid into psi_tmp (copied back after). The
// dab's profile is a smooth bump (1 − r²/R²)³ — compact, no exp.
@compute @workgroup_size(16, 16)
fn stamp(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = U.dims.x;
  if (gid.x >= n || gid.y >= n) { return; }
  let i = i32(gid.x);
  let j = i32(gid.y);
  let here = at(i, j);
  let r2 = torus_d2(vec2<f32>(f32(i), f32(j)), U.brush.xy);
  let R2 = U.brush.z * U.brush.z;
  var out = here;
  if (r2 < R2) {
    let u = 1.0 - r2 / R2;
    let w = u * u * u;
    if (U.brush2.x < 0.5) {
      out = here + U.brush.w * w;
    } else {
      let avg = (at(i - 1, j) + at(i + 1, j) + at(i, j - 1) + at(i, j + 1) + 4.0 * here
        + 0.5 * (at(i - 1, j - 1) + at(i + 1, j - 1) + at(i - 1, j + 1) + at(i + 1, j + 1))) / 10.0;
      out = here + U.brush2.y * w * (avg - here);
    }
  }
  psi_tmp[gid.y * n + gid.x] = out;
}

// ---- Prove: the 2D identities at probe points --------------------------------
// Divergence of v from its own derivatives, each in its own summation order:
// ∂v_x/∂x = Σ_j dy_j Σ_i dx_i ψ (rows first), ∂v_y/∂y = −Σ_i dx_i Σ_j dy_j ψ
// (columns first). For the interpolant they are the same number with opposite
// signs; what is left is f32 rounding of the sixteen terms summed, so the
// yardstick is their size Σ|dx_i dy_j ψ_ij| (the terms cancel: ψ is large,
// its slope is not). Also v·∇ψ, and |v|.
@group(0) @binding(5) var<storage, read> probes: array<vec2<f32>>;
@group(0) @binding(6) var<storage, read_write> probe_out: array<vec4<f32>>;

@compute @workgroup_size(64)
fn probe(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= arrayLength(&probes)) { return; }
  let p = wrap_p(probes[gid.x]);
  let c = floor(p);
  let t = p - c;
  let i0 = i32(c.x) - 1;
  let j0 = i32(c.y) - 1;
  let dx = bd(t.x);
  let dy = bd(t.y);
  // rows first: for each row j, Σ_i dx_i ψ(i, j); then Σ_j dy_j ·
  var dvx_dx = 0.0;
  var terms = 0.0;
  for (var j = 0; j < 4; j++) {
    let r = vec4<f32>(at(i0, j0 + j), at(i0 + 1, j0 + j), at(i0 + 2, j0 + j), at(i0 + 3, j0 + j));
    dvx_dx += dy[j] * dot(dx, r);
    terms += abs(dy[j]) * dot(abs(dx), abs(r));
  }
  // columns first: for each column i, Σ_j dy_j ψ(i, j); then Σ_i dx_i ·
  var dvy_dy = 0.0;
  for (var k = 0; k < 4; k++) {
    let col = vec4<f32>(at(i0 + k, j0), at(i0 + k, j0 + 1), at(i0 + k, j0 + 2), at(i0 + k, j0 + 3));
    dvy_dy -= dx[k] * dot(dy, col);
  }
  let s = psi_eval(p);
  let v = vec2<f32>(s.gy, -s.gx);
  probe_out[gid.x] = vec4<f32>(dvx_dx + dvy_dy, terms, dot(v, vec2<f32>(s.gx, s.gy)), length(v));
}
