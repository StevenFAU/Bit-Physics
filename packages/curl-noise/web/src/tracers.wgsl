// curl-noise — tracer cloud: analytic per-tracer advection + stretched-
// sprite render (schrodinger-smoke tracers.wgsl lineage; the velocity
// texture read is replaced by the inline analytic curl_velocity() — the
// one-line swap the spec § 1 promised, keeping incompressibility
// exact-in-continuum with no texture bake, per Curl-Flow).
//
// Concatenated AFTER field.wgsl at pipeline build (shares FU + helpers).

struct TU {
  view: mat4x4<f32>,
  proj: mat4x4<f32>,
  dt: f32,
  count: u32,
  color_mode: u32,   // 0 speed, 1 angle-hue (cyclic), 2 age, 3 iso-residual
  size: f32,
  speed_scale: f32,
  respawn_seed: u32,
  max_age: f32,
  rk4: u32,
  glow: f32,
  wrap: u32,         // display wraps [0,1)^3; the GATE capture must NOT
  reproject: u32,    // 1 = one Newton iteration per step (crossprod)
  stretch: f32,      // velocity-stretch factor (sprite elongation)
  seed_type: u32,    // 0 box, 1 ball, 2 slab-x, 3 disk-x
  exposure: f32,
  seed_center: vec3<f32>,
  seed_radius: f32,
  pad0: vec3<f32>,
  seed_thick: f32,
}

@group(0) @binding(1) var<uniform> T: TU;
@group(0) @binding(2) var<storage, read_write> tracers: array<vec4<f32>>; // xyz pos, w age
@group(0) @binding(3) var<storage, read_write> f0buf: array<vec2<f32>>;   // per-tracer iso values

fn pcg(v: u32) -> u32 {
  var s = v * 747796405u + 2891336453u;
  let w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}
fn rand01(seed: u32) -> f32 {
  return f32(pcg(seed)) / 4294967295.0;
}

fn maybe_wrap(p: vec3<f32>) -> vec3<f32> {
  if (T.wrap == 1u) { return fract(p); }
  return p;
}

@compute @workgroup_size(256)
fn advect(@builtin(global_invocation_id) g: vec3<u32>) {
  if (g.x >= T.count) { return; }
  var t = tracers[g.x];
  var p = t.xyz;
  var age = t.w + T.dt;
  if (T.rk4 == 1u) {
    let k1 = curl_velocity(p);
    let k2 = curl_velocity(maybe_wrap(p + 0.5 * T.dt * k1));
    let k3 = curl_velocity(maybe_wrap(p + 0.5 * T.dt * k2));
    let k4 = curl_velocity(maybe_wrap(p + T.dt * k3));
    p = maybe_wrap(p + (T.dt / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4));
  } else {
    let k1 = curl_velocity(p);
    let k2 = curl_velocity(maybe_wrap(p + 0.5 * T.dt * k1));
    p = maybe_wrap(p + T.dt * k2);
  }
  if (T.reproject == 1u && u32(F.kind.x) == 0u) {
    p = reproject_step(p, f0buf[g.x]);
  }
  var respawned = false;
  if (age > T.max_age || (T.wrap == 0u && (any(p < vec3<f32>(-0.6)) || any(p > vec3<f32>(1.6))))) {
    let base = g.x * 3u + T.respawn_seed * 2654435761u;
    let r0 = rand01(base);
    let r1 = rand01(base + 1u);
    let r2 = rand01(base + 2u);
    if (T.seed_type == 1u) {
      let th = 6.283185307 * r0;
      let cz = 2.0 * r1 - 1.0;
      let sz = sqrt(max(0.0, 1.0 - cz * cz));
      let rr = T.seed_radius * pow(r2, 1.0 / 3.0);
      p = T.seed_center + rr * vec3<f32>(sz * cos(th), sz * sin(th), cz);
    } else if (T.seed_type == 2u) {
      p = vec3<f32>(T.seed_center.x + (r0 - 0.5) * 2.0 * T.seed_thick, r1, r2);
    } else if (T.seed_type == 3u) {
      let th = 6.283185307 * r0;
      let rr = T.seed_radius * sqrt(r1);
      p = T.seed_center + vec3<f32>((r2 - 0.5) * 2.0 * T.seed_thick, rr * cos(th), rr * sin(th));
    } else {
      p = vec3<f32>(r0, r1, r2);
    }
    p = fract(p);
    age = T.max_age * rand01(base + 3u) * 0.25;
    respawned = true;
  }
  // keep the iso anchor fresh: respawn (or a wrap jump) re-anchors f0 at
  // the new position so the residual meter measures per-step drift, not
  // teleporting (ungated display convenience; the gate scene never wraps)
  if (respawned) {
    f0buf[g.x] = iso_vals(p);
  }
  tracers[g.x] = vec4<f32>(p, age);
}

