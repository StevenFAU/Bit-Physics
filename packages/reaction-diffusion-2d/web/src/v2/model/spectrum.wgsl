// Turing Patterns — the wavelength instrument: a Hann-windowed N×N window of
// the pattern field (V for Gray–Scott) around a point, a 2D FFT (the shared Stockham core from
// common/common-web/src/fft-wgsl.ts, spliced at the marker below), and the
// radially averaged power spectrum. Display-side: reads the state read-only.

//__COMMON_FFT__

struct Spec {
  n: u32,
  stage: u32,
  axis: u32,       // 0 rows, 1 columns
  log2n: u32,
  cx: f32,         // window centre (cells)
  cy: f32,
  w: u32,          // state grid
  h: u32,
  periodic: u32,
  channel: u32,     // which field (0 u, 1 v)
  offset: f32,      // reference level subtracted before the window (see load)
  _p2: u32,
};

@group(0) @binding(0) var<uniform> P: Spec;
@group(0) @binding(1) var<storage, read> state: array<f32>;
@group(0) @binding(2) var<storage, read_write> src: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read_write> dst: array<vec2<f32>>;
@group(0) @binding(4) var<storage, read_write> radial: array<f32>;

fn sample_v(x: i32, y: i32) -> f32 {
  var xx: i32;
  var yy: i32;
  if (P.periodic == 1u) {
    xx = ((x % i32(P.w)) + i32(P.w)) % i32(P.w);
    yy = ((y % i32(P.h)) + i32(P.h)) % i32(P.h);
  } else {
    xx = clamp(x, 0, i32(P.w) - 1);
    yy = clamp(y, 0, i32(P.h) - 1);
  }
  return state[(u32(yy) * P.w + u32(xx)) * 2u + P.channel];
}

@compute @workgroup_size(64, 1, 1)
fn load(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = P.n;
  if (gid.x >= n * n) { return; }
  let x = gid.x % n;
  let y = gid.x / n;
  let ox = i32(floor(P.cx)) - i32(n / 2u);
  let oy = i32(floor(P.cy)) - i32(n / 2u);
  // Hann window (display instrument — builtin cos is fine here)
  let tau = 6.283185307179586;
  let wx = 0.5 - 0.5 * cos(tau * (f32(x) + 0.5) / f32(n));
  let wy = 0.5 - 0.5 * cos(tau * (f32(y) + 0.5) / f32(n));
  // Subtracting a reference level first (the check passes the known uniform
  // state; Learn passes 0) keeps a large mean out of the f32 FFT, whose
  // round-off would otherwise spread ~1e-7 of the DC term into every ring.
  dst[gid.x] = vec2<f32>((sample_v(ox + i32(x), oy + i32(y)) - P.offset) * wx * wy, 0.0);
}

@compute @workgroup_size(64, 1, 1)
fn stage(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = P.n;
  let half = n / 2u;
  if (gid.x >= half * n) { return; }
  let line = gid.x / half;
  let t = gid.x % half;
  let bf = fft_butterfly(t, P.stage, half, -1.0);
  var ia: u32; var ib: u32; var ic: u32; var id: u32;
  if (P.axis == 0u) {
    ia = line * n + bf.ea; ib = line * n + bf.eb; ic = line * n + bf.ec; id = line * n + bf.ed;
  } else {
    ia = bf.ea * n + line; ib = bf.eb * n + line; ic = bf.ec * n + line; id = bf.ed * n + line;
  }
  let a = src[ia];
  let b = cmul(bf.w, src[ib]);
  dst[ic] = a + b;
  dst[id] = a - b;
}

@compute @workgroup_size(64, 1, 1)
fn power(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = P.n;
  let half = n / 2u;
  let r = gid.x;
  if (r >= half) { return; }
  var sum = 0.0;
  var count = 0.0;
  for (var y = 0u; y < n; y = y + 1u) {
    let fy = select(f32(y), f32(y) - f32(n), y > half);
    for (var x = 0u; x < n; x = x + 1u) {
      let fx = select(f32(x), f32(x) - f32(n), x > half);
      let rr = u32(round(sqrt(fx * fx + fy * fy)));
      if (rr == r) {
        let c = src[y * n + x];
        sum = sum + dot(c, c);
        count = count + 1.0;
      }
    }
  }
  radial[r] = select(0.0, sum / count, count > 0.0);
}
