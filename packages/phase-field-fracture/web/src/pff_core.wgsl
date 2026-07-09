// phase-field-fracture — WGSL compute core (spec-ref § 3.2 pass structure).
//
// Mirrors packages/phase-field-fracture/phase_field_fracture/solver.py
// 1:1 in f32: velocity-Verlet (kick-drift-kick) with lumped mass and
// mass-proportional damping, Q1 elements with FULL 2x2 Gauss quadrature
// (no hourglass modes), hybrid momentum (isotropic degraded stress),
// Miehe strain-spectral psi+ driving force, history max, and the fused
// semi-implicit gradient-flow AT2 damage step (m = chi*dt). Polynomial
// arithmetic only — NO transcendental builtins anywhere on the gated path
// (the § 9 WGSL trig hazard never arises).
//
// Grid layout matches the NumPy reference exactly: nodes (n+1)^2 with
// idx = i*(n+1)+j (j = y, fastest), cells n^2 with idx = i*n+j. Readbacks
// are therefore byte-comparable with the f64 .tobytes() layout.
//
// Determinism: every pass is per-cell/per-node with fixed unrolled loops,
// no atomics on the gated path (labels/partials are visual/diagnostic).

struct Uni {
  n: u32,          // cells per side
  n_nodes: u32,    // n + 1
  dt: f32,
  half_dt: f32,
  h: f32,
  inv_h2: f32,
  inv_mass: f32,   // 1 / h^2
  lam: f32,
  mu: f32,
  c_damp: f32,
  mobility: f32,   // m = chi * dt
  k_res: f32,
  // brush (paint pass only; gate runs never dispatch paint)
  brush_kind: u32, // 0 off | 1 hole | 2 stiff | 3 soft | 4 tough | 5 erase
  brush_x: f32,
  brush_y: f32,
  brush_r: f32,
}

struct StepUni {
  u_top: f32,
  v_top: f32,
  _pad0: f32,
  _pad1: f32,
}

@group(0) @binding(0) var<uniform> U: Uni;
@group(1) @binding(0) var<uniform> S: StepUni;

// pass-specific storage bindings (explicit layouts per pass in solver.ts)
@group(0) @binding(1) var<storage, read_write> buf_u: array<vec2f>;   // nodes
@group(0) @binding(2) var<storage, read_write> buf_v: array<vec2f>;   // nodes
@group(0) @binding(3) var<storage, read_write> buf_a: array<vec2f>;   // nodes
@group(0) @binding(4) var<storage, read> d_cur: array<f32>;           // cells
@group(0) @binding(5) var<storage, read_write> d_next: array<f32>;    // cells
@group(0) @binding(6) var<storage, read_write> buf_h: array<f32>;     // cells
@group(0) @binding(7) var<storage, read_write> mat: array<vec2f>;     // cells (e_mult, gc_mult)
@group(0) @binding(8) var<storage, read_write> cell_f: array<vec2f>;  // cells*4 corner forces
@group(0) @binding(9) var<storage, read_write> en: array<vec2f>;      // cells (ie, efrac)
@group(0) @binding(10) var<storage, read_write> react: array<f32>;    // n+1 top-row -fy
@group(0) @binding(11) var<storage, read_write> partials: array<vec4f>; // reduction
@group(0) @binding(12) var<storage, read> lab_cur: array<u32>;        // cells
@group(0) @binding(13) var<storage, read_write> lab_next: array<u32>; // cells

const WG: u32 = 256u;

// Q1 2x2 Gauss shape-gradient tables, corner order SW,SE,NE,NW; values are
// dN/dxi * (2/h) with the h factor applied at use (tables are +-(1/4)(1+-g)).
// g1 = 1/sqrt(3): entries are 0.25*(1 +- g1) = 0.394337567 / 0.105662433.
const GA: f32 = 0.39433756729740643;  // 0.25*(1+g1)
const GB: f32 = 0.10566243270259355;  // 0.25*(1-g1)

fn node_idx(i: u32, j: u32) -> u32 { return i * U.n_nodes + j; }
fn cell_idx(i: u32, j: u32) -> u32 { return i * U.n + j; }

// ---------------------------------------------------------------------------
// P1: half-kick + drift + displacement BCs (nodes)
// ---------------------------------------------------------------------------
@compute @workgroup_size(WG)
fn integrate(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  let total = U.n_nodes * U.n_nodes;
  if (idx >= total) { return; }
  let j = idx % U.n_nodes;
  var v = buf_v[idx] + U.half_dt * buf_a[idx];
  var u = buf_u[idx] + U.dt * v;
  if (j == 0u) { u = vec2f(0.0, 0.0); }
  if (j == U.n_nodes - 1u) { u = vec2f(0.0, S.u_top); }
  buf_v[idx] = v;
  buf_u[idx] = u;
}

