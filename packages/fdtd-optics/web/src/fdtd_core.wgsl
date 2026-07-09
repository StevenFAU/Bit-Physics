// fdtd-optics — 2D TMz Yee FDTD compute kernels (f32, normalized units
// c = eps0 = mu0 = 1, dx = 1, dt = S_c). Spec:
// docs/sim-specs/electromagnetics/fdtd-optics/spec-ref.md § 3 / § 8.
//
// Field layout (row-major, idx = i*ny + j, i = x index, j = y index — the
// same layout as the f64 references):
//   ez[i*ny+j]  Ez at integer (i, j)
//   hx[i*ny+j]  Hx at (i, j+1/2)   valid j < ny-1 (tail stays 0)
//   hy[i*ny+j]  Hy at (i+1/2, j)   valid i < nx-1 (tail stays 0)
//
// Materials:
//   mat[idx]  = vec4(eps_inf, sigma, drude_wp, drude_gamma)
//   mat2[idx] = vec2(kerr_chi3, flags)   flags: 1.0 = PEC
//
// CPML (depth-indexed coefficient rows, stride S = pmlStride, JS-f64
// precomputed — exp() never evaluated in WGSL on a gated path):
//   pml[0S..] bEx | pml[1S..] aEx | pml[2S..] kinvEx   (E pass, x deriv @ i)
//   pml[3S..] bEy | pml[4S..] aEy | pml[5S..] kinvEy   (E pass, y deriv @ j)
//   pml[6S..] bHx | pml[7S..] aHx | pml[8S..] kinvHx   (H pass, @ i+1/2)
//   pml[9S..] bHy | pml[10S..] aHy | pml[11S..] kinvHy (H pass, @ j+1/2)
//   Interior: b = 0, a = 0, kinv = 1 (psi collapses to 0, no branching).
//
// auxE[idx] = vec4(psi_ez_x, psi_ez_y, drude_jz, envelope)
// auxH[idx] = vec2(psi_hx_y, psi_hy_x)
// aux1d: ezi at [0, na), hyi at [na, 2*na) — the TF/SF 1-D incident grid.
// phasor: running-DFT accumulators, vec2(re, im) x { ez, hx, hy } sections.
// monitor: line-DFT accumulators for the flux gates (no atomics).
// probe: ez time-trace ring (Fresnel gate + oscilloscope probe).

struct U {
  nx: u32,
  ny: u32,
  na: u32,
  flags: u32,        // bit0 periodicY, bit1 tfsf on, bit2 monitor on
  t: f32,            // step index (time level n at kernel entry)
  sc: f32,
  srcVal: f32,       // aux-grid hard-source value for this substep (JS-f64)
  dftCos: f32,       // phasor cos(w t), JS-f64
  dftSin: f32,
  ia: u32,           // TF/SF box (Ez indices, inclusive)
  ib: u32,
  ja: u32,
  jb: u32,
  mia: u32,          // monitor box (Ez indices, inclusive)
  mib: u32,
  mja: u32,
  mjb: u32,
  probeIdx: u32,     // flattened probe cell
  probeSlot: u32,    // ring slot for this substep
  srcCount: u32,
  brushOn: u32,
  pmlStride: u32,
  pad0: u32,
  pad1: u32,
  monTrig: vec4f,    // cos0, sin0, cos1, sin1 for the 2-freq monitor DFT
  brushPos: vec4f,   // x, y, r^2, unused
  brushMat: vec4f,   // material to paint
  brushMat2: vec4f,  // (chi3, flags, -, -)
  sources: array<vec4f, 32>, // i, j, injected value (JS-f64 signature), on
}

@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var<storage, read_write> ez: array<f32>;
@group(0) @binding(2) var<storage, read_write> hx: array<f32>;
@group(0) @binding(3) var<storage, read_write> hy: array<f32>;
@group(0) @binding(4) var<storage, read_write> mat: array<vec4f>;
@group(0) @binding(5) var<storage, read_write> mat2: array<vec2f>;
@group(0) @binding(6) var<storage, read_write> auxE: array<vec4f>;
@group(0) @binding(7) var<storage, read_write> auxH: array<vec2f>;
@group(1) @binding(0) var<storage, read_write> pml: array<f32>;
@group(1) @binding(1) var<storage, read_write> aux1d: array<f32>;
@group(1) @binding(2) var<storage, read_write> phasor: array<vec2f>;
@group(1) @binding(3) var<storage, read_write> monitor: array<vec2f>;
@group(1) @binding(4) var<storage, read_write> probe: array<f32>;

