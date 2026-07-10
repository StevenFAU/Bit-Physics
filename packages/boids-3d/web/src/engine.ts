import gridWgsl from "./grid.wgsl?raw";
import starlingWgsl from "./starling.wgsl?raw";
import statsWgsl from "./stats.wgsl?raw";
import birdWgsl from "./bird.wgsl?raw";
import skyWgsl from "./sky.wgsl?raw";

const MAX_AGENTS = 65_536;
const AGENT_BYTES = 64;
const PARAM_BYTES = 176;
const RENDER_BYTES = 112;
const STATS_BYTES = 64;
const GRID = { nx: 24, ny: 12, nz: 24, cellSize: 6 } as const;
const CELL_COUNT = GRID.nx * GRID.ny * GRID.nz;

export type ToolMode = "orbit" | "attract" | "repel" | "falcon" | "gust";
export type ColorMode = "natural" | "heading" | "speed" | "alert";

export interface MurmurationPreset {
  id: number;
  label: string;
  title: string;
  separation: number;
  alignment: number;
  cohesion: number;
  roost: number;
  hardRadius: number;
  socialRadius: number;
  blindCosine: number;
  noise: number;
  minSpeed: number;
  maxSpeed: number;
  maxTurn: number;
  radii: readonly [number, number, number];
  altitude: number;
}

export const PRESETS: readonly MurmurationPreset[] = [
  {
    id: 0, label: "starling", title: "Topological seven-neighbor flock with a narrow rear blind cone.",
    separation: 2.8, alignment: 1.25, cohesion: 0.72, roost: 1.5,
    hardRadius: 1.45, socialRadius: 6, blindCosine: -0.82, noise: 0.08,
    minSpeed: 4.3, maxSpeed: 8.2, maxTurn: 2.5, radii: [52, 22, 45], altitude: 2,
  },
  {
    id: 1, label: "ribbon", title: "Strong alignment and a shallow vertical envelope form a turning ribbon.",
    separation: 3.2, alignment: 2.1, cohesion: 0.48, roost: 1.8,
    hardRadius: 1.55, socialRadius: 6, blindCosine: -0.74, noise: 0.035,
    minSpeed: 5.2, maxSpeed: 9, maxTurn: 2.1, radii: [58, 9, 50], altitude: 1,
  },
  {
    id: 2, label: "pulse", title: "Cohesion-dominant flock compresses and expands under finite turning speed.",
    separation: 3.8, alignment: 0.78, cohesion: 1.38, roost: 1.35,
    hardRadius: 1.75, socialRadius: 6, blindCosine: -0.88, noise: 0.11,
    minSpeed: 3.8, maxSpeed: 8.8, maxTurn: 2.9, radii: [42, 19, 39], altitude: 0,
  },
  {
    id: 3, label: "split", title: "Shorter social reach and stronger noise sustain shifting flocklets.",
    separation: 3.4, alignment: 0.8, cohesion: 0.5, roost: 1.05,
    hardRadius: 1.5, socialRadius: 5.2, blindCosine: -0.65, noise: 0.19,
    minSpeed: 4.5, maxSpeed: 9.4, maxTurn: 3.2, radii: [60, 25, 52], altitude: 1,
  },
  {
    id: 4, label: "storm", title: "Fast, noisy motion with weak cohesion and aggressive banking.",
    separation: 4, alignment: 0.7, cohesion: 0.38, roost: 1.65,
    hardRadius: 1.65, socialRadius: 6, blindCosine: -0.72, noise: 0.27,
    minSpeed: 6.1, maxSpeed: 11, maxTurn: 3.8, radii: [55, 27, 48], altitude: 0,
  },
  {
    id: 6, label: "landmark", title: "A central exclusion volume reveals obstacle anticipation and flock splitting.",
    separation: 3.1, alignment: 1.3, cohesion: 0.75, roost: 1.45,
    hardRadius: 1.5, socialRadius: 6, blindCosine: -0.82, noise: 0.075,
    minSpeed: 4.5, maxSpeed: 8.7, maxTurn: 2.7, radii: [55, 22, 48], altitude: 1,
  },
];

