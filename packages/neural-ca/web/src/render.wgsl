// Render the Growing-NCA RGBA state (channels 0..3 per cell) over white.

struct RP { grid: u32, cn: u32, };
@group(0) @binding(0) var<uniform> rp: RP;
@group(0) @binding(1) var<storage, read> state: array<f32>;

struct VSOut { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32>, };

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> VSOut {
  var p = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0));
  var o: VSOut;
  o.pos = vec4<f32>(p[vi], 0.0, 1.0);
  o.uv = 0.5 * (p[vi] + vec2<f32>(1.0, 1.0));
  return o;
}

@fragment
fn fs_main(in: VSOut) -> @location(0) vec4<f32> {
  let g = rp.grid;
  let i = u32(clamp(in.uv.x, 0.0, 0.999) * f32(g));
  let j = u32(clamp(1.0 - in.uv.y, 0.0, 0.999) * f32(g));
  let base = (j * g + i) * rp.cn;
  let r = clamp(state[base + 0u], 0.0, 1.0);
  let gg = clamp(state[base + 1u], 0.0, 1.0);
  let b = clamp(state[base + 2u], 0.0, 1.0);
  let a = clamp(state[base + 3u], 0.0, 1.0);
  // premultiply over white, like the reference visualisation
  let rgb = vec3<f32>(1.0) - a * (vec3<f32>(1.0) - vec3<f32>(r, gg, b));
  return vec4<f32>(rgb, 1.0);
}
