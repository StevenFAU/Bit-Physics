// Point-cloud render of the Lorenz trajectory with an orbiting camera.
// Reads the (n+1)*3 f32 trajectory buffer; one vertex per recorded state.

struct RU { aspect: f32, angle: f32, n: f32, _p: f32, };
@group(0) @binding(0) var<uniform> ru: RU;
@group(0) @binding(1) var<storage, read> traj: array<f32>;

struct VSOut { @builtin(position) pos: vec4<f32>, @location(0) col: vec3<f32>, };

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> VSOut {
  let o = vi * 3u;
  // centre the attractor (z ~ 25) and scale into clip space
  let p = vec3<f32>(traj[o + 0u], traj[o + 1u], traj[o + 2u] - 25.0) * 0.035;
  let a = ru.angle;
  let ca = cos(a); let sa = sin(a);
  let rx = vec3<f32>(p.x * ca - p.z * sa, p.y, p.x * sa + p.z * ca);
  var o2: VSOut;
  o2.pos = vec4<f32>(rx.x / ru.aspect, rx.y, rx.z * 0.5 + 0.5, 1.0);
  let t = f32(vi) / ru.n;
  o2.col = vec3<f32>(0.25 + 0.7 * t, 0.45, 1.0 - 0.6 * t);
  return o2;
}

@fragment
fn fs_main(in: VSOut) -> @location(0) vec4<f32> {
  return vec4<f32>(in.col, 1.0);
}