fn periodicY() -> bool { return (u.flags & 1u) != 0u; }

// ---------------------------------------------------------------- H update
@compute @workgroup_size(16, 16)
fn h_update(@builtin(global_invocation_id) gid: vec3u) {
  let j = gid.x;
  let i = gid.y;
  if (i >= u.nx || j >= u.ny) { return; }
  let idx = i * u.ny + j;
  let s = u.pmlStride;
  var psi = auxH[idx];

  // Hx at (i, j+1/2): dHx/dt = -[ (1/ky) dEz/dy + psi ]
  if (j < u.ny - 1u || periodicY()) {
    let jp = select(j + 1u, 0u, j == u.ny - 1u);
    let d = ez[i * u.ny + jp] - ez[idx];
    psi.x = pml[9u * s + j] * psi.x + pml[10u * s + j] * d;
    hx[idx] = hx[idx] - u.sc * (pml[11u * s + j] * d + psi.x);
  }
  // Hy at (i+1/2, j): dHy/dt = +[ (1/kx) dEz/dx + psi ]
  if (i < u.nx - 1u) {
    let d = ez[(i + 1u) * u.ny + j] - ez[idx];
    psi.y = pml[6u * s + i] * psi.y + pml[7u * s + i] * d;
    hy[idx] = hy[idx] + u.sc * (pml[8u * s + i] * d + psi.y);
  }
  auxH[idx] = psi;
}

// ------------------------------------------------- TF/SF H-side correction
// One thread per boundary cell: [0, w) left col, [w, 2w) right col, then
// bottom row, top row. Uses ezi at time level n (pre-advance).
@compute @workgroup_size(64)
fn tfsf_h(@builtin(global_invocation_id) gid: vec3u) {
  if ((u.flags & 2u) == 0u) { return; }
  let w = u.jb - u.ja + 1u;
  let hgt = u.ib - u.ia + 1u;
  let tid = gid.x;
  if (tid < w) { // left column: Hy[ia-1/2, j] reads TF Ez[ia, j]
    let j = u.ja + tid;
    hy[(u.ia - 1u) * u.ny + j] -= u.sc * aux1d[u.ia];
  } else if (tid < 2u * w) { // right column: Hy[ib+1/2, j]
    let j = u.ja + (tid - w);
    hy[u.ib * u.ny + j] += u.sc * aux1d[u.ib];
  } else if (tid < 2u * w + hgt) { // bottom row: Hx[i, ja-1/2]
    let i = u.ia + (tid - 2u * w);
    hx[i * u.ny + (u.ja - 1u)] += u.sc * aux1d[i];
  } else if (tid < 2u * w + 2u * hgt) { // top row: Hx[i, jb+1/2]
    let i = u.ia + (tid - 2u * w - hgt);
    hx[i * u.ny + u.jb] -= u.sc * aux1d[i];
  }
}

// ------------------------------------------------------- aux 1-D grid, H
@compute @workgroup_size(64)
fn aux_h(@builtin(global_invocation_id) gid: vec3u) {
  if ((u.flags & 2u) == 0u) { return; }
  let k = gid.x;
  if (k < u.na - 1u) {
    aux1d[u.na + k] += u.sc * (aux1d[k + 1u] - aux1d[k]);
  }
}

// ---------------------------------------- aux 1-D grid, E + hard source
@compute @workgroup_size(64)
fn aux_e(@builtin(global_invocation_id) gid: vec3u) {
  if ((u.flags & 2u) == 0u) { return; }
  let k = gid.x;
  if (k == 0u) {
    aux1d[0] = u.srcVal;
  } else if (k < u.na - 1u) {
    aux1d[k] += u.sc * (aux1d[u.na + k] - aux1d[u.na + k - 1u]);
  }
}

