// Growing Neural CA — forward-inference compute shader (Stack B, WGSL).
//
// Implements the per-cell NCA update, matching neural_ca.reference.nca_numpy
// (the CI-visible oracle) and the PyTorch model:
//   1. perception : fixed depthwise conv [identity, Sobel-x, Sobel-y]  -> 48-vec
//   2. update MLP : Conv1x1(128) -> ReLU -> Conv1x1(16, zero-init)     -> dx
//   3. fire mask  : per-cell stateless PCG hash <= fire_rate
//   4. alive mask : maxpool_3x3(alpha) > 0.1, pre & post
//
// State layout: cell-major, channels contiguous per cell:
//   idx(x, y, c) = (y * grid + x) * CN + c.
// Weights are the converted flat-f32 buffer (convert_checkpoint.py); offsets
// come from Params (read from the layout sidecar by the driver/harness).
//
// The alive mask needs the UPDATED alpha of neighbours, so a step is TWO
// dispatches: `update` (state_in -> state_mid = state_in + dx*fire) then `mask`
// (reads state_in for pre-alive + state_mid for post-alive -> state_out). The
// driver rotates three buffers. Local-only (spec § 7.8).

const CN : u32 = 16u;     // channels
const HID : u32 = 128u;   // update-MLP hidden width
const PERC : u32 = 48u;   // 3 * CN

struct Params {
  grid : u32,
  step : u32,
  seed : u32,
  fire_rate : f32,
  b1_off : u32,
  w1_off : u32,
  w2_off : u32,
  _pad : u32,
};

@group(0) @binding(0) var<uniform> P : Params;
@group(0) @binding(1) var<storage, read>       state_in  : array<f32>;
@group(0) @binding(2) var<storage, read>       state_mid : array<f32>;
@group(0) @binding(3) var<storage, read_write> state_out : array<f32>;
@group(0) @binding(4) var<storage, read>       weights   : array<f32>;

fn cell_base(x : u32, y : u32) -> u32 {
  return (y * P.grid + x) * CN;
}

// Read channel c at (x, y) from `buf`; zero outside the grid (zero-pad 'SAME').
fn sample(buf_sel : u32, x : i32, y : i32, c : u32) -> f32 {
  if (x < 0 || y < 0 || x >= i32(P.grid) || y >= i32(P.grid)) {
    return 0.0;
  }
  let idx = (u32(y) * P.grid + u32(x)) * CN + c;
  if (buf_sel == 0u) { return state_in[idx]; }
  return state_mid[idx];
}

// Stateless PCG-style hash -> uniform [0,1) — identical to nca_numpy.pcg_fire.
fn pcg_fire(x : u32, y : u32, step : u32, seed : u32) -> f32 {
  var v : u32 = x * 1973u + y * 9277u + step * 26699u;
  v = v + seed * 2654435761u;
  v = v * 747796405u + 2891336453u;
  var word : u32 = ((v >> ((v >> 28u) + 4u)) ^ v) * 277803737u;
  word = (word >> 22u) ^ word;
  return f32(word) / 4294967296.0;
}

// 3x3 alpha (channel 3) max-pool > 0.1 over buffer `buf_sel`.
fn alive(buf_sel : u32, x : i32, y : i32) -> bool {
  var m : f32 = -1.0e30;
  for (var dy : i32 = -1; dy <= 1; dy = dy + 1) {
    for (var dx : i32 = -1; dx <= 1; dx = dx + 1) {
      m = max(m, sample(buf_sel, x + dx, y + dy, 3u));
    }
  }
  return m > 0.1;
}

// Pass 1: state_mid = state_in + dx * fire.
@compute @workgroup_size(8, 8)
fn update(@builtin(global_invocation_id) gid : vec3<u32>) {
  let x = gid.x;
  let y = gid.y;
  if (x >= P.grid || y >= P.grid) { return; }
  let xi = i32(x);
  let yi = i32(y);

  // Perception (48-vec): [c_id, c_sobelx, c_sobely] per channel.
  // Sobel_x = [[-1,0,1],[-2,0,2],[-1,0,1]] / 8 ; Sobel_y = transpose.
  var perc : array<f32, 48>;
  for (var c : u32 = 0u; c < CN; c = c + 1u) {
    let v00 = sample(0u, xi - 1, yi - 1, c); let v01 = sample(0u, xi, yi - 1, c); let v02 = sample(0u, xi + 1, yi - 1, c);
    let v10 = sample(0u, xi - 1, yi,     c); let v11 = sample(0u, xi, yi,     c); let v12 = sample(0u, xi + 1, yi,     c);
    let v20 = sample(0u, xi - 1, yi + 1, c); let v21 = sample(0u, xi, yi + 1, c); let v22 = sample(0u, xi + 1, yi + 1, c);
    let sx = (-v00 + v02 - 2.0 * v10 + 2.0 * v12 - v20 + v22) / 8.0;
    let sy = (-v00 - 2.0 * v01 - v02 + v20 + 2.0 * v21 + v22) / 8.0;
    perc[3u * c + 0u] = v11;
    perc[3u * c + 1u] = sx;
    perc[3u * c + 2u] = sy;
  }

  // dx = w2 @ relu(w1 @ perc + b1).
  var dx : array<f32, 16>;
  for (var c : u32 = 0u; c < CN; c = c + 1u) { dx[c] = 0.0; }
  for (var o : u32 = 0u; o < HID; o = o + 1u) {
    var acc : f32 = weights[P.b1_off + o];
    let row = P.w1_off + o * PERC;
    for (var j : u32 = 0u; j < PERC; j = j + 1u) {
      acc = acc + weights[row + j] * perc[j];
    }
    let h = max(acc, 0.0);
    if (h != 0.0) {
      for (var c : u32 = 0u; c < CN; c = c + 1u) {
        dx[c] = dx[c] + weights[P.w2_off + c * HID + o] * h;
      }
    }
  }

  let fire = select(0.0, 1.0, pcg_fire(x, y, P.step, P.seed) <= P.fire_rate);
  let base = cell_base(x, y);
  for (var c : u32 = 0u; c < CN; c = c + 1u) {
    state_out[base + c] = state_in[base + c] + dx[c] * fire;
  }
}

// Pass 2: state_out = state_mid * (pre_alive & post_alive).
@compute @workgroup_size(8, 8)
fn mask(@builtin(global_invocation_id) gid : vec3<u32>) {
  let x = gid.x;
  let y = gid.y;
  if (x >= P.grid || y >= P.grid) { return; }
  let live = alive(0u, i32(x), i32(y)) && alive(1u, i32(x), i32(y));
  let keep = select(0.0, 1.0, live);
  let base = cell_base(x, y);
  for (var c : u32 = 0u; c < CN; c = c + 1u) {
    state_out[base + c] = state_mid[base + c] * keep;
  }
}
