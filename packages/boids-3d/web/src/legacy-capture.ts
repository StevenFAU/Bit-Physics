import {
  exposeCapture,
  field,
  resetCapture,
} from "../../../../common/common-web/src/capture-export.js";
import type { CaptureStepDescriptor } from "../../../../common/common-web/src/capture-export.js";
import type { PanelShell } from "../../../../common/common-web/src/panel-shell.js";

import computeWgsl from "../../src/boids.wgsl?raw";

const N = 1000;
const STEPS = 1000;
const CAPTURE_INTERVAL = 100;
const PARAMS = {
  perception: 5,
  v_max: 3,
  w_sep: 1.5,
  w_align: 1,
  w_cohere: 1,
  dt: 0.05,
};

async function fetchInitialConditions(): Promise<{
  positions: Float32Array;
  velocities: Float32Array;
}> {
  const response = await fetch(`${import.meta.env.BASE_URL}boids-ic-seed42.bin`);
  if (!response.ok) throw new Error(`legacy IC fetch failed: ${response.status}`);
  const all = new Float32Array(await response.arrayBuffer());
  return {
    positions: all.slice(0, N * 3),
    velocities: all.slice(N * 3),
  };
}

export async function captureLegacyCanonical(
  device: GPUDevice,
  panel: PanelShell,
): Promise<void> {
  panel.setStatus("legacy canonical — 1,000 steps…");
  panel.setCaptureEnabled(false);
  resetCapture();

  const usage = GPUBufferUsage;
  const bytes = N * 3 * 4;
  const makeState = (): GPUBuffer =>
    device.createBuffer({
      size: bytes,
      usage: usage.STORAGE | usage.COPY_DST | usage.COPY_SRC,
    });
  const positions = [makeState(), makeState()];
  const velocities = [makeState(), makeState()];
  const staging = device.createBuffer({
    size: bytes,
    usage: usage.COPY_DST | usage.MAP_READ,
  });
  const params = device.createBuffer({
    size: 32,
    usage: usage.UNIFORM | usage.COPY_DST,
  });
  const packed = new ArrayBuffer(32);
  const view = new DataView(packed);
  view.setUint32(0, N, true);
  view.setFloat32(4, PARAMS.perception, true);
  view.setFloat32(8, PARAMS.v_max, true);
  view.setFloat32(12, PARAMS.w_sep, true);
  view.setFloat32(16, PARAMS.w_align, true);
  view.setFloat32(20, PARAMS.w_cohere, true);
  view.setFloat32(24, PARAMS.dt, true);
  device.queue.writeBuffer(params, 0, packed);

  const module = device.createShaderModule({ code: computeWgsl, label: "legacy-boids" });
  const layout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
    ],
  });
  const pipeline = await device.createComputePipelineAsync({
    layout: device.createPipelineLayout({ bindGroupLayouts: [layout] }),
    compute: { module, entryPoint: "main" },
  });
  const bindGroups = [0, 1].map((source) =>
    device.createBindGroup({
      layout,
      entries: [
        { binding: 0, resource: { buffer: params } },
        { binding: 1, resource: { buffer: positions[source]! } },
        { binding: 2, resource: { buffer: velocities[source]! } },
        { binding: 3, resource: { buffer: positions[1 - source]! } },
        { binding: 4, resource: { buffer: velocities[1 - source]! } },
      ],
    }),
  );
  const initial = await fetchInitialConditions();
  device.queue.writeBuffer(positions[0]!, 0, initial.positions);
  device.queue.writeBuffer(velocities[0]!, 0, initial.velocities);
  let source = 0;

  const read = async (buffer: GPUBuffer): Promise<Float32Array> => {
    const encoder = device.createCommandEncoder();
    encoder.copyBufferToBuffer(buffer, 0, staging, 0, bytes);
    device.queue.submit([encoder.finish()]);
    await staging.mapAsync(GPUMapMode.READ);
    const result = new Float32Array(staging.getMappedRange().slice(0));
    staging.unmap();
    return result;
  };
  const rows: CaptureStepDescriptor[] = [];
  const record = async (step: number): Promise<void> => {
    const position = await read(positions[source]!);
    const velocity = await read(velocities[source]!);
    let max = 0;
    let sum = 0;
    for (let i = 0; i < N; i += 1) {
      const speed = Math.hypot(
        velocity[i * 3]!,
        velocity[i * 3 + 1]!,
        velocity[i * 3 + 2]!,
      );
      max = Math.max(max, speed);
      sum += speed;
    }
    rows.push({
      step,
      state: {
        position: field(new Float64Array(position), [N, 3], "f64"),
        velocity: field(new Float64Array(velocity), [N, 3], "f64"),
      },
      diagnostics: { max_speed: max, mean_speed: sum / N },
    });
  };

  await record(0);
  for (let step = 1; step <= STEPS; step += 1) {
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroups[source]!);
    pass.dispatchWorkgroups(Math.ceil(N / 64));
    pass.end();
    device.queue.submit([encoder.finish()]);
    source = 1 - source;
    if (step % CAPTURE_INTERVAL === 0) await record(step);
  }

  exposeCapture(
    {
      manifest: {
        schema_version: "1.0.0",
        sim: { name: "boids-3d", category: "agent-based", variant: "reynolds-1987-canonical" },
        stack: { name: "webgpu", version: "0.0.1", build_id: "web-build-5.x" },
        config: {
          tier: "test",
          dims: [N, 3],
          dtype: "f64",
          seed: 42,
          params: {
            ...PARAMS,
            n_agents: N,
            perception_radius: PARAMS.perception,
            ic_jitter_scale: 1e-6,
          },
        },
        run: {
          step_count: STEPS,
          capture_interval: CAPTURE_INTERVAL,
          wall_clock_seconds: 0,
          start_utc: "2026-05-20T00:00:00Z",
        },
        payload: {
          format: "hdf5",
          path: "flock-1000agents-seed42-step1000.h5",
          checksum: `sha256:${"0".repeat(64)}`,
        },
        determinism: { claimed: "epsilon", atomic_ops: false, subgroup_ops: false },
      },
      steps: rows,
    },
    { download: false },
  );

  for (const buffer of [...positions, ...velocities, staging, params]) buffer.destroy();
  panel.setStatus(`legacy capture ready — ${rows.length} frames`);
  panel.setCaptureEnabled(true);
}
