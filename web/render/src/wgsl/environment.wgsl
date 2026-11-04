// Environment (F3): the backdrop of a 3D scene, drawn first into the HDR
// target. Studio mode is a soft three-band gradient (zenith / horizon /
// nadir) with a faint glow behind the subject; sky mode is an analytic
// daylight sky (a Rayleigh-like zenith-to-horizon gradient, a Mie halo and a
// sun disc). An optional ground plane takes a fading grid and contact
// shadows from up to 32 sphere casters (analytic sphere occlusion), and
// writes its depth so opaque geometry meets it correctly.
#import bp/fullscreen
#import bp/view3d

struct EnvParams {
  zenith: vec4<f32>,
  horizon: vec4<f32>,
  nadir: vec4<f32>,
  // xyz world direction towards the sun, w = disc size (cos of angular radius)
  sun_dir: vec4<f32>,
  // rgb radiance of the sun disc, w = halo strength
  sun_color: vec4<f32>,
  // x = ground height (world), y = enabled (0/1), z = grid spacing (0 = no grid), w = fade distance
  ground: vec4<f32>,
  // rgb albedo-ish colour, w = contact-shadow strength
  ground_color: vec4<f32>,
  // x = mode (0 studio, 1 sky), y = caster count, z = glow strength, w = glow radius (uv)
  mode: vec4<f32>,
};

@group(0) @binding(0) var<uniform> V: View3D;
@group(0) @binding(1) var<uniform> E: EnvParams;
// xyz world centre, w = radius
@group(0) @binding(2) var<storage, read> casters: array<vec4<f32>>;

struct FOut {
  @location(0) color: vec4<f32>,
  @builtin(frag_depth) depth: f32,
};

@vertex
fn vs(@builtin(vertex_index) vi: u32) -> FullscreenOut {
  return fullscreen_vertex(vi);
}

fn ray_dir(uv: vec2<f32>) -> vec3<f32> {
  let ndc = vec2<f32>(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0);
  let a = V.inv_view_proj * vec4<f32>(ndc, 0.0, 1.0);
  let b = V.inv_view_proj * vec4<f32>(ndc, 1.0, 1.0);
  return normalize(b.xyz / b.w - a.xyz / a.w);
}

fn backdrop(dir: vec3<f32>, uv: vec2<f32>) -> vec3<f32> {
  let y = dir.y;
  if (E.mode.x < 0.5) {
    // studio: horizon band, easing into zenith above and nadir below
    let up = smoothstep(0.0, 0.85, y);
    let down = smoothstep(0.0, -0.85, y);
    var c = mix(E.horizon.rgb, E.zenith.rgb, up);
    c = mix(c, E.nadir.rgb, down);
    // a faint glow behind the subject, centred in the view
    let g = E.mode.z * exp(-dot(uv - 0.5, uv - 0.5) / max(E.mode.w * E.mode.w, 1e-4));
    return c + E.horizon.rgb * g;
  }
  // sky: zenith -> horizon gradient, Mie halo and the sun disc
  let h = clamp(y, -0.2, 1.0);
  let t = pow(1.0 - max(h, 0.0), 4.0);
  var c = mix(E.zenith.rgb, E.horizon.rgb, t);
  if (y < 0.0) {
    c = mix(E.horizon.rgb, E.nadir.rgb, smoothstep(0.0, -0.4, y));
  }
  let mu = dot(dir, normalize(E.sun_dir.xyz));
  let halo = E.sun_color.w * pow(max(mu, 0.0), 32.0) * 0.08 + E.sun_color.w * pow(max(mu, 0.0), 4.0) * 0.02;
  c += E.sun_color.rgb * halo;
  if (mu > E.sun_dir.w) {
    c += E.sun_color.rgb;
  }
  return c;
}

/// Occlusion of a horizontal ground point by a sphere (analytic, cosine-weighted).
fn sphere_occlusion(p: vec3<f32>, s: vec4<f32>) -> f32 {
  let v = s.xyz - p;
  let d2 = dot(v, v);
  let d = sqrt(d2);
  let cos_t = v.y / max(d, 1e-5);
  return clamp(cos_t * s.w * s.w / max(d2, 1e-6), 0.0, 1.0);
}

fn grid_line(p: vec2<f32>, spacing: f32) -> f32 {
  let g = p / spacing;
  let w = fwidth(g);
  let f = abs(fract(g - 0.5) - 0.5) / max(w, vec2<f32>(1e-5));
  return 1.0 - min(min(f.x, f.y), 1.0);
}

fn shade(in: FullscreenOut) -> FOut {
  let dir = ray_dir(in.uv);
  let eye = V.eye.xyz;
  var o: FOut;
  o.color = vec4<f32>(backdrop(dir, in.uv), 1.0);
  o.depth = 1.0;
  // the grid's derivatives must be taken in uniform control flow
  let gh = E.ground.x;
  let t = (gh - eye.y) / select(-1e-6, dir.y, dir.y < -1e-6);
  let hit = eye + dir * max(t, 0.0);
  let line = select(0.0, grid_line(hit.xz, max(E.ground.z, 1e-3)), E.ground.z > 0.0);
  if (E.ground.y > 0.5 && dir.y < -1e-6 && eye.y > gh && t > 0.0) {
    var occ = 0.0;
    let n = u32(E.mode.y);
    for (var i = 0u; i < n; i = i + 1u) {
      occ += sphere_occlusion(hit, casters[i]);
    }
    var g = E.ground_color.rgb * (1.0 - E.ground_color.w * clamp(occ, 0.0, 1.0));
    g = mix(g, g * 1.6 + vec3<f32>(0.02), line * 0.5);
    // fade into the backdrop with distance
    let fade = clamp(t / max(E.ground.w, 1e-3), 0.0, 1.0);
    o.color = vec4<f32>(mix(g, o.color.rgb, fade * fade), 1.0);
    let clip = V.view_proj * vec4<f32>(hit, 1.0);
    o.depth = clamp(clip.z / clip.w, 0.0, 1.0);
  }
  return o;
}

// With a depth target: the backdrop at far depth, the ground at its own.
@fragment
fn fs(in: FullscreenOut) -> FOut {
  return shade(in);
}

// Colour only (a pass without depth may not write frag_depth).
@fragment
fn fs_color(in: FullscreenOut) -> @location(0) vec4<f32> {
  return shade(in).color;
}
