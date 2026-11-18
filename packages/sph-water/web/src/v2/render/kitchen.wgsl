// Water in Hand — the kitchen (08-sph-water.md, "The look"): a warm wooden
// table in window light, a soft out-of-focus room behind it. Drawn first
// into the HDR target (and, with a depth target, clearing it), like F3's
// Environment, and into the EnvironmentProbe the water reflects.
//
//   room    procedural and out of focus: a warm wall gradient, a bright
//           window to one side (the key light), soft bokeh discs
//   table   planked wood (value-noise grain), the window's key light, a warm
//           bounce, a varnish sheen; the glass's soft shadow with an
//           approximate caustic (light focused by the water column — RENDERING
//           ONLY, not computed from the simulated surface) and a contact
//           shadow at its base
//
// Pure rendering: builtin sin/exp/pow are fine here.
#import bp/fullscreen
#import bp/view3d

struct Kitchen {
  // xyz world direction towards the window (the key light), w = key strength
  light: vec4<f32>,
  // x = glass outer radius, y = rim height, z = water top height, w = inner floor height
  glass: vec4<f32>,
  // x = table half-width (x), y = half-depth (z), z = shadow strength, w = caustic strength
  table: vec4<f32>,
  // rgb window radiance, w = room brightness
  window: vec4<f32>,
  // the window as seen: centre elevation (rad), half-width (rad of azimuth), half-height (rad), unused
  frame: vec4<f32>,
};

@group(0) @binding(0) var<uniform> V: View3D;
@group(0) @binding(1) var<uniform> K: Kitchen;

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

fn hash21(p: vec2<f32>) -> f32 {
  let q = fract(p * vec2<f32>(123.34, 456.21));
  let r = q + dot(q, q + 45.32);
  return fract(r.x * r.y);
}

fn vnoise(p: vec2<f32>) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  let a = hash21(i);
  let b = hash21(i + vec2<f32>(1.0, 0.0));
  let c = hash21(i + vec2<f32>(0.0, 1.0));
  let d = hash21(i + vec2<f32>(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

/// The room, out of focus: a function of direction only.
fn room(dir: vec3<f32>) -> vec3<f32> {
  let y = dir.y;
  let b = K.window.w;
  // warm plaster wall, a darker ceiling, a dim floor below the table
  var c = mix(vec3<f32>(0.11, 0.075, 0.05), vec3<f32>(0.05, 0.036, 0.026), smoothstep(0.05, 0.75, y));
  c = mix(c, vec3<f32>(0.03, 0.022, 0.016), smoothstep(0.0, -0.5, y));
  c *= b;
  // the window: a soft bright rectangle around the key light's azimuth
  let L = normalize(K.light.xyz);
  let az = atan2(dir.z, dir.x);
  let laz = atan2(L.z, L.x);
  var daz = az - laz;
  daz = daz - 6.2831853 * round(daz / 6.2831853);
  let el = asin(clamp(y, -1.0, 1.0));
  // the window sits lower in the room than the sun-like key light, so it shows behind the glass
  let lel = K.frame.x;
  let wx = 1.0 - smoothstep(K.frame.y, K.frame.y + 0.12, abs(daz));
  let wy = 1.0 - smoothstep(K.frame.z, K.frame.z + 0.14, abs(el - lel));
  // mullions, soft (out of focus)
  let mull = 1.0 - 0.55 * (1.0 - smoothstep(0.0, 0.035, abs(daz))) - 0.45 * (1.0 - smoothstep(0.0, 0.035, abs(el - lel - 0.04)));
  let win = wx * wy * mull;
  // daylight brightest at the top of the window, some green from outside low down
  let sky = mix(vec3<f32>(0.55, 0.62, 0.42), vec3<f32>(1.0, 0.97, 0.9), smoothstep(-0.2, 0.25, el - lel));
  c = mix(c, K.window.rgb * sky, win);
  // light spill around the window onto the wall
  c += K.window.rgb * 0.035 * exp(-(daz * daz + (el - lel) * (el - lel)) * 3.0) * b;
  // bokeh: soft discs of out-of-focus lights and highlights, fixed in the room
  for (var k = 0; k < 14; k += 1) {
    let fk = f32(k);
    let baz = laz + (hash21(vec2<f32>(fk, 1.7)) - 0.5) * 2.6;
    let bel = -0.12 + hash21(vec2<f32>(fk, 9.1)) * 0.42;
    let rad = 0.025 + 0.05 * hash21(vec2<f32>(fk, 3.3));
    var dz = az - baz;
    dz = dz - 6.2831853 * round(dz / 6.2831853);
    let d = length(vec2<f32>(dz * cos(el), el - bel));
    let disc = 1.0 - smoothstep(rad * 0.82, rad, d);
    let warm = mix(vec3<f32>(1.0, 0.72, 0.42), vec3<f32>(0.62, 0.8, 0.5), step(0.7, hash21(vec2<f32>(fk, 5.5))));
    c += warm * disc * (0.06 + 0.16 * hash21(vec2<f32>(fk, 7.7))) * b;
  }
  return c;
}

/// Distance from p to the segment [a, b].
fn seg_dist(p: vec2<f32>, a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  let ab = b - a;
  let t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-9), 0.0, 1.0);
  return vec2<f32>(length(p - (a + ab * t)), t);
}

