import coreWgsl from "../../src/sph_core.wgsl?raw";
import multiphaseWgsl from "../../src/multiphase_solver.wgsl?raw";

export const MAX_N = 131072;
export const MAX_CELLS = 262144;

export interface GridConfig {
  origin: [number, number, number];
  dims: [number, number, number];
  cell: number;
}

export interface LiveConfig {
  n: number;
  h: number;
  spacing: number;
  grid: GridConfig;
  dt: number;
  delta0: number;
  density: [number, number];
  viscosity: [number, number];
  sigma: number;
  gravity: [number, number, number];
  boxMin: [number, number, number];
  boxMax: [number, number, number];
  contactAngle: [number, number];
  wettingCenter: number;
  adhesion: number;
  marangoni: number;
  vmax: number;
  kappaClamp: number;
  interfaceThreshold: number;
  pressureIters: number;
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
};

const MP_BINDINGS: Record<string, number[]> = {
  mp_density_alpha: [0, 1, 4, 7, 8, 9],
  mp_interface: [0, 1, 4, 6, 7, 8, 9],
  mp_forces: [0, 1, 2, 3, 4, 6, 7, 8, 9],
  mp_predict: [0, 1, 3, 4, 5, 7, 8, 9],
  mp_apply_pressure: [0, 1, 3, 5, 7, 8, 9],
  mp_integrate: [0, 1, 3],
};

export type MultiphaseGpu = Awaited<ReturnType<typeof createMultiphaseGpu>>;

