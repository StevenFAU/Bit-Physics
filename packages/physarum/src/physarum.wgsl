// Physarum transport network (Jones 2010) — Stack B WGSL.
//
// Ports physarum.reference: sense (3 dirs at L_sense) -> rotate (keep-centre
// tie-break, else left>=right) -> move (L_move) -> deposit -> diffuse (periodic
// 3x3 box blur) -> decay. Three dispatches per step:
//   agents : sense/rotate/move + atomic deposit into a u32 fixed-point buffer
//   apply  : T_mid = T_in + deposit/SCALE ; clear deposit
//   diffuse: T_out = boxblur(T_mid) * (1 - decay)
//
// The trail deposit is the sim's "atomic_ops": float atomic-add is non-
// associative (run-to-run non-deterministic), so we deposit as INTEGER
// fixed-point (atomic<u32>) — integer add is order-independent, giving the
// run-twice BYTE-IDENTICAL determinism the new-canonical discipline mandates.

const SCALE: f32 = 65536.0;

struct Params {
  n_agents: u32,
  w: u32,
  h: u32,
  _p0: u32,
  delta_phi: f32,   // radians
  l_sense: f32,
  l_move: f32,
  deposit: f32,
  decay_alpha: f32,
  _p1: f32, _p2: f32, _p3: f32,
};
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var<storage, read>        T_in: array<f32>;
@group(0) @binding(2) var<storage, read_write>  T_out: array<f32>;
@group(0) @binding(3) var<storage, read_write>  pos: array<f32>;   // 2 per agent
@group(0) @binding(4) var<storage, read_write>  head: array<f32>;  // 2 per agent
@group(0) @binding(5) var<storage, read_write>  dep: array<atomic<u32>>;

fn wrapi(v: i32, n: i32) -> i32 {
  let m = v % n;
  return select(m, m + n, m < 0);
}

fn sample(px: f32, py: f32) -> f32 {
  let w = i32(P.w); let h = i32(P.h);
  let cx = wrapi(i32(round(px)), w);
  let cy = wrapi(i32(round(py)), h);
  return T_in[u32(cx) * P.h + u32(cy)];
}

@compute @workgroup_size(64)
fn agents(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= P.n_agents) { return; }
  let p = vec2<f32>(pos[i * 2u], pos[i * 2u + 1u]);
  let hh = vec2<f32>(head[i * 2u], head[i * 2u + 1u]);

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

  let np = p + P.l_move * nh;
  pos[i * 2u] = np.x; pos[i * 2u + 1u] = np.y;
  head[i * 2u] = nh.x; head[i * 2u + 1u] = nh.y;

  let dx = u32(wrapi(i32(round(np.x)), i32(P.w)));
  let dy = u32(wrapi(i32(round(np.y)), i32(P.h)));
  let add = u32(round(P.deposit * SCALE));
  atomicAdd(&dep[dx * P.h + dy], add);
}

// apply: src trail T_in (= T_a) + deposit -> T_out (= T_b mid); clears deposit.
@compute @workgroup_size(8, 8)
fn apply(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= P.w || gid.y >= P.h) { return; }
  let idx = gid.x * P.h + gid.y;
  let d = f32(atomicLoad(&dep[idx])) / SCALE;
  T_out[idx] = T_in[idx] + d;
  atomicStore(&dep[idx], 0u);
}

// diffuse: blur(T_in = T_b mid) * (1 - decay) -> T_out (= T_a, the next trail).
// Distinct in/out buffers, so the neighbour reads never race the writes.
@compute @workgroup_size(8, 8)
fn diffuse(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= P.w || gid.y >= P.h) { return; }
  let w = i32(P.w); let h = i32(P.h);
  var sum: f32 = 0.0;
  for (var di = -1; di <= 1; di = di + 1) {
    for (var dj = -1; dj <= 1; dj = dj + 1) {
      let xx = u32(wrapi(i32(gid.x) + di, w));
      let yy = u32(wrapi(i32(gid.y) + dj, h));
      sum = sum + T_in[xx * P.h + yy];
    }
  }
  T_out[gid.x * P.h + gid.y] = (sum / 9.0) * (1.0 - P.decay_alpha);
}
