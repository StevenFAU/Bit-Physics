// HDR composite: bloom mix → exposure → tone map → sRGB output → blue-noise dither.
#import bp/fullscreen
#import bp/tonemap

struct CompositeParams {
  tonemap: u32,       // 0 neutral, 1 agx, 2 none (clamp)
  dither: f32,        // amplitude in output LSB (1.0 = ±0.5 LSB)
  frame: u32,
  output_srgb: u32,   // 1 when the swapchain format is not *-srgb
  bloom: f32,         // mix weight of the bloom chain (0 = off)
  bloom_norm: f32,    // 1 / levels: the chain's top holds the sum of every level
  _p0: f32,
  _p1: f32,
};

struct ExposureState {
  exposure: f32,
  measured: f32,
  goal: f32,
  initialized: u32,
};

@group(0) @binding(0) var<uniform> P: CompositeParams;
@group(0) @binding(1) var scene: texture_2d<f32>;
@group(0) @binding(2) var scene_sampler: sampler;
@group(0) @binding(3) var noise: texture_2d<f32>;
@group(0) @binding(4) var<storage, read> X: ExposureState;
@group(0) @binding(5) var bloom: texture_2d<f32>;

@vertex
fn vs(@builtin(vertex_index) vi: u32) -> FullscreenOut {
  return fullscreen_vertex(vi);
}

@fragment
fn fs(in: FullscreenOut) -> @location(0) vec4<f32> {
  var lin = textureSampleLevel(scene, scene_sampler, in.uv, 0.0).rgb;
  let glow = textureSampleLevel(bloom, scene_sampler, in.uv, 0.0).rgb * P.bloom_norm;
  if (P.bloom > 0.0) {
    lin = mix(lin, glow, P.bloom);
  }
  let hdr = lin * X.exposure;
  var c: vec3<f32>;
  if (P.tonemap == 0u) {
    c = tonemap_neutral(hdr);
  } else if (P.tonemap == 1u) {
    c = tonemap_agx(hdr);
  } else {
    c = clamp(hdr, vec3<f32>(0.0), vec3<f32>(1.0));
  }
  if (P.output_srgb == 1u) {
    c = srgb_oetf(c);
  }
  let ip = vec2<u32>(in.pos.xy) % vec2<u32>(64u);
  let n = textureLoad(noise, vec2<i32>(ip), 0).r;
  c = c + vec3<f32>((n - 0.5) * P.dither / 255.0);
  return vec4<f32>(c, 1.0);
}
