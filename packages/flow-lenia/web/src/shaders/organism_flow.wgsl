struct FlowUniform {
  n: u32,
  n2: u32,
  channels: u32,
  _pad0: u32,
  dt: f32,
  density_threshold: f32,
  density_exponent: f32,
  max_displacement: f32,
}
struct TransportCell {
  mass: vec4<f32>,
  displacement_x: vec4<f32>,
  displacement_y: vec4<f32>,
}
struct FlowDiagnostic { alpha: vec4<f32>, clamp_mask: vec4<f32> }

@group(0) @binding(0) var<uniform> U: FlowUniform;
@group(0) @binding(1) var<storage, read> massIn: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read> affinityIn: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> transportOut: array<TransportCell>;
@group(0) @binding(4) var<storage, read_write> diagnosticOut: array<FlowDiagnostic>;

fn wrap(value: i32) -> u32 { return u32((value + i32(U.n)) % i32(U.n)); }
fn index(i: i32, j: i32) -> u32 { return wrap(i) * U.n + wrap(j); }
fn density(cell: u32) -> f32 { return dot(massIn[cell], vec4<f32>(1.0, 1.0, 1.0, 0.0)); }

fn sobel_density(i: i32, j: i32) -> vec2<f32> {
  let di = density(index(i + 1, j - 1)) + 2.0 * density(index(i + 1, j)) + density(index(i + 1, j + 1))
    - density(index(i - 1, j - 1)) - 2.0 * density(index(i - 1, j)) - density(index(i - 1, j + 1));
  let dj = density(index(i - 1, j + 1)) + 2.0 * density(index(i, j + 1)) + density(index(i + 1, j + 1))
    - density(index(i - 1, j - 1)) - 2.0 * density(index(i, j - 1)) - density(index(i + 1, j - 1));
  return vec2<f32>(di, dj);
}

fn sobel_affinity(i: i32, j: i32, channel: u32) -> vec2<f32> {
  let di = affinityIn[index(i + 1, j - 1)][channel] + 2.0 * affinityIn[index(i + 1, j)][channel] + affinityIn[index(i + 1, j + 1)][channel]
    - affinityIn[index(i - 1, j - 1)][channel] - 2.0 * affinityIn[index(i - 1, j)][channel] - affinityIn[index(i - 1, j + 1)][channel];
  let dj = affinityIn[index(i - 1, j + 1)][channel] + 2.0 * affinityIn[index(i, j + 1)][channel] + affinityIn[index(i + 1, j + 1)][channel]
    - affinityIn[index(i - 1, j - 1)][channel] - 2.0 * affinityIn[index(i, j - 1)][channel] - affinityIn[index(i + 1, j - 1)][channel];
  return vec2<f32>(di, dj);
}

@compute @workgroup_size(8, 8)
fn compute_flow(@builtin(global_invocation_id) g: vec3<u32>) {
  if (g.x >= U.n || g.y >= U.n) { return; }
  let i = i32(g.x);
  let j = i32(g.y);
  let cell = g.x * U.n + g.y;
  let mass = massIn[cell];
  let pressure_gradient = sobel_density(i, j);
  var dx = vec4<f32>(0.0);
  var dy = vec4<f32>(0.0);
  var alpha = vec4<f32>(0.0);
  var clamped = vec4<f32>(0.0);
  for (var channel = 0u; channel < 3u; channel += 1u) {
    let gate = clamp(pow(mass[channel] / U.density_threshold, U.density_exponent), 0.0, 1.0);
    let gradient = sobel_affinity(i, j, channel);
    let flow = (1.0 - gate) * gradient - gate * pressure_gradient;
    let raw = U.dt * flow;
    let bounded = clamp(raw, vec2<f32>(-U.max_displacement), vec2<f32>(U.max_displacement));
    dx[channel] = bounded.x;
    dy[channel] = bounded.y;
    alpha[channel] = gate;
    clamped[channel] = select(0.0, 1.0, any(bounded != raw));
  }
  transportOut[cell] = TransportCell(mass, dx, dy);
  diagnosticOut[cell] = FlowDiagnostic(alpha, clamped);
}
