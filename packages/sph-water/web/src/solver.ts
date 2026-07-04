// GPU orchestration for the sph-water web demo.
//
// Owns the buffers, pipelines, and dispatch sequences for BOTH tiers:
//   - the gated verified core (packages/sph-water/src/sph_core.wgsl):
//     counting-sort broadphase, density/continuity gathers, the canonical
//     explicit-Euler replay, the i32 fixed-point hash==brute pair, the
//     golden kernel evaluation, and the fixture-scale corrector;
//   - the live full-DFSPH solver (packages/sph-water/src/dfsph_solver.wgsl),
//     beyond-reference by construction (spec § 3.2), which runs on the
//     same broadphase output.
//
// Determinism posture: all pressure/gather passes are race-free gathers;
// the only atomics are the integer binning histogram/cursor, and the
// per-cell id-sort erases the scatter's order nondeterminism — same-device
// run-twice is byte-identical (verified live in the PROVE panel).

import coreWgsl from "../../src/sph_core.wgsl?raw";
import dfsphWgsl from "../../src/dfsph_solver.wgsl?raw";

export const MAX_N = 131072;
export const MAX_CELLS = 262144;

export interface GridConfig {
  origin: [number, number, number];
  dims: [number, number, number];
  cell: number; // = 2h
}

export interface SimConfig {
  n: number;
  h: number;
  grid: GridConfig;
  gDt: number; // g_z * dt
  dt: number;
  mass: number;
}

export interface LiveConfig {
  n: number;
  h: number;
  grid: GridConfig;
  dt: number;
  mass: number;
  rho0: number;
  gravity: [number, number, number];
  boxMin: [number, number, number];
  boxMax: [number, number, number];
  xsphAlpha: number;
  restitution: number;
  friction: number;
  kappaClamp: number;
  surfaceNcount: number;
  vmax: number;
  warmStart: boolean;
  densityIters: number;
  divergenceIters: number;
}

export interface CheckpointData {
  step: number;
  position: Float32Array; // subsampled, len = count*3
  velocity: Float32Array;
  density: Float32Array; // len = count
}

const CORE_BINDINGS: Record<string, number[]> = {
  clear_cells: [0, 4],
  histogram: [0, 1, 4, 8],
  scan_blocks: [0, 5, 11, 12],
  scan_block_sums: [0, 12],
  scan_add_offsets: [0, 5, 12],
  seed_cursor: [0, 5, 6],
  scatter: [0, 6, 7, 8],
  cell_sort: [0, 5, 7, 14],
  reorder: [0, 1, 2, 7, 9, 10],
  density_grid: [0, 1, 3, 5, 7, 9],
  density_grid_fp: [0, 1, 5, 7, 9, 13],
  density_brute_fp: [0, 1, 13],
  continuity_grid: [0, 1, 2, 5, 7, 9, 10, 15],
  integrate_canonical: [0, 1, 2],
  kernel_eval: [20, 21],
  corrector_fixture: [22, 23, 24, 25, 26],
};

const DF_BINDINGS: Record<string, number[]> = {
  df_density_alpha: [0, 1, 4, 7, 8, 9],
  df_xsph: [0, 1, 2, 3, 4, 7, 8, 9],
  df_apply_ext: [0, 1, 3],
  df_warm_start: [0, 5, 6],
  df_predict_density: [0, 1, 3, 4, 5, 6, 7, 8, 9],
  df_predict_divergence: [0, 1, 3, 4, 5, 7, 8, 9],
  df_apply_kappa: [0, 1, 3, 4, 5, 7, 8, 9],
  df_integrate: [0, 1, 3],
};

export type SphGpu = Awaited<ReturnType<typeof createSphGpu>>;

