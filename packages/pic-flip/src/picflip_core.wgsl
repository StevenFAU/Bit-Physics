// picflip_core.wgsl — WGSL port of the verified pic-flip reference
// (packages/pic-flip/pic_flip/reference/{apic,poisson_masked,regularizers}.py).
//
// Method: APIC (Jiang et al. 2015, DOI 10.1145/2766996) on a collocated
// grid, with PIC and FLIP as comparison modes sharing the identical
// P2G / grid / G2P scaffold. The pressure projection is the MASKED
// free-surface Poisson with the ADJOINT COMPACT operator pair —
// backward-difference divergence + forward-difference gradient — which
// composes to the compact 7-point Laplacian. The central/central pair
// fails free-surface hydrostatics at O(1) (a settled column retains
// ~g*dt/2 per step and sinks; derivation in
// docs/sim-specs/particle-fluids/pic-flip/algebraic.md § 4). This port
// MUST keep that pair (spec-ref § 3 / v0.3 item 1).
//
// Determinism contract (browser tier, spec-ref § 9): P2G is a
// fixed-point i32 atomic scatter — integer addition is associative, so
// the accumulation is order-independent and run-twice is byte-identical
// on the same device. Every other pass is either gather (one thread
// owns its output) or a fixed-order loop. The push-apart regularizer is
// the one DECLARED deviation from the reference: the reference sweep is
// sequential Gauss-Seidel in particle-id order (inherently serial); the
// port is a symmetric Jacobi accumulate over id-sorted CSR neighbor
// lists — deterministic (fixed traversal order), same fixed point at
// rest (invariant 6 inertness holds bit-for-bit: zero pairs closer than
// minDist means zero displacement in both schemes), but transient
// displacements differ; absorbed by the robust-observable gate budget,
// never by a bit-identity claim.
//
// Grid conventions (identical to the reference):
//   base = floor(x/dx + 0.5) - 1;  fp = x/dx - base  in [0.5, 1.5)
//   w0 = 0.5*(1.5-fp)^2   w1 = 0.75-(fp-1)^2   w2 = 0.5*(fp-0.5)^2
//   Dp = (1/4) dx^2 I  =>  C = (4/dx^2) * sum w v r^T   (affine_scale)
//   marker/count node = floor(x/dx + 0.5)  (cell ownership)
//   labels: 0 = AIR, 1 = FLUID, 2 = SOLID

struct SimParams {
  gravity: vec4<f32>,       // xyz used; gate scenes are (0,0,-9.81)
  obstacle: vec4<f32>,      // xyz center, w radius (<= 0 disables) — live only
  obstacle_vel: vec4<f32>,  // solid velocity inside the obstacle — live only
  nx: u32,
  ny: u32,
  nz: u32,
  n_cells: u32,
  n: u32,
  n_wall: u32,
  mode: u32,                // 0 = PIC, 1 = FLIP, 2 = APIC
  drift_on: u32,
  dx: f32,
  inv_dx: f32,
  dt: f32,
  rho: f32,
  fp_scale: f32,
  inv_fp_scale: f32,
  cfl: f32,
  drift_k: f32,
  flip_ratio: f32,          // 1.0 = pure FLIP (gate); <1 live-only pedagogy
  push_r: f32,              // particle radius r_p (minDist = 2 r_p)
  sor_omega: f32,           // live RBGS only
  rho_rest: f32,            // frame-0 measured max fluid density (host readback)
  lo: f32,                  // clamp box: n_wall*dx
  hi_x: f32,                // (nx-1-n_wall)*dx
  hi_y: f32,
  hi_z: f32,
  vmax: f32,                // live speed ceiling (gate: large sentinel, no-op)
  pad0: f32,
  pad1: f32,
  pad2: f32,
}

// Fixed-point P2G accumulator (the MPM PR #6 pattern): mass + momentum
// quanta. fp_scale is a power of two (2^21) so decode is an exact
// scaling; quantum 2^-21 ~ 4.8e-7. Overflow headroom is sized for the
// worst measured dense cell (gate scene max node mass ~ 8 => 128x
// headroom); wraparound under pathological live pileups is
// deterministic-but-wrong and is surfaced in the HUD honesty note.
struct GridAtom {
  m: atomic<i32>,
  mx: atomic<i32>,
  my: atomic<i32>,
  mz: atomic<i32>,
}

const LABEL_AIR: u32 = 0u;
const LABEL_FLUID: u32 = 1u;
const LABEL_SOLID: u32 = 2u;
const MODE_PIC: u32 = 0u;
const MODE_FLIP: u32 = 1u;
const MODE_APIC: u32 = 2u;
// Per-cell id-sort cap (the sph-water pattern); rest packing is 8
// particles/cell, so 96 only saturates under pathological pileups —
// saturation sets reduce[3] and is surfaced, never silent.
const SORT_CAP: u32 = 96u;
// reduce[] slots: 0 = max_speed bits, 1 = n_substeps, 2 = rho_rest bits,
// 3 = sort-saturated flag, 4 = max |div| bits (post-projection).
const R_MAXSPEED: u32 = 0u;
const R_NSUB: u32 = 1u;
const R_RHOREST: u32 = 2u;
const R_SORTSAT: u32 = 3u;
const R_MAXDIV: u32 = 4u;

@group(0) @binding(0) var<uniform> P: SimParams;
@group(0) @binding(1) var<storage, read_write> pos: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> vel: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> cmat: array<vec4<f32>>;   // 3 rows per particle
@group(0) @binding(4) var<storage, read_write> gatom: array<GridAtom>;
@group(0) @binding(5) var<storage, read_write> count: array<atomic<u32>>;
@group(0) @binding(6) var<storage, read_write> grid_vel: array<vec4<f32>>;     // xyz vel, w decoded mass
@group(0) @binding(7) var<storage, read_write> grid_vel_old: array<vec4<f32>>; // FLIP baseline (post-P2G, pre-force)
@group(0) @binding(8) var<storage, read_write> labels: array<u32>;
@group(0) @binding(9) var<storage, read_write> solid_vel: array<vec4<f32>>;
@group(0) @binding(10) var<storage, read_write> pr_in: array<f32>;
@group(0) @binding(11) var<storage, read_write> pr_out: array<f32>;
@group(0) @binding(12) var<storage, read_write> rhs: array<f32>;
@group(0) @binding(13) var<storage, read_write> known_in: array<u32>;
@group(0) @binding(14) var<storage, read_write> known_out: array<u32>;
@group(0) @binding(15) var<storage, read_write> reduce: array<atomic<u32>>;
@group(0) @binding(16) var<storage, read_write> counts_plain: array<u32>;      // count viewed non-atomically
@group(0) @binding(17) var<storage, read_write> cell_start: array<u32>;        // n_cells + 1 (CSR)
@group(0) @binding(18) var<storage, read_write> cursor: array<atomic<u32>>;
@group(0) @binding(19) var<storage, read_write> sorted_idx: array<u32>;
@group(0) @binding(20) var<storage, read_write> cell_of: array<u32>;
@group(0) @binding(21) var<storage, read_write> block_sums: array<u32>;
@group(0) @binding(22) var<storage, read_write> disp: array<vec4<f32>>;
@group(0) @binding(23) var<storage, read_write> paux: array<vec4<f32>>;        // x=p, y=density excess, z=div, w=|C|
@group(0) @binding(24) var<storage, read_write> aux_in: array<f32>;
@group(0) @binding(25) var<storage, read_write> aux_out: array<f32>;
@group(0) @binding(26) var<storage, read_write> misc: array<u32>;              // reduce viewed non-atomically
@group(0) @binding(27) var<storage, read_write> oracle: array<vec4<i32>>;      // lex-order P2G oracle (m, mx, my, mz)

