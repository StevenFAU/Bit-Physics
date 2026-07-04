// SPH water — gated verified core (Stack B WGSL).
//
// Faithful f32 port of the Phase-1-scope NumPy reference at
// packages/sph-water/sph_water/reference/dfsph.py:
//   - 3D Monaghan cubic-spline kernel, SUPPORT 2h, sigma_3 = 1/(pi h^3)
//     (Monaghan 1992/2005 eq. 2.7 — the repo golden-table convention;
//     NOT the SPlisHSPlasH support-h 8/(pi h^3) convention).
//   - SPH density rho_i = sum_j m_j W (self term included).
//   - SPH continuity drho_i/dt = sum_j m_j (v_i - v_j) . grad_i W
//     (Bender & Koschier 2015 eq. (5)).
//   - The simplified divergence corrector (divergence_free_solve):
//     fixed cap + <= tolerance, symmetric 0.5*(drho_i - drho_j) pair
//     correction — fixture scale, single-invocation (mirrors the
//     reference's sequential pair order exactly).
//   - The canonical integrator (packages/sph-water/sph_water/sim.py
//     _canonical_step): explicit Euler, gravity along z only —
//     v.z += g_z*dt; p += dt*v. This is what produced the committed
//     capture captures/sph-water-ref/dam-break-100K-particles-seed42-step1000.h5
//     (with h = CANONICAL_H = 0.026 — sim.py line 172; the manifest's
//     params.h = 0.05 records the diagnostic default, not what ran).
//
// Neighbor search: uniform grid, CELL SIZE = SUPPORT RADIUS = 2h,
// counting-sort binning (Hoetzlein GTC 2014): histogram -> two-level
// Blelloch exclusive scan (Harris/Sengupta, GPU Gems 3 ch. 39) ->
// scatter -> per-cell id-sort -> reorder. cell_start is CSR-shaped
// (n_cells + 1 entries; the sentinel holds n), so every 3x3x3 stencil
// row [c_lo .. c_hi] is one contiguous sorted range
// [cell_start[c_lo], cell_start[c_hi + 1]) — 9 row-merged range walks
// instead of 27 cell lookups (WebGPU-Ocean / Hoetzlein pattern).
// The per-cell ascending-id sort restores the reference's sorted-by-id
// neighbor iteration order (P24 cause #1/#2 discipline) and makes every
// float gather run-twice byte-identical on a device: the atomic scatter
// cursor is the only order-nondeterministic stage, and the sort erases it.
//
// hash==brute determinism: the *_fp entry points accumulate the density
// sum as i32 fixed-point (round(contrib * FP_SCALE)); integer addition
// is associative, so the grid path and the O(n^2) brute oracle produce
// byte-identical i32 fields whenever they visit the same neighbor sets —
// the SHA-256 equality proof in the PROVE layer. Float atomics do not
// exist in WGSL; none are needed here (all sums are gathers), and the
// binning atomics are integer.

const PI: f32 = 3.14159265358979323846;
// Fixed-point scale for the hash==brute i32 accumulation. Contribution
// magnitudes are <= m * sigma3/h^3 (canonical: 18.1); i32 headroom
// allows |rho| up to ~21474 at this scale — far above any live spike.
const FP_SCALE: f32 = 100000.0;
// Per-cell id-sort cap. A cell beyond this count still contributes the
// exact neighbor set, but its within-cell order is left as scattered —
// the flags buffer records it and the UI downgrades the determinism
// posture (the boids-2d saturation-flag pattern). Uniform scenes sit
// ~14 particles/cell; 1024 is >70x headroom.
const SORT_CAP: u32 = 1024u;

struct SimParams {
  n: u32,
  nx: u32,
  ny: u32,
  nz: u32,
  n_cells: u32,
  _pad0: u32,
  cell_inv: f32,       // 1 / cell size; cell size = 2h
  h: f32,
  origin: vec3<f32>,   // grid origin (min corner)
  g_dt: f32,           // g_z * dt (canonical integrator increment)
  dt: f32,
  mass: f32,           // uniform particle mass (canonical: 1e-3)
  _pad1: f32,
  _pad2: f32,
};

