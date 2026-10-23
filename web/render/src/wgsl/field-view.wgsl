// FieldView2D: draws a 2D field into the HDR scene target as a lit material
// (height-from-field relief, gloss, a thin subsurface rim, paper grain) or as
// a scientific colormap with isolines, or as raw texels. Full-bleed: the
// camera always covers the viewport; outside a non-periodic domain the field
// continues as a darkened, softened context instead of black bars.
#import bp/fullscreen
#import bp/color

struct View {
  cam: vec4<f32>,     // centre.xy (cells), units per scene px, periodic
  dims: vec4<f32>,    // viewport px (w, h), domain cells (w, h)
  bg: vec4<f32>,      // background (linear rgb), a = paper grain
  ink: vec4<f32>,     // pattern colour (linear rgb), a = gloss
  accent: vec4<f32>,  // specular tint (linear rgb), a = shininess
  sss: vec4<f32>,     // rim tint (linear rgb), a = amount
  light: vec4<f32>,   // light dir xyz (unit), w = relief strength
  opts: vec4<f32>,    // mode (0 material, 1 cmap primary, 2 cmap secondary, 3 raw), sampling (0 bicubic, 1 bilinear), isolines, overlay amount
  ramp: vec4<f32>,    // primary → coverage: lo, hi; colormap range: lo, hi
  split: vec4<f32>,   // compare split x in uv (<0 off), divider alpha, unused, unused
};

@group(0) @binding(0) var<uniform> V: View;
@group(0) @binding(1) var field: texture_2d<f32>;
@group(0) @binding(2) var field_b: texture_2d<f32>;
@group(0) @binding(3) var overlay: texture_2d<f32>;
@group(0) @binding(4) var samp_wrap: sampler;
@group(0) @binding(5) var samp_clamp: sampler;
@group(0) @binding(6) var lut: texture_2d<f32>;
@group(0) @binding(7) var grain: texture_2d<f32>;

@vertex
fn vs(@builtin(vertex_index) vi: u32) -> FullscreenOut {
  return fullscreen_vertex(vi);
}

fn tap(t: texture_2d<f32>, uv: vec2<f32>) -> vec4<f32> {
  if (V.cam.w > 0.5) {
    return textureSampleLevel(t, samp_wrap, uv, 0.0);
  }
  return textureSampleLevel(t, samp_clamp, uv, 0.0);
}

// Cubic B-spline from four bilinear taps (Sigg & Hadwiger, GPU Gems 2 ch. 20).
fn bicubic(t: texture_2d<f32>, q: vec2<f32>) -> vec4<f32> {
  let size = V.dims.zw;
  let p = q - 0.5;
  let ip = floor(p);
  let f = p - ip;
  let f2 = f * f;
  let f3 = f2 * f;
  let w0 = (1.0 - 3.0 * f + 3.0 * f2 - f3) / 6.0;
  let w1 = (4.0 - 6.0 * f2 + 3.0 * f3) / 6.0;
  let w2 = (1.0 + 3.0 * f + 3.0 * f2 - 3.0 * f3) / 6.0;
  let w3 = f3 / 6.0;
  let g0 = w0 + w1;
  let g1 = w2 + w3;
  let x0 = (ip - 1.0 + w1 / g0 + 0.5) / size;
  let x1 = (ip + 1.0 + w3 / g1 + 0.5) / size;
  let a = tap(t, vec2<f32>(x0.x, x0.y));
  let b = tap(t, vec2<f32>(x1.x, x0.y));
  let c = tap(t, vec2<f32>(x0.x, x1.y));
  let d = tap(t, vec2<f32>(x1.x, x1.y));
  return g0.y * (g0.x * a + g1.x * b) + g1.y * (g0.x * c + g1.x * d);
}

fn sample_field(t: texture_2d<f32>, q: vec2<f32>) -> vec4<f32> {
  if (V.opts.y > 0.5) {
    return tap(t, q / V.dims.zw);
  }
  return bicubic(t, q);
}

fn raw_texel(t: texture_2d<f32>, q: vec2<f32>) -> vec4<f32> {
  let size = vec2<i32>(V.dims.zw);
  var c = vec2<i32>(floor(q));
  c = ((c % size) + size) % size;
  return textureLoad(t, c, 0);
}

