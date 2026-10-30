// Grow — the Textures scene's kernel (M3): a texture NCA after Niklasson et
// al. 2021, Self-Organising Textures (Distill), as trained by
// packages/neural-ca/textures/train.py. NOT the gated kernel and not checked
// against anything bit for bit: it is the display model of a scene.
//
// 12 channels in the dish's 16-float cell (12..15 stay 0); RGB = channels
// 0..2 + 0.5. Perception = identity, Sobel x, Sobel y and the 9-point
// Laplacian per channel (48 values, index 4·c + filter, as the trainer's
// reshape), with PERIODIC boundaries; dense 48 → 96 (bias, ReLU) → 12;
// stochastic update at the fire rate from the gated kernel's own PCG hash.
// No alive mask: every cell is alive; the seed is all zeros.
// One pass per step (cur → nxt). Plain arithmetic only — no builtin
// transcendentals.

const CN : u32 = 16u;
const CH : u32 = 12u;
const HID : u32 = 96u;
const PERC : u32 = 48u;

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
@group(0) @binding(2) var<storage, read_write> state_out : array<f32>;
@group(0) @binding(3) var<storage, read>       weights   : array<f32>;

fn at(x : i32, y : i32, c : u32) -> f32 {
  let n = i32(P.grid);
  let xx = (x + n) % n;
  let yy = (y + n) % n;
  return state_in[(u32(yy) * P.grid + u32(xx)) * CN + c];
}

fn pcg_fire(x : u32, y : u32, step : u32, seed : u32) -> f32 {
  var v : u32 = x * 1973u + y * 9277u + step * 26699u;
  v = v + seed * 2654435761u;
  v = v * 747796405u + 2891336453u;
  var word : u32 = ((v >> ((v >> 28u) + 4u)) ^ v) * 277803737u;
  word = (word >> 22u) ^ word;
  return f32(word) / 4294967296.0;
}

@compute @workgroup_size(8, 8)
fn update(@builtin(global_invocation_id) gid : vec3<u32>) {
  let x = gid.x;
  let y = gid.y;
  if (x >= P.grid || y >= P.grid) { return; }
  let xi = i32(x);
  let yi = i32(y);

  var perc : array<f32, 48>;
  for (var c : u32 = 0u; c < CH; c = c + 1u) {
    let v00 = at(xi - 1, yi - 1, c); let v01 = at(xi, yi - 1, c); let v02 = at(xi + 1, yi - 1, c);
    let v10 = at(xi - 1, yi,     c); let v11 = at(xi, yi,     c); let v12 = at(xi + 1, yi,     c);
    let v20 = at(xi - 1, yi + 1, c); let v21 = at(xi, yi + 1, c); let v22 = at(xi + 1, yi + 1, c);
    perc[4u * c + 0u] = v11;
    perc[4u * c + 1u] = (-v00 + v02 - 2.0 * v10 + 2.0 * v12 - v20 + v22) / 8.0;
    perc[4u * c + 2u] = (-v00 - 2.0 * v01 - v02 + v20 + 2.0 * v21 + v22) / 8.0;
    perc[4u * c + 3u] = (v00 + 2.0 * v01 + v02 + 2.0 * v10 - 12.0 * v11 + 2.0 * v12 + v20 + 2.0 * v21 + v22) / 16.0;
  }

  var dx : array<f32, 12>;
  for (var c : u32 = 0u; c < CH; c = c + 1u) { dx[c] = 0.0; }
  for (var o : u32 = 0u; o < HID; o = o + 1u) {
    var acc : f32 = weights[P.b1_off + o];
    let row = P.w1_off + o * PERC;
    for (var j : u32 = 0u; j < PERC; j = j + 1u) {
      acc = acc + weights[row + j] * perc[j];
    }
    let h = max(acc, 0.0);
    if (h != 0.0) {
      for (var c : u32 = 0u; c < CH; c = c + 1u) {
        dx[c] = dx[c] + weights[P.w2_off + c * HID + o] * h;
      }
    }
  }

  let fire = select(0.0, 1.0, pcg_fire(x, y, P.step, P.seed) <= P.fire_rate);
  let base = (y * P.grid + x) * CN;
  for (var c : u32 = 0u; c < CH; c = c + 1u) {
    state_out[base + c] = state_in[base + c] + dx[c] * fire;
  }
  for (var c : u32 = CH; c < CN; c = c + 1u) {
    state_out[base + c] = 0.0;
  }
}
