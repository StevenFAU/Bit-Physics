// Territories (02-physarum.md § Scenes): who holds the dish, from each
// colony's strength per 32 × 32-cell tile (live-shares.wgsl: the tile's mean
// trail against the colony's own mean).
//   * a colony is present in a tile when its strength there is at least
//     PRESENT; the tile is held by the strongest colony present, and is a
//     border when two or more are present;
//   * a tile with no colony present (a gap in a network, or dish not reached
//     yet) goes to the nearest held tile, up to REACH tiles away (breadth
//     first on the periodic tile grid, four neighbours, in a fixed order, so
//     the result is deterministic); farther than that it is unclaimed.
// Tile counts are weighted by the cells each tile covers (edge tiles are
// partial), so the shares are fractions of the dish.

/** Tile side, cells (live-shares.wgsl). */
export const TILE = 32;
/** A colony is present in a tile at this fraction of its own mean trail. */
export const PRESENT = 0.2;
/** A tile with no colony goes to the nearest held tile within this many tiles (~4 network gaps). */
export const REACH = 4;

export interface Territory {
  /** Cells each colony holds. */
  held: number[];
  /** Cells in tiles where two or more colonies are present. */
  border: number;
  /** Cells on the dish. */
  cells: number;
  /** Owner per tile (−1 unclaimed), row-major tiles × tiles. */
  owner: Int8Array;
  tilesX: number;
  tilesY: number;
}

/** Who holds the dish, from per-tile strengths (vec4 per tile; colony k in component k). */
export function territoryFromTiles(strength: Float32Array, w: number, h: number, colonies: number): Territory {
  const tx = Math.ceil(w / TILE);
  const ty = Math.ceil(h / TILE);
  const n = tx * ty;
  const owner = new Int8Array(n).fill(-1);
  const area = (t: number): number => Math.min(TILE, w - (t % tx) * TILE) * Math.min(TILE, h - Math.floor(t / tx) * TILE);
  let border = 0;
  const queue: number[] = [];
  for (let t = 0; t < n; t += 1) {
    let best = -1;
    let bv = 0;
    let present = 0;
    for (let k = 0; k < colonies; k += 1) {
      const v = strength[t * 4 + k]!;
      if (v >= PRESENT) present += 1;
      if (v >= PRESENT && v > bv) {
        bv = v;
        best = k;
      }
    }
    if (present > 1) border += area(t);
    if (best >= 0) {
      owner[t] = best;
      queue.push(t);
    }
  }
  // spread into empty tiles, ring by ring
  for (let ring = 0; ring < REACH && queue.length > 0; ring += 1) {
    const next: number[] = [];
    for (const t of queue) {
      const x = t % tx;
      const y = (t - x) / tx;
      const nb = [y * tx + ((x + 1) % tx), y * tx + ((x - 1 + tx) % tx), ((y + 1) % ty) * tx + x, ((y - 1 + ty) % ty) * tx + x];
      for (const u of nb) {
        if (owner[u] !== -1) continue;
        owner[u] = owner[t]!;
        next.push(u);
      }
    }
    queue.length = 0;
    queue.push(...next);
  }
  const held = new Array<number>(colonies).fill(0);
  for (let t = 0; t < n; t += 1) if (owner[t]! >= 0) held[owner[t]!]! += area(t);
  return { held, border, cells: w * h, owner, tilesX: tx, tilesY: ty };
}
