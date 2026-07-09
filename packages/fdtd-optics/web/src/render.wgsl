// fdtd-optics — render stack (spec-ref § 5.1 / § 5.7).
//
// One HDR uber-pass composites every field-space layer (uniform branches,
// each field read once); photon tracers draw additively into the same HDR
// target; a small mip bloom + ACES tonemap presents. The physics stencil is
// the only expensive stage — this whole stack is the "dozen nearly-free
// layers" architecture.
//
// LAYER bits: 1 signed field | 2 material underlay | 4 isophase contours |
// 8 schlieren | 16 envelope | 32 domain coloring (replaces field) |
// 64 time-avg energy (replaces field) | 128 PML shade | 256 source markers |
// 512 power view (field -> |phasor|^2, the wifi-solver toggle)

struct RU {
  nx: u32,
  ny: u32,
  layers: u32,
  srcCount: u32,
  exposure: f32,
  fieldGain: f32,
  dftInvW: f32,     // 1 / accumulated DFT weight (JS-tracked)
  time: f32,
  pmlN: f32,
  isoK: f32,        // isophase contour count
  tracerGain: f32,
  ampGain: f32,
  sources: array<vec4f, 16>, // i, j, kind, on
}

@group(0) @binding(0) var<uniform> ru: RU;
@group(0) @binding(1) var<storage, read> ez: array<f32>;
@group(0) @binding(2) var<storage, read> mat: array<vec4f>;
@group(0) @binding(3) var<storage, read> mat2: array<vec2f>;
@group(0) @binding(4) var<storage, read> auxE: array<vec4f>;
@group(0) @binding(5) var<storage, read> phasor: array<vec2f>;
@group(0) @binding(6) var<storage, read> lut: array<vec4f>; // 3 x 256 (cool-warm | inferno | cyclic)

struct VOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn fs_vs(@builtin(vertex_index) vi: u32) -> VOut {
  var out: VOut;
  let x = f32(i32(vi & 1u) * 4 - 1);
  let y = f32(i32(vi >> 1u) * 4 - 1);
  out.pos = vec4f(x, y, 0.0, 1.0);
  out.uv = vec2f((x + 1.0) * 0.5, 1.0 - (y + 1.0) * 0.5);
  return out;
}

fn lutSample(map: u32, t: f32) -> vec3f {
  let x = clamp(t, 0.0, 1.0) * 255.0;
  let i0 = u32(floor(x));
  let i1 = min(i0 + 1u, 255u);
  let fr = x - f32(i0);
  return mix(lut[map * 256u + i0].rgb, lut[map * 256u + i1].rgb, fr);
}

fn cellIdx(i: i32, j: i32) -> u32 {
  let ii = clamp(i, 0, i32(ru.nx) - 1);
  let jj = clamp(j, 0, i32(ru.ny) - 1);
  return u32(ii) * ru.ny + u32(jj);
}

fn ezBilinear(p: vec2f) -> f32 {
  let i0 = i32(floor(p.x));
  let j0 = i32(floor(p.y));
  let fx = p.x - f32(i0);
  let fy = p.y - f32(j0);
  let a = ez[cellIdx(i0, j0)];
  let b = ez[cellIdx(i0 + 1, j0)];
  let c = ez[cellIdx(i0, j0 + 1)];
  let d = ez[cellIdx(i0 + 1, j0 + 1)];
  return mix(mix(a, b, fx), mix(c, d, fx), fy);
}

fn phasorAt(p: vec2f) -> vec2f {
  let i0 = i32(floor(p.x));
  let j0 = i32(floor(p.y));
  let fx = p.x - f32(i0);
  let fy = p.y - f32(j0);
  let a = phasor[cellIdx(i0, j0)];
  let b = phasor[cellIdx(i0 + 1, j0)];
  let c = phasor[cellIdx(i0, j0 + 1)];
  let d = phasor[cellIdx(i0 + 1, j0 + 1)];
  return mix(mix(a, b, fx), mix(c, d, fx), fy);
}

