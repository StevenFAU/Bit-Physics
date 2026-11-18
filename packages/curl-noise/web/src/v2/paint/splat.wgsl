// Paint the Stream — particles as soft additive splats over the map, through
// the Camera2D (cells → scene px), each drawn at its image nearest the view
// centre on the torus (the camera never zooms out past one copy of the map).

struct Splat {
  // xy = view centre (cells), z = cells per scene px, w = N
  cam: vec4<f32>,
  // xy = scene target (px), z = splat radius (px), w = light per splat
  view: vec4<f32>,
  // rgb = colour (linear)
  color: vec4<f32>,
};

@group(0) @binding(0) var<uniform> S: Splat;
@group(0) @binding(1) var<storage, read> parts: array<vec4<f32>>;

struct VOut {
  @builtin(position) clip: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

const CORNERS = array<vec2<f32>, 4>(vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(-1.0, 1.0), vec2<f32>(1.0, 1.0));

@vertex
fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VOut {
  let n = S.cam.w;
  var d = parts[ii].xy - S.cam.xy;
  d = d - n * round(d / n);
  let px = d / S.cam.z + 0.5 * S.view.xy;
  let c = CORNERS[vi];
  let q = px + c * S.view.z;
  var o: VOut;
  o.clip = vec4<f32>(q.x / S.view.x * 2.0 - 1.0, 1.0 - q.y / S.view.y * 2.0, 0.0, 1.0);
  o.uv = c;
  return o;
}

@fragment
fn fs(in: VOut) -> @location(0) vec4<f32> {
  let r2 = dot(in.uv, in.uv);
  let w = max(1.0 - r2, 0.0);
  let e = w * w;
  return vec4<f32>(S.color.rgb * S.view.w * e, e);
}
