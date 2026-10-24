// Swarm — the kernel's Params uniform (84 f32, 336 bytes), written exactly as
// the v4 lab's writeParams(pure) writes it (packages/boids-2d/web/index.html),
// and the uniform grid its counting sort runs on (v4 ensureSort).
//
// Every value goes through a Float32Array, so f64 products such as
// maxSpeed·0.14 round to f32 exactly where v4 rounds them. Fields the kernel
// never reads (colour mode, camera, the v4 HUD's centre-of-mass slots) are
// written as zeros; the sim kernel's output does not depend on them.

/** The rule's tunable numbers (v4 S.* names). */
export interface RuleParams {
  /** Separation weight. */
  wSep: number;
  /** Alignment weight. */
  wAli: number;
  /** Cohesion weight. */
  wCoh: number;
  /** Cohesion radius r; alignment uses 0.72 r and separation 0.30 r. */
  rCoh: number;
  /** Top speed per step (world units); minimum speed is 0.42× this. */
  maxSpeed: number;
  /** Angular noise η ∈ [0, 1]: each step a heading turns by up to ±η·π. */
  noise: number;
  /** Field of view in degrees (360 = no blind spot). */
  fovDeg: number;
}

export const RULE_KEYS: readonly (keyof RuleParams)[] = ["wSep", "wAli", "wCoh", "rCoh", "maxSpeed", "noise", "fovDeg"];

export const sameRule = (a: RuleParams, b: RuleParams): boolean => RULE_KEYS.every((k) => a[k] === b[k]);

/** The fear term (v4's "herd" pointer force): the shark. */
export interface FearTerm {
  /** Shark position, world units. */
  x: number;
  y: number;
  /** Fear radius, world units (v4: 0.30). */
  radius: number;
  /** Peak push per step (v4: predStr 0.004, ×1.8 while the button is down). */
  strength: number;
}

export interface Grid {
  cols: number;
  rows: number;
  cellX: number;
  cellY: number;
}

/**
 * v4 ensureSort: cells of side ≥ rCoh (the 3×3 block then holds every
 * neighbour exactly). v4 capped the grid at 262,144 cells for its two-level
 * scan; the shared PrefixScan has no such limit, so the cap here only bounds
 * memory. A larger cell is slower, never wrong.
 */
export function gridFor(halfW: number, halfH: number, rCoh: number, maxCells = 1 << 22): Grid {
  const W = halfW * 2;
  const H = halfH * 2;
  const rc = Math.max(rCoh, 1e-3);
  let cols = Math.max(1, Math.floor(W / rc));
  let rows = Math.max(1, Math.floor(H / rc));
  if (cols * rows > maxCells) {
    const sc = Math.sqrt(maxCells / (cols * rows));
    cols = Math.max(1, Math.floor(cols * sc));
    rows = Math.max(1, Math.floor(rows * sc));
    while (cols * rows > maxCells) {
      if (cols >= rows && cols > 1) cols -= 1;
      else if (rows > 1) rows -= 1;
      else break;
    }
  }
  return { cols, rows, cellX: W / cols, cellY: H / rows };
}

export const PARAM_FLOATS = 84;
export const PARAM_BYTES = PARAM_FLOATS * 4;
/** Byte offset of P.frameSeed (P[26]), rewritten per step. */
export const FRAME_SEED_OFFSET = 26 * 4;

/** v4: P[26] = ((seed >>> 0) ^ (simStep >>> 0)) & 0x7fffff — the noise hash's per-step seed. */
export const frameSeed = (seed: number, step: number): number => ((seed >>> 0) ^ (step >>> 0)) & 0x7fffff;

export interface ParamInputs {
  rule: RuleParams;
  halfW: number;
  halfH: number;
  seed: number;
  /** Steps run so far (the step about to run). */
  step: number;
  n: number;
  grid: Grid | null;
  /** The shark, or null (v4 writeParams(pure): no pointer force). */
  fear: FearTerm | null;
}

/** Fill `P` (84 f32) the way v4 writeParams does, for a single-species metric flock. */
export function writeParams(P: Float32Array, o: ParamInputs): Float32Array {
  const r = o.rule;
  P.fill(0);
  P[0] = 1.0; // dt: v4 1.0·timeRate; v2's speed control runs more steps instead
  P[1] = r.maxSpeed;
  P[2] = r.maxSpeed * 0.14;
  P[3] = r.maxSpeed * 0.42;
  P[6] = r.rCoh;
  P[5] = r.rCoh * 0.72;
  P[4] = r.rCoh * 0.3;
  P[7] = r.wSep;
  P[8] = r.wAli;
  P[9] = r.wCoh;
  // fear term: v4 mMode −1 = "herd" (push away), mR, mStr; pure ⇒ mMode 0, mStr 0
  P[10] = o.fear ? o.fear.x : 0;
  P[11] = o.fear ? o.fear.y : 0;
  P[12] = o.fear ? -1 : 0;
  P[13] = o.fear ? o.fear.radius : 0.3;
  P[14] = o.fear ? o.fear.strength : 0;
  P[15] = o.halfW;
  P[16] = o.halfH;
  // wind, swirl, colour mode, obstacles: off
  P[22] = r.noise;
  P[23] = r.fovDeg >= 359.5 ? -1.0 : Math.cos((r.fovDeg * Math.PI) / 360);
  P[24] = 0; // metric interaction (v4 'topo' = 1)
  P[25] = 7; // kNN (topological mode only)
  P[26] = frameSeed(o.seed, o.step);
  P[27] = o.grid ? o.grid.cols : 0;
  P[28] = o.grid ? o.grid.rows : 0;
  P[29] = o.grid ? o.grid.cellX : 1;
  P[30] = o.grid ? o.grid.cellY : 1;
  P[32] = o.n;
  P[40] = 1.0; // flowScale (flow off: flowType 0)
  P[44] = 1; // one species
  // species matrices: v4 speciesConfig() for one species — each species flocks within itself
  for (let i = 0; i < 4; i += 1) {
    P[48 + i * 4 + i] = r.wCoh;
    P[64 + i * 4 + i] = r.wAli;
  }
  P[80] = 1;
  P[81] = 1;
  P[82] = 1;
  P[83] = 1;
  return P;
}
