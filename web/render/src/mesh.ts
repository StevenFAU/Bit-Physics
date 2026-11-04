// Procedural meshes for Instances (F3). Pure data: positions and normals
// interleaved (6 floats per vertex), u32 indices, every mesh inside the unit
// sphere so an instance's radius is its bounding sphere.

export interface MeshData {
  /** x, y, z, nx, ny, nz per vertex. */
  vertices: Float32Array<ArrayBuffer>;
  indices: Uint32Array<ArrayBuffer>;
}

/** Geodesic sphere: the icosahedron subdivided `subdiv` times (20·4^subdiv triangles). */
export function icosphere(subdiv: number): MeshData {
  const t = (1 + Math.sqrt(5)) / 2;
  const pts: [number, number, number][] = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map((p) => {
    const l = Math.hypot(p[0]!, p[1]!, p[2]!);
    return [p[0]! / l, p[1]! / l, p[2]! / l];
  });
  let faces: [number, number, number][] = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  for (let s = 0; s < subdiv; s += 1) {
    const mid = new Map<string, number>();
    const midpoint = (a: number, b: number): number => {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      const hit = mid.get(key);
      if (hit !== undefined) return hit;
      const pa = pts[a]!;
      const pb = pts[b]!;
      const m: [number, number, number] = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2, (pa[2] + pb[2]) / 2];
      const l = Math.hypot(m[0], m[1], m[2]);
      pts.push([m[0] / l, m[1] / l, m[2] / l]);
      mid.set(key, pts.length - 1);
      return pts.length - 1;
    };
    const next: [number, number, number][] = [];
    for (const [a, b, c] of faces) {
      const ab = midpoint(a, b);
      const bc = midpoint(b, c);
      const ca = midpoint(c, a);
      next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    faces = next;
  }
  const vertices = new Float32Array(pts.length * 6);
  pts.forEach((p, i) => vertices.set([p[0], p[1], p[2], p[0], p[1], p[2]], i * 6));
  const indices = new Uint32Array(faces.length * 3);
  faces.forEach((f, i) => indices.set(f, i * 3));
  return { vertices, indices };
}

/** A LOD chain packed into one vertex and one index buffer. */
export interface PackedLods {
  vertices: Float32Array<ArrayBuffer>;
  indices: Uint32Array<ArrayBuffer>;
  /** Per LOD: index count, first index, base vertex. */
  ranges: { indexCount: number; firstIndex: number; baseVertex: number }[];
}

export function packLods(lods: readonly MeshData[]): PackedLods {
  const vCount = lods.reduce((n, m) => n + m.vertices.length, 0);
  const iCount = lods.reduce((n, m) => n + m.indices.length, 0);
  const vertices = new Float32Array(vCount);
  const indices = new Uint32Array(iCount);
  const ranges: PackedLods["ranges"] = [];
  let vo = 0;
  let io = 0;
  for (const m of lods) {
    vertices.set(m.vertices, vo);
    indices.set(m.indices, io);
    ranges.push({ indexCount: m.indices.length, firstIndex: io, baseVertex: vo / 6 });
    vo += m.vertices.length;
    io += m.indices.length;
  }
  return { vertices, indices, ranges };
}

/**
 * LOD for a projected radius in px: the first level whose threshold the
 * radius reaches (thresholds descending, finest first); the last level
 * otherwise. Mirrors the WGSL cull kernel.
 */
export function pickLod(radiusPx: number, thresholdsPx: readonly number[]): number {
  for (let i = 0; i < thresholdsPx.length; i += 1) if (radiusPx >= thresholdsPx[i]!) return i;
  return thresholdsPx.length;
}
