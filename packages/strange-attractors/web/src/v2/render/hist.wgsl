// A counts buffer drawn as a heat map into its own canvas (Road to Chaos,
// Lorenz's Map, Slice). counts[row * w + col], row 0 at the bottom. Each
// pixel is log(1 + c) / log(1 + scale), where scale is the column's own
// total (per-column mode: a bifurcation diagram, where a periodic column
// gathers all its peaks in a few bins) or the whole histogram's.
#import bp/fullscreen
#import bp/color

struct HistParams {
  // w, h (bins), mode (0 = whole, 1 = per column), unused
  dims: vec4<u32>,
  // x = scale factor on the totals, y = gamma, z = floor (dim but visible)
  look: vec4<f32>,
};

@group(0) @binding(0) var<uniform> H: HistParams;
@group(0) @binding(1) var<storage, read> counts: array<u32>;
@group(0) @binding(2) var<storage, read> totals: array<u32>;
@group(0) @binding(3) var lut: texture_2d<f32>;
@group(0) @binding(4) var lut_sampler: sampler;

@vertex
fn vs(@builtin(vertex_index) vi: u32) -> FullscreenOut {
  return fullscreen_vertex(vi);
}

fn to_srgb(c: vec3<f32>) -> vec3<f32> {
  let lo = c * 12.92;
  let hi = 1.055 * pow(c, vec3<f32>(1.0 / 2.4)) - vec3<f32>(0.055);
  return select(hi, lo, c <= vec3<f32>(0.0031308));
}

@fragment
fn fs(in: FullscreenOut) -> @location(0) vec4<f32> {
  let w = H.dims.x;
  let h = H.dims.y;
  let col = min(u32(in.uv.x * f32(w)), w - 1u);
  let row = min(u32((1.0 - in.uv.y) * f32(h)), h - 1u);
  let c = f32(counts[row * w + col]);
  var total = f32(totals[0]);
  if (H.dims.z == 1u) {
    total = f32(totals[col]);
  }
  let scale = max(total * H.look.x, 1.0);
  var v = 0.0;
  if (c > 0.0) {
    v = H.look.z + (1.0 - H.look.z) * clamp(log(1.0 + c) / log(1.0 + scale), 0.0, 1.0);
  }
  let g = pow(v, H.look.y);
  let rgb = colormap_lut(lut, lut_sampler, g) * select(0.0, 1.0, c > 0.0);
  return vec4<f32>(to_srgb(rgb), 1.0);
}
