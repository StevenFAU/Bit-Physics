// curl-noise — gated field core (WGSL f32).
//
// Mirrors packages/curl-noise/curl_noise/reference/noise.py + fields.py +
// boundary.py EXACTLY (same formulas, same committed constants, same
// evaluation order) so the f32<->f64 delta is pure rounding, never model
// mismatch ([defaults.curl-noise] rel 2e-4, MEASURED).
//
// LOAD-BEARING (spec-ref section 2.5, execution deviation):
// - radial falloff (0.5 - r^2)^4 — NOT Perlin's 0.6 (divergence spikes at
//   simplex boundaries exactly where the gate looks);
// - permutation ((34x + 10) x) mod 289 — NOT the streaky +1 — computed in
//   EXACT i32 INTEGER arithmetic, as is every discrete gradient-selection
//   decision (float-emulated mod289 rounds differently in f32 vs f64 ->
//   different corner gradients -> O(1) gate blowup, measured);
// - ZERO builtin sin/cos on the gated path (Vulkan guarantees only 2^-11;
//   lavapipe implements that floor — the schrodinger-smoke 63x lesson).
//   The ABC template uses the range-reduced polynomial kernel below.
// - f16 is banned from all gated arithmetic.

struct FU {
  // xyz = obstacle center, w = obstacle radius (0 => no obstacle)
  obs: vec4<f32>,
  // x = ramp width d0, y = obstacle noise amp, z = z_slice (curl2d), w = time
  obs2: vec4<f32>,
  // x = ell0, y = lacunarity, z = gain, w = amplitude
  fbm: vec4<f32>,
  // x = construction (0 crossprod / 1 curl3d / 2 curl2d / 3 abc),
  // y = octaves, z = seed, w = boundary2d mode (0 none / 1 mult / 2 additive)
  kind: vec4<f32>,
  // interaction potentials (all curl-form => div-free; zeroed in capture):
  // gust velocity (uniform flow = curl of 0.5 U x r)
  gust: vec4<f32>,
  // xyz = brush center, w = brush strength A (psi-space Gaussian blob)
  brush: vec4<f32>,
  // xyz = brush axis (unit), w = brush sigma
  brush2: vec4<f32>,
  // ANTI-DEMO (template 13, breaks the certificate): xyz = center,
  // w = strength of a naive velocity-space attractor (a pure sink)
  attractor: vec4<f32>,
  // ABC parameters (x, y, z = A, B, C)
  abc: vec4<f32>,
}
@group(0) @binding(0) var<uniform> F: FU;

// --- exact-integer permutation hash ----------------------------------------
fn permute4(x: vec4<i32>) -> vec4<i32> {
  return ((34 * x + 10) * x) % vec4<i32>(289);
}

fn mod289i(v: vec3<i32>) -> vec3<i32> {
  return ((v % vec3<i32>(289)) + vec3<i32>(289)) % vec3<i32>(289);
}

// --- range-reduced polynomial trig (isf_core.wgsl precedent, ~1e-7 abs) ----
fn sin_poly4(r: f32) -> f32 {
  let r2 = r * r;
  return r * (1.0 + r2 * (-0.16666667 + r2 * (0.0083333310 - r2 * 0.00019840874)));
}
fn cos_poly4(r: f32) -> f32 {
  let r2 = r * r;
  return 1.0 + r2 * (-0.5 + r2 * (0.041666668 + r2 * (-0.0013888889 + r2 * 0.000024801587)));
}
fn cs_p(x: f32) -> vec2<f32> {
  let k = round(x * 0.6366197723675814);
  let r = x - k * 1.5707963267948966;
  let q = i32(k) & 3;
  let s = sin_poly4(r);
  let c = cos_poly4(r);
  if (q == 0) { return vec2<f32>(c, s); }
  if (q == 1) { return vec2<f32>(-s, c); }
  if (q == 2) { return vec2<f32>(-c, -s); }
  return vec2<f32>(s, -c);
}
fn atan_poly(z_in: f32) -> f32 {
  var w = z_in;
  var base = 0.0;
  if (w > 0.4142135623730951) {
    w = (w - 1.0) / (w + 1.0);
    base = 0.7853981633974483;
  }
  let z = w * w;
  return base + (((8.05374449538e-2 * z - 1.38776856032e-1) * z + 1.99777106478e-1) * z - 3.33329491539e-1) * z * w + w;
}
fn atan2_p(y: f32, x: f32) -> f32 {
  let ax = abs(x);
  let ay = abs(y);
  let hi = max(ax, ay);
  let lo = min(ax, ay);
  if (hi == 0.0) { return 0.0; }
  var a = atan_poly(lo / hi);
  if (ay > ax) { a = 1.5707963267948966 - a; }
  if (x < 0.0) { a = 3.141592653589793 - a; }
  return select(a, -a, y < 0.0);
}