// ---------------------------------------------------------------------------
// P2: per-cell Q1 forces (2x2 Gauss) + center strain -> psi+ -> H max
// ---------------------------------------------------------------------------

// gp gradient tables dN[a][g] for the unit-ordered gps
// gps order: (-g,-g), (g,-g), (g,g), (-g,g); corners SW,SE,NE,NW.
// dndx[a][g] = 0.25*xa*(1+eg*ea)*(2/h); we fold (2/h) at use time.
fn dndx_t(a: u32, g: u32) -> f32 {
  // xa: -1,+1,+1,-1 ; ea: -1,-1,+1,+1 ; eg per gp: -g1,-g1,+g1,+g1
  var t = array<array<f32, 4>, 4>(
    array<f32, 4>(-GA, -GA, -GB, -GB),  // a=SW: -(0.25)(1+eg*(-1)) -> -(0.25)(1-eg)
    array<f32, 4>( GA,  GA,  GB,  GB),  // a=SE
    array<f32, 4>( GB,  GB,  GA,  GA),  // a=NE
    array<f32, 4>(-GB, -GB, -GA, -GA),  // a=NW
  );
  return t[a][g];
}

fn dndy_t(a: u32, g: u32) -> f32 {
  // dndy[a][g] = 0.25*ea*(1+xg*xa); xg per gp: -g1,+g1,+g1,-g1
  var t = array<array<f32, 4>, 4>(
    array<f32, 4>(-GA, -GB, -GB, -GA),  // a=SW
    array<f32, 4>(-GB, -GA, -GA, -GB),  // a=SE
    array<f32, 4>( GB,  GA,  GA,  GB),  // a=NE
    array<f32, 4>( GA,  GB,  GB,  GA),  // a=NW
  );
  return t[a][g];
}

@compute @workgroup_size(WG)
fn cell_forces(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= U.n * U.n) { return; }
  let ci = idx / U.n;
  let cj = idx % U.n;
  // corner displacements SW,SE,NE,NW
  let u0 = buf_u[node_idx(ci, cj)];
  let u1 = buf_u[node_idx(ci + 1u, cj)];
  let u2 = buf_u[node_idx(ci + 1u, cj + 1u)];
  let u3 = buf_u[node_idx(ci, cj + 1u)];
  let m = mat[idx];
  let d = d_cur[idx];
  let omd = 1.0 - d;
  let gd = (omd * omd + U.k_res) * m.x;
  let two_over_h = 2.0 / U.h;
  let wdet = 0.25 * U.h * U.h;

  var f0 = vec2f(0.0); var f1 = vec2f(0.0); var f2 = vec2f(0.0); var f3 = vec2f(0.0);
  var ie_cell = 0.0;
  for (var g = 0u; g < 4u; g++) {
    let dx0 = dndx_t(0u, g) * two_over_h; let dy0 = dndy_t(0u, g) * two_over_h;
    let dx1 = dndx_t(1u, g) * two_over_h; let dy1 = dndy_t(1u, g) * two_over_h;
    let dx2 = dndx_t(2u, g) * two_over_h; let dy2 = dndy_t(2u, g) * two_over_h;
    let dx3 = dndx_t(3u, g) * two_over_h; let dy3 = dndy_t(3u, g) * two_over_h;
    let exx = dx0 * u0.x + dx1 * u1.x + dx2 * u2.x + dx3 * u3.x;
    let eyy = dy0 * u0.y + dy1 * u1.y + dy2 * u2.y + dy3 * u3.y;
    let exy = 0.5 * ((dy0 * u0.x + dy1 * u1.x + dy2 * u2.x + dy3 * u3.x)
                    + (dx0 * u0.y + dx1 * u1.y + dx2 * u2.y + dx3 * u3.y));
    let tr = exx + eyy;
    let sxx = gd * (U.lam * tr + 2.0 * U.mu * exx);
    let syy = gd * (U.lam * tr + 2.0 * U.mu * eyy);
    let sxy = gd * (2.0 * U.mu * exy);
    ie_cell += wdet * 0.5 * (sxx * exx + syy * eyy + 2.0 * sxy * exy);
    f0 -= wdet * vec2f(dx0 * sxx + dy0 * sxy, dy0 * syy + dx0 * sxy);
    f1 -= wdet * vec2f(dx1 * sxx + dy1 * sxy, dy1 * syy + dx1 * sxy);
    f2 -= wdet * vec2f(dx2 * sxx + dy2 * sxy, dy2 * syy + dx2 * sxy);
    f3 -= wdet * vec2f(dx3 * sxx + dy3 * sxy, dy3 * syy + dx3 * sxy);
  }
  cell_f[idx * 4u + 0u] = f0;
  cell_f[idx * 4u + 1u] = f1;
  cell_f[idx * 4u + 2u] = f2;
  cell_f[idx * 4u + 3u] = f3;
  en[idx] = vec2f(ie_cell, en[idx].y);

  // center strain -> Miehe strain-spectral psi+ -> history max
  let i2h = 1.0 / (2.0 * U.h);
  let exx_c = ((u1.x + u2.x) - (u0.x + u3.x)) * i2h;
  let eyy_c = ((u2.y + u3.y) - (u0.y + u1.y)) * i2h;
  let exy_c = 0.5 * (((u2.x + u3.x) - (u0.x + u1.x)) * i2h
                    + ((u1.y + u2.y) - (u0.y + u3.y)) * i2h);
  let tr_c = exx_c + eyy_c;
  let disc = sqrt(((exx_c - eyy_c) * 0.5) * ((exx_c - eyy_c) * 0.5) + exy_c * exy_c);
  let e1 = tr_c * 0.5 + disc;
  let e2 = tr_c * 0.5 - disc;
  let trp = max(tr_c, 0.0);
  let e1p = max(e1, 0.0);
  let e2p = max(e2, 0.0);
  let psi = (0.5 * U.lam * trp * trp + U.mu * (e1p * e1p + e2p * e2p)) * m.x;
  buf_h[idx] = max(buf_h[idx], psi);
}

