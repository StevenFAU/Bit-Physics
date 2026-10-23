// bp/color — colour helpers for scene shaders (linear space throughout).

fn srgb_to_linear(c: vec3<f32>) -> vec3<f32> {
  let lo = c / 12.92;
  let hi = pow((c + vec3<f32>(0.055)) / 1.055, vec3<f32>(2.4));
  return select(hi, lo, c <= vec3<f32>(0.04045));
}

/// Sample a 256×1 colormap LUT (rgba8unorm-srgb, so the read is linear).
fn colormap_lut(lut: texture_2d<f32>, s: sampler, t: f32) -> vec3<f32> {
  let x = (clamp(t, 0.0, 1.0) * 255.0 + 0.5) / 256.0;
  return textureSampleLevel(lut, s, vec2<f32>(x, 0.5), 0.0).rgb;
}