// --- shape function -----------------------------------------------------
// ANCHOR: bspline_weights — identical closed form + base-node convention
// to the reference N(x) / p2g (apic.py) and the MLS-MPM golden.
fn bspline_weights(fp: f32) -> vec3<f32> {
  return vec3<f32>(
    0.5 * (1.5 - fp) * (1.5 - fp),
    0.75 - (fp - 1.0) * (fp - 1.0),
    0.5 * (fp - 0.5) * (fp - 0.5),
  );
}

fn bspline_n(x: f32) -> f32 {
  let ax = abs(x);
  if (ax < 0.5) { return 0.75 - x * x; }
  if (ax < 1.5) { return 0.5 * (1.5 - ax) * (1.5 - ax); }
  return 0.0;
}

fn node_id(i: i32, j: i32, k: i32) -> u32 {
  return u32(i) + P.nx * (u32(j) + P.ny * u32(k));
}

fn in_grid(i: i32, j: i32, k: i32) -> bool {
  return i >= 0 && i < i32(P.nx) && j >= 0 && j < i32(P.ny) && k >= 0 && k < i32(P.nz);
}

// Marker/count node: floor(x/dx + 0.5), clamped into the grid.
fn marker_node(p: vec3<f32>) -> vec3<i32> {
  let g = vec3<i32>(floor(p * P.inv_dx + vec3<f32>(0.5)));
  return clamp(g, vec3<i32>(0), vec3<i32>(i32(P.nx) - 1, i32(P.ny) - 1, i32(P.nz) - 1));
}

fn encode_fixed(x: f32) -> i32 { return i32(round(x * P.fp_scale)); }
fn decode_fixed(v: i32) -> f32 { return f32(v) * P.inv_fp_scale; }

// Order-independent f32 max via monotonic bit pattern (values >= 0 only).
fn atomic_max_f32(slot: u32, v: f32) {
  atomicMax(&reduce[slot], bitcast<u32>(max(v, 0.0)));
}

// --- per-step passes ------------------------------------------------------

@compute @workgroup_size(256)
fn clear_grid(@builtin(global_invocation_id) gid: vec3<u32>) {
  let c = gid.x;
  if (c >= P.n_cells) { return; }
  atomicStore(&gatom[c].m, 0);
  atomicStore(&gatom[c].mx, 0);
  atomicStore(&gatom[c].my, 0);
  atomicStore(&gatom[c].mz, 0);
  atomicStore(&count[c], 0u);
  if (c == 0u) {
    atomicStore(&reduce[R_MAXSPEED], 0u);
    atomicStore(&reduce[R_MAXDIV], 0u);
  }
}

// ANCHOR: p2g — affine P2G, lumped mass (apic.py p2g_3d). PIC/FLIP run the
// bit-identical scaffold with C treated as zero. Fixed-point i32 atomics:
// integer addition is associative => order-independent accumulation.
@compute @workgroup_size(64)
fn p2g(@builtin(global_invocation_id) gid: vec3<u32>) {
  let p = gid.x;
  if (p >= P.n) { return; }
  let xp = pos[p].xyz;
  let vp = vel[p].xyz;
  let m = 1.0; // unit marker masses (capture convention; density == grid mass)
  var c0 = vec4<f32>(0.0);
  var c1 = vec4<f32>(0.0);
  var c2 = vec4<f32>(0.0);
  if (P.mode == MODE_APIC) {
    c0 = cmat[3u * p + 0u];
    c1 = cmat[3u * p + 1u];
    c2 = cmat[3u * p + 2u];
  }
  let fx = xp * P.inv_dx;
  let base = vec3<i32>(floor(fx + vec3<f32>(0.5))) - vec3<i32>(1);
  let fp = fx - vec3<f32>(base);
  let wx = bspline_weights(fp.x);
  let wy = bspline_weights(fp.y);
  let wz = bspline_weights(fp.z);
  for (var di = 0; di < 3; di = di + 1) {
    let gi = base.x + di;
    if (gi < 0 || gi >= i32(P.nx)) { continue; }
    let dxn = (f32(di) - fp.x) * P.dx;
    for (var dj = 0; dj < 3; dj = dj + 1) {
      let gj = base.y + dj;
      if (gj < 0 || gj >= i32(P.ny)) { continue; }
      let dyn_ = (f32(dj) - fp.y) * P.dx;
      for (var dk = 0; dk < 3; dk = dk + 1) {
        let gk = base.z + dk;
        if (gk < 0 || gk >= i32(P.nz)) { continue; }
        let dzn = (f32(dk) - fp.z) * P.dx;
        let w = wx[di] * wy[dj] * wz[dk];
        let wm = w * m;
        let dpos = vec3<f32>(dxn, dyn_, dzn);
        let va = vp + vec3<f32>(dot(c0.xyz, dpos), dot(c1.xyz, dpos), dot(c2.xyz, dpos));
        let cell = node_id(gi, gj, gk);
        atomicAdd(&gatom[cell].m, encode_fixed(wm));
        atomicAdd(&gatom[cell].mx, encode_fixed(wm * va.x));
        atomicAdd(&gatom[cell].my, encode_fixed(wm * va.y));
        atomicAdd(&gatom[cell].mz, encode_fixed(wm * va.z));
      }
    }
  }
  // Marker occupancy (cell labels) + push-apart hash cell, in one pass.
  let node = marker_node(xp);
  let cid = node_id(node.x, node.y, node.z);
  atomicAdd(&count[cid], 1u);
  cell_of[p] = cid;
}

// Decode momentum -> velocity; stash the FLIP baseline (post-P2G,
// pre-force, matching grid_vel_old in apic_step_3d); apply gravity on
// massed nodes only.
@compute @workgroup_size(256)
fn grid_update(@builtin(global_invocation_id) gid: vec3<u32>) {
  let c = gid.x;
  if (c >= P.n_cells) { return; }
  let mq = atomicLoad(&gatom[c].m);
  var v = vec3<f32>(0.0);
  var mass = 0.0;
  if (mq > 0) {
    mass = decode_fixed(mq);
    v = vec3<f32>(
      decode_fixed(atomicLoad(&gatom[c].mx)),
      decode_fixed(atomicLoad(&gatom[c].my)),
      decode_fixed(atomicLoad(&gatom[c].mz)),
    ) / mass;
  }
  grid_vel_old[c] = vec4<f32>(v, mass);
  if (mq > 0) {
    v = v + P.gravity.xyz * P.dt;
  }
  grid_vel[c] = vec4<f32>(v, mass);
}

// Cell labels from marker occupancy (poisson_masked.classify_cells_3d):
// solid mask wins (walls + live obstacle); fluid iff >= 1 marker.
@compute @workgroup_size(256)
fn labels_pass(@builtin(global_invocation_id) gid: vec3<u32>) {
  let c = gid.x;
  if (c >= P.n_cells) { return; }
  let i = c % P.nx;
  let j = (c / P.nx) % P.ny;
  let k = c / (P.nx * P.ny);
  let w = P.n_wall;
  var lab = LABEL_AIR;
  var svel = vec4<f32>(0.0);
  let wall = i < w || i >= P.nx - w || j < w || j >= P.ny - w || k < w || k >= P.nz - w;
  if (wall) {
    lab = LABEL_SOLID;
  } else if (P.obstacle.w > 0.0) {
    let xn = vec3<f32>(f32(i), f32(j), f32(k)) * P.dx;
    if (distance(xn, P.obstacle.xyz) <= P.obstacle.w) {
      lab = LABEL_SOLID;
      svel = vec4<f32>(P.obstacle_vel.xyz, 0.0);
    }
  }
  if (lab == LABEL_AIR && atomicLoad(&count[c]) > 0u) {
    lab = LABEL_FLUID;
  }
  labels[c] = lab;
  solid_vel[c] = svel;
}

