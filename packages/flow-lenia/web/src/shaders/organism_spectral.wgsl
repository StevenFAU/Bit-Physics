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
@group(0) @binding(1) var<storage, read> sourceSpectrum: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read> kernelSpectrum: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read> params: array<KernelParam>;
@group(0) @binding(4) var<storage, read_write> responseSpectrum: array<vec2<f32>>;

fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

@compute @workgroup_size(128)
fn expand_spectra(@builtin(global_invocation_id) g: vec3<u32>) {
  let total = U.kernels * U.n2;
  if (g.x >= total) { return; }
  let kernel = g.x / U.n2;
  let mode = g.x % U.n2;
  responseSpectrum[g.x] = cmul(
    sourceSpectrum[params[kernel].source * U.n2 + mode],
    kernelSpectrum[g.x],
  );
}
