// LiquidSurface (F4): screen-space fluid rendering for particle liquids
// (00-foundation.md § 3.4; Water in Hand, Wave Tank, Materials).
//
//   grab       full res    the scene behind the liquid -> `background`
//   splat      liquid res  sphere impostors -> nearest eye depth (r32float)
//   filter     liquid res  narrow-range filter (after Truong & Yuksel 2018):
//                          separable x / y passes, then a 5×5 clean-up
//   thickness  liquid res  additive chord lengths -> thickness (r16float)
//   normals    liquid res  world normals from the filtered depth
//                          (choose-smaller-difference, Green GDC 2010)
//   composite  full res    Beer–Lambert absorption of the refracted scene
//                          behind, Schlick-Fresnel reflection of the
//                          environment probe, a sharp key-light highlight,
//                          an optional foam layer; writes its depth
//
// Pure rendering: never gated. Builtin exp/pow are fine here.
#import bp/fullscreen
#import bp/view3d

struct LiquidParams {
  // x = particle radius (model units), y = thickness per chord (volume
  // normalisation), z = refraction strength (screen offset per unit
  // thickness per unit normal), w = largest thickness that refracts
  shape: vec4<f32>,
  // x = particle count, y = stride (f32s), z = offset of x (f32s), w = flags
  // (bit 0: an environment probe is bound)
  ints: vec4<u32>,
  // liquid targets: (w px, h px, 1/w, 1/h)
  size: vec4<f32>,
  // narrow-range filter: x = largest kernel radius (px), y = kernel radius
  // (model units), z = mu (clamp band, model units), w = delta (a sample
  // nearer than this is another surface, model units)
  nrf: vec4<f32>,
  // rgb absorption per world unit of thickness, w = environment gain
  absorb: vec4<f32>,
  // rgb in-scattered radiance (the body's own colour), w = Schlick F0
  scatter: vec4<f32>,
  // xyz world direction towards the key light, w = Blinn exponent
  light_dir: vec4<f32>,
  // rgb highlight radiance, w = unused
  light_col: vec4<f32>,
  // rgb foam colour, w = foam gain
  foam: vec4<f32>,
};

@group(0) @binding(0) var<uniform> V: View3D;
@group(0) @binding(1) var<uniform> L: LiquidParams;

const CORNERS = array<vec2<f32>, 6>(
  vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0),
  vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, 1.0), vec2<f32>(-1.0, 1.0),
);

/// View space -> clip (the perspective() projection V.proj describes).
fn proj_view(p: vec3<f32>) -> vec4<f32> {
  let n = V.proj.z;
  let f = V.proj.w;
  return vec4<f32>(V.proj.x * p.x, V.proj.y * p.y, (f / (n - f)) * p.z + (n * f) / (n - f), -p.z);
}

/// Eye depth (distance along the view axis) -> WebGPU NDC depth.
fn ndc_depth(d: f32) -> f32 {
  let n = V.proj.z;
  let f = V.proj.w;
  return clamp(f * (d - n) / ((f - n) * d), 0.0, 1.0);
}

/// World direction of the ray through target uv (0,0 top-left).
fn ray_dir(uv: vec2<f32>) -> vec3<f32> {
  let ndc = vec2<f32>(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0);
  let a = V.inv_view_proj * vec4<f32>(ndc, 0.0, 1.0);
  let b = V.inv_view_proj * vec4<f32>(ndc, 1.0, 1.0);
  return normalize(b.xyz / b.w - a.xyz / a.w);
}

/// World position at target uv and eye depth d.
fn world_at(uv: vec2<f32>, d: f32) -> vec3<f32> {
  let r = ray_dir(uv);
  let fwd = ray_dir(vec2<f32>(0.5, 0.5));
  return V.eye.xyz + r * (d / max(dot(r, fwd), 1e-4));
}

// ------------------------------------------------------------- grab --