// Frame-0 rest density (regularizers.measure_rest_density): MAX scattered
// density over fluid nodes — the one-sided-safe threshold (a mean fires at
// rest because surface nodes read low). Host reads reduce[R_RHOREST] back
// once and pins it in P.rho_rest. Density == decoded grid mass because
// marker masses are uniformly 1 (same B-spline scatter).
@compute @workgroup_size(256)
fn measure_rho_rest(@builtin(global_invocation_id) gid: vec3<u32>) {
  let c = gid.x;
  if (c >= P.n_cells) { return; }
  if (labels[c] == LABEL_FLUID) {
    atomic_max_f32(R_RHOREST, grid_vel[c].w);
  }
}

// Solid-face velocity restore (project_masked: BEFORE the divergence and
// re-asserted after the gradient update — the moving-obstacle BC).
@compute @workgroup_size(256)
fn bc_restore(@builtin(global_invocation_id) gid: vec3<u32>) {
  let c = gid.x;
  if (c >= P.n_cells) { return; }
  if (labels[c] == LABEL_SOLID) {
    grid_vel[c] = vec4<f32>(solid_vel[c].xyz, grid_vel[c].w);
  }
}

// ANCHOR: compute_rhs — BACKWARD-difference divergence at fluid nodes
// (the adjoint compact pair, poisson_masked.divergence_masked_3d) plus the
// one-sided density-drift source (regularizers.drift_rhs_3d):
//   rhs = (rho/dt) div(u) - (rho/dt) k max(den/rho_rest - 1, 0) / dt.
@compute @workgroup_size(256)
fn compute_rhs(@builtin(global_invocation_id) gid: vec3<u32>) {
  let c = gid.x;
  if (c >= P.n_cells) { return; }
  if (labels[c] != LABEL_FLUID) {
    rhs[c] = 0.0;
    return;
  }
  let i = i32(c % P.nx);
  let j = i32((c / P.nx) % P.ny);
  let k = i32(c / (P.nx * P.ny));
  // Fluid nodes are interior by the label contract (edge nodes are wall).
  let v0 = grid_vel[c];
  let vm_x = grid_vel[node_id(i - 1, j, k)].x;
  let vm_y = grid_vel[node_id(i, j - 1, k)].y;
  let vm_z = grid_vel[node_id(i, j, k - 1)].z;
  let div = (v0.x - vm_x + v0.y - vm_y + v0.z - vm_z) * P.inv_dx;
  var r = (P.rho / P.dt) * div;
  if (P.drift_on != 0u && P.rho_rest > 0.0) {
    let excess = max(v0.w / P.rho_rest - 1.0, 0.0);
    r = r - (P.rho / P.dt) * P.drift_k * excess / P.dt;
  }
  rhs[c] = r;
}

// Shared masked-Poisson node update (poisson_masked._jacobi_masked):
// p = (sum over non-solid neighbors [fluid -> p_nb, air -> 0 Dirichlet]
//      - dx^2 rhs) / diag, diag = count of non-solid neighbors.
// Out-of-grid neighbors are treated as SOLID (never reached from fluid
// nodes — the no-edge-fluid label contract).
fn jacobi_node(c: u32, i: i32, j: i32, k: i32) -> f32 {
  var acc = -P.dx * P.dx * rhs[c];
  var diag = 0.0;
  for (var a = 0; a < 6; a = a + 1) {
    var ni = i; var nj = j; var nk = k;
    switch (a) {
      case 0: { ni = i - 1; }
      case 1: { ni = i + 1; }
      case 2: { nj = j - 1; }
      case 3: { nj = j + 1; }
      case 4: { nk = k - 1; }
      default: { nk = k + 1; }
    }
    if (!in_grid(ni, nj, nk)) { continue; } // out-of-grid == solid: face dropped
    let nc = node_id(ni, nj, nk);
    let lab = labels[nc];
    if (lab == LABEL_SOLID) { continue; }
    diag = diag + 1.0;
    if (lab == LABEL_FLUID) {
      acc = acc + pr_in[nc];
    }
    // air neighbor: Dirichlet p = 0 contributes nothing
  }
  if (diag > 0.0) { return acc / diag; }
  return 0.0;
}

// ANCHOR: jacobi_iter — fixed-iteration-cap Jacobi (P24 no-early-stop
// determinism pattern; the cap is per-canonical, measured — spec-ref
// § 6.3: 20 sweeps retain 100% of g*dt, the GPU Gems 3 ch. 30 sinking
// failure; the canonical cap sits in the < 0.1% band).
@compute @workgroup_size(256)
fn jacobi_iter(@builtin(global_invocation_id) gid: vec3<u32>) {
  let c = gid.x;
  if (c >= P.n_cells) { return; }
  if (labels[c] != LABEL_FLUID) {
    pr_out[c] = 0.0;
    return;
  }
  let i = i32(c % P.nx);
  let j = i32((c / P.nx) % P.ny);
  let k = i32(c / (P.nx * P.ny));
  pr_out[c] = jacobi_node(c, i, j, k);
}

// Live-path red-black Gauss-Seidel + SOR (in-place on pr_in). LIVE ONLY —
// never the gate solver (in-place GS is scheduling-order-sensitive across
// a color in theory; the canonical path is the fixed-cap Jacobi above).
fn rbgs_apply(c: u32, parity: u32) {
  if (c >= P.n_cells) { return; }
  if (labels[c] != LABEL_FLUID) { return; }
  let i = i32(c % P.nx);
  let j = i32((c / P.nx) % P.ny);
  let k = i32(c / (P.nx * P.ny));
  if ((u32(i + j + k) & 1u) != parity) { return; }
  let pgs = jacobi_node(c, i, j, k); // reads pr_in — opposite color only
  pr_in[c] = pr_in[c] + P.sor_omega * (pgs - pr_in[c]);
}

@compute @workgroup_size(256)
fn rbgs_red(@builtin(global_invocation_id) gid: vec3<u32>) { rbgs_apply(gid.x, 0u); }

@compute @workgroup_size(256)
fn rbgs_black(@builtin(global_invocation_id) gid: vec3<u32>) { rbgs_apply(gid.x, 1u); }

// ANCHOR: grad_update — FORWARD-difference pressure gradient on faces
// (i, i+e_a): update iff the face borders a fluid node and neither side is
// solid (poisson_masked._project_masked). Air pressure is the Dirichlet 0.
@compute @workgroup_size(256)
fn grad_update(@builtin(global_invocation_id) gid: vec3<u32>) {
  let c = gid.x;
  if (c >= P.n_cells) { return; }
  let lab = labels[c];
  if (lab == LABEL_SOLID) { return; }
  let i = i32(c % P.nx);
  let j = i32((c / P.nx) % P.ny);
  let k = i32(c / (P.nx * P.ny));
  let p_here = pr_in[c]; // 0 at air/solid by construction
  var vx = grid_vel[c].x;
  var vy = grid_vel[c].y;
  var vz = grid_vel[c].z;
  let coef = P.dt / P.rho;
  if (in_grid(i + 1, j, k)) {
    let nc = node_id(i + 1, j, k);
    if (labels[nc] != LABEL_SOLID && (lab == LABEL_FLUID || labels[nc] == LABEL_FLUID)) {
      vx = vx - coef * (pr_in[nc] - p_here) * P.inv_dx;
    }
  }
  if (in_grid(i, j + 1, k)) {
    let nc = node_id(i, j + 1, k);
    if (labels[nc] != LABEL_SOLID && (lab == LABEL_FLUID || labels[nc] == LABEL_FLUID)) {
      vy = vy - coef * (pr_in[nc] - p_here) * P.inv_dx;
    }
  }
  if (in_grid(i, j, k + 1)) {
    let nc = node_id(i, j, k + 1);
    if (labels[nc] != LABEL_SOLID && (lab == LABEL_FLUID || labels[nc] == LABEL_FLUID)) {
      vz = vz - coef * (pr_in[nc] - p_here) * P.inv_dx;
    }
  }
  grid_vel[c] = vec4<f32>(vx, vy, vz, grid_vel[c].w);
}

