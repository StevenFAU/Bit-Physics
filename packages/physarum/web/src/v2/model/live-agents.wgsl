// Slime Mould live solver: sense → rotate → move → deposit (the gated `agents`).
#import physarum/live-common

@group(1) @binding(0) var<storage, read> T_in: array<f32>;
@group(1) @binding(1) var<storage, read_write> agents: array<vec4<f32>>;
@group(1) @binding(2) var<storage, read_write> dep: array<atomic<u32>>;

fn sample(px: f32, py: f32) -> f32 {
  let w = i32(P.w); let h = i32(P.h);
  let cx = wrapi(i32(round(px)), w);
  let cy = wrapi(i32(round(py)), h);
  return T_in[u32(cy) * P.w + u32(cx)];
}

@compute @workgroup_size(256)
fn agents_step(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= P.n_agents) { return; }
  let a = agents[i];
  let p = a.xy;
  let hh = a.zw;

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
  if ((P.flags & 2u) != 0u && cr < mx) {
    nh = nh * inverseSqrt(dot(nh, nh));
  }

  var np = p + P.l_move * nh;
  if ((P.flags & 1u) != 0u) {
    let fw = f32(P.w); let fh = f32(P.h);
    if (np.x < 0.0) { np.x = np.x + fw; } else if (np.x >= fw) { np.x = np.x - fw; }
    if (np.y < 0.0) { np.y = np.y + fh; } else if (np.y >= fh) { np.y = np.y - fh; }
  }
  agents[i] = vec4<f32>(np, nh);

  let dx = u32(wrapi(i32(round(np.x)), i32(P.w)));
  let dy = u32(wrapi(i32(round(np.y)), i32(P.h)));
  let add = u32(round(P.deposit * SCALE));
  atomicAdd(&dep[dy * P.w + dx], add);
}
