// Mandelbulb sphere-tracing display shader (visual only).
//
// Ray-marches the Quilez triplex-power distance estimator for an orbiting
// camera. The DE here mirrors ../../src/mandelbulb_de.wgsl (the gate/capture
// shader); display fidelity — not canonical agreement — is its job, so the
// iteration count, power, Julia offset, coloring and lighting are all LIVE
// DISPLAY UNIFORMS (verification-demo-spec § 3.1/§ 3.4). The capture-export
// path uses the committed mandelbulb_de.wgsl compute kernel, pinned to p=8 on
// the canonical probe grid — nothing in this file is read by the gate (§ 6).
//
// Julia mode note (§ 2.2): the running-derivative update drops the `+1` when
// c is a constant (Quilez, distance-to-fractals; RTG II Ch. 33 Julia listing).
//
// The CMAP splice marker below is replaced at pipeline-build time by the
// shared colormap sampler (common/common-web/src/colormap.ts,
// emitColormapWgsl) — switching palettes is a uniform write, never a shader
// rebuild.

struct RU {
  aspect: f32, angle: f32, elev: f32, dist: f32,
  tx: f32, ty: f32, tz: f32, power: f32,
  julia: f32, jx: f32, jy: f32, jz: f32,
  n_iter: f32, bailout: f32, color_mode: f32, light_az: f32,
  light_el: f32, shadow_soft: f32, quality: f32, overlay: f32,
  exposure: f32, spare0: f32, spare1: f32, spare2: f32,
  stops: array<vec4<f32>, 8>,
  cmeta: vec4<f32>, // colormap stop count in .x ("meta" is WGSL-reserved)
};
@group(0) @binding(0) var<uniform> ru: RU;
// 16×16 gate probe points (§ 3.1 probe-grid overlay): xyz = canonical
// seed-42-jittered coordinates, w = color scalar in [0,1] (canonical DE by
// default; |f32−f64| residual after a PROVE-panel live re-run).
@group(0) @binding(1) var<storage, read> probes: array<vec4<f32>, 256>;

const TINY: f32 = 1.0e-30;

//__CMAP__

fn pow_z(z: vec3<f32>, p: f32) -> vec3<f32> {
  let r2 = dot(z, z);
  if (r2 < TINY) { return vec3<f32>(0.0); }
  let r = sqrt(r2);
  let theta = acos(z.z / r);
  let phi = atan2(z.y, z.x);
  let rp = pow(r, p);
  return vec3<f32>(rp * sin(p * theta) * cos(p * phi),
                   rp * sin(p * theta) * sin(p * phi),
                   rp * cos(p * theta));
}

struct Orbit { d: f32, trap: f32, esc: f32, };

// Display mirror of the gate DE (higher/live iteration count, live power,
// optional Julia c) + orbit-trap and smooth-escape byproducts for coloring.
fn de_orbit(pos: vec3<f32>) -> Orbit {
  var z = pos;
  let c = select(pos, vec3<f32>(ru.jx, ru.jy, ru.jz), ru.julia > 0.5);
  let p = ru.power;
  // Julia: c is constant, so d(+c)/dseed = 0 — the +1 drops (§ 2.2).
  let dz_add = select(1.0, 0.0, ru.julia > 0.5);
  var dz: f32 = 1.0;
  var trap: f32 = 1e9;
  let er2 = ru.bailout * ru.bailout;
  let n = u32(clamp(ru.n_iter, 2.0, 48.0));
  for (var i: u32 = 0u; i < n; i = i + 1u) {
    let r2 = dot(z, z);
    if (r2 > er2) {
      let r = sqrt(r2);
      let esc = f32(i) - log2(max(log(r) / log(max(ru.bailout, 1.01)), 1.0)) / log2(max(p, 1.05));
      return Orbit(0.5 * r * log(r) / dz, trap, max(esc, 0.0));
    }
    let r = select(0.0, sqrt(r2), r2 > 0.0);
    dz = p * pow(r, p - 1.0) * dz + dz_add;
    z = pow_z(z, p) + c;
    trap = min(trap, length(z));
  }
  return Orbit(0.0, trap, 0.0);
}

