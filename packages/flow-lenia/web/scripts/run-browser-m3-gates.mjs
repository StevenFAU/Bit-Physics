import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";

const playwright = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = playwright.chromium ?? playwright.default.chromium;
const webRoot = resolve(import.meta.dirname, "..");
const distDir = resolve(process.argv[2] ?? join(webRoot, "dist"));
const output = resolve(process.argv[3] ?? join(webRoot, "artifacts", "m3-browser-gates.json"));
const screenshot = resolve(process.argv[4] ?? "/tmp/flow-lenia-m3-ui.png");
const timeout = Number(process.env.FLOW_LENIA_M3_TIMEOUT_MS ?? "600000");
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
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") { errors.push(message.text()); console.log(`browser error: ${message.text()}`); }
    else if (message.text().startsWith("Flow Lenia M3 gates:")) console.log(message.text());
  });
  page.on("pageerror", (error) => { errors.push(`pageerror: ${error.message}`); console.log(`pageerror: ${error.message}`); });
  await page.goto(url, { waitUntil: "load", timeout: 30_000 });
  console.log("M3 gate page loaded");
  const available = await page.evaluate(async () => Boolean(navigator.gpu && await navigator.gpu.requestAdapter()));
  if (!available) {
    console.log("WEBGPU_UNAVAILABLE: browser adapter absent");
    exitCode = 42;
  } else {
    await page.waitForFunction(() => window.__bitPhysicsReady === true, undefined, { timeout });
    const report = await page.evaluate(async () => {
      if (!window.__flowLeniaM3) throw new Error("Flow Lenia M3 test hook missing");
      return window.__flowLeniaM3.runGates();
    });
    await page.evaluate(async () => {
      for (const id of window.__flowLeniaM3.listExperiments()) await window.__flowLeniaM3.loadExperiment(id);
      await window.__flowLeniaM3.loadExperiment("pressure-ablation");
    });
    await page.screenshot({ path: screenshot, fullPage: true });
    const unexpected = errors.filter((message) => !/WebGPU unavailable|requestAdapter/i.test(message));
    if (unexpected.length > 0) throw new Error(`browser errors: ${unexpected.join(" | ")}`);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, JSON.stringify(report, null, 2) + "\n");
    console.log(`M3 browser gates: ${output}`);
    console.log(`cards: ${report.cards.map((item) => `${item.id}=${item.pass}`).join(", ")}`);
    console.log(`comparisons: ${report.cards.filter((item) => item.comparison).map((item) => `${item.id}:Δpeak=${item.comparison.peakDensityDelta}`).join(", ")}`);
    console.log(`events: exact=${report.scheduledEvents.byteExactSameAdapter}, ledger=${report.scheduledEvents.ledgerPass}`);
    console.log(`closed impulses: ${report.closedImpulses.pass}; render integrity: ${report.renderIntegrity.pass}`);
    console.log(`synchronized solver pair: ${report.memory.synchronizedPairMib} MiB`);
    console.log(`screenshot: ${screenshot}`);
    console.log(`verdict: ${report.pass ? "PASS" : "FAIL"}`);
    exitCode = report.pass ? 0 : 1;
  }
  await browser.close();
} catch (error) {
  console.error(`M3 browser gates failed: ${String(error).split("\n")[0]}`);
} finally {
  server.close();
}
process.exit(exitCode);