export interface FlockStats {
  centroid: [number, number, number];
  meanHeading: [number, number, number];
  polarization: number;
  meanSpeed: number;
  alertFraction: number;
  meanNeighbors: number;
  rmsRoll: number;
  milling: number;
  radius: number;
  verticalSpread: number;
}

export interface CameraState {
  yaw: number;
  pitch: number;
  distance: number;
}

export type CameraMode = "orbit" | "chase" | "director";

interface ToolState {
  mode: ToolMode;
  position: [number, number, number];
  direction: [number, number, number];
  radius: number;
  strength: number;
  active: boolean;
}

function cross(a: readonly number[], b: readonly number[]): [number, number, number] {
  return [a[1]! * b[2]! - a[2]! * b[1]!, a[2]! * b[0]! - a[0]! * b[2]!, a[0]! * b[1]! - a[1]! * b[0]!];
}

function normalize(v: readonly number[]): [number, number, number] {
  const inverse = 1 / Math.max(Math.hypot(v[0]!, v[1]!, v[2]!), 1e-8);
  return [v[0]! * inverse, v[1]! * inverse, v[2]! * inverse];
}

function perspective(fov: number, aspect: number, near: number, far: number): Float32Array {
  const f = 1 / Math.tan(fov / 2);
  const range = far / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, range, -1,
    0, 0, near * range, 0,
  ]);
}

function lookAt(eye: readonly number[], target: readonly number[]): Float32Array {
  const z = normalize([eye[0]! - target[0]!, eye[1]! - target[1]!, eye[2]! - target[2]!]);
  const x = normalize(cross([0, 1, 0], z));
  const y = cross(z, x);
  return new Float32Array([
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
    -(x[0] * eye[0]! + x[1] * eye[1]! + x[2] * eye[2]!),
    -(y[0] * eye[0]! + y[1] * eye[1]! + y[2] * eye[2]!),
    -(z[0] * eye[0]! + z[1] * eye[1]! + z[2] * eye[2]!), 1,
  ]);
}

function multiply(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(16);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      out[column * 4 + row] =
        a[row]! * b[column * 4]! + a[4 + row]! * b[column * 4 + 1]! +
        a[8 + row]! * b[column * 4 + 2]! + a[12 + row]! * b[column * 4 + 3]!;
    }
  }
  return out;
}

function moduleWithErrors(device: GPUDevice, code: string, label: string): GPUShaderModule {
  const module = device.createShaderModule({ code, label });
  void module.getCompilationInfo().then((info) => {
    const errors = info.messages.filter((message) => message.type === "error");
    if (errors.length > 0) console.error(`${label}:\n${errors.map((e) => `${e.lineNum}:${e.linePos} ${e.message}`).join("\n")}`);
  });
  return module;
}

function makeBuffer(device: GPUDevice, size: number, usage: GPUBufferUsageFlags, label: string): GPUBuffer {
  return device.createBuffer({ size, usage, label });
}

export class MurmurationEngine {
  readonly camera: CameraState = { yaw: -0.35, pitch: 0.14, distance: 104 };
  readonly maxAgents = MAX_AGENTS;
  stats: FlockStats = {
    centroid: [0, 0, 0], meanHeading: [0, 0, 1], polarization: 0, meanSpeed: 0, alertFraction: 0,
    meanNeighbors: 0, rmsRoll: 0, milling: 0, radius: 40, verticalSpread: 12,
  };
  agentCount: number;
  paused = false;
  colorMode: ColorMode = "natural";
  cameraMode: CameraMode = "director";
  cpuFrameP50 = 0;
  cpuFrameP95 = 0;
  preset: MurmurationPreset = PRESETS[0]!;

