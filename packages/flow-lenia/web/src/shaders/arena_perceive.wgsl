struct ArenaUniform {
  n: u32,
  n2: u32,
  channels: u32,
  kernels: u32,
  channelResponse: vec4<f32>,
  gateOpen: f32,
  step: f32,
  stormStart: f32,
  stormDuration: f32,
  stormCenterRadius: vec4<f32>,
  attractorCenterRadius: vec4<f32>,
  attractorMotion: vec4<f32>,
}
struct KernelParam {
  source: u32,
  target_channel: u32,
  mean: f32,
  width: f32,
  weight: f32,
  _pad0: f32,
  _pad1: f32,
  _pad2: f32,
}

@group(0) @binding(0) var<uniform> U: ArenaUniform;
@group(0) @binding(1) var<storage, read> response: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read> params: array<KernelParam>;
@group(0) @binding(3) var<storage, read> genomeH: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read_write> kernelFields: array<vec2<f32>>;
@group(0) @binding(5) var<storage, read_write> affinityOut: array<vec4<f32>>;
@group(0) @binding(6) var<storage, read> environment: array<vec4<f32>>;

fn gene_h(cell: u32, kernel: u32) -> f32 {
  return genomeH[cell * 3u + kernel / 4u][kernel % 4u];
}

fn torus_delta(value: f32) -> f32 { return value - round(value); }

fn external_affinity(cell: u32) -> f32 {
  let row = cell / U.n;
  let column = cell % U.n;
  let point = (vec2<f32>(f32(row), f32(column)) + 0.5) / f32(U.n);
  let authored = environment[cell];
  var value = authored.x + authored.y + (1.0 - U.gateOpen) * authored.z;
  if (U.stormDuration > 0.0 && U.step >= U.stormStart && U.step < U.stormStart + U.stormDuration) {
    let phase = (U.step - U.stormStart + 0.5) / U.stormDuration;
    let envelope = sin(3.141592653589793 * phase);
    let delta = vec2<f32>(torus_delta(point.x - U.stormCenterRadius.x), torus_delta(point.y - U.stormCenterRadius.y));
    let radius = max(U.stormCenterRadius.z, 1e-6);
    let radial = exp(-0.5 * dot(delta, delta) / (radius * radius));
    let angular = cos(3.0 * atan2(delta.y, delta.x) + 6.283185307179586 * envelope);
    value += U.stormCenterRadius.w * envelope * radial * angular;
  }
  if (U.attractorCenterRadius.w != 0.0) {
    let angle = U.attractorMotion.z + U.attractorMotion.y * U.step;
    let center = U.attractorCenterRadius.xy + U.attractorMotion.x * vec2<f32>(cos(angle), sin(angle));
    let delta = vec2<f32>(torus_delta(point.x - center.x), torus_delta(point.y - center.y));
    let radius = max(U.attractorCenterRadius.z, 1e-6);
    value += U.attractorCenterRadius.w * exp(-0.5 * dot(delta, delta) / (radius * radius));
  }
  return value;
}

@compute @workgroup_size(128)
fn perceive_arena(@builtin(global_invocation_id) g: vec3<u32>) {
  if (g.x >= U.n2) { return; }
  let inverse_n2 = 1.0 / f32(U.n2);
  var affinity = vec4<f32>(0.0);
  for (var kernel = 0u; kernel < 9u; kernel += 1u) {
    let index = kernel * U.n2 + g.x;
    let perception = response[index].x * inverse_n2;
    let parameter = params[kernel];
    let z = (perception - parameter.mean) / parameter.width;
    let growth = 2.0 * exp(-0.5 * z * z) - 1.0;
    kernelFields[index] = vec2<f32>(perception, growth);
    affinity[parameter.target_channel] += gene_h(g.x, kernel) * growth;
  }
  let environmentValue = external_affinity(g.x);
  affinity.xyz += U.channelResponse.xyz * environmentValue;
  affinityOut[g.x] = affinity;
}
