// Murmuration — the dusk (07-boids-3d.md, "The look"): an analytic sky with
// the sun just below the horizon, haze, high cirrus lit from below, a far
// tree line and a nearer copse in silhouette, dark land and a lake strip
// that mirrors the afterglow. Everything is procedural (no textures, no
// third-party art). Linear radiance into the HDR scene target; the HDR
// pipeline's exposure and AgX tone map make pixels of it. Render only:
// nothing here feeds the simulation, so builtin trig and exp are fine.
#import bp/fullscreen
#import bp/view3d

struct Dusk {
  // xyz unit direction towards the sun (below the horizon), w = glow strength
  sun: vec4<f32>,
  zenith: vec4<f32>,
  upper: vec4<f32>,
  // horizon colour towards the sun, and away from it (the Belt of Venus)
  horizon_sun: vec4<f32>,
  horizon_anti: vec4<f32>,
  // rgb of the afterglow around the hidden sun, w = cirrus amount
  glow: vec4<f32>,
  // x = time (s), y = haze distance, z = lake near edge, w = lake far edge (world z, towards −z)
  misc: vec4<f32>,
  // land colour, w = tree-line radius
  land: vec4<f32>,
};

@group(0) @binding(0) var<uniform> V: View3D;
@group(0) @binding(1) var<uniform> D: Dusk;

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

fn hash11(n: f32) -> f32 {
  return fract(sin(n * 127.1) * 43758.5453);
}

