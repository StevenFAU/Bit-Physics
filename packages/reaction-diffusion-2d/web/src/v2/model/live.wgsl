// Turing Patterns — the live solver.
//
// The update rule is the gated kernel's, term for term and in the same order
// (packages/reaction-diffusion-2d/src/gray_scott.wgsl: 5-point Laplacian over
// dx², one autocatalytic term, forward Euler) — on a uniform-chemistry
// periodic dish it reproduces the gated kernel's bytes (v2-acceptance.mjs
// checks this) — with two differences that make this the *live* solver:
//
//   * F and k are fields, not uniforms: a base chemistry, plus (The Map) a
//     sweep across the grid that follows the pattern band (scenes/map.ts),
//     plus whatever the chemistry brush painted.
//   * The grid is W × H and its edges are either periodic (dishes) or
//     zero-flux (The Map), chosen per scene.
//   * MODEL (a pipeline-overridable constant, so each model compiles to its
//     own straight-line kernel) picks the reaction terms: 0 Gray–Scott (the
//     gated rule, above), 1 Brusselator, 2 Gierer–Meinhardt, 3 FitzHugh–
//     Nagumo (model/models.ts). Their two headline parameters ride in the F
//     and k slots and one extra constant in c.x; each has an f64 CPU mirror
//     and a committed golden (reaction_diffusion_2d/reference/models.py).
//
// The browser gate never runs this file; it runs gray_scott.wgsl unchanged.

override MODEL: u32 = 0u;

struct Live {
  w: u32,
  h: u32,
  periodic: u32,
  sweep_on: u32,
  Du: f32,
  Dv: f32,
  dt: f32,
  dx: f32,
  F0: f32,
  k0: f32,
  sweep_f: f32,     // ΔF across the full width (left → right)
  span_a: f32,      // k window height at F: span_a + span_b · (F − map_f_lo)
  anchor_u: f32,    // the sweep is measured relative to this uv (a dive's point)
  anchor_v: f32,
  reveal_r: f32,    // dive: radius (cells) inside which the sweep has faded out; 0 = off
  reveal_edge: f32,
  reveal_x: f32,
  reveal_y: f32,
  map_f_lo: f32,    // F at the left edge
  span_b: f32,
  off_a: f32,       // window centre above the saddle-node line:
  off_b: f32,       //   off_a + off_b · (F − map_f_lo)
  paint_on: u32,    // 0 until the chemistry brush first paints (skips the read)
  _pad1: u32,
  c: vec4<f32>,     // model constants (x: Gierer–Meinhardt σ, FitzHugh–Nagumo a₀)
};

@group(0) @binding(0) var<uniform> L: Live;
@group(0) @binding(1) var<storage, read> state_in: array<f32>;
@group(0) @binding(2) var<storage, read_write> state_out: array<f32>;
@group(0) @binding(3) var<storage, read> paint: array<vec2<u32>>;

// Neighbour index for a ±1 offset: periodic wraps with one compare (the
// gated kernel's general `wrap` uses %, which is slow on GPUs and only ever
// sees ±1 here); zero-flux repeats the edge cell. Same cells, same values.
fn nbr(i: i32, d: i32, n: i32) -> i32 {
  let j = i + d;
  if (L.periodic == 1u) {
    return select(select(j, j - n, j >= n), j + n, j < 0);
  }
  return clamp(j, 0, n - 1);
}

// The Map's chemistry at uv: F grows left → right; in each column k grows
// bottom → top (rows run top → bottom) across a window that follows the
// saddle-node line k = (√F − 2F)/2. Mirrors scenes/map.ts mapChem().
fn map_chem(uv: vec2<f32>) -> vec2<f32> {
  let F = L.map_f_lo + uv.x * L.sweep_f;
  let dF = F - L.map_f_lo;
  let kc = 0.5 * (sqrt(max(F, 0.0)) - 2.0 * F) + L.off_a + L.off_b * dF;
  return vec2<f32>(F, kc + (0.5 - uv.y) * (L.span_a + L.span_b * dF));
}

fn chemistry(i: u32, j: u32) -> vec2<f32> {
  var c = vec2<f32>(L.F0, L.k0);
  if (L.sweep_on == 1u) {
    let uv = vec2<f32>((f32(i) + 0.5) / f32(L.w), (f32(j) + 0.5) / f32(L.h));
    // relative to the anchor, so base + s is continuous through a dive
    let s = map_chem(uv) - map_chem(vec2<f32>(L.anchor_u, L.anchor_v));
    var keep = 1.0;
    if (L.reveal_r > 0.0) {
      let d = distance(vec2<f32>(f32(i), f32(j)), vec2<f32>(L.reveal_x, L.reveal_y));
      keep = smoothstep(L.reveal_r - L.reveal_edge, L.reveal_r, d);
    }
    c = c + s * keep;
  }
  if (L.paint_on == 1u) {
    let p = paint[j * L.w + i];
    let wgt = unpack2x16unorm(p.y).x;
    if (wgt > 0.0) {
      c = mix(c, unpack2x16float(p.x), wgt);
    }
  }
  return c;
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= L.w || gid.y >= L.h) { return; }
  let i  = i32(gid.x);
  let j  = i32(gid.y);
  let w  = i32(L.w);
  let h  = i32(L.h);
  let im = nbr(i, -1, w);
  let ip = nbr(i, 1, w);
  let jm = nbr(j, -1, h);
  let jp = nbr(j, 1, h);
  let c  = (j * w + i) * 2;
  let cl = (j * w + im) * 2;
  let cr = (j * w + ip) * 2;
  let cu = (jm * w + i) * 2;
  let cd = (jp * w + i) * 2;
  let u  = state_in[c];
  let v  = state_in[c + 1];
  let fk = chemistry(gid.x, gid.y);
  let F  = fk.x;
  let k  = fk.y;

  // same terms, same order as gray_scott.wgsl: (i−1) + (i+1) + (j−1) + (j+1) − 4·centre
  let lap_u = (state_in[cl] + state_in[cr]
             + state_in[cu] + state_in[cd]
             - 4.0 * u) / (L.dx * L.dx);
  let lap_v = (state_in[cl + 1] + state_in[cr + 1]
             + state_in[cu + 1] + state_in[cd + 1]
             - 4.0 * v) / (L.dx * L.dx);

  var du: f32;
  var dv: f32;
  if (MODEL == 0u) {
    // Gray–Scott: the gated kernel's expressions, unchanged
    let uvv = u * v * v;
    du = L.Du * lap_u - uvv + F * (1.0 - u);
    dv = L.Dv * lap_v + uvv - (F + k) * v;
  } else if (MODEL == 1u) {
    // Brusselator: A = F slot, B = k slot
    let uuv = u * u * v;
    du = L.Du * lap_u + (F - (k + 1.0) * u + uuv);
    dv = L.Dv * lap_v + (k * u - uuv);
  } else if (MODEL == 2u) {
    // Gierer–Meinhardt: μ = F slot, ν = k slot, σ = c.x
    let uu = u * u;
    du = L.Du * lap_u + (uu / v - F * u + L.c.x);
    dv = L.Dv * lap_v + (uu - k * v);
  } else {
    // FitzHugh–Nagumo: ε = F slot, a₁ = k slot, a₀ = c.x
    du = L.Du * lap_u + (u - u * u * u - v);
    dv = L.Dv * lap_v + F * (u - k * v - L.c.x);
  }

  let idx = (gid.y * L.w + gid.x) * 2u;
  state_out[idx + 0u] = u + L.dt * du;
  state_out[idx + 1u] = v + L.dt * dv;
}
