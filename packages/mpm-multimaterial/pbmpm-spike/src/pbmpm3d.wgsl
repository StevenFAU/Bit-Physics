// pbmpm3d.wgsl — 3D position-based MPM (Lewin, SIGGRAPH 2024) spike for the
// rebuild-v2 Materials M0 (docs/planning/rebuild-v2/10-mpm-multimaterial.md).
//
// Concatenated AFTER packages/mpm-multimaterial/src/mpm_prelude.wgsl (read-only
// reuse of its svd3 — the Givens-sign-fixed Jacobi SVD — plus diag3/IDENTITY3).
// The prelude's own structs (Particle, SimParams, …) are unused here.
//
// Port source: electronicarts/pbmpm (BSD-3), shaders/g2p2g.wgsl on branch main
// (2D). Generalised to 3D: 27-node quadratic stencil, trace/3 volume terms,
// cube-root unit-determinant target, 3D Drucker–Prager return map. Added here
// (no reference counterpart): snow (Stomakhin 2013 clamp + hardened constraint),
// von Mises clay/honey in Hencky strain, kinematic SDF colliders that move.
//
// Units: positions in grid cells (dx = 1, node i sits at i + 0.5, as in the
// reference). "disp" is the particle's displacement over one step (velocity·dt);
// "D" is the displacement gradient (reference: deformationDisplacement).
//
// Per substep with K iterations (one dispatch each):
//   it = 0       : constraint on the stored D, P2G           -> grid_update
//   0 < it < K-1 : G2P, constraint, P2G                      -> grid_update
//   it = K-1     : G2P, integrate (F, plasticity, x, gravity, colliders)
// The reference also scatters on the last iteration; that grid is never read,
// so the spike skips it (K-1 P2Gs and grid solves per substep).
// P2G uses the existing fixed-point i32 atomics (order-independent, so a run is
// byte-identical on the same device); grid_update decodes and zeroes them.

struct PbParams {
  grid: vec3u,
  n_particles: u32,
  fp_scale: f32,
  inv_fp_scale: f32,
  guard: f32,
  wall_friction: f32,
  speed_thresh: f32,
  pad0: f32,
  pad1: f32,
  pad2: f32,
}

struct Collider {
  kind: u32,      // 0 none, 1 sphere, 2 box
  friction: f32,
  radius: f32,    // sphere radius / box rounding
  pad0: f32,
  center: vec3f,  // END-of-step position
  pad1: f32,
  half: vec3f,    // box half extents
  pad2: f32,
  disp: vec3f,    // collider displacement over this step
  pad3: f32,
}

// One 256-byte slot per dispatch (dynamic offset), so a frame of S substeps
// x K iterations is encoded once with no mid-frame uniform writes.
struct StepU {
  iteration: u32,
  iteration_count: u32,
  dt: f32,
  gravity: f32,   // cells / s^2, along -y
  time: f32,      // sim time at the START of this substep
  collider_count: u32,
  pad0: u32,
  pad1: u32,
  colliders: array<Collider, 2>,
}

struct MatParams {
  model: u32,         // 0 water, 1 jelly, 2 sand, 3 snow, 4 clay, 5 honey
  stiffness: f32,     // shape-constraint relaxation per iteration
  ratio: f32,         // target blend: ratio*R (shape) + (1-ratio)*Q (volume)
  viscosity: f32,     // fraction of sym(D) removed per iteration (water/sand)
  relax_vol: f32,     // water volume-constraint relaxation
  yield_r: f32,       // clay/honey: von Mises radius on |dev Hencky strain|
  theta_c: f32,       // snow critical compression
  theta_s: f32,       // snow critical stretch
  xi: f32,            // snow hardening exponent
  dp_alpha: f32,      // sand Drucker–Prager cone coefficient
  lam_over_mu: f32,   // sand elastic ratio in the DP projection
  max_stiffness: f32, // snow: cap on hardened stiffness
}

