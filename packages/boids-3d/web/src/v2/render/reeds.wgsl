// Murmuration — the reed bed you stand in (07-boids-3d.md, "The look"):
// procedural common reed (Phragmites) in silhouette against the afterglow,
// swaying in a light wind. Each reed is four strokes — the stalk, two
// leaves, the drooping plume — and each stroke is an 8-point polyline drawn
// as a screen-space strip. A stroke thinner than a pixel is drawn one pixel
// wide with its coverage as alpha, so a stalk sliding across pixels keeps
// its weight instead of crawling. Drawn after the flock (the reeds are
// always nearer than the birds), premultiplied over. Render only.
#import bp/view3d

struct Reeds {
  // xyz = the bed's centre (world, on the ground), w = time (s)
  centre: vec4<f32>,
  // x = inner radius, y = outer radius, z = reeds, w = wind strength
  bed: vec4<f32>,
  // rgb = silhouette colour, w = unused
  dark: vec4<f32>,
  // rgb = backlight through the plumes and leaf edges, w = unused
  glow: vec4<f32>,
};

@group(0) @binding(0) var<uniform> V: View3D;
@group(0) @binding(1) var<uniform> R: Reeds;

const POINTS: u32 = 8u;
const NEAR: u32 = 36u;

fn h1(n: u32) -> f32 {
  var x = n * 747796405u + 2891336453u;
  x = ((x >> ((x >> 28u) + 4u)) ^ x) * 277803737u;
  x = (x >> 22u) ^ x;
  return f32(x) * (1.0 / 4294967296.0);
}

struct Pt {
  p: vec3<f32>,
  // full width, world units
  w: f32,
};

/// Point j of stroke `kind` on reed `r`.
fn stroke_point(r: u32, kind: u32, j: u32) -> Pt {
  let t = f32(j) / f32(POINTS - 1u);
  // where the reed stands: an annulus around the bed's centre, denser near;
  // the first NEAR reeds stand close beside you and rise into the sky at the
  // edges of the view (towards −z, where you look)
  var a = h1(r * 4u + 1u) * 6.2831853;
  var rr = mix(R.bed.x, R.bed.y, pow(h1(r * 4u + 2u), 1.6));
  var height = mix(0.75, 1.55, h1(r * 4u + 3u)) * mix(0.8, 1.0, smoothstep(R.bed.x, R.bed.x * 2.5, rr));
  if (r < NEAR) {
    let side = select(-1.0, 1.0, (r & 1u) == 1u);
    a = -1.5707963 + side * mix(0.42, 1.1, h1(r * 4u + 1u));
    rr = mix(1.4, 3.6, h1(r * 4u + 2u));
    height = mix(1.4, 2.3, h1(r * 4u + 3u));
  }
  let base = R.centre.xyz + vec3<f32>(cos(a) * rr, 0.0, sin(a) * rr);
  let lean_a = h1(r * 4u + 4u) * 6.2831853;
  let lean = vec3<f32>(cos(lean_a), 0.0, sin(lean_a)) * 0.06;
  // wind: a slow gust field along x plus a flutter, bending more towards the top
  let time = R.centre.w;
  let phase = h1(r * 7u + 5u) * 6.2831853;
  let gust = sin(time * 0.55 + base.x * 0.045 + base.z * 0.02) * 0.6 + 0.4;
  let sway = R.bed.w * (gust * 0.11 + 0.025 * sin(time * 2.3 + phase));
  let wind = vec3<f32>(1.0, 0.0, 0.25);
  // the stalk
  let stalk = fn_stalk(base, height, lean, wind, sway, t);
  if (kind == 0u) {
    return Pt(stalk, mix(0.016, 0.006, t));
  }
  if (kind == 3u) {
    // the plume: a drooping, feathery panicle from the top
    let top = fn_stalk(base, height, lean, wind, sway, 1.0);
    let side = normalize(wind + lean * 4.0 + vec3<f32>(0.0, 0.0, 0.001));
    let len = mix(0.14, 0.24, h1(r * 5u + 6u));
    let p = top + side * (t * len * 0.5) + vec3<f32>(0.0, -t * t * len * 0.9 + t * len * 0.3, 0.0);
    let w = 0.034 * pow(sin(3.1415926 * min(0.1 + t * 0.95, 1.0)), 0.7) * mix(0.7, 1.2, h1(r * 5u + 7u));
    return Pt(p, w);
  }
  // a leaf: from a node on the stalk, out and drooping, tapered at both ends
  let node_t = select(mix(0.25, 0.45, h1(r * 6u + 8u)), mix(0.5, 0.7, h1(r * 6u + 9u)), kind == 2u);
  let node = fn_stalk(base, height, lean, wind, sway, node_t);
  let la = h1(r * 6u + 10u + kind) * 6.2831853;
  let dirv = vec3<f32>(cos(la), 0.0, sin(la));
  let len = mix(0.22, 0.42, h1(r * 6u + 12u + kind));
  let p = node + dirv * (t * len) + vec3<f32>(0.0, t * len * 0.55 - t * t * len * 0.75, 0.0) + wind * sway * 0.5 * t;
  let w = 0.018 * sin(3.1415926 * min(0.15 + t * 0.85, 1.0));
  return Pt(p, w);
}

