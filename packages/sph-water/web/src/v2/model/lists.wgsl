// Water in Hand — the live DFSPH solver's neighbour lists, and the glass.
//
// The live solver is the shipped one (packages/sph-water/src/dfsph_solver.wgsl,
// Bender & Koschier 2015 with the 2026-07 live recipe), run on the shipped
// broadphase (packages/sph-water/src/sph_core.wgsl: counting sort, per-cell
// ascending-id sort, CSR cell_start). The shipped gathers walk the 3×3×3
// cell stencil in every one of their ~26 passes a step; at the support-2h
// kernel with h = 1.2 spacing that is ~370 candidates for ~57 neighbours,
// so neighbour search dominates (08-sph-water.md, performance).
//
// nbr_build walks the stencil once a step — the same nine row ranges in the
// same order, skipping the same self slot, keeping the same strict
// r² < (2h)² support test — and writes each particle's neighbour indices in
// that order. The l_* entry points below are the shipped passes with their
// stencil loop replaced by a walk of that list: every expression is copied
// from dfsph_solver.wgsl unchanged and the neighbours arrive in the same
// order, so the float sums are the same sums (the acceptance run compares
// the two solvers' bytes). pos[j] is the value the shipped passes read as
// pos_sorted[slot] (reorder copies it; nothing writes pos between the grid
// build and df_integrate).
//
// Layout: neighbour k of particle i is nbr[k * stride + i] (k-major), so a
// wave's 64 threads read 64 consecutive words for each k — the i-major layout
// (nbr[i * K + k]) touches 64 cache lines per load: a step at 193k took 3.7× as long.
// A particle with more than K neighbours keeps the first K and raises
// lflags[0] (the UI reports it; never seen at the live recipe's densities).
//
// Memory order: as the water mixes, particles that are neighbours in space
// drift apart in memory and every gather slows (measured ×1.7 after 2.5 s of
// splashing). Every 32 steps the particle arrays are permuted into the grid's
// cell order (resort_gather / resort_commit). Each particle carries its
// original index (orig), and cell_sort_orig orders a cell's members by it —
// the shipped cell_sort orders them by array index, which is the original
// index while nothing has been permuted — so the neighbours of every particle
// are visited in the shipped order whatever the memory order: the same sums,
// the same bytes, particle for particle.

const PI: f32 = 3.14159265358979323846;

// The shipped LiveParams (dfsph_solver.wgsl), byte for byte.
struct LiveParams {
  n: u32,
  nx: u32,
  ny: u32,
  nz: u32,
  n_cells: u32,
  warm_start: u32,
  cell_inv: f32,
  h: f32,
  origin: vec3<f32>,
  dt: f32,
  gravity: vec3<f32>,
  mass: f32,
  box_min: vec3<f32>,
  rho0: f32,
  box_max: vec3<f32>,
  xsph_alpha: f32,
  obstacle: vec4<f32>,
  impulse_pos: vec4<f32>,
  impulse_vel: vec4<f32>,
  restitution: f32,
  friction: f32,
  kappa_clamp: f32,
  surface_ncount: f32,
  vmax: f32,
  _pad0: f32,
  _pad1: f32,
  _pad2: f32,
};

// x = K (list capacity per particle), y = stride (the buffers' particle capacity)
struct ListParams {
  k: vec4<u32>,
};

// The glass: a vertical cylinder of inner radius `radius` around (cx, cz)
// standing on y = floor, open upwards.
struct GlassParams {
  // x = centre x, y = centre z, z = inner radius, w = floor height
  shape: vec4<f32>,
  // x = restitution, y = friction, z = wall gap (eps), w = particle count (as f32)
  wall: vec4<f32>,
};

// x = particles to move
struct DropParams {
  n: vec4<u32>,
};

