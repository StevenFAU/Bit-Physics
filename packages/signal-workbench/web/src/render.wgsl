// signal-workbench — render passes (RENDER layer only, spec-ref § 5.5).
// Every pipeline here draws gated or analytic data; none of it writes back
// into the gated arrays (the § 6.5 display-only toggle control).

struct RenderU {
  count: u32,       // samples in the trace buffer
  mode: u32,        // 0 linear [-yr, yr], 1 dB [db_floor, db_ceil]
  y_range: f32,
  db_floor: f32,
  db_ceil: f32,
  color: vec3<f32>,
  x0: f32,          // viewport x range in clip space
  x1: f32,
  y0: f32,          // viewport y range in clip space
  y1: f32,
  wf_row: u32,      // waterfall newest row
  wf_rows: u32,
  half_n: u32,
  persist_rows: u32,
  beam_sigma: f32,  // XY beam spot sigma (clip units)
  beam_gain: f32,
}

@group(0) @binding(0) var<uniform> R: RenderU;
@group(0) @binding(1) var<storage, read> traceA: array<f32>;
@group(0) @binding(2) var<storage, read> traceB: array<f32>;
@group(0) @binding(3) var<storage, read> gridF32: array<f32>;   // waterfall ring
@group(0) @binding(4) var<storage, read> gridU32: array<u32>;   // persistence counts

//__COLORMAP__

fn map_y(v: f32) -> f32 {
  var t: f32;
  if (R.mode == 1u) {
    t = clamp((v - R.db_floor) / max(R.db_ceil - R.db_floor, 1e-6), 0.0, 1.0);
  } else {
    t = clamp(v / (2.0 * R.y_range) + 0.5, 0.0, 1.0);
  }
  return mix(R.y0, R.y1, t);
}

struct LineOut {
  @builtin(position) pos: vec4<f32>,
}

// Vertex-pull line strip over traceA.
@vertex
fn line_vs(@builtin(vertex_index) vi: u32) -> LineOut {
  let x = mix(R.x0, R.x1, f32(vi) / f32(max(R.count - 1u, 1u)));
  var out: LineOut;
  out.pos = vec4<f32>(x, map_y(traceA[vi]), 0.0, 1.0);
  return out;
}

@fragment
fn line_fs() -> @location(0) vec4<f32> {
  return vec4<f32>(R.color, 1.0);
}

// Fullscreen helpers -------------------------------------------------------

struct QuadOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

@vertex
fn quad_vs(@builtin(vertex_index) vi: u32) -> QuadOut {
  var xy = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -3.0), vec2<f32>(-1.0, 1.0), vec2<f32>(3.0, 1.0));
  var out: QuadOut;
  out.pos = vec4<f32>(xy[vi], 0.0, 1.0);
  out.uv = xy[vi] * 0.5 + vec2<f32>(0.5, 0.5);
  return out;
}

// Spectrogram waterfall: ring rows scroll upward, viridis-family colormap.
@fragment
fn waterfall_fs(in: QuadOut) -> @location(0) vec4<f32> {
  let rows = f32(R.wf_rows);
  let row_back = (1.0 - in.uv.y) * (rows - 1.0);
  let row = (f32(R.wf_row) + rows - row_back) % rows;
  let bin = u32(in.uv.x * f32(R.half_n - 1u));
  let db = gridF32[u32(row) * R.half_n + bin];
  let t = clamp((db - R.db_floor) / max(R.db_ceil - R.db_floor, 1e-6), 0.0, 1.0);
  return vec4<f32>(colormap(t), 1.0);
}

// DPX persistence view: log-tonemapped hit counts (x = bin, y = amplitude).
@fragment
fn persist_fs(in: QuadOut) -> @location(0) vec4<f32> {
  let row = u32(in.uv.y * f32(R.persist_rows - 1u));
  let bin = u32(in.uv.x * f32(R.half_n - 1u));
  let hits = f32(gridU32[row * R.half_n + bin]) / 1024.0;
  let t = clamp(log(1.0 + 4.0 * hits) / log(1.0 + 140.0), 0.0, 1.0);
  return vec4<f32>(colormap(t), 1.0);
}

// XY / Lissajous erf-beam (woscope model, spec-ref § 5.5): one instanced
// quad per consecutive sample pair; the fragment evaluates the closed-form
// time integral of a moving Gaussian beam spot in segment-local coords:
//   (1/2l) * exp(-py^2 / 2s^2) * [erf(px/sqrt2 s) - erf((px-l)/sqrt2 s)]
// Additive blending; the 1/2l normalization (slow beam => brighter) is the
// load-bearing term.

fn erf_approx(x: f32) -> f32 {
  // Abramowitz-Stegun 7.1.26 (|eps| <= 1.5e-7), odd extension.
  let s = sign(x);
  let a = abs(x);
  let t = 1.0 / (1.0 + 0.3275911 * a);
  let y = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t
      - 0.284496736) * t + 0.254829592) * t * exp(-a * a);
  return s * y;
}

struct BeamOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) local: vec2<f32>, // segment-local (px, py)
  @location(1) len: f32,
}

@vertex
fn beam_vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) inst: u32) -> BeamOut {
  let p0 = vec2<f32>(traceA[inst], traceB[inst]);
  let p1 = vec2<f32>(traceA[inst + 1u], traceB[inst + 1u]);
  let d = p1 - p0;
  let l = max(length(d), 1e-6);
  let dir = d / l;
  let nrm = vec2<f32>(-dir.y, dir.x);
  let pad = 4.0 * R.beam_sigma;
  // quad corners in segment space: x in [-pad, l+pad], y in [-pad, +pad]
  var corner = array<vec2<f32>, 6>(
    vec2<f32>(-pad, -pad), vec2<f32>(l + pad, -pad), vec2<f32>(-pad, pad),
    vec2<f32>(-pad, pad), vec2<f32>(l + pad, -pad), vec2<f32>(l + pad, pad));
  let c = corner[vi];
  let world = p0 + dir * c.x + nrm * c.y;
  var out: BeamOut;
  out.pos = vec4<f32>(mix(R.x0, R.x1, world.x * 0.5 + 0.5),
                      mix(R.y0, R.y1, world.y * 0.5 + 0.5), 0.0, 1.0);
  out.local = c;
  out.len = l;
  return out;
}

@fragment
fn beam_fs(in: BeamOut) -> @location(0) vec4<f32> {
  let s = R.beam_sigma;
  let inv = 1.0 / (2.0 * in.len);
  let gauss = exp(-in.local.y * in.local.y / (2.0 * s * s));
  let sweep = erf_approx(in.local.x / (1.4142135 * s))
            - erf_approx((in.local.x - in.len) / (1.4142135 * s));
  let e = R.beam_gain * inv * gauss * sweep;
  return vec4<f32>(R.color * e, 1.0);
}
