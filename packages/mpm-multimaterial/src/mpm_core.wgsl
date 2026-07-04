// mpm_core.wgsl — MLS-MPM compute passes (Tier 1: split passes, global
// fixed-point i32 atomics). Concatenated after mpm_prelude.wgsl at pipeline
// creation (WGSL has no includes).
//
// Pass order per step (ports the reference loop in
// packages/mpm-multimaterial/mpm_multimaterial/sim.py _evolve_to_step_states):
//   clearBuffer(grid) -> p2g -> grid_update -> g2p
// p2g folds the per-particle stress (computed from the CURRENT F) into the
// scatter exactly like p2g_with_stress; g2p folds the deformation update,
// plastic return map, and advection — the same intra-step data flow as the
// reference (stress from F^n, F^{n+1} from the post-G2P affine C).

@group(0) @binding(0) var<uniform> params: SimParams;
@group(0) @binding(1) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(2) var<storage, read_write> grid: array<GridAtom>;
@group(0) @binding(3) var<storage, read_write> grid_vel: array<vec4f>; // xyz velocity, w mass
@group(0) @binding(4) var<uniform> materials: array<Material, 4>;
@group(0) @binding(5) var<storage, read> aux_in: array<f32>;
@group(0) @binding(6) var<storage, read_write> aux_out: array<f32>;
@group(0) @binding(7) var<uniform> pointers: array<Pointer, 4>;

fn cell_index(g: vec3i) -> u32 {
  // Lex (i, j, k) with k fastest — matches the reference's numpy C-order.
  let n = i32(params.grid_n);
  return u32((g.x * n + g.y) * n + g.z);
}

// Zero the fixed-point accumulation grid (caller zeroes before each P2G —
// reference: grid_mass.fill(0); grid_mom.fill(0)). A kernel rather than
// clearBuffer so one substep = one compute pass (clean timestamp-query HUD).
@compute @workgroup_size(64)
fn clear_grid(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  let n = params.grid_n;
  if (idx >= n * n * n) {
    return;
  }
  atomicStore(&grid[idx].m, 0);
  atomicStore(&grid[idx].mx, 0);
  atomicStore(&grid[idx].my, 0);
  atomicStore(&grid[idx].mz, 0);
}

// ---------------------------------------------------------------------------
// P2G — ports p2g_with_stress: scatter mass + momentum with the fused
// MLS-MPM stress + affine contribution, accumulated in fixed-point i32
// (order-independent => run-twice byte-identical).
//   eff = mass * C + (-4 dt / dx^2) * V0 * tau        [Hu 2018 88-line form]
//   mom_i += w * (mass * v + eff * (x_i - x_p))
// ---------------------------------------------------------------------------

