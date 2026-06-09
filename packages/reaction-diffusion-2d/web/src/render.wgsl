// Fullscreen colormap render for the Gray-Scott state buffer.
// Reads the V channel from the interleaved state storage buffer and maps it
// through a magma-ish ramp. Vertex stage emits a single fullscreen triangle.

struct RP { n: u32, _pad: u32, };
@group(0) @binding(0) var<uniform> rp: RP;
@group(0) @binding(1) var<storage, read> state: array<f32>;

struct VSOut { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32>, };

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> VSOut {
  // Oversized triangle covering the viewport.
  var p = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0));
  var o: VSOut;
  let xy = p[vi];
  o.pos = vec4<f32>(xy, 0.0, 1.0);
  o.uv = 0.5 * (xy + vec2<f32>(1.0, 1.0)); // 0..1, origin bottom-left
  return o;
}

fn ramp(t: f32) -> vec3<f32> {
  // Cheap perceptual-ish magma ramp.
  let x = clamp(t, 0.0, 1.0);
  let a = vec3<f32>(0.001, 0.000, 0.013);
  let b = vec3<f32>(0.316, 0.071, 0.485);
  let c = vec3<f32>(0.865, 0.316, 0.382);
  let d = vec3<f32>(0.987, 0.991, 0.749);
  if (x < 0.5) { return mix(a, b, x * 2.0); }
  if (x < 0.8) { return mix(b, c, (x - 0.5) / 0.3); }
  return mix(c, d, (x - 0.8) / 0.2);
}

@fragment
fn fs_main(in: VSOut) -> @location(0) vec4<f32> {
  let n = rp.n;
  let i = u32(clamp(in.uv.x, 0.0, 0.999) * f32(n));
  let j = u32(clamp(1.0 - in.uv.y, 0.0, 0.999) * f32(n));
  let idx = (j * n + i) * 2u + 1u; // V channel
  let v = state[idx];
  return vec4<f32>(ramp(v * 3.5), 1.0);
}
