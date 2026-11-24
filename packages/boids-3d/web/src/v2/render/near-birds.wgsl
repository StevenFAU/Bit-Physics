// Murmuration — near birds (07-boids-3d.md, "The look", near field; M1).
// A bird whose wingspan covers more than a few pixels is drawn as a small
// low-poly bird — body, two hinged wings, a split tail — flapping and banking,
// dark against the sky with a faint rim of the sky's own light. Between `px0`
// and `px1` pixels of wingspan it cross-fades with the optical-depth medium:
// the cull writes each bird's weight w, tau.wgsl splats (1 − w) of its
// coverage and the mesh is drawn with alpha w, so a bird is never counted
// twice and never pops. Drawn into a 4× multisampled target, resolved, then
// laid over the scene. The falcon is the same mesh, shaped like a falcon,
// always drawn this way and never smaller than a few pixels.
// Render only: builtin trig is fine here.
#import bp/view3d

struct Agent {
  position_speed: vec4<f32>,
  heading_roll: vec4<f32>,
  behavior: vec4<f32>,
  identity: vec4<u32>,
}

struct Near {
  // x = birds, y = list capacity, z = target width, w = target height
  counts: vec4<u32>,
  // x = wingspan (model units), y = px where the fade starts, z = px where it ends, w = time (s)
  shape: vec4<f32>,
  // falcon: xyz (model), w = wingspan (model units, before its minimum size)
  falcon: vec4<f32>,
  // falcon: heading xyz, w = bank
  falcon_h: vec4<f32>,
  // x = the falcon's least wingspan in px, y = 1 when it flies, z = birds' tint, w = rim strength
  look: vec4<f32>,
}

@group(0) @binding(0) var<uniform> V: View3D;
@group(0) @binding(1) var<uniform> N: Near;
@group(0) @binding(2) var<storage, read> agents: array<Agent>;
// the instance list the cull wrote: (bird id, weight bits)
@group(0) @binding(3) var<storage, read> list: array<vec2<u32>>;

/// Projected wingspan of a bird at model point p, in target pixels (and clip w).
fn wing_px(p: vec3<f32>, wingspan: f32) -> vec2<f32> {
  let c = V.mvp * vec4<f32>(p, 1.0);
  let fpx = V.proj.y * V.viewport.y * 0.5;
  return vec2<f32>(wingspan * V.eye_model.w * fpx / max(c.w, 1e-4), c.w);
}

// ---- the mesh ----------------------------------------------------------

@group(1) @binding(0) var scene: texture_2d<f32>;

fn hash01(x0: u32) -> f32 {
  var x = x0;
  x ^= x >> 16u; x *= 0x7feb352du; x ^= x >> 15u; x *= 0x846ca68bu; x ^= x >> 16u;
  return f32(x) * (1.0 / 4294967296.0);
}

/// A starling (falcon = false) or a falcon, in local units: wingspan 2.3,
/// x right, y up, z forward. Vertices 6–17 are the wings, hinged at the body.
fn local_vertex(v: u32, flap: f32, falcon: bool) -> vec3<f32> {
  var p = array<vec3<f32>, 24>(
    vec3<f32>(0.0, 0.08, 0.9), vec3<f32>(-0.16, 0.05, -0.45), vec3<f32>(0.16, 0.05, -0.45),
    vec3<f32>(0.0, -0.08, 0.9), vec3<f32>(0.16, -0.05, -0.45), vec3<f32>(-0.16, -0.05, -0.45),
    vec3<f32>(-0.05, 0.03, 0.25), vec3<f32>(-1.15, 0.0, -0.1), vec3<f32>(-0.12, 0.02, -0.42),
    vec3<f32>(-0.05, -0.01, 0.22), vec3<f32>(-0.12, -0.02, -0.42), vec3<f32>(-1.15, 0.0, -0.1),
    vec3<f32>(0.05, 0.03, 0.25), vec3<f32>(0.12, 0.02, -0.42), vec3<f32>(1.15, 0.0, -0.1),
    vec3<f32>(0.05, -0.01, 0.22), vec3<f32>(1.15, 0.0, -0.1), vec3<f32>(0.12, -0.02, -0.42),
    vec3<f32>(0.0, 0.0, -0.3), vec3<f32>(-0.34, 0.0, -0.82), vec3<f32>(0.0, 0.0, -0.62),
    vec3<f32>(0.0, 0.0, -0.3), vec3<f32>(0.0, 0.0, -0.62), vec3<f32>(0.34, 0.0, -0.82),
  );
  var q = p[v];
  if (falcon) {
    // long pointed wings swept back, a longer narrow tail
    if (v >= 6u && v < 18u && abs(q.x) > 1.0) { q.z -= 0.55; }
    if (v >= 18u) { q = vec3<f32>(q.x * 0.45, q.y, q.z * 1.25); }
  }
  if (v >= 6u && v < 12u) { q.y += (-q.x) * flap; }
  if (v >= 12u && v < 18u) { q.y += q.x * flap; }
  return q;
}

