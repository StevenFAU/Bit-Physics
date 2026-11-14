// Flow Sculpture — the live tracers (06-curl-noise.md, "The model").
//
// Concatenated AFTER the gated field core (src/field.wgsl: FU at
// @group(0) @binding(0), curl_velocity, reproject_step, iso_vals), so the
// picture moves through the gated field's own arithmetic. The RK4 step and
// the reprojection below are written character for character as the gated
// `advect` (src/tracers.wgsl, wrap off): run with respawn off on the gate's
// initial condition, this kernel gives the gate's positions byte for byte
// (Prove, "The picture runs the gated arithmetic").
//
// One dispatch is one step (its field and live uniforms ride a dynamic-offset
// ring, one slot per step, so a frame's steps each see their own time and the
// result never depends on how steps are grouped into frames). Each thread
// runs `substeps` steps (1 in the page) and writes one ribbon row per step into
// the Silk history ring (slot-major: ring[slot * count + i]); w carries the
// strand's epoch (an integer, +1 at every respawn, mod 1024) plus its life
// fraction, so the renderer can break a strand where a particle restarted.
//
// Silk seeds its particles on a few sheets {f₂ = c}: each particle is
// confined to its sheet (v·∇f₂ = 0), so a sheet's ribbons stay one coherent,
// folding surface. Dust (the volume mode) fills the ball evenly.
//
// Respawn (display only, never in the gate-equivalent mode). In the volume
// mode the ball the particles live in is a window onto an endless, evenly
// filled flow:
//   * a particle that ages out restarts at a uniform point of the ball
//     (outside the obstacle) — a birth somewhere in the endless flow;
//   * a particle that leaves the ball re-enters where the flow comes in, at a
//     boundary point drawn in proportion to the inflow v·n < 0 (rejection
//     sampling), with a random age. Incompressibility makes the outflow and
//     the inflow through the ball's surface exactly equal (∮ v·n dA = 0), so
//     this keeps the density even inside the ball;
//   * a particle found inside the obstacle (rounding) restarts like the first.
// On sheets, every restart is a new point of the particle's own sheet.
// Every draw is a counter hash of (seed, tracer, epoch): the same seed gives
// the same bytes.

struct LiveU {
  // x = dt, y = max age (sim time), z = inflow speed bound, w = ball radius
  step: vec4<f32>,
  // x = count, y = substeps this dispatch, z = first ring slot, w = ring slots
  dims: vec4<u32>,
  // x = respawn on, y = reproject on, z = seed, w = 1: particles live on sheets (else the volume)
  flags: vec4<u32>,
  // xyz = centre of the flow's ball, w = obstacle margin
  centre: vec4<f32>,
  // x = number of sheets (1–3), yzw = their f₂ values
  sheets: vec4<f32>,
};

@group(0) @binding(1) var<uniform> L: LiveU;
@group(0) @binding(2) var<storage, read_write> tracers: array<vec4<f32>>; // xyz pos, w age
@group(0) @binding(3) var<storage, read_write> f0buf: array<vec2<f32>>;   // per-tracer iso anchors
@group(0) @binding(4) var<storage, read_write> ring: array<vec4<f32>>;    // Silk history
@group(0) @binding(5) var<storage, read_write> epochs: array<u32>;        // respawn count per tracer

fn lv_pcg(v: u32) -> u32 {
  let s = v * 747796405u + 2891336453u;
  let w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}
fn lv_u01(h: u32) -> f32 {
  return f32(h >> 8u) * (1.0 / 16777216.0);
}

struct LvRng { s: u32 }
fn lv_next(r: ptr<function, LvRng>) -> f32 {
  (*r).s = lv_pcg((*r).s ^ 0x9E3779B9u);
  return lv_u01((*r).s);
}
fn lv_rng(i: u32, e: u32, salt: u32) -> LvRng {
  var r: LvRng;
  r.s = lv_pcg((i * 0x85EBCA6Bu) ^ lv_pcg((e * 0xC2B2AE35u) ^ lv_pcg(L.flags.z ^ salt)));
  return r;
}

/** A uniform direction (polynomial trig from field.wgsl). */
fn lv_dir(r: ptr<function, LvRng>) -> vec3<f32> {
  let z = 2.0 * lv_next(r) - 1.0;
  let cs = cs_p(6.283185307179586 * lv_next(r));
  let s = sqrt(max(0.0, 1.0 - z * z));
  return vec3<f32>(s * cs.x, s * cs.y, z);
}

fn lv_in_obstacle(p: vec3<f32>) -> bool {
  return F.obs.w > 0.0 && length(p - F.obs.xyz) < F.obs.w + L.centre.w;
}

/** A point uniform in the ball, outside the obstacle. */
fn lv_spawn_volume(i: u32, e: u32) -> vec3<f32> {
  var r = lv_rng(i, e, 0x1B873593u);
  var p = L.centre.xyz;
  for (var k = 0u; k < 8u; k++) {
    let d = lv_dir(&r);
    p = L.centre.xyz + (L.step.w * pow(lv_next(&r), 1.0 / 3.0)) * d;
    if (!lv_in_obstacle(p)) { break; }
  }
  return p;
}

/**
 * A point on the ball's surface drawn in proportion to the inflow there
 * (rejection against the bound L.step.z, at most 8 draws — a thread that
 * respawns stalls its whole warp, so the loop is short). Falls back to the volume.
 */
