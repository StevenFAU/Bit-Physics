// Accumulator (F3). New light is added into a frame target cleared every
// frame (additive splats stay small there, so rgba16float keeps their
// precision); the long exposure is then one fused write per pixel,
//   exposure' = exposure · decay + frame · gain_in
// (a single rounding to f16 per frame, never thousands of tiny blended
// increments onto a large value), and the result is added into the scene.
#import bp/fullscreen

struct AccParams {
  // x = decay, y = gain_in, z = composite gain
  k: vec4<f32>,
};

@group(0) @binding(0) var<uniform> A: AccParams;
@group(0) @binding(1) var frame: texture_2d<f32>;
@group(0) @binding(2) var exposure: texture_2d<f32>;

@vertex
fn vs(@builtin(vertex_index) vi: u32) -> FullscreenOut {
  return fullscreen_vertex(vi);
}

@fragment
fn fs_ema(@builtin(position) p: vec4<f32>) -> @location(0) vec4<f32> {
  let c = vec2<i32>(p.xy);
  return textureLoad(exposure, c, 0) * A.k.x + textureLoad(frame, c, 0) * A.k.y;
}

@fragment
fn fs_composite(@builtin(position) p: vec4<f32>) -> @location(0) vec4<f32> {
  let c = textureLoad(exposure, vec2<i32>(p.xy), 0);
  return vec4<f32>(c.rgb * A.k.z, 0.0);
}
