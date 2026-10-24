// Grow — "specimen under glass" (docs/planning/rebuild-v2/04-neural-ca.md § The look).
//
// A dark teal-black dish with a soft vignette and a rim highlight; the
// organism drawn from its premultiplied RGBA with B-spline reconstruction,
// a soft contact shadow so it sits on the agar, a little relief and gloss
// from its alpha, a thin membrane where the alpha falls off, and a gentle
// iridescent tint from its hidden channels (principal components, ~15 %).
// Render-only: every number the gate checks comes from the state buffer,
// never from these pixels. Writes linear HDR into the scene target.
#import bp/fullscreen

struct View {
  cam : vec4<f32>,     // centre x, y (domain cells), domain cells per target px, time (s)
  dims : vec4<f32>,    // target w, h (px); grid size (cells); prev → cur blend
  origin : vec4<f32>,  // grid origin x, y (domain cells); dish radius (cells); mode (0 specimen, 1 hidden, 2 cells)
  look : vec4<f32>,    // tint strength, membrane, contact shadow, relief
  agar : vec4<f32>,    // agar colour (linear), grain
  bench : vec4<f32>,   // bench colour (linear), vignette
  rim : vec4<f32>,     // rim / membrane colour (linear), rim width (cells)
  light : vec4<f32>,   // light direction (unit, z towards the viewer); compare split (target uv x, < 0 off)
  extra : vec4<f32>,   // organism fade, target px per cell, gloss, has compare
};

@group(0) @binding(0) var<uniform> V : View;
@group(0) @binding(1) var look_cur : texture_2d<f32>;
@group(0) @binding(2) var look_prev : texture_2d<f32>;
@group(0) @binding(3) var tint_tex : texture_2d<f32>;
@group(0) @binding(4) var look_cmp : texture_2d<f32>;
@group(0) @binding(5) var samp : sampler;
@group(0) @binding(6) var grain : texture_2d<f32>;

@vertex
fn vs(@builtin(vertex_index) vi : u32) -> FullscreenOut {
  return fullscreen_vertex(vi);
}

// Cubic B-spline from four bilinear taps (Sigg & Hadwiger, GPU Gems 2 ch. 20):
// positive weights, so premultiplied colour never rings or goes negative.
fn bspline(t : texture_2d<f32>, g : vec2<f32>) -> vec4<f32> {
  let size = vec2<f32>(V.dims.z);
  let p = g - 0.5;
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
  let a = textureSampleLevel(t, samp, vec2<f32>(x0.x, x0.y), 0.0);
  let b = textureSampleLevel(t, samp, vec2<f32>(x1.x, x0.y), 0.0);
  let c = textureSampleLevel(t, samp, vec2<f32>(x0.x, x1.y), 0.0);
  let d = textureSampleLevel(t, samp, vec2<f32>(x1.x, x1.y), 0.0);
  return g0.y * (g0.x * a + g1.x * b) + g1.y * (g0.x * c + g1.x * d);
}

// Zero outside the grid (the kernel zero-pads), with a half-cell soft edge.
fn inside(g : vec2<f32>) -> f32 {
  let n = V.dims.z;
  let e = min(min(g.x, g.y), min(n - g.x, n - g.y));
  return clamp(e + 0.5, 0.0, 1.0);
}

fn organism(g : vec2<f32>, use_cmp : bool) -> vec4<f32> {
  if (use_cmp) {
    return bspline(look_cmp, g) * inside(g);
  }
  return mix(bspline(look_prev, g), bspline(look_cur, g), V.dims.w) * inside(g);
}

// The shown state's alpha (shading derivatives: the current step is enough).
fn alpha_at(g : vec2<f32>, use_cmp : bool) -> f32 {
  if (use_cmp) {
    return bspline(look_cmp, g).a * inside(g);
  }
  return bspline(look_cur, g).a * inside(g);
}