@compute @workgroup_size(64)
fn p2g(@builtin(global_invocation_id) gid: vec3u) {
  let p = gid.x;
  if (p >= params.n_particles) {
    return;
  }
  let pt = particles[p];
  let m = materials[pt.mat_id];
  let tau = particle_stress(pt.F, pt.Jp, m);
  let ws = -4.0 * params.dt * params.inv_dx * params.inv_dx * pt.vol0 * params.inv_mass_unit;
  let eff = pt.mass * pt.C + ws * tau;

  let fx = pt.pos * params.inv_dx;
  let base = vec3i(floor(fx + vec3f(0.5))) - vec3i(1);
  let fp = fx - vec3f(base);
  let wx = bspline_weights(fp.x);
  let wy = bspline_weights(fp.y);
  let wz = bspline_weights(fp.z);
  let n = i32(params.grid_n);

  for (var di = 0; di < 3; di++) {
    let gi = base.x + di;
    if (gi < 0 || gi >= n) {
      continue;
    }
    let dx_node = (f32(di) - fp.x) * params.dx;
    for (var dj = 0; dj < 3; dj++) {
      let gj = base.y + dj;
      if (gj < 0 || gj >= n) {
        continue;
      }
      let dy_node = (f32(dj) - fp.y) * params.dx;
      for (var dk = 0; dk < 3; dk++) {
        let gk = base.z + dk;
        if (gk < 0 || gk >= n) {
          continue;
        }
        let dz_node = (f32(dk) - fp.z) * params.dx;
        let w = wx[di] * wy[dj] * wz[dk];
        let dpos = vec3f(dx_node, dy_node, dz_node);
        let mv = pt.mass * pt.vel + eff * dpos;
        let cell = cell_index(vec3i(gi, gj, gk));
        atomicAdd(&grid[cell].m, encode_fixed(w * pt.mass, params.fp_scale));
        atomicAdd(&grid[cell].mx, encode_fixed(w * mv.x, params.fp_scale));
        atomicAdd(&grid[cell].my, encode_fixed(w * mv.y, params.fp_scale));
        atomicAdd(&grid[cell].mz, encode_fixed(w * mv.z, params.fp_scale));
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Grid update — ports grid_update: decode fixed-point, momentum -> velocity,
// gravity, sticky floor (k <= floor_z zeroes ALL components), axis-clamp
// walls (normal component only). Pointer impulses are live-loop only
// (n_pointers = 0 on the gated canonical scene — the branch never fires).
// ---------------------------------------------------------------------------

@compute @workgroup_size(64)
fn grid_update(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  let n = params.grid_n;
  if (idx >= n * n * n) {
    return;
  }
  let mq = atomicLoad(&grid[idx].m);
  if (mq <= 0) {
    grid_vel[idx] = vec4f(0.0);
    return;
  }
  let mass = decode_fixed(mq, params.inv_fp_scale);
  let mom = vec3f(
    decode_fixed(atomicLoad(&grid[idx].mx), params.inv_fp_scale),
    decode_fixed(atomicLoad(&grid[idx].my), params.inv_fp_scale),
    decode_fixed(atomicLoad(&grid[idx].mz), params.inv_fp_scale),
  );
  var v = mom / mass;
  v += params.gravity * params.dt;

  // Live interaction impulses (INTERACT layer; zero-count on the gate scene).
  let k = i32(idx % n);
  let j = i32((idx / n) % n);
  let i = i32(idx / (n * n));
  let cell_pos = vec3f(f32(i), f32(j), f32(k)) * params.dx;
  for (var q = 0u; q < params.n_pointers; q++) {
    let d = cell_pos - pointers[q].pos;
    let r = pointers[q].radius;
    let d2 = dot(d, d);
    if (d2 < r * r) {
      let fall = 1.0 - sqrt(d2) / r;
      v += pointers[q].vel * (pointers[q].strength * fall * params.dt);
    }
  }

  // Boundary conditions — verbatim reference order.
  if (k <= params.floor_z) {
    v = vec3f(0.0);
  }
  if (k == 0 && v.z < 0.0) {
    v.z = 0.0;
  }
  if (k == i32(n) - 1 && v.z > 0.0) {
    v.z = 0.0;
  }
  if (i == 0 && v.x < 0.0) {
    v.x = 0.0;
  }
  if (i == i32(n) - 1 && v.x > 0.0) {
    v.x = 0.0;
  }
  if (j == 0 && v.y < 0.0) {
    v.y = 0.0;
  }
  if (j == i32(n) - 1 && v.y > 0.0) {
    v.y = 0.0;
  }
  grid_vel[idx] = vec4f(v, mass);
}

// ---------------------------------------------------------------------------
// G2P — ports g2p + deformation_update + plastic return maps + advect:
//   v_p = sum w_i v_i ;  C_p = (4 / dx^2) sum w_i v_i (x_i - x_p)^T
//   F_trial = (I + dt C) F ; material return map ; x += dt v, clamped to
//   [2 dx, (n-2) dx] (stencil-safety clamp, reference advect_particles).
// ---------------------------------------------------------------------------

@compute @workgroup_size(64)
fn g2p(@builtin(global_invocation_id) gid: vec3u) {
  let p = gid.x;
  if (p >= params.n_particles) {
    return;
  }
  var pt = particles[p];
  let fx = pt.pos * params.inv_dx;
  let base = vec3i(floor(fx + vec3f(0.5))) - vec3i(1);
  let fp = fx - vec3f(base);
  let wx = bspline_weights(fp.x);
  let wy = bspline_weights(fp.y);
  let wz = bspline_weights(fp.z);
  let n = i32(params.grid_n);

  var v_acc = vec3f(0.0);
  var c_acc = mat3x3f(vec3f(0.0), vec3f(0.0), vec3f(0.0));
  for (var di = 0; di < 3; di++) {
    let gi = base.x + di;
    if (gi < 0 || gi >= n) {
      continue;
    }
    let dx_node = (f32(di) - fp.x) * params.dx;
    for (var dj = 0; dj < 3; dj++) {
      let gj = base.y + dj;
      if (gj < 0 || gj >= n) {
        continue;
      }
      let dy_node = (f32(dj) - fp.y) * params.dx;
      for (var dk = 0; dk < 3; dk++) {
        let gk = base.z + dk;
        if (gk < 0 || gk >= n) {
          continue;
        }
        let dz_node = (f32(dk) - fp.z) * params.dx;
        let w = wx[di] * wy[dj] * wz[dk];
        let gv = grid_vel[cell_index(vec3i(gi, gj, gk))].xyz;
        let dpos = vec3f(dx_node, dy_node, dz_node);
        v_acc += w * gv;
        // APIC affine reconstruction: C += w * v_i (x_i - x_p)^T.
        // mat3x3f columns are the outer product's columns (column-major).
        c_acc += mat3x3f(w * gv * dpos.x, w * gv * dpos.y, w * gv * dpos.z);
      }
    }
  }
  let affine_scale = 4.0 * params.inv_dx * params.inv_dx;
  let c_new = affine_scale * c_acc;
  let speed = length(v_acc);
  if (speed > params.vmax_clamp) {
    v_acc *= params.vmax_clamp / speed;
  }
  pt.vel = v_acc;
  pt.C = c_new;

  let m = materials[pt.mat_id];
  if (m.model == 3u) {
    // Water — J tracked as a scalar (Tampubolon 2017): J *= 1 + dt tr(C).
    let tr_c = c_new[0][0] + c_new[1][1] + c_new[2][2];
    pt.Jp = clamp(pt.Jp * (1.0 + params.dt * tr_c), 0.05, 4.0);
  } else {
    // Deformation update F <- (I + dt C) F  (Hu 2018 § 3 eq. 4).
    let f_trial = (IDENTITY3 + params.dt * c_new) * pt.F;
    if (m.model == 1u) {
      var jp = pt.Jp;
      pt.F = snow_return_map(f_trial, &jp, m);
      pt.Jp = jp;
    } else if (m.model == 2u) {
      pt.F = sand_return_map(f_trial, m);
    } else {
      pt.F = f_trial;
    }
  }

  // Advect + stencil-safety clamp (reference advect_particles).
  let lo = 2.0 * params.dx;
  let hi = (f32(params.grid_n) - 2.0) * params.dx;
  pt.pos = clamp(pt.pos + params.dt * pt.vel, vec3f(lo), vec3f(hi));
  particles[p] = pt;
}

// ---------------------------------------------------------------------------
// Golden readout — evaluates the closed-form quadratic B-spline N(x) at the
// committed golden-table sample points, and the partition-of-unity sum at
// arbitrary p, ON THE VISITOR'S GPU (f32 scope; the in-page f64 mirror covers
// the 1e-15-class table match).
// aux_in layout:  [n_samples, n_pou, x_0..x_{ns-1}, p_0..p_{np-1}]
// aux_out layout: [N(x_0).., pou(p_0)..]
// ---------------------------------------------------------------------------

@compute @workgroup_size(64)
fn golden_eval(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  let n_samples = u32(aux_in[0]);
  let n_pou = u32(aux_in[1]);
  if (i < n_samples) {
    aux_out[i] = bspline_n(aux_in[2u + i]);
    return;
  }
  if (i < n_samples + n_pou) {
    let p = aux_in[2u + i];
    let b = floor(p + 0.5) - 1.0;
    let fp = p - b;
    let w = bspline_weights(fp);
    aux_out[i] = w.x + w.y + w.z;
  }
}

// ---------------------------------------------------------------------------
// Material-fixture harness — applies the snow / sand return maps to a batch
// of committed trial deformation gradients so the page can verify the
// per-material invariants against an f64 mirror (spec § 4.3):
//   snow: singular values of F_out in [1-theta_c, 1+theta_s]
//   sand: Case III volume preservation tr(H) = tr(eps) via log det F
// aux_in:  per fixture 12 floats: F row-major 9, mode (1 snow / 2 sand), jp, pad
// aux_out: per fixture 16 floats: F_out row-major 9, sigma_out 3, case, jp_out,
//          det_trial, pad. (case: 1 elastic, 2 tip, 3 cone-face; snow: 0)
// ---------------------------------------------------------------------------

// Direct constitutive evaluation on a committed F batch — the WGSL f32
// stress path checked against the committed reference-computed fixture
// (fixtures/reference-fixtures.json neo_hookean_16, incl. the J<=0 guard row).
// aux_in: per fixture 12 floats (F row-major 9, material index, jp, pad).
// aux_out: per fixture 12 floats (tau row-major 9, pad 3).
@compute @workgroup_size(64)
fn stress_eval(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  if (i >= params.n_particles) {
    return;
  }
  let o = i * 12u;
  let f = mat3x3f(
    vec3f(aux_in[o + 0u], aux_in[o + 3u], aux_in[o + 6u]),
    vec3f(aux_in[o + 1u], aux_in[o + 4u], aux_in[o + 7u]),
    vec3f(aux_in[o + 2u], aux_in[o + 5u], aux_in[o + 8u]),
  );
  let m = materials[u32(aux_in[o + 9u])];
  let tau = particle_stress(f, aux_in[o + 10u], m);
  let q = i * 12u;
  aux_out[q + 0u] = tau[0][0];
  aux_out[q + 1u] = tau[1][0];
  aux_out[q + 2u] = tau[2][0];
  aux_out[q + 3u] = tau[0][1];
  aux_out[q + 4u] = tau[1][1];
  aux_out[q + 5u] = tau[2][1];
  aux_out[q + 6u] = tau[0][2];
  aux_out[q + 7u] = tau[1][2];
  aux_out[q + 8u] = tau[2][2];
  aux_out[q + 9u] = 0.0;
  aux_out[q + 10u] = 0.0;
  aux_out[q + 11u] = 0.0;
}

@compute @workgroup_size(64)
fn material_fixtures(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  let n_fixtures = params.n_particles; // harness reuses the count slot
  if (i >= n_fixtures) {
    return;
  }
  let o = i * 12u;
  // Rows in, columns stored — mat3x3f is column-major.
  let f_trial = mat3x3f(
    vec3f(aux_in[o + 0u], aux_in[o + 3u], aux_in[o + 6u]),
    vec3f(aux_in[o + 1u], aux_in[o + 4u], aux_in[o + 7u]),
    vec3f(aux_in[o + 2u], aux_in[o + 5u], aux_in[o + 8u]),
  );
  let mode = u32(aux_in[o + 9u]);
  var jp = aux_in[o + 10u];
  let m = materials[mode];

  var f_out: mat3x3f;
  var case_id = 0.0;
  if (mode == 1u) {
    f_out = snow_return_map(f_trial, &jp, m);
  } else {
    // Classify (mirrors sand_return_map's branches) for the invariant check.
    let s = svd3(f_trial);
    let sig = clamp(abs(s.sigma), vec3f(1e-6), vec3f(1e6));
    let eps = log(sig);
    let tr_eps = eps.x + eps.y + eps.z;
    let eps_hat = eps - vec3f(tr_eps / 3.0);
    let ehn = length(eps_hat);
    let dg = ehn + m.alpha * tr_eps * (3.0 * m.lam0 + 2.0 * m.mu0) / (2.0 * m.mu0);
    if (tr_eps > 0.0) {
      case_id = 2.0;
    } else if (dg <= 0.0 || ehn < 1e-12) {
      case_id = 1.0;
    } else {
      case_id = 3.0;
    }
    f_out = sand_return_map(f_trial, m);
  }
  let s_out = svd3(f_out);
  let q = i * 16u;
  // Store F_out row-major (transpose of column-major access).
  aux_out[q + 0u] = f_out[0][0];
  aux_out[q + 1u] = f_out[1][0];
  aux_out[q + 2u] = f_out[2][0];
  aux_out[q + 3u] = f_out[0][1];
  aux_out[q + 4u] = f_out[1][1];
  aux_out[q + 5u] = f_out[2][1];
  aux_out[q + 6u] = f_out[0][2];
  aux_out[q + 7u] = f_out[1][2];
  aux_out[q + 8u] = f_out[2][2];
  aux_out[q + 9u] = s_out.sigma.x;
  aux_out[q + 10u] = s_out.sigma.y;
  aux_out[q + 11u] = s_out.sigma.z;
  aux_out[q + 12u] = case_id;
  aux_out[q + 13u] = jp;
  aux_out[q + 14u] = det3(f_trial);
  aux_out[q + 15u] = 0.0;
}