@group(0) @binding(0) var<uniform> P: SimParams;
@group(0) @binding(1) var<storage, read_write> pos: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> vel: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> density: array<f32>;
@group(0) @binding(4) var<storage, read_write> cell_count: array<atomic<u32>>;
@group(0) @binding(5) var<storage, read_write> cell_start: array<u32>;   // n_cells + 1 (CSR)
@group(0) @binding(6) var<storage, read_write> cursor: array<atomic<u32>>;
@group(0) @binding(7) var<storage, read_write> sorted_idx: array<u32>;
@group(0) @binding(8) var<storage, read_write> cell_of: array<u32>;
@group(0) @binding(9) var<storage, read_write> pos_sorted: array<vec4<f32>>;
@group(0) @binding(10) var<storage, read_write> vel_sorted: array<vec4<f32>>;
@group(0) @binding(11) var<storage, read_write> counts_plain: array<u32>; // cell_count viewed non-atomically (scan input)
@group(0) @binding(12) var<storage, read_write> block_sums: array<u32>;
@group(0) @binding(13) var<storage, read_write> density_fp: array<i32>;
@group(0) @binding(14) var<storage, read_write> flags: array<atomic<u32>>; // [0] = sort saturated
@group(0) @binding(15) var<storage, read_write> drho: array<f32>;

// --- cubic-spline kernel (support 2h; Monaghan 1992/2005) -----------------
// f(q) piecewise factor — ports _f in packages/sph-water/sph_water/reference/dfsph.py.
fn kernel_f(q: f32) -> f32 {
  if (q < 1.0) { return 1.0 - 1.5 * q * q + 0.75 * q * q * q; }
  if (q < 2.0) { let d = 2.0 - q; return 0.25 * d * d * d; }
  return 0.0;
}

// f'(q) — ports _fprime in packages/sph-water/sph_water/reference/dfsph.py.
fn kernel_fprime(q: f32) -> f32 {
  if (q < 1.0) { return -3.0 * q + 2.25 * q * q; }
  if (q < 2.0) { let d = 2.0 - q; return -0.75 * d * d; }
  return 0.0;
}

// W(q, h) = sigma_3 / h^3 * f(q), sigma_3 = 1/pi — ports W().
fn kernel_W(q: f32, h: f32) -> f32 {
  return (1.0 / PI) / (h * h * h) * kernel_f(q);
}

// |grad W|(q, h) = sigma_3 / h^4 * |f'(q)| — ports grad_W_magnitude().
fn kernel_gradW_mag(q: f32, h: f32) -> f32 {
  return (1.0 / PI) / (h * h * h * h) * abs(kernel_fprime(q));
}

// --- grid helpers ----------------------------------------------------------
fn cell_coord(p: vec3<f32>) -> vec3<i32> {
  let c = vec3<i32>(floor((p - P.origin) * P.cell_inv));
  return clamp(c, vec3<i32>(0), vec3<i32>(i32(P.nx) - 1, i32(P.ny) - 1, i32(P.nz) - 1));
}

fn cell_id(c: vec3<i32>) -> u32 {
  return u32(c.x) + P.nx * (u32(c.y) + P.ny * u32(c.z));
}

// --- counting-sort broadphase ----------------------------------------------
@compute @workgroup_size(256)
fn clear_cells(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= P.n_cells) { return; }
  atomicStore(&cell_count[gid.x], 0u);
}

@compute @workgroup_size(64)
fn histogram(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= P.n) { return; }
  let c = cell_id(cell_coord(pos[i].xyz));
  cell_of[i] = c;
  atomicAdd(&cell_count[c], 1u);
}

// Two-level work-efficient Blelloch exclusive scan (GPU Gems 3 ch. 39).
// Level 0: each 256-thread workgroup scans 512 counts and emits its block
// total; level 1: one workgroup scans the (<= 512) block totals; level 2:
// each block adds its scanned offset. Capacity 512*512 = 262,144 cells —
// grid dims are always chosen to stay under this.
var<workgroup> scan_tmp: array<u32, 512>;

