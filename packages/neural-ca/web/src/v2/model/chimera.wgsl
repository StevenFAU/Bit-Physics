// Grow — Chimera (M3): the gated kernel's update with a rule per cell.
//
// The update below is the committed kernel's (packages/neural-ca/typescript/
// src/nca_inference.wgsl `update`) with two changes and nothing else:
//   * the weights it reads start at rule × stride (all rules share the
//     committed layout, so the offsets in Params are the same for each);
//   * each cell's rule is decided first, from the rule ids of the step's
//     input: a cell whose own alpha is above 0.1 keeps its rule; any other
//     cell takes the rule of the neighbour (3 × 3, inside the grid) with the
//     largest alpha — tissue that grows into empty agar brings its rule.
// With every cell on rule 0 the arithmetic is the gated update's, operation
// for operation (checked in Prove and v2-acceptance.mjs: Chimera's one-rule
// dish equals the gated dish bit for bit). The mask pass is the gated
// kernel's own pipeline, unchanged. The Params block is the gate's, with the
// rule stride in its last (padding) word.
//
// The rule ids' own passes (graft, paint, the overlay) are in chimera-rules.wgsl.

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
  stride : u32,
};

@group(0) @binding(0) var<uniform> P : Params;
@group(0) @binding(1) var<storage, read>       state_in  : array<f32>;
@group(0) @binding(2) var<storage, read_write> state_out : array<f32>;
@group(0) @binding(3) var<storage, read>       weights   : array<f32>;
@group(0) @binding(4) var<storage, read>       rule_in   : array<u32>;
@group(0) @binding(5) var<storage, read_write> rule_out  : array<u32>;

fn sample(x : i32, y : i32, c : u32) -> f32 {
  if (x < 0 || y < 0 || x >= i32(P.grid) || y >= i32(P.grid)) {
    return 0.0;
  }
  let idx = (u32(y) * P.grid + u32(x)) * CN + c;
  return state_in[idx];
}

fn pcg_fire(x : u32, y : u32, step : u32, seed : u32) -> f32 {
  var v : u32 = x * 1973u + y * 9277u + step * 26699u;
  v = v + seed * 2654435761u;
  v = v * 747796405u + 2891336453u;
  var word : u32 = ((v >> ((v >> 28u) + 4u)) ^ v) * 277803737u;
  word = (word >> 22u) ^ word;
  return f32(word) / 4294967296.0;
}

/** The cell's rule this step: its own while it is alive, else its strongest neighbour's. */
fn rule_of(x : i32, y : i32) -> u32 {
  let n = i32(P.grid);
  var r = rule_in[u32(y) * P.grid + u32(x)];
  var best = sample(x, y, 3u);
  if (best > 0.1) {
    return r;
  }
  for (var dy : i32 = -1; dy <= 1; dy = dy + 1) {
    for (var dx : i32 = -1; dx <= 1; dx = dx + 1) {
      let qx = x + dx;
      let qy = y + dy;
      if ((dx == 0 && dy == 0) || qx < 0 || qy < 0 || qx >= n || qy >= n) { continue; }
      let a = sample(qx, qy, 3u);
      if (a > best) {
        best = a;
        r = rule_in[u32(qy) * P.grid + u32(qx)];
      }
    }
  }
  return r;
}

@compute @workgroup_size(8, 8)
fn update(@builtin(global_invocation_id) gid : vec3<u32>) {
  let x = gid.x;
  let y = gid.y;
  if (x >= P.grid || y >= P.grid) { return; }
  let xi = i32(x);
  let yi = i32(y);

  let rule = rule_of(xi, yi);
  rule_out[y * P.grid + x] = rule;
  let wb = rule * P.stride;

  var perc : array<f32, 48>;
  for (var c : u32 = 0u; c < CN; c = c + 1u) {
    let v00 = sample(xi - 1, yi - 1, c); let v01 = sample(xi, yi - 1, c); let v02 = sample(xi + 1, yi - 1, c);
    let v10 = sample(xi - 1, yi,     c); let v11 = sample(xi, yi,     c); let v12 = sample(xi + 1, yi,     c);
    let v20 = sample(xi - 1, yi + 1, c); let v21 = sample(xi, yi + 1, c); let v22 = sample(xi + 1, yi + 1, c);
    let sx = (-v00 + v02 - 2.0 * v10 + 2.0 * v12 - v20 + v22) / 8.0;
    let sy = (-v00 - 2.0 * v01 - v02 + v20 + 2.0 * v21 + v22) / 8.0;
    perc[3u * c + 0u] = v11;
    perc[3u * c + 1u] = sx;
    perc[3u * c + 2u] = sy;
  }

  var dx : array<f32, 16>;
  for (var c : u32 = 0u; c < CN; c = c + 1u) { dx[c] = 0.0; }
  for (var o : u32 = 0u; o < HID; o = o + 1u) {
    var acc : f32 = weights[wb + P.b1_off + o];
    let row = wb + P.w1_off + o * PERC;
    for (var j : u32 = 0u; j < PERC; j = j + 1u) {
      acc = acc + weights[row + j] * perc[j];
    }
    let h = max(acc, 0.0);
    if (h != 0.0) {
      for (var c : u32 = 0u; c < CN; c = c + 1u) {
        dx[c] = dx[c] + weights[wb + P.w2_off + c * HID + o] * h;
      }
    }
  }

  let fire = select(0.0, 1.0, pcg_fire(x, y, P.step, P.seed) <= P.fire_rate);
  let base = (y * P.grid + x) * CN;
  for (var c : u32 = 0u; c < CN; c = c + 1u) {
    state_out[base + c] = state_in[base + c] + dx[c] * fire;
  }
}
