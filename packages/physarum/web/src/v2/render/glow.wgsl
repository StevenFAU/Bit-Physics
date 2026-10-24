// Slime Mould look (02-physarum.md § The look): bioluminescence. The trail is
// emissive HDR light on a near-black agar dish — a soft glow from the field
// plus fine sparks from individual agents — tone-mapped by @bp/render with
// measured exposure, so dense trunks never clip to white, and bloomed there.
#import bp/fullscreen
#import bp/hash

struct Look {
  cam: vec4<f32>,       // centre.xy (cells), cells per scene px, unused
  dims: vec4<f32>,      // scene target px (w, h), domain cells (w, h)
  stops: array<vec4<f32>, 5>,  // palette, linear rgb at t = 0, ¼, ½, ¾, 1
  bg: vec4<f32>,        // agar rgb, a = grain amount
  shape: vec4<f32>,     // trail at the top of the ramp (× mean), HDR gain, glow from agents, overall gain
  spark: vec4<f32>,     // spark rgb, a = spark gain
  split: vec4<f32>,     // compare split in px (< 0 off), divider alpha, lod bias, unused
};

@group(0) @binding(0) var<uniform> L: Look;
@group(0) @binding(1) var field: texture_2d<f32>;
@group(0) @binding(2) var field_b: texture_2d<f32>;
@group(0) @binding(3) var samp: sampler;

@vertex
fn vs(@builtin(vertex_index) vi: u32) -> FullscreenOut {
  return fullscreen_vertex(vi);
}

fn palette(t: f32) -> vec3<f32> {
  let x = clamp(t, 0.0, 1.0) * 4.0;
  let i = min(u32(x), 3u);
  return mix(L.stops[i].rgb, L.stops[i + 1u].rgb, x - f32(i));
}

// value noise on the domain lattice, for the agar's faint grain
fn grain(q: vec2<f32>) -> f32 {
  let i = floor(q);
  let f = q - i;
  let u = f * f * (3.0 - 2.0 * f);
  let h = vec2<u32>(vec2<i32>(i) + vec2<i32>(65536));
  let a = bp_unit(bp_hash3(h.x, h.y, 7u));
  let b = bp_unit(bp_hash3(h.x + 1u, h.y, 7u));
  let c = bp_unit(bp_hash3(h.x, h.y + 1u, 7u));
  let d = bp_unit(bp_hash3(h.x + 1u, h.y + 1u, 7u));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

fn emission(s: vec4<f32>) -> vec3<f32> {
  // trail in units of its equilibrium mean; log ramp so faint wisps and
  // dense trunks both read, and an HDR lift past the top of the ramp
  let tr = max(s.r, 0.0);
  let t = log2(1.0 + tr) / log2(1.0 + L.shape.x);
  let base = palette(t);
  let hot = max(t - 0.8, 0.0);
  let lit = base * (1.0 + L.shape.y * hot * hot);
  // agents passing this cell glow faintly in the spark colour
  let busy = L.spark.rgb * (L.shape.z * min(s.g, 8.0));
  return (lit + busy) * L.shape.w;
}

@fragment
fn fs(in: FullscreenOut) -> @location(0) vec4<f32> {
  let px = in.uv * L.dims.xy;
  let q = L.cam.xy + (px - 0.5 * L.dims.xy) * L.cam.z;   // domain cells
  let uv = q / L.dims.zw;                                 // periodic: the sampler repeats
  let lod = max(log2(max(L.cam.z, 1e-6)) + L.split.z, 0.0);
  var s = textureSampleLevel(field, samp, uv, lod);
  let comparing = L.split.x >= 0.0;
  if (comparing && px.x < L.split.x) {
    s = textureSampleLevel(field_b, samp, uv, lod);
  }
  let qw = q - floor(q / L.dims.zw) * L.dims.zw;          // the dish repeats; so does its grain
  let g = grain(qw * 0.11) * 0.6 + grain(qw * 0.031) * 0.4;
  var c = L.bg.rgb * (1.0 - L.bg.a + 2.0 * L.bg.a * g) + emission(s);
  // walls: matte dark relief — a faint lit rim where the wall meets the agar
  let wall = clamp(s.b, 0.0, 1.0);
  let rim = wall * (1.0 - wall) * 4.0;
  let relief = vec3<f32>(0.010, 0.010, 0.011) * (1.0 + 0.8 * g) + vec3<f32>(0.05, 0.048, 0.045) * rim;
  c = mix(c, relief, smoothstep(0.35, 0.65, wall)) + vec3<f32>(0.03, 0.028, 0.026) * rim;
  if (comparing) {
    let d = abs(px.x - L.split.x);
    c = mix(c, vec3<f32>(0.9, 0.85, 0.8), L.split.y * (1.0 - smoothstep(0.5, 1.5, d)));
  }
  return vec4<f32>(c, 1.0);
}

// ---- sparks: a sample of agents as additive points --------------------------

struct Sparks {
  stride: u32,      // draw every stride-th agent
  phase: u32,
  count: u32,       // agents in the buffer
  images_x: u32,    // periodic images drawn across (zoomed out past the dish)
  images_y: u32,
  _p0: u32,
  _p1: u32,
  _p2: u32,
};
@group(1) @binding(0) var<uniform> K: Sparks;
@group(1) @binding(1) var<storage, read> agents: array<vec4<f32>>;

struct SparkOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) c: vec3<f32>,
};

