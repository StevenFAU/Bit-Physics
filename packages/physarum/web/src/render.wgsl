// Colormap render of the Physarum trail map (256x256 f32).

struct RP { w: u32, h: u32, };
@group(0) @binding(0) var<uniform> rp: RP;
@group(0) @binding(1) var<storage, read> T: array<f32>;

struct VSOut { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32>, };

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> VSOut {
  var p = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0));
  var o: VSOut;
  o.pos = vec4<f32>(p[vi], 0.0, 1.0);
  o.uv = 0.5 * (p[vi] + vec2<f32>(1.0, 1.0));
  return o;
}

fn ramp(t: f32) -> vec3<f32> {
  let x = clamp(t, 0.0, 1.0);
  let a = vec3<f32>(0.0, 0.01, 0.05);
  let b = vec3<f32>(0.0, 0.45, 0.55);
  let c = vec3<f32>(0.95, 0.92, 0.55);
  if (x < 0.5) { return mix(a, b, x * 2.0); }
  return mix(b, c, (x - 0.5) * 2.0);
}

@fragment
fn fs_main(in: VSOut) -> @location(0) vec4<f32> {
  let x = u32(clamp(in.uv.x, 0.0, 0.999) * f32(rp.w));
  let y = u32(clamp(1.0 - in.uv.y, 0.0, 0.999) * f32(rp.h));
  let v = T[x * rp.h + y];
  return vec4<f32>(ramp(log(1.0 + v) * 0.25), 1.0);
}