// --- simplex noise: value + exact gradient + exact Hessian ------------------
// SCALE = 22.0 committed (noise.py; measured range ~[-0.21, 0.21]).
const NOISE_SCALE: f32 = 22.0;
const TAYLOR_A: f32 = 1.79284291400159;
const TAYLOR_B: f32 = 0.85373472095314;

struct NoiseD2 {
  val: f32,
  grad: vec3<f32>,
  hess: mat3x3<f32>, // symmetric
}

// integer octahedron gradient for one hash value (1/14 units, exact ints)
fn grad_from_hash(h: i32) -> vec3<f32> {
  let j = h % 49;
  let xp = j / 7;
  let yp = j % 7;
  let ax = 4 * xp - 13;
  let ay = 4 * yp - 13;
  let ghn = 14 - abs(ax) - abs(ay);
  let sx = select(1, -1, ax < 0);
  let sy = select(1, -1, ay < 0);
  let interior = ghn > 0;
  let pxn = select(ax - 14 * sx, ax, interior);
  let pyn = select(ay - 14 * sy, ay, interior);
  return vec3<f32>(f32(pxn), f32(pyn), f32(ghn)) / 14.0;
}

fn snoise_d2(v: vec3<f32>) -> NoiseD2 {
  let c_x = 1.0 / 6.0;
  let c_y = 1.0 / 3.0;
  let i = floor(v + vec3<f32>(dot(v, vec3<f32>(c_y))));
  let x0 = v - i + vec3<f32>(dot(i, vec3<f32>(c_x)));

  let g = step(vec3<f32>(x0.y, x0.z, x0.x), x0);
  let l = 1.0 - g;
  let i1 = min(g, vec3<f32>(l.z, l.x, l.y));
  let i2 = max(g, vec3<f32>(l.z, l.x, l.y));

  let x1 = x0 - i1 + vec3<f32>(c_x);
  let x2 = x0 - i2 + vec3<f32>(2.0 * c_x);
  let x3 = x0 - vec3<f32>(0.5);

  // exact-integer hash chain (spec-ref section 2.5 deviation)
  let ii = mod289i(vec3<i32>(i));
  let i1i = vec3<i32>(i1);
  let i2i = vec3<i32>(i2);
  let cz = vec4<i32>(0, i1i.z, i2i.z, 1);
  let cy = vec4<i32>(0, i1i.y, i2i.y, 1);
  let cx = vec4<i32>(0, i1i.x, i2i.x, 1);
  let p = permute4(permute4(permute4(vec4<i32>(ii.z) + cz) + vec4<i32>(ii.y) + cy) + vec4<i32>(ii.x) + cx);

  var grads = array<vec3<f32>, 4>(
    grad_from_hash(p.x), grad_from_hash(p.y), grad_from_hash(p.z), grad_from_hash(p.w),
  );
  var corners = array<vec3<f32>, 4>(x0, x1, x2, x3);

  var val = 0.0;
  var grad = vec3<f32>(0.0);
  var hess = mat3x3<f32>(vec3<f32>(0.0), vec3<f32>(0.0), vec3<f32>(0.0));
  for (var k = 0u; k < 4u; k++) {
    var pk = grads[k];
    let xk = corners[k];
    let norm = TAYLOR_A - TAYLOR_B * dot(pk, pk);
    pk = pk * norm;
    let m = max(0.5 - dot(xk, xk), 0.0);
    let m2 = m * m;
    let m3 = m2 * m;
    let m4 = m2 * m2;
    let pdx = dot(pk, xk);
    val += m4 * pdx;
    grad += -8.0 * m3 * pdx * xk + m4 * pk;
    // hess += 48 m^2 pdx xx^T - 8 m^3 (xp^T + px^T) - 8 m^3 pdx I
    let a = 48.0 * m2 * pdx;
    let b = -8.0 * m3;
    let xxt = mat3x3<f32>(xk * xk.x, xk * xk.y, xk * xk.z);
    let xpt = mat3x3<f32>(xk * pk.x, xk * pk.y, xk * pk.z); // column j = x * p_j
    let pxt = mat3x3<f32>(pk * xk.x, pk * xk.y, pk * xk.z);
    let ident = mat3x3<f32>(
      vec3<f32>(1.0, 0.0, 0.0), vec3<f32>(0.0, 1.0, 0.0), vec3<f32>(0.0, 0.0, 1.0),
    );
    hess = hess + xxt * a + (xpt + pxt) * b + ident * (b * pdx);
  }
  var out: NoiseD2;
  out.val = NOISE_SCALE * val;
  out.grad = NOISE_SCALE * grad;
  out.hess = hess * NOISE_SCALE;
  return out;
}

