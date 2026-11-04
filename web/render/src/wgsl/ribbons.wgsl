// Ribbons (F3): strands drawn from a per-strand history ring buffer, as
// screen-space quads of constant pixel width that fade with age and depth.
// The ring is slot-major: ring[slot * strands + strand], slot `head` newest.
#import bp/view3d

struct RibbonParams {
  // x = strands, y = slots (ring length), z = head slot, w = valid slots
  dims: vec4<u32>,
  // x = width px, y = age fade exponent, z = depth fade start (view units), w = depth fade end
  look: vec4<f32>,
  // x = energy multiplier, y = min depth-fade factor
  extra: vec4<f32>,
};

@group(0) @binding(0) var<uniform> V: View3D;
@group(0) @binding(1) var<uniform> R: RibbonParams;
@group(0) @binding(2) var<storage, read> ring: array<vec4<f32>>;
// per strand: rgb colour (linear), w = intensity
@group(0) @binding(3) var<storage, read> colors: array<vec4<f32>>;

struct VOut {
  @builtin(position) clip: vec4<f32>,
  @location(0) across: f32,
  @location(1) color: vec3<f32>,
};

fn ring_at(strand: u32, age: u32) -> vec4<f32> {
  let slots = R.dims.y;
  let slot = (R.dims.z + slots - (age % slots)) % slots;
  return ring[slot * R.dims.x + strand];
}

@vertex
fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VOut {
  var o: VOut;
  let segs = R.dims.y - 1u;
  let strand = ii / segs;
  let seg = ii % segs; // 0 = newest segment
  if (seg + 1u >= R.dims.w) {
    o.clip = vec4<f32>(2.0, 2.0, 2.0, 1.0);
    return o;
  }
  let a = ring_at(strand, seg).xyz;
  let b = ring_at(strand, seg + 1u).xyz;
  let ca = V.mvp * vec4<f32>(a, 1.0);
  let cb = V.mvp * vec4<f32>(b, 1.0);
  if (ca.w <= V.proj.z || cb.w <= V.proj.z) {
    o.clip = vec4<f32>(2.0, 2.0, 2.0, 1.0);
    return o;
  }
  let sa = view3d_to_px(ca, V.viewport);
  let sb = view3d_to_px(cb, V.viewport);
  let d = sb - sa;
  let len = length(d);
  let ax = select(vec2<f32>(1.0, 0.0), d / len, len > 1e-4);
  let ay = vec2<f32>(-ax.y, ax.x);
  let hw = R.look.x * 0.5;
  // two triangles: (a-, b-, b+), (a-, b+, a+); ends overlap by half a width
  let end_b = vi == 1u || vi == 2u || vi == 4u;
  let side = select(-1.0, 1.0, vi == 2u || vi == 4u || vi == 5u);
  let base = select(sa - ax * hw * 0.5, sb + ax * hw * 0.5, end_b);
  let c = select(ca, cb, end_b);
  o.clip = view3d_from_px(base + ay * side * hw, c.z, c.w, V.viewport);
  o.across = side;
  // fades: age along the strand, then depth (distance from the eye)
  let age = (f32(seg) + select(0.0, 1.0, end_b)) / f32(max(R.dims.w - 1u, 1u));
  let fa = pow(max(1.0 - age, 0.0), R.look.y);
  let depth = c.w;
  let fd = mix(1.0, R.extra.y, clamp((depth - R.look.z) / max(R.look.w - R.look.z, 1e-4), 0.0, 1.0));
  let col = colors[strand];
  o.color = col.rgb * col.w * R.extra.x * fa * fd;
  return o;
}

@fragment
fn fs(in: VOut) -> @location(0) vec4<f32> {
  let x = 1.0 - in.across * in.across;
  let e = x * x;
  return vec4<f32>(in.color * e, e);
}
