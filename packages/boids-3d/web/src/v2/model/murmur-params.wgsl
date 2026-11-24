// murmur/params — Murmuration v2's per-step uniforms (model/murmur.ts packParams)
// and the dense grid's cell helpers, shared by murmur-grid.wgsl and murmur.wgsl.
// One 256-byte slot per step on a dynamic-offset ring.

struct Params {
  // birds, cells, nx, ny
  counts: vec4<u32>,
  // nz, largest shell, this step's number, flags (bit 0: falcon flying; bits 8-15: tool)
  grid: vec4<u32>,
  // box minimum xyz, cell edge
  grid_min: vec4<f32>,
  // 1 / cell edge, social reach², separation radius, blind-cone cosine
  grid_inv: vec4<f32>,
  // alignment, cohesion, separation, roost
  weights: vec4<f32>,
  // slowest, cruise, fastest speed, largest turn rate (rad/s)
  flight: vec4<f32>,
  // dt, time, noise, bank response (1/s)
  time: vec4<f32>,
  // roost: horizontal radius, preferred height, floor, ceiling (model y)
  roost: vec4<f32>,
  // falcon: xyz, detection radius
  falcon: vec4<f32>,
  // falcon: velocity xyz, the radius birds dodge
  falcon_v: vec4<f32>,
  // alarm, in steps: direct reaction, contagion reaction, refractory, unused
  alarm: vec4<u32>,
  // alarm decay (1/s), contagion threshold, escape weight, edge cohesion gain
  alarm_f: vec4<f32>,
  // tool point xyz, radius
  tool: vec4<f32>,
  // tool direction xyz, strength
  tool_v: vec4<f32>,
}

fn cell_of(position: vec3<f32>) -> vec3<i32> {
  let c = vec3<i32>(floor((position - p.grid_min.xyz) * p.grid_inv.x));
  return clamp(c, vec3<i32>(0), vec3<i32>(i32(p.counts.z) - 1, i32(p.counts.w) - 1, i32(p.grid.x) - 1));
}

fn cell_id(c: vec3<i32>) -> u32 {
  return u32(c.x) + p.counts.z * (u32(c.y) + p.counts.w * u32(c.z));
}