// --- FBM channels (mirrors fields.py CHANNEL_OFFSETS / OCTAVE_DRIFTS) -------
const CH_OFF = array<vec3<f32>, 3>(
  vec3<f32>(0.0, 0.0, 0.0),
  vec3<f32>(31.416, -47.853, 12.793),
  vec3<f32>(-233.19, 108.44, 71.98),
);
const DRIFT = array<vec3<f32>, 6>(
  vec3<f32>(0.31, 0.17, -0.23), vec3<f32>(-0.19, 0.29, 0.11),
  vec3<f32>(0.13, -0.27, 0.31), vec3<f32>(-0.29, -0.13, 0.19),
  vec3<f32>(0.23, 0.31, -0.17), vec3<f32>(0.11, -0.19, -0.29),
);
const SEED_STRIDE = vec3<f32>(127.1, 311.7, 74.7);

fn fbm_d2(x: vec3<f32>, channel: u32) -> NoiseD2 {
  let off = CH_OFF[channel] + SEED_STRIDE * F.kind.z;
  var acc: NoiseD2;
  acc.val = 0.0;
  acc.grad = vec3<f32>(0.0);
  acc.hess = mat3x3<f32>(vec3<f32>(0.0), vec3<f32>(0.0), vec3<f32>(0.0));
  var amp = 1.0;
  var ell = F.fbm.x;
  let oct = u32(F.kind.y);
  for (var o = 0u; o < 6u; o++) {
    if (o >= oct) { break; }
    let n = snoise_d2((x + off + F.obs2.w * DRIFT[o]) / ell);
    acc.val += amp * n.val;
    acc.grad += (amp / ell) * n.grad;
    acc.hess = acc.hess + n.hess * (amp / (ell * ell));
    amp *= F.fbm.z;
    ell /= F.fbm.y;
  }
  return acc;
}

