// M0 spectrum fan-out: C source planes -> K kernel-response planes.

struct ExpandUniform {
  n2: u32,
  channels: u32,
  kernels: u32,
  _pad0: u32,
}

@group(0) @binding(0) var<uniform> U: ExpandUniform;
@group(0) @binding(1) var<storage, read> sourceSpectrum: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read> kernelSpectrum: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read_write> responseSpectrum: array<vec2<f32>>;

fn cmul_expand(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

@compute @workgroup_size(128)
fn spectral_expand(@builtin(global_invocation_id) g: vec3<u32>) {
  let total = U.kernels * U.n2;
  if (g.x >= total) { return; }
  let kernel = g.x / U.n2;
  let mode = g.x % U.n2;
  let source = kernel % U.channels;
  responseSpectrum[g.x] = cmul_expand(
    sourceSpectrum[source * U.n2 + mode],
    kernelSpectrum[g.x],
  );
}
