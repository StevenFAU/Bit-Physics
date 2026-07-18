import "../../../../common/common-web/src/theme.css";
import { exposeCapture, field, resetCapture } from "../../../../common/common-web/src/capture-export.js";
import type { CaptureBundle } from "../../../../common/common-web/src/capture-export.js";
import { createSettingsPanel } from "../../../../common/common-web/src/panel-shell.js";
import type { PanelShell } from "../../../../common/common-web/src/panel-shell.js";
import {
  BINDING_INVENTORY,
  assertArchitectureFits,
  completeEcosystemInventory,
  snapshotLimits,
} from "./inventory.js";
import type { LimitSnapshot } from "./inventory.js";
import { FlowLeniaM0Probe } from "./probe.js";
import type { BenchmarkMode, BenchmarkResult, VerificationResult } from "./probe.js";
import "./style.css";

interface AdapterRecord {
  vendor: string;
  architecture: string;
  device: string;
  description: string;
}

export interface M0Report {
  schemaVersion: "flow-lenia-m0-v1";
  generatedUtc: string;
  userAgent: string;
  adapter: AdapterRecord;
  timestampQuery: boolean;
  limits: LimitSnapshot;
  architectureFailures: string[];
  verification128: VerificationResult;
  benchmarks: BenchmarkResult[];
  projectedMemory: Array<{ n: number; bytes: number; mebibytes: number }>;
  measuredDefault: 128 | 256;
  decision: string;
}

interface M0Hook {
  runSuite: () => Promise<M0Report>;
  latest: M0Report | null;
  limits: LimitSnapshot;
  bindingInventory: typeof BINDING_INVENTORY;
}

const boot = document.getElementById("boot") as HTMLDivElement;
const summary = document.getElementById("summary") as HTMLParagraphElement;
const resultsElement = document.getElementById("results") as HTMLDivElement;
const m0Probe = document.getElementById("m0-probe") as HTMLElement;
const m0Canvas = document.getElementById("view") as HTMLCanvasElement;
const organismHud = document.querySelector(".fl-hud") as HTMLElement | null;
const labSwitch = document.getElementById("lab-switch") as HTMLAnchorElement | null;
m0Probe.hidden = false;
m0Canvas.hidden = true;
if (organismHud) organismHud.hidden = true;
if (labSwitch) labSwitch.hidden = true;

function setBoot(message: string): void {
  boot.textContent = message;
  boot.style.display = message ? "block" : "none";
}

function adapterRecord(adapter: GPUAdapter): AdapterRecord {
  const info = adapter.info;
  return {
    vendor: info.vendor ?? "unknown",
    architecture: info.architecture ?? "unknown",
    device: info.device ?? "unknown",
    description: info.description ?? "unknown",
  };
}

function verificationPass(verification: VerificationResult): boolean {
  return (
    verification.fftMaxAbs <= 5e-4 &&
    verification.gatherMassRelativeResidual <= 5e-5 &&
    verification.fullMassRelativeResidual <= 5e-5 &&
    verification.uniformGenomeMaxAbs <= 5e-5 &&
    verification.uniformIdentityExact
  );
}

function renderReport(report: M0Report): void {
  const rows = report.benchmarks
    .map(
      (row) => `<tr><td>${row.n}² ${row.mode}</td><td>${row.dispatchesPerStep}</td>` +
        `<td>${row.p50Ms.toFixed(3)}</td><td>${row.p95Ms.toFixed(3)}</td><td>${row.timing}</td></tr>`,
    )
    .join("");
  resultsElement.innerHTML = `
    <table class="fl-table">
      <thead><tr><th>workload</th><th>dispatch</th><th>p50 ms</th><th>p95 ms</th><th>clock</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="fl-note ${verificationPass(report.verification128) ? "fl-pass" : "fl-warn"}">
      128² shader anchors: FFT max |Δ| ${report.verification128.fftMaxAbs.toExponential(2)},
      gather mass residual ${report.verification128.fullMassRelativeResidual.toExponential(2)},
      constant genome ${report.verification128.uniformGenomeMaxAbs.toExponential(2)}.
    </p>
    <p class="fl-note"><strong>Measured default: ${report.measuredDefault}².</strong> ${report.decision}</p>`;
  summary.textContent = `${report.adapter.description || report.adapter.device}: M0 benchmark complete.`;
}