fn lv_spawn_inflow(i: u32, e: u32) -> vec3<f32> {
  var r = lv_rng(i, e, 0xE6546B64u);
  for (var k = 0u; k < 8u; k++) {
    let n = lv_dir(&r);
    let p = L.centre.xyz + (L.step.w * 0.9995) * n;
    let vn = -dot(curl_velocity(p), n);
    if (vn > 0.0 && lv_next(&r) * L.step.z < vn) {
      return p;
    }
  }
  return lv_spawn_volume(i, e ^ 0x5555u);
}

/** The f₂ value of particle i's sheet. */
fn lv_sheet_value(i: u32) -> f32 {
  let k = i % max(u32(L.sheets.x), 1u);
  return select(select(L.sheets.w, L.sheets.z, k == 1u), L.sheets.y, k == 0u);
}

/**
 * A point on particle i's sheet {f₂ = c}: a uniform point of the ball moved
 * onto the surface by Newton steps along ∇f₂ (f₂ is the second noise channel
 * itself, field.wgsl fbm_d2(x, 1)). A few tries; the last one stands.
 */
fn lv_spawn_sheet(i: u32, e: u32) -> vec3<f32> {
  let c = lv_sheet_value(i);
  var p = L.centre.xyz;
  for (var t = 0u; t < 4u; t++) {
    p = lv_spawn_volume(i, e * 4u + t + 0x2000u);
    for (var k = 0u; k < 6u; k++) {
      let n = fbm_d2(p, 1u);
      let g2 = max(dot(n.grad, n.grad), 1e-12);
      var d = (n.val - c) / g2 * n.grad;
      let dl = length(d);
      if (dl > 0.06) { d = d * (0.06 / dl); }
      p = p - d;
    }
    let f = fbm_d2(p, 1u).val;
    if (abs(f - c) < 1e-4 && length(p - L.centre.xyz) < L.step.w * 0.98 && !lv_in_obstacle(p)) { break; }
  }
  return p;
}

/** A restart point: on the particle's sheet, or anywhere in the ball. */
fn lv_spawn(i: u32, e: u32) -> vec3<f32> {
  if (L.flags.w == 1u) { return lv_spawn_sheet(i, e); }
  return lv_spawn_volume(i, e);
}

/** This particle's own lifetime: 60–100 % of the max age. */
fn lv_life(i: u32, e: u32) -> f32 {
  return L.step.y * (0.6 + 0.4 * lv_u01(lv_pcg((i * 0x27D4EB2Fu) ^ (e * 0x165667B1u + 7u))));
}

fn lv_ring_w(e: u32, age: f32, life: f32) -> f32 {
  return f32(e % 1024u) + clamp(age / max(life, 1e-6), 0.0, 0.999);
}

@compute @workgroup_size(256)
fn live_advect(@builtin(global_invocation_id) g: vec3<u32>) {
  let i = g.x;
  if (i >= L.dims.x) { return; }
  var t = tracers[i];
  var p = t.xyz;
  var age = t.w;
  var e = epochs[i];
  var f0 = f0buf[i];
  for (var s = 0u; s < L.dims.y; s++) {
    age = age + L.step.x;
    let k1 = curl_velocity(p);
    let k2 = curl_velocity(p + 0.5 * L.step.x * k1);
    let k3 = curl_velocity(p + 0.5 * L.step.x * k2);
    let k4 = curl_velocity(p + L.step.x * k3);
    p = p + (L.step.x / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4);
    if (L.flags.y == 1u && u32(F.kind.x) == 0u) {
      p = reproject_step(p, f0);
    } else if (L.flags.w == 1u) {
      // an evolving field moves the sheets: follow yours (display only)
      let n = fbm_d2(p, 1u);
      p = p - (n.val - f0.y) / max(dot(n.grad, n.grad), 1e-12) * n.grad;
    }
    if (L.flags.x == 1u) {
      let left = length(p - L.centre.xyz) > L.step.w;
      let bad = lv_in_obstacle(p) || any(p != p);
      if (age > lv_life(i, e) || left || bad) {
        e = e + 1u;
        if (left && !bad && L.flags.w == 0u) {
          p = lv_spawn_inflow(i, e);
          age = lv_life(i, e) * lv_u01(lv_pcg(i ^ (e * 0x63D83595u)));
        } else {
          p = lv_spawn(i, e);
          age = 0.0;
        }
        f0 = iso_vals(p);
        if (L.flags.w == 1u) { f0.y = lv_sheet_value(i); }
      }
    }
    if (L.dims.w > 0u) {
      let slot = (L.dims.z + s) % L.dims.w;
      ring[slot * L.dims.x + i] = vec4<f32>(p, lv_ring_w(e, age, lv_life(i, e)));
    }
  }
  tracers[i] = vec4<f32>(p, age);
  epochs[i] = e;
  f0buf[i] = f0;
}

// seed every particle evenly in the ball, at a random point of its life
@compute @workgroup_size(256)
fn live_seed(@builtin(global_invocation_id) g: vec3<u32>) {
  let i = g.x;
  if (i >= L.dims.x) { return; }
  let p = lv_spawn(i, 0u);
  let life = lv_life(i, 0u);
  let age = life * lv_u01(lv_pcg(i ^ 0xA511E9B3u ^ (L.flags.z * 0x63D83595u)));
  tracers[i] = vec4<f32>(p, age);
  epochs[i] = 0u;
  var f0 = iso_vals(p);
  if (L.flags.w == 1u) { f0.y = lv_sheet_value(i); }
  f0buf[i] = f0;
}

// re-anchor the iso values (after the field changed)
@compute @workgroup_size(256)
fn live_anchor(@builtin(global_invocation_id) g: vec3<u32>) {
  let i = g.x;
  if (i >= L.dims.x) { return; }
  f0buf[i] = iso_vals(tracers[i].xyz);
}
