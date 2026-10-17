// Measured exposure (00-foundation.md § 3.1): a 64-bin log2-luminance
// histogram of the HDR scene each frame, then one tiny pass that finds the
// target percentile and eases exposure towards key/L_p. GPU-only state; the
// composite reads `state.exposure` directly, nothing waits on a readback.
#import bp/tonemap

const BINS: u32 = 64u;
const LOG_MIN: f32 = -12.0;
const LOG_MAX: f32 = 4.0;

struct ExposureParams {
  dt: f32,          // seconds since last frame
  tau: f32,         // easing time constant, seconds
  percentile: f32,  // e.g. 0.95
  key: f32,         // the percentile maps to this linear value, e.g. 0.8
  mode: u32,        // 0 = auto, 1 = pinned
  pinned: f32,
  min_exposure: f32,
  max_exposure: f32,
};

struct ExposureState {
  exposure: f32,
  measured: f32,    // L at the percentile, scene-linear
  goal: f32,
  initialized: u32,
};

@group(0) @binding(0) var<uniform> P: ExposureParams;
@group(0) @binding(1) var scene: texture_2d<f32>;
@group(0) @binding(2) var<storage, read_write> bins: array<atomic<u32>, 64>;
@group(0) @binding(3) var<storage, read_write> state: ExposureState;

var<workgroup> local_bins: array<atomic<u32>, 64>;

fn bin_of(l: f32) -> u32 {
  if (l <= exp2(LOG_MIN)) { return 0u; }
  let t = (log2(l) - LOG_MIN) / (LOG_MAX - LOG_MIN);
  return u32(clamp(t * f32(BINS - 1u) + 1.0, 1.0, f32(BINS - 1u)));
}

// Each invocation samples one pixel on a stride-2 lattice: a 16×16 group
// covers 32×32 px. Dispatch ceil(w/32) × ceil(h/32).
@compute @workgroup_size(16, 16, 1)
fn histogram(@builtin(global_invocation_id) gid: vec3<u32>, @builtin(local_invocation_index) li: u32) {
  if (li < BINS) { atomicStore(&local_bins[li], 0u); }
  workgroupBarrier();
  let dims = textureDimensions(scene);
  let p = gid.xy * 2u;
  if (p.x < dims.x && p.y < dims.y) {
    let c = textureLoad(scene, vec2<i32>(p), 0).rgb;
    atomicAdd(&local_bins[bin_of(luminance(c))], 1u);
  }
  workgroupBarrier();
  if (li < BINS) {
    let n = atomicLoad(&local_bins[li]);
    if (n > 0u) { atomicAdd(&bins[li], n); }
  }
}

@compute @workgroup_size(1, 1, 1)
fn resolve() {
  var total = 0u;
  for (var i = 0u; i < BINS; i = i + 1u) { total = total + atomicLoad(&bins[i]); }
  var lum = 1.0;
  if (total > 0u) {
    let goal = P.percentile * f32(total);
    var acc = 0.0;
    var found = false;
    for (var i = 0u; i < BINS; i = i + 1u) {
      let n = f32(atomicLoad(&bins[i]));
      if (!found && acc + n >= goal) {
        let frac = select(0.5, (goal - acc) / n, n > 0.0);
        if (i == 0u) {
          lum = exp2(LOG_MIN);
        } else {
          let lo = LOG_MIN + (f32(i) - 1.0) / f32(BINS - 1u) * (LOG_MAX - LOG_MIN);
          let hi = LOG_MIN + f32(i) / f32(BINS - 1u) * (LOG_MAX - LOG_MIN);
          lum = exp2(mix(lo, hi, frac));
        }
        found = true;
      }
      acc = acc + n;
    }
  }
  for (var i = 0u; i < BINS; i = i + 1u) { atomicStore(&bins[i], 0u); }
  let goal = clamp(P.key / max(lum, 1e-5), P.min_exposure, P.max_exposure);
  state.measured = lum;
  state.goal = goal;
  if (P.mode == 1u) {
    state.exposure = P.pinned;
  } else if (state.initialized == 0u) {
    state.exposure = goal;
  } else {
    // ease in log space: equal time to brighten and to darken by a factor
    let a = 1.0 - exp(-P.dt / max(P.tau, 1e-3));
    state.exposure = exp2(mix(log2(max(state.exposure, 1e-6)), log2(goal), a));
  }
  state.initialized = 1u;
}