  private readonly device: GPUDevice;
  private readonly queue: GPUQueue;
  private readonly canvas: HTMLCanvasElement;
  private readonly context: GPUCanvasContext;
  private readonly agents: readonly [GPUBuffer, GPUBuffer];
  private readonly params: GPUBuffer;
  private readonly statsParams: GPUBuffer;
  private readonly statsBuffer: GPUBuffer;
  private readonly renderUniform: GPUBuffer;
  private readonly staging: readonly [GPUBuffer, GPUBuffer];
  private readonly gridPipelines: Record<"clear" | "histogram" | "scan" | "scatter", GPUComputePipeline>;
  private readonly stepPipeline: GPUComputePipeline;
  private readonly statsPipelines: readonly [GPUComputePipeline, GPUComputePipeline];
  private readonly skyPipeline: GPURenderPipeline;
  private readonly birdPipeline: GPURenderPipeline;
  private readonly gridGroups: readonly [GPUBindGroup, GPUBindGroup];
  private readonly stepGroups: readonly [GPUBindGroup, GPUBindGroup];
  private readonly statsGroups: readonly [GPUBindGroup, GPUBindGroup];
  private readonly skyGroup: GPUBindGroup;
  private readonly renderGroups: readonly [GPUBindGroup, GPUBindGroup];
  private depth: GPUTexture;
  private source = 0;
  private frameIndex = 0;
  private simulationTime = 0;
  private lastFrame = performance.now();
  private accumulator = 0;
  private requestedSteps = 0;
  private readonly cpuFrameSamples: number[] = [];
  private targetCentroid: [number, number, number] = [0, 0, 0];
  private statsReadback = 0;
  private readonly readbackPending = [false, false];
  private readonly tool: ToolState = {
    mode: "orbit", position: [0, 0, 0], direction: [0, 1, 0], radius: 18, strength: 3.2, active: false,
  };

  private constructor(
    device: GPUDevice,
    canvas: HTMLCanvasElement,
    count: number,
    resources: {
      context: GPUCanvasContext;
      agents: readonly [GPUBuffer, GPUBuffer]; params: GPUBuffer;
      gridCount: GPUBuffer; gridStart: GPUBuffer; gridCursor: GPUBuffer; sortedIndex: GPUBuffer;
      statsParams: GPUBuffer; statsBuffer: GPUBuffer; renderUniform: GPUBuffer;
      staging: readonly [GPUBuffer, GPUBuffer];
      gridPipelines: Record<"clear" | "histogram" | "scan" | "scatter", GPUComputePipeline>;
      stepPipeline: GPUComputePipeline; statsPipelines: readonly [GPUComputePipeline, GPUComputePipeline];
      skyPipeline: GPURenderPipeline; birdPipeline: GPURenderPipeline;
      gridGroups: readonly [GPUBindGroup, GPUBindGroup]; stepGroups: readonly [GPUBindGroup, GPUBindGroup];
      statsGroups: readonly [GPUBindGroup, GPUBindGroup]; skyGroup: GPUBindGroup;
      renderGroups: readonly [GPUBindGroup, GPUBindGroup]; depth: GPUTexture;
    },
  ) {
    this.device = device; this.queue = device.queue; this.canvas = canvas;
    this.agentCount = count; this.context = resources.context;
    this.agents = resources.agents; this.params = resources.params;
    this.statsParams = resources.statsParams; this.statsBuffer = resources.statsBuffer;
    this.renderUniform = resources.renderUniform; this.staging = resources.staging;
    this.gridPipelines = resources.gridPipelines; this.stepPipeline = resources.stepPipeline;
    this.statsPipelines = resources.statsPipelines; this.skyPipeline = resources.skyPipeline;
    this.birdPipeline = resources.birdPipeline; this.gridGroups = resources.gridGroups;
    this.stepGroups = resources.stepGroups; this.statsGroups = resources.statsGroups;
    this.skyGroup = resources.skyGroup; this.renderGroups = resources.renderGroups;
    this.depth = resources.depth;
  }