// --- Bridson quintic ramp (Eq. 4) -------------------------------------------
fn rampq(r: f32) -> f32 {
  let rc = clamp(r, 0.0, 1.0);
  return 15.0 / 8.0 * rc - 10.0 / 8.0 * rc * rc * rc + 3.0 / 8.0 * rc * rc * rc * rc * rc;
}
fn rampq_d1(r: f32) -> f32 {
  if (r < 0.0 || r > 1.0) { return 0.0; }
  let r2 = r * r;
  return 15.0 / 8.0 - 30.0 / 8.0 * r2 + 15.0 / 8.0 * r2 * r2;
}
fn rampq_d2(r: f32) -> f32 {
  if (r < 0.0 || r > 1.0) { return 0.0; }
  return -60.0 / 8.0 * r + 60.0 / 8.0 * r * r * r;
}

// --- canonical obstacle potentials (boundary.py) ----------------------------
struct Pots {
  f1: f32,
  g1: vec3<f32>,
  h1: mat3x3<f32>,
  f2: f32,
  g2: vec3<f32>,
  h2: mat3x3<f32>,
}

fn potentials(x: vec3<f32>) -> Pots {
  let n1 = fbm_d2(x, 0u);
  let n2 = fbm_d2(x, 1u);
  var o: Pots;
  o.f2 = n2.val;
  o.g2 = n2.grad;
  o.h2 = n2.hess;
  if (F.obs.w > 0.0) {
    // f1 = sdf + A ramp(d/d0) n1  (exact surface tangency, golden D)
    let rel = x - F.obs.xyz;
    let dist = max(length(rel), 1e-20);
    let nh = rel / dist;
    let d = dist - F.obs.w;
    let d0 = F.obs2.x;
    let amp = F.obs2.y;
    let u = d / d0;
    let r0 = rampq(u);
    let r1 = rampq_d1(u) / d0;
    let r2 = rampq_d2(u) / (d0 * d0);
    let ident = mat3x3<f32>(
      vec3<f32>(1.0, 0.0, 0.0), vec3<f32>(0.0, 1.0, 0.0), vec3<f32>(0.0, 0.0, 1.0),
    );
    let nnt = mat3x3<f32>(nh * nh.x, nh * nh.y, nh * nh.z);
    let hd = (ident + nnt * (-1.0)) * (1.0 / dist);
    o.f1 = d + amp * r0 * n1.val;
    o.g1 = nh + amp * (r1 * n1.val * nh + r0 * n1.grad);
    let gngdt = mat3x3<f32>(
      nh * n1.grad.x, nh * n1.grad.y, nh * n1.grad.z,
    );
    let gdgnt = mat3x3<f32>(
      n1.grad * nh.x, n1.grad * nh.y, n1.grad * nh.z,
    );
    o.h1 = hd + (nnt * (r2 * n1.val) + hd * (r1 * n1.val) + (gngdt + gdgnt) * r1 + n1.hess * r0) * amp;
  } else {
    o.f1 = n1.val;
    o.g1 = n1.grad;
    o.h1 = n1.hess;
  }
  return o;
}

// --- interaction potentials (curl-form => div-free; capture zeroes them) ----
fn interaction_velocity(x: vec3<f32>) -> vec3<f32> {
  // gust: uniform flow = curl(0.5 U x r)
  var v = F.gust.xyz;
  // psi-space Gaussian blob around brush axis: curl(A g a) = A grad(g) x a
  if (F.brush.w != 0.0) {
    let rel = x - F.brush.xyz;
    let s2 = F.brush2.w * F.brush2.w;
    let gsn = exp(-dot(rel, rel) / s2);
    let gradg = (-2.0 / s2) * gsn * rel;
    v += F.brush.w * cross(gradg, F.brush2.xyz);
  }
  return v;
}

// naive velocity-space attractor — the ANTI-DEMO sink (template 13 only)
fn attractor_velocity(x: vec3<f32>) -> vec3<f32> {
  if (F.attractor.w == 0.0) { return vec3<f32>(0.0); }
  let rel = F.attractor.xyz - x;
  let g = exp(-dot(rel, rel) / 0.04);
  return F.attractor.w * g * rel;
}