// ---------------------------------------------------------------------------
// P3: fused semi-implicit gradient-flow AT2 damage step (spec-ref § 3.5)
// ---------------------------------------------------------------------------
fn d_at(i: i32, j: i32) -> f32 {
  // Neumann (mirror) boundaries, matching np.pad(mode="edge")
  let ii = clamp(i, 0, i32(U.n) - 1);
  let jj = clamp(j, 0, i32(U.n) - 1);
  return d_cur[u32(ii) * U.n + u32(jj)];
}

@compute @workgroup_size(WG)
fn damage(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= U.n * U.n) { return; }
  let i = i32(idx / U.n);
  let j = i32(idx % U.n);
  let d = d_cur[idx];
  let hh = buf_h[idx];
  let gc = mat[idx].y;
  let s_nb = d_at(i - 1, j) + d_at(i + 1, j) + d_at(i, j - 1) + d_at(i, j + 1);
  let num = d + U.mobility * (2.0 * hh + gc * (s_nb * U.inv_h2));
  let den = 1.0 + U.mobility * (gc * (1.0 + 4.0 * U.inv_h2) + 2.0 * hh);
  let dn = max(d, num / den);
  d_next[idx] = dn;
  // regularized surface-energy density (diagnostic; forward-like gradient)
  let gx = (d_at(i + 1, j) - d_at(i - 1, j)) * 0.5 / U.h;
  let gy = (d_at(i, j + 1) - d_at(i, j - 1)) * 0.5 / U.h;
  en[idx] = vec2f(en[idx].x, 0.5 * gc * (dn * dn + gx * gx + gy * gy) * U.h * U.h);
}

// ---------------------------------------------------------------------------
// P4: node force gather + damping + closing half-kick + velocity BCs
// ---------------------------------------------------------------------------
@compute @workgroup_size(WG)
fn finish(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  let total = U.n_nodes * U.n_nodes;
  if (idx >= total) { return; }
  let i = idx / U.n_nodes;
  let j = idx % U.n_nodes;
  // gather this node's corner-slot contributions from its <=4 cells:
  // cell (i-1, j-1) sees it as NE(2), (i, j-1) as NW(3),
  // cell (i-1, j) as SE(1),   (i, j)   as SW(0)
  var f = vec2f(0.0);
  if (i > 0u && j > 0u)       { f += cell_f[cell_idx(i - 1u, j - 1u) * 4u + 2u]; }
  if (i < U.n && j > 0u)      { f += cell_f[cell_idx(i, j - 1u) * 4u + 3u]; }
  if (i > 0u && j < U.n)      { f += cell_f[cell_idx(i - 1u, j) * 4u + 1u]; }
  if (i < U.n && j < U.n)     { f += cell_f[cell_idx(i, j) * 4u + 0u]; }
  if (j == U.n_nodes - 1u) { react[i] = -f.y; }
  var v = buf_v[idx];
  let a = f * U.inv_mass - U.c_damp * v;
  v = v + U.half_dt * a;
  if (j == 0u) { v = vec2f(0.0, 0.0); }
  if (j == U.n_nodes - 1u) { v = vec2f(0.0, S.v_top); }
  buf_v[idx] = v;
  buf_a[idx] = a;
}