  static async create(device: GPUDevice, canvas: HTMLCanvasElement, count = 32_768): Promise<MurmurationEngine> {
    const usage = GPUBufferUsage;
    const agents: readonly [GPUBuffer, GPUBuffer] = [
      makeBuffer(device, MAX_AGENTS * AGENT_BYTES, usage.STORAGE | usage.COPY_DST, "agents-a"),
      makeBuffer(device, MAX_AGENTS * AGENT_BYTES, usage.STORAGE | usage.COPY_DST, "agents-b"),
    ];
    const params = makeBuffer(device, PARAM_BYTES, usage.UNIFORM | usage.COPY_DST, "murmuration-params");
    const gridBytes = CELL_COUNT * 4;
    const gridCount = makeBuffer(device, gridBytes, usage.STORAGE, "cell-count");
    const gridStart = makeBuffer(device, gridBytes, usage.STORAGE, "cell-start");
    const gridCursor = makeBuffer(device, gridBytes, usage.STORAGE, "cell-cursor");
    const sortedIndex = makeBuffer(device, MAX_AGENTS * 4, usage.STORAGE, "sorted-index");
    const statsParams = makeBuffer(device, 16, usage.UNIFORM | usage.COPY_DST, "stats-params");
    const statsBuffer = makeBuffer(device, STATS_BYTES, usage.STORAGE | usage.COPY_SRC, "flock-stats");
    const renderUniform = makeBuffer(device, RENDER_BYTES, usage.UNIFORM | usage.COPY_DST, "render-uniform");
    const staging: readonly [GPUBuffer, GPUBuffer] = [
      makeBuffer(device, STATS_BYTES, usage.MAP_READ | usage.COPY_DST, "stats-staging-a"),
      makeBuffer(device, STATS_BYTES, usage.MAP_READ | usage.COPY_DST, "stats-staging-b"),
    ];

    const gridModule = moduleWithErrors(device, gridWgsl, "boids-grid");
    const stepModule = moduleWithErrors(device, starlingWgsl, "boids-starling");
    const statsModule = moduleWithErrors(device, statsWgsl, "boids-stats");
    const birdModule = moduleWithErrors(device, birdWgsl, "boids-birds");
    const skyModule = moduleWithErrors(device, skyWgsl, "boids-sky");

    const gridLayout = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
    ] });
    const gridPipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [gridLayout] });
    const makeGridPipeline = (entryPoint: string): Promise<GPUComputePipeline> => device.createComputePipelineAsync({
      layout: gridPipelineLayout, compute: { module: gridModule, entryPoint },
    });
    const [clear, histogram, scan, scatter] = await Promise.all([
      makeGridPipeline("clear_grid"), makeGridPipeline("histogram"), makeGridPipeline("scan_cells"), makeGridPipeline("scatter"),
    ]);
    const gridPipelines = { clear, histogram, scan, scatter };
    const gridGroups = agents.map((agent) => device.createBindGroup({ layout: gridLayout, entries: [
      { binding: 0, resource: { buffer: params } }, { binding: 1, resource: { buffer: agent } },
      { binding: 2, resource: { buffer: gridCount } }, { binding: 3, resource: { buffer: gridStart } },
      { binding: 4, resource: { buffer: gridCursor } }, { binding: 5, resource: { buffer: sortedIndex } },
    ] })) as unknown as readonly [GPUBindGroup, GPUBindGroup];

    const stepLayout = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
    ] });
    const stepPipeline = await device.createComputePipelineAsync({
      layout: device.createPipelineLayout({ bindGroupLayouts: [stepLayout] }),
      compute: { module: stepModule, entryPoint: "step" },
    });
    const stepGroups = [0, 1].map((source) => device.createBindGroup({ layout: stepLayout, entries: [
      { binding: 0, resource: { buffer: params } }, { binding: 1, resource: { buffer: agents[source]! } },
      { binding: 2, resource: { buffer: agents[1 - source]! } }, { binding: 3, resource: { buffer: gridCount } },
      { binding: 4, resource: { buffer: gridStart } }, { binding: 5, resource: { buffer: sortedIndex } },
    ] })) as unknown as readonly [GPUBindGroup, GPUBindGroup];

    const statsLayout = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
    ] });
    const statsPipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [statsLayout] });
    const statsPipelines = await Promise.all(["reduce_stats", "reduce_shape"].map((entryPoint) =>
      device.createComputePipelineAsync({ layout: statsPipelineLayout, compute: { module: statsModule, entryPoint } }),
    )) as [GPUComputePipeline, GPUComputePipeline];
    const statsGroups = agents.map((agent) => device.createBindGroup({ layout: statsLayout, entries: [
      { binding: 0, resource: { buffer: statsParams } }, { binding: 1, resource: { buffer: agent } },
      { binding: 2, resource: { buffer: statsBuffer } },
    ] })) as unknown as readonly [GPUBindGroup, GPUBindGroup];

    const context = canvas.getContext("webgpu") as GPUCanvasContext;
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: "opaque" });
    const renderLayout = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
    ] });
    const birdPipeline = await device.createRenderPipelineAsync({
      layout: device.createPipelineLayout({ bindGroupLayouts: [renderLayout] }),
      vertex: { module: birdModule, entryPoint: "bird_vertex" },
      fragment: { module: birdModule, entryPoint: "bird_fragment", targets: [{ format }] },
      primitive: { topology: "triangle-list", cullMode: "none" },
      depthStencil: { format: "depth24plus", depthWriteEnabled: true, depthCompare: "less" },
      multisample: { count: 1 },
    });
    const renderGroups = agents.map((agent) => device.createBindGroup({ layout: renderLayout, entries: [
      { binding: 0, resource: { buffer: renderUniform } }, { binding: 1, resource: { buffer: agent } },
    ] })) as unknown as readonly [GPUBindGroup, GPUBindGroup];
    const skyLayout = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
    ] });
    const skyPipeline = await device.createRenderPipelineAsync({
      layout: device.createPipelineLayout({ bindGroupLayouts: [skyLayout] }),
      vertex: { module: skyModule, entryPoint: "sky_vertex" },
      fragment: { module: skyModule, entryPoint: "sky_fragment", targets: [{ format }] },
      primitive: { topology: "triangle-list" },
      depthStencil: { format: "depth24plus", depthWriteEnabled: false, depthCompare: "always" },
    });
    const skyGroup = device.createBindGroup({ layout: skyLayout, entries: [{ binding: 0, resource: { buffer: renderUniform } }] });
    const depth = device.createTexture({ size: [Math.max(1, canvas.width), Math.max(1, canvas.height)], format: "depth24plus", usage: GPUTextureUsage.RENDER_ATTACHMENT });

    const engine = new MurmurationEngine(device, canvas, Math.min(count, MAX_AGENTS), {
      context, agents, params, gridCount, gridStart, gridCursor, sortedIndex,
      statsParams, statsBuffer, renderUniform, staging, gridPipelines, stepPipeline,
      statsPipelines, skyPipeline, birdPipeline, gridGroups, stepGroups, statsGroups,
      skyGroup, renderGroups, depth,
    });
    engine.reset(42);
    return engine;
  }

  reset(seed: number): void {
    let state = seed >>> 0 || 1;
    const random = (): number => {
      state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
      return (state >>> 0) / 4_294_967_296;
    };
    const data = new ArrayBuffer(this.agentCount * AGENT_BYTES);
    const floats = new Float32Array(data);
    const integers = new Uint32Array(data);
    for (let i = 0; i < this.agentCount; i += 1) {
      const base = i * 16;
      const radius = Math.cbrt(random());
      const azimuth = random() * Math.PI * 2;
      const vertical = random() * 2 - 1;
      const horizontal = Math.sqrt(Math.max(0, 1 - vertical * vertical));
      const position: [number, number, number] = [
        Math.cos(azimuth) * horizontal * radius * 31,
        vertical * radius * 11 + this.preset.altitude,
        Math.sin(azimuth) * horizontal * radius * 27,
      ];
      const tangent = normalize([-position[2] + (random() - 0.5) * 12, (random() - 0.5) * 0.28, position[0] + (random() - 0.5) * 12]);
      const speed = this.preset.minSpeed + random() * (this.preset.maxSpeed - this.preset.minSpeed) * 0.55;
      floats.set([position[0], position[1], position[2], speed, tangent[0], tangent[1], tangent[2], 0, 0, 0, 0, random()], base);
      integers[base + 12] = i; integers[base + 13] = state; integers[base + 14] = 0; integers[base + 15] = 0;
    }
    this.queue.writeBuffer(this.agents[0], 0, data);
    this.queue.writeBuffer(this.agents[1], 0, data);
    this.source = 0; this.frameIndex = 0; this.simulationTime = 0; this.accumulator = 0;
    this.stats.centroid = [0, 0, 0]; this.targetCentroid = [0, 0, 0];
  }

  setAgentCount(count: number, seed: number): void {
    this.agentCount = Math.max(512, Math.min(MAX_AGENTS, Math.round(count)));
    this.reset(seed);
  }

  setPreset(preset: MurmurationPreset, seed: number): void {
    this.preset = preset;
    this.reset(seed);
  }

  setTool(mode: ToolMode): void {
    this.tool.mode = mode;
    if (mode === "orbit") this.tool.active = false;
  }

  setToolPoint(position: [number, number, number], active: boolean, direction?: [number, number, number]): void {
    this.tool.position = position; this.tool.active = active;
    if (direction) this.tool.direction = direction;
  }

  setToolRadius(radius: number): void { this.tool.radius = radius; }
  setToolStrength(strength: number): void { this.tool.strength = strength; }
  stepOnce(): void { this.requestedSteps += 1; }

  frame(now: number): void {
    const cpuStart = performance.now();
    this.resize();
    const elapsed = Math.min(0.05, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    const fixedDt = 1 / 120;
    this.accumulator = Math.min(this.accumulator + elapsed, fixedDt * 2);
    const encoder = this.device.createCommandEncoder({ label: "murmuration-frame" });
    let steps = 0;
    if (this.paused && this.requestedSteps > 0) {
      this.writeParams(fixedDt);
      this.encodeStep(encoder);
      this.simulationTime += fixedDt;
      this.frameIndex += 1;
      this.requestedSteps -= 1;
    } else if (!this.paused) {
      while (this.accumulator >= fixedDt && steps < 2) {
        this.writeParams(fixedDt);
        this.encodeStep(encoder);
        this.accumulator -= fixedDt;
        this.simulationTime += fixedDt;
        this.frameIndex += 1;
        steps += 1;
      }
    }
    const shouldMeasure = this.frameIndex % 20 === 0 && !this.readbackPending[this.statsReadback];
    if (shouldMeasure) this.encodeStats(encoder, this.statsReadback);
    this.writeRenderUniform();
    this.encodeRender(encoder);
    this.queue.submit([encoder.finish()]);
    if (shouldMeasure) this.beginStatsReadback(this.statsReadback);
    this.targetCentroid = this.stats.centroid;
    if (this.cameraMode === "director") this.camera.yaw += elapsed * 0.075;
    this.cpuFrameSamples.push(performance.now() - cpuStart);
    if (this.cpuFrameSamples.length > 180) this.cpuFrameSamples.shift();
    if (this.cpuFrameSamples.length % 15 === 0) {
      const sorted = [...this.cpuFrameSamples].sort((a, b) => a - b);
      this.cpuFrameP50 = sorted[Math.floor((sorted.length - 1) * 0.5)]!;
      this.cpuFrameP95 = sorted[Math.floor((sorted.length - 1) * 0.95)]!;
    }
  }

  screenToFlockPlane(clientX: number, clientY: number): [number, number, number] {
    const rect = this.canvas.getBoundingClientRect();
    const nx = (clientX - rect.left) / rect.width * 2 - 1;
    const ny = 1 - (clientY - rect.top) / rect.height * 2;
    const yaw = this.camera.yaw;
    const right: [number, number, number] = [Math.cos(yaw), 0, -Math.sin(yaw)];
    return [
      this.stats.centroid[0] + right[0] * nx * 42,
      this.stats.centroid[1] + ny * 24,
      this.stats.centroid[2] + right[2] * nx * 42,
    ];
  }

  private writeParams(dt: number): void {
    const data = new ArrayBuffer(PARAM_BYTES);
    const f = new Float32Array(data);
    const u = new Uint32Array(data);
    u.set([this.agentCount, CELL_COUNT, GRID.nx, GRID.ny, GRID.nz, this.tool.active ? this.toolCode() : 0, this.preset.id, this.frameIndex], 0);
    f.set([-72, -36, -72, 0, GRID.cellSize, 1 / GRID.cellSize, 0, 0], 8);
    f.set([this.preset.separation, this.preset.alignment, this.preset.cohesion, this.preset.roost], 16);
    f.set([this.preset.minSpeed, this.preset.maxSpeed, this.preset.maxTurn, dt], 20);
    f.set([this.preset.hardRadius, this.preset.socialRadius, this.preset.blindCosine, this.preset.noise], 24);
    f.set([this.tool.position[0], this.tool.position[1], this.tool.position[2], this.tool.radius], 28);
    f.set([this.tool.direction[0], this.tool.direction[1], this.tool.direction[2], this.tool.strength], 32);
    f.set([this.preset.radii[0], this.preset.radii[1], this.preset.radii[2], this.preset.altitude], 36);
    f.set([this.simulationTime, 7.5, 0.72, 0], 40);
    this.queue.writeBuffer(this.params, 0, data);
  }

  private toolCode(): number {
    return ({ orbit: 0, attract: 1, repel: 2, falcon: 3, gust: 4 } as const)[this.tool.mode];
  }

  private encodeStep(encoder: GPUCommandEncoder): void {
    const grid = encoder.beginComputePass({ label: "grid-build" });
    grid.setBindGroup(0, this.gridGroups[this.source]);
    grid.setPipeline(this.gridPipelines.clear); grid.dispatchWorkgroups(Math.ceil(CELL_COUNT / 256));
    grid.setPipeline(this.gridPipelines.histogram); grid.dispatchWorkgroups(Math.ceil(this.agentCount / 256));
    grid.setPipeline(this.gridPipelines.scan); grid.dispatchWorkgroups(1);
    grid.setPipeline(this.gridPipelines.scatter); grid.dispatchWorkgroups(Math.ceil(this.agentCount / 256));
    grid.end();
    const simulation = encoder.beginComputePass({ label: "topological-flocking" });
    simulation.setPipeline(this.stepPipeline); simulation.setBindGroup(0, this.stepGroups[this.source]);
    simulation.dispatchWorkgroups(Math.ceil(this.agentCount / 128)); simulation.end();
    this.source = 1 - this.source;
  }

  private encodeStats(encoder: GPUCommandEncoder, stagingIndex: number): void {
    this.queue.writeBuffer(this.statsParams, 0, new Uint32Array([this.agentCount, 0, 0, 0]));
    const pass = encoder.beginComputePass({ label: "compact-diagnostics" });
    pass.setBindGroup(0, this.statsGroups[this.source]);
    pass.setPipeline(this.statsPipelines[0]); pass.dispatchWorkgroups(1);
    pass.setPipeline(this.statsPipelines[1]); pass.dispatchWorkgroups(1);
    pass.end();
    encoder.copyBufferToBuffer(this.statsBuffer, 0, this.staging[stagingIndex], 0, STATS_BYTES);
    this.readbackPending[stagingIndex] = true;
  }

  private beginStatsReadback(index: number): void {
    const buffer = this.staging[index];
    void buffer.mapAsync(GPUMapMode.READ).then(() => {
      const values = new Float32Array(buffer.getMappedRange().slice(0));
      buffer.unmap();
      if (values.every(Number.isFinite)) {
        this.stats = {
          centroid: [values[0]!, values[1]!, values[2]!], meanHeading: [values[8]!, values[9]!, values[10]!], polarization: values[3]!,
          meanSpeed: values[4]!, alertFraction: values[5]!, meanNeighbors: values[6]!, rmsRoll: Math.sqrt(Math.max(0, values[7]!)),
          milling: values[12]!, radius: values[13]!, verticalSpread: values[14]!,
        };
      }
      this.readbackPending[index] = false;
      this.statsReadback = 1 - index;
    }).catch(() => { this.readbackPending[index] = false; });
  }

  private writeRenderUniform(): void {
    const centroid = this.targetCentroid;
    const cp = Math.cos(this.camera.pitch); const sp = Math.sin(this.camera.pitch);
    const sy = Math.sin(this.camera.yaw); const cy = Math.cos(this.camera.yaw);
    let eye: [number, number, number] = [
      centroid[0] + sy * cp * this.camera.distance,
      centroid[1] + sp * this.camera.distance,
      centroid[2] + cy * cp * this.camera.distance,
    ];
    let target: [number, number, number] = [...centroid];
    if (this.cameraMode === "chase") {
      const direction = normalize(this.stats.meanHeading);
      const chaseDistance = Math.max(this.camera.distance * 1.05, this.stats.radius * 2.1);
      eye = [centroid[0] - direction[0] * chaseDistance, centroid[1] + chaseDistance * 0.16, centroid[2] - direction[2] * chaseDistance];
      target = [centroid[0] + direction[0] * 12, centroid[1] + direction[1] * 12, centroid[2] + direction[2] * 12];
    }
    const view = lookAt(eye, target);
    const projection = perspective(48 * Math.PI / 180, this.canvas.width / this.canvas.height, 0.2, 450);
    const viewProjection = multiply(projection, view);
    const packed = new Float32Array(RENDER_BYTES / 4);
    packed.set(viewProjection, 0); packed.set([eye[0], eye[1], eye[2], 1], 16);
    packed.set([0.42, -0.72, 0.55, 0], 20);
    packed.set([this.simulationTime, 0.75, this.colorCode(), 1.15], 24);
    this.queue.writeBuffer(this.renderUniform, 0, packed);
  }

  private colorCode(): number {
    return ({ natural: 0, heading: 1, speed: 2, alert: 3 } as const)[this.colorMode];
  }

  private encodeRender(encoder: GPUCommandEncoder): void {
    const pass = encoder.beginRenderPass({
      colorAttachments: [{ view: this.context.getCurrentTexture().createView(), clearValue: { r: 0.006, g: 0.01, b: 0.025, a: 1 }, loadOp: "clear", storeOp: "store" }],
      depthStencilAttachment: { view: this.depth.createView(), depthClearValue: 1, depthLoadOp: "clear", depthStoreOp: "discard" },
    });
    pass.setPipeline(this.skyPipeline); pass.setBindGroup(0, this.skyGroup); pass.draw(3);
    pass.setPipeline(this.birdPipeline); pass.setBindGroup(0, this.renderGroups[this.source]); pass.draw(this.agentCount * 24);
    pass.end();
  }

  private resize(): void {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(this.canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(this.canvas.clientHeight * ratio));
    if (width === this.canvas.width && height === this.canvas.height) return;
    this.canvas.width = width; this.canvas.height = height;
    this.depth.destroy();
    this.depth = this.device.createTexture({ size: [width, height], format: "depth24plus", usage: GPUTextureUsage.RENDER_ATTACHMENT });
  }
}