fn blelloch(lid: u32) {
  var offset = 1u;
  var d = 256u;
  loop {
    workgroupBarrier();
    if (lid < d) {
      let ai = offset * (2u * lid + 1u) - 1u;
      let bi = offset * (2u * lid + 2u) - 1u;
      scan_tmp[bi] = scan_tmp[bi] + scan_tmp[ai];
    }
    offset = offset * 2u;
    d = d / 2u;
    if (d == 0u) { break; }
  }
  workgroupBarrier();
  if (lid == 0u) { scan_tmp[511] = 0u; }
  d = 1u;
  offset = 256u;
  loop {
    workgroupBarrier();
    if (lid < d) {
      let ai = offset * (2u * lid + 1u) - 1u;
      let bi = offset * (2u * lid + 2u) - 1u;
      let t = scan_tmp[ai];
      scan_tmp[ai] = scan_tmp[bi];
      scan_tmp[bi] = scan_tmp[bi] + t;
    }
    d = d * 2u;
    offset = offset / 2u;
    if (offset == 0u) { break; }
  }
  workgroupBarrier();
}

fn load_count(idx: u32, limit: u32) -> u32 {
  if (idx >= limit) { return 0u; }
  return counts_plain[idx];
}

@compute @workgroup_size(256)
fn scan_blocks(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
  let base = wid.x * 512u;
  scan_tmp[lid.x] = load_count(base + lid.x, P.n_cells);
  scan_tmp[lid.x + 256u] = load_count(base + lid.x + 256u, P.n_cells);
  workgroupBarrier();
  // Block total = exclusive-scan value at the last slot + the original
  // last element; keep the original before the in-place scan destroys it.
  let orig_last = scan_tmp[511];
  blelloch(lid.x);
  if (base + lid.x < P.n_cells) { cell_start[base + lid.x] = scan_tmp[lid.x]; }
  if (base + lid.x + 256u < P.n_cells) { cell_start[base + lid.x + 256u] = scan_tmp[lid.x + 256u]; }
  if (lid.x == 0u) { block_sums[wid.x] = scan_tmp[511] + orig_last; }
}

fn load_block(idx: u32, limit: u32) -> u32 {
  if (idx >= limit) { return 0u; }
  return block_sums[idx];
}

@compute @workgroup_size(256)
fn scan_block_sums(@builtin(local_invocation_id) lid: vec3<u32>) {
  let n_blocks = (P.n_cells + 511u) / 512u;
  scan_tmp[lid.x] = load_block(lid.x, n_blocks);
  scan_tmp[lid.x + 256u] = load_block(lid.x + 256u, n_blocks);
  workgroupBarrier();
  blelloch(lid.x);
  if (lid.x < n_blocks) { block_sums[lid.x] = scan_tmp[lid.x]; }
  if (lid.x + 256u < n_blocks) { block_sums[lid.x + 256u] = scan_tmp[lid.x + 256u]; }
}

@compute @workgroup_size(256)
fn scan_add_offsets(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= P.n_cells) { return; }
  cell_start[gid.x] = cell_start[gid.x] + block_sums[gid.x / 512u];
}

@compute @workgroup_size(256)
fn seed_cursor(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= P.n_cells) { return; }
  atomicStore(&cursor[gid.x], cell_start[gid.x]);
  if (gid.x == 0u) { cell_start[P.n_cells] = P.n; } // CSR sentinel
}

@compute @workgroup_size(64)
fn scatter(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= P.n) { return; }
  let slot = atomicAdd(&cursor[cell_of[i]], 1u);
  sorted_idx[slot] = i;
}

