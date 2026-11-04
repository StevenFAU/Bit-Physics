// Diagnose software-adapter compile cost without changing the app or its gate.
// npm ci at the repo root; then, from this directory:
// CHROME_BIN=/snap/bin/chromium PLAYWRIGHT_MODULE=<absolute Playwright module> \
//   node compile-profile.mjs [swiftshader|vulkan]
// Always report the actual adapter: requesting Vulkan may fall back to SwiftShader.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const backend = process.argv[2] ?? "swiftshader";
if (!["swiftshader", "vulkan"].includes(backend)) throw new Error("expected swiftshader or vulkan");
const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const gated = await readFile(new URL("../typescript/src/nca_inference.wgsl", import.meta.url), "utf8");
const source = await readFile(new URL("./src/v2/model/live-kernel.ts", import.meta.url), "utf8");
// This pure source transformer has no imports. Use the same function as the app.
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { liveKernelSource } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
const unrolled = liveKernelSource(gated);
const server = createServer((_req, res) => {
  res.writeHead(200, { "content-type": "text/html" });
  res.end("<!doctype html><title>Grow compile probe</title>");
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
let browser;
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROME_BIN,
    headless: false,
    chromiumSandbox: false,
    args: ["--headless=new", "--no-sandbox", "--disable-gpu-sandbox", "--enable-unsafe-webgpu",
      ...(backend === "vulkan"
        ? ["--enable-features=Vulkan", "--use-angle=vulkan", "--use-vulkan"]
        : ["--use-angle=swiftshader", "--use-vulkan=swiftshader"])],
  });
  console.log(JSON.stringify({ browser: browser.version(), requestedBackend: backend }));
  const page = await browser.newPage();
  page.on("console", (m) => console.log(m.text()));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(async ({ gated, unrolled }) => {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error("no WebGPU adapter");
    const { vendor, architecture, description } = adapter.info;
    console.log(JSON.stringify({ adapter: { vendor, architecture, description }, gatedBytes: gated.length, unrolledBytes: unrolled.length }));
    const device = await adapter.requestDevice();
    try {
      for (const [name, code, dynamic] of [
        ["gate", gated, false],
        ["live-unrolled", unrolled, true],
        ["live-looped", gated, true],
      ]) {
        const start = performance.now();
        const module = device.createShaderModule({ code });
        const layout = device.createPipelineLayout({ bindGroupLayouts: [device.createBindGroupLayout({
          entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform", ...(dynamic ? { hasDynamicOffset: true, minBindingSize: 32 } : {}) } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
            { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
            { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
            { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
          ],
        })] });
        for (const entryPoint of ["update", "mask"]) {
          const t0 = performance.now();
          await device.createComputePipelineAsync({ layout, compute: { module, entryPoint } });
          console.log(JSON.stringify({ name, entryPoint, compileMs: Math.round(performance.now() - t0) }));
        }
        console.log(JSON.stringify({ name, totalMs: Math.round(performance.now() - start) }));
      }
    } finally {
      device.destroy();
    }
  }, { gated, unrolled });
} finally {
  await browser?.close();
  server.close();
}