// Post-projection fluid divergence (diagnostic max, backward difference).
@compute @workgroup_size(256)
fn div_measure(@builtin(global_invocation_id) gid: vec3<u32>) {
  let c = gid.x;
  if (c >= P.n_cells) { return; }
  if (labels[c] != LABEL_FLUID) { return; }
  let i = i32(c % P.nx);
  let j = i32((c / P.nx) % P.ny);
  let k = i32(c / (P.nx * P.ny));
  let v0 = grid_vel[c];
  let div = (v0.x - grid_vel[node_id(i - 1, j, k)].x
           + v0.y - grid_vel[node_id(i, j - 1, k)].y
           + v0.z - grid_vel[node_id(i, j, k - 1)].z) * P.inv_dx;
  atomic_max_f32(R_MAXDIV, abs(div));
}

// BFS air extrapolation (poisson_masked._extrapolate): zero air, then fill
// layer by layer with the mean of already-known 6-neighborhood values.
@compute @workgroup_size(256)
fn extrap_init(@builtin(global_invocation_id) gid: vec3<u32>) {
  let c = gid.x;
  if (c >= P.n_cells) { return; }
  let lab = labels[c];
  known_in[c] = select(0u, 1u, lab == LABEL_FLUID);
  if (lab == LABEL_AIR) {
    grid_vel[c] = vec4<f32>(0.0, 0.0, 0.0, grid_vel[c].w);
  }
}

@compute @workgroup_size(256)
fn extrap_layer(@builtin(global_invocation_id) gid: vec3<u32>) {
  let c = gid.x;
  if (c >= P.n_cells) { return; }
  var known = known_in[c];
  if (labels[c] == LABEL_AIR && known == 0u) {
    let i = i32(c % P.nx);
    let j = i32((c / P.nx) % P.ny);
    let k = i32(c / (P.nx * P.ny));
    var nb = 0.0;
    var acc = vec3<f32>(0.0);
    for (var a = 0; a < 6; a = a + 1) {
      var ni = i; var nj = j; var nk = k;
      switch (a) {
        case 0: { ni = i - 1; }
        case 1: { ni = i + 1; }
        case 2: { nj = j - 1; }
        case 3: { nj = j + 1; }
        case 4: { nk = k - 1; }
        default: { nk = k + 1; }
      }
      if (!in_grid(ni, nj, nk)) { continue; }
      let nc = node_id(ni, nj, nk);
      if (known_in[nc] == 1u) {
        nb = nb + 1.0;
        acc = acc + grid_vel[nc].xyz;
      }
    }
    if (nb > 0.0) {
      grid_vel[c] = vec4<f32>(acc / nb, grid_vel[c].w);
      known = 1u;
    }
  }
  known_out[c] = known;
}

// --- G2P + advection -------------------------------------------------------

fn sample_field(field_idx: u32, xp: vec3<f32>) -> vec3<f32> {
  // field_idx: 0 -> grid_vel, 1 -> grid_vel_old. Samples STORED velocities
  // at all in-bounds stencil nodes (the extended field — solid nodes carry
  // the obstacle velocity, air nodes the extrapolated field; apic.py
  // module docstring "no zero-mass skip").
  let fx = xp * P.inv_dx;
  let base = vec3<i32>(floor(fx + vec3<f32>(0.5))) - vec3<i32>(1);
  let fp = fx - vec3<f32>(base);
  let wx = bspline_weights(fp.x);
  let wy = bspline_weights(fp.y);
  let wz = bspline_weights(fp.z);
  var acc = vec3<f32>(0.0);
  for (var di = 0; di < 3; di = di + 1) {
    let gi = base.x + di;
    if (gi < 0 || gi >= i32(P.nx)) { continue; }
    for (var dj = 0; dj < 3; dj = dj + 1) {
      let gj = base.y + dj;
      if (gj < 0 || gj >= i32(P.ny)) { continue; }
      for (var dk = 0; dk < 3; dk = dk + 1) {
        let gk = base.z + dk;
        if (gk < 0 || gk >= i32(P.nz)) { continue; }
        let w = wx[di] * wy[dj] * wz[dk];
        let c = node_id(gi, gj, gk);
        if (field_idx == 0u) {
          acc = acc + w * grid_vel[c].xyz;
        } else {
          acc = acc + w * grid_vel_old[c].xyz;
        }
      }
    }
  }
  return acc;
}

// ANCHOR: g2p — G2P reconstruction per mode (apic.py g2p_3d):
//   PIC:  v_p = sum w v_i,            C_p = 0
//   FLIP: v_p += S(new) - S(old),     C_p = 0   (flip_ratio blends vs PIC, live-only)
//   APIC: v_p = sum w v_i,  C_p = (4/dx^2) sum w v_i r^T  (Prop 5.1 surface)
@compute @workgroup_size(64)
fn g2p(@builtin(global_invocation_id) gid: vec3<u32>) {
  let p = gid.x;
  if (p >= P.n) { return; }
  let xp = pos[p].xyz;
  let fx = xp * P.inv_dx;
  let base = vec3<i32>(floor(fx + vec3<f32>(0.5))) - vec3<i32>(1);
  let fp = fx - vec3<f32>(base);
  let wx = bspline_weights(fp.x);
  let wy = bspline_weights(fp.y);
  let wz = bspline_weights(fp.z);
  var vacc = vec3<f32>(0.0);
  var b0 = vec3<f32>(0.0);
  var b1 = vec3<f32>(0.0);
  var b2 = vec3<f32>(0.0);
  for (var di = 0; di < 3; di = di + 1) {
    let gi = base.x + di;
    if (gi < 0 || gi >= i32(P.nx)) { continue; }
    let dxn = (f32(di) - fp.x) * P.dx;
    for (var dj = 0; dj < 3; dj = dj + 1) {
      let gj = base.y + dj;
      if (gj < 0 || gj >= i32(P.ny)) { continue; }
      let dyn_ = (f32(dj) - fp.y) * P.dx;
      for (var dk = 0; dk < 3; dk = dk + 1) {
        let gk = base.z + dk;
        if (gk < 0 || gk >= i32(P.nz)) { continue; }
        let dzn = (f32(dk) - fp.z) * P.dx;
        let w = wx[di] * wy[dj] * wz[dk];
        let vi = grid_vel[node_id(gi, gj, gk)].xyz;
        vacc = vacc + w * vi;
        if (P.mode == MODE_APIC) {
          let dpos = vec3<f32>(dxn, dyn_, dzn);
          b0 = b0 + w * vi.x * dpos;
          b1 = b1 + w * vi.y * dpos;
          b2 = b2 + w * vi.z * dpos;
        }
      }
    }
  }
  var v_new = vacc;
  if (P.mode == MODE_FLIP) {
    let old_sample = sample_field(1u, xp);
    let flip_v = vel[p].xyz + (vacc - old_sample);
    v_new = P.flip_ratio * flip_v + (1.0 - P.flip_ratio) * vacc;
  }
  // Live speed ceiling (gate configs pass a large sentinel — no-op there).
  let sp = length(v_new);
  if (sp > P.vmax && P.vmax > 0.0) {
    v_new = v_new * (P.vmax / sp);
  }
  vel[p] = vec4<f32>(v_new, 0.0);
  let affine_scale = 4.0 * P.inv_dx * P.inv_dx;
  var cn0 = vec4<f32>(0.0);
  var cn1 = vec4<f32>(0.0);
  var cn2 = vec4<f32>(0.0);
  if (P.mode == MODE_APIC) {
    cn0 = vec4<f32>(affine_scale * b0, 0.0);
    cn1 = vec4<f32>(affine_scale * b1, 0.0);
    cn2 = vec4<f32>(affine_scale * b2, 0.0);
  }
  cmat[3u * p + 0u] = cn0;
  cmat[3u * p + 1u] = cn1;
  cmat[3u * p + 2u] = cn2;
  let cnorm = sqrt(dot(cn0.xyz, cn0.xyz) + dot(cn1.xyz, cn1.xyz) + dot(cn2.xyz, cn2.xyz));
  var aux = paux[p];
  aux.w = cnorm;
  paux[p] = aux;
  atomic_max_f32(R_MAXSPEED, max(abs(v_new.x), max(abs(v_new.y), abs(v_new.z))));
}

