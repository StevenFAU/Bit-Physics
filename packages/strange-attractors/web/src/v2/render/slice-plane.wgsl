// Slice: the cutting plane z = h in the 3D view (model coordinates), a faint
// sheet lit where the attractor crosses it — the section histogram drawn in
// place, so the cut shows its layers where they are.
#import bp/view3d

struct Plane {
  // x0, x1, y0, y1 of the section's box (model units)
  box: vec4<f32>,
  // x = h, y = sheet brightness, z = layer brightness, w = bins per side
  look: vec4<f32>,
};

@group(0) @binding(0) var<uniform> V: View3D;
@group(0) @binding(1) var<uniform> L: Plane;
@group(0) @binding(2) var<storage, read> counts: array<u32>;
@group(0) @binding(3) var<storage, read> total: array<u32>;

struct VOut {
  @builtin(position) clip: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

const QUAD = array<vec2<f32>, 6>(
  vec2<f32>(0.0, 0.0), vec2<f32>(1.0, 0.0), vec2<f32>(1.0, 1.0),
  vec2<f32>(0.0, 0.0), vec2<f32>(1.0, 1.0), vec2<f32>(0.0, 1.0),
);

@vertex
fn vs(@builtin(vertex_index) vi: u32) -> VOut {
  let uv = QUAD[vi];
  let p = vec3<f32>(mix(L.box.x, L.box.y, uv.x), mix(L.box.z, L.box.w, uv.y), L.look.x);
  var o: VOut;
  o.clip = V.mvp * vec4<f32>(p, 1.0);
  o.uv = uv;
  return o;
}

@fragment
fn fs(in: VOut) -> @location(0) vec4<f32> {
  let n = u32(L.look.w);
  let bx = min(u32(in.uv.x * f32(n)), n - 1u);
  let by = min(u32(in.uv.y * f32(n)), n - 1u);
  let c = f32(counts[by * n + bx]);
  // the expected count of a uniformly filled bin; layers are many times that
  let mean = max(f32(total[0]) / f32(n * n), 1.0);
  let v = clamp(log(1.0 + c) / log(1.0 + 40.0 * mean), 0.0, 1.0);
  // the sheet: faint, brighter at its edges so the plane reads as a plane
  let e = min(min(in.uv.x, 1.0 - in.uv.x), min(in.uv.y, 1.0 - in.uv.y));
  let edge = 1.0 - smoothstep(0.0, 0.02, e);
  let sheet = vec3<f32>(0.35, 0.45, 0.6) * (L.look.y * (0.4 + 2.0 * edge));
  let layer = vec3<f32>(1.0, 0.86, 0.62) * (L.look.z * v * v);
  return vec4<f32>(sheet + layer, 0.0);
}