// 144 bytes, same footprint as the v1 particle.
struct PbParticle {
  pos: vec3f,
  mat: u32,
  disp: vec3f,
  mass: f32,
  F: mat3x3f,
  D: mat3x3f,
  jp: f32,     // water: J (volume ratio); snow: plastic Jp; else 1
  logjp: f32,  // sand: volume-gain memory (reference logJp)
  t_on: f32,   // emission time (pour); 0 for seeded particles
  aux: f32,    // accumulated plastic strain (clay/honey/sand/snow), for views
}

@group(0) @binding(0) var<uniform> P: PbParams;
@group(0) @binding(1) var<uniform> S: StepU;
@group(0) @binding(2) var<uniform> mats: array<MatParams, 8>;
@group(0) @binding(3) var<storage, read_write> parts: array<PbParticle>;
@group(0) @binding(4) var<storage, read_write> grid_q: array<atomic<i32>>;
@group(0) @binding(5) var<storage, read_write> grid_d: array<vec4f>;
@group(0) @binding(6) var<storage, read_write> stats: array<atomic<u32>>;
@group(0) @binding(7) var<storage, read_write> flags: array<atomic<u32>>;

// Specialisation probe: SOLIDS = false compiles the SVD paths out (water-only
// pipeline) to measure what the uber-kernel's register pressure costs.
override SOLIDS: bool = true;

const M_WATER: u32 = 0u;
const M_JELLY: u32 = 1u;
const M_SAND: u32 = 2u;
const M_SNOW: u32 = 3u;
const M_CLAY: u32 = 4u;
const M_HONEY: u32 = 5u;
// The fallback: the shipped explicit MLS-MPM snow (prelude stress_snow +
// snow_return_map, verbatim), run as a K = 2 "iteration" — in displacement
// form one MLS-MPM substep is P2G (APIC + stress), grid, G2P + integrate.
// MatParams reuse: yield_r = mu0, dp_alpha = lam0 (Pa), relax_vol = the stress
// scale 4 dt^2 / dx^2 * V0 / mass_unit (host-computed per run).
const M_SNOW_MLS: u32 = 6u;

fn mls_material(m: MatParams) -> Material {
  return Material(m.yield_r, m.dp_alpha, 1u, m.xi, m.theta_c, m.theta_s, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0);
}

fn cell_index(c: vec3i) -> u32 {
  return u32((c.z * i32(P.grid.y) + c.y) * i32(P.grid.x) + c.x);
}

fn tr3(m: mat3x3f) -> f32 {
  return m[0][0] + m[1][1] + m[2][2];
}

fn outer3(a: vec3f, b: vec3f) -> mat3x3f {
  return mat3x3f(a * b.x, a * b.y, a * b.z);
}

fn inverse3(m: mat3x3f) -> mat3x3f {
  let a = m[0];
  let b = m[1];
  let c = m[2];
  let r0 = cross(b, c);
  let r1 = cross(c, a);
  let r2 = cross(a, b);
  let inv_det = 1.0 / dot(a, r0);
  return transpose(mat3x3f(r0, r1, r2)) * inv_det;
}

fn cbrt_pos(x: f32) -> f32 {
  return pow(x, 1.0 / 3.0);
}

// Closest scaled matrix with |det| = 1 (reference: Q = F / sqrt(det F) in 2D).
fn unit_det(f: mat3x3f, lo: f32, hi: f32) -> mat3x3f {
  let df = determinant(f);
  let cdf = clamp(abs(df), lo, hi);
  let sgn = select(1.0, -1.0, df < 0.0);
  return (1.0 / (sgn * cbrt_pos(cdf))) * f;
}

// ---------------------------------------------------------------------------
// Signed distance to a kinematic collider (cells) and its outward normal.
// ---------------------------------------------------------------------------

