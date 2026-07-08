// signal-workbench — analysis compute core (WGSL, f32).
//
// Backend contract: packages/signal-workbench/signal_workbench (f64 NumPy).
// The gated path is window-multiply -> 1D Stockham FFT -> spectrum capture;
// signals are CPU-f64-synthesized (dsp64.mjs) and uploaded as f32 — no f32
// trig argument reduction on the gated path (spec-ref § 5.2, the committed-
// buffer plan). The FFT butterfly + poly-trig twiddles are the SHARED
// common/common-web/src/fft-wgsl.ts source (spliced by solver.ts at pipeline
// creation, never forked); this file adds only the 1D/batched coord_of
// (operator decision 5 executed).
//
// Determinism: fixed Stockham pass order, no atomics on the gated path.
// The persistence histogram (atomicAdd) is RENDER-only and never feeds the
// gated arrays (spec-ref § 5.5 corollary, § 6.5 toggle control).

struct Uni {
  n: u32,            // frame length (power of two)
  half_n: u32,       // butterflies per pass = n/2 per line
  batch: u32,        // number of lines transformed per dispatch (1 for gate)
  window_sum: f32,   // sum of window taps (coherent-gain amplitude norm)
  db_floor: f32,     // spectrum display floor (dB)
  db_ceil: f32,      // spectrum display ceiling (dB)
  wf_row: u32,       // waterfall ring write row
  wf_rows: u32,      // waterfall ring height
  persist_decay: f32,// per-frame persistence decay factor (display-only)
  persist_rows: u32, // amplitude cells in the persistence histogram
  _pad0: u32,
  _pad1: u32,
}

struct PassU {
  stage: u32,
  dir: f32,    // -1 forward (the only direction the workbench dispatches)
  norm: f32,
  flags: u32,  // bit0: apply window in to_complex
}

@group(0) @binding(0) var<uniform> U: Uni;
@group(0) @binding(1) var<storage, read> signalBuf: array<f32>;   // f64->f32 upload
@group(0) @binding(2) var<storage, read> windowBuf: array<f32>;   // committed taps
@group(0) @binding(3) var<storage, read_write> cA: array<vec2<f32>>; // complex ping
@group(0) @binding(4) var<storage, read_write> cB: array<vec2<f32>>; // complex pong
@group(0) @binding(5) var<storage, read_write> specMag: array<f32>;  // dB, N/2+1
@group(0) @binding(6) var<storage, read_write> waterfall: array<f32>; // ring rows x N/2
@group(0) @binding(7) var<storage, read_write> persist: array<atomic<u32>>; // display-only

@group(1) @binding(0) var<uniform> P: PassU;

// ---------------------------------------------------------------------------
// Precision trig + Stockham butterfly core: SHARED (spec-ref § 5.2 precision
// rule — Vulkan builtin sin/cos are 2^-11-absolute only; the schrodinger-
// smoke 63x lavapipe measurement). Injected from
// common/common-web/src/fft-wgsl.ts at pipeline creation.
// ---------------------------------------------------------------------------
//__COMMON_FFT__

// 1D batched layout: line l occupies elements [l*n, (l+1)*n).
fn coord_of(line_id: u32, e: u32) -> u32 {
  return line_id * U.n + e;
}

// Windowed load into the complex ping (flags bit0 selects the window path;
// the rectangular/coherent scene runs with flags = 0).
@compute @workgroup_size(128)
fn to_complex(@builtin(global_invocation_id) g: vec3<u32>) {
  let total = U.n * U.batch;
  if (g.x >= total) { return; }
  var v = signalBuf[g.x];
  if ((P.flags & 1u) == 1u) {
    v = v * windowBuf[g.x % U.n];
  }
  cA[g.x] = vec2<f32>(v, 0.0);
}

@compute @workgroup_size(128)
fn fft_pass(@builtin(global_invocation_id) g: vec3<u32>) {
  let total = U.half_n * U.batch;
  if (g.x >= total) { return; }
  let line_id = g.x / U.half_n;
  let t = g.x % U.half_n;
  let fb = fft_butterfly(t, P.stage, U.half_n, P.dir);
  let va = cA[coord_of(line_id, fb.ea)];
  let vb = cmul(fb.w, cA[coord_of(line_id, fb.eb)]);
  cB[coord_of(line_id, fb.ec)] = va + vb;
  cB[coord_of(line_id, fb.ed)] = va - vb;
}

// One-sided amplitude spectrum in dB (coherent-gain normalized): a unit
// on-bin sinusoid reads 0 dBFS. Display transform only — the gate reads the
// raw complex spectrum (cA) back instead.
@compute @workgroup_size(128)
fn spectrum_capture(@builtin(global_invocation_id) g: vec3<u32>) {
  if (g.x > U.half_n) { return; }
  let c = cA[g.x];
  var amp = 2.0 * sqrt(c.x * c.x + c.y * c.y) / max(U.window_sum, 1e-30);
  if (g.x == 0u || g.x == U.half_n) { amp = amp * 0.5; }
  specMag[g.x] = 20.0 * log(max(amp, 1e-12)) / 2.302585092994046;
}

// Waterfall ring row write (RENDER-only).
@compute @workgroup_size(128)
fn waterfall_row(@builtin(global_invocation_id) g: vec3<u32>) {
  if (g.x >= U.half_n) { return; }
  waterfall[U.wf_row * U.half_n + g.x] = specMag[g.x];
}

// DPX-style persistence accumulation (RENDER-only, § 5.5): rasterize the
// current spectrum trace into a decaying hit-count histogram.
@compute @workgroup_size(128)
fn persist_accum(@builtin(global_invocation_id) g: vec3<u32>) {
  if (g.x >= U.half_n) { return; }
  let db = specMag[g.x];
  let t = clamp((db - U.db_floor) / max(U.db_ceil - U.db_floor, 1e-6), 0.0, 1.0);
  let row = min(u32(t * f32(U.persist_rows - 1u) + 0.5), U.persist_rows - 1u);
  atomicAdd(&persist[row * U.half_n + g.x], 1024u);
}

// Exponential decay of the persistence counts (between frames; display-only).
@compute @workgroup_size(128)
fn persist_decay(@builtin(global_invocation_id) g: vec3<u32>) {
  let total = U.persist_rows * U.half_n;
  if (g.x >= total) { return; }
  let v = atomicLoad(&persist[g.x]);
  atomicStore(&persist[g.x], u32(f32(v) * U.persist_decay));
}
