// GPU orchestration for the pic-flip web demo. Owns every buffer and
// pipeline of packages/pic-flip/src/picflip_core.wgsl and encodes the
// step in the exact pass order of the verified reference
// (pic_flip.reference.apic.apic_step_3d):
//   P2G -> grid decode (+FLIP baseline) + gravity -> labels ->
//   solid restore -> rhs (backward div + drift source) ->
//   masked Poisson (fixed-cap Jacobi canonical / RBGS+SOR live) ->
//   forward-gradient update -> solid restore -> air extrapolation ->
//   G2P (mode) -> CFL substeps -> RK2 advect -> push-apart.
import coreWgsl from "../../src/picflip_core.wgsl?raw";

export const MAX_N = 131072;
export const MAX_CELLS = 262144; // 64^3 — the Blelloch scan capacity
// Fixed-point P2G scale: power of two so decode is exact scaling.
// Quantum 2^-21 ~ 4.8e-7; gate-scene max node mass ~ 8 => ~128x i32
// headroom (measured; see picflip_core.wgsl GridAtom note).
export const FP_SCALE = 2 ** 21;

export type Mode = "pic" | "flip" | "apic";
const MODE_CODE: Record<Mode, number> = { pic: 0, flip: 1, apic: 2 };

export interface SimConfig {
  nx: number;
  ny: number;
  nz: number;
  n: number;
  nWall: number;
  dx: number;
  dt: number;
  rho: number;
  gravity: [number, number, number];
  mode: Mode;
  nSolve: number; // Jacobi cap (canonical) or RBGS iterations (live)
  nExtrap: number;
  cfl: number;
  driftOn: boolean;
  driftK: number;
  pushOn: boolean;
  pushIters: number;
  pushRadiusFactor: number;
  flipRatio: number;
  sorOmega: number;
  rhoRest: number;
  vmax: number; // live ceiling; gate passes a huge sentinel (no-op)
  liveSolver: boolean; // false = fixed-cap Jacobi (gate), true = RBGS+SOR
  warmStart: boolean; // live-only: skip pressure clear between frames
  obstacle: [number, number, number, number]; // xyz + radius (<=0 off)
  obstacleVel: [number, number, number];
}

const U_SIZE = 160;

// Per-entry-point storage-buffer bindings (the sph-water pattern: each
// pipeline's bind group carries only what the entry statically uses,
// staying under the 8-storage-buffers-per-stage limit).
const BINDINGS: Record<string, number[]> = {
  clear_grid: [4, 5, 15],
  p2g: [1, 2, 3, 4, 5, 20],
  grid_update: [4, 6, 7],
  labels_pass: [5, 8, 9],
  measure_rho_rest: [6, 8, 15],
  bc_restore: [6, 8, 9],
  compute_rhs: [6, 8, 12],
  jacobi_iter: [8, 10, 11, 12],
  rbgs_red: [8, 10, 12],
  rbgs_black: [8, 10, 12],
  grad_update: [6, 8, 10],
  div_measure: [6, 8, 15],
  extrap_init: [6, 8, 13],
  extrap_layer: [6, 8, 13, 14],
  g2p: [1, 2, 3, 6, 7, 15, 23],
  compute_nsub: [15],
  // sample_field statically references BOTH velocity fields (7 included).
  advect: [1, 6, 7, 26],
  paux_pass: [1, 6, 8, 10, 23],
  pp_clear: [5],
  pp_hist: [1, 5, 20],
  scan_blocks: [16, 17, 21],
  scan_block_sums: [21],
  scan_add_offsets: [17, 21],
  seed_cursor: [17, 18],
  scatter: [18, 19, 20],
  cell_sort: [15, 17, 19],
  pp_jacobi: [1, 17, 19, 22],
  pp_apply: [1, 22],
  splat_impulse: [1, 2, 24],
  p2g_oracle: [1, 2, 3, 27],
  golden_weights: [24, 25],
  golden_am2: [6, 12, 24, 25],
  golden_am3: [6, 12, 24, 25],
  golden_roundtrip: [6, 7, 12, 24, 25],
};

// Entries that never statically reference the uniform P — layout "auto"
// omits binding 0 for them, and a bind group with an EXTRA entry is a
// validation error that silently discards every submit using it.
const NO_UNIFORM = new Set([
  "golden_weights",
  "golden_am2",
  "golden_am3",
  "golden_roundtrip",
]);

