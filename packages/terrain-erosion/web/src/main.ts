import "./style.css";
import { createContext } from "../../../../common/common-ts/src/context";
import { createSettingsPanel } from "../../../../common/common-web/src/panel-shell";
import {
  exposeCapture,
  isCapturing,
  runCaptureExclusive,
} from "../../../../common/common-web/src/capture-export";
import { CanyonGpu, budget } from "./solver";
import type { Snapshot, Parameters } from "./solver";
import { CanyonRenderer } from "./renderer";
import { scenes, initial } from "./scenes";
import { canonical, prove } from "./capture";
import { parseProject } from "./project";
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const toast = (message: string) => {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  window.setTimeout(() => $("toast").classList.remove("show"), 3500);
};
async function boot() {
  const { device, adapter } = await createContext({
    adapterOptions: { powerPreference: "high-performance" },
  });
  let n = 256,
    gpu = new CanyonGpu(device, n),
    renderer = new CanyonRenderer($<HTMLCanvasElement>("view"), gpu);
  let scene = "plateau",
    running = true,
    tool = 0,
    radius = 1,
    field: Float32Array | null = null,
    baseline = { water: 0, solid: 0 },
    saved: Snapshot | null = null,
    undo: Snapshot | null = null,
    comparison: Snapshot | null = null,
    comparing = false,
    busy = false;
  let syncControls = () => {};
  let savedCursor = 0,
    undoCursor = 0,
    comparisonCursor = 0;
  let simTime = 0,
    elapsed = 0,
    frames = 0,
    last = performance.now(),
    lastRead = 0,
    readPending = false,
    actualRate = 0,
    lastTime = 0,
    disposed = false,
    inFlight = false;
  type EditEvent = {
    step: number;
    kind: number;
    x: number;
    y: number;
    radius: number;
    amount: number;
    value: number;
    params?: Parameters;
  };
  let events: EditEvent[] = [];
  let initialParams = structuredClone(gpu.params);
  const recordParams = () =>
    events.push({
      step: gpu.steps,
      kind: 0,
      x: 0,
      y: 0,
      radius: 0,
      amount: 0,
      value: 0,
      params: structuredClone(gpu.params),
    });
  const fail = (error: unknown) => {
    running = false;
    $("boot").style.display = "flex";
    $("boot").textContent =
      `Canyon Lab paused\n${String(error)}\nReload to start a fresh GPU session.`;
  };
  device.addEventListener("uncapturederror", (event) =>
    fail(event.error.message),
  );
  device.lost.then((info) => {
    disposed = true;
    fail(`GPU device lost: ${info.message}`);
  });
  const reset = (id = scene) => {
    scene = id;
    const data = initial(n, id);
    gpu.upload(data);
    gpu.steps = 0;
    device.queue.writeBuffer(gpu.clock, 0, new Float32Array(4));
    gpu.params.source = [16, 2, 1, 0.25];
    gpu.params.erosion = 8;
    field = data;
    baseline = budget(data, gpu.params.dx);
    saved = null;
    undo = null;
    comparison = null;
    comparing = false;
    simTime = 0;
    events = [];
    initialParams = structuredClone(gpu.params);
    for (const id of ["rewind", "compare", "undo"])
      $<HTMLButtonElement>(id).disabled = true;
    const spec = scenes.find((s) => s.id === scene)!;
    $("title").textContent = spec.title;
    $("subtitle").textContent = spec.subtitle;
    $("hint").textContent = spec.hint;
    $<HTMLSelectElement>("scene").value = scene;
    $("compare").textContent = "Compare A/B";
    syncControls();
  };
  reset();
  const panel = createSettingsPanel("Canyon Lab", {
    caption: "An evolving landscape, with inspectable water and grain budgets.",
    onCapture: async () => {
      panel.setStatus("Running canonical GPU capture…");
      exposeCapture(await canonical(device), { download: true });
      panel.setStatus("Canonical capture exported");
    },
    study: {
      honesty: {
        faithful: "Conservative shallow water and sediment reservoirs.",
        simplified:
          "One sediment class; empirical rock response; heightfield terrain.",
        measured: "Adapter-local analytic checks; illustrative geology.",
      },
    },
  });
  document.body.append(panel.element);
  const captureButton = panel.element.querySelector<HTMLButtonElement>(
    '[data-bp="capture"]',
  )!;
  captureButton.textContent = "Proof ↓";
  captureButton.setAttribute(
    "aria-label",
    "Export canonical GPU proof capture",
  );
  document.querySelector(".header-right")!.append(captureButton);
  const controls = panel.addGroup("Water & rock", { open: true });
  const slider = (
    label: string,
    min: number,
    max: number,
    step: number,
    value: number,
    unit: string,
    fn: (v: number) => void,
  ) => {
    const row = document.createElement("label");
    row.className = "control";
    const text = document.createElement("span");
    text.textContent = label;
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    input.setAttribute("aria-label", label);
    const output = document.createElement("output");
    output.textContent = value + unit;
    input.oninput = () => {
      if (comparing) {
        syncControls();
        return;
      }
      fn(+input.value);
      recordParams();
      output.textContent = input.value + unit;
    };
    row.append(text, input, output);
    controls.append(row);
    return input;
  };
  const riverControl = slider(
    "River discharge",
    0,
    4,
    0.1,
    1.6,
    " m³/s",
    (v) => (gpu.params.source[3] = v / (2 * Math.PI)),
  );
  const materialControl = slider(
    "Material response",
    0,
    20,
    0.5,
    8,
    "×",
    (v) => (gpu.params.erosion = v),
  );
  const settlingControl = slider(
    "Settling",
    0,
    0.08,
    0.001,
    0.015,
    " m/s",
    (v) => (gpu.params.settling = v),
  );
  syncControls = () => {
    for (const [input, value, unit] of [
      [riverControl, gpu.params.source[3] * 2 * Math.PI, " m³/s"],
      [materialControl, gpu.params.erosion, "×"],
      [settlingControl, gpu.params.settling, " m/s"],
    ] as const) {
      input.value = String(value);
      input.nextElementSibling!.textContent = Number(value.toFixed(3)) + unit;
    }
    $("river-toggle").textContent =
      gpu.params.source[3] > 0 ? "● River on" : "○ River off";
  };
  $("river-toggle").onclick = () => {
    if (comparing) return;
    gpu.params.source[3] = gpu.params.source[3] > 0 ? 0 : 1.6 / (2 * Math.PI);
    syncControls();
    recordParams();
  };
  const flood = document.createElement("button");
  flood.textContent = "Pulse a flood";
  flood.onclick = () => {
    if (comparing) return;
    const [x, y] = gpu.params.source;
    gpu.edit(1, x, y, 2, 0.8);
    events.push({
      step: gpu.steps,
      kind: 1,
      x,
      y,
      radius: 2,
      amount: 0.8,
      value: 1,
    });
    toast("Water pulse added · tracked in the water ledger");
  };
  controls.append(flood);
  const stats = panel.addGroup("Material accounting", { open: true });
  stats.innerHTML =
    '<div id="readout" class="readout"></div><p class="caption">Grain volumes, not bulk volume. Errors are measured against initial storage and the signed input/export ledger.</p>';
  const proofGroup = panel.addGroup("Check this GPU", { open: false });
  const proofButton = document.createElement("button");
  proofButton.textContent = "Run analytic checks";
  const proofResults = document.createElement("div");
  proofResults.id = "proof-results";
  proofResults.textContent = "Not run on this adapter.";
  proofGroup.append(proofButton, proofResults);
  proofButton.onclick = async () => {
    proofButton.disabled = true;
    proofResults.textContent =
      "Running production kernels in isolated fixtures…";
    try {
      await runCaptureExclusive(async () => {
        proofResults.textContent = await prove(device);
      });
    } catch (e) {
      proofResults.textContent = String(e);
    } finally {
      proofButton.disabled = false;
    }
  };
  const project = panel.addGroup("Project & quality", { open: false });
  const quality = document.createElement("select");
  quality.setAttribute("aria-label", "Grid resolution");
  quality.innerHTML =
    '<option value="128">128² · light</option><option value="256" selected>256² · balanced</option><option value="512">512² · detailed</option>';
  quality.onchange = () => {
    n = +quality.value;
    renderer.destroy();
    gpu.destroy();
    gpu = new CanyonGpu(device, n);
    renderer = new CanyonRenderer($<HTMLCanvasElement>("view"), gpu);
    reset();
    toast(`Restarted at ${n}² · ${gpu.params.dx.toFixed(3)} m cells`);
  };
  project.append(quality);
  const contour = document.createElement("button");
  contour.textContent = "Toggle contours";
  contour.onclick = () => (renderer.contours = !renderer.contours);
  project.append(contour);
  const exportButton = document.createElement("button");
  exportButton.textContent = "Export project";
  exportButton.onclick = async () => {
    busy = true;
    try {
      const s = await gpu.snapshot();
      const blob = new Blob(
        [
          JSON.stringify({
            version: 1,
            scene,
            n,
            snapshot: {
              ...s,
              data: Array.from(s.data),
              clock: Array.from(s.clock),
            },
            events:comparing?events.slice(0,savedCursor):events,
            initialParams,
            camera: {
              yaw: renderer.yaw,
              pitch: renderer.pitch,
              distance: renderer.distance,
              target: renderer.target,
            },
          }),
        ],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = "canyon-lab-project.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally {
      busy = false;
    }
  };
  project.append(exportButton);
  const replayButton = document.createElement("button");
  replayButton.textContent = "Replay edits";
  replayButton.onclick = async () => {
    if (busy || comparing) return;
    busy = true;
    running = false;
    $("play").textContent = "▶ Play";
    const target = await gpu.snapshot();
    const log = structuredClone(events);
    let cursor = 0;
    try {
      gpu.upload(initial(n, scene));
      device.queue.writeBuffer(gpu.clock, 0, new Float32Array(4));
      gpu.steps = 0;
      gpu.params = structuredClone(initialParams);
      while (gpu.steps <= target.steps) {
        while (cursor < log.length && log[cursor].step === gpu.steps) {
          const e = log[cursor++];
          if (e.kind === 0 && e.params) gpu.params = structuredClone(e.params);
          else gpu.edit(e.kind, e.x, e.y, e.radius, e.amount, e.value);
        }
        if (gpu.steps === target.steps) break;
        const next = cursor < log.length ? log[cursor].step : target.steps;
        if (next < gpu.steps) throw Error("Event order is invalid");
        gpu.step(Math.min(32, next - gpu.steps, target.steps - gpu.steps));
        await device.queue.onSubmittedWorkDone();
        renderer.render();
      }
      field = await gpu.read();
      let error = 0;
      for (let i = 0; i < field.length; i++)
        error = Math.max(error, Math.abs(field[i] - target.data[i]));
      syncControls();
      toast(
        error === 0
          ? "Replay matches the original state exactly"
          : `Replay difference: ${error.toExponential(2)}`,
      );
    } catch (e) {
      gpu.restore(target);
      toast(String(e));
    } finally {
      busy = false;
    }
  };
  project.append(replayButton);
  const importButton = document.createElement("button");
  importButton.textContent = "Import project";
  const file = document.createElement("input");
  file.type = "file";
  file.accept = ".json";
  file.hidden = true;
  importButton.onclick = () => file.click();
  file.onchange = async () => {
    try {
      const data = parseProject(await file.files![0].text());
      busy = true;
      renderer.destroy();
      gpu.destroy();
      n = data.n;
      gpu = new CanyonGpu(device, n);
      renderer = new CanyonRenderer($<HTMLCanvasElement>("view"), gpu);
      reset(data.scene);
      quality.value=String(n);
      const s = {
        ...data.snapshot,
        data: new Float32Array(data.snapshot.data),
        clock: new Float32Array(data.snapshot.clock),
      };
      gpu.restore(s);
      syncControls();
      field = s.data;
      events = data.events as EditEvent[];
      initialParams = data.initialParams;
      toast("Project restored, including water and sediment ledgers");
    } catch (e) {
      toast(String(e));
    } finally {
      busy = false;
    }
  };
  project.append(importButton, file);
  const info = document.createElement("p");
  info.className = "caption";
  info.textContent = `WebGPU · ${adapter.info.vendor} ${adapter.info.architecture}. First-order HLL baseline. Empirical material response accelerates incision; the hydraulic clock remains in seconds.`;
  project.append(info);
  const inspect = () => {
    const open = document.body.classList.toggle("instruments-open");
    $("inspect").setAttribute("aria-expanded", String(open));
  };
  $("inspect").onclick = inspect;
  $("budget-status").onclick = inspect;
  for (const s of scenes) {
    const option = document.createElement("option");
    option.value = s.id;
    option.textContent = s.title;
    $("scene").append(option);
  }
  $<HTMLSelectElement>("scene").value = scene;
  $("scene").onchange = () => reset($<HTMLSelectElement>("scene").value);
  const toolNames = [
    ["◎", "Orbit", "Drag to orbit · Shift-drag to pan · scroll to zoom"],
    [
      "↧",
      "Water",
      "Drag to add water · click Source to move the persistent river",
    ],
    ["⌁", "Dig", "Drag to excavate rock and cover · removed grains are logged"],
    ["▱", "Build", "Drag to build a loose sediment berm"],
    ["◈", "Resist", "Paint stronger rock · 4× resistance"],
    ["⠿", "Rain", "Paint persistent rain · 0.01 m/s"],
    ["↗", "Source", "Click to move the persistent river source"],
  ];
  toolNames.forEach(([icon, name, hint], i) => {
    const b = document.createElement("button");
    b.innerHTML = `<span>${icon}</span><span class="tool-label">${name}</span>`;
    b.title = name;
    b.setAttribute("aria-label", name);
    b.setAttribute("aria-pressed", String(i === 0));
    b.classList.toggle("active", i === 0);
    b.onclick = () => {
      tool = i;
      for (const child of $("tools").children) {
        child.classList.toggle("active", child === b);
        child.setAttribute("aria-pressed", String(child === b));
      }
      $("tool-hint").textContent = hint;
    };
    $("tools").append(b);
  });
  $("radius").oninput = () => {
    radius = +$<HTMLInputElement>("radius").value;
    $("radius-label").textContent = radius.toFixed(1) + " m";
  };
  $("play").onclick = () => {
    if (comparing) {
      toast("Show B to continue editing");
      return;
    }
    running = !running;
    $("play").textContent = running ? "Ⅱ Pause" : "▶ Play";
  };
  $("step").onclick = () => {
    if (!busy && !isCapturing() && !comparing) gpu.step();
  };
  $("reset").onclick = () => reset();
  $("home").onclick = () => renderer.home();
  $("plan").onclick = () => {
    renderer.orthographic = true;
    renderer.pitch = 1.5707;
    renderer.yaw = 0;
    renderer.distance = 51;
  };
  $("overlay").onchange = () =>
    (renderer.overlay = +$<HTMLSelectElement>("overlay").value);
  const toggleSection = () => {
    renderer.section = !renderer.section;
    if (renderer.section) void gpu.read().then((data) => (field = data));
    $("section").hidden = !renderer.section;
  };
  $("section-toggle").onclick = toggleSection;
  $("section-close").onclick = toggleSection;
  $("section-position").oninput = () => {
    renderer.sectionY = +$<HTMLInputElement>("section-position").value;
    section();
  };
  new ResizeObserver(() => section()).observe($("section-plot"));
  $("checkpoint").onclick = async () => {
    if (comparing) return;
    busy = true;
    try {
      saved = await gpu.snapshot();
      savedCursor = events.length;
      $<HTMLButtonElement>("rewind").disabled = false;
      $<HTMLButtonElement>("compare").disabled = false;
      toast(`Saved at ${saved.clock[2].toFixed(2)} hydraulic seconds`);
    } finally {
      busy = false;
    }
  };
  $("rewind").onclick = () => {
    if (saved) {
      gpu.restore(saved);
      field = saved.data;
      events = events.slice(0, savedCursor);
      syncControls();
      comparing = false;
      toast("Restored water, rock, sediment, clock and ledgers");
    }
  };
  $("compare").onclick = async () => {
    if (!saved) return;
    busy = true;
    try {
      if (!comparing) {
        comparison = await gpu.snapshot();
        comparisonCursor = events.length;
        gpu.restore(saved);
        syncControls();
        field = saved.data;
        running = false;
        comparing = true;
        $("compare").textContent = "Show B";
        toast("A · saved landscape");
      } else {
        gpu.restore(comparison!);
        syncControls();
        events = events.slice(0, comparisonCursor);
        field = comparison!.data;
        comparing = false;
        $("compare").textContent = "Compare A/B";
        toast("B · current landscape");
      }
      $("play").textContent = "▶ Play";
    } finally {
      busy = false;
    }
  };
  $("undo").onclick = () => {
    if (undo) {
      gpu.restore(undo);
      syncControls();
      events = events.slice(0, undoCursor);
      field = undo.data;
      undo = null;
      $<HTMLButtonElement>("undo").disabled = true;
      toast("Restored the state before the stroke");
    }
  };
  let pointer: {
      x: number;
      y: number;
      button: number;
      pan: boolean;
      painting: boolean;
    } | null = null,
    point: [number, number] | null = null,
    lastPaint = 0;
  const canvas = $<HTMLCanvasElement>("view");
  canvas.oncontextmenu = (e) => e.preventDefault();
  canvas.onpointerdown = async (e) => {
    if (busy || isCapturing() || comparing) return;
    canvas.setPointerCapture(e.pointerId);
    point = renderer.pick(e.clientX, e.clientY, field);
    pointer = {
      x: e.clientX,
      y: e.clientY,
      button: e.button,
      pan: e.shiftKey || e.button === 1,
      painting: false,
    };
    if (tool > 0 && e.button === 0 && !e.shiftKey && point) {
      busy = true;
      try {
        undo = await gpu.snapshot();
        undoCursor = events.length;
        $<HTMLButtonElement>("undo").disabled = false;
        if (pointer) pointer.painting = true;
        lastPaint = performance.now();
        if (tool === 6) {
          gpu.params.source[0] = point[0];
          gpu.params.source[1] = point[1];
          recordParams();
          toast("River source moved");
        }
      } finally {
        busy = false;
      }
    }
  };
  canvas.onpointermove = (e) => {
    point = renderer.pick(e.clientX, e.clientY, field);
    renderer.brush = point
      ? [...point, radius, tool > 0 ? 1 : 0]
      : [0, 0, radius, 0];
    if (pointer) {
      if (tool === 0 || pointer.button !== 0 || pointer.pan) {
        if (pointer.pan) {
          renderer.pan(e.clientX - pointer.x, e.clientY - pointer.y);
        } else {
          renderer.yaw -= (e.clientX - pointer.x) * 0.006;
          renderer.pitch = Math.max(
            0.12,
            Math.min(1.54, renderer.pitch + (e.clientY - pointer.y) * 0.006),
          );
        }
      }
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    }
  };
  canvas.ondblclick = (e) => {
    if (tool !== 0 || !field) return;
    const p = renderer.pick(e.clientX, e.clientY, field);
    if (!p) return;
    const i =
      (Math.min(n - 1, Math.floor(p[1] / gpu.params.dx)) * n +
        Math.min(n - 1, Math.floor(p[0] / gpu.params.dx))) *
      16;
    renderer.target = [
      p[0] - 16,
      field[i + 4] - field[i + 5] + field[i + 6] / 0.65,
      p[1] - 16,
    ];
  };
  canvas.onpointerup = () => {
    pointer = null;
    void gpu.read().then((data) => (field = data));
  };
  canvas.onpointercancel = () => (pointer = null);
  canvas.onpointerleave = () => {
    if (!pointer) renderer.brush[3] = 0;
  };
  canvas.onwheel = (e) => {
    e.preventDefault();
    renderer.distance = Math.max(
      12,
      Math.min(95, renderer.distance * Math.exp(e.deltaY * 0.001)),
    );
  };
  window.addEventListener("keydown", (e) => {
    if ((e.target as HTMLElement).matches("input,select,textarea")) return;
    if (e.code === "Space") {
      e.preventDefault();
      $("play").click();
    }
    if (e.key === "Escape") {
      tool = 0;
      ($("tools").firstElementChild as HTMLButtonElement).click();
    }
  });
  function section() {
    if (!field || !renderer.section) return;
    const c = $<HTMLCanvasElement>("section-plot"),
      r = c.getBoundingClientRect();
    c.width = r.width * devicePixelRatio;
    c.height = r.height * devicePixelRatio;
    const ctx = c.getContext("2d")!;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    const w = r.width,
      h = r.height,
      pad = 24,
      y = Math.min(n - 1, Math.floor(renderer.sectionY / gpu.params.dx));
    let lo = Infinity,
      hi = -Infinity;
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 16,
        b = field[i + 4] - field[i + 5];
      lo = Math.min(lo, b);
      hi = Math.max(hi, b + field[i + 6] / 0.65 + field[i], field[i + 4]);
    }
    lo -= 0.1;
    hi += 0.2;
    const X = (x: number) => pad + (x / (n - 1)) * (w - pad - 8),
      Y = (v: number) => h - 12 - ((v - lo) / (hi - lo)) * (h - 23);
    ctx.font = "9px monospace";
    ctx.fillStyle = "#81958c";
    ctx.strokeStyle = "#ffffff13";
    for (let k = 0; k < 3; k++) {
      const v = lo + ((hi - lo) * k) / 2,
        yy = Y(v);
      ctx.fillText(v.toFixed(1), 0, yy);
      ctx.beginPath();
      ctx.moveTo(pad, yy);
      ctx.lineTo(w, yy);
      ctx.stroke();
    }
    const line = (
      color: string,
      fn: (i: number) => number,
      dash: number[] = [],
    ) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash(dash);
      ctx.beginPath();
      for (let x = 0; x < n; x++) {
        const i = (y * n + x) * 16;
        ctx.lineTo(X(x), Y(fn(i)));
      }
      ctx.stroke();
    };
    line("#b77348", (i) => field![i + 4] - field![i + 5]);
    line(
      "#d8c084",
      (i) => field![i + 4] - field![i + 5] + field![i + 6] / 0.65,
    );
    line(
      "#6ad3d0",
      (i) => field![i + 4] - field![i + 5] + field![i + 6] / 0.65 + field![i],
    );
    line("#b5b4a4", (i) => field![i + 4], [3, 4]);
  }
  async function measure(now: number) {
    if (readPending || busy) return;
    readPending = true;
    try {
      const observed = gpu;
      const b = await observed.statistics();
      if (observed !== gpu) return;
      const clock = b.clock;
      if (renderer.section) {
        field = await observed.read();
      }
      simTime = clock[2];
      actualRate =
        (simTime - lastTime) / Math.max(0.1, (now - lastRead) / 1000);
      lastTime = simTime;
      lastRead = now;
      const waterError =
          Math.abs(b.water - baseline.water) /
          Math.max(b.storedWater, baseline.water, 1),
        solidError =
          Math.abs(b.solid - baseline.solid) /
          Math.max(b.cover + b.suspended + b.cut, Math.abs(baseline.solid), 1);
      $("clock").textContent =
        `${simTime.toFixed(1)} s · ${actualRate.toFixed(1)} s/s`;
      $("budget-status").innerHTML =
        `Water / Sediment <span>${!b.finite ? "NON-FINITE" : Math.max(waterError, solidError) < 2e-4 ? "budgets within tolerance" : "budget warning"}</span>`;
      $("readout").innerHTML = [
        ["Water", `${b.storedWater.toFixed(2)} m³`],
        ["Incised rock", `${b.cut.toFixed(3)} m³`],
        ["Suspended", `${b.suspended.toFixed(3)} m³`],
        ["Loose grains", `${b.cover.toFixed(2)} m³`],
        ["Water error", waterError.toExponential(2)],
        ["Grain error", solidError.toExponential(2)],
        ["Max speed", `${b.maxSpeed.toFixed(2)} m/s`],
        ["Grid", `${n}² / ${gpu.params.dx.toFixed(3)} m`],
      ]
        .map(([a, b]) => `<span>${a}</span><strong>${b}</strong>`)
        .join("");
      if (!b.finite || new Uint32Array(clock.buffer)[1])
        fail("Numerical guard triggered. Export a project for diagnosis.");
      section();
    } catch (e) {
      fail(e);
    } finally {
      readPending = false;
    }
  }
  function frame(now: number) {
    if (disposed) return;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    elapsed += dt;
    if (!isCapturing() && !busy && !inFlight) {
      if (
        pointer?.painting &&
        point &&
        tool > 0 &&
        tool < 6 &&
        now - lastPaint > 15
      ) {
        const amount =
          Math.min((now - lastPaint) / 1000, 0.1) * (tool === 4 ? 4 : 0.45);
        gpu.edit(tool, ...point, radius, amount, tool === 5 ? 0.01 : 4);
        events.push({
          step: gpu.steps,
          kind: tool,
          x: point[0],
          y: point[1],
          radius,
          amount,
          value: tool === 5 ? 0.01 : 4,
        });
        lastPaint = now;
      }
      if (running && !comparing) gpu.step(+$<HTMLSelectElement>("speed").value);
      renderer.time = simTime;
      renderer.render();
      frames++;
      if (now - lastRead > 700) void measure(now);
      // At most one presentation batch in flight: slow adapters cannot build
      // an invisible command backlog while reporting RAF callbacks as FPS.
      inFlight = true;
      void device.queue.onSubmittedWorkDone().then(() => {
        inFlight = false;
      }, fail);
    }
    if (elapsed > 1) {
      $("fps").textContent = `${Math.round(frames / elapsed)} fps`;
      elapsed = 0;
      frames = 0;
    }
    requestAnimationFrame(frame);
  }
  (globalThis as any).__canyon = {
    get gpu() {
      return gpu;
    },
    get renderer() {
      return renderer;
    },
    pause: () => (running = false),
    resume: () => (running = true),
    reset,
    prove: () => prove(device),
    get events() {
      return events;
    },
  };
  (globalThis as any).__bitPhysicsReady = true;
  $("boot").style.display = "none";
  requestAnimationFrame(frame);
}
boot().catch((e) => {
  $("boot").textContent =
    `Canyon Lab needs WebGPU\n${String(e)}\nTry a current browser with hardware acceleration enabled.`;
});
