// X-A attractor family — classical RK4 fixed-step integrator (display kernel).
//
// RATIFIED boundary-crossing artifact (feature-expansion-spec § 3.3 item 9,
// operator-ratified 2026-07-03): a field_id-switched port of
// strange_attractors.reference.{rossler,aizawa,sprott} through the SAME RK4
// scheme as the committed packages/strange-attractors/src/lorenz_rk4.wgsl.
// It integrates into DISPLAY buffers only (liveTraj/ghostTraj): the canonical
// capture path stays pinned to the untouched Lorenz kernel + `traj` buffer
// (verification-demo-spec § 7.6). Each system's own gated capture lives in
// the backend (captures/strange-attractors-ref/<name>-trajectory-seed42-*).
//
// Parameter slots p0..p5 are registry-ordered per system (web/src/attractors.ts):
//   field_id 1 — Rössler:   p0=a, p1=b, p2=c
//   field_id 2 — Aizawa:    p0=a, p1=b, p2=c, p3=d, p4=e, p5=f
//   field_id 3 — Sprott-A:  (no parameters)
//   field_id 4 — Thomas:    p0=b                       (X-B, ratified 2026-07-03)
//   field_id 5 — Halvorsen: p0=a                       (X-B)
//   field_id 6 — Dadras:    p0=p, p1=o, p2=r, p3=c, p4=e  (X-C)
//   field_id 7 — Chen:      p0=a, p1=b, p2=c           (X-C)
//   field_id 8 — Four-wing: p0=a, p1=b, p2=c, p3=d, p4=e, p5=f  (X-C)
//
// f32 on a chaotic system diverges pointwise from the f64 reference within a
// few Lyapunov times — same posture as the Lorenz web build (structural, not
// pointwise).

struct Params {
  n_steps: u32,
  field_id: u32,
  p0: f32,
  p1: f32,
  p2: f32,
  p3: f32,
  p4: f32,
  p5: f32,
  dt: f32,
  x0: f32,
  y0: f32,
  z0: f32,
};
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var<storage, read_write> traj: array<f32>;  // (n_steps+1) * 3

// Rössler 1976 Eq. (1): a=p0, b=p1, c=p2
fn field_rossler(s: vec3<f32>) -> vec3<f32> {
  return vec3<f32>(
    -s.y - s.z,
    s.x + P.p0 * s.y,
    P.p1 + s.z * (s.x - P.p2),
  );
}

// Aizawa 1982 (Sprott 2003 catalog form): a..f = p0..p5
fn field_aizawa(s: vec3<f32>) -> vec3<f32> {
  let r2 = s.x * s.x + s.y * s.y;
  return vec3<f32>(
    (s.z - P.p1) * s.x - P.p3 * s.y,
    P.p3 * s.x + (s.z - P.p1) * s.y,
    P.p2 + P.p0 * s.z - (s.z * s.z * s.z) / 3.0 - r2 * (1.0 + P.p4 * s.z) + P.p5 * s.z * s.x * s.x * s.x,
  );
}

// Sprott 1994 case A (conservative; no parameters). The dx/dt line carries
// an inline tag so the EXPLAIN anchor is unique (bare `s.y,` also appears
// in the parameterized fields above).
fn field_sprott_a(s: vec3<f32>) -> vec3<f32> {
  return vec3<f32>(
    s.y,  // sprott-a: dx/dt
    -s.x + s.y * s.z,
    1.0 - s.y * s.y,
  );
}

// Thomas 1999 cyclically symmetric: b=p0
fn field_thomas(s: vec3<f32>) -> vec3<f32> {
  return vec3<f32>(
    sin(s.y) - P.p0 * s.x,
    sin(s.z) - P.p0 * s.y,
    sin(s.x) - P.p0 * s.z,
  );
}

// Halvorsen (Sprott 2003 catalog) cyclically symmetric: a=p0
fn field_halvorsen(s: vec3<f32>) -> vec3<f32> {
  return vec3<f32>(
    -P.p0 * s.x - 4.0 * s.y - 4.0 * s.z - s.y * s.y,
    -P.p0 * s.y - 4.0 * s.z - 4.0 * s.x - s.z * s.z,
    -P.p0 * s.z - 4.0 * s.x - 4.0 * s.y - s.x * s.x,
  );
}

// Dadras–Momeni 2009: p=p0, o=p1, r=p2, c=p3, e=p4
fn field_dadras(s: vec3<f32>) -> vec3<f32> {
  return vec3<f32>(
    s.y - P.p0 * s.x + P.p1 * s.y * s.z,
    P.p2 * s.y - s.x * s.z + s.z,
    P.p3 * s.x * s.y - P.p4 * s.z,
  );
}

// Chen–Ueta 1999: a=p0, b=p1, c=p2
fn field_chen(s: vec3<f32>) -> vec3<f32> {
  return vec3<f32>(
    P.p0 * (s.y - s.x),
    (P.p2 - P.p0) * s.x - s.x * s.z + P.p2 * s.y,
    s.x * s.y - P.p1 * s.z,
  );
}

// Four-wing (Elegant-Chaos-class catalog): a..f = p0..p5
fn field_fourwing(s: vec3<f32>) -> vec3<f32> {
  return vec3<f32>(
    P.p0 * s.x + P.p2 * s.y * s.z,
    P.p1 * s.x + P.p3 * s.y - s.x * s.z,
    P.p4 * s.z + P.p5 * s.x * s.y,
  );
}

fn field(s: vec3<f32>) -> vec3<f32> {
  switch P.field_id {
    case 1u: { return field_rossler(s); }
    case 2u: { return field_aizawa(s); }
    case 4u: { return field_thomas(s); }
    case 5u: { return field_halvorsen(s); }
    case 6u: { return field_dadras(s); }
    case 7u: { return field_chen(s); }
    case 8u: { return field_fourwing(s); }
    default: { return field_sprott_a(s); }
  }
}

fn rk4(s: vec3<f32>) -> vec3<f32> {
  let k1 = field(s);
  let k2 = field(s + 0.5 * P.dt * k1);
  let k3 = field(s + 0.5 * P.dt * k2);
  let k4 = field(s + P.dt * k3);
  return s + (P.dt / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4);
}

@compute @workgroup_size(1)
fn main() {
  var s = vec3<f32>(P.x0, P.y0, P.z0);
  traj[0] = s.x; traj[1] = s.y; traj[2] = s.z;
  for (var i: u32 = 1u; i <= P.n_steps; i = i + 1u) {
    s = rk4(s);
    let o = i * 3u;
    traj[o + 0u] = s.x;
    traj[o + 1u] = s.y;
    traj[o + 2u] = s.z;
  }
}
