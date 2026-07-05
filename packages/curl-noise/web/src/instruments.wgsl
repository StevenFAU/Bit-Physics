// curl-noise — PROVE-layer instruments compute pass (web spec § 4).
//
// Evaluates every live instrument at a probe set (volume probes + sphere-
// surface probes), read back at ~1 Hz. Concatenated AFTER field.wgsl.
// Every quantity is f32 and labeled with its f32 floor in the UI; the
// machine-exact f64 story lives in the committed goldens + the live-f64
// web gate (verify.py).

struct Probe {
  pos: vec3<f32>,
  kind: f32, // 0 = volume, 1 = obstacle surface (normal derived from FU)
}

struct InstOut {
  speed: f32,
  div_trace: f32,   // exact-Jacobian trace (Niagara identity)
  fd_div: f32,      // independent-stencil FD probe (truncation-dominated)
  conf1: f32,       // v . grad f1   (golden F part 1)
  conf2: f32,       // v . grad f2
  clebsch: f32,     // (f1 grad f2) . v  (golden F part 2)
  helicity: f32,    // v . (curl v) — honest, generically NONZERO
  iso_resid: f32,   // volume probes: ||f(x) - f(x_anchor)|| after reproject
  vn: f32,          // surface probes: v . n
  beltrami: f32,    // ABC: |fd_curl - 2*pi*v| (scaled-frame Beltrami)
  vort: f32,        // |curl v|
  pad: f32,
}

@group(0) @binding(1) var<storage, read> probes: array<Probe>;
@group(0) @binding(2) var<storage, read_write> inst_out: array<InstOut>;

const FD_G: f32 = 0.02; // f32 stencil: truncation-dominated by design

fn fd_divergence(x: vec3<f32>) -> f32 {
  var acc = 0.0;
  let ex = vec3<f32>(FD_G, 0.0, 0.0);
  let ey = vec3<f32>(0.0, FD_G, 0.0);
  let ez = vec3<f32>(0.0, 0.0, FD_G);
  acc += (curl_velocity(x + ex).x - curl_velocity(x - ex).x);
  acc += (curl_velocity(x + ey).y - curl_velocity(x - ey).y);
  acc += (curl_velocity(x + ez).z - curl_velocity(x - ez).z);
  return acc / (2.0 * FD_G);
}

fn fd_curl(x: vec3<f32>) -> vec3<f32> {
  let ex = vec3<f32>(FD_G, 0.0, 0.0);
  let ey = vec3<f32>(0.0, FD_G, 0.0);
  let ez = vec3<f32>(0.0, 0.0, FD_G);
  let dvy = (curl_velocity(x + ey) - curl_velocity(x - ey)) / (2.0 * FD_G);
  let dvz = (curl_velocity(x + ez) - curl_velocity(x - ez)) / (2.0 * FD_G);
  let dvx = (curl_velocity(x + ex) - curl_velocity(x - ex)) / (2.0 * FD_G);
  return vec3<f32>(dvy.z - dvz.y, dvz.x - dvx.z, dvx.y - dvy.x);
}

@compute @workgroup_size(64)
fn instruments(@builtin(global_invocation_id) g: vec3<u32>) {
  let n = arrayLength(&probes);
  if (g.x >= n) { return; }
  let pr = probes[g.x];
  var x = pr.pos;
  var o: InstOut;

  let jac = jacobian_instruments(x);
  o.speed = length(jac.v);
  o.div_trace = jac.divergence;
  o.fd_div = fd_divergence(x);
  o.vort = length(jac.curl);

  let cons = u32(F.kind.x);
  if (cons == 0u) {
    let p = potentials(x);
    let v = F.fbm.w * cross(p.g1, p.g2);
    o.conf1 = dot(v, p.g1);
    o.conf2 = dot(v, p.g2);
    o.clebsch = dot(p.f1 * p.g2, v);
    o.helicity = dot(jac.v, jac.curl);
    // distance-to-manifold after one Newton step from a kicked position —
    // the live reprojection demo at probe scale
    let kick = x + vec3<f32>(7e-4, -5e-4, 6e-4);
    let f0 = vec2<f32>(p.f1, p.f2);
    let back = reproject_step(kick, f0);
    o.iso_resid = length(iso_vals(back) - f0);
  } else {
    o.conf1 = 0.0;
    o.conf2 = 0.0;
    o.clebsch = 0.0;
    o.helicity = dot(jac.v, jac.curl);
    o.iso_resid = 0.0;
  }

  if (cons == 3u) {
    let fc = fd_curl(x);
    o.beltrami = length(fc - 6.283185307179586 * jac.v);
  } else {
    o.beltrami = 0.0;
  }

  if (pr.kind > 0.5 && F.obs.w > 0.0) {
    let nh = normalize(pr.pos - F.obs.xyz);
    let surf = F.obs.xyz + F.obs.w * nh;
    o.vn = dot(curl_velocity(surf), nh);
  } else {
    o.vn = 0.0;
  }
  o.pad = 0.0;
  inst_out[g.x] = o;
}