// ---------------------------------------------------------------- E update
// General material path. With sigma = wp = chi3 = 0 and kinv = 1 / psi = 0
// this reduces exactly to ez += sc * (1/eps) * curl (the gate contract).
@compute @workgroup_size(16, 16)
fn e_update(@builtin(global_invocation_id) gid: vec3u) {
  let j = gid.x;
  let i = gid.y;
  if (i >= u.nx || j >= u.ny) { return; }
  // PEC outer boundary in x always; y edges are PEC unless periodic
  if (i == 0u || i == u.nx - 1u) { return; }
  if (!periodicY() && (j == 0u || j == u.ny - 1u)) { return; }
  let idx = i * u.ny + j;
  let s = u.pmlStride;

  let m2 = mat2[idx];
  if (m2.y > 0.5) { // PEC cell
    ez[idx] = 0.0;
    return;
  }
  let jm = select(j - 1u, u.ny - 1u, j == 0u);
  let dhy = hy[idx] - hy[(i - 1u) * u.ny + j];
  let dhx = hx[idx] - hx[i * u.ny + jm];

  var aE = auxE[idx];
  aE.x = pml[0u * s + i] * aE.x + pml[1u * s + i] * dhy;
  aE.y = pml[3u * s + j] * aE.y + pml[4u * s + j] * dhx;
  let curl = pml[2u * s + i] * dhy + aE.x - (pml[5u * s + j] * dhx + aE.y);

  let m = mat[idx];
  let eps = m.x;
  var e = ez[idx];

  if (m2.x > 0.0) {
    // Kerr chi3 cell (sigma = wp = 0 by scene construction): D-based update
    // with Meep's Pade D->E factor (verified from meep src/step_generic.cpp).
    let d0 = eps * e + m2.x * e * e * e;
    let d1 = d0 + u.sc * curl;
    let c3 = d1 * d1 * m2.x / (eps * eps * eps);
    e = (d1 / eps) * (1.0 + 2.0 * c3) / (1.0 + 3.0 * c3);
  } else if (m.z > 0.0 || m.y > 0.0) {
    // lossy and/or Drude cell — semi-implicit ADE (spec § 8.3, preserves CFL)
    let g = m.w;
    let kj = (1.0 - g * u.sc * 0.5) / (1.0 + g * u.sc * 0.5);
    let beta = select(0.0, (m.z * m.z * u.sc * 0.5) / (1.0 + g * u.sc * 0.5), m.z > 0.0);
    let jz = aE.z;
    let a = eps / u.sc + (m.y + beta) * 0.5;
    let b = eps / u.sc - (m.y + beta) * 0.5;
    let eNew = (b * e + curl - 0.5 * (1.0 + kj) * jz) / a;
    aE.z = kj * jz + beta * (eNew + e);
    e = eNew;
  } else {
    e = e + u.sc * (1.0 / eps) * curl;
  }
  aE.w = max(abs(e), aE.w * 0.995); // envelope / peak-hold (render only)
  auxE[idx] = aE;
  ez[idx] = e;
}

// ------------------------------------------------- TF/SF E-side correction
@compute @workgroup_size(64)
fn tfsf_e(@builtin(global_invocation_id) gid: vec3u) {
  if ((u.flags & 2u) == 0u) { return; }
  let w = u.jb - u.ja + 1u;
  let tid = gid.x;
  if (tid < w) { // Ez[ia, j] reads SF Hy[ia-1/2, j]
    let j = u.ja + tid;
    ez[u.ia * u.ny + j] -= u.sc * aux1d[u.na + u.ia - 1u];
  } else if (tid < 2u * w) { // Ez[ib, j] reads SF Hy[ib+1/2, j]
    let j = u.ja + (tid - w);
    ez[u.ib * u.ny + j] += u.sc * aux1d[u.na + u.ib];
  }
}

