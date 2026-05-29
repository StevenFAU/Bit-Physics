// Growing Neural CA — forward-inference compute shader (Stack B, WGSL).
//
// One dispatch = one NCA step over the grid:
//   1. perception : fixed depthwise conv [identity, Sobel-x, Sobel-y]  -> 48-vec
//   2. update MLP : Conv1x1(128) -> ReLU -> Conv1x1(16, zero-init)     -> dx
//   3. fire mask  : per-cell Bernoulli(fire_rate) gating of dx
//   4. alive mask : maxpool_3x3(alpha) > 0.1, applied pre & post
//
// Weights come from the converted flat-f32 buffer (neural_ca/convert_checkpoint.py);
// the layout sidecar documents per-tensor offsets. Local-only (spec § 7.8) —
// executed on a GPU host (Node deploy path via index.ts, OR the wgpu-py harness
// in this environment) to produce the committed B-inference capture.
//
// Stage 1a: SKELETON (bindings + entry point declared). Stage 1b-B implements
// the body to match neural_ca.reference.nca_numpy (the CI-visible oracle) and
// the PyTorch model.

// TODO(Stage-1b-B): implement the full forward step. The skeleton fixes the
// binding contract so the wgpu-py harness + index.ts driver agree on layout.

struct Params {
  grid : u32,
  channel_n : u32,
  step : u32,
  fire_rate : f32,
};

@group(0) @binding(0) var<uniform> params : Params;
@group(0) @binding(1) var<storage, read>        state_in  : array<f32>;
@group(0) @binding(2) var<storage, read_write>  state_out : array<f32>;
@group(0) @binding(3) var<storage, read>        weights   : array<f32>;
@group(0) @binding(4) var<storage, read>        rng       : array<u32>;

@compute @workgroup_size(8, 8)
fn nca_step(@builtin(global_invocation_id) gid : vec3<u32>) {
  // TODO(Stage-1b-B): perception conv + update MLP + fire mask + alive mask.
}