fn fn_stalk(base: vec3<f32>, height: f32, lean: vec3<f32>, wind: vec3<f32>, sway: f32, t: f32) -> vec3<f32> {
  return base + vec3<f32>(0.0, t * height, 0.0) + lean * t * height + wind * sway * t * t * height;
}

struct VOut {
  @builtin(position) pos: vec4<f32>,
  // signed distance from the stroke's centre line, px
  @location(0) across: f32,
  // half the drawn core width, px; coverage scale (thin strokes)
  @location(1) half_core: f32,
  @location(2) alpha: f32,
  @location(3) kind: f32,
};

@vertex
fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VOut {
  let r = ii / 4u;
  let kind = ii % 4u;
  let j = vi / 2u;
  let side = select(-1.0, 1.0, (vi & 1u) == 1u);
  let pt = stroke_point(r, kind, j);
  let pa = stroke_point(r, kind, select(j - 1u, 0u, j == 0u));
  let pb = stroke_point(r, kind, min(j + 1u, POINTS - 1u));
  let c = V.view_proj * vec4<f32>(pt.p, 1.0);
  let ca = V.view_proj * vec4<f32>(pa.p, 1.0);
  let cb = V.view_proj * vec4<f32>(pb.p, 1.0);
  var o: VOut;
  o.kind = f32(kind);
  if (c.w < V.proj.z || ca.w < V.proj.z || cb.w < V.proj.z) {
    o.pos = vec4<f32>(2.0, 2.0, 2.0, 1.0);
    o.alpha = 0.0;
    return o;
  }
  let sa = view3d_to_px(ca, V.viewport);
  let sb = view3d_to_px(cb, V.viewport);
  let s = view3d_to_px(c, V.viewport);
  var tang = sb - sa;
  if (dot(tang, tang) < 1e-8) { tang = vec2<f32>(0.0, -1.0); }
  let n = normalize(vec2<f32>(-tang.y, tang.x));
  // true width in px, drawn at least one pixel wide with its coverage as alpha
  let fpx = V.proj.y * V.viewport.y * 0.5;
  let w_px = pt.w * fpx / c.w;
  let core = max(w_px, 1.0);
  let hw = core * 0.5 + 0.75;
  let px = s + n * side * hw;
  o.pos = view3d_from_px(px, c.z, c.w, V.viewport);
  o.across = side * hw;
  o.half_core = core * 0.5;
  o.alpha = min(w_px / core, 1.0);
  return o;
}

@fragment
fn fs(in: VOut) -> @location(0) vec4<f32> {
  let cov = clamp(in.half_core + 0.5 - abs(in.across), 0.0, 1.0) * in.alpha;
  if (cov <= 0.0) { discard; }
  // silhouettes, with the afterglow shining through plumes and leaf edges
  let edge = clamp(abs(in.across) / max(in.half_core + 0.5, 1e-3), 0.0, 1.0);
  var col = R.dark.rgb;
  if (in.kind > 2.5) {
    col += R.glow.rgb * (0.25 + 0.5 * edge * edge);
  } else {
    col += R.glow.rgb * 0.18 * edge * edge;
  }
  return vec4<f32>(col * cov, cov);
}