// re-anchor all f0 (called after template/param changes)
@compute @workgroup_size(256)
fn anchor_f0(@builtin(global_invocation_id) g: vec3<u32>) {
  if (g.x >= T.count) { return; }
  f0buf[g.x] = iso_vals(tracers[g.x].xyz);
}

// initial seeding (display cloud; the GATE capture uploads its committed IC)
@compute @workgroup_size(256)
fn seed(@builtin(global_invocation_id) g: vec3<u32>) {
  if (g.x >= T.count) { return; }
  let base = g.x * 3u + T.respawn_seed * 2654435761u;
  var p = vec3<f32>(rand01(base), rand01(base + 1u), rand01(base + 2u));
  if (T.seed_type == 1u) {
    let th = 6.283185307 * p.x;
    let cz = 2.0 * p.y - 1.0;
    let sz = sqrt(max(0.0, 1.0 - cz * cz));
    let rr = T.seed_radius * pow(p.z, 1.0 / 3.0);
    p = fract(T.seed_center + rr * vec3<f32>(sz * cos(th), sz * sin(th), cz));
  }
  tracers[g.x] = vec4<f32>(p, T.max_age * rand01(base + 3u));
  f0buf[g.x] = iso_vals(p);
}

// --- render: instanced velocity-stretched billboards, additive no-sort ------

@group(0) @binding(4) var<storage, read> tracersR: array<vec4<f32>>;
@group(0) @binding(5) var<storage, read> f0R: array<vec2<f32>>;

struct VSOut {
  @builtin(position) clip: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) scalar: f32,
}

const CORNERS = array<vec2<f32>, 6>(
  vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0),
  vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, 1.0), vec2<f32>(-1.0, 1.0),
);

@vertex
fn vs_tracer(@builtin(vertex_index) vid: u32, @builtin(instance_index) iid: u32) -> VSOut {
  let corner = CORNERS[vid];
  let t = tracersR[iid];
  let vel = curl_velocity(t.xyz);
  let center = (T.view * vec4<f32>(t.xyz - vec3<f32>(0.5), 1.0)).xyz;
  // velocity-stretched sprite: elongate the quad along the view-space
  // velocity (a one-frame motion trail, zero memory — web spec § 5)
  let vv = (T.view * vec4<f32>(vel, 0.0)).xyz;
  let sp = length(vv.xy);
  var axis = vec2<f32>(1.0, 0.0);
  if (sp > 1e-6) { axis = vv.xy / sp; }
  let elong = 1.0 + T.stretch * min(sp * T.dt / max(T.size, 1e-6), 8.0);
  let perp = vec2<f32>(-axis.y, axis.x);
  let off2 = (axis * corner.x * elong + perp * corner.y) * T.size;
  // depth cueing: attenuate size slightly with distance (proj handles most)
  let offs = center + vec3<f32>(off2, 0.0);
  var out: VSOut;
  out.clip = T.proj * vec4<f32>(offs, 1.0);
  out.uv = corner;
  if (T.color_mode == 0u) {
    out.scalar = clamp(length(vel) / max(T.speed_scale, 1e-6), 0.0, 1.0);
  } else if (T.color_mode == 1u) {
    // streamline angle -> CYCLIC hue (atan2_p — poly kernel, no builtin trig)
    out.scalar = atan2_p(vel.y, vel.x) / 6.283185307179586 + 0.5;
  } else if (T.color_mode == 2u) {
    out.scalar = clamp(t.w / T.max_age, 0.0, 1.0);
  } else {
    // iso-residual heat (crossprod: distance-to-manifold, log-scaled)
    let r = length(iso_vals(t.xyz) - f0R[iid]);
    out.scalar = clamp((log(max(r, 1e-9)) / 2.302585093 + 9.0) / 9.0, 0.0, 1.0);
  }
  return out;
}

@fragment
fn fs_tracer(in: VSOut) -> @location(0) vec4<f32> {
  let d2 = dot(in.uv, in.uv);
  if (d2 > 1.0) { discard; }
  let fall = (1.0 - d2) * (1.0 - d2);
  let rgb = colormap_sample(in.scalar);
  return vec4<f32>(rgb * fall * T.glow * T.exposure, 1.0);
}

// --- obstacle shell + box outline -------------------------------------------

@group(0) @binding(7) var<storage, read> line_verts: array<vec4<f32>>;

@vertex
fn vs_line(@builtin(vertex_index) vid: u32) -> @builtin(position) vec4<f32> {
  return T.proj * (T.view * vec4<f32>(line_verts[vid].xyz - vec3<f32>(0.5), 1.0));
}

@fragment
fn fs_line() -> @location(0) vec4<f32> {
  return vec4<f32>(0.35, 0.42, 0.5, 0.6);
}