export async function createSphGpu(device: GPUDevice) {
  const queue = device.queue;
  const S = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
  const mk = (label: string, size: number) => device.createBuffer({ label, size, usage: S });

  const buf = {
    simParams: device.createBuffer({
      label: "simParams",
      size: 64,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    }),
    liveParams: device.createBuffer({
      label: "liveParams",
      size: 176,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    }),
    correctorParams: device.createBuffer({
      label: "correctorParams",
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    }),
    pos: mk("pos", MAX_N * 16),
    vel: mk("vel", MAX_N * 16),
    velOut: mk("velOut", MAX_N * 16),
    density: mk("density", MAX_N * 4),
    cellCount: mk("cellCount", MAX_CELLS * 4),
    cellStart: mk("cellStart", (MAX_CELLS + 1) * 4),
    cursor: mk("cursor", MAX_CELLS * 4),
    sortedIdx: mk("sortedIdx", MAX_N * 4),
    cellOf: mk("cellOf", MAX_N * 4),
    posSorted: mk("posSorted", MAX_N * 16),
    velSorted: mk("velSorted", MAX_N * 16),
    blockSums: mk("blockSums", 512 * 4),
    densityFp: mk("densityFp", MAX_N * 4),
    flags: mk("flags", 16),
    drho: mk("drho", MAX_N * 4),
    partAux: mk("partAux", MAX_N * 16),
    kappa: mk("kappa", MAX_N * 4),
    kappaTotal: mk("kappaTotal", MAX_N * 4),
    kernelIn: mk("kernelIn", 16 * 8),
    kernelOut: mk("kernelOut", 16 * 8),
    fixPos: mk("fixPos", 64 * 16),
    fixVel: mk("fixVel", 64 * 16),
    fixMass: mk("fixMass", 64 * 4),
    fixOut: mk("fixOut", 16),
  };

  const coreByBinding: Record<number, GPUBuffer> = {
    0: buf.simParams,
    1: buf.pos,
    2: buf.vel,
    3: buf.density,
    4: buf.cellCount,
    5: buf.cellStart,
    6: buf.cursor,
    7: buf.sortedIdx,
    8: buf.cellOf,
    9: buf.posSorted,
    10: buf.velSorted,
    11: buf.cellCount, // counts_plain: same buffer, non-atomic view
    12: buf.blockSums,
    13: buf.densityFp,
    14: buf.flags,
    15: buf.drho,
    20: buf.kernelIn,
    21: buf.kernelOut,
    22: buf.correctorParams,
    23: buf.fixPos,
    24: buf.fixVel,
    25: buf.fixMass,
    26: buf.fixOut,
  };
  const dfByBinding: Record<number, GPUBuffer> = {
    0: buf.liveParams,
    1: buf.pos,
    2: buf.vel,
    3: buf.velOut,
    4: buf.partAux,
    5: buf.kappa,
    6: buf.kappaTotal,
    7: buf.posSorted,
    8: buf.sortedIdx,
    9: buf.cellStart,
  };

  const coreModule = device.createShaderModule({ label: "sph_core", code: coreWgsl });
  const dfModule = device.createShaderModule({ label: "dfsph_solver", code: dfsphWgsl });

  async function buildPipes(
    module: GPUShaderModule,
    bindings: Record<string, number[]>,
    byBinding: Record<number, GPUBuffer>,
  ) {
    const out: Record<string, { pipeline: GPUComputePipeline; bg: GPUBindGroup }> = {};
    await Promise.all(
      Object.keys(bindings).map(async (entryPoint) => {
        const pipeline = await device.createComputePipelineAsync({
          label: entryPoint,
          layout: "auto",
          compute: { module, entryPoint },
        });
        const bg = device.createBindGroup({
          label: entryPoint,
          layout: pipeline.getBindGroupLayout(0),
          entries: bindings[entryPoint].map((b) => ({
            binding: b,
            resource: { buffer: byBinding[b] },
          })),
        });
        out[entryPoint] = { pipeline, bg };
      }),
    );
    return out;
  }

  const [core, df] = await Promise.all([
    buildPipes(coreModule, CORE_BINDINGS, coreByBinding),
    buildPipes(dfModule, DF_BINDINGS, dfByBinding),
  ]);

  function dispatch(pass: GPUComputePassEncoder, name: string, groups: number, live = false) {
    const p = live ? df[name] : core[name];
    pass.setPipeline(p.pipeline);
    pass.setBindGroup(0, p.bg);
    pass.dispatchWorkgroups(groups);
  }

  function writeSimParams(cfg: SimConfig) {
    const [nx, ny, nz] = cfg.grid.dims;
    const nCells = nx * ny * nz;
    if (nCells > MAX_CELLS) throw new Error(`grid too large: ${nCells}`);
    const ab = new ArrayBuffer(64);
    const dv = new DataView(ab);
    dv.setUint32(0, cfg.n, true);
    dv.setUint32(4, nx, true);
    dv.setUint32(8, ny, true);
    dv.setUint32(12, nz, true);
    dv.setUint32(16, nCells, true);
    dv.setFloat32(24, 1.0 / cfg.grid.cell, true);
    dv.setFloat32(28, cfg.h, true);
    dv.setFloat32(32, cfg.grid.origin[0], true);
    dv.setFloat32(36, cfg.grid.origin[1], true);
    dv.setFloat32(40, cfg.grid.origin[2], true);
    dv.setFloat32(44, cfg.gDt, true);
    dv.setFloat32(48, cfg.dt, true);
    dv.setFloat32(52, cfg.mass, true);
    queue.writeBuffer(buf.simParams, 0, ab);
    return nCells;
  }

  interface LiveInteraction {
    obstacle: [number, number, number, number];
    impulsePos: [number, number, number, number];
    impulseVel: [number, number, number, number];
  }

  function writeLiveParams(cfg: LiveConfig, inter: LiveInteraction) {
    const [nx, ny, nz] = cfg.grid.dims;
    const nCells = nx * ny * nz;
    const ab = new ArrayBuffer(176);
    const dv = new DataView(ab);
    dv.setUint32(0, cfg.n, true);
    dv.setUint32(4, nx, true);
    dv.setUint32(8, ny, true);
    dv.setUint32(12, nz, true);
    dv.setUint32(16, nCells, true);
    dv.setUint32(20, cfg.warmStart ? 1 : 0, true);
    dv.setFloat32(24, 1.0 / cfg.grid.cell, true);
    dv.setFloat32(28, cfg.h, true);
    dv.setFloat32(32, cfg.grid.origin[0], true);
    dv.setFloat32(36, cfg.grid.origin[1], true);
    dv.setFloat32(40, cfg.grid.origin[2], true);
    dv.setFloat32(44, cfg.dt, true);
    dv.setFloat32(48, cfg.gravity[0], true);
    dv.setFloat32(52, cfg.gravity[1], true);
    dv.setFloat32(56, cfg.gravity[2], true);
    dv.setFloat32(60, cfg.mass, true);
    dv.setFloat32(64, cfg.boxMin[0], true);
    dv.setFloat32(68, cfg.boxMin[1], true);
    dv.setFloat32(72, cfg.boxMin[2], true);
    dv.setFloat32(76, cfg.rho0, true);
    dv.setFloat32(80, cfg.boxMax[0], true);
    dv.setFloat32(84, cfg.boxMax[1], true);
    dv.setFloat32(88, cfg.boxMax[2], true);
    dv.setFloat32(92, cfg.xsphAlpha, true);
    for (let k = 0; k < 4; k += 1) dv.setFloat32(96 + k * 4, inter.obstacle[k], true);
    for (let k = 0; k < 4; k += 1) dv.setFloat32(112 + k * 4, inter.impulsePos[k], true);
    for (let k = 0; k < 4; k += 1) dv.setFloat32(128 + k * 4, inter.impulseVel[k], true);
    dv.setFloat32(144, cfg.restitution, true);
    dv.setFloat32(148, cfg.friction, true);
    dv.setFloat32(152, cfg.kappaClamp, true);
    dv.setFloat32(156, cfg.surfaceNcount, true);
    dv.setFloat32(160, cfg.vmax, true);
    queue.writeBuffer(buf.liveParams, 0, ab);
  }

  function encodeGridBuild(pass: GPUComputePassEncoder, n: number, nCells: number) {
    const gc = Math.ceil(nCells / 256);
    const gp = Math.ceil(n / 64);
    dispatch(pass, "clear_cells", gc);
    dispatch(pass, "histogram", gp);
    dispatch(pass, "scan_blocks", Math.ceil(nCells / 512));
    dispatch(pass, "scan_block_sums", 1);
    dispatch(pass, "scan_add_offsets", gc);
    dispatch(pass, "seed_cursor", gc);
    dispatch(pass, "scatter", gp);
    dispatch(pass, "cell_sort", Math.ceil(nCells / 64));
    dispatch(pass, "reorder", gp);
  }

  async function readBuffer(src: GPUBuffer, bytes: number): Promise<ArrayBuffer> {
    const rb = device.createBuffer({
      size: bytes,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    const enc = device.createCommandEncoder();
    enc.copyBufferToBuffer(src, 0, rb, 0, bytes);
    queue.submit([enc.finish()]);
    await rb.mapAsync(GPUMapMode.READ);
    const out = rb.getMappedRange().slice(0);
    rb.unmap();
    rb.destroy();
    return out;
  }

  function packVec4(src: Float32Array, n: number): Float32Array {
    const out = new Float32Array(n * 4);
    for (let i = 0; i < n; i += 1) {
      out[i * 4] = src[i * 3];
      out[i * 4 + 1] = src[i * 3 + 1];
      out[i * 4 + 2] = src[i * 3 + 2];
    }
    return out;
  }

  function unpackVec4(src: Float32Array, n: number, stride: number): Float32Array {
    const count = Math.ceil(n / stride);
    const out = new Float32Array(count * 3);
    for (let k = 0; k < count; k += 1) {
      const i = k * stride;
      out[k * 3] = src[i * 4];
      out[k * 3 + 1] = src[i * 4 + 1];
      out[k * 3 + 2] = src[i * 4 + 2];
    }
    return out;
  }

  // ---- canonical gate replay -------------------------------------------
  // Replays sim.py _canonical_step from the committed f32 IC: 1000
  // explicit-Euler gravity steps; the optimized grid density at each of
  // the 11 checkpoints (h = 0.026, the value that actually produced the
  // capture — NOT the manifest's 0.05).
  async function runCanonicalReplay(
    ic: Float32Array,
    opts: {
      h: number;
      dt: number;
      gz: number;
      mass: number;
      steps: number;
      interval: number;
      stride: number;
      onProgress?: (step: number) => void;
    },
  ): Promise<{ checkpoints: CheckpointData[]; sortSaturated: boolean; ms: number }> {
    const t0 = performance.now();
    const n = ic.length / 3;
    const cell = 2.0 * opts.h;
    // Grid covers the full fall: cloud starts in [0,1]^3 and translates
    // rigidly to z ~ -4.91 by step 1000.
    const zMin = -5.0;
    const grid: GridConfig = {
      origin: [-0.06, -0.06, zMin],
      dims: [
        Math.ceil(1.12 / cell),
        Math.ceil(1.12 / cell),
        Math.ceil((1.12 - zMin) / cell),
      ],
      cell,
    };
    const nCells = writeSimParams({
      n,
      h: opts.h,
      grid,
      gDt: opts.gz * opts.dt,
      dt: opts.dt,
      mass: opts.mass,
    });
    queue.writeBuffer(buf.pos, 0, packVec4(ic, n));
    queue.writeBuffer(buf.vel, 0, new Float32Array(n * 4));
    queue.writeBuffer(buf.flags, 0, new Uint32Array(4));

    const gp = Math.ceil(n / 64);
    const checkpoints: CheckpointData[] = [];

    const capture = async (step: number) => {
      const enc = device.createCommandEncoder();
      const pass = enc.beginComputePass();
      encodeGridBuild(pass, n, nCells);
      dispatch(pass, "density_grid", gp);
      pass.end();
      queue.submit([enc.finish()]);
      const [pRaw, vRaw, dRaw] = await Promise.all([
        readBuffer(buf.pos, n * 16),
        readBuffer(buf.vel, n * 16),
        readBuffer(buf.density, n * 4),
      ]);
      const dAll = new Float32Array(dRaw);
      const count = Math.ceil(n / opts.stride);
      const dSub = new Float32Array(count);
      for (let k = 0; k < count; k += 1) dSub[k] = dAll[k * opts.stride];
      checkpoints.push({
        step,
        position: unpackVec4(new Float32Array(pRaw), n, opts.stride),
        velocity: unpackVec4(new Float32Array(vRaw), n, opts.stride),
        density: dSub,
      });
      opts.onProgress?.(step);
    };

    await capture(0);
    for (let s = 0; s < opts.steps; s += opts.interval) {
      const enc = device.createCommandEncoder();
      const pass = enc.beginComputePass();
      for (let k = 0; k < opts.interval; k += 1) dispatch(pass, "integrate_canonical", gp);
      pass.end();
      queue.submit([enc.finish()]);
      await capture(s + opts.interval);
    }
    const flags = new Uint32Array(await readBuffer(buf.flags, 16));
    return { checkpoints, sortSaturated: flags[0] !== 0, ms: performance.now() - t0 };
  }

  // ---- hash==brute neighbor-search equivalence ---------------------------
  async function runHashBrute(
    positions: Float32Array,
    n: number,
    h: number,
    grid: GridConfig,
    opts?: { perturbGrid?: boolean },
  ): Promise<{ grid: Int32Array; brute: Int32Array }> {
    const cfgGrid = opts?.perturbGrid
      ? { ...grid, origin: [grid.origin[0] + 0.6 * grid.cell, grid.origin[1], grid.origin[2]] as [number, number, number], cell: grid.cell * 0.72 }
      : grid;
    // The falsifiability probe shrinks the cell below the support radius —
    // the grid then provably misses neighbors and the SHA turns red.
    const nCells = writeSimParams({ n, h, grid: cfgGrid, gDt: 0, dt: 0, mass: 1e-3 });
    queue.writeBuffer(buf.pos, 0, packVec4(positions, n));
    queue.writeBuffer(buf.vel, 0, new Float32Array(n * 4));
    const gp = Math.ceil(n / 64);
    let enc = device.createCommandEncoder();
    let pass = enc.beginComputePass();
    encodeGridBuild(pass, n, nCells);
    dispatch(pass, "density_grid_fp", gp);
    pass.end();
    queue.submit([enc.finish()]);
    const gridOut = new Int32Array(await readBuffer(buf.densityFp, n * 4));
    enc = device.createCommandEncoder();
    pass = enc.beginComputePass();
    dispatch(pass, "density_brute_fp", gp);
    pass.end();
    queue.submit([enc.finish()]);
    const bruteOut = new Int32Array(await readBuffer(buf.densityFp, n * 4));
    return { grid: gridOut, brute: bruteOut };
  }

  // ---- golden kernel evaluation ------------------------------------------
  async function runKernelEval(points: { q: number; h: number }[]): Promise<Float32Array> {
    const inArr = new Float32Array(points.length * 2);
    points.forEach((p, i) => {
      inArr[i * 2] = p.q;
      inArr[i * 2 + 1] = p.h;
    });
    queue.writeBuffer(buf.kernelIn, 0, inArr);
    const enc = device.createCommandEncoder();
    const pass = enc.beginComputePass();
    dispatch(pass, "kernel_eval", 1);
    pass.end();
    queue.submit([enc.finish()]);
    return new Float32Array((await readBuffer(buf.kernelOut, points.length * 8)).slice(0, points.length * 8));
  }

  // ---- fixture corrector ---------------------------------------------------
  async function runCorrectorFixture(fix: {
    positions: number[][];
    velocities: number[][];
    mass: number;
    h: number;
    maxIter: number;
    tolerance: number;
    rho0: number;
  }): Promise<{ velocities: Float32Array; iterations: number }> {
    const n = fix.positions.length;
    const ab = new ArrayBuffer(32);
    const dv = new DataView(ab);
    dv.setUint32(0, n, true);
    dv.setUint32(4, fix.maxIter, true);
    dv.setFloat32(16, fix.h, true);
    dv.setFloat32(20, fix.tolerance, true);
    dv.setFloat32(24, fix.rho0, true);
    queue.writeBuffer(buf.correctorParams, 0, ab);
    const p4 = new Float32Array(n * 4);
    const v4 = new Float32Array(n * 4);
    const m = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
      for (let k = 0; k < 3; k += 1) {
        p4[i * 4 + k] = fix.positions[i][k];
        v4[i * 4 + k] = fix.velocities[i][k];
      }
      m[i] = fix.mass;
    }
    queue.writeBuffer(buf.fixPos, 0, p4);
    queue.writeBuffer(buf.fixVel, 0, v4);
    queue.writeBuffer(buf.fixMass, 0, m);
    const enc = device.createCommandEncoder();
    const pass = enc.beginComputePass();
    dispatch(pass, "corrector_fixture", 1);
    pass.end();
    queue.submit([enc.finish()]);
    const vOut = new Float32Array(await readBuffer(buf.fixVel, n * 16));
    const iters = new Float32Array(await readBuffer(buf.fixOut, 16))[0];
    const velocities = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 1)
      for (let k = 0; k < 3; k += 1) velocities[i * 3 + k] = vOut[i * 4 + k];
    return { velocities, iterations: iters };
  }

  // ---- kernel-normalization unit-volume check ------------------------------
  // sum_j W * V -> 1 on a uniform lattice (interior particles): run the
  // verified density gather with mass = s^3 (unit continuum density).
  async function runNormalizationCheck(): Promise<{ mean: number; maxDev: number; count: number }> {
    const side = 20;
    const s = 1.0 / side;
    const n = side * side * side;
    const h = 1.3 * s;
    const p = new Float32Array(n * 3);
    let w = 0;
    for (let iz = 0; iz < side; iz += 1)
      for (let iy = 0; iy < side; iy += 1)
        for (let ix = 0; ix < side; ix += 1) {
          p[w * 3] = (ix + 0.5) * s;
          p[w * 3 + 1] = (iy + 0.5) * s;
          p[w * 3 + 2] = (iz + 0.5) * s;
          w += 1;
        }
    const cell = 2 * h;
    const grid: GridConfig = {
      origin: [-cell, -cell, -cell],
      dims: [
        Math.ceil((1 + 2 * cell) / cell),
        Math.ceil((1 + 2 * cell) / cell),
        Math.ceil((1 + 2 * cell) / cell),
      ],
      cell,
    };
    const nCells = writeSimParams({ n, h, grid, gDt: 0, dt: 0, mass: s * s * s });
    queue.writeBuffer(buf.pos, 0, packVec4(p, n));
    const enc = device.createCommandEncoder();
    const pass = enc.beginComputePass();
    encodeGridBuild(pass, n, nCells);
    dispatch(pass, "density_grid", Math.ceil(n / 64));
    pass.end();
    queue.submit([enc.finish()]);
    const rho = new Float32Array(await readBuffer(buf.density, n * 4));
    // interior = farther than the support radius from every face
    let sum = 0;
    let maxDev = 0;
    let count = 0;
    for (let i = 0; i < n; i += 1) {
      const x = p[i * 3];
      const y = p[i * 3 + 1];
      const z = p[i * 3 + 2];
      const m = Math.min(x, y, z, 1 - x, 1 - y, 1 - z);
      if (m < 2 * h) continue;
      sum += rho[i];
      maxDev = Math.max(maxDev, Math.abs(rho[i] - 1.0));
      count += 1;
    }
    return { mean: sum / Math.max(count, 1), maxDev, count };
  }

  // ---- live DFSPH ------------------------------------------------------------
  function createLive(initial: LiveConfig) {
    let cfg = { ...initial };
    const inter = {
      obstacle: [0, 0, 0, 0] as [number, number, number, number],
      impulsePos: [0, 0, 0, 0] as [number, number, number, number],
      impulseVel: [0, 0, 0, 1] as [number, number, number, number],
    };
    let nCells = cfg.grid.dims[0] * cfg.grid.dims[1] * cfg.grid.dims[2];

    function syncParams() {
      nCells = cfg.grid.dims[0] * cfg.grid.dims[1] * cfg.grid.dims[2];
      if (nCells > MAX_CELLS) throw new Error(`live grid too large: ${nCells}`);
      writeSimParams({
        n: cfg.n,
        h: cfg.h,
        grid: cfg.grid,
        gDt: 0,
        dt: cfg.dt,
        mass: cfg.mass,
      });
      writeLiveParams(cfg, inter);
    }

    function seed(positions: Float32Array, velocities?: Float32Array) {
      const n = positions.length / 3;
      if (n > MAX_N) throw new Error(`too many particles: ${n}`);
      cfg.n = n;
      queue.writeBuffer(buf.pos, 0, packVec4(positions, n));
      queue.writeBuffer(
        buf.vel,
        0,
        velocities ? packVec4(velocities, n) : new Float32Array(n * 4),
      );
      queue.writeBuffer(buf.kappaTotal, 0, new Float32Array(n));
      syncParams();
    }

    function addParticles(positions: Float32Array, velocity: [number, number, number]) {
      const k = positions.length / 3;
      const n = cfg.n;
      const cap = Math.min(k, MAX_N - n);
      if (cap <= 0) return 0;
      const p4 = new Float32Array(cap * 4);
      const v4 = new Float32Array(cap * 4);
      for (let i = 0; i < cap; i += 1) {
        p4[i * 4] = positions[i * 3];
        p4[i * 4 + 1] = positions[i * 3 + 1];
        p4[i * 4 + 2] = positions[i * 3 + 2];
        v4[i * 4] = velocity[0];
        v4[i * 4 + 1] = velocity[1];
        v4[i * 4 + 2] = velocity[2];
      }
      queue.writeBuffer(buf.pos, n * 16, p4);
      queue.writeBuffer(buf.vel, n * 16, v4);
      queue.writeBuffer(buf.kappaTotal, n * 4, new Float32Array(cap));
      cfg.n = n + cap;
      syncParams();
      return cap;
    }

    // One DFSPH frame (possibly several substeps), encoded in one submit.
    function step(substeps = 1) {
      syncParams();
      const n = cfg.n;
      if (n === 0) return;
      const gp = Math.ceil(n / 64);
      const enc = device.createCommandEncoder();
      for (let sub = 0; sub < substeps; sub += 1) {
        const pass = enc.beginComputePass();
        encodeGridBuild(pass, n, nCells);
        dispatch(pass, "df_density_alpha", gp, true);
        dispatch(pass, "df_xsph", gp, true);
        dispatch(pass, "df_apply_ext", gp, true);
        dispatch(pass, "df_warm_start", gp, true);
        if (cfg.warmStart) dispatch(pass, "df_apply_kappa", gp, true);
        for (let it = 0; it < cfg.densityIters; it += 1) {
          dispatch(pass, "df_predict_density", gp, true);
          dispatch(pass, "df_apply_kappa", gp, true);
        }
        for (let it = 0; it < cfg.divergenceIters; it += 1) {
          dispatch(pass, "df_predict_divergence", gp, true);
          dispatch(pass, "df_apply_kappa", gp, true);
        }
        dispatch(pass, "df_integrate", gp, true);
        pass.end();
        enc.copyBufferToBuffer(buf.velOut, 0, buf.vel, 0, n * 16);
      }
      queue.submit([enc.finish()]);
    }

    async function readDiagnostics(sample = 4096) {
      const n = Math.min(cfg.n, sample);
      if (n === 0)
        return { maxErr: 0, avgRho: 0, maxNc: 0, n: 0, maxSpeed: 0, meanSpeed: 0 };
      const [auxRaw, velRaw] = await Promise.all([
        readBuffer(buf.partAux, n * 16),
        readBuffer(buf.vel, n * 16),
      ]);
      const aux = new Float32Array(auxRaw);
      const v = new Float32Array(velRaw);
      let maxErr = 0;
      let sumRho = 0;
      let maxNc = 0;
      let maxSpeed = 0;
      let sumSpeed = 0;
      for (let i = 0; i < n; i += 1) {
        sumRho += aux[i * 4];
        maxNc = Math.max(maxNc, aux[i * 4 + 2]);
        maxErr = Math.max(maxErr, aux[i * 4 + 3]);
        const s = Math.hypot(v[i * 4], v[i * 4 + 1], v[i * 4 + 2]);
        maxSpeed = Math.max(maxSpeed, s);
        sumSpeed += s;
      }
      return { maxErr, avgRho: sumRho / n, maxNc, n, maxSpeed, meanSpeed: sumSpeed / n };
    }

    return {
      get config() {
        return cfg;
      },
      set config(c: LiveConfig) {
        cfg = { ...c };
      },
      interaction: inter,
      seed,
      addParticles,
      step,
      readDiagnostics,
    };
  }

  return {
    device,
    queue,
    buf,
    readBuffer,
    writeSimParams,
    encodeGridBuild,
    runCanonicalReplay,
    runHashBrute,
    runKernelEval,
    runCorrectorFixture,
    runNormalizationCheck,
    createLive,
  };
}
