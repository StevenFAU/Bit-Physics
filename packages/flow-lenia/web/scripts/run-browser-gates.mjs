import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";

const playwright = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = playwright.chromium ?? playwright.default.chromium;
const webRoot = resolve(import.meta.dirname, "..");
const distDir = resolve(process.argv[2] ?? join(webRoot, "dist"));
const output = resolve(process.argv[3] ?? join(webRoot, "artifacts", "m2-browser-gates.json"));
const structuralSteps = Number(process.env.FLOW_LENIA_M2_STRUCTURAL_STEPS ?? "256");
const timeout = Number(process.env.FLOW_LENIA_M2_TIMEOUT_MS ?? "600000");
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".map": "application/json" };

const server = createServer(async (request, response) => {
  try {
    let path = decodeURIComponent((request.url ?? "/").split("?")[0]);
    if (path === "/favicon.ico") { response.writeHead(204); response.end(); return; }
    if (path === "/") path = "/index.html";
    const file = join(distDir, normalize(path).replace(/^(\.\.[/\\])+/, ""));
    const body = await readFile(file);
    response.writeHead(200, { "content-type": mime[extname(file)] ?? "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end("not found");
  }
});

await new Promise((resolveListen) => server.listen(0, resolveListen));
const address = server.address();
if (!address || typeof address === "string") throw new Error("gate server did not bind TCP");
const url = `http://localhost:${address.port}/?grid=128&gate=1`;
let exitCode = 1;
try {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_BIN,
    headless: false,
    chromiumSandbox: false,
    args: ["--headless=new", "--no-sandbox", "--disable-gpu-sandbox", "--enable-unsafe-webgpu", "--enable-features=Vulkan", "--use-angle=vulkan", "--use-vulkan"],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
      console.log(`browser error: ${message.text()}`);
    }
    else if (message.text().startsWith("Flow Lenia M2 gates:")) console.log(message.text());
  });
  page.on("pageerror", (error) => {
    errors.push(`pageerror: ${error.message}`);
    console.log(`pageerror: ${error.message}`);
  });
  await page.goto(url, { waitUntil: "load", timeout: 30_000 });
  console.log("M2 gate page loaded");
  const available = await page.evaluate(async () => Boolean(navigator.gpu && await navigator.gpu.requestAdapter()));
  if (!available) {
    console.log("WEBGPU_UNAVAILABLE: browser adapter absent");
    exitCode = 42;
  } else {
    console.log("M2 WebGPU adapter available; waiting for app ready");
    await page.waitForFunction(() => window.__bitPhysicsReady === true, undefined, { timeout });
    const report = await page.evaluate(async (steps) => {
      if (!window.__flowLeniaM2) throw new Error("Flow Lenia M2 test hook missing");
      return window.__flowLeniaM2.runGates(steps);
    }, structuralSteps);
    const unexpected = errors.filter((message) => !/WebGPU unavailable|requestAdapter/i.test(message));
    if (unexpected.length > 0) throw new Error(`browser errors: ${unexpected.join(" | ")}`);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, JSON.stringify(report, null, 2) + "\n");
    console.log(`M2 browser gates: ${output}`);
    console.log(`numerical cases: ${report.numericalCases.map((item) => `${item.name}=${item.pass}`).join(", ")}`);
    console.log(`structural: ${report.structural.steps} steps × 2, exact=${report.structural.byteExactSameAdapter}, drift=${report.structural.metrics.relativeMassDrift}`);
    console.log(`performance: 256^2 p95=${report.performance.p95Ms} ms, memory=${report.performance.memoryMib} MiB`);
    console.log(`verdict: ${report.pass ? "PASS" : "FAIL"}`);
    exitCode = report.pass ? 0 : 1;
  }
  await browser.close();
} catch (error) {
  console.error(`M2 browser gates failed: ${String(error).split("\n")[0]}`);
} finally {
  server.close();
}
process.exit(exitCode);