@fragment
fn uber_fs(in: VOut) -> @location(0) vec4f {
  // uv -> cell coords: x maps to i (horizontal), y to j (vertical)
  let p = vec2f(in.uv.x * f32(ru.nx) - 0.5, in.uv.y * f32(ru.ny) - 0.5);
  let idx = cellIdx(i32(round(p.x)), i32(round(p.y)));
  let L = ru.layers;
  var col = vec3f(0.0);

  // --- material underlay first (field layers blend over it)
  let m = mat[idx];
  let m2 = mat2[idx];
  if ((L & 2u) != 0u) {
    let eps = m.x;
    if (m2.y > 0.5) { // PEC
      col = vec3f(0.22, 0.23, 0.25);
    } else if (m.z > 0.0) { // Drude metal
      col = vec3f(0.20, 0.16, 0.05);
    } else if (m2.x > 0.0) { // Kerr
      col = vec3f(0.12, 0.05, 0.16);
    } else if (eps > 1.001) {
      let t = clamp((eps - 1.0) / 4.0, 0.0, 1.0);
      col = mix(vec3f(0.0), vec3f(0.10, 0.14, 0.18), 0.35 + 0.65 * t);
    }
    if (m.y > 0.0 && m2.y < 0.5) { // conductive loss tint
      col += vec3f(0.02, 0.10, 0.06) * clamp(m.y * 8.0, 0.0, 1.0);
    }
  }

  // --- primary field layer
  let ph = phasorAt(p) * ru.dftInvW;
  let amp = length(ph) * ru.ampGain;
  if ((L & 32u) != 0u) {
    // domain coloring: hue = phase, brightness = amplitude
    let phase = atan2(ph.y, ph.x);
    let hue = (phase + 3.14159265) / 6.2831853;
    let bright = clamp(sqrt(amp) * ru.exposure, 0.0, 1.6);
    col += lutSample(2u, hue) * bright;
  } else if ((L & 64u) != 0u || (L & 512u) != 0u) {
    // time-averaged energy / power view: log window centered so a unit CW
    // plane wave reads mid-scale and hot spots climb to white
    let e = amp * amp * ru.exposure;
    let t = clamp((log2(e + 1e-7) + 7.0) / 12.0, 0.0, 1.0);
    col += lutSample(1u, t) * 1.15;
  } else if ((L & 1u) != 0u) {
    // signed instantaneous field, Moreland cool-warm, white at zero
    let v = ezBilinear(p) * ru.fieldGain * ru.exposure;
    let c = lutSample(0u, clamp(v * 0.5 + 0.5, 0.0, 1.0));
    // keep zero-field regions dark: blend by |v| so the underlay reads
    col = mix(col, c, clamp(abs(v) * 1.4, 0.0, 1.0));
  }

  // --- schlieren: gradient magnitude of Ez + material edges
  if ((L & 8u) != 0u) {
    let gx = ezBilinear(p + vec2f(1.0, 0.0)) - ezBilinear(p - vec2f(1.0, 0.0));
    let gy = ezBilinear(p + vec2f(0.0, 1.0)) - ezBilinear(p - vec2f(0.0, 1.0));
    let g = length(vec2f(gx, gy)) * ru.fieldGain;
    col += vec3f(0.9, 0.95, 1.0) * clamp(g * 0.35, 0.0, 0.45);
    let ge = abs(mat[cellIdx(i32(round(p.x)) + 1, i32(round(p.y)))].x - mat[cellIdx(i32(round(p.x)) - 1, i32(round(p.y)))].x)
           + abs(mat[cellIdx(i32(round(p.x)), i32(round(p.y)) + 1)].x - mat[cellIdx(i32(round(p.x)), i32(round(p.y)) - 1)].x);
    col += vec3f(0.35, 0.42, 0.5) * clamp(ge * 0.4, 0.0, 0.5);
  }

  // --- animated isophase contours (wavefronts marching at v_p).
  // NOTE: the branch is uniform (ru.layers) so fwidth stays in uniform
  // control flow — the heat-equation fwidth-in-varying-branch lesson; the
  // per-pixel amplitude gate is a multiplier, never a branch.
  if ((L & 4u) != 0u) {
    let phase = atan2(ph.y, ph.x + 1e-20) / 6.2831853;
    let s = fract((phase - ru.time * 0.15) * ru.isoK);
    let d = abs(s - 0.5);
    let w = fwidth(s) * 1.5 + 1e-4;
    let line = 1.0 - smoothstep(0.0, w * 2.0, d - 0.02);
    let gate = smoothstep(0.002, 0.006, amp);
    col += vec3f(1.0) * line * clamp(sqrt(amp) * 2.0, 0.0, 0.55) * gate;
  }

  // --- envelope / peak-hold
  if ((L & 16u) != 0u) {
    let env = auxE[idx].w * ru.fieldGain;
    col += lutSample(1u, clamp(env * 0.6, 0.0, 1.0)) * 0.35 * clamp(env * 2.0, 0.0, 1.0);
  }

  // --- PML shading
  if ((L & 128u) != 0u && ru.pmlN > 0.0) {
    let dEdge = min(
      min(p.x, f32(ru.nx) - 1.0 - p.x),
      min(p.y, f32(ru.ny) - 1.0 - p.y),
    );
    if (dEdge < ru.pmlN) {
      let t = 1.0 - dEdge / ru.pmlN;
      col = mix(col, vec3f(0.03, 0.04, 0.06), 0.55 * t);
      // hatch
      let h = fract((p.x + p.y) * 0.25);
      col += vec3f(0.02) * step(0.8, h) * t;
    }
  }

  // --- source markers
  if ((L & 256u) != 0u) {
    for (var k = 0u; k < ru.srcCount; k++) {
      let s = ru.sources[k];
      if (s.w < 0.5) { continue; }
      let d = distance(p, vec2f(s.x, s.y));
      let ring = abs(d - 3.0);
      col += vec3f(1.0, 0.85, 0.4) * (1.0 - smoothstep(0.0, 1.2, ring)) * 0.8;
    }
  }

  return vec4f(col, 1.0);
}