fn de(pos: vec3<f32>) -> f32 {
  return de_orbit(pos).d;
}

struct VSOut { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32>, };

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> VSOut {
  var p = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0));
  var o: VSOut;
  o.pos = vec4<f32>(p[vi], 0.0, 1.0);
  o.uv = p[vi];
  return o;
}

// Tetrahedron-technique normal (Quilez, normalsSDF) — 4 DE taps.
fn normal(p: vec3<f32>, t: f32) -> vec3<f32> {
  let h = max(0.0006 * t, 2.0e-5);
  let k = vec2<f32>(1.0, -1.0);
  return normalize(
    k.xyy * de(p + k.xyy * h) +
    k.yyx * de(p + k.yyx * h) +
    k.yxy * de(p + k.yxy * h) +
    k.xxx * de(p + k.xxx * h));
}

// Penumbra soft shadow (Quilez, rmshadows): res = min(res, k·h/t).
fn soft_shadow(p: vec3<f32>, l: vec3<f32>) -> f32 {
  if (ru.quality < 0.5) { return 1.0; }
  var res: f32 = 1.0;
  var t: f32 = 0.006;
  for (var i: u32 = 0u; i < 28u; i = i + 1u) {
    let d = de(p + l * t);
    res = min(res, ru.shadow_soft * d / t);
    t = t + clamp(d, 0.003, 0.12);
    if (res < 0.005 || t > 4.0) { break; }
  }
  return clamp(res, 0.0, 1.0);
}

// Sampled-distance ambient occlusion along the normal (the DE-fractal idiom
// of iq's ltfSWn / RTG II Ch. 33 — § 2.2).
fn calc_ao(p: vec3<f32>, n: vec3<f32>) -> f32 {
  var occ: f32 = 0.0;
  var sca: f32 = 1.0;
  let taps = select(3u, 5u, ru.quality > 0.5);
  for (var i: u32 = 1u; i <= taps; i = i + 1u) {
    let h = 0.010 + 0.055 * f32(i);
    occ = occ + (h - de(p + n * h)) * sca;
    sca = sca * 0.72;
  }
  return clamp(1.0 - 2.1 * occ, 0.0, 1.0);
}