// CFL substep count (apic.py _n_substeps): deterministic function of the
// max component speed; never wall-clock adaptive.
@compute @workgroup_size(1)
fn compute_nsub() {
  let bits = atomicLoad(&reduce[R_MAXSPEED]);
  let sp = bitcast<f32>(bits);
  var nsub = 1u;
  if (sp > 0.0) {
    nsub = max(1u, u32(ceil(sp * P.dt / (P.cfl * P.dx))));
  }
  atomicStore(&reduce[R_NSUB], nsub);
}

// ANCHOR: advect — RK2 midpoint through the extended grid field
// (apic.py advect_rk2_3d), CFL substeps in-kernel, positions clamped to
// the stencil-safe box [n_wall*dx, (n-1-n_wall)*dx].
@compute @workgroup_size(64)
fn advect(@builtin(global_invocation_id) gid: vec3<u32>) {
  let p = gid.x;
  if (p >= P.n) { return; }
  let nsub = misc[R_NSUB];
  let h = P.dt / f32(nsub);
  var xp = pos[p].xyz;
  let lo = vec3<f32>(P.lo);
  let hi = vec3<f32>(P.hi_x, P.hi_y, P.hi_z);
  for (var s = 0u; s < nsub; s = s + 1u) {
    let v1 = sample_field(0u, xp);
    let xm = xp + 0.5 * h * v1;
    let v2 = sample_field(0u, xm);
    xp = clamp(xp + h * v2, lo, hi);
  }
  pos[p] = vec4<f32>(xp, pos[p].w);
}

// Per-particle render/diagnostic scalars (after projection + G2P):
// x = pressure at the marker node, y = density excess vs rho_rest,
// z = post-projection divergence at the node, w = |C| (set in g2p).
@compute @workgroup_size(64)
fn paux_pass(@builtin(global_invocation_id) gid: vec3<u32>) {
  let p = gid.x;
  if (p >= P.n) { return; }
  let node = marker_node(pos[p].xyz);
  let c = node_id(node.x, node.y, node.z);
  var aux = paux[p];
  aux.x = pr_in[c];
  if (P.rho_rest > 0.0) {
    aux.y = max(grid_vel[c].w / P.rho_rest - 1.0, 0.0);
  } else {
    aux.y = 0.0;
  }
  var div = 0.0;
  if (labels[c] == LABEL_FLUID) {
    let v0 = grid_vel[c];
    div = (v0.x - grid_vel[node_id(node.x - 1, node.y, node.z)].x
         + v0.y - grid_vel[node_id(node.x, node.y - 1, node.z)].y
         + v0.z - grid_vel[node_id(node.x, node.y, node.z - 1)].z) * P.inv_dx;
  }
  aux.z = div;
  paux[p] = aux;
}

// --- push-apart regularizer (CSR counting sort + symmetric Jacobi) --------
// Hash grid == the sim node grid (cell size dx >= minDist = 2 r_p at the
// reference radius factor 0.25), so `count`/`cell_of` from p2g double as
// the histogram when positions have not moved; after advection the hash is
// rebuilt (pp_clear/pp_hist) exactly like the reference rebuilds per sweep.

@compute @workgroup_size(256)
fn pp_clear(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= P.n_cells) { return; }
  atomicStore(&count[gid.x], 0u);
}

@compute @workgroup_size(64)
fn pp_hist(@builtin(global_invocation_id) gid: vec3<u32>) {
  let p = gid.x;
  if (p >= P.n) { return; }
  let node = marker_node(pos[p].xyz);
  let c = node_id(node.x, node.y, node.z);
  cell_of[p] = c;
  atomicAdd(&count[c], 1u);
}

// Two-level work-efficient Blelloch exclusive scan (the sph-water
// counting-sort machinery, GPU Gems 3 ch. 39). Capacity 512*512 = 262,144
// cells — grid dims are always chosen to stay under this (64^3 max).
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

// Per-cell ascending-id insertion sort — restores a deterministic
// iteration order after the atomic scatter (the sph-water pattern).
@compute @workgroup_size(64)
fn cell_sort(@builtin(global_invocation_id) gid: vec3<u32>) {
  let c = gid.x;
  if (c >= P.n_cells) { return; }
  let start = cell_start[c];
  var cnt = cell_start[c + 1u] - start;
  if (cnt > SORT_CAP) {
    atomicStore(&reduce[R_SORTSAT], 1u);
    cnt = SORT_CAP;
  }
  var k = 1u;
  loop {
    if (k >= cnt) { break; }
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

// ANCHOR: pp_jacobi — Muller's push-apart (regularizers.push_apart_3d):
// per close pair, s = 0.5 (minDist - d)/d; each end moves away by
// s * (x_self - x_other). DECLARED deviation: symmetric Jacobi accumulate
// over id-sorted neighbors instead of the reference's sequential
// Gauss-Seidel (see the module header); exactly inert at rest either way.
@compute @workgroup_size(64)
fn pp_jacobi(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= P.n) { return; }
  let xi = pos[i].xyz;
  let min_dist = 2.0 * P.push_r;
  let min_dist2 = min_dist * min_dist;
  let node = marker_node(xi);
  var d_acc = vec3<f32>(0.0);
  for (var ox = -1; ox <= 1; ox = ox + 1) {
    let gx = node.x + ox;
    if (gx < 0 || gx >= i32(P.nx)) { continue; }
    for (var oy = -1; oy <= 1; oy = oy + 1) {
      let gy = node.y + oy;
      if (gy < 0 || gy >= i32(P.ny)) { continue; }
      for (var oz = -1; oz <= 1; oz = oz + 1) {
        let gz = node.z + oz;
        if (gz < 0 || gz >= i32(P.nz)) { continue; }
        let c = node_id(gx, gy, gz);
        let s0 = cell_start[c];
        var s1 = cell_start[c + 1u];
        if (s1 - s0 > SORT_CAP) { s1 = s0 + SORT_CAP; }
        for (var s = s0; s < s1; s = s + 1u) {
          let j = sorted_idx[s];
          if (j == i) { continue; }
          let dvec = pos[j].xyz - xi;
          let d2 = dot(dvec, dvec);
          if (d2 > 0.0 && d2 < min_dist2) {
            let d = sqrt(d2);
            let sc = 0.5 * (min_dist - d) / d;
            d_acc = d_acc - sc * dvec;
          }
        }
      }
    }
  }
  disp[i] = vec4<f32>(d_acc, 0.0);
}

@compute @workgroup_size(64)
fn pp_apply(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= P.n) { return; }
  let lo = vec3<f32>(P.lo);
  let hi = vec3<f32>(P.hi_x, P.hi_y, P.hi_z);
  pos[i] = vec4<f32>(clamp(pos[i].xyz + disp[i].xyz, lo, hi), pos[i].w);
}