fn shade_material(s: vec4<f32>, q: vec2<f32>) -> vec3<f32> {
  let cov = smoothstep(V.ramp.x, V.ramp.y, s.x);
  let base = mix(V.bg.rgb, V.ink.rgb, cov);
  // relief: the primary field is the height; gradient comes from the prep pass
  let k = V.light.w / max(V.ramp.y - V.ramp.x, 1e-3);
  let n = normalize(vec3<f32>(-s.z * k, -s.w * k, 1.0));
  let l = V.light.xyz;
  let flat_l = max(l.z, 1e-3);
  let diffuse = clamp(dot(n, l) / flat_l, 0.0, 1.6);
  let ambient = 0.55;
  var c = base * (ambient + (1.0 - ambient) * diffuse);
  // gloss on the raised material only
  let h = normalize(l + vec3<f32>(0.0, 0.0, 1.0));
  let spec = pow(max(dot(n, h), 0.0), V.accent.a) * V.ink.a * cov;
  c = c + V.accent.rgb * spec;
  // thin translucent rim where the material thins out
  let rim = cov * (1.0 - cov) * 4.0;
  c = c + V.sss.rgb * rim * V.sss.a;
  // paper grain on the ground, fixed to the domain so it moves with the camera
  let gp = vec2<i32>(floor(q * 1.7)) & vec2<i32>(63);
  let g = textureLoad(grain, gp, 0).r - 0.5;
  c = c * (1.0 + g * V.bg.a * (1.0 - cov));
  return c;
}

@fragment
fn fs(in: FullscreenOut) -> @location(0) vec4<f32> {
  let px = in.uv * V.dims.xy;
  let q0 = V.cam.xy + (px - 0.5 * V.dims.xy) * V.cam.z;
  let domain = V.dims.zw;
  var q = q0;
  var outside = 0.0;
  if (V.cam.w < 0.5) {
    let clamped = clamp(q0, vec2<f32>(0.0), domain);
    outside = length(q0 - clamped);
    q = clamped;
  }
  let use_b = V.split.x >= 0.0 && in.uv.x < V.split.x;

  // uniform control flow: sample both, then select (fwidth below needs it)
  let sa = sample_field(field, q);
  let sb = sample_field(field_b, q);
  var s = select(sa, sb, use_b);
  let mode = u32(V.opts.x + 0.5);
  if (mode == 3u) {
    let ra = raw_texel(field, q);
    let rb = raw_texel(field_b, q);
    s = select(ra, rb, use_b);
  }

  var c: vec3<f32>;
  if (mode == 0u) {
    c = shade_material(s, q);
  } else {
    let v = select(s.x, s.y, mode == 2u);
    let t = (v - V.ramp.z) / max(V.ramp.w - V.ramp.z, 1e-6);
    c = colormap_lut(lut, samp_clamp, t);
  }

  // isolines of the primary field (fwidth evaluated unconditionally)
  let levels = V.opts.z;
  let iv = s.x * max(levels, 1.0) / max(V.ramp.w - V.ramp.z, 1e-6);
  let fw = max(fwidth(iv), 1e-5);
  let fd = abs(fract(iv + 0.5) - 0.5);
  let line = (1.0 - smoothstep(0.0, 1.25 * fw, fd)) * select(0.0, 1.0, levels > 0.5);
  c = mix(c, vec3<f32>(0.95, 0.93, 0.88), line * 0.55);

  // painted overlay (e.g. local chemistry): a subtle multiplicative tint by
  // the overlay's own colour, weighted by its alpha
  let o = tap(overlay, q / domain);
  c = mix(c, c * (vec3<f32>(0.55) + 0.9 * o.rgb), o.a * V.opts.w);

  // context continuation outside a bounded domain: darker, desaturated
  if (outside > 0.0) {
    let fade = smoothstep(0.0, 0.06 * max(domain.x, domain.y), outside);
    let grey = vec3<f32>(dot(c, vec3<f32>(0.2126, 0.7152, 0.0722)));
    c = mix(c, mix(grey, V.bg.rgb, 0.5) * 0.45, 0.35 + 0.5 * fade);
  }

  // compare divider
  if (V.split.x >= 0.0) {
    let d = abs(in.uv.x - V.split.x) * V.dims.x;
    c = mix(c, vec3<f32>(1.0, 0.98, 0.94), (1.0 - smoothstep(0.75, 1.75, d)) * V.split.y);
  }
  return vec4<f32>(c, 1.0);
}
