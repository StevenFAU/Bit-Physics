import { field } from "../../../../common/common-web/src/capture-export";
import type {
  CaptureBundle,
  CaptureStepDescriptor,
} from "../../../../common/common-web/src/capture-export";
import { CanyonGpu, budget } from "./solver";
import { initial } from "./scenes";
export async function canonical(device: GPUDevice): Promise<CaptureBundle> {
  const start = performance.now(),
    n = 32;
  const checkpoints = [0, 20, 100];
  const steps: CaptureStepDescriptor[] = checkpoints.map((step) => ({
    step,
    state: {},
    diagnostics: {},
  }));
  for (const name of ["lake", "dam", "settling", "channel"]) {
    const gpu = new CanyonGpu(device, n, {
      dx: 1,
      maxdt: 0.01,
      erosion: name === "channel" ? 1 : 0,
      settling: name === "settling" ? 0.1 : 0,
      friction: 0.01,
      boundary: 0,
      source: [0, 0, 1, 0],
    });
    try {
      const state = initial(n, name);
      if (name === "channel")
        for (let i = 0; i < state.length; i += 16) state[i + 2] = state[i] * 2;
      gpu.upload(state);
      let at = 0;
      for (let j = 0; j < checkpoints.length; j++) {
        while (at < checkpoints[j]) {
          const count = Math.min(20, checkpoints[j] - at);
          gpu.step(count, false);
          at += count;
          await device.queue.onSubmittedWorkDone();
        }
        const data = await gpu.read();
        steps[j].state[name] = field(data, [n, n, 16], "f32");
        const b = budget(data, 1);
        steps[j].diagnostics[`${name}_water`] = b.water;
        steps[j].diagnostics[`${name}_solid`] = b.solid;
        steps[j].diagnostics[`${name}_finite`] = +b.finite;
      }
    } finally {
      gpu.destroy();
    }
  }
  return {
    manifest: {
      schema_version: "1.0.0",
      sim: {
        name: "terrain-erosion",
        category: "geomorphology",
        variant: "hydrostatic-hll-sediment",
      },
      stack: {
        name: "webgpu-f32",
        version: "0.0.1",
        build_id: "canyon-lab-v1",
      },
      config: {
        tier: "test",
        dims: [n, n],
        dtype: "f32",
        seed: 4102,
        params: {
          dt: 0.01,
          dx: 1,
          fixtures: ["lake", "dam", "settling", "channel"],
        },
      },
      run: {
        step_count: 100,
        capture_interval: 20,
        wall_clock_seconds: (performance.now() - start) / 1000,
        start_utc: new Date().toISOString(),
      },
      payload: {
        format: "hdf5",
        path: "terrain-erosion-canonical.h5",
        checksum: "sha256:" + "0".repeat(64),
      },
      determinism: {
        claimed: "bit-exact-same-hw",
        atomic_ops: true,
        subgroup_ops: false,
      },
    },
    steps,
  };
}
export async function prove(device: GPUDevice): Promise<string> {
  const bundle = await canonical(device);
  const first = bundle.steps[0],
    last = bundle.steps[2];
  const rows: string[] = [];
  for (const name of ["lake", "dam", "settling", "channel"]) {
    const a = first.state[name].data,
      b = last.state[name].data;
    let error = 0,
      water0 = 0,
      water1 = 0,
      solid0 = 0,
      solid1 = 0;
    for (let i = 0; i < a.length; i += 16) {
      water0 += a[i];
      water1 += b[i];
      solid0 += -a[i + 5] + a[i + 6] + a[i + 3];
      solid1 += -b[i + 5] + b[i + 6] + b[i + 3];
      if (name === "lake")
        for (let k = 0; k < 4; k++)
          error = Math.max(error, Math.abs(a[i + k] - b[i + k]));
      if (name === "settling")
        error = Math.max(error, Math.abs(b[i + 3] - 0.01 * Math.exp(-0.1)));
    }
    const balance = Math.max(
      Math.abs(water1 - water0) / Math.max(water0, 1),
      Math.abs(solid1 - solid0) / Math.max(Math.abs(solid0), 1),
    );
    const pass = Number.isFinite(balance) && balance < 2e-4 && error < 2e-4;
    rows.push(
      `${pass ? "PASS" : "FAIL"} ${name}\n  budget ${balance.toExponential(2)}${error ? ` · analytic ${error.toExponential(2)}` : ""}`,
    );
  }
  for (const negative of [1, 2]) {
    const name = negative === 1 ? "lake" : "channel";
    const gpu = new CanyonGpu(device, 32, {
      dx: 1,
      maxdt: 0.01,
      erosion: negative === 2 ? 1 : 0,
      settling: 0,
      friction: 0.01,
      boundary: 0,
      source: [0, 0, 1, 0],
      negative,
    });
    try {
      const s = initial(32, name);
      if (negative === 2)
        for (let i = 0; i < s.length; i += 16) s[i + 2] = s[i] * 2;
      gpu.upload(s);
      gpu.step(20, false);
      const b = await gpu.read();
      let defect = 0;
      for (let i = 0; i < s.length; i += 16)
        defect +=
          negative === 1
            ? Math.abs(b[i + 1]) + Math.abs(b[i + 2])
            : -b[i + 5] + b[i + 6] + b[i + 3];
      rows.push(
        `${Math.abs(defect) > 1e-4 ? "DETECTED" : "FAIL"} ${negative === 1 ? "missing bed force" : "missing sediment credit"}\n  defect ${Math.abs(defect).toExponential(2)}`,
      );
    } finally {
      gpu.destroy();
    }
  }
  return rows.join("\n\n");
}