@group(0) @binding(0) var<uniform> L: LiveParams;
@group(0) @binding(1) var<storage, read_write> pos: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> vel: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> vel_out: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read_write> part_aux: array<vec4<f32>>;
@group(0) @binding(5) var<storage, read_write> kappa: array<f32>;
@group(0) @binding(6) var<storage, read_write> kappa_total: array<f32>;
@group(0) @binding(7) var<storage, read_write> pos_sorted: array<vec4<f32>>;
@group(0) @binding(8) var<storage, read_write> sorted_idx: array<u32>;
@group(0) @binding(9) var<storage, read_write> cell_start: array<u32>;
@group(0) @binding(10) var<storage, read_write> nbr: array<u32>;
@group(0) @binding(11) var<storage, read_write> nbr_count: array<u32>;
@group(0) @binding(12) var<uniform> LP: ListParams;
@group(0) @binding(13) var<storage, read_write> lflags: array<atomic<u32>>;
@group(0) @binding(14) var<uniform> G: GlassParams;
@group(0) @binding(15) var<uniform> D: DropParams;
@group(0) @binding(16) var<storage, read_write> drop_idx: array<u32>;
@group(0) @binding(17) var<storage, read_write> drop_pos: array<vec4<f32>>;
// each particle's original index, carried through every permutation
@group(0) @binding(19) var<storage, read_write> orig: array<u32>;
@group(0) @binding(20) var<storage, read_write> orig_tmp: array<u32>;
// ρ_i alone (part_aux[i].x, written beside it by l_density_alpha): the
// gathers that need only a neighbour's density load 4 bytes instead of 16.
// The same value through a narrower load: the arithmetic is unchanged.
@group(0) @binding(22) var<storage, read_write> rho_of: array<f32>;
// Every κ the two solves apply to particle i, summed over iterations and
// steps until the instruments reset it: ρ_i · Σκ / steps is the pressure that
// held the particle up on average (the pressure acceleration over a step is
// −Δt Σ_j m_j (κ_i/ρ_i + κ_j/ρ_j) ∇W_ij, i.e. p = κρ). A side write: the
// solver never reads it.
@group(0) @binding(23) var<storage, read_write> kappa_sum: array<f32>;

// The shipped per-cell insertion sort (sph_core.wgsl cell_sort), keyed by the
// original index instead of the array index; lflags[1] = saturated.
const SORT_CAP: u32 = 1024u;

@compute @workgroup_size(64)
fn cell_sort_orig(@builtin(global_invocation_id) gid: vec3<u32>) {
  let c = gid.x;
  if (c >= L.n_cells) { return; }
  let start = cell_start[c];
  var count = cell_start[c + 1u] - start;
  if (count > SORT_CAP) {
    atomicStore(&lflags[1], 1u);
    count = SORT_CAP;
  }
  var k = 1u;
  loop {
    if (k >= count) { break; }
    let v = sorted_idx[start + k];
    let key = orig[v];
    var j = k;
    loop {
      if (j == 0u) { break; }
      let prev = sorted_idx[start + j - 1u];
      if (orig[prev] <= key) { break; }
      sorted_idx[start + j] = prev;
      j = j - 1u;
    }
    sorted_idx[start + j] = v;
    k = k + 1u;
  }
}

// The permutation into cell order, after a grid build: slot s takes the
// particle sorted_idx[s] (reorder already gathered pos and vel into
// pos_sorted / vel_sorted).
@compute @workgroup_size(64)
fn resort_gather(@builtin(global_invocation_id) gid: vec3<u32>) {
  let s = gid.x;
  if (s >= L.n) { return; }
  orig_tmp[s] = orig[sorted_idx[s]];
}

@compute @workgroup_size(64)
fn resort_commit(@builtin(global_invocation_id) gid: vec3<u32>) {
  let s = gid.x;
  if (s >= L.n) { return; }
  pos[s] = pos_sorted[s];
  vel[s] = vel_sorted[s];
  orig[s] = orig_tmp[s];
}
@group(0) @binding(21) var<storage, read_write> vel_sorted: array<vec4<f32>>;

fn kernel_f(q: f32) -> f32 {
  if (q < 1.0) { return 1.0 - 1.5 * q * q + 0.75 * q * q * q; }
  if (q < 2.0) { let d = 2.0 - q; return 0.25 * d * d * d; }
  return 0.0;
}
fn kernel_fprime(q: f32) -> f32 {
  if (q < 1.0) { return -3.0 * q + 2.25 * q * q; }
  if (q < 2.0) { let d = 2.0 - q; return -0.75 * d * d; }
  return 0.0;
}

fn cell_coord(p: vec3<f32>) -> vec3<i32> {
  let c = vec3<i32>(floor((p - L.origin) * L.cell_inv));
  return clamp(c, vec3<i32>(0), vec3<i32>(i32(L.nx) - 1, i32(L.ny) - 1, i32(L.nz) - 1));
}
fn cell_id(c: vec3<i32>) -> u32 {
  return u32(c.x) + L.nx * (u32(c.y) + L.ny * u32(c.z));
}

