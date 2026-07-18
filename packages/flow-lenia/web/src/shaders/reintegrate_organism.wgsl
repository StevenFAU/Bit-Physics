struct GatherUniform {
  n: u32,
  channels: u32,
  dd: u32,
  _pad0: u32,
  sigma: f32,
  _pad1: f32,
  _pad2: f32,
  _pad3: f32,
}
struct TransportCell {
  mass: vec4<f32>,
  displacement_x: vec4<f32>,
  displacement_y: vec4<f32>,
}

@group(0) @binding(0) var<uniform> U: GatherUniform;
@group(0) @binding(1) var<storage, read> transportIn: array<TransportCell>;
@group(0) @binding(2) var<storage, read_write> massOut: array<vec4<f32>>;

fn wrap_offset(x: u32, offset: i32) -> u32 { return u32((i32(x) + offset + i32(U.n)) % i32(U.n)); }
fn periodic_delta(destination: u32, source: u32, displacement: f32) -> f32 {
  let raw = f32(destination) - (f32(source) + displacement);
  return raw - round(raw / f32(U.n)) * f32(U.n);
}
fn overlap_1d(delta: f32) -> f32 {
  return clamp(U.sigma + 0.5 - abs(delta), 0.0, min(1.0, 2.0 * U.sigma));
}
fn overlap_weight(di: u32, dj: u32, si: u32, sj: u32, displacement: vec2<f32>) -> f32 {
  let delta_i = periodic_delta(di, si, displacement.x);
  let delta_j = periodic_delta(dj, sj, displacement.y);
  return overlap_1d(delta_i) * overlap_1d(delta_j) / (4.0 * U.sigma * U.sigma);
}

@compute @workgroup_size(8, 8)
fn gather_organism(@builtin(global_invocation_id) g: vec3<u32>) {
  if (g.x >= U.n || g.y >= U.n) { return; }
  var result = vec4<f32>(0.0);
  for (var oi = -5; oi <= 5; oi += 1) {
    let si = wrap_offset(g.x, oi);
    for (var oj = -5; oj <= 5; oj += 1) {
      let sj = wrap_offset(g.y, oj);
      let source = transportIn[si * U.n + sj];
      for (var channel = 0u; channel < 3u; channel += 1u) {
        let weight = overlap_weight(g.x, g.y, si, sj, vec2<f32>(source.displacement_x[channel], source.displacement_y[channel]));
        result[channel] += source.mass[channel] * weight;
      }
    }
  }
  massOut[g.x * U.n + g.y] = result;
}
