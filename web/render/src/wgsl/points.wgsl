// Points (F3): one screen-facing splat per particle, additive into an HDR
// target. Each splat is a capsule from the particle's previous position to
// its current one (velocity stretch; a disc when stretch = 0) whose footprint
// integrates to the particle's energy whatever its size in pixels, so the
// image's total light does not change with zoom or resolution.
#import bp/view3d
#import bp/color

struct PointParams {
  // xyz added to every position (a floating origin), w = energy per point
  origin: vec4<f32>,
  // xyz added to every previous position, w = stretch (0 = off)
  prev_origin: vec4<f32>,
  // rgb colour (linear), w = colour mode: 0 uniform, 1 LUT by position.w
  color: vec4<f32>,
  // x = world radius (model units), y = min px radius, z = max px radius, w = LUT gain
  size: vec4<f32>,
};

@group(0) @binding(0) var<uniform> V: View3D;
@group(0) @binding(1) var<uniform> P: PointParams;
@group(0) @binding(2) var<storage, read> pos: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read> prev: array<vec4<f32>>;
@group(0) @binding(4) var lut: texture_2d<f32>;
@group(0) @binding(5) var lut_sampler: sampler;

struct VOut {
  @builtin(position) clip: vec4<f32>,
  // splat-local pixel offset from the segment start, along / across
  @location(0) local: vec2<f32>,
  // x = segment length px, y = radius px, z = 1 / footprint integral
  @location(1) shape: vec3<f32>,
  @location(2) color: vec3<f32>,
};

const CORNERS = array<vec2<f32>, 6>(
  vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0),
  vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, 1.0), vec2<f32>(-1.0, 1.0),
);

const PI = 3.14159265;

@vertex
fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VOut {
  var o: VOut;
  let q = pos[ii];
  let p = q.xyz + P.origin.xyz;
  let c = V.mvp * vec4<f32>(p, 1.0);
  if (c.w <= V.proj.z) {
    o.clip = vec4<f32>(2.0, 2.0, 2.0, 1.0); // behind the eye: off-screen
    return o;
  }
  let s1 = view3d_to_px(c, V.viewport);
  var s0 = s1;
  if (P.prev_origin.w > 0.0) {
    let pp = prev[ii].xyz + P.prev_origin.xyz;
    let c0 = V.mvp * vec4<f32>(pp, 1.0);
    if (c0.w > V.proj.z) {
      s0 = s1 + (view3d_to_px(c0, V.viewport) - s1) * P.prev_origin.w;
    }
  }
  // size attenuation: the world radius in px, held between min and max
  let r = clamp(P.size.x * V.eye_model.w * V.proj.y * V.viewport.y * 0.5 / c.w, P.size.y, P.size.z);
  var d = s1 - s0;
  var len = length(d);
  // keep very long streaks (a wrap, a teleport) from smearing across the screen
  if (len > 64.0 * r) {
    len = 0.0;
    s0 = s1;
  }
  let ax = select(vec2<f32>(1.0, 0.0), d / len, len > 1e-4);
  let ay = vec2<f32>(-ax.y, ax.x);
  let k = CORNERS[vi];
  // along: from -r to len + r; across: from -r to r
  let along = select(-r, len + r, k.x > 0.0);
  let across = k.y * r;
  let px = s0 + ax * along + ay * across;
  o.clip = view3d_from_px(px, c.z, c.w, V.viewport);
  o.local = vec2<f32>(along, across);
  // ∫ (1 - ρ²)² over a disc of radius r = π r² / 3; over the straight part 2 r · len · 8/15
  let area = PI * r * r / 3.0 + len * r * (16.0 / 15.0);
  o.shape = vec3<f32>(len, r, P.origin.w / max(area, 1e-6));
  var col = P.color.rgb;
  if (P.color.w > 0.5) {
    col = colormap_lut(lut, lut_sampler, q.w) * P.size.w;
  }
  o.color = col;
  return o;
}

@fragment
fn fs(in: VOut) -> @location(0) vec4<f32> {
  // distance from the segment, in radii
  let t = clamp(in.local.x, 0.0, in.shape.x);
  let dist = length(vec2<f32>(in.local.x - t, in.local.y)) / in.shape.y;
  if (dist >= 1.0) {
    discard;
  }
  let w = (1.0 - dist * dist);
  let e = w * w * in.shape.z;
  return vec4<f32>(in.color * e, e);
}
