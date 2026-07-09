// phase-field-fracture — uber-composite render pass (spec-ref § 5.1).
// One fragment pass reads every field once: displacement-warped material
// with real crack opening, fragment tint (connected-component labels),
// history-driven crack-tip glow, stress colormap, elastic-wave shimmer.
// Purely visual — no tolerance-bearing logic lives here.

struct RUni {
  n: u32,
  n_nodes: u32,
  h: f32,
  warp: f32,        // displacement amplification (in cell units per ell)
  layers: u32,      // bit0 stress, bit1 glow, bit2 shimmer, bit3 labels, bit4 warp
  exposure: f32,
  lam: f32,
  mu: f32,
}

@group(0) @binding(0) var<uniform> R: RUni;
@group(0) @binding(1) var<storage, read> r_u: array<vec2f>;
@group(0) @binding(2) var<storage, read> r_v: array<vec2f>;
@group(0) @binding(3) var<storage, read> r_d: array<f32>;
@group(0) @binding(4) var<storage, read> r_h: array<f32>;
@group(0) @binding(5) var<storage, read> r_mat: array<vec2f>;
@group(0) @binding(6) var<storage, read> r_lab: array<u32>;

struct VOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vs(@builtin(vertex_index) vi: u32) -> VOut {
  var xy = array<vec2f, 3>(vec2f(-1.0, -3.0), vec2f(3.0, 1.0), vec2f(-1.0, 1.0));
  var out: VOut;
  out.pos = vec4f(xy[vi], 0.0, 1.0);
  out.uv = vec2f(xy[vi].x * 0.5 + 0.5, 0.5 - xy[vi].y * 0.5);
  return out;
}

fn node_at(i: u32, j: u32) -> vec2f {
  let ii = min(i, R.n_nodes - 1u);
  let jj = min(j, R.n_nodes - 1u);
  return r_u[ii * R.n_nodes + jj];
}

fn vel_at(i: u32, j: u32) -> vec2f {
  let ii = min(i, R.n_nodes - 1u);
  let jj = min(j, R.n_nodes - 1u);
  return r_v[ii * R.n_nodes + jj];
}

fn u_bilinear(p: vec2f) -> vec2f {
  // p in node coordinates [0, n]
  let i0 = u32(clamp(floor(p.x), 0.0, f32(R.n_nodes - 2u)));
  let j0 = u32(clamp(floor(p.y), 0.0, f32(R.n_nodes - 2u)));
  let fx = clamp(p.x - f32(i0), 0.0, 1.0);
  let fy = clamp(p.y - f32(j0), 0.0, 1.0);
  let a = node_at(i0, j0);
  let b = node_at(i0 + 1u, j0);
  let c = node_at(i0, j0 + 1u);
  let d = node_at(i0 + 1u, j0 + 1u);
  return mix(mix(a, b, fx), mix(c, d, fx), fy);
}

fn v_bilinear(p: vec2f) -> vec2f {
  let i0 = u32(clamp(floor(p.x), 0.0, f32(R.n_nodes - 2u)));
  let j0 = u32(clamp(floor(p.y), 0.0, f32(R.n_nodes - 2u)));
  let fx = clamp(p.x - f32(i0), 0.0, 1.0);
  let fy = clamp(p.y - f32(j0), 0.0, 1.0);
  let a = vel_at(i0, j0);
  let b = vel_at(i0 + 1u, j0);
  let c = vel_at(i0, j0 + 1u);
  let d = vel_at(i0 + 1u, j0 + 1u);
  return mix(mix(a, b, fx), mix(c, d, fx), fy);
}

fn cell_of(p: vec2f) -> u32 {
  let i = u32(clamp(floor(p.x), 0.0, f32(R.n - 1u)));
  let j = u32(clamp(floor(p.y), 0.0, f32(R.n - 1u)));
  return i * R.n + j;
}

fn cell_strain_energy(ci: u32, cj: u32) -> vec2f {
  // (psi_iso, psi_plus-ish) from the cell's corner displacements
  let u0 = node_at(ci, cj);
  let u1 = node_at(ci + 1u, cj);
  let u2 = node_at(ci + 1u, cj + 1u);
  let u3 = node_at(ci, cj + 1u);
  let i2h = 1.0 / (2.0 * R.h);
  let exx = ((u1.x + u2.x) - (u0.x + u3.x)) * i2h;
  let eyy = ((u2.y + u3.y) - (u0.y + u1.y)) * i2h;
  let exy = 0.5 * (((u2.x + u3.x) - (u0.x + u1.x)) * i2h
                  + ((u1.y + u2.y) - (u0.y + u3.y)) * i2h);
  let tr = exx + eyy;
  let disc = sqrt(((exx - eyy) * 0.5) * ((exx - eyy) * 0.5) + exy * exy);
  let e1 = max(tr * 0.5 + disc, 0.0);
  let e2 = max(tr * 0.5 - disc, 0.0);
  let trp = max(tr, 0.0);
  let psi_p = 0.5 * R.lam * trp * trp + R.mu * (e1 * e1 + e2 * e2);
  let psi_i = 0.5 * R.lam * tr * tr
    + R.mu * (exx * exx + eyy * eyy + 2.0 * exy * exy);
  return vec2f(psi_i, psi_p);
}