/// Right, up and forward of a banked bird (v1's bird.wgsl basis).
fn basis(forward: vec3<f32>, roll: f32) -> mat3x3<f32> {
  var right = cross(vec3<f32>(0.0, 1.0, 0.0), forward);
  if (dot(right, right) < 1e-6) { right = vec3<f32>(1.0, 0.0, 0.0); }
  right = normalize(right);
  var up = normalize(cross(forward, right));
  let cr = cos(roll);
  let sr = sin(roll);
  let r = right * cr + up * sr;
  up = up * cr - right * sr;
  return mat3x3<f32>(r, up, forward);
}

struct VOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) normal: vec3<f32>,
  @location(1) view_dir: vec3<f32>,
  @location(2) weight: f32,
}

fn emit(local: vec3<f32>, normal_local: vec3<f32>, centre: vec3<f32>, b: mat3x3<f32>, scale: f32, w: f32) -> VOut {
  let mp = centre + b * (local * scale);
  var o: VOut;
  o.pos = V.mvp * vec4<f32>(mp, 1.0);
  o.normal = b * normal_local;
  o.view_dir = normalize(V.eye_model.xyz - mp);
  o.weight = w;
  return o;
}

@vertex
fn vs_bird(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VOut {
  // the cull counts every candidate; only the first `capacity` made the list
  if (ii >= N.counts.y) {
    var none: VOut;
    none.pos = vec4<f32>(2.0, 2.0, 2.0, 1.0);
    return none;
  }
  let e = list[ii];
  let a = agents[e.x];
  let w = bitcast<f32>(e.y);
  let phase = hash01(a.identity.x) * 6.2831853;
  // ~9 beats a second, with glides: the beat's strength wanders slowly per bird
  let glide = 0.5 + 0.5 * sin(N.shape.w * 0.7 + phase * 3.0);
  let flap = sin(N.shape.w * 56.0 + phase) * (0.12 + 0.3 * glide + 0.3 * a.behavior.x);
  let tri = (vi / 3u) * 3u;
  let l0 = local_vertex(tri, flap, false);
  let l1 = local_vertex(tri + 1u, flap, false);
  let l2 = local_vertex(tri + 2u, flap, false);
  let n = normalize(cross(l1 - l0, l2 - l0));
  let b = basis(normalize(a.heading_roll.xyz), a.heading_roll.w);
  return emit(local_vertex(vi, flap, false), n, a.position_speed.xyz, b, N.shape.x / 2.3, w);
}

@vertex
fn vs_falcon(@builtin(vertex_index) vi: u32) -> VOut {
  let flap = sin(N.shape.w * 31.0) * 0.18;
  let tri = (vi / 3u) * 3u;
  let l0 = local_vertex(tri, flap, true);
  let l1 = local_vertex(tri + 1u, flap, true);
  let l2 = local_vertex(tri + 2u, flap, true);
  let n = normalize(cross(l1 - l0, l2 - l0));
  let b = basis(normalize(N.falcon_h.xyz), N.falcon_h.w);
  // never smaller than a few pixels: the falcon is a character, not a speck
  let wp = wing_px(N.falcon.xyz, N.falcon.w);
  let grow = max(1.0, N.look.x / max(wp.x, 1e-3));
  var o = emit(local_vertex(vi, flap, true), n, N.falcon.xyz, b, N.falcon.w * grow / 2.3, 1.0);
  if (N.look.y < 0.5) { o.pos = vec4<f32>(2.0, 2.0, 2.0, 1.0); }
  return o;
}

@fragment
fn fs(in: VOut) -> @location(0) vec4<f32> {
  // the sky behind this pixel: a dark body lit faintly by it, a rim where the wing turns edge-on
  let sky = textureLoad(scene, vec2<i32>(in.pos.xy), 0).rgb;
  let n = normalize(in.normal);
  let rim = pow(1.0 - abs(dot(n, normalize(in.view_dir))), 3.0);
  let col = sky * (N.look.z + N.look.w * rim);
  return vec4<f32>(col * in.weight, in.weight);
}