fn hash21(p: vec2<f32>) -> f32 {
  return fract(sin(dot(p, vec2<f32>(127.1, 311.7))) * 43758.5453);
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

fn fbm(p0: vec2<f32>) -> f32 {
  var p = p0;
  var s = 0.0;
  var a = 0.5;
  for (var i = 0; i < 5; i = i + 1) {
    s += a * vnoise(p);
    p = p * 2.03 + vec2<f32>(17.3, 9.1);
    a *= 0.5;
  }
  return s;
}

/// How sunward a direction is, by azimuth only: 1 towards the sun, 0 away.
fn sunward(d: vec3<f32>) -> f32 {
  let dh = normalize(vec2<f32>(d.x, d.z) + vec2<f32>(1e-6, 0.0));
  let sh = normalize(vec2<f32>(D.sun.x, D.sun.z));
  return 0.5 + 0.5 * dot(dh, sh);
}

/// The sky's radiance along d (no clouds, no ground).
fn sky(d: vec3<f32>) -> vec3<f32> {
  let h = max(d.y, 0.0);
  let side = sunward(d);
  let s2 = side * side;
  // zenith -> upper sky -> a horizon band that is deeper and warmer towards the sun
  var c = mix(D.zenith.rgb, D.upper.rgb, exp(-h / 0.42));
  let hor = mix(D.horizon_anti.rgb, D.horizon_sun.rgb, s2 * side);
  c = mix(c, hor, exp(-h / mix(0.07, 0.2, s2)));
  // the afterglow: forward scattering around the sun below the horizon
  let mu = max(dot(d, D.sun.xyz), 0.0);
  let lift = exp(-h / 0.32);
  c += D.glow.rgb * D.sun.w * (0.35 * pow(mu, 5.0) + 0.9 * pow(mu, 28.0)) * lift;
  // Earth's shadow: a cool band hugging the horizon opposite the sun
  let shadow = (1.0 - side) * exp(-h / 0.035);
  c = mix(c, c * vec3<f32>(0.55, 0.6, 0.85), shadow * 0.55);
  return c;
}

/// High cirrus on a plane far above, lit from below by the afterglow.
fn cirrus(d: vec3<f32>, base: vec3<f32>) -> vec3<f32> {
  if (d.y <= 0.02 || D.glow.w <= 0.0) { return base; }
  let t = 1800.0 / d.y;
  let p = (V.eye.xz + d.xz * t) / 2600.0;
  // streaks: noise stretched along the wind
  let wind = vec2<f32>(D.misc.x * 0.0018, 0.0);
  let q = vec2<f32>(p.x * 0.45 + p.y * 0.2, p.y * 2.4 - p.x * 0.3) + wind;
  let n = fbm(q * 2.0) * 0.75 + fbm(q * 7.0 + vec2<f32>(3.1, 1.7)) * 0.25;
  let dens = smoothstep(0.48, 0.78, n) * D.glow.w;
  // thin out near the horizon (the plane recedes into haze) and towards the zenith
  let fade = smoothstep(0.02, 0.12, d.y) * (1.0 - smoothstep(0.55, 0.95, d.y) * 0.6);
  let side = sunward(d);
  let lit = mix(D.horizon_anti.rgb * 1.4 + vec3<f32>(0.04, 0.02, 0.05), D.glow.rgb * 0.75 + D.horizon_sun.rgb * 0.35, side * side);
  let cloud = lit * (0.55 + 0.45 * n);
  return mix(base, cloud, clamp(dens * fade, 0.0, 0.85));
}

/// Crown profile of the tree line at arc length s (world units) along a ring.
fn crowns(s: f32, seed: f32, spacing: f32, hmin: f32, hmax: f32, presence: f32) -> f32 {
  let cell = floor(s / spacing);
  var top = 0.0;
  for (var k = -2; k <= 2; k = k + 1) {
    let c = cell + f32(k);
    let r = hash11(c * 1.37 + seed);
    if (r > presence) { continue; }
    let cx = (c + 0.2 + 0.6 * hash11(c * 3.11 + seed)) * spacing;
    let w = spacing * (0.55 + 0.9 * hash11(c * 7.7 + seed));
    let ht = mix(hmin, hmax, hash11(c * 5.3 + seed));
    let x = (s - cx) / w;
    // rounded crowns, some tall and narrow (poplars)
    let poplar = step(0.82, hash11(c * 9.9 + seed));
    let wx = mix(x, x * 2.2, poplar);
    let prof = sqrt(max(0.0, 1.0 - wx * wx));
    top = max(top, ht * mix(1.0, 1.35, poplar) * pow(prof, mix(0.6, 1.4, poplar)));
  }
  // leaf-edge texture
  return top + (vnoise(vec2<f32>(s * 0.9, seed)) - 0.5) * 0.9 * step(0.01, top);
}

/// Does the ray meet a ring of trees of radius R about the roost? Returns (hit, distance).
fn tree_ring(e: vec3<f32>, d: vec3<f32>, R: f32, seed: f32, spacing: f32, hmin: f32, hmax: f32, presence: f32) -> vec2<f32> {
  let dh = d.xz;
  let l = length(dh);
  if (l < 1e-5) { return vec2<f32>(0.0, 0.0); }
  let u = dh / l;
  // |e.xz + t u| = R, the far root (the ring ahead)
  let b = dot(e.xz, u);
  let c = dot(e.xz, e.xz) - R * R;
  let disc = b * b - c;
  if (disc < 0.0) { return vec2<f32>(0.0, 0.0); }
  let th = -b + sqrt(disc);
  if (th <= 0.0) { return vec2<f32>(0.0, 0.0); }
  let p = e.xz + u * th;
  let s = atan2(p.y, p.x) * R;
  let top = crowns(s, seed, spacing, hmin, hmax, presence);
  let y = e.y + d.y / l * th;
  return vec2<f32>(select(0.0, 1.0, y < top && y > -1.0), th);
}

fn shade(uv: vec2<f32>) -> vec3<f32> {
  let d = ray_dir(uv);
  let e = V.eye.xyz;
  var c = cirrus(d, sky(d));
  let haze = D.misc.y;
  // the ground
  if (d.y < 0.0) {
    let t = -e.y / min(d.y, -1e-5);
    let p = e + d * t;
    var g = D.land.rgb;
    // a lake strip ahead that mirrors the afterglow just above the horizon
    let lake = smoothstep(D.misc.z, D.misc.z - 6.0, p.z) * smoothstep(D.misc.w, D.misc.w + 30.0, p.z)
      * smoothstep(420.0, 300.0, abs(p.x + 40.0 * sin(p.z * 0.01)));
    if (lake > 0.0) {
      let r = vec3<f32>(d.x, -d.y, d.z);
      let ripple = (vnoise(p.xz * vec2<f32>(0.6, 3.0) + vec2<f32>(D.misc.x * 0.3, 0.0)) - 0.5) * 0.004;
      let refl = sky(normalize(r + vec3<f32>(0.0, ripple, 0.0)));
      let fres = 0.12 + 0.5 * pow(1.0 - abs(d.y), 12.0);
      g = mix(g, refl * fres, lake);
    }
    let fog = 1.0 - exp(-t / haze);
    c = mix(g, sky(vec3<f32>(d.x, 0.0, d.z)), fog);
  }
  // the tree lines: a far one all round, a nearer copse here and there
  let far = tree_ring(e, d, D.land.w, 11.0, 7.0, 5.0, 13.0, 0.88);
  if (far.x > 0.5) {
    let fog = 1.0 - exp(-far.y / haze);
    c = mix(D.land.rgb * 1.4, sky(vec3<f32>(d.x, 0.004, d.z)), fog * 0.45);
  }
  let near = tree_ring(e, d, D.land.w * 0.42, 29.0, 9.0, 7.0, 18.0, 0.32);
  if (near.x > 0.5 && near.y < far.y + 1e5) {
    let fog = 1.0 - exp(-near.y / haze);
    c = mix(D.land.rgb, sky(vec3<f32>(d.x, 0.004, d.z)), fog * 0.3);
  }
  return c;
}

@fragment
fn fs(in: FullscreenOut) -> @location(0) vec4<f32> {
  return vec4<f32>(shade(in.uv), 1.0);
}