fn sdf_box(p: vec3f, half: vec3f, r: f32) -> f32 {
  let q = abs(p) - (half - vec3f(r));
  return length(max(q, vec3f(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}

fn collider_sdf(c: Collider, x: vec3f) -> f32 {
  if (c.kind == 1u) {
    return length(x - c.center) - c.radius;
  }
  if (c.kind == 2u) {
    return sdf_box(x - c.center, c.half, c.radius);
  }
  return 1e9;
}

fn collider_normal(c: Collider, x: vec3f) -> vec3f {
  if (c.kind == 1u) {
    let d = x - c.center;
    let l = length(d);
    if (l < 1e-6) {
      return vec3f(0.0, 1.0, 0.0);
    }
    return d / l;
  }
  let e = 0.05;
  let n = vec3f(
    collider_sdf(c, x + vec3f(e, 0.0, 0.0)) - collider_sdf(c, x - vec3f(e, 0.0, 0.0)),
    collider_sdf(c, x + vec3f(0.0, e, 0.0)) - collider_sdf(c, x - vec3f(0.0, e, 0.0)),
    collider_sdf(c, x + vec3f(0.0, 0.0, e)) - collider_sdf(c, x - vec3f(0.0, 0.0, e)),
  );
  let l = length(n);
  if (l < 1e-6) {
    return vec3f(0.0, 1.0, 0.0);
  }
  return n / l;
}

// ---------------------------------------------------------------------------
// Grid solve: decode the fixed-point scatter, mass-weight to a displacement,
// project against kinematic colliders and the guardian walls, zero the atoms
// for the next scatter.
// ---------------------------------------------------------------------------

@compute @workgroup_size(64)
fn grid_update(@builtin(global_invocation_id) gid: vec3u) {
  let c = gid.x;
  let n = P.grid.x * P.grid.y * P.grid.z;
  if (c >= n) {
    return;
  }
  let o = c * 4u;
  let qx = atomicLoad(&grid_q[o + 0u]);
  let qy = atomicLoad(&grid_q[o + 1u]);
  let qz = atomicLoad(&grid_q[o + 2u]);
  let qm = atomicLoad(&grid_q[o + 3u]);
  if (qm == 0 && qx == 0 && qy == 0 && qz == 0) {
    grid_d[c] = vec4f(0.0);
    return;
  }
  atomicStore(&grid_q[o + 0u], 0);
  atomicStore(&grid_q[o + 1u], 0);
  atomicStore(&grid_q[o + 2u], 0);
  atomicStore(&grid_q[o + 3u], 0);
  let m = f32(qm) * P.inv_fp_scale;
  var d = vec3f(0.0);
  if (m > 1e-5) {
    d = vec3f(f32(qx), f32(qy), f32(qz)) * P.inv_fp_scale / m;
  }
  let gx = c % P.grid.x;
  let gy = (c / P.grid.x) % P.grid.y;
  let gz = c / (P.grid.x * P.grid.y);
  let x = vec3f(f32(gx), f32(gy), f32(gz)) + vec3f(0.5);

  // Kinematic colliders (reference: "prevent any further penetration", not a
  // projection to the surface — snapping nodes that are already inside out to
  // the surface puts a 1-cell jump in the displacement field and wrecks F next
  // to a press). In the collider's frame the node may close the gap it had at
  // the start of the step and no more; a node already inside moves with it.
  for (var i = 0u; i < S.collider_count; i++) {
    let col = S.colliders[i];
    if (collider_sdf(col, x + d) < 0.0) {
      let x_rel = x + col.disp; // node carried with the collider
      let gap = max(collider_sdf(col, x_rel), 0.0);
      let nrm = collider_normal(col, x_rel);
      let rel = d - col.disp;
      let rn = dot(rel, nrm);
      if (rn < -gap) {
        var rt = rel - rn * nrm;
        rt *= 1.0 - col.friction;
        d = col.disp + (-gap) * nrm + rt;
      }
    }
  }

  // Guardian walls (reference projectInsideGuardian at guard + 1): a node whose
  // displaced position leaves the box loses that component; the others take
  // wall friction.
  let lo = vec3f(P.guard + 1.0);
  let hi = vec3f(P.grid) - vec3f(P.guard + 2.0);
  let xp = x + d;
  let f = P.wall_friction;
  if (xp.x < lo.x || xp.x > hi.x) {
    d.x = 0.0;
    d.y *= 1.0 - f;
    d.z *= 1.0 - f;
  }
  if (xp.y < lo.y || xp.y > hi.y) {
    d.y = 0.0;
    d.x *= 1.0 - f;
    d.z *= 1.0 - f;
  }
  if (xp.z < lo.z || xp.z > hi.z) {
    d.z = 0.0;
    d.x *= 1.0 - f;
    d.y *= 1.0 - f;
  }
  grid_d[c] = vec4f(d, m);
}

// ---------------------------------------------------------------------------
// Constraint ("particle update") — moves the local displacement gradient D
// toward the material's target shape. Never stored: G2P recomputes D.
// ---------------------------------------------------------------------------

fn snow_hardening(jp: f32, m: MatParams) -> f32 {
  return clamp(exp(m.xi * (1.0 - jp)), 0.1, 20.0);
}

fn constrain(D_in: mat3x3f, p: PbParticle, m: MatParams) -> mat3x3f {
  var D = D_in;
  if (m.model == M_SNOW_MLS) {
    return D; // explicit: APIC affine only; the stress rides P2G
  }
  if (m.model == M_WATER) {
    D -= (m.viscosity * 0.5) * (D + transpose(D));
    // Volume: drive (1 + tr(D)) * J -> 1 with a hydrostatic a*I (3D: tr(aI) = 3a).
    var a = (1.0 / p.jp - tr3(D) - 1.0) / 3.0;
    if (m.ratio < 0.5) {
      // No-tension water (ratio reused as the switch): resist compression
      // below rest volume only; separation is free (free surfaces, spray).
      a = max(a, 0.0);
    }
    D += (m.relax_vol * a) * IDENTITY3;
    return D;
  }
  if (!SOLIDS) {
    return D;
  }
  let ft = (IDENTITY3 + D) * p.F;
  let s = svd3(ft);
  var tgt: mat3x3f;
  var k = m.stiffness;
  if (m.model == M_SAND && m.relax_vol <= 0.5) {
    var sig = s.sigma;
    if (p.logjp == 0.0) {
      // Resist compression only (reference: clamp Sigma to [1, 1000]).
      sig = clamp(sig, vec3f(1.0), vec3f(1000.0));
    }
    let q = unit_det(ft, 0.1, 1.0);
    tgt = m.ratio * (s.u * diag3(sig) * transpose(s.v)) + (1.0 - m.ratio) * q;
  } else if (m.model == M_SAND) {
    // Variant (relax_vol > 0.5, reused as the switch): the full elastic target R,
    // as for jelly, so shear is resisted elastically up to the Drucker–Prager
    // cone (Klár's elastic predictor); expansion is still forgotten by the
    // return map (cone tip), so the pile stays cohesionless.
    tgt = s.u * transpose(s.v);
  } else {
    let r = s.u * transpose(s.v);
    let q = unit_det(ft, 0.1, 1000.0);
    tgt = m.ratio * r + (1.0 - m.ratio) * q;
    if (m.model == M_SNOW && m.lam_over_mu <= 0.5) {
      k = min(m.stiffness * snow_hardening(p.jp, m), m.max_stiffness);
    }
  }
  let diff = (tgt * inverse3(p.F) - IDENTITY3) - D;
  D += k * diff;
  if (m.model == M_SAND) {
    D -= (m.viscosity * 0.5) * (D + transpose(D));
  }
  return D;
}

// ---------------------------------------------------------------------------
// Integration (last iteration): deformation update, plasticity, advection,
// colliders, gravity warm start for the next substep.
// ---------------------------------------------------------------------------

fn integrate(p_in: PbParticle, m: MatParams) -> PbParticle {
  var p = p_in;
  if (SOLIDS && m.model == M_SNOW_MLS) {
    // v1 path: CFL speed guard (|v| <= 0.4 dx/dt), F <- (I + dt C) F, return map.
    let sp = length(p.disp);
    if (sp > 0.4) {
      p.disp *= 0.4 / sp;
    }
    var jp = p.jp;
    p.F = snow_return_map((IDENTITY3 + p.D) * p.F, &jp, mls_material(m));
    p.jp = jp;
  } else if (m.model == M_WATER || !SOLIDS) {
    p.jp = max(p.jp * (tr3(p.D) + 1.0), 0.05);
    if (m.ratio < 0.5) {
      p.jp = min(p.jp, 1.0); // no tension: a separated particle is at rest volume
    }
  } else {
    let f = (IDENTITY3 + p.D) * p.F;
    let s = svd3(f);
    // Safety clamp (reference): no element may collapse below 0.1 or invert.
    var sig = clamp(s.sigma, vec3f(0.1), vec3f(10000.0));
    if (m.model == M_SAND) {
      // Klár et al. 2016 Drucker–Prager in Hencky strain, with the reference's
      // logJp volume memory; 3D: trace/3 and (3λ + 2μ)/(2μ) = 1.5 λ/μ + 1.
      let e = log(max(abs(sig), vec3f(1e-6)));
      let trace = e.x + e.y + e.z + p.logjp;
      let ehat = e - vec3f(trace / 3.0);
      let frob = length(ehat);
      if (trace >= 0.0) {
        sig = vec3f(1.0);
        p.logjp = 0.5 * trace;
      } else {
        p.logjp = 0.0;
        let dg = frob + (1.5 * m.lam_over_mu + 1.0) * trace * m.dp_alpha;
        if (dg > 0.0 && frob > 1e-12) {
          let h = e - (dg / frob) * ehat;
          sig = exp(h);
          p.aux += dg;
        }
      }
    } else if (m.model == M_SNOW) {
      // Stomakhin et al. 2013: clamp elastic stretches, move the removed
      // volume change into the plastic Jp (hardening reads it).
      // Hardening: Stomakhin scales the Lamé parameters by h = e^{xi(1-Jp)}.
      // PB-MPM has no modulus (rest strain is set by solver convergence and
      // stiffness is capped by the relaxation), so with lam_over_mu > 0.5
      // (reused as the switch) h scales the critical compression instead:
      // packed snow yields later, which is what stops self-weight compaction;
      // tension stays brittle (lam_over_mu > 1.5 hardens it as well).
      var tc = m.theta_c;
      var ts = m.theta_s;
      if (m.lam_over_mu > 0.5) {
        let h = snow_hardening(p.jp, m);
        tc = min(tc * h, 0.6);
        if (m.lam_over_mu > 1.5) {
          ts = min(ts * h, 0.6); // mode 2: tension hardens too
        }
      }
      let sc = clamp(sig, vec3f(1.0 - tc), vec3f(1.0 + ts));
      let det_t = sig.x * sig.y * sig.z;
      let det_c = sc.x * sc.y * sc.z;
      p.jp = clamp(p.jp * det_t / det_c, 0.05, 10.0);
      p.aux += length(log(sig) - log(sc));
      sig = sc;
    } else if (m.model == M_CLAY || m.model == M_HONEY) {
      // von Mises (J2) return map in Hencky strain: project the deviatoric
      // strain onto the sphere of radius yield_r; volume is untouched.
      let e = log(sig);
      let mean = (e.x + e.y + e.z) / 3.0;
      let dev = e - vec3f(mean);
      let nd = length(dev);
      if (nd > m.yield_r) {
        let dev2 = dev * (m.yield_r / nd);
        sig = exp(vec3f(mean) + dev2);
        p.aux += nd - m.yield_r;
      }
    }
    p.F = s.u * diag3(sig) * transpose(s.v);
  }

  p.pos += p.disp;

  for (var i = 0u; i < S.collider_count; i++) {
    let col = S.colliders[i];
    let phi = collider_sdf(col, p.pos);
    if (phi < 0.0) {
      let nrm = collider_normal(col, p.pos);
      p.pos += -phi * nrm;
      let rel = p.disp - col.disp;
      let rn = dot(rel, nrm);
      if (rn < 0.0) {
        p.disp -= rn * nrm;
      }
    }
  }

  p.disp.y -= S.gravity * S.dt * S.dt;
  let lo = vec3f(P.guard);
  let hi = vec3f(P.grid) - vec3f(P.guard + 1.0);
  p.pos = clamp(p.pos, lo, hi);
  return p;
}

// ---------------------------------------------------------------------------
// The fused particle pass (G2P + constraint + P2G), one dispatch per iteration.
// ---------------------------------------------------------------------------

fn process(pi: u32, tiled: bool, org: vec3i) {
  var p = parts[pi];
  if (p.t_on > S.time) {
    return; // not emitted yet
  }
  let m = mats[p.mat];
  let cellf = floor(p.pos);
  let off = p.pos - cellf - vec3f(0.5);
  let w0 = 0.5 * (vec3f(0.5) - off) * (vec3f(0.5) - off);
  let w1 = vec3f(0.75) - off * off;
  let w2 = 0.5 * (vec3f(0.5) + off) * (vec3f(0.5) + off);
  let wx = array<f32, 3>(w0.x, w1.x, w2.x);
  let wy = array<f32, 3>(w0.y, w1.y, w2.y);
  let wz = array<f32, 3>(w0.z, w1.z, w2.z);
  let base = vec3i(cellf) - vec3i(1);

  if (S.iteration != 0u) {
    var d = vec3f(0.0);
    var b = mat3x3f(vec3f(0.0), vec3f(0.0), vec3f(0.0));
    for (var i = 0; i < 3; i++) {
      for (var j = 0; j < 3; j++) {
        for (var k = 0; k < 3; k++) {
          let w = wx[i] * wy[j] * wz[k];
          let node = base + vec3i(i, j, k);
          let gd = grid_d[cell_index(node)].xyz;
          let offset = vec3f(node) - p.pos + vec3f(0.5);
          let wd = w * gd;
          b += outer3(wd, offset);
          d += wd;
        }
      }
    }
    p.D = 4.0 * b;
    p.disp = d;
    if (S.iteration == S.iteration_count - 1u) {
      parts[pi] = integrate(p, m);
      return;
    }
    parts[pi] = p;
  }

  let dc = constrain(p.D, p, m);
  var tau = mat3x3f(vec3f(0.0), vec3f(0.0), vec3f(0.0));
  if (SOLIDS && m.model == M_SNOW_MLS) {
    tau = m.relax_vol * stress_snow(p.F, p.jp, mls_material(m));
  }
  for (var i = 0; i < 3; i++) {
    for (var j = 0; j < 3; j++) {
      for (var k = 0; k < 3; k++) {
        let w = wx[i] * wy[j] * wz[k];
        let node = base + vec3i(i, j, k);
        let offset = vec3f(node) - p.pos + vec3f(0.5);
        let wm = w * p.mass;
        let mom = wm * (p.disp + dc * offset) - w * (tau * offset);
        scatter(node, mom, wm, tiled, org);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Scatter targets. Tiled mode (the reference's bukkit idea, measured here):
// particles are binned by 4^3 brick; one workgroup takes up to 256 particles of
// one brick and accumulates into a 6^3-node shared tile (the brick plus the
// stencil's one-node halo), then flushes each node with ONE global atomic per
// channel. A node outside the tile (a particle that left its brick since the
// sort) falls back to the global atomic. Integer adds: still order-independent.
// ---------------------------------------------------------------------------

const TILE: i32 = 6;
var<workgroup> tile: array<atomic<i32>, 864>; // 6^3 nodes x 4 channels

fn scatter(node: vec3i, mom: vec3f, wm: f32, tiled: bool, org: vec3i) {
  let q = vec4i(
    i32(round(mom.x * P.fp_scale)),
    i32(round(mom.y * P.fp_scale)),
    i32(round(mom.z * P.fp_scale)),
    i32(round(wm * P.fp_scale)),
  );
  let l = node - (org - vec3i(1));
  if (tiled && all(l >= vec3i(0)) && all(l < vec3i(TILE))) {
    let t = u32((l.z * TILE + l.y) * TILE + l.x) * 4u;
    atomicAdd(&tile[t + 0u], q.x);
    atomicAdd(&tile[t + 1u], q.y);
    atomicAdd(&tile[t + 2u], q.z);
    atomicAdd(&tile[t + 3u], q.w);
    return;
  }
  let o = cell_index(node) * 4u;
  atomicAdd(&grid_q[o + 0u], q.x);
  atomicAdd(&grid_q[o + 1u], q.y);
  atomicAdd(&grid_q[o + 2u], q.z);
  atomicAdd(&grid_q[o + 3u], q.w);
}

@compute @workgroup_size(64)
fn particle_iter(@builtin(global_invocation_id) gid: vec3u) {
  if (gid.x >= P.n_particles) {
    return;
  }
  process(gid.x, false, vec3i(0));
}

// work[i] = (first particle, count <= 256, brick origin packed x | y << 10 | z << 20, 0)
@group(0) @binding(8) var<storage, read> work: array<vec4u>;

@compute @workgroup_size(256)
fn particle_iter_tiled(@builtin(workgroup_id) wg: vec3u, @builtin(local_invocation_index) li: u32) {
  let w = work[wg.x];
  let org = vec3i(i32(w.z & 1023u), i32((w.z >> 10u) & 1023u), i32((w.z >> 20u) & 1023u));
  for (var i = li; i < 864u; i += 256u) {
    atomicStore(&tile[i], 0);
  }
  workgroupBarrier();
  if (li < w.y) {
    process(w.x + li, true, org);
  }
  workgroupBarrier();
  if (S.iteration + 1u == S.iteration_count) {
    return; // last iteration scatters nothing (uniform: same for the group)
  }
  for (var n = li; n < 216u; n += 256u) {
    let t = n * 4u;
    let qx = atomicLoad(&tile[t + 0u]);
    let qy = atomicLoad(&tile[t + 1u]);
    let qz = atomicLoad(&tile[t + 2u]);
    let qm = atomicLoad(&tile[t + 3u]);
    if (qm != 0 || qx != 0 || qy != 0 || qz != 0) {
      let ni = i32(n);
      let node = org - vec3i(1) + vec3i(ni % TILE, (ni / TILE) % TILE, ni / (TILE * TILE));
      let o = cell_index(node) * 4u;
      atomicAdd(&grid_q[o + 0u], qx);
      atomicAdd(&grid_q[o + 1u], qy);
      atomicAdd(&grid_q[o + 2u], qz);
      atomicAdd(&grid_q[o + 3u], qm);
    }
  }
}

// ---------------------------------------------------------------------------
// Diagnostics (not part of a step).
// stats: 0 non-finite, 1 max speed bits (cells/s), 2 count speed > thresh,
//        3 max |F|_F bits, 4 min J bits (J > 0), 5 count J <= 0,
//        6 max J bits, 7 active count, 8 max |pos - clamp| (escape) bits,
//        9 max plastic aux bits
// ---------------------------------------------------------------------------

fn finite3(v: vec3f) -> bool {
  // NaN fails every comparison; Inf fails the bound.
  return all(abs(v) < vec3f(1e30));
}

@compute @workgroup_size(64)
fn particle_stats(@builtin(global_invocation_id) gid: vec3u) {
  let pi = gid.x;
  if (pi >= P.n_particles) {
    return;
  }
  let p = parts[pi];
  if (p.t_on > S.time) {
    return;
  }
  atomicAdd(&stats[7], 1u);
  let ok = finite3(p.pos) && finite3(p.disp) && finite3(p.F[0]) && finite3(p.F[1])
    && finite3(p.F[2]) && abs(p.jp) < 1e30;
  if (!ok) {
    atomicAdd(&stats[0], 1u);
    return;
  }
  // Speed of the CURRENT step's motion (disp minus the gravity warm start).
  let v = (p.disp + vec3f(0.0, S.gravity * S.dt * S.dt, 0.0)) / S.dt;
  let speed = length(v);
  atomicMax(&stats[1], bitcast<u32>(speed));
  if (speed > P.speed_thresh) {
    atomicAdd(&stats[2], 1u);
  }
  let m = mats[p.mat];
  var j = p.jp;
  if (m.model != M_WATER) {
    let fn2 = dot(p.F[0], p.F[0]) + dot(p.F[1], p.F[1]) + dot(p.F[2], p.F[2]);
    atomicMax(&stats[3], bitcast<u32>(sqrt(fn2)));
    j = determinant(p.F);
  }
  if (j > 0.0) {
    atomicMin(&stats[4], bitcast<u32>(j));
    atomicMax(&stats[6], bitcast<u32>(j));
  } else {
    atomicAdd(&stats[5], 1u);
  }
  atomicMax(&stats[9], bitcast<u32>(max(p.aux, 0.0)));
}

// Occupancy probe: after one iteration-0 scatter, count cells with mass,
// mark 4^3 and 8^3 bricks, record the largest |quanta| (i32 headroom), zero.
// flags: [0, nb4) brick4 marks, [nb4, nb4 + nb8) brick8 marks.
@compute @workgroup_size(64)
fn occupancy(@builtin(global_invocation_id) gid: vec3u) {
  let c = gid.x;
  let n = P.grid.x * P.grid.y * P.grid.z;
  if (c >= n) {
    return;
  }
  let o = c * 4u;
  let qx = atomicExchange(&grid_q[o + 0u], 0);
  let qy = atomicExchange(&grid_q[o + 1u], 0);
  let qz = atomicExchange(&grid_q[o + 2u], 0);
  let qm = atomicExchange(&grid_q[o + 3u], 0);
  if (qm == 0) {
    return;
  }
  atomicAdd(&stats[10], 1u);
  atomicMax(&stats[11], u32(abs(qm)));
  atomicMax(&stats[12], max(u32(abs(qx)), max(u32(abs(qy)), u32(abs(qz)))));
  let gx = c % P.grid.x;
  let gy = (c / P.grid.x) % P.grid.y;
  let gz = c / (P.grid.x * P.grid.y);
  let b4 = vec3u(gx, gy, gz) / 4u;
  let n4 = P.grid / 4u;
  atomicStore(&flags[(b4.z * n4.y + b4.y) * n4.x + b4.x], 1u);
  let b8 = vec3u(gx, gy, gz) / 8u;
  let n8 = P.grid / 8u;
  let nb4 = n4.x * n4.y * n4.z;
  atomicStore(&flags[nb4 + (b8.z * n8.y + b8.y) * n8.x + b8.x], 1u);
}

@compute @workgroup_size(64)
fn brick_count(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  let n4 = P.grid / 4u;
  let n8 = P.grid / 8u;
  let nb4 = n4.x * n4.y * n4.z;
  let nb8 = n8.x * n8.y * n8.z;
  if (i >= nb4 + nb8) {
    return;
  }
  let v = atomicExchange(&flags[i], 0u);
  if (v != 0u) {
    if (i < nb4) {
      atomicAdd(&stats[13], 1u);
    } else {
      atomicAdd(&stats[14], 1u);
    }
  }
}