// ------------------------------------------------------------- photon tracers
// 256k sparks advected by the time-averaged Poynting vector <S> computed
// from the shared phasor buffers (spec-ref § 5.1: advect by <S>, never the
// instantaneous S, which oscillates at 2w). Not on any gated path.

struct TU {
  nx: u32,
  ny: u32,
  count: u32,
  frame: u32,
  speed: f32,
  dftInvW: f32,
  fade: f32,
  seedMix: f32,
  emitters: array<vec4f, 16>, // i, j, weight, on
  emitterCount: u32,
  pad0: u32,
  pad1: u32,
  pad2: u32,
}

@group(0) @binding(0) var<uniform> tu: TU;
@group(0) @binding(1) var<storage, read_write> parts: array<vec4f>; // x, y, age, life
@group(0) @binding(2) var<storage, read> phasorT: array<vec2f>;
// vertex stages cannot bind read_write storage (schrodinger-smoke lesson) —
// the draw pipeline binds the SAME particle buffer read-only at binding 3.
@group(0) @binding(3) var<storage, read> partsR: array<vec4f>;

fn hash1(x: u32) -> f32 {
  var h = x;
  h ^= h >> 16u;
  h *= 0x7feb352du;
  h ^= h >> 15u;
  h *= 0x846ca68bu;
  h ^= h >> 16u;
  return f32(h) / 4294967295.0;
}

fn poyntingAt(p: vec2f) -> vec2f {
  let i = clamp(i32(round(p.x)), 0, i32(tu.nx) - 1);
  let j = clamp(i32(round(p.y)), 0, i32(tu.ny) - 1);
  let idx = u32(i) * tu.ny + u32(j);
  let n2 = tu.nx * tu.ny;
  let e = phasorT[idx] * tu.dftInvW;
  let hx = phasorT[n2 + idx] * tu.dftInvW;
  let hy = phasorT[2u * n2 + idx] * tu.dftInvW;
  // <Sx> = -0.5 Re(Ez Hy*), <Sy> = +0.5 Re(Ez Hx*)
  let sx = -0.5 * (e.x * hy.x + e.y * hy.y);
  let sy = 0.5 * (e.x * hx.x + e.y * hx.y);
  return vec2f(sx, sy);
}

@compute @workgroup_size(64)
fn tracer_advect(@builtin(global_invocation_id) gid: vec3u) {
  let k = gid.x;
  if (k >= tu.count) { return; }
  var pt = parts[k];
  pt.z += 1.0;
  let s = poyntingAt(pt.xy);
  let mag = length(s);
  var dead = pt.z > pt.w || pt.x < 1.0 || pt.y < 1.0 || pt.x > f32(tu.nx) - 2.0 || pt.y > f32(tu.ny) - 2.0;
  if (mag > 1e-12 && !dead) {
    let v = s / max(sqrt(mag), 1e-6) * tu.speed; // ~sqrt scaling reads well
    pt.x += v.x;
    pt.y += v.y;
  }
  if (dead) {
    // respawn near a weighted emitter (hash-based, render-only path)
    let h0 = hash1(k * 747796405u + tu.frame * 2891336453u);
    let h1 = hash1(k * 3267000013u + tu.frame * 668265263u);
    let h2 = hash1(k * 2246822519u + tu.frame * 374761393u);
    var ei = 0u;
    if (tu.emitterCount > 0u) { ei = u32(h0 * f32(tu.emitterCount)) % tu.emitterCount; }
    let em = tu.emitters[ei];
    if (em.w > 0.5) {
      let ang = h1 * 6.2831853;
      let rad = h2 * 10.0 + 2.0;
      pt.x = em.x + cos(ang) * rad;
      pt.y = em.y + sin(ang) * rad;
      pt.z = 0.0;
      pt.w = 120.0 + h0 * 240.0;
    } else {
      pt.x = 1.0 + h1 * (f32(tu.nx) - 2.0);
      pt.y = 1.0 + h2 * (f32(tu.ny) - 2.0);
      pt.z = 0.0;
      pt.w = 120.0 + h0 * 240.0;
    }
  }
  parts[k] = pt;
}

