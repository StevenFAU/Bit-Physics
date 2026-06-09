// Render the Ising spin lattice (i32 ±1) as a black/white field.

struct RP { n: u32, _pad: u32, };
@group(0) @binding(0) var<uniform> rp: RP;
@group(0) @binding(1) var<storage, read> spins: array<i32>;

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
  let n = rp.n;
  let i = u32(clamp(in.uv.x, 0.0, 0.999) * f32(n));
  let j = u32(clamp(1.0 - in.uv.y, 0.0, 0.999) * f32(n));
  let s = spins[j * n + i];
  let up = vec3<f32>(0.94, 0.86, 0.42);   // +1
  let dn = vec3<f32>(0.12, 0.14, 0.22);   // -1
  return vec4<f32>(select(dn, up, s > 0), 1.0);
}
