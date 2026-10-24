// Slime Mould live solver: sense → rotate → move → deposit (the gated `agents`).
#import physarum/live-common
#import bp/hash

@group(1) @binding(0) var<storage, read> T_in: array<f32>;
@group(1) @binding(1) var<storage, read_write> agents: array<vec4<f32>>;
@group(1) @binding(2) var<storage, read_write> dep: array<atomic<u32>>;
@group(1) @binding(3) var<storage, read> env: array<f32>;
@group(1) @binding(4) var<storage, read> cell_bits: array<u32>;    // walls, then food (+ halo)
@group(1) @binding(5) var<storage, read_write> awake: array<atomic<u32>>;  // [0] agents awake

fn cell(px: f32, py: f32) -> u32 {
  let w = i32(P.w); let h = i32(P.h);
  let cx = wrapi(i32(round(px)), w);
  let cy = wrapi(i32(round(py)), h);
  return u32(cy) * P.w + u32(cx);
}

fn sample(px: f32, py: f32) -> f32 {
  let idx = cell(px, py);
  var v = T_in[idx];
  // scenes only: what the agents smell is the trail plus the environment
  if ((P.flags & 4u) != 0u) { v = v + env[idx]; }
  return v;
}

@compute @workgroup_size(256)
fn agents_step(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= P.n_agents) { return; }
  let a = agents[i];
  let p = a.xy;
  var hh = a.zw;
  if ((P.flags & 16u) != 0u && hh.x > 1.5) {
    // dormant until the colony's trail reaches it (never on or beside food):
    // no move, no deposit
    let c = cell(p.x, p.y);
    let food = (cell_bits[P.bits_words + (c >> 5u)] & (1u << (c & 31u))) != 0u;
    if (T_in[c] < P.wake || food) { return; }
    hh = vec2<f32>(hh.x - 3.0, hh.y);
    atomicAdd(&awake[0], 1u);
  }

  let cphi = cos(P.delta_phi); let sphi = sin(P.delta_phi);
  let hl = vec2<f32>(hh.x * cphi - hh.y * sphi, hh.x * sphi + hh.y * cphi);   // +phi
  let hr = vec2<f32>(hh.x * cphi + hh.y * sphi, -hh.x * sphi + hh.y * cphi);  // -phi

  let lr = sample(p.x + P.l_sense * hl.x, p.y + P.l_sense * hl.y);
  let cr = sample(p.x + P.l_sense * hh.x, p.y + P.l_sense * hh.y);
  let rr = sample(p.x + P.l_sense * hr.x, p.y + P.l_sense * hr.y);

  let mx = max(max(lr, cr), rr);
  var nh = hh;
  if (cr >= mx) { nh = hh; }
  else if (lr >= rr) { nh = hl; }
  else { nh = hr; }
  if ((P.flags & 32u) != 0u) {
    // Jones's stochastic rule: centre weakest ⇒ either side at random; and a
    // small chance of a random turn. Dice from the agent's own state.
    let h1 = bp_hash3(bitcast<u32>(p.x), bitcast<u32>(p.y), bitcast<u32>(hh.x));
    let u = bp_unit(h1);
    let v = bp_unit(bp_hash3(h1, bitcast<u32>(hh.y), 0x9e3779b9u));
    if (cr < lr && cr < rr) { nh = select(hr, hl, u < 0.5); }
    if (v < P.jitter) { nh = select(hr, hl, u < 0.5); }
  }
  if ((P.flags & 2u) != 0u && cr < mx) {
    nh = nh * inverseSqrt(dot(nh, nh));
  }

  var np = p + P.l_move * nh;
  if ((P.flags & 1u) != 0u) {
    let fw = f32(P.w); let fh = f32(P.h);
    if (np.x < 0.0) { np.x = np.x + fw; } else if (np.x >= fw) { np.x = np.x - fw; }
    if (np.y < 0.0) { np.y = np.y + fh; } else if (np.y >= fh) { np.y = np.y - fh; }
  }
  // solid walls: a step into a wall cell is refused and the agent turns back
  if ((P.flags & 8u) != 0u && env[cell(np.x, np.y)] <= WALL) {
    np = p;
    nh = -nh;
  }
  agents[i] = vec4<f32>(np, nh);

  let dx = u32(wrapi(i32(round(np.x)), i32(P.w)));
  let dy = u32(wrapi(i32(round(np.y)), i32(P.h)));
  let add = u32(round(P.deposit * SCALE));
  atomicAdd(&dep[dy * P.w + dx], add);
}