// Per-cell ascending-id insertion sort — restores the reference's
// deterministic sorted-by-id iteration order after the atomic scatter.
@compute @workgroup_size(64)
fn cell_sort(@builtin(global_invocation_id) gid: vec3<u32>) {
  let c = gid.x;
  if (c >= P.n_cells) { return; }
  let start = cell_start[c];
  var count = cell_start[c + 1u] - start;
  if (count > SORT_CAP) {
    atomicStore(&flags[0], 1u);
    count = SORT_CAP;
  }
  var k = 1u;
  loop {
    if (k >= count) { break; }
    let v = sorted_idx[start + k];
    var j = k;
    loop {
      if (j == 0u) { break; }
      let prev = sorted_idx[start + j - 1u];
      if (prev <= v) { break; }
      sorted_idx[start + j] = prev;
      j = j - 1u;
    }
    sorted_idx[start + j] = v;
    k = k + 1u;
  }
}

@compute @workgroup_size(64)
fn reorder(@builtin(global_invocation_id) gid: vec3<u32>) {
  let slot = gid.x;
  if (slot >= P.n) { return; }
  let i = sorted_idx[slot];
  pos_sorted[slot] = pos[i];
  vel_sorted[slot] = vel[i];
}

// --- density (float gather; grid path) --------------------------------------
// Ports the reference density semantics: self term m_i * sigma3/h^3 FIRST,
// then neighbor contributions in deterministic order (cell-major, ascending
// id within cell). Strict r^2 < (2h)^2 support test matches neighbor_lists.
@compute @workgroup_size(64)
fn density_grid(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= P.n) { return; }
  let h = P.h;
  let pi_ = pos[i].xyz;
  let support_sq = 4.0 * h * h;
  let sig_h3 = (1.0 / PI) / (h * h * h);
  var rho = P.mass * sig_h3;
  let cc = cell_coord(pi_);
  let z0 = max(cc.z - 1, 0); let z1 = min(cc.z + 1, i32(P.nz) - 1);
  let y0 = max(cc.y - 1, 0); let y1 = min(cc.y + 1, i32(P.ny) - 1);
  let x0 = max(cc.x - 1, 0); let x1 = min(cc.x + 1, i32(P.nx) - 1);
  for (var cz = z0; cz <= z1; cz = cz + 1) {
    for (var cy = y0; cy <= y1; cy = cy + 1) {
      let s = cell_start[cell_id(vec3<i32>(x0, cy, cz))];
      let e = cell_start[cell_id(vec3<i32>(x1, cy, cz)) + 1u];
      for (var slot = s; slot < e; slot = slot + 1u) {
        if (sorted_idx[slot] == i) { continue; }
        let r = pi_ - pos_sorted[slot].xyz;
        let d2 = dot(r, r);
        if (d2 < support_sq) {
          let q = sqrt(d2) / h;
          rho = rho + P.mass * sig_h3 * kernel_f(q);
        }
      }
    }
  }
  density[i] = rho;
}

// --- density (i32 fixed-point; grid path) — hash==brute proof ---------------
@compute @workgroup_size(64)
fn density_grid_fp(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= P.n) { return; }
  let h = P.h;
  let pi_ = pos[i].xyz;
  let support_sq = 4.0 * h * h;
  let sig_h3 = (1.0 / PI) / (h * h * h);
  var acc: i32 = i32(round(P.mass * sig_h3 * FP_SCALE));
  let cc = cell_coord(pi_);
  let z0 = max(cc.z - 1, 0); let z1 = min(cc.z + 1, i32(P.nz) - 1);
  let y0 = max(cc.y - 1, 0); let y1 = min(cc.y + 1, i32(P.ny) - 1);
  let x0 = max(cc.x - 1, 0); let x1 = min(cc.x + 1, i32(P.nx) - 1);
  for (var cz = z0; cz <= z1; cz = cz + 1) {
    for (var cy = y0; cy <= y1; cy = cy + 1) {
      let s = cell_start[cell_id(vec3<i32>(x0, cy, cz))];
      let e = cell_start[cell_id(vec3<i32>(x1, cy, cz)) + 1u];
      for (var slot = s; slot < e; slot = slot + 1u) {
        if (sorted_idx[slot] == i) { continue; }
        let r = pi_ - pos_sorted[slot].xyz;
        let d2 = dot(r, r);
        if (d2 < support_sq) {
          let q = sqrt(d2) / h;
          acc = acc + i32(round(P.mass * sig_h3 * kernel_f(q) * FP_SCALE));
        }
      }
    }
  }
  density_fp[i] = acc;
}

