// Murmuration — the sky seen through the flock. The scene target already
// holds the dusk; this pass multiplies it by the flock's transmittance
// T = exp(−τ) (blend: dst × src), leaving a little of the sky's own light on
// the birds themselves (they are dark, faintly blue-black, lit by the sky
// they are seen against): dst · (T + (1 − T) · tint).
#import bp/fullscreen

struct Comp {
  // rgb = the birds' share of the sky light behind them, w = 1 / fixed-point scale
  tint: vec4<f32>,
  // x = target width (px), y = optical-depth gain (1 = as splatted)
  size: vec4<f32>,
};

@group(0) @binding(0) var<uniform> C: Comp;
@group(0) @binding(1) var<storage, read> tau: array<u32>;

@vertex
fn vs(@builtin(vertex_index) vi: u32) -> FullscreenOut {
  return fullscreen_vertex(vi);
}

@fragment
fn fs(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
  let x = u32(pos.x);
  let y = u32(pos.y);
  let t = f32(tau[y * u32(C.size.x) + x]) * C.tint.w * C.size.y;
  let T = exp(-t);
  return vec4<f32>(vec3<f32>(T) + (1.0 - T) * C.tint.rgb, 1.0);
}

// The near birds (render/near-birds.ts): their resolved layer, premultiplied, laid over.
@group(0) @binding(2) var near_tex: texture_2d<f32>;

@fragment
fn fs_near(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
  return textureLoad(near_tex, vec2<i32>(pos.xy), 0);
}
