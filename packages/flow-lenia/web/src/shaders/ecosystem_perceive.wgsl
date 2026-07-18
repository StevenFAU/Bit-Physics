struct GridUniform { n: u32, n2: u32, channels: u32, kernels: u32 }
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

@group(0) @binding(0) var<uniform> U: GridUniform;
@group(0) @binding(1) var<storage, read> response: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read> params: array<KernelParam>;
@group(0) @binding(3) var<storage, read> genomeH: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read_write> kernelFields: array<vec2<f32>>;
@group(0) @binding(5) var<storage, read_write> affinityOut: array<vec4<f32>>;

fn gene_h(cell: u32, kernel: u32) -> f32 {
  return genomeH[cell * 3u + kernel / 4u][kernel % 4u];
}

@compute @workgroup_size(128)
fn perceive_ecosystem(@builtin(global_invocation_id) g: vec3<u32>) {
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
  affinityOut[g.x] = affinity;
}
