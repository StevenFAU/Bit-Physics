// main.ts — MPM multi-material web demo (Stack-B, Phase-6 verification-demo).
// Four layers: INTERACT (material playground: presets-as-data, multitouch
// impulses, tilt), EXPLAIN (equation → committed code), PROVE (the gate,
// live), RENDER (per-material shading + density-grid shadows).
//
// Driver contract: window.__bitPhysicsReady after boot; the capture button
// replays the committed canonical and exposes the gate bundle
// (window.__bitPhysicsCapture) for tools/productization/web-deploy.

import "../../../../common/common-web/src/theme.css";
import { createContext } from "../../../../common/common-ts/src/context.js";
import { createSettingsPanel } from "../../../../common/common-web/src/panel-shell.js";
import {
  exposeCapture,
  field,
  isCapturing,
  runCaptureExclusive,
  type CaptureManifestLike,
  type CaptureStepDescriptor,
} from "../../../../common/common-web/src/capture-export.js";
import V from "./generated/verification.json";
import { FP_SCALE_DEFAULT, MpmGpu, type MaterialDef, type PointerImpulse } from "./solver.js";
import { Renderer, screenToWorld, type CameraState, type RenderSettings } from "./render.js";
import {
  seedScene,
  toMaterialDef,
  waveSpeed,
  type MaterialSpec,
  type PresetSpecData,
} from "./presets.js";
import {
  CANON,
  checkpointErrors,
  computeGateArtifacts,
  fetchIC,
  fetchRefs,
  runCanonicalReplay,
} from "./gate.js";
import { installVerifyPanel } from "./verify-panel.js";
import { installExplainPanel } from "./explain.js";

const canvas = document.getElementById("view") as HTMLCanvasElement;
const bootEl = document.getElementById("boot") as HTMLDivElement;

const MATERIALS = V.materials as unknown as MaterialSpec[];
const PRESETS = V.presets as unknown as PresetSpecData[];

const url = new URLSearchParams(location.search);
const HARNESS = url.has("harness");

interface LiveState {
  preset: PresetSpecData;
  budget: number;
  eScale: number; // global stiffness multiplier (live-loop only)
  speed: number; // frameAdvance multiplier
  tiltDeg: number;
  count: number;
  massUnit: number;
  substeps: number;
  dt: number;
  materialsUsed: Set<number>;
}