// --- live interaction (splash impulse / pour handled host-side) -----------
// Impulse splat: aux_in = [cx, cy, cz, radius, ix, iy, iz] — adds the
// impulse to particle velocities inside the radius. LIVE ONLY.
@compute @workgroup_size(64)
fn splat_impulse(@builtin(global_invocation_id) gid: vec3<u32>) {
  let p = gid.x;
  if (p >= P.n) { return; }
  let c = vec3<f32>(aux_in[0], aux_in[1], aux_in[2]);
  let r = aux_in[3];
  let dv = vec3<f32>(aux_in[4], aux_in[5], aux_in[6]);
  let d = distance(pos[p].xyz, c);
  if (d < r) {
    let fall = 1.0 - d / r;
    vel[p] = vec4<f32>(vel[p].xyz + dv * fall, 0.0);
  }
}

// ANCHOR: p2g_oracle — transfer bit-identity witness (the sph-water
// hash==brute structure, both paths on-device): a SINGLE thread replays
// the identical P2G arithmetic in reference lex order (particles by id,
// stencil in (di,dj,dk) order), accumulating the same i32 quanta
// NON-atomically. Integer addition is associative + commutative, so the
// parallel atomic scatter must produce byte-identical grids — compared
// i32-exact host-side. A mismatch falsifies either the order-independence
// claim or the single-code-path claim.
@compute @workgroup_size(1)
fn p2g_oracle() {
  for (var c = 0u; c < P.n_cells; c = c + 1u) {
    oracle[c] = vec4<i32>(0);
  }
  for (var p = 0u; p < P.n; p = p + 1u) {
    let xp = pos[p].xyz;
    let vp = vel[p].xyz;
    let m = 1.0;
    var c0 = vec4<f32>(0.0);
    var c1 = vec4<f32>(0.0);
    var c2 = vec4<f32>(0.0);
    if (P.mode == MODE_APIC) {
      c0 = cmat[3u * p + 0u];
      c1 = cmat[3u * p + 1u];
      c2 = cmat[3u * p + 2u];
    }
    let fx = xp * P.inv_dx;
    let base = vec3<i32>(floor(fx + vec3<f32>(0.5))) - vec3<i32>(1);
    let fp = fx - vec3<f32>(base);
    let wx = bspline_weights(fp.x);
    let wy = bspline_weights(fp.y);
    let wz = bspline_weights(fp.z);
    for (var di = 0; di < 3; di = di + 1) {
      let gi = base.x + di;
      if (gi < 0 || gi >= i32(P.nx)) { continue; }
      let dxn = (f32(di) - fp.x) * P.dx;
      for (var dj = 0; dj < 3; dj = dj + 1) {
        let gj = base.y + dj;
        if (gj < 0 || gj >= i32(P.ny)) { continue; }
        let dyn_ = (f32(dj) - fp.y) * P.dx;
        for (var dk = 0; dk < 3; dk = dk + 1) {
          let gk = base.z + dk;
          if (gk < 0 || gk >= i32(P.nz)) { continue; }
          let dzn = (f32(dk) - fp.z) * P.dx;
          let w = wx[di] * wy[dj] * wz[dk];
          let wm = w * m;
          let dpos = vec3<f32>(dxn, dyn_, dzn);
          let va = vp + vec3<f32>(dot(c0.xyz, dpos), dot(c1.xyz, dpos), dot(c2.xyz, dpos));
          let cell = node_id(gi, gj, gk);
          oracle[cell] = oracle[cell] + vec4<i32>(
            encode_fixed(wm),
            encode_fixed(wm * va.x),
            encode_fixed(wm * va.y),
            encode_fixed(wm * va.z),
          );
        }
      }
    }
  }
}

// --- golden-table GPU evaluation harness (single-thread, chaos-immune) ----
// The committed tables are evaluated on the visitor's GPU in f32 and the
// MEASURED residual is shown against the declared f32-scale bound — never
// an asserted 0.0 (the identities are exact in rational arithmetic and
// dyadic-bit-exact in f64; spec § 4.3 residual honesty). Scratch grids
// reuse rhs (mass) + grid_vel (momentum); extents fit the table configs
// (coords <= 8 at dx = 1, grid 16 per axis << allocated 64^3).

const GOLD_N: i32 = 16;

fn gold_id2(i: i32, j: i32) -> u32 { return u32(i) + u32(GOLD_N) * u32(j); }
fn gold_id3(i: i32, j: i32, k: i32) -> u32 {
  return u32(i) + u32(GOLD_N) * (u32(j) + u32(GOLD_N) * u32(k));
}

// aux_in: [n_samples, n_fp, n_pou, xs..., fps..., pous...]
// aux_out: [N(x)... , (w0,w1,w2,sum_w,sum_w_r,sum_w_r2) per fp ..., pou...]
@compute @workgroup_size(1)
fn golden_weights() {
  let n_samples = u32(aux_in[0]);
  let n_fp = u32(aux_in[1]);
  let n_pou = u32(aux_in[2]);
  var o = 0u;
  for (var s = 0u; s < n_samples; s = s + 1u) {
    aux_out[o] = bspline_n(aux_in[3u + s]);
    o = o + 1u;
  }
  for (var f = 0u; f < n_fp; f = f + 1u) {
    let fp = aux_in[3u + n_samples + f];
    let w = bspline_weights(fp);
    var sw = 0.0;
    var swr = 0.0;
    var swr2 = 0.0;
    for (var k = 0; k < 3; k = k + 1) {
      let r = f32(k) - fp;
      sw = sw + w[k];
      swr = swr + w[k] * r;
      swr2 = swr2 + w[k] * r * r;
    }
    aux_out[o] = w.x; aux_out[o + 1u] = w.y; aux_out[o + 2u] = w.z;
    aux_out[o + 3u] = sw; aux_out[o + 4u] = swr; aux_out[o + 5u] = swr2;
    o = o + 6u;
  }
  for (var q = 0u; q < n_pou; q = q + 1u) {
    let p_ = aux_in[3u + n_samples + n_fp + q];
    let b = floor(p_ + 0.5) - 1.0;
    let w = bspline_weights(p_ - b);
    aux_out[o] = w.x + w.y + w.z;
    o = o + 1u;
  }
}

fn weights1d(p_: f32) -> vec3<f32> {
  let b = floor(p_ + 0.5) - 1.0;
  return bspline_weights(p_ - b);
}

fn base1d(p_: f32) -> i32 { return i32(floor(p_ + 0.5)) - 1; }