// ---------------------------------------------------------------------------
// paint pass (INTERACT brush — never dispatched during gate capture)
// ---------------------------------------------------------------------------
@compute @workgroup_size(WG)
fn paint(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= U.n * U.n) { return; }
  let ci = f32(idx / U.n) + 0.5;
  let cj = f32(idx % U.n) + 0.5;
  let dx = ci - U.brush_x;
  let dy = cj - U.brush_y;
  if (dx * dx + dy * dy > U.brush_r * U.brush_r) { return; }
  var m = mat[idx];
  switch (U.brush_kind) {
    case 1u: { m.x = 1e-6; }            // hole (void)
    case 2u: { m.x = 4.0; }             // stiff inclusion
    case 3u: { m.x = 0.25; }            // soft inclusion
    case 4u: { m.y = 4.0; }             // tough (Gc x4)
    case 5u: { m = vec2f(1.0, 1.0); }   // erase
    default: {}
  }
  mat[idx] = m;
}

// ---------------------------------------------------------------------------
// diagnostics: two-stage partial reduction (display/checkpoint only)
// partials[wg] = (sum ke | sum ie, sum efrac, max d, nan flag)
// ---------------------------------------------------------------------------
var<workgroup> scratch: array<vec4f, WG>;

@compute @workgroup_size(WG)
fn reduce_cells(@builtin(global_invocation_id) gid: vec3u,
                @builtin(local_invocation_id) lid: vec3u,
                @builtin(workgroup_id) wid: vec3u) {
  let idx = gid.x;
  var v = vec4f(0.0);
  if (idx < U.n * U.n) {
    let e = en[idx];
    let d = d_next[idx];
    var nan = 0.0;
    if (e.x != e.x || d != d) { nan = 1.0; }
    v = vec4f(e.x, e.y, d, nan);
  }
  scratch[lid.x] = v;
  workgroupBarrier();
  var stride = WG / 2u;
  while (stride > 0u) {
    if (lid.x < stride) {
      let a = scratch[lid.x];
      let b = scratch[lid.x + stride];
      scratch[lid.x] = vec4f(a.x + b.x, a.y + b.y, max(a.z, b.z), max(a.w, b.w));
    }
    workgroupBarrier();
    stride = stride / 2u;
  }
  if (lid.x == 0u) { partials[wid.x] = scratch[0]; }
}

@compute @workgroup_size(WG)
fn reduce_nodes(@builtin(global_invocation_id) gid: vec3u,
                @builtin(local_invocation_id) lid: vec3u,
                @builtin(workgroup_id) wid: vec3u) {
  let idx = gid.x;
  var v = vec4f(0.0);
  if (idx < U.n_nodes * U.n_nodes) {
    let vel = buf_v[idx];
    let u = buf_u[idx];
    var nan = 0.0;
    if (u.x != u.x || u.y != u.y || vel.x != vel.x) { nan = 1.0; }
    v = vec4f(vel.x * vel.x + vel.y * vel.y, abs(u.x) + abs(u.y), 0.0, nan);
  }
  scratch[lid.x] = v;
  workgroupBarrier();
  var stride = WG / 2u;
  while (stride > 0u) {
    if (lid.x < stride) {
      let a = scratch[lid.x];
      let b = scratch[lid.x + stride];
      scratch[lid.x] = vec4f(a.x + b.x, max(a.y, b.y), 0.0, max(a.w, b.w));
    }
    workgroupBarrier();
    stride = stride / 2u;
  }
  if (lid.x == 0u) { partials[wid.x] = scratch[0]; }
}

// ---------------------------------------------------------------------------
// fragment connected-component labels (visual only, ungated)
// ---------------------------------------------------------------------------
@compute @workgroup_size(WG)
fn labels_init(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= U.n * U.n) { return; }
  let intact = d_next[idx] < 0.5 && mat[idx].x > 1e-3;
  lab_next[idx] = select(0xffffffffu, idx, intact);
}

@compute @workgroup_size(WG)
fn labels_prop(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= U.n * U.n) { return; }
  // damage-aware persistent propagation: freshly broken cells drop out
  // between re-inits, so fragment tints stay stable frame to frame
  if (d_cur[idx] >= 0.5 || mat[idx].x <= 1e-3) {
    lab_next[idx] = 0xffffffffu;
    return;
  }
  var l = lab_cur[idx];
  if (l == 0xffffffffu) { l = idx; }
  let i = i32(idx / U.n);
  let j = i32(idx % U.n);
  let nn = i32(U.n);
  if (i > 0)      { l = min(l, lab_cur[idx - U.n]); }
  if (i < nn - 1) { l = min(l, lab_cur[idx + U.n]); }
  if (j > 0)      { l = min(l, lab_cur[idx - 1u]); }
  if (j < nn - 1) { l = min(l, lab_cur[idx + 1u]); }
  lab_next[idx] = l;
}