@group(0) @binding(2) var grab_src: texture_2d<f32>;

@vertex
fn vs_full(@builtin(vertex_index) vi: u32) -> FullscreenOut {
  return fullscreen_vertex(vi);
}

@fragment
fn fs_grab(in: FullscreenOut) -> @location(0) vec4<f32> {
  return textureLoad(grab_src, vec2<i32>(in.pos.xy), 0);
}

// ------------------------------------------------- splat + thickness --

@group(0) @binding(3) var<storage, read> particles: array<f32>;

struct SplatOut {
  @builtin(position) clip: vec4<f32>,
  @location(0) corner: vec2<f32>,
  // view-space z of the centre (negative), radius (world)
  @location(1) zr: vec2<f32>,
};

@vertex
fn vs_splat(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> SplatOut {
  var o: SplatOut;
  let b = ii * L.ints.y + L.ints.z;
  let p = vec3<f32>(particles[b], particles[b + 1u], particles[b + 2u]);
  let c = (V.mv * vec4<f32>(p, 1.0)).xyz;
  let r = L.shape.x * V.eye_model.w;
  if (c.z > -V.proj.z - r) {
    o.clip = vec4<f32>(2.0, 2.0, 2.0, 1.0); // through the near plane: off-screen
    return o;
  }
  let k = CORNERS[vi];
  o.clip = proj_view(c + vec3<f32>(k * r, 0.0));
  o.corner = k;
  o.zr = vec2<f32>(c.z, r);
  return o;
}

struct DepthOut {
  @location(0) eye: vec4<f32>,
  @builtin(frag_depth) depth: f32,
};

@fragment
fn fs_depth(in: SplatOut) -> DepthOut {
  let d2 = dot(in.corner, in.corner);
  if (d2 > 1.0) {
    discard;
  }
  let z = in.zr.x + sqrt(1.0 - d2) * in.zr.y;
  var o: DepthOut;
  o.eye = vec4<f32>(-z, 0.0, 0.0, 0.0);
  o.depth = ndc_depth(-z);
  return o;
}

@fragment
fn fs_thickness(in: SplatOut) -> @location(0) vec4<f32> {
  let d2 = dot(in.corner, in.corner);
  if (d2 > 1.0) {
    discard;
  }
  // the chord through the sphere, scaled so the sum over a packed body
  // approximates the body's real thickness along the view ray
  return vec4<f32>(L.shape.y * 2.0 * in.zr.y * sqrt(1.0 - d2), 0.0, 0.0, 0.0);
}

// ---------------------------------------------------------- filter --

@group(0) @binding(4) var depth_in: texture_2d<f32>;
// x, y = tap direction (0, 0 = the 2D clean-up)
@group(0) @binding(5) var<uniform> filter_dir: vec4<f32>;

/// The narrow range: a sample farther than d + mu is clamped to d + mu (the
/// background and deeper layers cannot pull the surface back), a sample
/// within delta in front is clamped to d - mu, and one nearer than d - delta
/// belongs to another surface and is skipped (weight 0).
fn narrow(ds: f32, dc: f32, mu: f32, delta: f32) -> vec2<f32> {
  if (ds <= 0.0) {
    return vec2<f32>(dc + mu, 1.0);
  }
  if (ds < dc - delta) {
    return vec2<f32>(0.0, 0.0);
  }
  return vec2<f32>(clamp(ds, dc - mu, dc + mu), 1.0);
}

@fragment
fn fs_filter(in: FullscreenOut) -> @location(0) vec4<f32> {
  let px = vec2<i32>(in.pos.xy);
  let dc = textureLoad(depth_in, px, 0).x;
  if (dc <= 0.0) {
    return vec4<f32>(0.0);
  }
  let size = vec2<i32>(L.size.xy);
  let scale = V.eye_model.w;
  let mu = L.nrf.z * scale;
  let delta = L.nrf.w * scale;
  // a world-constant kernel: its radius in px shrinks with depth
  let radius = clamp(L.nrf.y * scale * V.proj.y * 0.5 * L.size.y / dc, 1.0, L.nrf.x);
  var sum = 0.0;
  var wsum = 0.0;
  if (filter_dir.x != 0.0 || filter_dir.y != 0.0) {
    let dir = vec2<i32>(filter_dir.xy);
    // at most 24 taps a side: wide kernels stride over pixels
    let stride = max(1.0, ceil(radius / 24.0));
    let taps = i32(ceil(radius / stride));
    let inv2s2 = 1.0 / (2.0 * (radius / 2.5) * (radius / 2.5));
    for (var k = -taps; k <= taps; k += 1) {
      let off = i32(f32(k) * stride);
      let q = clamp(px + dir * off, vec2<i32>(0), size - 1);
      let s = narrow(textureLoad(depth_in, q, 0).x, dc, mu, delta);
      let w = s.y * exp(-f32(off * off) * inv2s2);
      sum += s.x * w;
      wsum += w;
    }
  } else {
    for (var dy = -2; dy <= 2; dy += 1) {
      for (var dx = -2; dx <= 2; dx += 1) {
        let q = clamp(px + vec2<i32>(dx, dy), vec2<i32>(0), size - 1);
        let s = narrow(textureLoad(depth_in, q, 0).x, dc, mu, delta);
        let w = s.y * exp(-f32(dx * dx + dy * dy) * 0.25);
        sum += s.x * w;
        wsum += w;
      }
    }
  }
  return vec4<f32>(sum / max(wsum, 1e-6), 0.0, 0.0, 0.0);
}

// --------------------------------------------------------- normals --

fn load_d(px: vec2<i32>) -> f32 {
  let size = vec2<i32>(L.size.xy);
  if (px.x < 0 || px.y < 0 || px.x >= size.x || px.y >= size.y) {
    return 0.0;
  }
  return textureLoad(depth_in, px, 0).x;
}

@fragment
fn fs_normals(in: FullscreenOut) -> @location(0) vec4<f32> {
  let px = vec2<i32>(in.pos.xy);
  let dc = load_d(px);
  if (dc <= 0.0) {
    return vec4<f32>(0.0);
  }
  let inv = L.size.zw;
  let uv = (vec2<f32>(px) + 0.5) * inv;
  let p = world_at(uv, dc);
  let dr = load_d(px + vec2<i32>(1, 0));
  let dl = load_d(px - vec2<i32>(1, 0));
  let dd = load_d(px + vec2<i32>(0, 1));
  let du = load_d(px - vec2<i32>(0, 1));
  // the side with the smaller depth step (a missing side never wins)
  var ddx = vec3<f32>(0.0);
  let wr = select(1e30, abs(dr - dc), dr > 0.0);
  let wl = select(1e30, abs(dl - dc), dl > 0.0);
  if (wr <= wl && dr > 0.0) {
    ddx = world_at(uv + vec2<f32>(inv.x, 0.0), dr) - p;
  } else if (dl > 0.0) {
    ddx = p - world_at(uv - vec2<f32>(inv.x, 0.0), dl);
  }
  var ddy = vec3<f32>(0.0);
  let wd = select(1e30, abs(dd - dc), dd > 0.0);
  let wu = select(1e30, abs(du - dc), du > 0.0);
  if (wd <= wu && dd > 0.0) {
    ddy = world_at(uv + vec2<f32>(0.0, inv.y), dd) - p;
  } else if (du > 0.0) {
    ddy = p - world_at(uv - vec2<f32>(0.0, inv.y), du);
  }
  let toward = normalize(V.eye.xyz - p);
  var n = cross(ddy, ddx);
  let l = length(n);
  if (l < 1e-12) {
    n = toward; // an isolated texel: a droplet seen head-on
  } else {
    n = n / l;
  }
  if (dot(n, toward) < 0.0) {
    n = -n;
  }
  return vec4<f32>(n, 1.0);
}

// ------------------------------------------------------- composite --

// (the filtered depth arrives as depth_in, binding 4)
@group(0) @binding(7) var normals: texture_2d<f32>;
@group(0) @binding(8) var thickness: texture_2d<f32>;
@group(0) @binding(9) var background: texture_2d<f32>;
@group(0) @binding(10) var env: texture_cube<f32>;
@group(0) @binding(11) var foam: texture_2d<f32>;
@group(0) @binding(12) var lin: sampler;

struct CompositeOut {
  @location(0) color: vec4<f32>,
  @builtin(frag_depth) depth: f32,
};

/// Eye depth at uv: the covered texels of the 2×2 footprint, bilinear weights.
fn depth_at(uv: vec2<f32>) -> f32 {
  let t = uv * L.size.xy - 0.5;
  let base = vec2<i32>(floor(t));
  let f = t - floor(t);
  var sum = 0.0;
  var wsum = 0.0;
  for (var j = 0; j < 2; j += 1) {
    for (var i = 0; i < 2; i += 1) {
      let d = load_d(base + vec2<i32>(i, j));
      let w = select(1.0 - f.x, f.x, i == 1) * select(1.0 - f.y, f.y, j == 1);
      if (d > 0.0) {
        sum += d * w;
        wsum += w;
      }
    }
  }
  return select(0.0, sum / max(wsum, 1e-6), wsum > 1e-6);
}

@fragment
fn fs_composite(in: FullscreenOut) -> CompositeOut {
  let uv = in.uv;
  let nc = textureSampleLevel(normals, lin, uv, 0.0);
  if (nc.w < 0.5) {
    discard;
  }
  let d = depth_at(uv);
  if (d <= 0.0) {
    discard;
  }
  let n = normalize(nc.xyz);
  let p = world_at(uv, d);
  let v = normalize(V.eye.xyz - p);
  let cosv = clamp(dot(n, v), 0.0, 1.0);
  let f0 = L.scatter.w;
  let fres = f0 + (1.0 - f0) * pow(1.0 - cosv, 5.0);

  // refraction: the scene behind, displaced along the screen-projected normal
  // by the thickness the ray crosses (a thin lens), then absorbed
  let t = textureSampleLevel(thickness, lin, uv, 0.0).x;
  let nclip = V.view_proj * vec4<f32>(n, 0.0);
  let shift = nclip.xy * (L.shape.z * min(t, L.shape.w) / d);
  let uv_r = clamp(uv - vec2<f32>(shift.x, -shift.y) * 0.5, vec2<f32>(0.0), vec2<f32>(1.0));
  let behind = textureSampleLevel(background, lin, uv_r, 0.0).rgb;
  let trans = exp(-L.absorb.rgb * t);
  let body = behind * trans + L.scatter.rgb * (1.0 - trans);

  // reflection of the environment probe (or the in-scatter colour without one)
  let r = reflect(-v, n);
  var refl = L.scatter.rgb;
  if ((L.ints.w & 1u) != 0u) {
    refl = textureSampleLevel(env, lin, r, 0.0).rgb;
  }
  refl *= L.absorb.w;

  // a sharp highlight of the key light (normalised Blinn-Phong, Fresnel-weighted)
  let hv = normalize(v + normalize(L.light_dir.xyz));
  let shin = L.light_dir.w;
  let spec = L.light_col.rgb * (fres * (shin + 8.0) / 25.13274 * pow(max(dot(n, hv), 0.0), shin));

  var col = mix(body, refl, fres) + spec;
  let fm = clamp(textureSampleLevel(foam, lin, uv, 0.0).x * L.foam.w, 0.0, 1.0);
  col = mix(col, L.foam.rgb, fm);

  var o: CompositeOut;
  o.color = vec4<f32>(col, 1.0);
  o.depth = ndc_depth(d);
  return o;
}