fn hash_hue(l: u32) -> vec3f {
  let x = f32((l * 2654435761u) & 0xffffu) / 65535.0;
  // cheap hue wheel
  let r = clamp(abs(x * 6.0 - 3.0) - 1.0, 0.0, 1.0);
  let g = clamp(2.0 - abs(x * 6.0 - 2.0), 0.0, 1.0);
  let b = clamp(2.0 - abs(x * 6.0 - 4.0), 0.0, 1.0);
  return vec3f(r, g, b);
}

// magma-ish ramp (polynomial, no textures)
fn heatmap(t: f32) -> vec3f {
  let x = clamp(t, 0.0, 1.0);
  return vec3f(
    clamp(1.6 * x - 0.1 * x * x, 0.0, 1.0),
    clamp(1.4 * x * x - 0.2 * x, 0.0, 1.0),
    clamp(0.4 * x + 2.2 * x * x * (1.0 - x), 0.0, 1.0) * 0.6,
  );
}

@fragment
fn fs(in: VOut) -> @location(0) vec4f {
  let np = f32(R.n);
  var p = vec2f(in.uv.x * np, (1.0 - in.uv.y) * np); // y up
  // displacement warp with REAL crack opening: pull back by u(p)
  if ((R.layers & 16u) != 0u) {
    let u_here = u_bilinear(p);
    p = p - R.warp * u_here / R.h;
  }
  if (p.x < 0.0 || p.y < 0.0 || p.x >= np || p.y >= np) {
    return vec4f(0.016, 0.02, 0.028, 1.0); // opened gap / outside
  }
  let ci = u32(clamp(floor(p.x), 0.0, np - 1.0));
  let cj = u32(clamp(floor(p.y), 0.0, np - 1.0));
  let idx = ci * R.n + cj;
  let m = r_mat[idx];
  let d = r_d[idx];

  // base material: steel-blue modulated by E(x), Gc(x)
  var col = vec3f(0.30, 0.36, 0.44);
  if (m.x < 1e-3) {
    col = vec3f(0.016, 0.02, 0.028); // void / hole
  } else {
    col *= clamp(0.55 + 0.3 * log2(max(m.x, 0.05)) * 0.25 + 0.45, 0.35, 1.6);
    if (m.y > 1.5) { col = mix(col, vec3f(0.28, 0.5, 0.34), 0.5); } // tough
    // fragment tint — only DETACHED fragments (the primary component
    // keeps label 0 via the bottom-left cell and stays untinted)
    if ((R.layers & 8u) != 0u) {
      let l = r_lab[idx];
      if (l != 0xffffffffu && l != 0u) {
        col = mix(col, hash_hue(l), 0.22);
      }
    }
    // faint grain so the warp is visible (soft amplitude; neighbour-
    // averaged to avoid per-cell checkerboard shimmer)
    let g0 = fract(sin(f32(idx) * 12.9898) * 43758.547);
    let g1 = fract(sin(f32(idx + 1u) * 12.9898) * 43758.547);
    let g2 = fract(sin(f32(idx + R.n) * 12.9898) * 43758.547);
    col *= 0.975 + 0.05 * (g0 + g1 + g2) / 3.0;
  }

  // stress colormap layer
  let en = cell_strain_energy(ci, cj);
  if ((R.layers & 1u) != 0u && m.x > 1e-3) {
    let s = 1.0 - exp(-en.x * R.exposure * ((1.0 - d) * (1.0 - d) + 1e-6));
    col = mix(col, heatmap(s), 0.65 * s + 0.1);
  }

  // crack body: dark gap with hot rim
  if (d > 0.25 && m.x > 1e-3) {
    let core = smoothstep(0.55, 0.95, d);
    let rim = smoothstep(0.25, 0.6, d) - core;
    col = mix(col, vec3f(0.01, 0.012, 0.02), core);
    col += vec3f(0.55, 0.16, 0.05) * rim;
  }

  // crack-tip glow: active driving = high psi+ AND partial damage
  if ((R.layers & 2u) != 0u && m.x > 1e-3) {
    let act = en.y * d * (1.0 - d) * R.exposure * 8.0;
    col += vec3f(1.0, 0.55, 0.18) * clamp(act, 0.0, 0.9);
  }

  // elastic-wave shimmer
  if ((R.layers & 4u) != 0u) {
    let v = v_bilinear(p);
    let sp = length(v) * 6.0;
    col += vec3f(0.10, 0.16, 0.30) * clamp(sp, 0.0, 0.8);
  }

  return vec4f(pow(col, vec3f(0.92)), 1.0);
}