// The shipped stencil walk, once: neighbours in the shipped visiting order.
@compute @workgroup_size(64)
fn nbr_build(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= L.n) { return; }
  let h = L.h;
  let pi_ = pos[i].xyz;
  let support_sq = 4.0 * h * h;
  let kcap = LP.k.x;
  let stride = LP.k.y;
  var count = 0u;
  var over = false;
  let cc = cell_coord(pi_);
  let z0 = max(cc.z - 1, 0); let z1 = min(cc.z + 1, i32(L.nz) - 1);
  let y0 = max(cc.y - 1, 0); let y1 = min(cc.y + 1, i32(L.ny) - 1);
  let x0 = max(cc.x - 1, 0); let x1 = min(cc.x + 1, i32(L.nx) - 1);
  for (var cz = z0; cz <= z1; cz = cz + 1) {
    for (var cy = y0; cy <= y1; cy = cy + 1) {
      let s = cell_start[cell_id(vec3<i32>(x0, cy, cz))];
      let e = cell_start[cell_id(vec3<i32>(x1, cy, cz)) + 1u];
      for (var slot = s; slot < e; slot = slot + 1u) {
        let j = sorted_idx[slot];
        if (j == i) { continue; }
        let r = pi_ - pos_sorted[slot].xyz;
        let d2 = dot(r, r);
        if (d2 < support_sq) {
          if (count < kcap) {
            nbr[count * stride + i] = j;
            count = count + 1u;
          } else {
            over = true;
          }
        }
      }
    }
  }
  nbr_count[i] = count;
  if (over) { atomicAdd(&lflags[0], 1u); }
}

// df_density_alpha over the list.
@compute @workgroup_size(64)
fn l_density_alpha(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= L.n) { return; }
  let h = L.h;
  let pi_ = pos[i].xyz;
  let support_sq = 4.0 * h * h;
  let sig_h3 = (1.0 / PI) / (h * h * h);
  let sig_h4 = (1.0 / PI) / (h * h * h * h);
  var rho = L.mass * sig_h3;
  var sum_grad = vec3<f32>(0.0);
  var sum_grad2 = 0.0;
  var ncount = 0.0;
  let stride = LP.k.y;
  let cnt = nbr_count[i];
  for (var k = 0u; k < cnt; k = k + 1u) {
    let j = nbr[k * stride + i];
    let r = pi_ - pos[j].xyz;
    let d2 = dot(r, r);
    if (d2 < support_sq && d2 > 0.0) {
      let mag = sqrt(d2);
      let q = mag / h;
      rho = rho + L.mass * sig_h3 * kernel_f(q);
      let mg = L.mass * (sig_h4 * kernel_fprime(q) * (r / mag));
      sum_grad = sum_grad + mg;
      sum_grad2 = sum_grad2 + dot(mg, mg);
      ncount = ncount + 1.0;
    }
  }
  let denom = max(dot(sum_grad, sum_grad) + sum_grad2, 1e-6);
  part_aux[i] = vec4<f32>(rho, rho / denom, ncount, 0.0);
  rho_of[i] = rho;
}

// df_xsph over the list.
@compute @workgroup_size(64)
fn l_xsph(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= L.n) { return; }
  let h = L.h;
  let pi_ = pos[i].xyz;
  let vi = vel[i].xyz;
  let support_sq = 4.0 * h * h;
  let sig_h3 = (1.0 / PI) / (h * h * h);
  var dv = vec3<f32>(0.0);
  let stride = LP.k.y;
  let cnt = nbr_count[i];
  for (var k = 0u; k < cnt; k = k + 1u) {
    let j = nbr[k * stride + i];
    let r = pi_ - pos[j].xyz;
    let d2 = dot(r, r);
    if (d2 < support_sq) {
      let q = sqrt(d2) / h;
      let rho_j = max(rho_of[j], 1e-6);
      dv = dv + (L.mass / rho_j) * (vel[j].xyz - vi) * sig_h3 * kernel_f(q);
    }
  }
  vel_out[i] = vec4<f32>(vi + L.xsph_alpha * dv, vel[i].w);
}

// df_predict_density over the list.
@compute @workgroup_size(64)
fn l_predict_density(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= L.n) { return; }
  let h = L.h;
  let pi_ = pos[i].xyz;
  let vi = vel_out[i].xyz;
  let support_sq = 4.0 * h * h;
  let sig_h4 = (1.0 / PI) / (h * h * h * h);
  var drho = 0.0;
  let stride = LP.k.y;
  let cnt = nbr_count[i];
  for (var k = 0u; k < cnt; k = k + 1u) {
    let j = nbr[k * stride + i];
    let r = pi_ - pos[j].xyz;
    let d2 = dot(r, r);
    if (d2 < support_sq && d2 > 0.0) {
      let mag = sqrt(d2);
      let grad = sig_h4 * kernel_fprime(mag / h) * (r / mag);
      drho = drho + L.mass * dot(vi - vel_out[j].xyz, grad);
    }
  }
  let aux = part_aux[i];
  let rho_star = aux.x + L.dt * drho;
  let err = max(rho_star - L.rho0, 0.0); // correct compression only (no clumping)
  var k = err * aux.y / (L.dt * L.dt);
  k = clamp(k, 0.0, L.kappa_clamp);
  kappa[i] = k;
  kappa_total[i] = kappa_total[i] + k;
  kappa_sum[i] = kappa_sum[i] + k;
  part_aux[i] = vec4<f32>(aux.xyz, err);
}

