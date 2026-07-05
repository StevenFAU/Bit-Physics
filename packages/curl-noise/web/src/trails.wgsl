// curl-noise — persistence-trail + bloom post stack (web spec § 5).
//
// Mapbox / earth.nullschool wind-map lineage: ping-pong two offscreen
// RGBA16F targets — draw the previous frame dimmed (x fade), splat the
// particles on top, swap; composite with exposure tonemap + optional
// half-res bloom. Cost is INDEPENDENT of tracer count; tracer state is
// untouched, so trails are pure post-fx and stay ON in the gated state.
// fp16 accumulation is mandatory (8-bit dim-factor quantization leaves
// permanent gray ghosts). f16 lives ONLY here — never in gated arithmetic.

struct PU {
  // x = fade (0 = trails off), y = exposure, z = bloom strength, w = unused
  params: vec4<f32>,
  // xy = blur direction in texels, zw = unused
  dir: vec4<f32>,
}
@group(0) @binding(0) var<uniform> P: PU;
@group(0) @binding(1) var srcTex: texture_2d<f32>;
@group(0) @binding(2) var srcSamp: sampler;
@group(0) @binding(3) var bloomTex: texture_2d<f32>;

struct FSIn {
  @builtin(position) pos: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

@vertex
fn vs_fullscreen(@builtin(vertex_index) vid: u32) -> FSIn {
  // single fullscreen triangle
  var out: FSIn;
  let x = f32(i32(vid & 1u) * 4 - 1);
  let y = f32(i32(vid >> 1u) * 4 - 1);
  out.pos = vec4<f32>(x, y, 0.0, 1.0);
  out.uv = vec2<f32>(x, -y) * 0.5 + vec2<f32>(0.5);
  return out;
}

// previous trail frame, dimmed — the persistence kernel
@fragment
fn fs_fade(in: FSIn) -> @location(0) vec4<f32> {
  let prev = textureSampleLevel(srcTex, srcSamp, in.uv, 0.0);
  return vec4<f32>(prev.rgb * P.params.x, 1.0);
}

// separable 9-tap gaussian (bloom)
@fragment
fn fs_blur(in: FSIn) -> @location(0) vec4<f32> {
  var w = array<f32, 5>(0.2270270, 0.1945946, 0.1216216, 0.0540541, 0.0162162);
  var acc = textureSampleLevel(srcTex, srcSamp, in.uv, 0.0).rgb * w[0];
  for (var k = 1; k < 5; k++) {
    let o = P.dir.xy * f32(k);
    acc += textureSampleLevel(srcTex, srcSamp, in.uv + o, 0.0).rgb * w[k];
    acc += textureSampleLevel(srcTex, srcSamp, in.uv - o, 0.0).rgb * w[k];
  }
  return vec4<f32>(acc, 1.0);
}

// thresholded half-res downsample feeding the blur chain
// (threshold rides P.params.w so the pipeline keeps the uniform binding)
@fragment
fn fs_bright(in: FSIn) -> @location(0) vec4<f32> {
  let c = textureSampleLevel(srcTex, srcSamp, in.uv, 0.0).rgb;
  let t = max(c - vec3<f32>(P.params.w), vec3<f32>(0.0));
  return vec4<f32>(t, 1.0);
}

// composite: HDR trail buffer (+bloom) -> tonemapped canvas
@fragment
fn fs_composite(in: FSIn) -> @location(0) vec4<f32> {
  var hdr = textureSampleLevel(srcTex, srcSamp, in.uv, 0.0).rgb;
  hdr += textureSampleLevel(bloomTex, srcSamp, in.uv, 0.0).rgb * P.params.z;
  let mapped = vec3<f32>(1.0) - exp(-hdr * P.params.y);
  return vec4<f32>(mapped, 1.0);
}