@fragment
fn fs_main(in: VSOut) -> @location(0) vec4<f32> {
  let uv = vec2<f32>(in.uv.x * ru.aspect, in.uv.y);

  // orbit camera: azimuth + elevation around a pannable target, zoom = dist
  let ta = vec3<f32>(ru.tx, ru.ty, ru.tz);
  let ce = cos(ru.elev);
  let ro = ta + ru.dist * vec3<f32>(ce * sin(ru.angle), sin(ru.elev), ce * cos(ru.angle));
  let ww = normalize(ta - ro);
  let uu = normalize(cross(ww, vec3<f32>(0.0, 1.0, 0.0)));
  let vv = cross(uu, ww);
  let rd = normalize(uv.x * uu + uv.y * vv + 1.6 * ww);

  // sphere-trace: eps and step floor scale with t, so deep zoom stays sharp
  let eps_k = select(0.0006, 0.00028, ru.quality > 1.5);
  let max_steps = u32(select(select(96.0, 140.0, ru.quality > 0.5), 220.0, ru.quality > 1.5));
  let tmax = ru.dist * 3.0 + 6.0;
  var t: f32 = 0.0;
  var hit = false;
  var glow: f32 = 1e9;
  var ob: Orbit;
  for (var i: u32 = 0u; i < max_steps; i = i + 1u) {
    let p = ro + rd * t;
    ob = de_orbit(p);
    if (t > 0.02) { glow = min(glow, ob.d / t); }
    if (ob.d < eps_k * t) { hit = true; break; }
    t = t + max(ob.d, 0.3 * eps_k * max(t, 0.002));
    if (t > tmax) { break; }
  }

  // background: quiet vertical gradient + a whisper of horizon warmth
  let g = 0.5 + 0.5 * in.uv.y;
  var col = mix(vec3<f32>(0.010, 0.014, 0.026), vec3<f32>(0.035, 0.050, 0.085), g);
  col = col + vec3<f32>(0.10, 0.065, 0.035) * 0.35 * pow(clamp(1.0 - abs(rd.y), 0.0, 1.0), 6.0);
  if (!hit) {
    // silhouette halo from closest approach — proximity to the surface, not a
    // gratuitous post effect: it draws the geometry the march almost found
    col = col + cmap_sample(0.78) * 0.11 * exp(-420.0 * max(glow, 0.0));
  }

  if (hit) {
    let p = ro + rd * t;
    let n = normal(p, t);
    let le = ru.light_el;
    let ldir = normalize(vec3<f32>(cos(le) * sin(ru.light_az), sin(le), cos(le) * cos(ru.light_az)));

    // base color by mode: 0 = normal-shaded, 1 = orbit trap, 2 = smooth escape
    var base = 0.5 + 0.5 * n;
    if (ru.color_mode > 0.5 && ru.color_mode < 1.5) {
      // spread the orbit-trap range: min|z| over the orbit clusters in
      // ~[0.2, 1.1] for near-surface points — remap before sampling
      let tt = pow(clamp(ob.trap * 1.25 - 0.22, 0.0, 1.0), 0.9);
      base = cmap_sample(tt);
    } else if (ru.color_mode > 1.5) {
      let te = clamp(ob.esc / max(ru.n_iter, 2.0), 0.0, 1.0);
      base = cmap_sample(pow(te, 0.75));
    }

    let sha = soft_shadow(p + n * (2.0 * eps_k * t), ldir);
    let ao = calc_ao(p, n);
    let dif = clamp(dot(n, ldir), 0.0, 1.0) * sha;
    let hal = normalize(ldir - rd);
    let spe = pow(clamp(dot(n, hal), 0.0, 1.0), 36.0) * sha * (0.35 + 0.65 * dif);
    let sky = 0.5 + 0.5 * n.y;
    let bnc = clamp(dot(n, -ldir) * 0.4 + 0.2, 0.0, 1.0);

    col = base * (0.16 * ao * (0.6 + 0.4 * sky));
    col = col + base * dif * vec3<f32>(1.05, 0.98, 0.90);
    col = col + base * bnc * ao * vec3<f32>(0.10, 0.12, 0.16);
    col = col + spe * vec3<f32>(0.9, 0.95, 1.0) * 0.4;
    // distance fog into the background hue — depth cue only
    col = mix(col, vec3<f32>(0.020, 0.028, 0.050), 1.0 - exp(-0.055 * t * t));
  }

  // § 3.1 probe-grid overlay: the 256 gate probe points as occlusion-aware
  // emissive markers inside the scene (display-side geometry only)
  if (ru.overlay > 0.5) {
    let rr = 0.014;
    for (var k: u32 = 0u; k < 256u; k = k + 1u) {
      let pr = probes[k];
      let rel = pr.xyz - ro;
      let tp = dot(rel, rd);
      if (tp <= 0.0) { continue; }
      if (hit && tp > t + rr) { continue; } // occluded by the surface
      let d2 = dot(rel, rel) - tp * tp;
      if (d2 < rr * rr) {
        let a = 1.0 - smoothstep(0.0, rr * rr, d2);
        let core = 1.0 - smoothstep(0.0, rr * rr * 0.18, d2);
        let mc = cmap_sample(clamp(pr.w, 0.0, 1.0)) * 1.7 + vec3<f32>(0.35) * core;
        col = mix(col, mc, clamp(a * 0.95, 0.0, 1.0));
      }
    }
  }

  // exposure tonemap + gamma
  var c = vec3<f32>(1.0) - exp(-col * ru.exposure);
  c = pow(max(c, vec3<f32>(0.0)), vec3<f32>(1.0 / 2.2));
  return vec4<f32>(c, 1.0);
}