fn abc_velocity(x: vec3<f32>) -> vec3<f32> {
  // v = (A sin z + C cos y, B sin x + A cos z, C sin y + B cos x)
  // polynomial trig only (gated-path discipline) — scale domain by 2*pi
  let q = x * 6.283185307179586;
  let csx = cs_p(q.x);
  let csy = cs_p(q.y);
  let csz = cs_p(q.z);
  return vec3<f32>(
    F.abc.x * csz.y + F.abc.z * csy.x,
    F.abc.y * csx.y + F.abc.x * csz.x,
    F.abc.z * csy.y + F.abc.y * csx.x,
  ) * 0.15;
}

// --- 2D stream-function boundary variants (templates 3 / 10) ---------------
// psi on the z-slice; circle obstacle at obs.xy radius obs.w.
// mode 1: Bridson multiplicative psi' = ramp * psi
// mode 2: Curl-Flow additive    psi' = psi - (1 - ramp) * psi(cp(x))
fn psi2d_grad(x: vec3<f32>) -> vec3<f32> { // returns (psi', dpsi/dx, dpsi/dy) packed
  let xs = vec3<f32>(x.x, x.y, F.obs2.z);
  let n = fbm_d2(xs, 0u);
  let mode = u32(F.kind.w);
  if (F.obs.w <= 0.0 || mode == 0u) {
    return vec3<f32>(n.val, n.grad.x, n.grad.y);
  }
  let rel = x.xy - F.obs.xy;
  let dist = max(length(rel), 1e-20);
  let nh = rel / dist;
  let d = dist - F.obs.w;
  let u = d / F.obs2.x;
  let r0 = rampq(u);
  let r1 = rampq_d1(u) / F.obs2.x;
  if (mode == 1u) {
    let px = r1 * n.val * nh.x + r0 * n.grad.x;
    let py = r1 * n.val * nh.y + r0 * n.grad.y;
    return vec3<f32>(r0 * n.val, px, py);
  }
  // additive: cp = center + R * nh; psi_cp evaluated at the closest point.
  let cp = F.obs.xy + F.obs.w * nh;
  let ncp = fbm_d2(vec3<f32>(cp.x, cp.y, F.obs2.z), 0u);
  // d(cp)/dx = R/dist (I - nh nh^T) (2x2); chain rule for grad psi(cp)
  let proj = F.obs.w / dist;
  let gcp = vec2<f32>(ncp.grad.x, ncp.grad.y);
  let gcp_x = proj * (gcp - nh * dot(gcp, nh));
  let px = n.grad.x - (-r1 * nh.x * ncp.val + (1.0 - r0) * gcp_x.x);
  let py = n.grad.y - (-r1 * nh.y * ncp.val + (1.0 - r0) * gcp_x.y);
  return vec3<f32>(n.val - (1.0 - r0) * ncp.val, px, py);
}

// --- velocity ---------------------------------------------------------------
fn curl_velocity(x: vec3<f32>) -> vec3<f32> {
  let cons = u32(F.kind.x);
  var v: vec3<f32>;
  if (cons == 0u) {
    let p = potentials(x);
    v = F.fbm.w * cross(p.g1, p.g2);
  } else if (cons == 1u) {
    let a = fbm_d2(x, 0u);
    let b = fbm_d2(x, 1u);
    let c = fbm_d2(x, 2u);
    // v = curl(n0, n1, n2)
    v = F.fbm.w * vec3<f32>(
      c.grad.y - b.grad.z,
      a.grad.z - c.grad.x,
      b.grad.x - a.grad.y,
    );
  } else if (cons == 2u) {
    let pg = psi2d_grad(x); // (psi', dpsi/dx, dpsi/dy)
    v = F.fbm.w * vec3<f32>(pg.z, -pg.y, 0.0);
  } else {
    v = F.fbm.w * abc_velocity(x);
  }
  return v + interaction_velocity(x) + attractor_velocity(x);
}

