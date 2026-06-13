// Quad-sprite render of the boids flock with an orbiting camera.
// Reads the flat f32 position buffer (3 per agent); colours by speed.
//
// DISPLAY-ONLY point-size fix (Lane B P-4, D-P1.2(c) ratified): WebGPU
// point-list rasterizes at a fixed 1 px — at 720 px the 1000-agent flock was
// nearly invisible (the P-2 poster needed long-exposure frame stacking to
// show it at all). Each agent now draws as a two-triangle screen-space
// sprite (6 vertices per agent, vertex_index decomposed below). Same storage
// reads, same world transform, same speed palette; no sim state read/written
// differently.
//
// DISPLAY-ONLY camera fit (Lane B P-6, D-P1.2(c) ratified): the Reynolds
// kernel has no world bounds, so under the former constant framing the flock
// eventually drifted out of view. RU gains two slots — fit_center/fit_scale —
// written by the host from a position READBACK (never by compute); the world
// transform becomes (p - fit_center) * 0.06 * fit_scale, consumed at render
// time only. Identity (center 0, scale 1) reproduces the previous framing
// bit-exactly: x - 0.0 and x * 1.0 are IEEE-754 identity operations on the
// unchanged x * 0.06 product. Same storage reads, no new bindings; zero
// kernel/step/capture-path bytes change.

struct RU { aspect: f32, angle: f32, n: f32, _p: f32, fit_center: vec3<f32>, fit_scale: f32, };
@group(0) @binding(0) var<uniform> ru: RU;
@group(0) @binding(1) var<storage, read> pos: array<f32>;
@group(0) @binding(2) var<storage, read> vel: array<f32>;

struct VSOut { @builtin(position) pos: vec4<f32>, @location(0) col: vec3<f32>, };

const R: f32 = 0.007; // sprite half-size in clip units (~2.5 px at 720 px)

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> VSOut {
  let agent = vi / 6u;
  let corner = vi % 6u;
  let o = agent * 3u;
  let p = (vec3<f32>(pos[o], pos[o + 1u], pos[o + 2u]) - ru.fit_center) * 0.06 * ru.fit_scale;
  let a = ru.angle;
  let ca = cos(a); let sa = sin(a);
  let rx = vec3<f32>(p.x * ca - p.z * sa, p.y, p.x * sa + p.z * ca);
  let v = vec3<f32>(vel[o], vel[o + 1u], vel[o + 2u]);
  let speed = clamp(length(v) / 3.0, 0.0, 1.0);
  var corners = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0),
    vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, 1.0), vec2<f32>(-1.0, 1.0),
  );
  let d = corners[corner] * R;
  var out: VSOut;
  out.pos = vec4<f32>(rx.x / ru.aspect + d.x, rx.y + d.y, rx.z * 0.4 + 0.5, 1.0);
  out.col = vec3<f32>(0.3 + 0.7 * speed, 0.6, 1.0 - 0.5 * speed);
  return out;
}

@fragment
fn fs_main(in: VSOut) -> @location(0) vec4<f32> {
  return vec4<f32>(in.col, 1.0);
}
