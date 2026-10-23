// Slime Mould — the live solver. The gated Jones (2010) kernel
// (packages/physarum/src/physarum.wgsl) restructured for millions of agents,
// with its arithmetic kept term for term:
//   * agents pack into one vec4 (pos.xy, head.xy) — one load, one store;
//   * the trail is row-major (y·w + x); the gated kernel is x-major (x·h + y);
//   * apply + diffuse fuse into one pass: each neighbour's mid value is
//     T_in + f32(dep)/SCALE, exactly the gated apply, and the 3×3 sum keeps
//     the gated order (x offset outer, y offset inner). Two deposit buffers
//     alternate, so the fused pass clears the one the next step deposits into;
//   * the stencil wraps with compares instead of integer % (2.6× faster in
//     stencils on the RX 6800 XT, rebuild-v2 Wave 0); the agents keep the
//     gated `wrapi` (four wraps per agent, and positions may be unwrapped);
//   * two flags for long runs, both off whenever the live view must match the
//     gated bytes: bit 0 wraps positions back into the domain after each move
//     (the gated kernel lets them grow without bound, losing f32 precision
//     over hours); bit 1 renormalises the heading after a turn (a turn
//     multiplies |h| by √(cos² + sin²) of the builtins, which is 1 − 2e-8 on
//     an accurate driver but can be off by ~1e-3 where WGSL trig is only
//     2⁻¹¹ accurate — agents would freeze or run away within minutes).
// Agents are reordered by tile every few steps (CountingSort in @bp/gpu) for
// cache coherence. The trail is a function of the multiset of agents, and the
// deposit is integer atomics, so the reorder never changes a byte of it.

const SCALE: f32 = 65536.0;

struct Params {
  n_agents: u32,
  w: u32,
  h: u32,
  flags: u32,        // bit 0: wrap positions after each move; bit 1: renormalise headings after a turn
  delta_phi: f32,    // radians
  l_sense: f32,
  l_move: f32,
  deposit: f32,
  decay_alpha: f32,
  tiles_x: u32,      // sort tiles per row
  tile_shift: u32,   // log2 of the tile side, cells
  _p0: u32,
};

@group(0) @binding(0) var<uniform> P: Params;

// The gated kernel's periodic wrap, verbatim (any i32).
fn wrapi(v: i32, n: i32) -> i32 {
  let m = v % n;
  return select(m, m + n, m < 0);
}
