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
//     2⁻¹¹ accurate — agents would freeze or run away within minutes);
//   * scene flags, also off for the gated arithmetic: bit 2 adds the scene's
//     environment field (food scent, light) to what the agents sense — never
//     to the trail, so the mass balance is untouched; bit 3 makes wall cells
//     solid (an agent whose step would land in one stays put and turns back);
//     bit 4 lets agents start dormant (heading stored + 3 in x): a dormant
//     agent neither moves nor deposits until the trail under it reaches
//     `wake` (never on or beside food: a crumb's own trail must not start a
//     colony), so a colony grows outward from where it was released. The
//     awake count is kept on the GPU, step by step, so the mass balance
//     stays exact while the colony grows. Bit 5 restores Jones's random
//     choice when both side sensors beat the centre (the gated kernel always
//     turns left there), plus a small chance `jitter` of a random turn; the
//     dice are a hash of the agent's own state, so a run stays repeatable and
//     the tile re-sort (which shuffles indices) cannot change it. Bit 6 is
//     hunger: an agent counts the steps since it was last on or beside food
//     (in the heading's length, so no extra buffer and the re-sort carries
//     it); past `hunger_max` it is taken back to a food source (a random
//     crumb, a random point in it, a random heading) and deposits there.
//     Agents stranded in dead ends and loops that reach no food go back;
//     agents shuttling between food stay. Every agent still deposits once a
//     step, so the mass balance is as before.
//     Food crumbs deposit into the trail in a separate dispatch, in the same
//     integer fixed point as the agents, so the mass balance stays exact.
//     Bit 7 is territories: up to four colonies on one dish, each depositing
//     into its own trail plane (plane k at k·w·h; the planes diffuse and fade
//     side by side) and smelling its own trail minus `rivalry` × the others'.
//     An agent's colony rides in its heading's length, |head| = 1 + k/8 (so a
//     dormant heading, x + 3, still reads as dormant, and the re-sort carries
//     it). Each colony may have its own turn, reach, step and fade (`sp`);
//     the deposit is shared. A dormant agent wakes into the colony whose trail
//     under it is strongest. The awake count is logged per colony as well, so
//     the mass balance holds plane by plane. Territories never use hunger
//     (both ride in the heading's length) or food crumbs.
// Agents are reordered by tile every few steps (CountingSort in @bp/gpu) for
// cache coherence. The trail is a function of the multiset of agents, and the
// deposit is integer atomics, so the reorder never changes a byte of it.

const SCALE: f32 = 65536.0;

struct Params {
  n_agents: u32,
  w: u32,
  h: u32,
  flags: u32,        // bit 0 wrap positions; bit 1 renormalise headings; bit 2 sense the environment; bit 3 solid walls; … bit 7 territories
  delta_phi: f32,    // radians
  l_sense: f32,
  l_move: f32,
  deposit: f32,
  decay_alpha: f32,
  tiles_x: u32,      // sort tiles per row
  tile_shift: u32,   // log2 of the tile side, cells
  bits_words: u32,   // u32 words per cell-bit plane (walls, then food and its halo)
  wake: f32,         // bit 4: a dormant agent wakes when the trail under it reaches this
  jitter: f32,       // bit 5: chance per step of a random turn (Jones's stochastic rule)
  rivalry: f32,      // bit 7: a colony smells its own trail minus this × the other colonies'
  species: u32,      // bit 7: colonies on the dish (trail planes), 1–4
  hunger_max: f32,   // bit 6: an agent goes back to food after this many steps away from it
  food_count: u32,   // bit 6: food sources (first in the env sources) a hungry agent returns to
  _q1: u32,
  _q2: u32,
  sp: array<vec4<f32>, 4>,   // bit 7: per colony (turn radians, reach, step, fade)
};

// Territories (bit 7): the per-colony awake counts and their ring follow the
// shared awake log ([count, step, ring of RING counts]).
const AWAKE_RING: u32 = 16384u;
const SP_COUNT: u32 = 16386u;            // 2 + AWAKE_RING: four per-colony awake counts
const SP_RING: u32 = 16390u;             // SP_COUNT + 4: four rings of AWAKE_RING counts
const SPECIES_STEP: f32 = 0.125;         // |head| = 1 + colony · SPECIES_STEP

// Hunger (bit 6) rides in the heading's length: |head| = 1 + steps since food / HUNGER_SCALE.
const HUNGER_SCALE: f32 = 65536.0;

// An environment value at or below this marks a wall cell (bit 3).
const WALL: f32 = -1.0e30;

@group(0) @binding(0) var<uniform> P: Params;

// The gated kernel's periodic wrap, verbatim (any i32).
fn wrapi(v: i32, n: i32) -> i32 {
  let m = v % n;
  return select(m, m + n, m < 0);
}