@vertex
fn spark_vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> SparkOut {
  var o: SparkOut;
  let idx = vi * K.stride + K.phase;
  if (idx >= K.count) {
    o.pos = vec4<f32>(2.0, 2.0, 0.0, 1.0);
    return o;
  }
  let ag = agents[idx];
  if (ag.z > 1.5) {
    // dormant (a growing colony has not reached it yet): not drawn
    o.pos = vec4<f32>(2.0, 2.0, 0.0, 1.0);
    return o;
  }
  let p = ag.xy;
  let dom = L.dims.zw;
  // the image of p nearest the view centre, then this instance's periodic offset
  var d = p - L.cam.xy;
  d = d - round(d / dom) * dom;
  let ox = f32(ii % K.images_x) - f32(K.images_x / 2u);
  let oy = f32(ii / K.images_x) - f32(K.images_y / 2u);
  d = d + vec2<f32>(ox, oy) * dom;
  let spx = d / L.cam.z;                       // scene px from centre
  let ndc = spx / (0.5 * L.dims.xy);
  o.pos = vec4<f32>(ndc.x, -ndc.y, 0.0, 1.0);
  var c = L.spark.rgb * L.spark.a;
  if (L.split.x >= 0.0 && spx.x + 0.5 * L.dims.x < L.split.x) {
    c = vec3<f32>(0.0);  // compare: sparks belong to the live side
  }
  o.c = c;
  return o;
}

@fragment
fn spark_fs(in: SparkOut) -> @location(0) vec4<f32> {
  return vec4<f32>(in.c, 1.0);
}

// ---- markers: food crumbs (small warm discs) and lights (a soft pool with a halo)

struct Marks {
  count: u32,
  images_x: u32,
  images_y: u32,
  _p0: u32,
};
@group(1) @binding(0) var<uniform> MK: Marks;
@group(1) @binding(1) var<storage, read> marks: array<vec4<f32>>;   // x, y, r (cells), kind (0 food, 1 light, 2 food ghost)

struct MarkOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) local: vec2<f32>,                       // in units of the marker radius
  @location(1) @interpolate(flat) kind: f32,
  @location(2) @interpolate(flat) rpx: f32,            // radius in scene px
};

@vertex
fn mark_vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> MarkOut {
  var o: MarkOut;
  let m = marks[ii % MK.count];
  let img = ii / MK.count;
  var corners = array<vec2<f32>, 6>(vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(-1.0, 1.0), vec2(-1.0, 1.0), vec2(1.0, -1.0), vec2(1.0, 1.0));
  let corner = corners[vi];
  let ext = select(1.6, 2.2, m.w == 1.0);              // lights carry a wide halo
  let dom = L.dims.zw;
  var d = m.xy - L.cam.xy;
  d = d - round(d / dom) * dom;
  let ox = f32(img % MK.images_x) - f32(MK.images_x / 2u);
  let oy = f32(img / MK.images_x) - f32(MK.images_y / 2u);
  d = d + vec2<f32>(ox, oy) * dom;
  // never smaller than a few px on screen, so a crumb stays visible zoomed out
  let rpx = max(m.z / L.cam.z, select(3.0, 6.0, m.w == 1.0));
  let spx = d / L.cam.z + corner * rpx * ext;
  let ndc = spx / (0.5 * L.dims.xy);
  o.pos = vec4<f32>(ndc.x, -ndc.y, 0.0, 1.0);
  o.local = corner * ext;
  o.kind = m.w;
  o.rpx = rpx;
  return o;
}

@fragment
fn mark_fs(in: MarkOut) -> @location(0) vec4<f32> {
  let d = length(in.local);
  let aa = 1.5 / max(in.rpx, 1.0);                     // about a pixel and a half of edge
  if (in.kind == 1.0) {
    let pool = 0.06 * (1.0 - smoothstep(0.0, 1.0, d));
    let ring = 0.55 * exp(-pow((d - 1.0) / max(0.05, 2.0 * aa), 2.0));
    let halo = 0.05 * exp(-max(d - 1.0, 0.0) * 3.0) * step(1.0, d);
    return vec4<f32>(vec3<f32>(0.78, 0.86, 1.0) * (pool + ring + halo), 1.0);
  }
  // food: a warm disc with a soft rim; a ghost is the hover preview
  let disc = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, d);
  let rim = exp(-pow((d - 1.0) / 0.25, 2.0)) * 0.35;
  let k = select(1.0, 0.35, in.kind == 2.0);
  return vec4<f32>(vec3<f32>(1.0, 0.62, 0.28) * (2.2 * disc + rim) * k, 1.0);
}