async function boot(): Promise<void> {
  bootEl.textContent = "initializing WebGPU…";
  const ctx = await createContext();
  const { device } = ctx;
  device.addEventListener("uncapturederror", (e) => {
    console.error("WebGPU uncaptured:", (e as GPUUncapturedErrorEvent).error.message);
  });
  bootEl.textContent = "building pipelines…";

  const gpu = new MpmGpu(device, 262_144, 64);
  const renderer = new Renderer(device, canvas, gpu);
  renderer.setColors(MATERIALS.map((m) => m.color));

  const startPresetId = url.get("preset") ?? "showcase";
  const live: LiveState = {
    preset: PRESETS.find((p) => p.id === startPresetId) ?? PRESETS[0],
    budget: Number(url.get("budget")) || 0,
    eScale: Number(url.get("stiff")) || 1,
    speed: Number(url.get("speed")) || 1,
    tiltDeg: Number(url.get("tilt")) || 0,
    count: 0,
    massUnit: 1,
    substeps: 1,
    dt: 1e-3,
    materialsUsed: new Set(),
  };

  const cam: CameraState = { yaw: 0.85, pitch: 0.42, dist: 2.1, center: [0.5, 0.5, 0.35] };
  const rset: RenderSettings = {
    particleScale: 1.15,
    shadowKappa: Number(url.get("shadow")) || 0.5,
    sparkle: 0.65,
    ambient: 0.35,
    debugMode: 0,
    colors: MATERIALS.map((m) => m.color),
  };

  let frame = 0;
  let exclusiveDepth = 0;
  let suspended = false;
  let probed = false;
  const frameMs: number[] = [];

  async function withExclusive<T>(fn: () => Promise<T>): Promise<T> {
    exclusiveDepth += 1;
    try {
      return await fn();
    } finally {
      exclusiveDepth -= 1;
    }
  }

  function liveMaterialDefs(): MaterialDef[] {
    return MATERIALS.map((m) => toMaterialDef(m, live.eScale));
  }

  function gravity(): [number, number, number] {
    const a = (live.tiltDeg * Math.PI) / 180;
    return [9.81 * Math.sin(a), 0, -9.81 * Math.cos(a)];
  }

  function applyPreset(preset: PresetSpecData, keepCamera = false): void {
    live.preset = preset;
    const budget = live.budget > 0 ? live.budget : preset.budget;
    const scene = seedScene(preset, MATERIALS, budget);
    live.count = scene.count;
    live.massUnit = scene.massUnit;
    live.materialsUsed = scene.materialsUsed;
    // Auto-dt from the stiffest ACTIVE material's wave speed (CFL 0.3),
    // substeps from the per-frame time advance — "cut substeps, not
    // particles" is the perf lever (spec § 3.3).
    const dx = 1 / preset.gridN;
    let cMax = 1;
    for (const mi of scene.materialsUsed) {
      cMax = Math.max(cMax, waveSpeed(MATERIALS[mi], live.eScale));
    }
    const dtStable = (0.3 * dx) / cMax;
    const advance = preset.frameAdvance * live.speed;
    live.substeps = Math.min(30, Math.max(1, Math.ceil(advance / dtStable)));
    live.dt = advance / live.substeps;
    gpu.configure({
      gridN: preset.gridN,
      nParticles: scene.count,
      dt: live.dt,
      gravity: gravity(),
      floorZ: preset.floorZ,
      fpScale: FP_SCALE_DEFAULT,
      invMassUnit: 1 / scene.massUnit,
      vmaxClamp: (0.4 * dx) / live.dt,
      frame,
      nPointers: 0,
    });
    gpu.setMaterials(liveMaterialDefs());
    gpu.setPointers([]);
    gpu.uploadParticles(scene.data, scene.count);
    if (!keepCamera) {
      cam.yaw = preset.camera.yaw;
      cam.pitch = preset.camera.pitch;
      cam.dist = preset.camera.dist;
    }
  }

  function restoreLive(): void {
    applyPreset(live.preset, true);
  }

  // ---- panel -----------------------------------------------------------------
  const panel = createSettingsPanel("MPM Multi-Material — MLS-MPM", {
    caption:
      "Snow, sand, jelly and water in ONE grid solve — golden-verified " +
      "B-spline, deterministic fixed-point P2G, live per-material proofs.",
    initial: { tier: "test", seed: 42 },
    onCapture: () => captureCanonical(),
    presets: PRESETS.map((p) => ({
      label: p.label,
      title: p.title,
      apply: () => {
        live.budget = 0;
        applyPreset(p);
        syncUrl();
      },
    })),
    modes: {
      initial: "play",
      onMode: (m) => {
        suspended = m === "study";
      },
    },
    study: {
      diagnostics: [],
      honesty: {
        faithful:
          "quadratic B-spline + APIC/MLS transfer + neo-Hookean (log_j guard included) " +
          "port the verified reference verbatim; the canonical replay matches the " +
          "committed capture pointwise at the established rel=1e-4",
        simplified:
          "snow (Stomakhin), sand (Klár), water (Tait) are reference-less additions — " +
          "each carries its own live invariant instead; fixed-point P2G is bit-identical " +
          "to a fixed-point oracle, not the f64 CPU reference; cross-device bit-exactness " +
          "not claimed",
        measured:
          V.measured.status === "recorded"
            ? `worst replay error ${String((V.measured as Record<string, unknown>).worst_ratio_pct ?? "?")}% of budget (see spec MEASURED block)`
            : "pending first harness recording",
      },
      verdict: {
        gate: "new_canonical — run the PROVE suite below",
        verdict: "not yet run",
        pass: false,
      },
      links: [
        {
          label: "spec",
          href: "https://github.com/StevenFAU/Bit-Physics/blob/main/packages/mpm-multimaterial/web/verification-demo-spec.md",
        },
        {
          label: "reference kernel",
          href: "https://github.com/StevenFAU/Bit-Physics/blob/main/packages/mpm-multimaterial/mpm_multimaterial/reference/mls_mpm.py",
        },
        {
          label: "golden table",
          href: "https://github.com/StevenFAU/Bit-Physics/blob/main/tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json",
        },
      ],
    },
  });

  const simGroup = panel.addGroup("simulation");
  const viewGroup = panel.addGroup("view");
  const proveGroup = panel.addGroup("prove — the gate, live");
  const explainGroup = panel.addGroup("explain — equation → code");

  function slider(
    parent: HTMLElement,
    label: string,
    min: number,
    max: number,
    step: number,
    value: number,
    onInput: (v: number) => void,
  ): HTMLInputElement {
    const rowEl = document.createElement("div");
    rowEl.className = "bps-row";
    const l = document.createElement("label");
    l.textContent = label;
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    input.addEventListener("input", () => onInput(Number(input.value)));
    rowEl.append(l, input);
    parent.appendChild(rowEl);
    return input;
  }

  function select(
    parent: HTMLElement,
    label: string,
    options: [string, string][],
    onChange: (v: string) => void,
  ): void {
    const rowEl = document.createElement("div");
    rowEl.className = "bps-row";
    const l = document.createElement("label");
    l.textContent = label;
    const sel = document.createElement("select");
    for (const [val, text] of options) {
      const o = document.createElement("option");
      o.value = val;
      o.textContent = text;
      sel.appendChild(o);
    }
    sel.addEventListener("change", () => onChange(sel.value));
    rowEl.append(l, sel);
    parent.appendChild(rowEl);
  }

  slider(simGroup, "particles (budget)", 8000, 200000, 1000, live.preset.budget, (v) => {
    live.budget = v;
    applyPreset(live.preset, true);
    syncUrl();
  });
  slider(simGroup, "sim speed", 0.2, 2.5, 0.05, live.speed, (v) => {
    live.speed = v;
    applyPreset(live.preset, true);
    syncUrl();
  });
  slider(simGroup, "stiffness ×", 0.25, 4, 0.05, live.eScale, (v) => {
    live.eScale = v;
    applyPreset(live.preset, true);
    syncUrl();
  });
  slider(simGroup, "gravity tilt °", -35, 35, 1, live.tiltDeg, (v) => {
    live.tiltDeg = v;
    gpu.configure({ ...gpu.config, gravity: gravity() });
    syncUrl();
  });

  select(
    viewGroup,
    "color by",
    [
      ["0", "material"],
      ["1", "speed"],
      ["2", "volume J (det F)"],
      ["3", "shadow factor"],
      ["4", "plastic Jp"],
    ],
    (v) => {
      rset.debugMode = Number(v);
    },
  );
  slider(viewGroup, "particle size", 0.5, 2.2, 0.05, rset.particleScale, (v) => {
    rset.particleScale = v;
  });
  slider(viewGroup, "shadow strength", 0, 1.5, 0.05, rset.shadowKappa, (v) => {
    rset.shadowKappa = v;
  });
  slider(viewGroup, "snow sparkle", 0, 1.5, 0.05, rset.sparkle, (v) => {
    rset.sparkle = v;
  });

  const shareBtn = document.createElement("button");
  shareBtn.type = "button";
  shareBtn.className = "bps-btn";
  shareBtn.textContent = "copy share link";
  shareBtn.addEventListener("click", () => {
    syncUrl();
    void navigator.clipboard
      .writeText(location.href)
      .then(() => panel.setStatus("share link copied"))
      .catch(() => panel.setStatus(location.href));
  });
  viewGroup.appendChild(shareBtn);

  function syncUrl(): void {
    const q = new URLSearchParams();
    q.set("preset", live.preset.id);
    if (live.budget > 0) q.set("budget", String(live.budget));
    if (live.eScale !== 1) q.set("stiff", String(live.eScale));
    if (live.speed !== 1) q.set("speed", String(live.speed));
    if (live.tiltDeg !== 0) q.set("tilt", String(live.tiltDeg));
    history.replaceState(null, "", `?${q.toString()}`);
  }

  installExplainPanel(explainGroup);
  const verify = installVerifyPanel({
    gpu,
    container: proveGroup,
    liveMaterials: () => liveMaterialDefs(),
    fetchIC,
    fetchRefs,
    computeGateArtifacts,
    runCanonicalReplay,
    checkpointErrors,
    withExclusive,
    afterGpuUse: restoreLive,
    setVerdict: (v) => panel.setVerdict(v),
    setStatus: (s) => panel.setStatus(s),
  });

  // ---- interaction (multitouch impulses + orbit + pinch) ----------------------
  interface ActivePointer {
    x: number;
    y: number;
    world: [number, number, number];
    prevWorld: [number, number, number];
  }
  const pointers = new Map<number, ActivePointer>();
  let orbiting = false;
  let pinchDist = 0;

  function canvasUV(e: PointerEvent): [number, number] {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  }

  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    const [u, v] = canvasUV(e);
    const w = screenToWorld(cam, u, v, cam.center);
    orbiting = e.button === 2 || e.ctrlKey || e.shiftKey;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, world: w, prevWorld: w });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
    }
    e.preventDefault();
  });
  canvas.addEventListener("pointermove", (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dxPx = e.clientX - p.x;
    const dyPx = e.clientY - p.y;
    if (pointers.size === 2) {
      // pinch zoom + two-finger orbit
      p.x = e.clientX;
      p.y = e.clientY;
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist > 0) cam.dist = Math.min(4, Math.max(0.8, cam.dist * (pinchDist / Math.max(d, 1))));
      pinchDist = d;
      cam.yaw -= dxPx * 0.003;
      return;
    }
    if (orbiting) {
      cam.yaw -= dxPx * 0.008;
      cam.pitch = Math.min(1.4, Math.max(-0.2, cam.pitch + dyPx * 0.006));
    } else {
      const [u, v] = canvasUV(e);
      p.prevWorld = p.world;
      p.world = screenToWorld(cam, u, v, cam.center);
    }
    p.x = e.clientX;
    p.y = e.clientY;
  });
  const endPointer = (e: PointerEvent): void => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchDist = 0;
    if (pointers.size === 0) orbiting = false;
  };
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener(
    "wheel",
    (e) => {
      cam.dist = Math.min(4, Math.max(0.8, cam.dist * (1 + e.deltaY * 0.001)));
      e.preventDefault();
    },
    { passive: false },
  );

  function pointerImpulses(): PointerImpulse[] {
    if (orbiting || pointers.size !== 1) return [];
    const out: PointerImpulse[] = [];
    for (const p of pointers.values()) {
      const vel: [number, number, number] = [
        (p.world[0] - p.prevWorld[0]) / Math.max(live.preset.frameAdvance, 1e-4),
        (p.world[1] - p.prevWorld[1]) / Math.max(live.preset.frameAdvance, 1e-4),
        (p.world[2] - p.prevWorld[2]) / Math.max(live.preset.frameAdvance, 1e-4),
      ];
      const speed = Math.hypot(vel[0], vel[1], vel[2]);
      const cap = 12;
      const s = speed > cap ? cap / speed : 1;
      out.push({
        pos: p.world,
        vel: [vel[0] * s, vel[1] * s, vel[2] * s],
        radius: 0.12,
        strength: 26,
      });
      p.prevWorld = p.world;
    }
    return out;
  }

  // ---- hiDPI ------------------------------------------------------------------
  function fitCanvas(): void {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const css = canvas.getBoundingClientRect();
    const w = Math.round(css.width * dpr);
    const h = Math.round(css.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }
  window.addEventListener("resize", fitCanvas);

  // ---- capture (the driver-facing gate bundle) ---------------------------------
  async function captureCanonical(): Promise<void> {
    panel.setStatus("gate capture: closed-form artifacts…");
    const t0 = performance.now();
    const arts = await computeGateArtifacts(gpu, liveMaterialDefs());
    panel.setStatus("gate capture: canonical replay…");
    const ic = await fetchIC();
    const cps = await runCanonicalReplay(gpu, ic, (s) =>
      panel.setStatus(`gate capture: replay step ${s}/50`),
    );
    const wall = (performance.now() - t0) / 1000;

    const snowMat = liveMaterialDefs()[1];
    const neoGpu9 = new Float32Array(16 * 9);
    for (let i = 0; i < 16; i += 1) {
      for (let k = 0; k < 9; k += 1) neoGpu9[i * 9 + k] = arts.neoGpuF32[i * 12 + k];
    }
    const steps: CaptureStepDescriptor[] = cps.map((cp, ci) => {
      const state: CaptureStepDescriptor["state"] = {
        position: field(cp.position, [CANON.n, 3], "f32"),
        velocity: field(cp.velocity, [CANON.n, 3], "f32"),
      };
      const diagnostics: Record<string, number> = {};
      if (ci === 0) {
        state.bspline_n_f64 = field(arts.bsplineF64, [arts.bsplineF64.length], "f64");
        state.bspline_n_f32 = field(arts.bsplineGpuF32, [arts.bsplineGpuF32.length], "f32");
        state.pou_f64 = field(arts.pouF64, [arts.pouF64.length], "f64");
        state.pou_f32 = field(arts.pouGpuF32, [arts.pouGpuF32.length], "f32");
        state.neo_stress_mirror_f64 = field(arts.neoMirrorF64, [16, 9], "f64");
        state.neo_stress_gpu_f32 = field(neoGpu9, [16, 9], "f32");
        state.snow_sigma_f64 = field(arts.snowSigma, [64, 3], "f64");
        state.sand_case = field(arts.sandCases, [64], "f32");
        state.sand_logdet_in_f64 = field(arts.sandLogdetIn, [64], "f64");
        state.sand_logdet_out_f64 = field(arts.sandLogdetOut, [64], "f64");
        diagnostics.mass_leak_quanta = arts.massLeakQuanta;
        diagnostics.mom_z_leak_quanta = arts.momZLeakQuanta;
        diagnostics.mass_total_quanta = arts.massTotalQuanta;
        diagnostics.max_cell_quanta = arts.maxCellQuanta;
        diagnostics.pou_gpu_sweep_max_dev = arts.pouGpuMaxDev;
        diagnostics.golden_f32_rel_dev = arts.goldenF32RelDev;
        diagnostics.sand_case2_ortho_dev = arts.sandCase2OrthoDev;
        diagnostics.theta_c = snowMat.thetaC;
        diagnostics.theta_s = snowMat.thetaS;
        diagnostics.headroom_ratio = arts.headroomRatio;
      } else {
        let maxSpeed = 0;
        for (let i = 0; i < CANON.n; i += 1) {
          maxSpeed = Math.max(
            maxSpeed,
            Math.hypot(
              cp.velocity[i * 3],
              cp.velocity[i * 3 + 1],
              cp.velocity[i * 3 + 2],
            ),
          );
        }
        diagnostics.max_speed = maxSpeed;
      }
      return { step: cp.step, state, diagnostics };
    });

    const manifest: CaptureManifestLike = {
      schema_version: "1.0.0",
      sim: {
        name: "mpm-multimaterial",
        category: "hybrid-pg",
        variant: "mls-mpm-hu-2018-multimaterial",
      },
      stack: { name: "webgpu", version: "0.0.1", build_id: "web-deploy-6.x" },
      config: {
        tier: "diagnostic",
        dims: [CANON.gridN, CANON.gridN, CANON.gridN],
        dtype: "f32",
        seed: 42,
        params: {
          descriptor: V.canonical.descriptor,
          n_particles: CANON.n,
          dt: CANON.dt,
          gravity_z: CANON.gravityZ,
          mu: CANON.mu,
          lam: CANON.lam,
          floor_z_index: CANON.floorZ,
          fp_scale: FP_SCALE_DEFAULT,
          mass_normalization:
            "particle masses normalized to 1 (mass_unit = 1/N); stress rescaled by 1/mass_unit — exact-arithmetic-equivalent",
          shape_function: "quadratic-b-spline-3-node",
          constitutive: "neo-hookean-single-material",
        },
      },
      run: {
        step_count: CANON.steps,
        capture_interval: CANON.interval,
        wall_clock_seconds: wall,
        start_utc: "1970-01-01T00:00:00Z",
      },
      payload: {
        format: "hdf5",
        path: "browser-reemit.h5",
        checksum: "sha256:" + "0".repeat(64),
      },
      determinism: {
        claimed: "bit-exact-same-hw",
        atomic_ops: true,
        subgroup_ops: false,
      },
    };
    exposeCapture({ manifest, steps }, { download: false });
    restoreLive();
    panel.setStatus("gate capture exposed (window.__bitPhysicsCapture)");
  }

  // ---- live loop ---------------------------------------------------------------
  applyPreset(live.preset);
  fitCanvas();

  let lastT = performance.now();
  function tick(): void {
    requestAnimationFrame(tick);
    const now = performance.now();
    const dtMs = now - lastT;
    lastT = now;
    if (isCapturing() || exclusiveDepth > 0) return;
    fitCanvas();
    if (!suspended && live.count > 0) {
      const imps = pointerImpulses();
      gpu.setPointers(imps);
      gpu.configure({ ...gpu.config, frame, nPointers: imps.length });
      gpu.step(live.substeps);
    }
    renderer.draw(cam, rset, live.preset.gridN, live.preset.floorZ, live.count, frame);
    frame += 1;

    frameMs.push(dtMs);
    if (frameMs.length > 40) frameMs.shift();
    if (frame % 20 === 0) {
      const avg = frameMs.reduce((a, c) => a + c, 0) / frameMs.length;
      panel.setDiagnostics([
        { label: "particles", value: String(live.count) },
        { label: "grid", value: `${live.preset.gridN}³` },
        { label: "substeps × dt", value: `${live.substeps} × ${live.dt.toExponential(1)}` },
        { label: "frame ms", value: avg.toFixed(1) },
        {
          label: "solver GPU ms",
          value: gpu.lastSolverMs === null ? "n/a (no timestamp-query)" : gpu.lastSolverMs.toFixed(2),
        },
        { label: "fixed-point M", value: FP_SCALE_DEFAULT.toExponential(0) },
      ]);
    }
    // One-shot adaptive-N probe (downgrade-only, spec § 3.3 targets).
    if (!probed && frame === 150) {
      probed = true;
      const avg = frameMs.reduce((a, c) => a + c, 0) / frameMs.length;
      if (avg > 34 && live.count > 16000) {
        live.budget = Math.max(12000, Math.floor(live.count / 2));
        applyPreset(live.preset, true);
        panel.setStatus(`adaptive-N: reduced to ${live.budget} for framerate`);
      }
    }
  }
  requestAnimationFrame(tick);
  bootEl.textContent = "";

  // ---- harness mode (?harness — the step-2 checkpoint runner) -------------------
  if (HARNESS) {
    void withExclusive(async () => {
      const out: Record<string, unknown> = {};
      try {
        const arts = await computeGateArtifacts(gpu, liveMaterialDefs());
        out.golden_f64_dev = arts.goldenF64Dev;
        out.golden_f32_rel_dev = arts.goldenF32RelDev;
        out.pou_f64_dev = arts.pouF64Dev;
        out.pou_gpu_sweep_max_dev = arts.pouGpuMaxDev;
        out.neo_mirror_max_abs = arts.neoMirrorMaxAbs;
        out.neo_gpu_max_rel = arts.neoGpuMaxRel;
        out.mass_leak_quanta = arts.massLeakQuanta;
        out.mass_leak_bound = arts.massLeakBoundQuanta;
        out.mom_z_leak_quanta = arts.momZLeakQuanta;
        out.max_cell_quanta = arts.maxCellQuanta;
        out.headroom_ratio = arts.headroomRatio;
        out.snow_sigma_min = arts.snowSigmaMin;
        out.snow_sigma_max = arts.snowSigmaMax;
        out.snow_ok = arts.snowOk;
        out.sand_case3_max_dev = arts.sandCase3MaxDev;
        out.sand_case2_ortho_dev = arts.sandCase2OrthoDev;
        out.sand_cases = Array.from(new Set(Array.from(arts.sandCases))).sort();
        out.sand_ok = arts.sandOk;

        const [ic, refs] = await Promise.all([fetchIC(), fetchRefs()]);
        const r1 = await runCanonicalReplay(gpu, ic);
        const r2 = await runCanonicalReplay(gpu, ic);
        const errs = checkpointErrors(r1, refs);
        out.worst_ratio_of_budget = errs.worstRatio;
        out.worst_pos_abs = errs.worst.position;
        out.worst_vel_abs = errs.worst.velocity;
        out.per_checkpoint = errs.rows;
        out.run_twice_identical = r1.every((cp, ci) => {
          const b = r2[ci].raw;
          const a = cp.raw;
          if (a.length !== b.length) return false;
          for (let i = 0; i < a.length; i += 1) {
            if (a[i] !== b[i] && !(Number.isNaN(a[i]) && Number.isNaN(b[i]))) return false;
          }
          return true;
        });

        // perf probe: showcase preset at rising budgets (GPU-inclusive timing)
        const perf: Record<string, number> = {};
        for (const budget of [20000, 60000, 120000]) {
          live.budget = budget;
          applyPreset(PRESETS[0], true);
          gpu.step(live.substeps); // warm-up
          await gpu.onFlush();
          const t0 = performance.now();
          const frames = 30;
          for (let i = 0; i < frames; i += 1) gpu.step(live.substeps);
          await gpu.onFlush();
          perf[`ms_per_frame_${budget}_x${live.substeps}sub`] =
            (performance.now() - t0) / frames;
        }
        out.perf = perf;
        out.substeps_showcase = live.substeps;
        out.ok = true;
      } catch (e) {
        out.ok = false;
        out.error = String(e);
      }
      (globalThis as { __harnessResult?: unknown }).__harnessResult = out;
      console.log(`HARNESS_RESULT ${JSON.stringify(out)}`);
      live.budget = 0;
      restoreLive();
    });
  }

  void verify; // buttons drive it; harness path uses gate fns directly
  (globalThis as { __bitPhysicsReady?: boolean }).__bitPhysicsReady = true;
}

boot().catch((e) => {
  bootEl.textContent = `WebGPU boot failed: ${String(e)}`;
  console.error(e);
});

// Capture path note: the driver clicks [data-bp="capture"], which wraps
// captureCanonical in runCaptureExclusive — the live RAF loop yields for the
// whole capture (the harness-race fix, common/common-web/src/capture-export.ts).
void runCaptureExclusive; // (referenced via panel-shell's capture button)