// df_predict_divergence over the list.
@compute @workgroup_size(64)
fn l_predict_divergence(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= L.n) { return; }
  let h = L.h;
  let pi_ = pos[i].xyz;
  let vi = vel_out[i].xyz;
  let support_sq = 4.0 * h * h;
  let sig_h4 = (1.0 / PI) / (h * h * h * h);
  var drho = 0.0;
  let stride = LP.k.y;
  let cnt = nbr_count[i];
  for (var k = 0u; k < cnt; k = k + 1u) {
    let j = nbr[k * stride + i];
    let r = pi_ - pos[j].xyz;
    let d2 = dot(r, r);
    if (d2 < support_sq && d2 > 0.0) {
      let mag = sqrt(d2);
      let grad = sig_h4 * kernel_fprime(mag / h) * (r / mag);
      drho = drho + L.mass * dot(vi - vel_out[j].xyz, grad);
    }
  }
  let aux = part_aux[i];
  var d = max(drho, 0.0);
  if (aux.z < L.surface_ncount) { d = 0.0; }
  var k = d * aux.y / L.dt;
  k = clamp(k, 0.0, L.kappa_clamp);
  kappa[i] = k;
  kappa_sum[i] = kappa_sum[i] + k;
  part_aux[i] = vec4<f32>(aux.xyz, max(drho, 0.0));
}

// df_apply_kappa over the list. (Precomputing κ_j/ρ_j once per particle
// reads less memory but rounds differently: the shipped pass's division is
// fused into its sum. The shipped expression is kept, byte for byte.)
@compute @workgroup_size(64)
fn l_apply_kappa(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= L.n) { return; }
  let h = L.h;
  let pi_ = pos[i].xyz;
  let support_sq = 4.0 * h * h;
  let sig_h4 = (1.0 / PI) / (h * h * h * h);
  let ki = kappa[i] / max(rho_of[i], 1e-6);
  var dv = vec3<f32>(0.0);
  let stride = LP.k.y;
  let cnt = nbr_count[i];
  for (var k = 0u; k < cnt; k = k + 1u) {
    let j = nbr[k * stride + i];
    let r = pi_ - pos[j].xyz;
    let d2 = dot(r, r);
    if (d2 < support_sq && d2 > 0.0) {
      let mag = sqrt(d2);
      let grad = sig_h4 * kernel_fprime(mag / h) * (r / mag);
      let kj = kappa[j] / max(rho_of[j], 1e-6);
      dv = dv - L.dt * L.mass * (ki + kj) * grad;
    }
  }
  vel_out[i] = vec4<f32>(vel_out[i].xyz + dv, vel_out[i].w);
}

// The glass wall and floor, after df_integrate (which keeps its shipped box,
// here the glass's bounding box): position projection and the shipped
// restitution / friction velocity response.
@compute @workgroup_size(64)
fn glass_constrain(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (f32(i) >= G.wall.w) { return; }
  var p = pos[i].xyz;
  var v = vel_out[i].xyz;
  let e = G.wall.x;
  let fr = G.wall.y;
  let gap = G.wall.z;
  let rad = vec2<f32>(p.x - G.shape.x, p.z - G.shape.y);
  let rr = length(rad);
  let lim = G.shape.z - gap;
  if (rr > lim && rr > 0.0) {
    let nr = rad / rr;
    p = vec3<f32>(G.shape.x + nr.x * lim, p.y, G.shape.y + nr.y * lim);
    let vn = v.x * nr.x + v.z * nr.y;
    if (vn > 0.0) {
      v = vec3<f32>(v.x - (1.0 + e) * vn * nr.x, v.y, v.z - (1.0 + e) * vn * nr.y);
    }
    v = v * (1.0 - fr);
  }
  if (p.y < G.shape.w + gap) {
    p.y = G.shape.w + gap;
    if (v.y < 0.0) { v.y = -v.y * e; }
    v = v * (1.0 - fr);
  }
  pos[i] = vec4<f32>(p, pos[i].w);
  vel_out[i] = vec4<f32>(v, vel_out[i].w);
}

// The step's last copy, inside the pass: vel <- vel_out (v1 copied the buffer).
@compute @workgroup_size(64)
fn commit_vel(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= L.n) { return; }
  vel[i] = vel_out[i];
}

// A drop: move the chosen particles to the blob above the glass, at rest.
@compute @workgroup_size(64)
fn drop_scatter(@builtin(global_invocation_id) gid: vec3<u32>) {
  let k = gid.x;
  if (k >= D.n.x) { return; }
  let i = drop_idx[k];
  pos[i] = vec4<f32>(drop_pos[k].xyz, pos[i].w);
  vel[i] = vec4<f32>(0.0, 0.0, 0.0, vel[i].w);
  kappa_total[i] = 0.0;
}
