// Flow Lenia M0 — batched plane-aware 2D Stockham coordinate surface.
// The numerical butterfly and precision trig are injected verbatim from
// common/common-web/src/fft-wgsl.ts. This file owns only plane/axis addressing.

struct FftUniform {
  n: u32,
  planes: u32,
  half_n2: u32,
  _pad0: u32,
}

struct FftPass {
  axis: u32,
  stage: u32,
  dir: f32,
  _pad0: u32,
}

@group(0) @binding(0) var<uniform> U: FftUniform;
@group(0) @binding(1) var<storage, read> cIn: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read_write> cOut: array<vec2<f32>>;
@group(1) @binding(0) var<uniform> P: FftPass;

//__COMMON_FFT__

fn idx2(x: u32, y: u32) -> u32 { return y * U.n + x; }

fn coord_of(plane: u32, line_id: u32, e: u32) -> u32 {
  let in_plane = select(idx2(line_id, e), idx2(e, line_id), P.axis == 0u);
  return plane * U.n * U.n + in_plane;
}

@compute @workgroup_size(128)
fn fft_pass(@builtin(global_invocation_id) g: vec3<u32>) {
  let total = U.planes * U.half_n2;
  if (g.x >= total) { return; }
  let plane = g.x / U.half_n2;
  let local = g.x % U.half_n2;
  let half_line = U.n / 2u;
  let line_id = local / half_line;
  let t = local % half_line;
  let fb = fft_butterfly(t, P.stage, half_line, P.dir);
  let va = cIn[coord_of(plane, line_id, fb.ea)];
  let vb = cmul(fb.w, cIn[coord_of(plane, line_id, fb.eb)]);
  cOut[coord_of(plane, line_id, fb.ec)] = va + vb;
  cOut[coord_of(plane, line_id, fb.ed)] = va - vb;
}