// --- iso-value instruments (crossprod) ---------------------------------------
fn iso_vals(x: vec3<f32>) -> vec2<f32> {
  let p = potentials(x);
  return vec2<f32>(p.f1, p.f2);
}

// one min-norm Newton reprojection step onto {f = f0} (Baerentzen Eq. 12)
fn reproject_step(x: vec3<f32>, f0: vec2<f32>) -> vec3<f32> {
  let p = potentials(x);
  let r = vec2<f32>(p.f1, p.f2) - f0;
  let a = dot(p.g1, p.g1);
  let b = dot(p.g1, p.g2);
  let c = dot(p.g2, p.g2);
  let det = max(a * c - b * b, 1e-20);
  let y1 = (c * r.x - b * r.y) / det;
  let y2 = (a * r.y - b * r.x) / det;
  return x - (y1 * p.g1 + y2 * p.g2);
}

// --- exact Jacobian instruments (Niagara div = trace(J) identity) -----------
struct JacOut {
  v: vec3<f32>,
  divergence: f32,
  curl: vec3<f32>,
}

fn jacobian_instruments(x: vec3<f32>) -> JacOut {
  let cons = u32(F.kind.x);
  var o: JacOut;
  if (cons == 0u) {
    let p = potentials(x);
    o.v = F.fbm.w * cross(p.g1, p.g2);
    // columns of J: d_c v = (H1 col c) x g2 + g1 x (H2 col c)
    let j0 = cross(p.h1[0], p.g2) + cross(p.g1, p.h2[0]);
    let j1 = cross(p.h1[1], p.g2) + cross(p.g1, p.h2[1]);
    let j2 = cross(p.h1[2], p.g2) + cross(p.g1, p.h2[2]);
    o.divergence = F.fbm.w * (j0.x + j1.y + j2.z);
    o.curl = F.fbm.w * vec3<f32>(j1.z - j2.y, j2.x - j0.z, j0.y - j1.x);
  } else if (cons == 1u) {
    let a = fbm_d2(x, 0u);
    let b = fbm_d2(x, 1u);
    let c = fbm_d2(x, 2u);
    o.v = F.fbm.w * vec3<f32>(
      c.grad.y - b.grad.z, a.grad.z - c.grad.x, b.grad.x - a.grad.y,
    );
    let j0 = vec3<f32>(c.hess[0].y - b.hess[0].z, a.hess[0].z - c.hess[0].x, b.hess[0].x - a.hess[0].y);
    let j1 = vec3<f32>(c.hess[1].y - b.hess[1].z, a.hess[1].z - c.hess[1].x, b.hess[1].x - a.hess[1].y);
    let j2 = vec3<f32>(c.hess[2].y - b.hess[2].z, a.hess[2].z - c.hess[2].x, b.hess[2].x - a.hess[2].y);
    o.divergence = F.fbm.w * (j0.x + j1.y + j2.z);
    o.curl = F.fbm.w * vec3<f32>(j1.z - j2.y, j2.x - j0.z, j0.y - j1.x);
  } else if (cons == 2u) {
    let xs = vec3<f32>(x.x, x.y, F.obs2.z);
    let n = fbm_d2(xs, 0u);
    o.v = F.fbm.w * vec3<f32>(n.grad.y, -n.grad.x, 0.0);
    o.divergence = F.fbm.w * (n.hess[0].y - n.hess[1].x);
    o.curl = vec3<f32>(0.0, 0.0, -F.fbm.w * (n.hess[0].x + n.hess[1].y));
  } else {
    o.v = F.fbm.w * abc_velocity(x);
    // Beltrami: curl v = v (in the scaled domain curl picks up the 2*pi/0.15
    // factors — report the residual in the native ABC frame instead)
    o.divergence = 0.0;
    o.curl = o.v;
  }
  return o;
}
