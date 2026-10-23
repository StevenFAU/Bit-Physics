// Bloom (00-foundation.md § 3.1): a dual-filter mip chain on the HDR scene.
// `down` halves resolution with the 13-tap filter of Jimenez (2014, "Next
// generation post processing in Call of Duty: Advanced Warfare"); the first
// level uses the Karis average so single bright pixels (agent sparks) do not
// flicker. `up` adds a 3×3 tent of the coarser level to this level's
// downsample, so the chain's top holds the sum of every blur radius. The
// composite divides by the level count and mixes it in — threshold-free and
// energy-preserving: weights sum to one, and every filter preserves energy.
#import bp/fullscreen
#import bp/tonemap

struct BloomParams {
  texel: vec2<f32>,  // 1 / size of `src`
  karis: u32,        // 1 on the first downsample
  _p0: u32,
};

@group(0) @binding(0) var<uniform> B: BloomParams;
@group(0) @binding(1) var src: texture_2d<f32>;
@group(0) @binding(2) var samp: sampler;
@group(0) @binding(3) var base: texture_2d<f32>;

@vertex
fn vs(@builtin(vertex_index) vi: u32) -> FullscreenOut {
  return fullscreen_vertex(vi);
}

fn tap(uv: vec2<f32>, dx: f32, dy: f32) -> vec3<f32> {
  return textureSampleLevel(src, samp, uv + B.texel * vec2<f32>(dx, dy), 0.0).rgb;
}

fn karis_avg(a: vec3<f32>, b: vec3<f32>, c: vec3<f32>, d: vec3<f32>) -> vec3<f32> {
  let wa = 1.0 / (1.0 + luminance(a));
  let wb = 1.0 / (1.0 + luminance(b));
  let wc = 1.0 / (1.0 + luminance(c));
  let wd = 1.0 / (1.0 + luminance(d));
  return (a * wa + b * wb + c * wc + d * wd) / (wa + wb + wc + wd);
}

@fragment
fn down(in: FullscreenOut) -> @location(0) vec4<f32> {
  let uv = in.uv;
  let a = tap(uv, -2.0, -2.0);
  let b = tap(uv, 0.0, -2.0);
  let c = tap(uv, 2.0, -2.0);
  let d = tap(uv, -2.0, 0.0);
  let e = tap(uv, 0.0, 0.0);
  let f = tap(uv, 2.0, 0.0);
  let g = tap(uv, -2.0, 2.0);
  let h = tap(uv, 0.0, 2.0);
  let i = tap(uv, 2.0, 2.0);
  let j = tap(uv, -1.0, -1.0);
  let k = tap(uv, 1.0, -1.0);
  let l = tap(uv, -1.0, 1.0);
  let m = tap(uv, 1.0, 1.0);
  var o: vec3<f32>;
  if (B.karis == 1u) {
    o = karis_avg(j, k, l, m) * 0.5
      + (karis_avg(a, b, d, e) + karis_avg(b, c, e, f) + karis_avg(d, e, g, h) + karis_avg(e, f, h, i)) * 0.125;
  } else {
    o = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
  }
  return vec4<f32>(max(o, vec3<f32>(0.0)), 1.0);
}

@fragment
fn up(in: FullscreenOut) -> @location(0) vec4<f32> {
  let uv = in.uv;
  let s = (tap(uv, -1.0, -1.0) + tap(uv, 1.0, -1.0) + tap(uv, -1.0, 1.0) + tap(uv, 1.0, 1.0))
    + (tap(uv, 0.0, -1.0) + tap(uv, -1.0, 0.0) + tap(uv, 1.0, 0.0) + tap(uv, 0.0, 1.0)) * 2.0
    + tap(uv, 0.0, 0.0) * 4.0;
  let here = textureSampleLevel(base, samp, uv, 0.0).rgb;
  return vec4<f32>(here + s / 16.0, 1.0);
}