// One bilinear tap of alpha (the soft contact shadow needs no more).
fn alpha_soft(g : vec2<f32>, use_cmp : bool) -> f32 {
  let uv = g / V.dims.z;
  if (use_cmp) {
    return textureSampleLevel(look_cmp, samp, uv, 0.0).a * inside(g);
  }
  return textureSampleLevel(look_cur, samp, uv, 0.0).a * inside(g);
}

fn hash12(p : vec2<f32>) -> f32 {
  let q = fract(p * vec2<f32>(0.1031, 0.1030));
  let r = q + dot(q, q.yx + 33.33);
  return fract((r.x + r.y) * r.x);
}

@fragment
fn fs(in : FullscreenOut) -> @location(0) vec4<f32> {
  let px = in.uv * V.dims.xy;
  let q = V.cam.xy + (px - 0.5 * V.dims.xy) * V.cam.z;
  let n = V.dims.z;
  let g = q - V.origin.xy;                 // grid cells
  let centre = V.origin.xy + vec2<f32>(0.5 * n);
  let R = V.origin.z;
  let mode = u32(V.origin.w + 0.5);
  let pxc = max(V.cam.z, 1e-6);            // cells per target px
  let use_cmp = V.extra.w > 0.5 && V.light.w >= 0.0 && in.uv.x < V.light.w;

  // ---- the dish -----------------------------------------------------------
  let d = q - centre;
  let r = length(d);
  let rim_w = max(V.rim.w, pxc * 1.5);
  let in_dish = 1.0 - smoothstep(R - pxc, R + pxc, r);
  // bench: dark, vignetted towards the screen edges
  let sv = (in.uv - 0.5) * vec2<f32>(V.dims.x / max(V.dims.y, 1.0), 1.0);
  let vig = 1.0 - V.bench.w * smoothstep(0.35, 1.05, length(sv));
  var c = V.bench.rgb * vig;
  // agar: lit from the centre, darker towards the glass
  let rr = clamp(r / max(R, 1.0), 0.0, 1.0);
  var agar = V.agar.rgb * (1.12 - 0.32 * rr * rr);
  agar = agar * (1.0 - 0.55 * smoothstep(R - 6.0 * rim_w, R, r));   // inner shade by the wall
  // grain fixed to the dish, so it moves with the camera
  let gp = vec2<i32>(floor(q * 2.0)) & vec2<i32>(63);
  let gr = textureLoad(grain, gp, 0).r - 0.5;
  agar = agar * (1.0 + gr * V.agar.w);

  // ---- the organism (only near the grid: the rest of the dish is agar) ------
  let near = all(g > vec2<f32>(-4.0)) && all(g < vec2<f32>(n + 4.0));
  if (!near) {
    c = mix(c, agar, in_dish);
  } else {
    let s = organism(g, use_cmp);
    let a = s.a * V.extra.x;
    let straight = s.rgb / max(s.a, 1e-3);
    // alpha gradient (cells) for relief, membrane and lighting
    let h = 0.75;
    let ax0 = alpha_at(g - vec2<f32>(h, 0.0), use_cmp);
    let ax1 = alpha_at(g + vec2<f32>(h, 0.0), use_cmp);
    let ay0 = alpha_at(g - vec2<f32>(0.0, h), use_cmp);
    let ay1 = alpha_at(g + vec2<f32>(0.0, h), use_cmp);
    let grad = vec2<f32>(ax1 - ax0, ay1 - ay0) / (2.0 * h);

    // contact shadow: the alpha a little down-light, softened over ~2 cells
    let off = -V.light.xy * 1.6;
    var sh = alpha_soft(g + off, use_cmp) * 0.4;
    sh = sh + alpha_soft(g + off + vec2<f32>(1.4, 0.0), use_cmp) * 0.15;
    sh = sh + alpha_soft(g + off - vec2<f32>(1.4, 0.0), use_cmp) * 0.15;
    sh = sh + alpha_soft(g + off + vec2<f32>(0.0, 1.4), use_cmp) * 0.15;
    sh = sh + alpha_soft(g + off - vec2<f32>(0.0, 1.4), use_cmp) * 0.15;
    agar = agar * (1.0 - V.look.z * sh * V.extra.x);
    c = mix(c, agar, in_dish);

    // the hidden channels, as colour
    let tv = bspline(tint_tex, g).xyz * inside(g);
    let irid = 0.5 + 0.5 * tanh(tv * 0.65);
    var body = straight;
    if (mode == 1u) {
      body = irid;
    } else {
      body = mix(straight, irid * (0.35 + 0.65 * dot(straight, vec3<f32>(0.2126, 0.7152, 0.0722))) * 1.6, V.look.x);
    }
    if (mode == 2u) {
      // raw cells: the texels as stored, nearest, with a faint grid when zoomed in
      let cell = vec2<i32>(floor(g));
      let ok = all(cell >= vec2<i32>(0)) && all(cell < vec2<i32>(i32(n)));
      let tc = clamp(cell, vec2<i32>(0), vec2<i32>(i32(n) - 1));
      var raw = textureLoad(look_cur, tc, 0);
      if (use_cmp) { raw = textureLoad(look_cmp, tc, 0); }
      raw = select(vec4<f32>(0.0), raw, ok);
      c = c * (1.0 - raw.a * V.extra.x) + raw.rgb * V.extra.x;
      let fg = abs(fract(g) - 0.5);
      let line = 1.0 - smoothstep(0.5 - pxc * 1.2, 0.5, max(fg.x, fg.y));
      let show = smoothstep(6.0, 14.0, V.extra.y) * select(0.0, 1.0, ok);
      c = mix(c, c + vec3<f32>(0.035, 0.05, 0.05), line * show);
    } else {
      // relief: the alpha as a soft dome; light from the upper left, gloss on top
      let nrm = normalize(vec3<f32>(-grad * V.look.w, 1.0));
      let l = V.light.xyz;
      let diffuse = clamp(dot(nrm, l) / max(l.z, 1e-3), 0.0, 1.5);
      var lit = body * (0.62 + 0.38 * diffuse);
      let hv = normalize(l + vec3<f32>(0.0, 0.0, 1.0));
      let spec = pow(max(dot(nrm, hv), 0.0), 48.0) * V.extra.z * smoothstep(0.2, 0.9, s.a);
      lit = lit + vec3<f32>(spec);
      c = c * (1.0 - a) + lit * a;
      // membrane: a thin line where the alpha falls off steeply
      let edge = clamp(length(grad) * 1.4, 0.0, 1.0) * (1.0 - abs(2.0 * s.a - 1.0));
      c = c + V.rim.rgb * edge * V.look.y * V.extra.x;
    }
  }

  // ---- the glass rim --------------------------------------------------------
  let ring = exp(-pow((r - R) / rim_w, 2.0));
  let dir = d / max(r, 1e-3);
  let lit_side = 0.35 + 0.65 * max(0.0, dot(dir, -V.light.xy));
  c = c + V.rim.rgb * ring * lit_side * 0.55;
  // a second, fainter reflection just inside the wall
  let ring2 = exp(-pow((r - (R - 3.5 * rim_w)) / (0.8 * rim_w), 2.0));
  c = c + V.rim.rgb * ring2 * max(0.0, dot(dir, V.light.xy)) * 0.12;

  // compare divider
  if (V.light.w >= 0.0 && V.extra.w > 0.5) {
    let dd = abs(in.uv.x - V.light.w) * V.dims.x;
    c = mix(c, vec3<f32>(0.85, 0.95, 0.95), (1.0 - smoothstep(0.75, 1.75, dd)) * 0.8);
  }
  // break up banding in the dark gradients before the tone map
  c = c + (hash12(px + fract(V.cam.w) * 61.0) - 0.5) * 0.0015;
  return vec4<f32>(max(c, vec3<f32>(0.0)), 1.0);
}