function makeCapture(report: M0Report, wallSeconds: number): CaptureBundle {
  const order = report.benchmarks.map((row) => `${row.n}:${row.mode}`);
  const p95 = Float32Array.from(report.benchmarks.map((row) => row.p95Ms));
  return {
    manifest: {
      schema_version: "1.0.0",
      sim: { name: "flow-lenia", category: "continuous-ca", variant: "ecosystem-m0-feasibility" },
      stack: {
        name: "webgpu-f32",
        version: "0.0.1",
        build_id: `flow-lenia-m0 ${report.adapter.vendor}/${report.adapter.architecture}`,
      },
      config: {
        tier: "test",
        dims: [report.measuredDefault, report.measuredDefault],
        dtype: "f32",
        seed: 42,
        params: {
          channels: 3,
          kernels: 9,
          dd: 5,
          sigma: 0.65,
          benchmark_order: order,
          timing: report.timestampQuery ? "timestamp-query" : "queue-completion",
        },
      },
      run: {
        step_count: report.benchmarks.reduce((sum, row) => sum + row.samples, 0),
        capture_interval: 1,
        wall_clock_seconds: wallSeconds,
        start_utc: report.generatedUtc,
      },
      payload: {
        format: "hdf5",
        path: "flow-lenia-m0-browser-benchmark.h5",
        checksum: "sha256:" + "0".repeat(64),
      },
      determinism: { claimed: "non-deterministic", atomic_ops: false, subgroup_ops: false },
    },
    steps: [
      {
        step: 0,
        state: { p95_ms: field(p95, [p95.length], "f32") },
        diagnostics: {
          fft_max_abs: report.verification128.fftMaxAbs,
          mass_relative_residual: report.verification128.fullMassRelativeResidual,
          genome_max_abs: report.verification128.uniformGenomeMaxAbs,
          projected_256_mib: completeEcosystemInventory(256).totalBytes / 2 ** 20,
          measured_default: report.measuredDefault,
        },
      },
    ],
  };
}

