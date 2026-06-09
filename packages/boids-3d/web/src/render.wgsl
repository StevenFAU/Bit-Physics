// Point-cloud render of the boids flock with an orbiting camera.
// Reads the flat f32 position buffer (3 per agent); colours by speed.

struct RU { aspect: f32, angle: f32, n: f32, _p: f32, };
@group(0) @binding(0) var<uniform> ru: RU;
@group(0) @binding(1) var<storage, read> pos: array<f32>;
@group(0) @binding(2) var<storage, read> vel: array<f32>;

struct VSOut { @builtin(position) pos: vec4<f32>, @location(0) col: vec3<f32>, };

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> VSOut {
  let o = vi * 3u;
  let p = vec3<f32>(pos[o], pos[o + 1u], pos[o + 2u]) * 0.06;
  let a = ru.angle;
  let ca = cos(a); let sa = sin(a);
  let rx = vec3<f32>(p.x * ca - p.z * sa, p.y, p.x * sa + p.z * ca);
  let v = vec3<f32>(vel[o], vel[o + 1u], vel[o + 2u]);
  let speed = clamp(length(v) / 3.0, 0.0, 1.0);
  var out: VSOut;
  out.pos = vec4<f32>(rx.x / ru.aspect, rx.y, rx.z * 0.4 + 0.5, 1.0);
  out.col = vec3<f32>(0.3 + 0.7 * speed, 0.6, 1.0 - 0.5 * speed);
  return out;
}

@fragment
fn fs_main(in: VSOut) -> @location(0) vec4<f32> {
  return vec4<f32>(in.col, 1.0);
}