export async function createMultiphaseGpu(device: GPUDevice) {
  const queue = device.queue;
  const storage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
  const mk = (label: string, size: number) => device.createBuffer({ label, size, usage: storage });
  const buf = {
    simParams: device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }),
    liveParams: device.createBuffer({ size: 192, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }),
    pos: mk("mp-pos", MAX_N * 16),
    vel: mk("mp-vel", MAX_N * 16),
    velOut: mk("mp-vel-out", MAX_N * 16),
    aux: mk("mp-aux", MAX_N * 16),
    kappa: mk("mp-kappa", MAX_N * 4),
    iface: mk("mp-interface", MAX_N * 16),
    cellCount: mk("mp-cell-count", MAX_CELLS * 4),
    cellStart: mk("mp-cell-start", (MAX_CELLS + 1) * 4),
    cursor: mk("mp-cursor", MAX_CELLS * 4),
    sortedIdx: mk("mp-sorted-id", MAX_N * 4),
    cellOf: mk("mp-cell-of", MAX_N * 4),
    posSorted: mk("mp-pos-sorted", MAX_N * 16),
    velSorted: mk("mp-vel-sorted", MAX_N * 16),
    blockSums: mk("mp-block-sums", 512 * 4),
    flags: mk("mp-flags", 16),
  };
  const coreBy: Record<number, GPUBuffer> = {
    0: buf.simParams, 1: buf.pos, 2: buf.vel, 4: buf.cellCount,
    5: buf.cellStart, 6: buf.cursor, 7: buf.sortedIdx, 8: buf.cellOf,
    9: buf.posSorted, 10: buf.velSorted, 11: buf.cellCount,
    12: buf.blockSums, 14: buf.flags,
  };
  const mpBy: Record<number, GPUBuffer> = {
    0: buf.liveParams, 1: buf.pos, 2: buf.vel, 3: buf.velOut,
    4: buf.aux, 5: buf.kappa, 6: buf.iface, 7: buf.posSorted,
    8: buf.sortedIdx, 9: buf.cellStart,
  };

  const coreModule = device.createShaderModule({ label: "multiphase-grid", code: coreWgsl });
  const mpModule = device.createShaderModule({ label: "multiphase-physics", code: multiphaseWgsl });
  async function build(
    module: GPUShaderModule,
    bindings: Record<string, number[]>,
    byBinding: Record<number, GPUBuffer>,
  ) {
    const out: Record<string, { pipeline: GPUComputePipeline; bg: GPUBindGroup }> = {};
    await Promise.all(Object.entries(bindings).map(async ([entryPoint, ids]) => {
      const pipeline = await device.createComputePipelineAsync({ layout: "auto", compute: { module, entryPoint } });
      const bg = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: ids.map((binding) => ({ binding, resource: { buffer: byBinding[binding] } })),
      });
      out[entryPoint] = { pipeline, bg };
    }));
    return out;
  }
  const [core, mp] = await Promise.all([
    build(coreModule, CORE_BINDINGS, coreBy),
    build(mpModule, MP_BINDINGS, mpBy),
  ]);
  function dispatch(pass: GPUComputePassEncoder, name: string, groups: number, physics = false) {
    const p = physics ? mp[name] : core[name];
    pass.setPipeline(p.pipeline);
    pass.setBindGroup(0, p.bg);
    pass.dispatchWorkgroups(groups);
  }
  function writeGrid(cfg: LiveConfig): number {
    const [nx, ny, nz] = cfg.grid.dims;
    const nCells = nx * ny * nz;
    if (nCells > MAX_CELLS) throw new Error(`grid ${nCells} exceeds capacity`);
    const ab = new ArrayBuffer(64);
    const d = new DataView(ab);
    d.setUint32(0, cfg.n, true); d.setUint32(4, nx, true); d.setUint32(8, ny, true); d.setUint32(12, nz, true);
    d.setUint32(16, nCells, true); d.setFloat32(24, 1 / cfg.grid.cell, true); d.setFloat32(28, cfg.h, true);
    d.setFloat32(32, cfg.grid.origin[0], true); d.setFloat32(36, cfg.grid.origin[1], true); d.setFloat32(40, cfg.grid.origin[2], true);
    d.setFloat32(48, cfg.dt, true); d.setFloat32(52, cfg.density[0] * cfg.spacing ** 3, true);
    queue.writeBuffer(buf.simParams, 0, ab);
    return nCells;
  }
  const interaction = {
    obstacle: [0.5, 0.5, 0.3, 0] as [number, number, number, number],
    impulsePos: [0, 0, 0, 0] as [number, number, number, number],
    impulseVel: [0, 0, 0, 1] as [number, number, number, number],
  };
  function writeLive(cfg: LiveConfig): void {
    const [nx, ny, nz] = cfg.grid.dims;
    const ab = new ArrayBuffer(192);
    const d = new DataView(ab);
    d.setUint32(0, cfg.n, true); d.setUint32(4, nx, true); d.setUint32(8, ny, true); d.setUint32(12, nz, true);
    d.setUint32(16, nx * ny * nz, true); d.setFloat32(24, 1 / cfg.grid.cell, true); d.setFloat32(28, cfg.h, true);
    d.setFloat32(32, cfg.grid.origin[0], true); d.setFloat32(36, cfg.grid.origin[1], true); d.setFloat32(40, cfg.grid.origin[2], true); d.setFloat32(44, cfg.dt, true);
    cfg.gravity.forEach((v, i) => d.setFloat32(48 + 4 * i, v, true)); d.setFloat32(60, cfg.delta0, true);
    cfg.boxMin.forEach((v, i) => d.setFloat32(64 + 4 * i, v, true)); d.setFloat32(76, cfg.spacing ** 3, true);
    cfg.boxMax.forEach((v, i) => d.setFloat32(80 + 4 * i, v, true)); d.setFloat32(92, cfg.sigma, true);
    d.setFloat32(96, cfg.density[0], true); d.setFloat32(100, cfg.density[1], true);
    d.setFloat32(104, cfg.viscosity[0], true); d.setFloat32(108, cfg.viscosity[1], true);
    interaction.obstacle.forEach((v, i) => d.setFloat32(112 + 4 * i, v, true));
    interaction.impulsePos.forEach((v, i) => d.setFloat32(128 + 4 * i, v, true));
    interaction.impulseVel.forEach((v, i) => d.setFloat32(144 + 4 * i, v, true));
    d.setFloat32(160, Math.cos(cfg.contactAngle[0] * Math.PI / 180), true);
    d.setFloat32(164, Math.cos(cfg.contactAngle[1] * Math.PI / 180), true);
    d.setFloat32(168, cfg.adhesion, true); d.setFloat32(172, cfg.marangoni, true);
    d.setFloat32(176, cfg.vmax, true); d.setFloat32(180, cfg.kappaClamp, true);
    d.setFloat32(184, cfg.interfaceThreshold, true); d.setFloat32(188, cfg.wettingCenter, true);
    queue.writeBuffer(buf.liveParams, 0, ab);
  }
  function encodeGrid(pass: GPUComputePassEncoder, n: number, nCells: number): void {
    const gp = Math.ceil(n / 64);
    dispatch(pass, "clear_cells", Math.ceil(nCells / 256));
    dispatch(pass, "histogram", gp);
    dispatch(pass, "scan_blocks", Math.ceil(nCells / 512));
    dispatch(pass, "scan_block_sums", 1);
    dispatch(pass, "scan_add_offsets", Math.ceil(nCells / 256));
    dispatch(pass, "seed_cursor", Math.ceil(nCells / 256));
    dispatch(pass, "scatter", gp);
    dispatch(pass, "cell_sort", Math.ceil(nCells / 64));
    dispatch(pass, "reorder", gp);
  }
  async function readBuffer(src: GPUBuffer, bytes: number): Promise<ArrayBuffer> {
    const rb = device.createBuffer({ size: Math.max(4, bytes), usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const enc = device.createCommandEncoder(); enc.copyBufferToBuffer(src, 0, rb, 0, Math.max(4, bytes)); queue.submit([enc.finish()]);
    await rb.mapAsync(GPUMapMode.READ); const out = rb.getMappedRange().slice(0); rb.unmap(); rb.destroy(); return out;
  }
  function pack(positions: Float32Array, phases: Uint32Array, velocities?: Float32Array): [Float32Array, Float32Array] {
    const n = phases.length; const p = new Float32Array(n * 4); const v = new Float32Array(n * 4);
    for (let i = 0; i < n; i += 1) {
      p.set([positions[3 * i], positions[3 * i + 1], positions[3 * i + 2], phases[i]], 4 * i);
      if (velocities) v.set([velocities[3 * i], velocities[3 * i + 1], velocities[3 * i + 2], 0], 4 * i);
    }
    return [p, v];
  }

  function createLive(initial: LiveConfig) {
    let cfg = { ...initial };
    let nCells = writeGrid(cfg);
    function sync(): void { nCells = writeGrid(cfg); writeLive(cfg); }
    function seed(positions: Float32Array, phases: Uint32Array, velocities?: Float32Array): void {
      if (phases.length > MAX_N || positions.length !== phases.length * 3) throw new Error("invalid seed capacity");
      const [p, v] = pack(positions, phases, velocities); cfg.n = phases.length;
      queue.writeBuffer(buf.pos, 0, p); queue.writeBuffer(buf.vel, 0, v);
      queue.writeBuffer(buf.flags, 0, new Uint32Array(4)); sync();
    }
    function addParticles(positions: Float32Array, phase: 0 | 1, velocity: [number, number, number]): number {
      const count = Math.min(positions.length / 3, MAX_N - cfg.n); if (count <= 0) return 0;
      const phases = new Uint32Array(count).fill(phase); const vv = new Float32Array(count * 3);
      for (let i = 0; i < count; i += 1) vv.set(velocity, 3 * i);
      const [p, v] = pack(positions.subarray(0, count * 3), phases, vv);
      queue.writeBuffer(buf.pos, cfg.n * 16, p); queue.writeBuffer(buf.vel, cfg.n * 16, v); cfg.n += count; sync(); return count;
    }
    function step(substeps = 1): void {
      if (cfg.n === 0) return; sync(); const gp = Math.ceil(cfg.n / 64); const enc = device.createCommandEncoder();
      for (let s = 0; s < substeps; s += 1) {
        const pass = enc.beginComputePass(); encodeGrid(pass, cfg.n, nCells);
        dispatch(pass, "mp_density_alpha", gp, true); dispatch(pass, "mp_interface", gp, true); dispatch(pass, "mp_forces", gp, true);
        for (let it = 0; it < cfg.pressureIters; it += 1) { dispatch(pass, "mp_predict", gp, true); dispatch(pass, "mp_apply_pressure", gp, true); }
        dispatch(pass, "mp_integrate", gp, true); pass.end(); enc.copyBufferToBuffer(buf.velOut, 0, buf.vel, 0, cfg.n * 16);
      }
      queue.submit([enc.finish()]);
    }
    async function readState(stride = 1) {
      const n = cfg.n; const [pr, vr, ar, ir, fr] = await Promise.all([
        readBuffer(buf.pos, n * 16), readBuffer(buf.vel, n * 16), readBuffer(buf.aux, n * 16), readBuffer(buf.iface, n * 16), readBuffer(buf.flags, 16),
      ]);
      const p4 = new Float32Array(pr), v4 = new Float32Array(vr), a4 = new Float32Array(ar), i4 = new Float32Array(ir), flags = new Uint32Array(fr);
      const count = Math.ceil(n / stride); const position = new Float32Array(count * 3), velocity = new Float32Array(count * 3), phase = new Float32Array(count), delta = new Float32Array(count), interfaceWeight = new Float32Array(count);
      let maxCompression = 0, sumDelta = 0, interfaceCount = 0, maxNeighbors = 0, maxSpeed = 0;
      for (let i = 0; i < n; i += 1) { maxCompression = Math.max(maxCompression, a4[4 * i + 3]); sumDelta += a4[4 * i]; maxNeighbors = Math.max(maxNeighbors, a4[4 * i + 2]); maxSpeed = Math.max(maxSpeed, Math.hypot(v4[4*i],v4[4*i+1],v4[4*i+2])); if (i4[4*i+3] > cfg.interfaceThreshold) interfaceCount += 1; }
      for (let k = 0; k < count; k += 1) { const i = Math.min(k * stride, n - 1); position.set(p4.subarray(4*i,4*i+3),3*k); velocity.set(v4.subarray(4*i,4*i+3),3*k); phase[k]=p4[4*i+3]; delta[k]=a4[4*i]; interfaceWeight[k]=i4[4*i+3]; }
      return { position, velocity, phase, delta, interfaceWeight, diagnostics: { n, maxCompression, meanDelta: sumDelta/Math.max(n,1), interfaceCount, maxNeighbors, maxSpeed, sortSaturated: flags[0] } };
    }
    return {
      get config() { return cfg; }, set config(v: LiveConfig) { cfg = { ...v }; sync(); },
      interaction, seed, addParticles, step, readState,
    };
  }
  return { device, queue, buf, createLive, readBuffer };
}
