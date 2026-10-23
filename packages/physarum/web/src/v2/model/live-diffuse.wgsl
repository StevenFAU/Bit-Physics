// Slime Mould live solver: apply + diffuse + decay, fused (the gated `apply`
// then `diffuse`, same arithmetic, same summation order).
#import physarum/live-common

@group(1) @binding(0) var<storage, read> T_in: array<f32>;
@group(1) @binding(1) var<storage, read> dep_in: array<u32>;
@group(1) @binding(2) var<storage, read_write> T_out: array<f32>;
@group(1) @binding(3) var<storage, read_write> dep_clear: array<u32>;

fn mid(x: u32, y: u32) -> f32 {
  let idx = y * P.w + x;
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
  var sum: f32 = 0.0;
  sum = sum + mid(xm, ym);
  sum = sum + mid(xm, y);
  sum = sum + mid(xm, yp);
  sum = sum + mid(x, ym);
  sum = sum + mid(x, y);
  sum = sum + mid(x, yp);
  sum = sum + mid(xp, ym);
  sum = sum + mid(xp, y);
  sum = sum + mid(xp, yp);
  let idx = y * P.w + x;
  T_out[idx] = (sum / 9.0) * (1.0 - P.decay_alpha);
  dep_clear[idx] = 0u;
}