// Angular momentum conservation across P2G/G2P (Props 5.4/5.5), 2D.
// aux_in: [n_p, dx, then per particle: x, y, m, vx, vy, B00, B01, B10, B11]
// aux_out: [L_before, L_grid, L_after_apic, L_after_pic]
@compute @workgroup_size(1)
fn golden_am2() {
  let np = u32(aux_in[0]);
  let dxg = aux_in[1];
  let inv = 1.0 / dxg;
  let ascale = 4.0 * inv * inv;
  // zero scratch
  for (var c = 0u; c < u32(GOLD_N * GOLD_N); c = c + 1u) {
    rhs[c] = 0.0;
    grid_vel[c] = vec4<f32>(0.0);
  }
  var l_before = 0.0;
  for (var p = 0u; p < np; p = p + 1u) {
    let o = 2u + 9u * p;
    let x = vec2<f32>(aux_in[o], aux_in[o + 1u]);
    let m = aux_in[o + 2u];
    let v = vec2<f32>(aux_in[o + 3u], aux_in[o + 4u]);
    let b00 = aux_in[o + 5u]; let b01 = aux_in[o + 6u];
    let b10 = aux_in[o + 7u]; let b11 = aux_in[o + 8u];
    l_before = l_before + m * (x.x * v.y - x.y * v.x) + m * (b10 - b01);
    // P2G with C = B * (4/dx^2)
    let c00 = ascale * b00; let c01 = ascale * b01;
    let c10 = ascale * b10; let c11 = ascale * b11;
    let fx = x * inv;
    let bx = base1d(fx.x); let by = base1d(fx.y);
    let wx = weights1d(fx.x); let wy = weights1d(fx.y);
    let fpx = fx.x - f32(bx); let fpy = fx.y - f32(by);
    for (var di = 0; di < 3; di = di + 1) {
      let gi = bx + di;
      let rx = (f32(di) - fpx) * dxg;
      for (var dj = 0; dj < 3; dj = dj + 1) {
        let gj = by + dj;
        let ry = (f32(dj) - fpy) * dxg;
        let w = wx[di] * wy[dj];
        let va = v + vec2<f32>(c00 * rx + c01 * ry, c10 * rx + c11 * ry);
        let cid = gold_id2(gi, gj);
        rhs[cid] = rhs[cid] + w * m;
        grid_vel[cid] = grid_vel[cid] + vec4<f32>(w * m * va, 0.0, 0.0);
      }
    }
  }
  var l_grid = 0.0;
  for (var j = 0; j < GOLD_N; j = j + 1) {
    for (var i = 0; i < GOLD_N; i = i + 1) {
      let cid = gold_id2(i, j);
      let mom = grid_vel[cid].xy;
      let xn = vec2<f32>(f32(i), f32(j)) * dxg;
      l_grid = l_grid + xn.x * mom.y - xn.y * mom.x;
    }
  }
  // G2P (velocity field v_i = mom_i / m_i at massed nodes)
  var l_apic = 0.0;
  var l_pic = 0.0;
  for (var p = 0u; p < np; p = p + 1u) {
    let o = 2u + 9u * p;
    let x = vec2<f32>(aux_in[o], aux_in[o + 1u]);
    let m = aux_in[o + 2u];
    let fx = x * inv;
    let bx = base1d(fx.x); let by = base1d(fx.y);
    let wx = weights1d(fx.x); let wy = weights1d(fx.y);
    let fpx = fx.x - f32(bx); let fpy = fx.y - f32(by);
    var vp = vec2<f32>(0.0);
    var bp01 = 0.0; var bp10 = 0.0; // only axial parts needed for L
    for (var di = 0; di < 3; di = di + 1) {
      let gi = bx + di;
      let rx = (f32(di) - fpx) * dxg;
      for (var dj = 0; dj < 3; dj = dj + 1) {
        let gj = by + dj;
        let ry = (f32(dj) - fpy) * dxg;
        let w = wx[di] * wy[dj];
        let cid = gold_id2(gi, gj);
        var vi = vec2<f32>(0.0);
        if (rhs[cid] > 0.0) { vi = grid_vel[cid].xy / rhs[cid]; }
        vp = vp + w * vi;
        bp01 = bp01 + w * vi.x * ry; // B'_xy = sum w v_x r_y
        bp10 = bp10 + w * vi.y * rx; // B'_yx = sum w v_y r_x
      }
    }
    l_apic = l_apic + m * (x.x * vp.y - x.y * vp.x) + m * (bp10 - bp01);
    l_pic = l_pic + m * (x.x * vp.y - x.y * vp.x);
  }
  aux_out[0] = l_before;
  aux_out[1] = l_grid;
  aux_out[2] = l_apic;
  aux_out[3] = l_pic;
}

// Angular momentum, 3D. aux_in: [n_p, dx, per particle: x(3), m, v(3), B(9 row-major)]
// aux_out: [Lb(3), Lgrid(3), Lapic(3), Lpic(3)]
@compute @workgroup_size(1)
fn golden_am3() {
  let np = u32(aux_in[0]);
  let dxg = aux_in[1];
  let inv = 1.0 / dxg;
  let ascale = 4.0 * inv * inv;
  for (var c = 0u; c < u32(GOLD_N * GOLD_N * GOLD_N); c = c + 1u) {
    rhs[c] = 0.0;
    grid_vel[c] = vec4<f32>(0.0);
  }
  var lb = vec3<f32>(0.0);
  for (var p = 0u; p < np; p = p + 1u) {
    let o = 2u + 16u * p;
    let x = vec3<f32>(aux_in[o], aux_in[o + 1u], aux_in[o + 2u]);
    let m = aux_in[o + 3u];
    let v = vec3<f32>(aux_in[o + 4u], aux_in[o + 5u], aux_in[o + 6u]);
    var b: array<f32, 9>;
    for (var q = 0u; q < 9u; q = q + 1u) { b[q] = aux_in[o + 7u + q]; }
    let axial = vec3<f32>(b[7] - b[5], b[2] - b[6], b[3] - b[1]); // (B32-B23, B13-B31, B21-B12)
    lb = lb + m * cross(x, v) + m * axial;
    let fx = x * inv;
    let bx = base1d(fx.x); let by = base1d(fx.y); let bz = base1d(fx.z);
    let wx = weights1d(fx.x); let wy = weights1d(fx.y); let wz = weights1d(fx.z);
    let fp = vec3<f32>(fx.x - f32(bx), fx.y - f32(by), fx.z - f32(bz));
    for (var di = 0; di < 3; di = di + 1) {
      for (var dj = 0; dj < 3; dj = dj + 1) {
        for (var dk = 0; dk < 3; dk = dk + 1) {
          let r = (vec3<f32>(f32(di), f32(dj), f32(dk)) - fp) * dxg;
          let w = wx[di] * wy[dj] * wz[dk];
          let cv = ascale * vec3<f32>(
            b[0] * r.x + b[1] * r.y + b[2] * r.z,
            b[3] * r.x + b[4] * r.y + b[5] * r.z,
            b[6] * r.x + b[7] * r.y + b[8] * r.z,
          );
          let va = v + cv;
          let cid = gold_id3(bx + di, by + dj, bz + dk);
          rhs[cid] = rhs[cid] + w * m;
          grid_vel[cid] = grid_vel[cid] + vec4<f32>(w * m * va, 0.0);
        }
      }
    }
  }
  var lg = vec3<f32>(0.0);
  for (var k = 0; k < GOLD_N; k = k + 1) {
    for (var j = 0; j < GOLD_N; j = j + 1) {
      for (var i = 0; i < GOLD_N; i = i + 1) {
        let cid = gold_id3(i, j, k);
        let xn = vec3<f32>(f32(i), f32(j), f32(k)) * dxg;
        lg = lg + cross(xn, grid_vel[cid].xyz);
      }
    }
  }
  var la = vec3<f32>(0.0);
  var lp = vec3<f32>(0.0);
  for (var p = 0u; p < np; p = p + 1u) {
    let o = 2u + 16u * p;
    let x = vec3<f32>(aux_in[o], aux_in[o + 1u], aux_in[o + 2u]);
    let m = aux_in[o + 3u];
    let fx = x * inv;
    let bx = base1d(fx.x); let by = base1d(fx.y); let bz = base1d(fx.z);
    let wx = weights1d(fx.x); let wy = weights1d(fx.y); let wz = weights1d(fx.z);
    let fp = vec3<f32>(fx.x - f32(bx), fx.y - f32(by), fx.z - f32(bz));
    var vp = vec3<f32>(0.0);
    var spin = vec3<f32>(0.0); // axial(B') = sum w r x v_i
    for (var di = 0; di < 3; di = di + 1) {
      for (var dj = 0; dj < 3; dj = dj + 1) {
        for (var dk = 0; dk < 3; dk = dk + 1) {
          let r = (vec3<f32>(f32(di), f32(dj), f32(dk)) - fp) * dxg;
          let w = wx[di] * wy[dj] * wz[dk];
          let cid = gold_id3(bx + di, by + dj, bz + dk);
          var vi = vec3<f32>(0.0);
          if (rhs[cid] > 0.0) { vi = grid_vel[cid].xyz / rhs[cid]; }
          vp = vp + w * vi;
          spin = spin + w * cross(r, vi);
        }
      }
    }
    la = la + m * cross(x, vp) + m * spin;
    lp = lp + m * cross(x, vp);
  }
  aux_out[0] = lb.x;  aux_out[1] = lb.y;  aux_out[2] = lb.z;
  aux_out[3] = lg.x;  aux_out[4] = lg.y;  aux_out[5] = lg.z;
  aux_out[6] = la.x;  aux_out[7] = la.y;  aux_out[8] = la.z;
  aux_out[9] = lp.x;  aux_out[10] = lp.y; aux_out[11] = lp.z;
}

