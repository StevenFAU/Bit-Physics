// Slime Mould live solver: apply + diffuse + decay, fused (the gated `apply`
// then `diffuse`, same arithmetic, same summation order). Territories (bit 7)
// dispatch one z layer per colony's trail plane, each with its colony's fade.
#import physarum/live-common

@group(1) @binding(0) var<storage, read> T_in: array<f32>;
@group(1) @binding(1) var<storage, read> dep_in: array<u32>;
@group(1) @binding(2) var<storage, read_write> T_out: array<f32>;
@group(1) @binding(3) var<storage, read_write> dep_clear: array<u32>;

fn mid(base: u32, x: u32, y: u32) -> f32 {
  let idx = base + y * P.w + x;
  let d = f32(dep_in[idx]) / SCALE;
  return T_in[idx] + d;
}

@compute @workgroup_size(16, 16)
fn diffuse(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= P.w || gid.y >= P.h) { return; }
  let x = gid.x;
  let y = gid.y;
  let xm = select(x - 1u, P.w - 1u, x == 0u);
  let xp = select(x + 1u, 0u, x + 1u == P.w);
  let ym = select(y - 1u, P.h - 1u, y == 0u);
  let yp = select(y + 1u, 0u, y + 1u == P.h);
  let base = gid.z * P.w * P.h;
  var sum: f32 = 0.0;
  sum = sum + mid(base, xm, ym);
  sum = sum + mid(base, xm, y);
  sum = sum + mid(base, xm, yp);
  sum = sum + mid(base, x, ym);
  sum = sum + mid(base, x, y);
  sum = sum + mid(base, x, yp);
  sum = sum + mid(base, xp, ym);
  sum = sum + mid(base, xp, y);
  sum = sum + mid(base, xp, yp);
  let idx = base + y * P.w + x;
  let alpha = select(P.decay_alpha, P.sp[gid.z].w, (P.flags & 128u) != 0u);
  T_out[idx] = (sum / 9.0) * (1.0 - alpha);
  dep_clear[idx] = 0u;
}