struct TVOut {
  @builtin(position) pos: vec4f,
  @location(0) glow: f32,
}

@vertex
fn tracer_vs(@builtin(vertex_index) vi: u32) -> TVOut {
  var out: TVOut;
  let pt = partsR[vi];
  let x = (pt.x + 0.5) / f32(tu.nx) * 2.0 - 1.0;
  let y = 1.0 - (pt.y + 0.5) / f32(tu.ny) * 2.0;
  out.pos = vec4f(x, y, 0.0, 1.0);
  let s = poyntingAt(pt.xy);
  let lifeFade = 1.0 - pt.z / max(pt.w, 1.0);
  out.glow = clamp(sqrt(length(s)) * 4.0, 0.0, 1.0) * lifeFade * tu.fade;
  return out;
}

@fragment
fn tracer_fs(in: TVOut) -> @location(0) vec4f {
  return vec4f(vec3f(0.45, 0.75, 1.0) * in.glow * 0.12, 1.0);
}

// ---------------------------------------------------------- bloom + present

struct PU {
  texel: vec2f,
  threshold: f32,
  strength: f32,
}

@group(0) @binding(0) var<uniform> pu: PU;
@group(0) @binding(1) var srcTex: texture_2d<f32>;
@group(0) @binding(2) var srcSamp: sampler;
@group(0) @binding(3) var bloomTex: texture_2d<f32>;

@fragment
fn bright_fs(in: VOut) -> @location(0) vec4f {
  // 13-tap downsample-ish (4 bilinear corners + center) + threshold
  let uv = in.uv;
  let t = pu.texel;
  var c = textureSample(srcTex, srcSamp, uv).rgb * 0.4;
  c += textureSample(srcTex, srcSamp, uv + vec2f(t.x, t.y)).rgb * 0.15;
  c += textureSample(srcTex, srcSamp, uv + vec2f(-t.x, t.y)).rgb * 0.15;
  c += textureSample(srcTex, srcSamp, uv + vec2f(t.x, -t.y)).rgb * 0.15;
  c += textureSample(srcTex, srcSamp, uv + vec2f(-t.x, -t.y)).rgb * 0.15;
  let l = dot(c, vec3f(0.2126, 0.7152, 0.0722));
  let k = max(l - pu.threshold, 0.0) / max(l, 1e-4);
  return vec4f(c * k, 1.0);
}

@fragment
fn blur_fs(in: VOut) -> @location(0) vec4f {
  // 9-tap tent
  let uv = in.uv;
  let t = pu.texel;
  var c = textureSample(srcTex, srcSamp, uv).rgb * 0.25;
  c += textureSample(srcTex, srcSamp, uv + vec2f(t.x, 0.0)).rgb * 0.125;
  c += textureSample(srcTex, srcSamp, uv - vec2f(t.x, 0.0)).rgb * 0.125;
  c += textureSample(srcTex, srcSamp, uv + vec2f(0.0, t.y)).rgb * 0.125;
  c += textureSample(srcTex, srcSamp, uv - vec2f(0.0, t.y)).rgb * 0.125;
  c += textureSample(srcTex, srcSamp, uv + t).rgb * 0.0625;
  c += textureSample(srcTex, srcSamp, uv - t).rgb * 0.0625;
  c += textureSample(srcTex, srcSamp, uv + vec2f(t.x, -t.y)).rgb * 0.0625;
  c += textureSample(srcTex, srcSamp, uv + vec2f(-t.x, t.y)).rgb * 0.0625;
  return vec4f(c, 1.0);
}

fn aces(x: vec3f) -> vec3f {
  let a = 2.51;
  let b = 0.03;
  let c = 2.43;
  let d = 0.59;
  let e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), vec3f(0.0), vec3f(1.0));
}

@fragment
fn present_fs(in: VOut) -> @location(0) vec4f {
  let hdr = textureSample(srcTex, srcSamp, in.uv).rgb;
  let bloom = textureSample(bloomTex, srcSamp, in.uv).rgb;
  let c = aces(hdr + bloom * pu.strength);
  // sRGB-ish encode (canvas formats are non-srgb by default)
  return vec4f(pow(c, vec3f(1.0 / 2.2)), 1.0);
}