// Affine round trip (Prop 5.1, grid -> particle -> grid), 2D or 3D by ndim.
// aux_in: [ndim, n_p, dx, v0(ndim), C(ndim*ndim row-major), positions(n_p*ndim),
//          masses(n_p), sample_node(ndim)]
// aux_out: [apic_max_abs_err, field_scale, n_massed,
//           sample_v(ndim), pic_max_abs_dev]
@compute @workgroup_size(1)
fn golden_roundtrip() {
  let ndim = u32(aux_in[0]);
  let np = u32(aux_in[1]);
  let dxg = aux_in[2];
  let inv = 1.0 / dxg;
  let ascale = 4.0 * inv * inv;
  var o = 3u;
  var v0 = vec3<f32>(0.0);
  for (var a = 0u; a < ndim; a = a + 1u) { v0[a] = aux_in[o + a]; }
  o = o + ndim;
  var cm: array<f32, 9>; // row-major ndim x ndim
  for (var q = 0u; q < ndim * ndim; q = q + 1u) { cm[q] = aux_in[o + q]; }
  o = o + ndim * ndim;
  let pos_off = o;
  o = o + np * ndim;
  let mass_off = o;
  o = o + np;
  var snode = vec3<i32>(0);
  for (var a = 0u; a < ndim; a = a + 1u) { snode[a] = i32(aux_in[o + a]); }

  let nz_ext = select(1, GOLD_N, ndim == 3u);
  // Scratch: rhs = mass, grid_vel = momentum (after roundtrip P2G).
  for (var c = 0u; c < u32(GOLD_N * GOLD_N * nz_ext); c = c + 1u) {
    rhs[c] = 0.0;
    grid_vel[c] = vec4<f32>(0.0);
    grid_vel_old[c] = vec4<f32>(0.0); // PIC-mode momentum
  }

  // Per particle: G2P from the analytic affine grid field, then P2G back.
  for (var p = 0u; p < np; p = p + 1u) {
    var x = vec3<f32>(0.0);
    for (var a = 0u; a < ndim; a = a + 1u) { x[a] = aux_in[pos_off + p * ndim + a]; }
    let m = aux_in[mass_off + p];
    let fx = x * inv;
    let bx = base1d(fx.x); let by = base1d(fx.y);
    var bz = 0;
    if (ndim == 3u) { bz = base1d(fx.z); }
    let wx = weights1d(fx.x); let wy = weights1d(fx.y);
    var wz = vec3<f32>(1.0, 0.0, 0.0);
    if (ndim == 3u) { wz = weights1d(fx.z); }
    let fp = vec3<f32>(fx.x - f32(bx), fx.y - f32(by), select(0.0, fx.z - f32(bz), ndim == 3u));
    let kmax = select(1, 3, ndim == 3u);
    // G2P: v_p = sum w (v0 + C x_i); B_p = sum w v_i r^T
    var vp = vec3<f32>(0.0);
    var bp: array<f32, 9>;
    for (var q = 0u; q < 9u; q = q + 1u) { bp[q] = 0.0; }
    for (var di = 0; di < 3; di = di + 1) {
      for (var dj = 0; dj < 3; dj = dj + 1) {
        for (var dk = 0; dk < kmax; dk = dk + 1) {
          let w = wx[di] * wy[dj] * wz[dk];
          let xn = vec3<f32>(f32(bx + di), f32(by + dj), f32(bz + dk)) * dxg;
          var vi = v0;
          for (var a = 0u; a < ndim; a = a + 1u) {
            var acc = v0[a];
            for (var bcol = 0u; bcol < ndim; bcol = bcol + 1u) {
              acc = acc + cm[a * ndim + bcol] * xn[bcol];
            }
            vi[a] = acc;
          }
          let r = xn - x;
          vp = vp + w * vi;
          for (var a = 0u; a < ndim; a = a + 1u) {
            for (var bcol = 0u; bcol < ndim; bcol = bcol + 1u) {
              bp[a * ndim + bcol] = bp[a * ndim + bcol] + w * vi[a] * r[bcol];
            }
          }
        }
      }
    }
    // P2G back: APIC uses C_p = ascale * B_p; PIC uses v_p only.
    for (var di = 0; di < 3; di = di + 1) {
      for (var dj = 0; dj < 3; dj = dj + 1) {
        for (var dk = 0; dk < kmax; dk = dk + 1) {
          let w = wx[di] * wy[dj] * wz[dk];
          let xn = vec3<f32>(f32(bx + di), f32(by + dj), f32(bz + dk)) * dxg;
          let r = xn - x;
          var va = vp;
          for (var a = 0u; a < ndim; a = a + 1u) {
            var acc = vp[a];
            for (var bcol = 0u; bcol < ndim; bcol = bcol + 1u) {
              acc = acc + ascale * bp[a * ndim + bcol] * r[bcol];
            }
            va[a] = acc;
          }
          var cid = gold_id2(bx + di, by + dj);
          if (ndim == 3u) { cid = gold_id3(bx + di, by + dj, bz + dk); }
          rhs[cid] = rhs[cid] + w * m;
          grid_vel[cid] = grid_vel[cid] + vec4<f32>(w * m * va, 0.0);
          grid_vel_old[cid] = grid_vel_old[cid] + vec4<f32>(w * m * vp, 0.0);
        }
      }
    }
  }
  // Compare massed nodes to the analytic field.
  var max_err = 0.0;
  var max_pic = 0.0;
  var scale = 0.0;
  var n_massed = 0.0;
  var sample_v = vec3<f32>(0.0);
  let nk = select(1, GOLD_N, ndim == 3u);
  for (var k = 0; k < nk; k = k + 1) {
    for (var j = 0; j < GOLD_N; j = j + 1) {
      for (var i = 0; i < GOLD_N; i = i + 1) {
        var cid = gold_id2(i, j);
        if (ndim == 3u) { cid = gold_id3(i, j, k); }
        let m = rhs[cid];
        if (m <= 0.0) { continue; }
        n_massed = n_massed + 1.0;
        let xn = vec3<f32>(f32(i), f32(j), f32(k)) * dxg;
        var vexp = v0;
        for (var a = 0u; a < ndim; a = a + 1u) {
          var acc = v0[a];
          for (var bcol = 0u; bcol < ndim; bcol = bcol + 1u) {
            acc = acc + cm[a * ndim + bcol] * xn[bcol];
          }
          vexp[a] = acc;
        }
        let vg = grid_vel[cid].xyz / m;
        let vg_pic = grid_vel_old[cid].xyz / m;
        for (var a = 0u; a < ndim; a = a + 1u) {
          max_err = max(max_err, abs(vg[a] - vexp[a]));
          max_pic = max(max_pic, abs(vg_pic[a] - vexp[a]));
          scale = max(scale, abs(vexp[a]));
        }
        if (i == snode.x && j == snode.y && (ndim == 2u || k == snode.z)) {
          sample_v = vg;
        }
      }
    }
  }
  aux_out[0] = max_err;
  aux_out[1] = scale;
  aux_out[2] = n_massed;
  aux_out[3] = sample_v.x;
  aux_out[4] = sample_v.y;
  aux_out[5] = sample_v.z;
  aux_out[6] = max_pic;
}