function align4(bytes: number): number {
  return (bytes + 3) & ~3;
}

export async function createPicFlipGpu(device: GPUDevice) {
  // Surface validation errors loudly — a silently discarded command buffer
  // must never masquerade as a frozen-but-passing sim.
  device.addEventListener("uncapturederror", (ev) => {
    console.error("WebGPU uncaptured error:", (ev as GPUUncapturedErrorEvent).error.message);
  });
  const module = device.createShaderModule({ code: coreWgsl });

  const mk = (size: number, extra = 0): GPUBuffer =>
    device.createBuffer({
      size,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC |
        extra,
    });

  const uniform = device.createBuffer({
    size: U_SIZE,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const buf = {
    pos: mk(MAX_N * 16),
    vel: mk(MAX_N * 16),
    cmat: mk(MAX_N * 48),
    gatom: mk(MAX_CELLS * 16),
    count: mk(MAX_CELLS * 4),
    gridVel: mk(MAX_CELLS * 16),
    gridVelOld: mk(MAX_CELLS * 16),
    labels: mk(MAX_CELLS * 4),
    solidVel: mk(MAX_CELLS * 16),
    prA: mk(MAX_CELLS * 4),
    prB: mk(MAX_CELLS * 4),
    rhs: mk(MAX_CELLS * 4),
    knownA: mk(MAX_CELLS * 4),
    knownB: mk(MAX_CELLS * 4),
    reduce: mk(64),
    cellStart: mk((MAX_CELLS + 1) * 4),
    cursor: mk(MAX_CELLS * 4),
    sortedIdx: mk(MAX_N * 4),
    cellOf: mk(MAX_N * 4),
    blockSums: mk(512 * 4),
    disp: mk(MAX_N * 16),
    paux: mk(MAX_N * 16),
    auxIn: mk(4096 * 4),
    auxOut: mk(4096 * 4),
    oracle: mk(MAX_CELLS * 16),
  };

  // binding index -> default buffer
  const slot: Record<number, GPUBuffer> = {
    1: buf.pos,
    2: buf.vel,
    3: buf.cmat,
    4: buf.gatom,
    5: buf.count,
    6: buf.gridVel,
    7: buf.gridVelOld,
    8: buf.labels,
    9: buf.solidVel,
    10: buf.prA,
    11: buf.prB,
    12: buf.rhs,
    13: buf.knownA,
    14: buf.knownB,
    15: buf.reduce,
    16: buf.count, // counts_plain view
    17: buf.cellStart,
    18: buf.cursor,
    19: buf.sortedIdx,
    20: buf.cellOf,
    21: buf.blockSums,
    22: buf.disp,
    23: buf.paux,
    24: buf.auxIn,
    25: buf.auxOut,
    26: buf.reduce, // misc view
    27: buf.oracle,
  };

  const pipes = new Map<string, GPUComputePipeline>();
  const groups = new Map<string, GPUBindGroup>();
  await Promise.all(
    Object.keys(BINDINGS).map(async (entry) => {
      const pipe = await device.createComputePipelineAsync({
        layout: "auto",
        compute: { module, entryPoint: entry },
      });
      pipes.set(entry, pipe);
    }),
  );

  function bindGroupFor(entry: string, overrides?: Record<number, GPUBuffer>): GPUBindGroup {
    const pipe = pipes.get(entry);
    if (!pipe) throw new Error(`no pipeline ${entry}`);
    const entries: GPUBindGroupEntry[] = [];
    if (!NO_UNIFORM.has(entry)) {
      entries.push({ binding: 0, resource: { buffer: uniform } });
    }
    for (const b of BINDINGS[entry]) {
      const buffer = overrides?.[b] ?? slot[b];
      entries.push({ binding: b, resource: { buffer } });
    }
    return device.createBindGroup({ layout: pipe.getBindGroupLayout(0), entries });
  }

  for (const entry of Object.keys(BINDINGS)) groups.set(entry, bindGroupFor(entry));
  // Ping-pong variants.
  const jacobiAB = groups.get("jacobi_iter")!; // pr_in = A, pr_out = B
  const jacobiBA = bindGroupFor("jacobi_iter", { 10: buf.prB, 11: buf.prA });
  const gradB = bindGroupFor("grad_update", { 10: buf.prB });
  const pauxB = bindGroupFor("paux_pass", { 10: buf.prB });
  const extrapAB = groups.get("extrap_layer")!; // known_in = A, known_out = B
  const extrapBA = bindGroupFor("extrap_layer", { 13: buf.knownB, 14: buf.knownA });

  let cfg: SimConfig | null = null;

  function configure(c: SimConfig): void {
    cfg = c;
    const f = new Float32Array(U_SIZE / 4);
    const u = new Uint32Array(f.buffer);
    f.set([c.gravity[0], c.gravity[1], c.gravity[2], 0], 0);
    f.set([c.obstacle[0], c.obstacle[1], c.obstacle[2], c.obstacle[3]], 4);
    f.set([c.obstacleVel[0], c.obstacleVel[1], c.obstacleVel[2], 0], 8);
    u[12] = c.nx;
    u[13] = c.ny;
    u[14] = c.nz;
    u[15] = c.nx * c.ny * c.nz;
    u[16] = c.n;
    u[17] = c.nWall;
    u[18] = MODE_CODE[c.mode];
    u[19] = c.driftOn ? 1 : 0;
    f[20] = c.dx;
    f[21] = 1 / c.dx;
    f[22] = c.dt;
    f[23] = c.rho;
    f[24] = FP_SCALE;
    f[25] = 1 / FP_SCALE;
    f[26] = c.cfl;
    f[27] = c.driftK;
    f[28] = c.flipRatio;
    f[29] = c.pushRadiusFactor * c.dx;
    f[30] = c.sorOmega;
    f[31] = c.rhoRest;
    f[32] = c.nWall * c.dx;
    f[33] = (c.nx - 1 - c.nWall) * c.dx;
    f[34] = (c.ny - 1 - c.nWall) * c.dx;
    f[35] = (c.nz - 1 - c.nWall) * c.dx;
    f[36] = c.vmax;
    device.queue.writeBuffer(uniform, 0, f);
  }

  function dispatch(
    enc: GPUCommandEncoder,
    entry: string,
    threads: number,
    group?: GPUBindGroup,
  ): void {
    const pipe = pipes.get(entry)!;
    const wgSize = entry === "compute_nsub" ? 1 : /^(p2g|g2p|advect|paux_pass|pp_hist|scatter|cell_sort|pp_jacobi|pp_apply|splat_impulse)$/.test(entry) || entry.startsWith("golden") ? 64 : 256;
    const pass = enc.beginComputePass();
    pass.setPipeline(pipe);
    pass.setBindGroup(0, group ?? groups.get(entry)!);
    pass.dispatchWorkgroups(Math.max(1, Math.ceil(threads / wgSize)));
    pass.end();
  }

  /** Encode one full reference-ordered step into `enc`. */
  function encodeStep(enc: GPUCommandEncoder): void {
    if (!cfg) throw new Error("configure() first");
    const c = cfg;
    const G = c.nx * c.ny * c.nz;
    const N = c.n;
    dispatch(enc, "clear_grid", G);
    if (N === 0) return;
    dispatch(enc, "p2g", N);
    dispatch(enc, "grid_update", G);
    dispatch(enc, "labels_pass", G);
    dispatch(enc, "bc_restore", G);
    dispatch(enc, "compute_rhs", G);
    if (c.liveSolver) {
      if (!c.warmStart) enc.clearBuffer(buf.prA);
      for (let it = 0; it < c.nSolve; it += 1) {
        dispatch(enc, "rbgs_red", G);
        dispatch(enc, "rbgs_black", G);
      }
      dispatch(enc, "grad_update", G); // reads prA
    } else {
      // Fixed-cap Jacobi, p starts at 0 (P24 no-early-stop). Even cap
      // (600 / 3000) keeps the final field in prA.
      enc.clearBuffer(buf.prA);
      enc.clearBuffer(buf.prB);
      for (let it = 0; it < c.nSolve; it += 1) {
        dispatch(enc, "jacobi_iter", G, it % 2 === 0 ? jacobiAB : jacobiBA);
      }
      dispatch(enc, "grad_update", G, c.nSolve % 2 === 0 ? groups.get("grad_update")! : gradB);
    }
    dispatch(enc, "bc_restore", G);
    dispatch(enc, "div_measure", G);
    dispatch(enc, "extrap_init", G);
    for (let l = 0; l < c.nExtrap; l += 1) {
      dispatch(enc, "extrap_layer", G, l % 2 === 0 ? extrapAB : extrapBA);
      // known_out of layer l becomes known_in of layer l+1 via the swap.
    }
    dispatch(enc, "g2p", N);
    dispatch(enc, "compute_nsub", 1);
    dispatch(enc, "advect", N);
    if (c.pushOn) {
      for (let it = 0; it < c.pushIters; it += 1) {
        dispatch(enc, "pp_clear", G);
        dispatch(enc, "pp_hist", N);
        dispatch(enc, "scan_blocks", G);
        dispatch(enc, "scan_block_sums", 256);
        dispatch(enc, "scan_add_offsets", G);
        dispatch(enc, "seed_cursor", G);
        dispatch(enc, "scatter", N);
        dispatch(enc, "cell_sort", G);
        dispatch(enc, "pp_jacobi", N);
        dispatch(enc, "pp_apply", N);
      }
    }
    dispatch(enc, "paux_pass", N,
      c.liveSolver || c.nSolve % 2 === 0 ? groups.get("paux_pass")! : pauxB);
  }

  function step(count = 1): void {
    const enc = device.createCommandEncoder();
    for (let s = 0; s < count; s += 1) encodeStep(enc);
    device.queue.submit([enc.finish()]);
  }

  async function readBuffer(src: GPUBuffer, bytes: number, offset = 0): Promise<ArrayBuffer> {
    const staging = device.createBuffer({
      size: align4(bytes),
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    const enc = device.createCommandEncoder();
    enc.copyBufferToBuffer(src, offset, staging, 0, align4(bytes));
    device.queue.submit([enc.finish()]);
    await staging.mapAsync(GPUMapMode.READ);
    const out = staging.getMappedRange().slice(0);
    staging.unmap();
    staging.destroy();
    return out;
  }

  /** Upload particle state; positions/velocities are xyz triples. */
  function uploadParticles(positions: Float32Array, velocities: Float32Array, n: number): void {
    const p4 = new Float32Array(n * 4);
    const v4 = new Float32Array(n * 4);
    for (let i = 0; i < n; i += 1) {
      p4[4 * i] = positions[3 * i];
      p4[4 * i + 1] = positions[3 * i + 1];
      p4[4 * i + 2] = positions[3 * i + 2];
      v4[4 * i] = velocities[3 * i];
      v4[4 * i + 1] = velocities[3 * i + 1];
      v4[4 * i + 2] = velocities[3 * i + 2];
    }
    device.queue.writeBuffer(buf.pos, 0, p4);
    device.queue.writeBuffer(buf.vel, 0, v4);
    device.queue.writeBuffer(buf.cmat, 0, new Float32Array(n * 12));
    device.queue.writeBuffer(buf.paux, 0, new Float32Array(n * 4));
  }

  /** Append particles into the live buffers at [n0, n0+k). */
  function appendParticles(n0: number, positions: Float32Array, vel3: [number, number, number]): number {
    const k = positions.length / 3;
    const kFit = Math.min(k, MAX_N - n0);
    if (kFit <= 0) return 0;
    const p4 = new Float32Array(kFit * 4);
    const v4 = new Float32Array(kFit * 4);
    for (let i = 0; i < kFit; i += 1) {
      p4[4 * i] = positions[3 * i];
      p4[4 * i + 1] = positions[3 * i + 1];
      p4[4 * i + 2] = positions[3 * i + 2];
      v4[4 * i] = vel3[0];
      v4[4 * i + 1] = vel3[1];
      v4[4 * i + 2] = vel3[2];
    }
    device.queue.writeBuffer(buf.pos, n0 * 16, p4);
    device.queue.writeBuffer(buf.vel, n0 * 16, v4);
    device.queue.writeBuffer(buf.cmat, n0 * 48, new Float32Array(kFit * 12));
    return kFit;
  }

  async function readState(n: number): Promise<{ pos: Float32Array; vel: Float32Array }> {
    const [p, v] = await Promise.all([
      readBuffer(buf.pos, n * 16),
      readBuffer(buf.vel, n * 16),
    ]);
    const p4 = new Float32Array(p);
    const v4 = new Float32Array(v);
    const pos3 = new Float32Array(n * 3);
    const vel3 = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 1) {
      pos3[3 * i] = p4[4 * i];
      pos3[3 * i + 1] = p4[4 * i + 1];
      pos3[3 * i + 2] = p4[4 * i + 2];
      vel3[3 * i] = v4[4 * i];
      vel3[3 * i + 1] = v4[4 * i + 1];
      vel3[3 * i + 2] = v4[4 * i + 2];
    }
    return { pos: pos3, vel: vel3 };
  }

  async function readReduce(): Promise<{
    maxSpeed: number;
    nSub: number;
    rhoRest: number;
    sortSaturated: boolean;
    maxDiv: number;
  }> {
    const r = new Uint32Array(await readBuffer(buf.reduce, 32));
    const f = new Float32Array(r.buffer);
    return {
      maxSpeed: f[0],
      nSub: r[1],
      rhoRest: f[2],
      sortSaturated: r[3] !== 0,
      maxDiv: f[4],
    };
  }

  async function readLabels(G: number): Promise<Uint32Array> {
    return new Uint32Array(await readBuffer(buf.labels, G * 4));
  }

  async function readGridField(which: "pressure" | "gridVel", G: number): Promise<Float32Array> {
    const src = which === "pressure" ? buf.prA : buf.gridVel;
    const bytes = which === "pressure" ? G * 4 : G * 16;
    return new Float32Array(await readBuffer(src, bytes));
  }

  async function readGridAtoms(G: number): Promise<Int32Array> {
    return new Int32Array(await readBuffer(buf.gatom, G * 16));
  }

  /**
   * Transfer bit-identity witness: parallel fixed-point-atomic P2G vs the
   * single-thread lex-order oracle, both on-device (the sph-water
   * hash==brute structure). Returns both i32 grids for host comparison.
   */
  async function runTransferBitIdentity(): Promise<{ atomic: Int32Array; oracle: Int32Array }> {
    if (!cfg) throw new Error("configure() first");
    const G = cfg.nx * cfg.ny * cfg.nz;
    const enc = device.createCommandEncoder();
    dispatch(enc, "clear_grid", G);
    dispatch(enc, "p2g", cfg.n);
    dispatch(enc, "p2g_oracle", 1);
    device.queue.submit([enc.finish()]);
    const [a, o] = await Promise.all([
      readBuffer(buf.gatom, G * 16),
      readBuffer(buf.oracle, G * 16),
    ]);
    return { atomic: new Int32Array(a), oracle: new Int32Array(o) };
  }

  /**
   * Frame-0 rest-density measurement (regularizer #2 threshold): runs
   * P2G + labels on the current particle state and reads back the max
   * fluid-node density. The caller re-configures with the result so the
   * canonical steps see the pinned value (matches run_dam_break_3d).
   */
  async function measureRhoRest(): Promise<number> {
    if (!cfg) throw new Error("configure() first");
    const G = cfg.nx * cfg.ny * cfg.nz;
    const enc = device.createCommandEncoder();
    enc.clearBuffer(buf.reduce);
    dispatch(enc, "clear_grid", G);
    dispatch(enc, "p2g", cfg.n);
    dispatch(enc, "grid_update", G);
    dispatch(enc, "labels_pass", G);
    dispatch(enc, "measure_rho_rest", G);
    device.queue.submit([enc.finish()]);
    const r = await readReduce();
    return r.rhoRest;
  }

  function splat(center: [number, number, number], radius: number, impulse: [number, number, number]): void {
    if (!cfg) return;
    device.queue.writeBuffer(
      buf.auxIn,
      0,
      new Float32Array([...center, radius, ...impulse]),
    );
    const enc = device.createCommandEncoder();
    dispatch(enc, "splat_impulse", cfg.n);
    device.queue.submit([enc.finish()]);
  }

  async function runAux(entry: string, input: Float32Array, outFloats: number): Promise<Float32Array> {
    device.queue.writeBuffer(buf.auxIn, 0, input);
    const enc = device.createCommandEncoder();
    dispatch(enc, entry, 1);
    device.queue.submit([enc.finish()]);
    return new Float32Array(await readBuffer(buf.auxOut, outFloats * 4));
  }

  return {
    device,
    buf,
    configure,
    get config(): SimConfig {
      if (!cfg) throw new Error("configure() first");
      return cfg;
    },
    step,
    encodeStep,
    uploadParticles,
    appendParticles,
    readState,
    readReduce,
    readLabels,
    readGridField,
    readGridAtoms,
    runTransferBitIdentity,
    readBuffer,
    measureRhoRest,
    splat,
    runAux,
    clearReduce(): void {
      const enc = device.createCommandEncoder();
      enc.clearBuffer(buf.reduce);
      device.queue.submit([enc.finish()]);
    },
  };
}

export type PicFlipGpu = Awaited<ReturnType<typeof createPicFlipGpu>>;