fn wood(p: vec2<f32>) -> vec3<f32> {
  // boards run along x, 0.32 m wide
  let board = floor(p.y / 0.32);
  let local = p.y - board * 0.32;
  let hb = hash21(vec2<f32>(board, 2.0));
  let grain_coord = vec2<f32>(p.x * 1.4 + hb * 17.0, local * 26.0);
  let warp = vnoise(vec2<f32>(p.x * 0.9, board * 3.1 + local * 4.0)) * 6.0;
  let grain = 0.5 + 0.5 * sin(grain_coord.y * 3.0 + warp * 2.2 + vnoise(grain_coord * vec2<f32>(0.6, 0.25)) * 3.0);
  let fine = vnoise(vec2<f32>(p.x * 40.0, local * 300.0));
  var albedo = mix(vec3<f32>(0.20, 0.105, 0.05), vec3<f32>(0.34, 0.19, 0.095), grain * 0.7 + fine * 0.3);
  albedo *= 0.85 + 0.3 * hb;
  // the seams between boards
  let seam = smoothstep(0.0, 0.004, local) * smoothstep(0.0, 0.004, 0.32 - local);
  return albedo * mix(0.35, 1.0, seam);
}

fn table(hit: vec3<f32>, dir: vec3<f32>) -> vec3<f32> {
  let L = normalize(K.light.xyz);
  let albedo = wood(hit.xz);
  let p = hit.xz;
  let r = length(p);
  // the glass's shadow: the cylinder swept down the light, from base to rim
  let s = -L.xz / max(L.y, 0.05);
  let rim = seg_dist(p, vec2<f32>(0.0), s * K.glass.y);
  let shade_glass = 1.0 - smoothstep(K.glass.x * 0.9, K.glass.x * 1.25, rim.x);
  // clear glass and water pass most light: a soft, partial shadow with dark edges
  let ed = (rim.x - K.glass.x) / (0.12 * K.glass.x);
  let edge = exp(-ed * ed);
  var light = 1.0 - K.table.z * (0.3 * shade_glass + 0.4 * edge);
  // approximate caustic: the water column focuses light onto its shadow's axis
  let w = seg_dist(p, s * K.glass.w, s * K.glass.z);
  let wc = w.x / (0.22 * K.glass.x);
  let core = exp(-wc * wc) * smoothstep(0.0, 0.25, w.y);
  light += K.table.w * core;
  // contact shadow at the base
  let ao = 1.0 - 0.55 * (1.0 - smoothstep(K.glass.x, K.glass.x + 0.12, r));
  let ndl = max(L.y, 0.0);
  var c = albedo * (K.light.w * ndl * light * K.window.rgb * 0.08) * ao;
  // warm bounce from the room
  c += albedo * vec3<f32>(0.12, 0.085, 0.06) * K.window.w * ao;
  // varnish: a blurry reflection of the window, Fresnel-weighted
  let refl = reflect(dir, vec3<f32>(0.0, 1.0, 0.0));
  let f = 0.04 + 0.96 * pow(1.0 - max(-dir.y, 0.0), 5.0);
  c += room(refl) * f * 0.6;
  // the table's far edge fades into the room
  let fade = smoothstep(K.table.x * 0.75, K.table.x, abs(hit.x)) + smoothstep(K.table.y * 0.75, K.table.y, abs(hit.z));
  return mix(c, room(dir), clamp(fade, 0.0, 1.0));
}

struct FOut {
  @location(0) color: vec4<f32>,
  @builtin(frag_depth) depth: f32,
};

fn shade(uv: vec2<f32>) -> FOut {
  let dir = ray_dir(uv);
  let eye = V.eye.xyz;
  var o: FOut;
  o.color = vec4<f32>(room(dir), 1.0);
  o.depth = 1.0;
  if (dir.y < -1e-5 && eye.y > 0.0) {
    let t = -eye.y / dir.y;
    let hit = eye + dir * t;
    if (abs(hit.x) < K.table.x && abs(hit.z) < K.table.y) {
      o.color = vec4<f32>(table(hit, dir), 1.0);
      let clip = V.view_proj * vec4<f32>(hit, 1.0);
      o.depth = clamp(clip.z / clip.w, 0.0, 1.0);
    }
  }
  return o;
}

@fragment
fn fs(in: FullscreenOut) -> FOut {
  return shade(in.uv);
}

// colour only: the EnvironmentProbe's faces
@fragment
fn fs_color(in: FullscreenOut) -> @location(0) vec4<f32> {
  return shade(in.uv).color;
}