// --- density (i32 fixed-point; O(n^2) brute oracle) --------------------------
// Same contribution expression, same strict support test, every j visited.
// i32 addition is associative, so iteration order cannot matter — byte
// equality with density_grid_fp proves the grid visits exactly the same
// neighbor set.
@compute @workgroup_size(64)
fn density_brute_fp(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= P.n) { return; }
  let h = P.h;
  let pi_ = pos[i].xyz;
  let support_sq = 4.0 * h * h;
  let sig_h3 = (1.0 / PI) / (h * h * h);
  var acc: i32 = i32(round(P.mass * sig_h3 * FP_SCALE));
  for (var j = 0u; j < P.n; j = j + 1u) {
    if (j == i) { continue; }
    let r = pi_ - pos[j].xyz;
    let d2 = dot(r, r);
    if (d2 < support_sq) {
      let q = sqrt(d2) / h;
      acc = acc + i32(round(P.mass * sig_h3 * kernel_f(q) * FP_SCALE));
    }
  }
  density_fp[i] = acc;
}

// --- SPH continuity drho_i/dt (grid path) ------------------------------------
// Ports density_evolution per-pair op order exactly: r_hat = r/|r|
// (3 divisions) -> grad = sigma3/h^4 * f'(q) * r_hat -> dot(v_rel, grad)
// -> contrib = m_j * dot.
@compute @workgroup_size(64)
fn continuity_grid(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= P.n) { return; }
  let h = P.h;
  let pi_ = pos[i].xyz;
  let vi = vel[i].xyz;
  let support_sq = 4.0 * h * h;
  let sig_h4 = (1.0 / PI) / (h * h * h * h);
  var acc: f32 = 0.0;
  let cc = cell_coord(pi_);
  let z0 = max(cc.z - 1, 0); let z1 = min(cc.z + 1, i32(P.nz) - 1);
  let y0 = max(cc.y - 1, 0); let y1 = min(cc.y + 1, i32(P.ny) - 1);
  let x0 = max(cc.x - 1, 0); let x1 = min(cc.x + 1, i32(P.nx) - 1);
  for (var cz = z0; cz <= z1; cz = cz + 1) {
    for (var cy = y0; cy <= y1; cy = cy + 1) {
      let s = cell_start[cell_id(vec3<i32>(x0, cy, cz))];
      let e = cell_start[cell_id(vec3<i32>(x1, cy, cz)) + 1u];
      for (var slot = s; slot < e; slot = slot + 1u) {
        if (sorted_idx[slot] == i) { continue; }
        let r = pi_ - pos_sorted[slot].xyz;
        let d2 = dot(r, r);
        if (d2 < support_sq && d2 > 0.0) {
          let mag = sqrt(d2);
          let q = mag / h;
          let r_hat = r / mag;
          let grad = sig_h4 * kernel_fprime(q) * r_hat;
          let v_rel = vi - vel_sorted[slot].xyz;
          acc = acc + P.mass * dot(v_rel, grad);
        }
      }
    }
  }
  drho[i] = acc;
}

// --- canonical integrator (the committed capture's step) --------------------
// Ports sph_water/sim.py _canonical_step: explicit Euler + gravity along z.
// The reference computes drho/dt and DISCARDS it each step; the replay
// omits the discard (bit-identical trajectory either way) and evaluates
// density only at the 11 gate checkpoints — same observable surface.
@compute @workgroup_size(64)
fn integrate_canonical(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= P.n) { return; }
  var v = vel[i];
  v.z = v.z + P.g_dt;
  vel[i] = v;
  pos[i] = vec4<f32>(pos[i].xyz + P.dt * v.xyz, pos[i].w);
}