async function start(): Promise<void> {
  setBoot("requesting WebGPU adapter…");
  if (!navigator.gpu) {
    setBoot("WebGPU unavailable in this browser.");
    return;
  }
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
  if (!adapter) {
    setBoot("WebGPU adapter unavailable.");
    return;
  }
  const requiredFeatures: GPUFeatureName[] = [];
  if (adapter.features.has("timestamp-query")) requiredFeatures.push("timestamp-query");
  const device = await adapter.requestDevice({ requiredFeatures });
  const adapterInfo = adapterRecord(adapter);
  const limits = snapshotLimits(device.limits);
  const architectureFailures = assertArchitectureFits(256, limits);
  device.addEventListener("uncapturederror", (event) => {
    const message = (event as GPUUncapturedErrorEvent).error.message;
    console.error(`Flow Lenia M0 WebGPU error: ${message}`);
    setBoot(`GPU error: ${message}`);
  });
  void device.lost.then((info) => setBoot(`WebGPU device lost (${info.reason}): ${info.message}`));

  // Browser smoke reaches this line only after every M0 shader and explicit
  // pipeline layout has compiled successfully at the portable 128² tier.
  setBoot("compiling M0 FFT and gather pipelines…");
  const preflight = await FlowLeniaM0Probe.create(device, 128);
  preflight.destroy();

  let panel: PanelShell;
  let running: Promise<M0Report> | null = null;
  const query = new URLSearchParams(location.search);
  const samples = Math.max(3, Number.parseInt(query.get("samples") ?? "12", 10) || 12);
  const warmup = Math.max(1, Number.parseInt(query.get("warmup") ?? "3", 10) || 3);
  const modes: BenchmarkMode[] = ["fft", "gather-mass", "gather-full", "step-mass", "step-full"];

  const runSuite = async (): Promise<M0Report> => {
    if (running) return running;
    running = (async () => {
      panel.setCaptureEnabled(false);
      panel.setStatus("benchmarking 128² and 256²…");
      summary.textContent = "Running correctness anchors and GPU timing samples. The UI remains still by design.";
      const started = performance.now();
      const benchmarks: BenchmarkResult[] = [];
      let verification128: VerificationResult | null = null;
      for (const n of [128, 256]) {
        setBoot(`building ${n}² probe…`);
        const probe = await FlowLeniaM0Probe.create(device, n);
        try {
          if (n === 128) verification128 = await probe.verify();
          for (const mode of modes) {
            setBoot(`benchmarking ${n}² ${mode}…`);
            benchmarks.push(await probe.benchmark(mode, samples, warmup));
          }
        } finally {
          probe.destroy();
        }
      }
      if (!verification128) throw new Error("128² verification did not run");
      const desktop = benchmarks.find((row) => row.n === 256 && row.mode === "step-full");
      if (!desktop) throw new Error("256² full-state timing missing");
      const memory256 = completeEcosystemInventory(256).totalBytes;
      const desktopPass =
        desktop.p95Ms <= 33.3 &&
        memory256 < 128 * 2 ** 20 &&
        architectureFailures.length === 0 &&
        verificationPass(verification128);
      const measuredDefault: 128 | 256 = desktopPass ? 256 : 128;
      const decision = desktopPass
        ? `The dominant-path full-state prototype is ${desktop.p95Ms.toFixed(2)} ms p95 at 256² and the projected complete allocation is ${(memory256 / 2 ** 20).toFixed(2)} MiB; 256² retains the desktop budget.`
        : `256² does not retain every M0 gate (full-state p95 ${desktop.p95Ms.toFixed(2)} ms, projected ${(memory256 / 2 ** 20).toFixed(2)} MiB, architecture failures ${architectureFailures.length}); freeze 128².`;
      const report: M0Report = {
        schemaVersion: "flow-lenia-m0-v1",
        generatedUtc: new Date().toISOString(),
        userAgent: navigator.userAgent,
        adapter: adapterInfo,
        timestampQuery: device.features.has("timestamp-query"),
        limits,
        architectureFailures,
        verification128,
        benchmarks,
        projectedMemory: [128, 256].map((n) => {
          const bytes = completeEcosystemInventory(n).totalBytes;
          return { n, bytes, mebibytes: bytes / 2 ** 20 };
        }),
        measuredDefault,
        decision,
      };
      hook.latest = report;
      renderReport(report);
      panel.setDiagnostics([
        { label: "adapter", value: adapterInfo.description || adapterInfo.device },
        { label: "timing", value: report.timestampQuery ? "GPU timestamp query" : "queue completion" },
        { label: "FFT anchor max |Δ|", value: verification128.fftMaxAbs.toExponential(3) },
        { label: "full gather mass residual", value: verification128.fullMassRelativeResidual.toExponential(3) },
        { label: "projected 256² memory", value: `${(memory256 / 2 ** 20).toFixed(2)} MiB` },
        { label: "measured default", value: `${measuredDefault}²` },
      ]);
      panel.setVerdict({
        gate: "M0 batched FFT + faithful dd=5 gather",
        verdict: desktopPass ? "256² PASS" : "128² FALLBACK",
        pass: verificationPass(verification128) && architectureFailures.length === 0,
      });
      panel.setStatus(`benchmark ready — default ${measuredDefault}²`);
      panel.setCaptureEnabled(true);
      setBoot("");
      const wallSeconds = (performance.now() - started) / 1000;
      resetCapture();
      exposeCapture(makeCapture(report, wallSeconds), { download: false });
      return report;
    })().finally(() => { running = null; });
    return running;
  };

  panel = createSettingsPanel("Flow Lenia · M0", {
    caption: "A measured architecture probe for batched spectral perception and conservative finite-square transport.",
    initial: { tier: "test", seed: 42 },
    tiers: ["test"],
    onCapture: async () => { await runSuite(); },
    modes: { initial: "study" },
    study: {
      diagnostics: [
        { label: "adapter", value: adapterInfo.description || adapterInfo.device },
        { label: "timestamp query", value: String(device.features.has("timestamp-query")) },
        { label: "256² projected memory", value: `${(completeEcosystemInventory(256).totalBytes / 2 ** 20).toFixed(2)} MiB` },
        { label: "architecture blockers", value: architectureFailures.join(", ") || "none" },
      ],
      honesty: {
        faithful: "shared Stockham butterfly, C/K plane batching, exact finite-square dd=5 destination gather",
        simplified: "spectral multiplier is identity and growth/pressure passes are not part of this M0 workload",
        measured: "capture runs warm-up plus per-workload samples at both 128² and 256²",
      },
      verdict: {
        gate: "M0 compile + portable limits",
        verdict: architectureFailures.length === 0 ? "READY" : "BLOCKED",
        pass: architectureFailures.length === 0,
      },
      links: [
        { label: "implementation ledger", href: "../../../../docs/sim-specs/continuous-ca/lenia/implementation-plan.md" },
      ],
    },
  });

  const hook: M0Hook = {
    runSuite,
    latest: null,
    limits,
    bindingInventory: BINDING_INVENTORY,
  };
  (globalThis as typeof globalThis & { __flowLeniaM0?: M0Hook }).__flowLeniaM0 = hook;
  summary.textContent = `Pipelines compiled on ${adapterInfo.description || adapterInfo.device}. Run the capture control to benchmark both tiers.`;
  setBoot("");
  (globalThis as typeof globalThis & { __bitPhysicsReady?: boolean }).__bitPhysicsReady = true;
}

void start().catch((error: unknown) => {
  console.error(error);
  setBoot(`Flow Lenia M0 failed: ${error instanceof Error ? error.message : String(error)}`);
});