// ----------------------------------------------------------- point sources
@compute @workgroup_size(32)
fn inject_points(@builtin(global_invocation_id) gid: vec3u) {
  let k = gid.x;
  if (k >= u.srcCount) { return; }
  let src = u.sources[k];
  if (src.w < 0.5) { return; }
  let idx = u32(src.x) * u.ny + u32(src.y);
  ez[idx] += src.z; // soft additive current, value precomputed JS-f64
}

// ------------------------------------------------------ phasor accumulation
// Running DFT at the display frequency: F += f * e^{-i w t}.
@compute @workgroup_size(16, 16)
fn phasor_accum(@builtin(global_invocation_id) gid: vec3u) {
  let j = gid.x;
  let i = gid.y;
  if (i >= u.nx || j >= u.ny) { return; }
  let idx = i * u.ny + j;
  let n2 = u.nx * u.ny;
  let c = u.dftCos;
  let s = -u.dftSin;
  phasor[idx] += vec2f(ez[idx] * c, ez[idx] * s);
  phasor[n2 + idx] += vec2f(hx[idx] * c, hx[idx] * s);
  phasor[2u * n2 + idx] += vec2f(hy[idx] * c, hy[idx] * s);
}

// --------------------------------------------------- monitor-line DFT (flux)
// 4 lines around the monitor box; per (line, cell, freq): accumulate Ez and
// the H components INTERPOLATED to the Ez point, for JS-side Poynting flux.
@compute @workgroup_size(64)
fn monitor_dft(@builtin(global_invocation_id) gid: vec3u) {
  if ((u.flags & 4u) == 0u) { return; }
  let tid = gid.x;
  let len = max(u.mib - u.mia, u.mjb - u.mja) + 1u;
  let total = 4u * len * 2u;
  if (tid >= total) { return; }
  let line = tid / (len * 2u);
  let rest = tid % (len * 2u);
  let cell = rest / 2u;
  let f = rest % 2u;

  var i: u32;
  var j: u32;
  if (line == 0u) { i = u.mia; j = u.mja + cell; }       // left  (x = mia)
  else if (line == 1u) { i = u.mib; j = u.mja + cell; }  // right (x = mib)
  else if (line == 2u) { i = u.mia + cell; j = u.mja; }  // bottom (y = mja)
  else { i = u.mia + cell; j = u.mjb; }                  // top (y = mjb)
  if (j > u.mjb || i > u.mib) { return; }

  let idx = i * u.ny + j;
  let ezv = ez[idx];
  let hxc = 0.5 * (hx[idx] + hx[i * u.ny + (j - 1u)]);
  let hyc = 0.5 * (hy[idx] + hy[(i - 1u) * u.ny + j]);
  var c: f32;
  var s: f32;
  if (f == 0u) { c = u.monTrig.x; s = -u.monTrig.y; }
  else { c = u.monTrig.z; s = -u.monTrig.w; }

  let base = ((line * len + cell) * 2u + f) * 3u;
  monitor[base] += vec2f(ezv * c, ezv * s);
  monitor[base + 1u] += vec2f(hxc * c, hxc * s);
  monitor[base + 2u] += vec2f(hyc * c, hyc * s);
}

// ----------------------------------------------------------- probe capture
@compute @workgroup_size(1)
fn probe_capture() {
  probe[u.probeSlot] = ez[u.probeIdx];
}

// ------------------------------------------------------------- paint brush
@compute @workgroup_size(16, 16)
fn paint(@builtin(global_invocation_id) gid: vec3u) {
  if (u.brushOn == 0u) { return; }
  let j = gid.x;
  let i = gid.y;
  if (i >= u.nx || j >= u.ny) { return; }
  let dx = f32(i) - u.brushPos.x;
  let dy = f32(j) - u.brushPos.y;
  if (dx * dx + dy * dy > u.brushPos.z) { return; }
  if (i == 0u || j == 0u || i >= u.nx - 1u || j >= u.ny - 1u) { return; }
  let idx = i * u.ny + j;
  mat[idx] = u.brushMat;
  mat2[idx] = vec2f(u.brushMat2.x, u.brushMat2.y);
  if (u.brushMat2.y > 0.5) { ez[idx] = 0.0; }
}
