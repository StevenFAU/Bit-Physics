struct GridUniform { n: u32, n2: u32, channels: u32, kernels: u32 }

@group(0) @binding(0) var<uniform> U: GridUniform;
@group(0) @binding(1) var<storage, read> massIn: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> complexOut: array<vec2<f32>>;

@compute @workgroup_size(128)
fn pack_mass(@builtin(global_invocation_id) g: vec3<u32>) {
  let total = U.channels * U.n2;
  if (g.x >= total) { return; }
  let channel = g.x / U.n2;
  let cell = g.x % U.n2;
  complexOut[g.x] = vec2<f32>(massIn[cell][channel], 0.0);
}