// --- golden-table kernel evaluation ------------------------------------------
// Evaluates W and |grad W| at committed (q, h) sample points on this GPU —
// compared in-page against tools/testkit/golden/tables/cubic-spline-kernel.json.
@group(0) @binding(20) var<storage, read_write> kernel_in: array<vec2<f32>>;
@group(0) @binding(21) var<storage, read_write> kernel_out: array<vec2<f32>>;

@compute @workgroup_size(16)
fn kernel_eval(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= arrayLength(&kernel_in)) { return; }
  let q = kernel_in[i].x;
  let h = kernel_in[i].y;
  kernel_out[i] = vec2<f32>(kernel_W(q, h), kernel_gradW_mag(q, h));
}

// --- divergence corrector, fixture scale --------------------------------------
// Single-invocation port of divergence_free_solve for N <= 64: the
// reference's sequential pair order (i ascending, j > i ascending) is
// reproduced exactly; fixed cap + <= tolerance semantics preserved.
// Fixture-tier only (PROVE panel + f64-mirror cross-check) — never in the
// live loop.
struct CorrectorParams {
  n: u32,
  max_iter: u32,
  _pad0: u32,
  _pad1: u32,
  h: f32,
  tolerance: f32,
  rho_0: f32,
  _pad2: f32,
};
@group(0) @binding(22) var<uniform> CP: CorrectorParams;
@group(0) @binding(23) var<storage, read_write> fix_pos: array<vec4<f32>>;
@group(0) @binding(24) var<storage, read_write> fix_vel: array<vec4<f32>>;
@group(0) @binding(25) var<storage, read_write> fix_mass: array<f32>;
@group(0) @binding(26) var<storage, read_write> fix_out: array<f32>; // [0] = iterations used

@compute @workgroup_size(1)
fn corrector_fixture() {
  let n = CP.n;
  let h = CP.h;
  let support_sq = 4.0 * h * h;
  let sig_h4 = (1.0 / PI) / (h * h * h * h);
  var drho_l: array<f32, 64>;
  var dv: array<vec3<f32>, 64>;
  var iters = 0u;
  for (var it = 0u; it < CP.max_iter; it = it + 1u) {
    var max_abs = 0.0;
    for (var i = 0u; i < n; i = i + 1u) {
      var acc = 0.0;
      for (var j = 0u; j < n; j = j + 1u) {
        if (j == i) { continue; }
        let r = fix_pos[i].xyz - fix_pos[j].xyz;
        let d2 = dot(r, r);
        if (d2 < support_sq && d2 > 0.0) {
          let mag = sqrt(d2);
          let r_hat = r / mag;
          let grad = sig_h4 * kernel_fprime(mag / h) * r_hat;
          let v_rel = fix_vel[i].xyz - fix_vel[j].xyz;
          acc = acc + fix_mass[j] * dot(v_rel, grad);
        }
      }
      drho_l[i] = acc;
      max_abs = max(max_abs, abs(acc));
    }
    if (max_abs <= CP.tolerance) { break; }
    iters = it + 1u;
    for (var i = 0u; i < n; i = i + 1u) { dv[i] = vec3<f32>(0.0); }
    for (var i = 0u; i < n; i = i + 1u) {
      for (var j = i + 1u; j < n; j = j + 1u) {
        let r = fix_pos[i].xyz - fix_pos[j].xyz;
        let d2 = dot(r, r);
        if (d2 < support_sq && d2 > 0.0) {
          let mag = sqrt(d2);
          let r_hat = r / mag;
          let grad = sig_h4 * kernel_fprime(mag / h) * r_hat;
          let corr = 0.5 * (drho_l[i] - drho_l[j]);
          dv[i] = dv[i] - corr * grad * (fix_mass[j] / CP.rho_0);
          dv[j] = dv[j] + corr * grad * (fix_mass[i] / CP.rho_0);
        }
      }
    }
    for (var i = 0u; i < n; i = i + 1u) {
      fix_vel[i] = vec4<f32>(fix_vel[i].xyz + dv[i], fix_vel[i].w);
    }
  }
  fix_out[0] = f32(iters);
}
